// Bateria de testes do Plano de Corte CNC.
// Uso:  node testes.js [endereço]
//   sem endereço: abre ../plano-de-corte-cnc.html direto do disco
//   com endereço: testa pelo servidor do .exe, ex.: node testes.js http://127.0.0.1:47831/
// Precisa do Playwright com o Chromium (npm i playwright && npx playwright install chromium).
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const fs = require('fs');

const ALVO = process.argv[2] || 'file://' + path.resolve(__dirname, '..', 'plano-de-corte-cnc.html');
const DADOS = path.join(__dirname, 'dados');
const PELO_SERVIDOR = /^https?:/.test(ALVO);
const resultados = [];
let browser;

async function pagina(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } });
  const pg = await ctx.newPage();
  pg.erros = [];
  pg.on('pageerror', e => pg.erros.push(e.message));
  pg.on('dialog', d => d.accept());
  if (opts.antes) await pg.addInitScript(opts.antes, opts.arg);
  await pg.goto(ALVO);
  await pg.waitForTimeout(500);
  return pg;
}
async function teste(nome, fn) {
  const t0 = Date.now();
  try { await fn(); resultados.push({ nome, ok: true, ms: Date.now() - t0 }); console.log(`PASSOU  ${nome}`); }
  catch (e) { resultados.push({ nome, ok: false, erro: e.message }); console.log(`FALHOU  ${nome}\n        ${e.message.split('\n')[0]}`); }
}
function confere(cond, msg) { if (!cond) throw new Error(msg); }
const semErros = pg => confere(!pg.erros.length, 'erro de JavaScript: ' + pg.erros.join(' | '));

