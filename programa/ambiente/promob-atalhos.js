
/* ================= Atalhos do teclado (manual cap. 32) e seleção múltipla ================= */
const PB_ATALHOS = [['M', 'Seleção'], ['P', 'Pan'], ['R', 'Rotação'], ['Z', 'Zoom'], ['W', 'Zoom Window'], ['F5', 'Zoom Total Plano (item selecionado)'], ['F6', 'Zoom Total'], ['F8', 'Ortogonal / Perspectiva'], ['F10', 'Tela cheia'],
  ['D', 'Calcular distância'], ['C', 'Caminhar (setas ou W A S D)'], ['B', 'Colisão liga/desliga'], ['O', 'Ocultar o item selecionado'], ['H', 'Mover hotpoint (curvar parede no Editor de Paredes) / mostrar hotpoints'], ['X / Y', 'Travar o movimento no eixo X / Y'],
  ['E', 'Propriedades do item'], ['A', 'Agregados: abre o Construtor de Armários'], ['I', 'Inverter (lado da porta)'], ['S', 'Substituir (estrutura do armário, tipo da abertura)'], ['U', 'Agrupar / desagrupar a seleção'], ['Delete', 'Excluir'],
  ['Ctrl+D', 'Duplicar'], ['Ctrl+C / Ctrl+V', 'Copiar / colar o item'], ['Ctrl+Z / Ctrl+Y', 'Desfazer / refazer'], ['Ctrl+A', 'Abrir projeto'], ['Setas', 'Mover o item pelo Passo (Shift = ×10); PageUp/PageDown sobem e descem'], ['Esc', 'Cancela a ferramenta e volta para a Seleção'], ['F1', 'Esta ajuda'], ['F11', 'Sobre o programa']];