(async () => {
  // WebGL por software (SwiftShader) para o motor 3D funcionar sem placa de vídeo
  const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  browser = await pw.chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium', args: GL } : { args: GL });
  console.log('Testando: ' + ALVO + '\n');

  if (PELO_SERVIDOR) await teste('Servidor do .exe: página, /ping, /version e script de vida no lugar certo', async () => {
    const base = ALVO.replace(/\/$/, '');
    const html = await (await fetch(base + '/')).text();
    confere((html.match(/fetch\('\/ping'\)/g) || []).length === 1, 'script de ping deve aparecer uma vez');
    confere(html.lastIndexOf("fetch('/ping')") > html.lastIndexOf('<script>\n'), 'script de ping tem que ficar no fim da página');
    confere((await fetch(base + '/ping')).status === 204, '/ping deve responder 204');
    confere(/^[0-9a-f]{16}$/.test(await (await fetch(base + '/version')).text()), '/version deve devolver a versão');
  });

  await teste('Abre e mostra projeto, faixa de botões e árvore', async () => {
    const pg = await pagina();
    confere(await pg.locator('#gridBody tr').count() > 10, 'grade de peças vazia');
    confere(await pg.locator('#tree li').count() >= 10, 'árvore vazia');
    confere(await pg.locator('#ribbon .rbtn').count() >= 8, 'faixa de botões vazia');
    semErros(pg); await pg.context().close();
  });

  await teste('Todas as telas, relatórios, janelas e o editor abrem sem erro', async () => {
    const pg = await pagina();
    await pg.evaluate(() => {
      for (const v of ['projetos', 'plano', 'compras', 'desenhos', 'cad-chapas', 'cad-bordas', 'cad-acessorios', 'cad-sobras', 'export', 'projeto']) { UI.view = v; render(); }
      UI.view = 'plano'; render(); for (const s of ['lista', 'cnc', 'preview']) { UI.sub = s; renderPlano(); }
      for (const p of ['abrir', 'imprimir', 'opcoes', 'plugins', 'pendentes', 'ajuda']) openBack(p);
      for (const r of ['previewLista', 'preview', 'lista', 'simples', 'producao', 'compras', 'etiquetas']) { UI.back = 'imprimir'; UI.rep = r; renderBack(); }
      closeBack(); importDialog(); ACT.modalClose(); gerarDialog(); ACT.modalClose(); visDialog(); ACT.modalClose();
      const pr = proj(UI.proj); const it = pr.itens[0]; openEditor(pr.id, it.id, it.filhos.find(f => f.tipo === 'peca').id); ACT.modalClose();
    });
    semErros(pg); await pg.context().close();
  });

  await teste('Otimização: peças dentro da chapa, sem sobreposição, veio respeitado, nos dois modos', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => {
      const ruins = [];
      for (const modo of ['cnc', 'guilhotina']) {
        S.cfg.modo = modo; const R = ensureResult(true);
        for (const s of R.sheets) {
          for (const p of s.parts) {
            if (p.x < s.R - 0.01 || p.y < s.R - 0.01 || p.x + p.w > s.L - s.R + 0.01 || p.y + p.h > s.W - s.R + 0.01) ruins.push(`${modo}: ${p.code} fora da chapa`);
            if (p.veio && p.rot) ruins.push(`${modo}: ${p.code} com veio foi girada`);
          }
          for (let i = 0; i < s.parts.length; i++) for (let j = i + 1; j < s.parts.length; j++) {
            const a = s.parts[i], b = s.parts[j];
            if (a.x < b.x + b.w + R.gap - 0.01 && b.x < a.x + a.w + R.gap - 0.01 && a.y < b.y + b.h + R.gap - 0.01 && b.y < a.y + a.h + R.gap - 0.01) ruins.push(`${modo}: ${a.code} encosta em ${b.code}`);
          }
        }
        if (!R.sheets.length) ruins.push(modo + ': nenhuma chapa');
        if (R.errors.length) ruins.push(modo + ': ' + R.errors[0]);
      }
      return ruins;
    });
    confere(!r.length, r.slice(0, 3).join('; '));
    semErros(pg); await pg.context().close();
  });

  await teste('Otimização: peça maior que a chapa vira aviso, não trava', async () => {
    const pg = await pagina();
    const e = await pg.evaluate(() => { const pr = proj(UI.proj); pr.itens[0].filhos.push(newPart({ desc: 'Gigante', L: 5000, W: 3000, esp: 15, mat: 'MDF Branco', qty: 1 })); return ensureResult(true).errors; });
    confere(e.some(x => x.includes('Gigante')), 'esperava aviso da peça Gigante');
    semErros(pg); await pg.context().close();
  });

  await teste('G-code: fresa nunca invade peça, profundidade final certa, nada rápido dentro do material', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => {
      const out = [];
      const roda = (rotulo) => {
        const R = ensureResult(true); const raio = S.cnc.diam / 2;
        for (const s of R.sheets) {
          const tp = toolpath(s); let x = 0, y = 0, z = S.cnc.safeZ, minZ = 0, invade = 0, emOp = false;
          for (const l of tp.code.split('\n')) {
            if (l.startsWith('(')) { emOp = /^\(OP/.test(l); continue; }
            const m = l.match(/^G([0123])\b/); if (!m) continue;
            const v = k => { const mm = l.match(new RegExp(k + '(-?[\\d.]+)')); return mm ? +mm[1] : null; };
            const nx = v('X') ?? x, ny = v('Y') ?? y, nz = v('Z') ?? z;
            if (m[1] === '0' && (nx !== x || ny !== y) && Math.min(z, nz) < 0) out.push(`${rotulo}: G0 abaixo de Z0 na chapa ${s.n}`);
            if (!emOp && m[1] === '1' && Math.min(z, nz) < 0) { const n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y))); for (let i = 0; i <= n; i++) { const px = x + (nx - x) * i / n, py = y + (ny - y) * i / n; for (const q of s.parts) { const dx = Math.max(q.x - px, 0, px - (q.x + q.w)), dy = Math.max(q.y - py, 0, py - (q.y + q.h)); if (Math.hypot(dx, dy) < raio - 0.01) invade++; } } }
            x = nx; y = ny; z = nz; minZ = Math.min(minZ, z);
          }
          if (invade) out.push(`${rotulo}: chapa ${s.n} invade peça ${invade}x`);
          if (Math.abs(minZ + s.esp + S.cnc.overcut) > 1e-6) out.push(`${rotulo}: chapa ${s.n} profundidade ${minZ}`);
        }
      };
      roda('padrão');
      S.cnc.climb = 0; S.cnc.rampa = 0; roda('convencional sem rampa');
      S.cnc.climb = 1; S.cnc.rampa = 1; S.cnc.tabMaxArea = 0; roda('abas em todas');
      S.cnc.tabMaxArea = .15; S.cfg.modo = 'guilhotina'; roda('guilhotina');
      return out;
    });
    confere(!r.length, r.slice(0, 3).join('; '));
    semErros(pg); await pg.context().close();
  });

  await teste('DXF e código de barras com estrutura válida', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => { const s = ensureResult(true).sheets[0]; const d = dxf(s); return { ini: d.slice(0, 20), fim: d.trim().slice(-3), poly: (d.match(/\nPOLYLINE\r?\n/g) || []).length, pecas: s.parts.length, cb: code128('ABC').match(/viewBox="0 0 (\d+)/)[1], tab: C128.length }; });
    confere(r.ini.includes('SECTION') && r.fim === 'EOF', 'DXF sem SECTION/EOF');
    confere(r.poly >= r.pecas, `DXF com ${r.poly} contornos para ${r.pecas} peças`);
    confere(r.tab === 107, 'tabela Code 128 incompleta');
    confere(+r.cb === 88, 'largura do código de barras de "ABC" deveria ser 88 módulos com margens');
    semErros(pg); await pg.context().close();
  });

  await teste('Importar TXT do Promob pela janela: mapeia colunas, cria projeto e guarda configuração', async () => {
    const pg = await pagina();
    await pg.evaluate(() => importDialog());
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'promob-exemplo.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(200);
    await pg.click('[data-act=mapGo]'); await pg.waitForTimeout(200);
    const r = await pg.evaluate(() => { const pr = proj(UI.proj); return { nome: pr.nome, pecas: pr.itens.flatMap(i => i.filhos).map(f => [f.desc, f.qty, f.L, f.W, f.esp, f.mat, f.veio, f.bordas.inf]), pres: S.importPresets.length }; });
    confere(r.nome === 'Casa Bia', 'projeto deveria se chamar Casa Bia, veio ' + r.nome);
    confere(JSON.stringify(r.pecas[1]) === JSON.stringify(['Porta', 3, 2180, 450, 18, 'MDF Freijo', true, 'Freijo']), 'porta importada errada: ' + JSON.stringify(r.pecas[1]));
    confere(r.pres === 1, 'configuração não foi guardada');
    semErros(pg); await pg.context().close();
  });

  await teste('TXT escolhido com a opção .corte marcada importa como lista de peças (não dá erro)', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { UI.impT = 'corte'; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=corte]')]);
    await fc.setFiles(path.join(DADOS, 'promob-exemplo.txt'));
    confere(await pg.isChecked('input[name=impT][value=txt]'), 'deveria ter mudado sozinho para a opção TXT');
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(200);
    confere(!(await pg.textContent('#toast')).includes('não é um projeto'), 'deu o erro do print');
    await pg.click('[data-act=mapGo]'); await pg.waitForTimeout(200);
    confere((await pg.evaluate(() => proj(UI.proj).nome)) === 'Casa Bia', 'não criou o projeto');
    await pg.evaluate(() => { UI.impT = 'corte'; UI.impFile = new File(['peca;1;2'], 'x.txt'); importDialog(); });
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(200);
    confere(!(await pg.textContent('#toast')).includes('não é um projeto'), 'opção .corte com TXT ainda dá erro');
    semErros(pg); await pg.context().close();
  });

  await teste('Importar .zip, acentos do Windows e números com vírgula', async () => {
    const pg = await pagina();
    const zip = fs.readFileSync(path.join(DADOS, 'promob-exemplo.zip')).toString('base64');
    const w1252 = fs.readFileSync(path.join(DADOS, 'promob-windows1252.txt')).toString('base64');
    const r = await pg.evaluate(async ([zip, w]) => {
      const f = (b64, nome) => new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], nome);
      const z = await readImportFile(f(zip, 'x.zip')); const t = await readImportFile(f(w, 'w.txt'));
      startImport(t[0].text, 'w.txt', '', 'novo'); ACT.mapGo();
      const p = proj(UI.proj).itens[0].filhos[0];
      return { zipNome: z[0]?.name, zipTem: z[0]?.text.includes('Casa Bia'), desc: p.desc, L: p.L };
    }, [zip, w1252]);
    confere(r.zipNome === 'bia.txt' && r.zipTem, 'zip não foi lido');
    confere(r.desc === 'Prateleira Maçã', 'acento errado: ' + r.desc);
    confere(r.L === 720.5, 'vírgula decimal errada: ' + r.L);
    semErros(pg); await pg.context().close();
  });

  await teste('Importação inválida: arquivo vazio e linhas sem medida avisam e não criam projeto', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(async ([inv]) => {
      const n0 = S.projetos.length; const msgs = [];
      startImport('', 'vazio.txt', '', 'novo'); msgs.push($('#toast').textContent);
      startImport(inv, 'inv.txt', '', 'novo'); ACT.mapGo(); msgs.push($('#toast').textContent);
      return { msgs, criados: S.projetos.length - n0 };
    }, [fs.readFileSync(path.join(DADOS, 'promob-invalido.txt'), 'utf8')]);
    confere(r.msgs[0].includes('vazio'), 'sem aviso de arquivo vazio');
    confere(/Comprimento|válidos/.test(r.msgs[1]), 'sem aviso de linhas inválidas: ' + r.msgs[1]);
    confere(r.criados === 0, 'criou projeto com arquivo inválido');
    semErros(pg); await pg.context().close();
  });

  await teste('Configurações de importação: criar, renomear e remover', async () => {
    const pg = await pagina();
    await pg.evaluate(t => { startImport(t, 'a.txt', '', 'novo'); ACT.mapGo(); }, fs.readFileSync(path.join(DADOS, 'promob-exemplo.txt'), 'utf8'));
    await pg.evaluate(() => importDialog()); await pg.selectOption('#impPreset', { index: 1 }); await pg.click('[data-act=presetEdit]');
    await pg.fill('#mapNome', 'Promob Loja'); await pg.click('[data-act=mapGo]');
    confere(JSON.stringify(await pg.evaluate(() => S.importPresets.map(p => p.nome))) === '["Promob Loja"]', 'renomear falhou');
    await pg.selectOption('#impPreset', { index: 1 }); await pg.click('[data-act=presetDel]'); await pg.click('[data-act=presetDel]').catch(() => {});
    await pg.waitForTimeout(100);
    const n = await pg.evaluate(() => S.importPresets.length);
    confere(n === 0, 'remover falhou, sobraram ' + n);
    semErros(pg); await pg.context().close();
  });

  await teste('Importações Pendentes: lista arquivos novos da pasta, importa e não repete', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(async () => {
      const txt = 'Projeto;Modulo;Descricao;Quantidade;Comprimento;Largura;Espessura;Material\nObra X;Cozinha;Base;2;800;500;15;MDF Branco\n';
      const arq = (n, c, t) => ({ kind: 'file', getFile: async () => new File([c], n, { lastModified: t }) });
      window.showDirectoryPicker = async () => ({ name: 'Promob', queryPermission: async () => 'granted', requestPermission: async () => 'granted',
        entries: async function* () { yield ['obra1.txt', arq('obra1.txt', txt, 1)]; yield ['obra2.csv', arq('obra2.csv', txt.replace('Obra X', 'Obra Y'), 2)]; yield ['foto.jpg', arq('foto.jpg', 'x', 3)]; } });
      startImport(txt, 'base.txt', '', 'novo'); ACT.mapGo(); S.cfg.pendPreset = S.importPresets[0].id;
      await ACT.pendPasta(); const achados = PEND.list.map(f => f.name);
      await ACT.pendAll(); await pendCheck(true);
      return { achados, depois: PEND.list.length, nomes: S.projetos.map(p => p.nome) };
    });
    confere(JSON.stringify(r.achados.sort()) === '["obra1.txt","obra2.csv"]', 'achou ' + r.achados);
    confere(r.depois === 0, 'arquivos já importados voltaram para a lista');
    confere(r.nomes.includes('Obra X') && r.nomes.includes('Obra Y'), 'projetos não criados');
    semErros(pg); await pg.context().close();
  });

  await teste('Editor de Operações: põe furo e rasgo e recusa operação fora da peça', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { const pr = proj(UI.proj); const it = pr.itens[0]; openEditor(pr.id, it.id, it.filhos[0].id); });
    const box = await pg.locator('#edSvg').boundingBox();
    await pg.click('[data-act=edTool][data-t=furo]'); await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await pg.click('[data-act=edTool][data-t=rasgo]'); await pg.mouse.click(box.x + box.width * .3, box.y + box.height * .3); await pg.mouse.click(box.x + box.width * .7, box.y + box.height * .31);
    const fora = await pg.evaluate(() => { EDIT.d.ops.push({ tipo: 'furo', x: -5, y: 10, d: 8, prof: 10 }); ACT.edOk(); const recusou = !!$('#edSvg'); EDIT.d.ops.pop(); ACT.edOk(); return recusou; });
    const ops = await pg.evaluate(() => proj(UI.proj).itens[0].filhos[0].ops.map(o => o.tipo));
    confere(fora, 'aceitou furo fora da peça');
    confere(JSON.stringify(ops) === '["furo","rasgo"]', 'operações salvas: ' + ops);
    semErros(pg); await pg.context().close();
  });

  await teste('Dados continuam depois de fechar e abrir de novo', async () => {
    const ctx = await browser.newContext(); const pg = await ctx.newPage(); pg.erros = []; pg.on('pageerror', e => pg.erros.push(e.message));
    await pg.goto(ALVO); await pg.waitForTimeout(400);
    await pg.evaluate(() => { ACT.novoProjeto(); proj(UI.proj).nome = 'Persistência 123'; save(); });
    await pg.waitForTimeout(500); await pg.reload(); await pg.waitForTimeout(400);
    confere(await pg.evaluate(() => S.projetos.some(p => p.nome === 'Persistência 123')), 'projeto sumiu depois de reabrir');
    semErros(pg); await ctx.close();
  });

  await teste('Dados danificados: guarda uma cópia e avisa em vez de apagar', async () => {
    const pg = await pagina({ antes: () => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', 1); localStorage.setItem('plano-corte-cnc-v2', '{quebrado'); } } });
    const r = await pg.evaluate(() => ({ aviso: !$('#saveWarn').hidden && $('#saveWarn').textContent.includes('danificados'), copia: Object.keys(localStorage).some(k => k.startsWith('plano-corte-cnc-v2-corrompido-')) }));
    confere(r.copia, 'não guardou a cópia dos dados danificados');
    confere(r.aviso, 'não mostrou aviso');
    semErros(pg); await pg.context().close();
  });

  await teste('Espaço cheio: salva sem o plano; se nem assim couber, mostra aviso vermelho', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(async () => {
      ensureResult(true); const orig = Storage.prototype.setItem; const plano = JSON.stringify(S).length;
      let limite = plano - 10; Storage.prototype.setItem = function (k, v) { if (v.length > limite) { const e = new Error('cheio'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); };
      ensureResult(true); doSave(); const a = { ...SAVE, aviso: !$('#saveWarn').hidden };
      limite = 10; doSave(); const b = { ...SAVE, aviso: !$('#saveWarn').hidden, txt: $('#saveWarn').textContent };
      Storage.prototype.setItem = orig; doSave(); const c = { aviso: !$('#saveWarn').hidden };
      return { a, b, c };
    });
    confere(r.a.semPlano && !r.a.err && !r.a.aviso, 'primeira falha deveria salvar sem o plano: ' + JSON.stringify(r.a));
    confere(r.b.err && r.b.aviso && r.b.txt.includes('não consegui salvar'), 'segunda falha deveria mostrar aviso vermelho');
    confere(!r.c.aviso, 'aviso deveria sumir quando volta a salvar');
    semErros(pg); await pg.context().close();
  });

  await teste('Backup automático grava na pasta e avisa quando falha', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(async () => {
      const gravados = {}; let falhar = false;
      const pasta = { name: 'Pendrive', queryPermission: async () => 'granted', requestPermission: async () => 'granted',
        getFileHandle: async (n) => ({ createWritable: async () => { if (falhar) throw new Error('disco cheio'); let buf = ''; return { write: async d => { buf += d; }, close: async () => { gravados[n] = buf; } }; } }) };
      window.showDirectoryPicker = async () => pasta;
      await ACT.bkPasta(); const nomes = Object.keys(gravados); const dados = JSON.parse(gravados['plano-de-corte-backup.corte']);
      falhar = true; await writeBackup(); setStatus('');
      return { nomes, projetos: dados.dados.projetos.length, tipo: dados.tipo, status: $('#status').textContent };
    });
    confere(r.nomes.length === 2 && r.nomes.some(n => /backup-\d{4}-\d\d-\d\d\.corte$/.test(n)), 'arquivos gravados: ' + r.nomes);
    confere(r.tipo === 'plano-corte-cnc-backup' && r.projetos >= 1, 'conteúdo do backup errado');
    confere(r.status.includes('Backup falhou'), 'barra de status não mostrou a falha');
    semErros(pg); await pg.context().close();
  });

  await teste('Plugins desligados bloqueiam de verdade (USB, DXF, Editor)', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(async () => {
      UI.view = 'plano'; UI.sub = 'cnc'; render();
      const antes = { usb: !!$('[data-act=serialConnect]'), dxf: !!$('[data-act=dlDxf]') };
      S.plugins.usb = false; S.plugins.dxf = false; S.plugins.editor = false; renderPlano();
      const depois = { usb: !!$('[data-act=serialConnect]'), dxf: !!$('[data-act=dlDxf]') };
      let baixou = 0; const dl = window.download; window.download = () => baixou++;
      ACT.dlDxf(); const m1 = $('#toast').textContent; await serialConnect(); const m2 = $('#toast').textContent;
      const pr = proj(UI.proj); const it = pr.itens[0]; openEditor(pr.id, it.id, it.filhos[0].id); const ed = !!$('#edSvg'); window.download = dl;
      return { antes, depois, baixou, m1, m2, ed };
    });
    confere(r.antes.usb && r.antes.dxf, 'botões deveriam aparecer com plugins ligados');
    confere(!r.depois.usb && !r.depois.dxf, 'botões deveriam sumir com plugins desligados');
    confere(r.baixou === 0 && r.m1.includes('DXF') && r.m2.includes('USB'), 'ações não foram bloqueadas');
    confere(!r.ed, 'editor abriu com plugin desligado');
    semErros(pg); await pg.context().close();
  });

  await teste('Plano com peças movidas à mão fica desatualizado e não vai para a máquina até refazer', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => {
      UI.view = 'plano'; UI.sub = 'cnc'; render(); const R = ensureResult(); RESULT.manual = true;
      const pr = proj(UI.proj); pr.itens[0].filhos[0].qty += 1; renderPlano();
      const banner = !!document.querySelector('.stale'); let baixou = 0; const dl = window.download; window.download = () => baixou++;
      ACT.dlGcode(); const bloqueado = baixou === 0; ACT.atualizar(); const limpo = !RESULT.stale && !document.querySelector('.stale');
      ACT.dlGcode(); window.download = dl; return { banner, bloqueado, limpo, baixouDepois: baixou };
    });
    confere(r.banner, 'aviso de plano desatualizado não apareceu');
    confere(r.bloqueado, 'deixou baixar G-code de plano desatualizado');
    confere(r.limpo && r.baixouDepois === 1, 'Refazer plano não liberou');
    semErros(pg); await pg.context().close();
  });

  await teste('Envio USB (GRBL simulada): envia tudo, e não trava se a conexão cair', async () => {
    const pg = await pagina({ antes: () => {
      window.__serial = { recebidas: 0, cair: false };
      const st = window.__serial;
      navigator.serial && Object.defineProperty(navigator, 'serial', { value: { requestPort: async () => {
        let ctrl; const readable = new ReadableStream({ start(c) { ctrl = c; } });
        const enc = new TextEncoder();
        return { open: async () => {}, close: async () => {}, readable,
          writable: new WritableStream({ write(chunk) { const t = new TextDecoder().decode(chunk); for (const l of t.split('\n')) if (l.trim()) { st.recebidas++; if (st.cair && st.recebidas > 5) { ctrl.close(); return; } setTimeout(() => ctrl.enqueue(enc.encode('ok\r\n')), 1); } } }) };
      } } });
    } });
    const r = await pg.evaluate(async () => {
      if (!('serial' in navigator)) return { semSerial: true };
      UI.view = 'plano'; UI.sub = 'cnc'; render(); await serialConnect();
      const b = document.querySelector('[data-act=serialSend]'); await serialSend(b); await serialSend(b);
      const ok = SER.status, n = window.__serial.recebidas;
      await serialClose(); window.__serial.recebidas = 0; window.__serial.cair = true; await serialConnect();
      const b2 = document.querySelector('[data-act=serialSend]'); await serialSend(b2); const t0 = Date.now(); await serialSend(b2);
      return { ok, n, falha: SER.status, ms: Date.now() - t0 };
    });
    if (r.semSerial) { console.log('        (este navegador não tem Web Serial; teste pulado)'); return; }
    confere(r.ok.includes('enviado') && r.n > 20, 'envio completo falhou: ' + r.ok);
    confere(/perdida|erro/i.test(r.falha) && r.ms < 5000, 'queda de conexão não foi tratada: ' + r.falha);
    semErros(pg); await pg.context().close();
  });

  await teste('Remover caixote, peça e projeto com confirmação; tecla Delete; medida do caixote estimada', async () => {
    const pg = await pagina();
    await pg.evaluate(t => { startImport(t, 'c.txt', '', 'novo'); ACT.mapGo(); ACT.expandAll(); }, fs.readFileSync(path.join(DADOS, 'promob-exemplo.txt'), 'utf8'));
    const est = await pg.getAttribute('#gridBody tr:nth-child(1) input[data-f=A]', 'placeholder');
    const n0 = await pg.locator('#gridBody tr').count();
    await pg.hover('#gridBody tr:nth-child(2)'); await pg.click('#gridBody tr:nth-child(2) .rowdel'); await pg.click('[data-act=confOk]');
    const n1 = await pg.locator('#gridBody tr').count();
    await pg.click('#gridBody tr:nth-child(2) td:nth-child(3)'); await pg.evaluate(() => document.activeElement.blur()); await pg.keyboard.press('Delete'); await pg.click('[data-act=confOk]');
    const n2 = await pg.locator('#gridBody tr').count();
    await pg.click('[data-act=removerProjeto]'); await pg.click('[data-act=confOk]');
    const nomes = await pg.evaluate(() => S.projetos.map(p => p.nome));
    confere(est === '≈ 2200', 'altura estimada do caixote: ' + est);
    confere(n1 === n0 - 1 && n2 === n0 - 2, `linhas ${n0} → ${n1} → ${n2}`);
    confere(!nomes.includes('Casa Bia'), 'projeto não foi removido');
    semErros(pg); await pg.context().close();
  });

  await teste('Plugins de integração geram arquivos com a estrutura de cada formato', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => {
      const pr = proj(UI.proj); const c = pr.itens[0].filhos[0]; c.ops = ESQUEMAS.porta2.fn(c);
      const o = {}; for (const k of Object.keys(INTEG)) o[k] = INTEG[k]().map(f => [f[0], f[1].slice(0, 60)]); return o;
    });
    confere(r.bhx[0][0].endsWith('.mpr') && r.bhx[0][1].startsWith('[H'), 'BHX .mpr inválido');
    confere(r.cyflex[0][0].endsWith('.xxl') && r.cyflex[0][1].startsWith('H DX='), 'Xilog .xxl inválido');
    confere(r.cutrite[0][1].startsWith('HEADER,'), 'Cut Rite .ptx inválido');
    for (const k of ['ardis', 'cortecerto', 'cutplanning', 'gplan', 'gvision']) confere(r[k].length && r[k][0][1].includes(';'), k + ' sem lista');
    semErros(pg); await pg.context().close();
  });

  await teste('Usinagens do editor saem no G-code dentro do lugar certo (rebaixo, recorte, rasgo largo, furo de topo)', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => {
      const pr = proj(UI.proj); const c = pr.itens.flatMap(i => i.filhos).find(f => f.tipo === 'peca' && f.L >= 600 && f.W >= 300);
      c.ops = [{ tipo: 'rebaixo', x: 100, y: 80, w: 150, h: 90, prof: 5 }, { tipo: 'rebaixo', x: 350, y: 80, w: 100, h: 120, prof: c.esp },
        { tipo: 'rasgo', x: 50, y: 250, x2: 500, y2: 250, prof: 8, larg: 14 }, { tipo: 'furoTopo', lado: 'inf', pos: 200, d: 8, prof: 30, z: c.esp / 2 }];
      touch(pr); const R = ensureResult(true); const s = R.sheets.find(s => s.parts.some(p => p.pid === c.id)); const p = s.parts.find(p => p.pid === c.id);
      const tp = toolpath(s); const K = S.cnc; const rr = K.diam / 2;
      // separa o G-code por operação (comentário "(OP ...") e confere cada movimento de corte
      const seg = {}; let cur = null, x = 0, y = 0, z = 0;
      for (const l of tp.code.split('\n')) {
        if (l.startsWith('(OP')) { cur = l.includes(p.desc.slice(0, 6)) ? l : null; if (cur) seg[cur] = seg[cur] || []; continue; }
        if (l.startsWith('(')) { cur = null; continue; }
        const g = k => { const m = l.match(new RegExp(k + '(-?[\\d.]+)')); return m ? +m[1] : null; };
        if (/^G[0123]\b/.test(l)) { x = g('X') ?? x; y = g('Y') ?? y; z = g('Z') ?? z; if (cur && /^G1/.test(l) && z < 0) seg[cur].push([x, y, z]); }
      }
      const caixa = o => { const a = partToSheet(p, o.x, o.y), b = partToSheet(p, o.x + o.w, o.y + o.h); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; };
      const dentro = (pts, bx, m) => pts.every(([x, y]) => x >= bx[0] + m - 0.01 && x <= bx[2] - m + 0.01 && y >= bx[1] + m - 0.01 && y <= bx[3] - m + 0.01);
      const k = Object.keys(seg);
      const reb = seg[k.find(s => s.includes('rebaixo P5'))] || [], vaz = seg[k.find(s => s.includes('recorte vazado'))] || [], ras = seg[k.find(s => s.includes('rasgo L14'))] || [];
      const rasA = partToSheet(p, 50, 250), rasB = partToSheet(p, 500, 250); const horiz = Math.abs(rasA[1] - rasB[1]) < 0.01;
      const larguraRasgo = horiz ? Math.max(...ras.map(q => q[1])) - Math.min(...ras.map(q => q[1])) + K.diam : Math.max(...ras.map(q => q[0])) - Math.min(...ras.map(q => q[0])) + K.diam;
      return { n: { reb: reb.length, vaz: vaz.length, ras: ras.length },
        rebDentro: dentro(reb, caixa(c.ops[0]), rr), rebZ: Math.min(...reb.map(q => q[2])), rebCobre: Math.max(...reb.map(q => q[0])) - Math.min(...reb.map(q => q[0])) + K.diam,
        vazDentro: dentro(vaz, caixa(c.ops[1]), rr), vazZ: Math.min(...vaz.map(q => q[2])), esp: s.esp, overcut: K.overcut,
        larguraRasgo, topo: tp.topo, topoNoCodigo: tp.code.includes('furo de topo'), w: p.rot ? c.ops[0].h : c.ops[0].w };
    });
    confere(r.n.reb > 4 && r.n.vaz >= 4 && r.n.ras > 2, 'faltou operação no G-code: ' + JSON.stringify(r.n));
    confere(r.rebDentro, 'rebaixo: a fresa sai do retângulo');
    confere(Math.abs(r.rebZ + 5) < 0.01, 'rebaixo: profundidade errada ' + r.rebZ);
    confere(Math.abs(r.rebCobre - r.w) < 0.6, 'rebaixo: não esvaziou a largura toda (' + r.rebCobre + ' de ' + r.w + ')');
    confere(r.vazDentro, 'recorte: a fresa sai do retângulo');
    confere(Math.abs(r.vazZ + r.esp + r.overcut) < 0.01, 'recorte: não atravessa a chapa ' + r.vazZ);
    confere(Math.abs(r.larguraRasgo - 14) < 0.01, 'rasgo: largura cortada ' + r.larguraRasgo + ' em vez de 14');
    confere(r.topo === 1 && r.topoNoCodigo, 'furo de topo deveria ser só avisado no G-code');
    semErros(pg); await pg.context().close();
  });

  await teste('Esquema em futuras importações: peça igual já entra com as usinagens', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { S.regrasOps = [{ chave: regraChave({ desc: 'Porta', L: 2180, W: 450, esp: 18 }), ops: [furo(100, 22.5, 35, 12.5), furo(2080, 22.5, 35, 12.5)], esquema: 'nenhum', sobrecorte: false }]; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'promob-exemplo.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(200); await pg.click('[data-act=mapGo]'); await pg.waitForTimeout(200);
    const ops = await pg.evaluate(() => proj(UI.proj).itens.flatMap(i => i.filhos).find(f => f.desc === 'Porta').ops.length);
    confere(ops === 2, 'porta importada sem as usinagens da regra: ' + ops);
    semErros(pg); await pg.context().close();
  });

  await teste('Teste da passagem da fresa acusa erro de verdade (G0 no material, fundo demais, invasão de peça)', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => { const R = ensureResult(true); const s = R.sheets[0]; const ok = simAnalisar(s, toolpath(s).code); const p = s.parts[0];
      const ruim1 = simAnalisar(s, 'G0 Z5\nG0 X100 Y100\nG1 Z-5 F1000\nG0 X300 Y100\nG0 Z15');
      const ruim2 = simAnalisar(s, `G0 X${p.x - 5} Y${p.y + 20}\nG1 Z-${s.esp + 3} F1000\nG1 X${p.x - 5} Y${p.y + 60}\nG0 Z15`);
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2; const ruim3 = simAnalisar(s, `G0 X${cx} Y${cy}\nG1 Z-5 F1000\nG1 X${cx + 40} Y${cy}\nG0 Z15`);
      return { ok: ok.ok, r1: ruim1.res.filter(x => !x.ok).map(x => x.txt), r2: ruim2.res.filter(x => !x.ok).map(x => x.txt), r3: ruim3.res.filter(x => !x.ok).map(x => x.txt) }; });
    confere(r.ok, 'o plano normal deveria passar no teste');
    confere(r.r1.some(t => t.includes('rápido')), 'não acusou G0 dentro do material: ' + r.r1);
    confere(r.r2.some(t => t.includes('mais que a chapa')), 'não acusou corte fundo demais: ' + r.r2);
    confere(r.r3.some(t => t.includes('invade') || t.includes('entra em peça')), 'não acusou invasão de peça: ' + r.r3);
    semErros(pg); await pg.context().close();
  });

  await teste('Várias ferramentas: furo de 35 com o caneco, furo de 5 com a broca, contorno com a fresa por último', async () => {
    const pg = await pagina();
    const r = await pg.evaluate(() => { const pr = proj(UI.proj); const c = pr.itens.flatMap(i => i.filhos).find(f => f.tipo === 'peca' && f.L >= 600 && f.W >= 300);
      c.ops = [furo(100, 22.5, 35, 13), furo(300, 100, 5, 12), furo(400, 150, 3, 10)]; touch(pr); const R = ensureResult(true); const s = R.sheets.find(s => s.parts.some(p => p.pid === c.id)); const tp = toolpath(s); const L = tp.code.split('\n');
      const iT = k => L.findIndex(l => l.startsWith(`(FERRAMENTA T${k} `)); const ultimoFuro35 = L.map((l, i) => l.includes('OP furo D35') ? i : -1).filter(i => i >= 0).pop();
      return { t4: iT(4), t5: iT(5), t1: L.map((l, i) => l.startsWith('(FERRAMENTA T1 ') ? i : -1).filter(i => i >= 0).pop(), ultimoFuro35, primeiroContorno: L.findIndex(l => /^\(\d+\.\d+\.\d+-\d+ /.test(l)), avisos: tp.avisos, trocas: tp.trocas, an: simAnalisar(s, tp.code).ok }; });
    confere(r.t4 >= 0 && r.t5 >= 0 && r.t1 > r.t4 && r.t1 > r.t5, 'ordem das ferramentas errada: ' + JSON.stringify(r));
    confere(r.ultimoFuro35 > r.t4 && (r.t5 < r.t4 || r.ultimoFuro35 < r.t5), 'furo de 35 fora da vez do caneco');
    confere(r.primeiroContorno > r.t1, 'contorno antes da fresa de corte');
    confere(r.avisos.some(a => a.includes('Ø3')), 'furo de 3 sem broca deveria avisar');
    confere(r.an, 'G-code com várias ferramentas reprovado no teste da fresa');
    semErros(pg); await pg.context().close();
  });

  await teste('DXF no padrão do kit do Aspire (mm, camadas PERFIL_EXT, FURO_D_P, ETIQUETAS)', async () => {
    const pg = await pagina();
    const d = await pg.evaluate(() => { const R = ensureResult(true); return dxf(R.sheets.find(s => s.parts.some(p => (p.ops || []).length))); });
    confere(/\$INSUNITS\r?\n70\r?\n4/.test(d), 'sem $INSUNITS = 4');
    confere(/PERFIL_EXT_E\d+/.test(d) && /FURO_D[\d.]+_P[\d.]+/.test(d) && d.includes('ETIQUETAS') && d.includes('CHAPA'), 'camadas fora do padrão do Aspire');
    semErros(pg); await pg.context().close();
  });

  await teste('Chapas de 6, 15 e 18 mm em abas separadas (espessura vinda do nome do material) e peças identificadas no plano', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { S.abertos = []; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'promob-espessuras.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(200); await pg.click('[data-act=mapGo]'); await pg.waitForTimeout(200);
    await pg.evaluate(() => { S.abertos = [UI.proj]; save(); });
    await pg.click('#tree [data-view=plano]'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const R = ensureResult(true); const G = groupsOf(R);
      return { abas: [...document.querySelectorAll('[data-act=pickMat]')].map(b => b.textContent.trim()), mistura: R.sheets.filter(s => s.parts.some(p => +p.esp !== +s.esp)).length,
        esp: proj(UI.proj).itens.flatMap(i => i.filhos).map(f => f.desc + ':' + f.esp).join(','), texto: document.querySelector('#canvas svg').textContent }; });
    confere(r.mistura === 0, 'chapa com espessuras misturadas');
    confere(r.abas.length === 3 && r.abas.some(a => a.startsWith('Cores.Branco - MDF - 6')) && r.abas.some(a => a.startsWith('Cores.Branco - MDF - 18')) && !r.abas.some(a => /15 - 15|18 - 18/.test(a)), 'abas erradas: ' + r.abas.join(' | '));
    confere(/Fundo:6/.test(r.esp) && /Tampo:18/.test(r.esp) && /Lateral:15/.test(r.esp), 'espessuras importadas erradas: ' + r.esp);
    confere(/Lateral|Base/.test(r.texto) && /1665 Balcao/.test(r.texto), 'peças sem nome ou sem caixote no plano');
    semErros(pg); await pg.context().close();
  });

  await teste('CorteCloud.txt real do Promob: abas por material e espessura, peças com nome', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { S.abertos = []; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'CorteCloud-real.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(300);
    await pg.evaluate(() => { S.abertos = [UI.proj]; save(); });
    await pg.click('#tree [data-view=plano]'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const R = ensureResult(true); const fs = proj(UI.proj).itens.flatMap(i => i.filhos);
      return { abas: [...document.querySelectorAll('[data-act=pickMat]')].map(b => b.textContent.trim()), mistura: R.sheets.filter(s => s.parts.some(p => +p.esp !== +s.esp || p.mat !== s.mat)).length,
        pecas: fs.reduce((a, f) => a + (+f.qty || 0), 0), linhas: fs.length, erros: R.errors.length, nomes: fs.map(f => f.desc).join(','), esp: fs.map(f => f.desc + ':' + f.esp).join(',') }; });
    confere(r.linhas === 39, 'linhas importadas: ' + r.linhas);
    confere(r.mistura === 0 && r.erros === 0, 'mistura=' + r.mistura + ' erros=' + r.erros);
    confere(r.abas.length === 5 && ['Branco - MDF - 6', 'Branco - MDF - 18', 'Arauco.Gaia - MDF - 6', 'Arauco.Gaia - MDF - 15', 'Cinza Sagrado - MDF - 15'].every(a => r.abas.some(x => x.includes(a))), 'abas erradas: ' + r.abas.join(' | '));
    confere(/Lateral/.test(r.nomes) && /Base/.test(r.nomes) && /Porta/.test(r.nomes) && !/MDF - /.test(r.nomes), 'nomes errados: ' + r.nomes);
    confere(/Fundo 6:6/.test(r.esp) && /Base 18:18/.test(r.esp) && /Lateral 15:15/.test(r.esp), 'espessuras erradas: ' + r.esp);
    semErros(pg); await pg.context().close();
  });

  await teste('Furação Zinni automática no CorteCloud real (porta, base, lateral) e mapa de furação', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { S.abertos = []; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'CorteCloud-real.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const fs = proj(UI.proj).itens.flatMap(i => i.filhos); const ach = re => fs.find(f => re.test(f.desc));
      const porta = ach(/^Porta Reta/), base18 = ach(/^Base 18/), lat15 = ach(/^Lateral 15/), fundo = ach(/^Fundo 6/), gav = ach(/Lateral de Gaveta/);
      return { porta: porta.ops.map(o => [o.d, o.x, o.y, o.prof]), portaLW: [porta.L, porta.W], base: base18.ops.filter(o => o.tipo === 'furo').map(o => [o.d, o.x, o.prof]), lat: lat15.ops.map(o => [o.d, o.x]), fundo: fundo.ops.length, gav: gav.ops.length }; });
    confere(r.porta.length === 2 && r.porta.every(o => o[0] === 35 && o[1] === 22.5 && o[3] === 12) && r.porta[1][2] === r.portaLW[1] - 100, 'caneco da porta: ' + JSON.stringify(r));
    confere(r.base.length === 4 && r.base.every(o => o[0] === 15 && o[2] === 13.5) && r.base[0][1] === 24, 'minifix da base 18: ' + JSON.stringify(r.base));
    confere(r.lat.length === 4 && r.lat.every(o => o[0] === 5) && r.lat[0][1] === 8, 'haste na lateral 15: ' + JSON.stringify(r.lat));
    confere(r.fundo === 0 && r.gav === 9, 'fundo sem furação e lateral de gaveta com 4 cavilhas + 5 furos da H45: ' + r.fundo + '/' + r.gav);
    await pg.click('#tree [data-view=desenhos]'); await pg.waitForTimeout(300);
    await pg.click('[data-act=imprimirFuros]'); await pg.waitForTimeout(400);
    const doc = await pg.evaluate(() => document.querySelector('#backPreview, .bk-preview, iframe') ? (document.querySelector('iframe')?.contentDocument?.body?.textContent || document.body.textContent) : document.body.textContent);
    confere(/Mapa de Furação/.test(doc) && /Minifix: grampo 3ª geração, máscara 18 mm/.test(doc) && /Dobradiça: fresa caneco 35 mm, 5 mm da borda/.test(doc), 'mapa de furação incompleto');
    const g = await pg.evaluate(() => { closeBack(); const R = ensureResult(true); return R.sheets.map(s => toolpath(s).code).join('\n'); });
    confere(/D35/.test(g) && /D15/.test(g), 'G-code sem os furos');
    semErros(pg); await pg.context().close();
  });

  await teste('Regras de furação editáveis e furos editados à mão não são trocados ao refazer', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { S.abertos = []; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'CorteCloud-real.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(300);
    // muda a regra da prateleira para "sem furação" pela tela
    await pg.evaluate(() => { UI.view = 'cad-ferr'; render(); });
    const i = await pg.evaluate(() => furRegras().findIndex(r => r.nomes === 'prateleira'));
    await pg.selectOption(`tr[data-ri="${i}"] select[data-rg=esq]`, 'nenhum');
    // edita à mão uma base: tira um furo pelo Editor
    await pg.click('#tree [data-view=desenhos]'); await pg.waitForTimeout(300);
    const cid = await pg.evaluate(() => proj(UI.proj).itens.flatMap(i => i.filhos).find(f => /^Base 18/.test(f.desc)).id);
    await pg.click(`[data-act=desEditar][data-cid="${cid}"]`); await pg.waitForTimeout(300);
    await pg.evaluate(() => { EDIT.d.ops.splice(0, 1); }); await pg.click('[data-act=edOk]'); await pg.waitForTimeout(200);
    await pg.click('[data-act=furAuto]'); await pg.waitForTimeout(200);
    const r = await pg.evaluate(() => { const fs = proj(UI.proj).itens.flatMap(i => i.filhos);
      return { prat: fs.filter(f => /Prateleira/.test(f.desc)).map(f => f.ops.length), base: fs.find(f => /^Base 18/.test(f.desc)), porta: fs.find(f => /^Porta/.test(f.desc)).auto }; });
    confere(r.prat.every(n => n === 0), 'prateleira devia ficar sem furo: ' + r.prat);
    confere(r.base.ops.length === 7 && r.base.auto === false, 'base editada foi trocada: ' + r.base.ops.length);
    confere(r.porta === true, 'porta devia ser automática');
    const txt = await pg.textContent('#content');
    confere(/editada à mão/.test(txt) && /automática: Porta c\/ dobradiças/.test(txt), 'desenho não mostra origem da furação');
    semErros(pg); await pg.context().close();
  });

  await teste('Gavetas: corrediça do projeto (H45 fura a lateral da gaveta; oculta fura a traseira)', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { S.abertos = []; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'CorteCloud-real.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(300);
    const pega = () => pg.evaluate(() => { const fs = proj(UI.proj).itens.flatMap(i => i.filhos); const lat = fs.find(f => /Lateral de Gaveta/.test(f.desc) && +f.L === 291), tras = fs.find(f => /Posterior de Gaveta/.test(f.desc) && +f.W === 271);
      return { lat: lat.ops.filter(o => o.d === 3).map(o => [o.x, o.y]), tras: tras.ops.filter(o => o.d === 7).map(o => [o.x, o.y]) }; });
    const a = await pega();
    confere(a.lat.length === 5 && a.lat.every(o => o[0] === 145.5) && a.lat.map(o => o[1]).join() === '49,113,241,401,449' && a.tras.length === 0, 'H45 (corrediça 500 na lateral de 535, centro da altura): ' + JSON.stringify(a));
    await pg.selectOption('[data-pf=corredica]', 'unihide'); await pg.waitForTimeout(300);
    const b = await pega();
    confere(b.lat.length === 0 && b.tras.length === 2 && b.tras[0][0] === 7 && b.tras[0][1] === 11, 'oculta: ' + JSON.stringify(b));
    // altura a partir do fundo e furos editados da H45
    await pg.evaluate(() => { S.cad.furacao = {...S.cad.furacao, corrAltura:'fundo', corrDist:40}; S.cad.corrFuros = {'h45:500':'60, 300'}; });
    await pg.selectOption('[data-pf=corredica]', 'h45'); await pg.waitForTimeout(300);
    const c = await pega();
    confere(c.lat.map(o => o.join('/')).join() === '40/60,40/300', 'H45 com altura do fundo e furos editados: ' + JSON.stringify(c));
    semErros(pg); await pg.context().close();
  });

  await teste('Orçamento antes do plano: chapas pelo plano, preços da Leo, corrediças, preço digitado e margem', async () => {
    const pg = await pagina();
    await pg.evaluate(() => { S.abertos = []; importDialog(); });
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-act=impBrowse][data-t=txt]')]);
    await fc.setFiles(path.join(DADOS, 'CorteCloud-real.txt'));
    await pg.click('[data-act=impOk]'); await pg.waitForTimeout(300);
    const ordem = await pg.evaluate(() => [...document.querySelectorAll('#tree [data-view]')].map(e => e.dataset.view).join());
    confere(ordem.indexOf('orcamento') < ordem.indexOf('plano'), 'Orçamento não vem antes do Plano de Corte: ' + ordem);
    await pg.click('#tree [data-view=orcamento]'); await pg.waitForTimeout(400);
    const a = await pg.evaluate(() => { const T = orcamento(), R = ensureResult(); const ch = k => T.chapas.find(x => x.key.startsWith('chapa|' + k));
      return { n: T.nCh, plano: R.sheets.filter(s => !s.sobraId).length, b18: ch('Branco - MDF - 18|18').preco, cinza: ch('Duratex.Cristallo.Cinza Sagrado').preco, gaia: ch('Arauco.Gaia - MDF - 15|15'), corr: T.ferr.find(x => /H45 500/.test(x.desc)), dob: T.ferr.find(x => /Dobradi/.test(x.desc)) }; });
    confere(a.n === a.plano && a.n === 7, 'chapas do orçamento ≠ plano: ' + a.n + '/' + a.plano);
    confere(a.b18 === 492.9 && a.cinza === 570.9, 'preços da Leo não achados: ' + a.b18 + ' / ' + a.cinza);
    confere(a.gaia.preco === 0 && a.gaia.qtd === 3, 'Gaia devia estar sem preço com 3 chapas');
    confere(a.corr && a.corr.qtd === 3 && a.corr.preco > 0 && a.dob && a.dob.qtd === 16, 'corrediças/dobradiças: ' + JSON.stringify([a.corr?.qtd, a.dob?.qtd]));
    await pg.fill('[data-orcp="chapa|Arauco.Gaia - MDF - 15|15"]', '600'); await pg.press('[data-orcp="chapa|Arauco.Gaia - MDF - 15|15"]', 'Tab'); await pg.waitForTimeout(200);
    await pg.fill('[data-orcf=margem]', '40'); await pg.press('[data-orcf=margem]', 'Tab'); await pg.waitForTimeout(200);
    const b = await pg.evaluate(() => { const T = orcamento(); return { gaia: T.chapas.find(x => x.key === 'chapa|Arauco.Gaia - MDF - 15|15').sub, custo: T.custo, venda: T.venda }; });
    confere(b.gaia === 1800 && Math.abs(b.venda - b.custo * 1.4) < 0.01, 'preço digitado/margem: ' + JSON.stringify(b));
    await pg.click('[data-act=imprimirOrc]'); await pg.waitForTimeout(400);
    confere(await pg.evaluate(() => UI.rep === 'orcamento' && /Preço de venda/.test(document.body.textContent + ([...document.querySelectorAll('iframe')].map(f => f.contentDocument?.body?.textContent || '').join('')))), 'impressão do orçamento');
    semErros(pg); await pg.context().close();
  });

  await teste('Visualizador 3D/2D: aba entre Arquivo e Principal, paredes pelo teclado, fechar, teto, 3D, propriedades e desfazer', async () => {
    const pg = await pagina();
    const abas = await pg.evaluate(() => [...document.querySelectorAll('.rtabs button')].map(b => b.textContent.trim()).join('|'));
    confere(abas.startsWith('Arquivo|Visualizador 3D/2D|Principal'), 'ordem das abas: ' + abas);
    await pg.click('#abaVis'); await pg.waitForTimeout(400);
    await pg.waitForFunction(() => MOTOR.pronto, null, { timeout: 30000 }).catch(() => {});
    confere(await pg.evaluate(() => MOTOR.pronto && !!motor()?.estado && $('#motorHost').style.display === 'block'), '3D não abriu (motor 3D não carregou)');
    await pg.click('[data-act=ambModo][data-m="2d"]'); await pg.waitForTimeout(250); confere(await pg.evaluate(() => !!$('#amb2d')), 'Editor de Paredes não abriu');
    await pg.click('#ribbon [data-act=ambConstruir]'); await pg.waitForTimeout(200);
    const box = await pg.locator('#amb2d').boundingBox();
    await pg.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.6); await pg.waitForTimeout(150);
    const p0 = await pg.evaluate(() => AV.cons.pts[0]);
    confere(p0[0] % 50 === 0 && p0[1] % 50 === 0, 'ponto inicial fora do incremento: ' + p0);
    for(const [ang, comp] of [[90, 3000], [0, 2400], [270, 3000]]){
      await pg.fill('[data-ac=angAbs]', String(ang)); await pg.press('[data-ac=angAbs]', 'Enter'); await pg.waitForTimeout(80);
      await pg.keyboard.type(String(comp)); await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
    }
    const P = await pg.evaluate(() => amb().paredes.map(w => [w.x2 - w.x1, w.y2 - w.y1]));
    confere(JSON.stringify(P) === '[[0,3000],[2400,0],[0,-3000]]', 'paredes digitadas: ' + JSON.stringify(P));
    const f = await pg.evaluate(() => { const svg = $('#amb2d'), [x, y] = AV.cons.pts[0], p = new DOMPoint(x, -y).matrixTransform(svg.getScreenCTM()); return [p.x, p.y]; });
    await pg.mouse.move(f[0] + 3, f[1] - 2); await pg.mouse.click(f[0] + 3, f[1] - 2); await pg.waitForTimeout(300);
    const fe = await pg.evaluate(() => ({cons:!!AV.cons, n:amb().paredes.length, piso:amb().piso, ult:amb().paredes[3]}));
    confere(!fe.cons && fe.n === 4 && fe.ult.x2 === p0[0] && fe.ult.y2 === p0[1], 'não fechou o ambiente: ' + JSON.stringify(fe));
    confere(fe.piso.w === 2700 && fe.piso.h === 3300, 'piso não ajustou às paredes: ' + JSON.stringify(fe.piso));
    await pg.click('[data-act=ambTeto]'); await pg.waitForTimeout(250);
    const te = await pg.evaluate(() => ({n:amb().tetos.length, area:Math.abs(areaPol(amb().tetos[0].pts)), af:amb().tetos[0].afast, sel:AV.sel?.t}));
    confere(te.n === 1 && te.area === 2400 * 3000 && te.af === 2600 && te.sel === 'teto', 'teto: ' + JSON.stringify(te));
    await pg.fill('[data-at=afast]', '2500'); await pg.press('[data-at=afast]', 'Tab'); await pg.waitForTimeout(150);
    confere(await pg.evaluate(() => amb().tetos[0].afast) === 2500, 'afastamento do teto não mudou');
    // seleciona uma parede clicando no 3D (vista frontal, sem teto)
    await pg.click('[data-act=ambModo][data-m="3d"]'); await pg.waitForTimeout(300); await pg.click('[data-act=pbMenu][data-m=preench]'); await pg.click('#pbMenu [data-act=ambVerTeto]'); await pg.click('[data-act=pbMenu][data-m=vistas]'); await pg.click('#pbMenu [data-act=pbVista][data-v=fre]'); await pg.waitForTimeout(800);
    const c3 = await pg.locator('#motorHost').boundingBox(); await pg.mouse.click(c3.x + c3.width / 2, c3.y + c3.height * 0.6); await pg.waitForTimeout(400);
    confere(await pg.evaluate(() => AV.sel?.t === 'parede'), 'clique no 3D não selecionou parede: ' + JSON.stringify(await pg.evaluate(() => AV.sel)));
    const wid = await pg.evaluate(() => AV.sel.id);
    await pg.fill('[data-ap=comp]', '3600'); await pg.press('[data-ap=comp]', 'Tab'); await pg.waitForTimeout(200);
    const liga = await pg.evaluate(id => { const P = amb().paredes, w = P.find(x => x.id === id); return {L:Math.round(wLen(w)), ligada:P.some(v => v !== w && perto(v.x1, v.y1, w.x2, w.y2))}; }, wid);
    confere(liga.L === 3600 && liga.ligada, 'comprimento pelo painel: ' + JSON.stringify(liga));
    await pg.fill('[data-ap=altFim]', '2300'); await pg.press('[data-ap=altFim]', 'Tab'); await pg.waitForTimeout(150);
    confere(await pg.evaluate(id => amb().paredes.find(x => x.id === id).altFim, wid) === 2300, 'pé-direito final');
    await pg.click('[data-act=ambDesfazer]'); await pg.click('[data-act=ambDesfazer]'); await pg.waitForTimeout(200);
    confere(await pg.evaluate(id => Math.round(wLen(amb().paredes.find(x => x.id === id))), wid) !== 3600, 'desfazer não voltou o comprimento');
    await pg.click('[data-act=ambRefazer]'); await pg.waitForTimeout(150);
    confere(await pg.evaluate(id => Math.round(wLen(amb().paredes.find(x => x.id === id))), wid) === 3600, 'refazer');
    // fica salvo no projeto e volta depois de reabrir
    await pg.evaluate(() => doSave()); await pg.reload(); await pg.waitForTimeout(600);
    confere(await pg.evaluate(() => UI.aba === 'vis' && amb().paredes.length === 4 && amb().tetos.length === 1), 'ambiente não ficou salvo');
    await pg.click('#abaPrin'); await pg.waitForTimeout(200);
    confere(await pg.evaluate(() => UI.aba === 'principal' && !!document.querySelector('[data-act=novoProjeto]')), 'Principal não voltou');
    semErros(pg); await pg.context().close();
  });

  await browser.close();
  const ok = resultados.filter(r => r.ok).length;
  console.log(`\n${ok} de ${resultados.length} testes passaram.`);
  fs.writeFileSync(path.join(__dirname, 'ultimo-resultado.json'), JSON.stringify({ alvo: ALVO, quando: new Date().toISOString(), resultados }, null, 1));
  process.exit(ok === resultados.length ? 0 : 1);
})();