function pbAjuda(){ modal('Atalhos e ajuda', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><table class="kv" style="width:100%">${PB_ATALHOS.map(([k, v]) => `<tr><td style="white-space:nowrap"><b>${k}</b></td><td>${v}</td></tr>`).join('')}</table>
  <div><b>Mouse no Ambiente 3D</b><ul style="margin:6px 0 12px;padding-left:18px"><li>Botão esquerdo: seleciona (Ctrl soma itens à seleção).</li><li>Botão do meio: pan. Botão direito arrastando: gira.</li><li>Botão direito parado: menu do item.</li><li>Roda: zoom. Duplo clique na parede: vista rápida.</li></ul>
  <b>Tela (manual 2.3)</b><ul style="margin:6px 0 12px;padding-left:18px"><li>Barra de ferramentas em cima, biblioteca de Módulos logo abaixo.</li><li>Ferramentas e Propriedades à direita.</li><li>Barra lateral à esquerda: Projeto, Camadas, Lista de itens e Vistas (fixe com o alfinete).</li><li>Embaixo: Ambiente 3D, Editor de Paredes e Renders; Materiais; barra de status.</li></ul>
  <b>Armários</b><p style="margin:6px 0">Selecione a parede ou o piso e use Construir Armário (ou A). Cada armário vira um item do projeto com as peças, que vão para o Plano de Corte.</p></div></div>`,
  `<button class="btn pri" data-act="modalClose">Fechar</button>`, {w:'860px'}); }
function pbSobre(){ modal('Sobre', `<p style="margin:0 0 8px"><b>Plano de Corte CNC</b> · Visualizador 3D/2D no estilo do Promob.</p><p class="muted" style="margin:0">Motor 3D: Panelizer (MIT) com React Three Fiber e three.js. Funciona sem internet.</p>`, `<button class="btn pri" data-act="modalClose">Fechar</button>`, {w:'420px'}); }

/* ---- seleção (Ctrl soma itens; grupos selecionam juntos) ---- */
const pbIgual = (a, b) => !!a && !!b && a.t === b.t && a.id === b.id;
function ambSelecionar(s, ctrl){ const A = amb();
  if(ctrl && s && s.t !== 'piso'){ const M = AV.multi?.length ? [...AV.multi] : AV.sel && AV.sel.t !== 'piso' ? [AV.sel] : []; const i = M.findIndex(m => pbIgual(m, s)); if(i >= 0) M.splice(i, 1); else M.push(s); AV.multi = M; AV.sel = M[M.length - 1] || null; }
  else { const g = s && (A.grupos || []).find(g => g.some(m => pbIgual(m, s))); AV.multi = g ? g.map(m => ({...m})) : []; AV.sel = s; }
  if(AV.multi.length < 2) AV.multi = []; }
const pbSelecao = () => (AV.multi?.length > 1 ? AV.multi : AV.sel ? [AV.sel] : []).filter(s => s.t !== 'piso');

/* ---- ações de item ---- */
function pbOcultar(){ const L = pbSelecao(); if(!L.length){ toast('Selecione o item para ocultar.'); return; } ambSnap(); let n = 0; for(const s of L){ const o = ambObjDe(s); if(o){ o.oculto = !o.oculto; n++; } }
  const oc = ambObjDe(L[0])?.oculto; if(oc && !AV.verOcultos){ AV.sel = null; AV.multi = []; } ambMudou(); toast(oc ? `${n} item(ns) oculto(s). Mostrar ▾ › Itens ocultos traz de volta.` : 'Item visível de novo.'); }
function pbInverter(s = AV.sel){ const o = ambObjDe(s); if(!o) return;
  if(s.t === 'abertura'){ ambSnap(); o.inv = !o.inv; ambMudou(); return; }
  if(s.t === 'armario'){ ambSnap(); const vai = n => { if(n.porta?.tipo === 'esq') n.porta.tipo = 'dir'; else if(n.porta?.tipo === 'dir') n.porta.tipo = 'esq'; if(n.div?.o === 'v' && n.f?.length > 1){ const t = n.div.virtual ? 0 : armCh(o.chapa).esp, W = armLayout(o).vaos.find(v => v.id === n.id)?.w; if(W){ n.div.c = n.div.c.map(c => W - c - t).reverse(); n.f.reverse(); } } (n.f || []).forEach(vai); }; vai(o.raiz); ambMudou(); return; }
  toast('Inverter vale para portas, janelas e armários.'); }
function pbSubstituir(s = AV.sel){ const o = ambObjDe(s); if(!o){ toast('Selecione o item para substituir.'); return; }
  if(s.t === 'armario'){ PB.armSubst = o.id; PB.armAlvo = null; modal('Substituir estrutura', `<p class="muted" style="margin:0 0 10px">O armário fica no mesmo lugar e com a mesma largura; muda a estrutura e os vãos.</p><div class="arm-est">${Object.entries(ARM_EST).map(([k, v]) => `<button data-act="armEstOk" data-k="${k}">${armSVG(armNovo(k), {mini:true})}<b>${esc(v.nome)}</b></button>`).join('')}</div>`, `<button class="btn" data-act="modalClose">Cancelar</button>`, {w:'720px'}); return; }
  if(s.t === 'abertura'){ const t = Object.keys(AB_TIPOS), w = amb().paredes.find(v => v.id === o.parede); ambSnap(); o.tipo = t[(t.indexOf(o.tipo) + 1) % t.length]; const n = AB_TIPOS[o.tipo]; o.larg = n[1]; o.alt = n[2]; o.afast = n[3]; if(w) o.pos = AV.colisao ? abColisao(o, w) : Math.max(0, Math.min(wLen(w) - o.larg, o.pos)); ambMudou(); toast(`Agora é ${n[0]}.`); return; }
  toast('Substituir vale para armários e aberturas.'); }
function pbAgrupar(){ const A = amb(), L = pbSelecao(); A.grupos = A.grupos || [];
  const g = A.grupos.findIndex(g => L.length && g.length === L.length && g.every(m => L.some(x => pbIgual(x, m)))); ambSnap();
  if(g >= 0){ A.grupos.splice(g, 1); AV.multi = []; ambMudou(); toast('Grupo desfeito.'); return; }
  if(L.length < 2){ AV.undo.pop(); toast('Selecione dois ou mais itens com Ctrl + clique para agrupar.'); return; }
  A.grupos = A.grupos.filter(g => !g.some(m => L.some(x => pbIgual(x, m)))); A.grupos.push(L.map(s => ({t:s.t, id:s.id}))); ambMudou(); toast(`${L.length} itens agrupados: um clique seleciona todos.`); }
function pbCopiar(){ const L = pbSelecao().filter(s => s.t !== 'parede'); if(!L.length){ toast('Selecione o item para copiar.'); return; } AV.clip = L.map(s => ({t:s.t, o:JSON.parse(JSON.stringify(ambObjDe(s)))})).filter(c => c.o); toast(`${AV.clip.length} item(ns) copiado(s). Ctrl+V cola.`); }
function pbColar(){ const C = AV.clip; if(!C?.length) return; const A = amb(); ambSnap(); const novos = [];
  for(const c of C){ let o = JSON.parse(JSON.stringify(c.o)); const k = AMB_LISTA[c.t]; if(!k) continue;
    if(c.t === 'armario'){ o = armClone(o); const w = o.parede && A.paredes.find(v => v.id === o.parede); if(w) armNaParede(o, w, armPosNaParede(o, w) + o.L * 1.5); else { o.x += 300; o.y -= 300; } }
    else { o.id = uid(); if('pos' in o) o.pos += o.larg + 100; else if('x' in o){ o.x += 300; if(o.pts) o.pts = o.pts.map(p => [p[0] + 300, p[1]]); } }
    A[k].push(o); novos.push({t:c.t, id:o.id}); }
  AV.multi = novos.length > 1 ? novos : []; AV.sel = novos[novos.length - 1] || null; ambMudou(); }
function pbDuplicar(){ const s = AV.sel; if(!s || s.t === 'piso'){ toast('Selecione o item para duplicar.'); return; } if(s.t === 'armario' || AV.multi?.length > 1){ const c = AV.clip; pbCopiar(); pbColar(); AV.clip = c; return; } ambAcao3D('duplicar', s); }
// setas: movem o item pelo Passo (na parede, ao longo dela)
function pbMover(dx, dy, dz){ const L = pbSelecao(); if(!L.length) return false; const A = amb(); if(AV.trava === 'x'){ dy = 0; } else if(AV.trava === 'y'){ dx = 0; } ambSnap(); let mexeu = false;
  for(const s of L){ const o = ambObjDe(s); if(!o) continue;
    if(s.t === 'armario'){ const w = o.parede && A.paredes.find(v => v.id === o.parede); if(dz) o.z = Math.max(0, +o.z + dz); if(w && dx){ armNaParede(o, w, armPosNaParede(o, w) + o.L / 2 + dx); } else if(!w){ o.x += dx; o.y += dy; } mexeu = true; }
    else if(s.t === 'abertura'){ const w = A.paredes.find(v => v.id === o.parede); if(!w) continue; o.pos = Math.max(0, Math.min(wLen(w) - o.larg, o.pos + dx)); if(dy || dz) o.afast = Math.max(0, o.afast + (dz || dy)); if(AV.colisao) o.pos = abColisao(o, w); mexeu = true; }
    else if(s.t === 'parede'){ if(L.length > 1) continue; const x1 = o.x1, y1 = o.y1, x2 = o.x2, y2 = o.y2; ambMoverVertice(A, x1, y1, x1 + dx, y1 + dy); ambMoverVertice(A, x2, y2, x2 + dx, y2 + dy); mexeu = true; }
    else if('x' in o){ o.x += dx; o.y += dy; if(o.pts) o.pts = o.pts.map(p => [p[0] + dx, p[1] + dy]); if(dz && 'z' in o) o.z = Math.max(0, +o.z + dz); mexeu = true; } }
  if(!mexeu){ AV.undo.pop(); return false; } if(A.piso.auto && L.some(s => s.t === 'parede')) ambAjustarPiso(A); ambMudou(); return true; }

/* ---- o atalho em si (vem do teclado da página ou do 3D) ---- */
function pbTecla(t){ if(UI.aba !== 'vis' || UI.back || $('#modalRoot').innerHTML) return false; const k = t.key, kl = k.length === 1 ? k.toLowerCase() : k, p = (+AV.passo || 10) * (t.shift ? 10 : 1);
  if(t.ctrl){ if(kl === 'z'){ ACT.ambDesfazer(); return true; } if(kl === 'y'){ ACT.ambRefazer(); return true; } if(kl === 'd'){ pbDuplicar(); return true; } if(kl === 'c'){ pbCopiar(); return true; } if(kl === 'v'){ pbColar(); return true; } if(kl === 'a'){ ACT.abrirArquivo?.(); return true; } return false; }
  if(t.alt) return false;
  switch(kl){
    case 'm': pbNav('sel'); return true; case 'p': pbNav('pan'); return true; case 'r': if(AV.modo !== '2d') pbNav('rot'); return true; case 'z': pbNav('zoom'); return true; case 'w': pbNav('janela'); return true;
    case 'F5': pbZoomPlano(); return true; case 'F6': ACT.ambEnquadrar(); return true; case 'F8': ACT.ambPersp(); return true; case 'F10': if(AV.modo !== '3d'){ AV.modo = '3d'; render(); } setTimeout(() => motor()?.cmd('telaCheia'), 40); return true;
    case 'F1': pbAjuda(); return true; case 'F11': pbSobre(); return true;
    case 'd': ACT.ambMedir(); return true; case 'c': ACT.ambCaminhar(); return true; case 'b': ACT.ambColisao(); pbStatus(); toast(`Colisão ${AV.colisao ? 'ligada' : 'desligada'}.`); return true;
    case 'o': pbOcultar(); return true; case 'h': if(AV.modo === '2d') ACT.ambFerr({dataset:{f:'curva'}}); else ACT.ambHotpoints(); return true;
    case 'x': case 'y': AV.trava = AV.trava === kl ? null : kl; pbStatus(); toast(AV.trava ? `Movimento travado no eixo ${kl.toUpperCase()}.` : 'Trava desligada.'); return true;
    case 'e': { const i = $('#ambPainel .pb-kv input:not([readonly]), #ambPainel .pb-kv select'); if(i){ i.focus(); i.select?.(); i.scrollIntoView({block:'nearest'}); } else toast('Selecione um item para ver as propriedades.'); return true; }
    case 'a': if(AV.sel?.t === 'armario') armEditar(AV.sel.id); else armConstruir(); return true;
    case 'i': pbInverter(); return true; case 's': pbSubstituir(); return true; case 'u': pbAgrupar(); return true;
    case 'Delete': if(pbSelecao().length){ ACT.ambExcluir(); return true; } return false;
    case 'Escape': { const tinha = AV.nav !== 'sel' || AV.multi?.length || AV.trava; AV.nav = 'sel'; AV.multi = []; AV.trava = null; if(tinha){ motorRoom(); renderRibbonVis(); pbStatus(); } return !!tinha; }
    case 'ArrowLeft': return pbMover(-p, 0, 0); case 'ArrowRight': return pbMover(p, 0, 0);
    case 'ArrowUp': return AV.sel?.t === 'armario' && amb().armarios.find(a => a.id === AV.sel.id)?.parede ? pbMover(0, 0, p) : pbMover(0, p, 0);
    case 'ArrowDown': return AV.sel?.t === 'armario' && amb().armarios.find(a => a.id === AV.sel.id)?.parede ? pbMover(0, 0, -p) : pbMover(0, -p, 0);
    case 'PageUp': return pbMover(0, 0, p); case 'PageDown': return pbMover(0, 0, -p);
  }
  return false; }
// barra de status: passo e cor do material
document.addEventListener('change', e => { const t = e.target; if(UI.aba !== 'vis') return;
  if(t.id === 'pbPasso'){ AV.passo = Math.max(1, num(t.value) || 10); pbGuardar(); return; }
  if(t.id === 'pbMatCor'){ const L = pbSelecao().map(ambObjDe).filter(Boolean); if(!L.length) return; ambSnap(); L.forEach(o => { o.cor = t.value; }); ambMudou(); }
  if(t.dataset.aa){ const a = ambSelObj(); if(!a || AV.sel?.t !== 'armario') return; const k = t.dataset.aa, txt = ['nome', 'chapa', 'chapaFrente', 'chapaFundo', 'borda', 'fundo'].includes(k), v = txt ? t.value : num(t.value);
    if(!txt && !isFinite(v)) return renderAmbiente(true); if(['L', 'A', 'P'].includes(k) && v < 150) return renderAmbiente(true); ambSnap();
    const w = a.parede && amb().paredes.find(x => x.id === a.parede);
    if(k === 'L' || k === 'A'){ const c = w ? armPosNaParede(a, w) + a.L / 2 : 0; armEscalar(a, k === 'L' ? v : a.L, k === 'A' ? v : a.A); if(w) armNaParede(a, w, c); }
    else if(k === 'rot'){ a.rot = v; delete a.parede; } else if(k === 'x' || k === 'y'){ a[k] = v; delete a.parede; } else a[k] = v;
    ambMudou(); } });
