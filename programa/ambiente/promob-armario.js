
/* ================= Construtor de Armários (manual 6.2, 10.10 e 10.11) =================
   O armário tem a estrutura (laterais, base, tampo, rodapé e fundo) e uma árvore de vãos.
   Cada vão pode ser dividido (divisória vertical ou divisão horizontal), receber gavetas, internos
   (prateleiras, cabideiro, cesto) e porta. As peças saem com as chapas e as bordas do Cadastro
   e entram no projeto como um item, que vai para o Plano de Corte.
   Sistema local: x na largura (da esquerda), y na profundidade (0 = fundo, junto da parede), z na altura. */
const ARM_EST = {
  inferior:{nome:'Balcão inferior', L:800, A:720, P:560, z:0, rodape:100, raiz:() => ({porta:{tipo:'dupla'}, int:[{t:'prat', z:300}]})},
  gaveteiro:{nome:'Gaveteiro', L:500, A:720, P:560, z:0, rodape:100, raiz:() => ({gav:{n:4}})},
  pia:{nome:'Balcão de pia', L:1200, A:720, P:560, z:0, rodape:100, raiz:() => ({porta:{tipo:'dupla'}})},
  aereo:{nome:'Aéreo', L:800, A:700, P:330, z:1500, rodape:0, raiz:() => ({porta:{tipo:'dupla'}, int:[{t:'prat', z:320}]})},
  basculante:{nome:'Aéreo basculante', L:800, A:350, P:330, z:1850, rodape:0, raiz:() => ({porta:{tipo:'basc'}})},
  torre:{nome:'Torre (paneleiro)', L:600, A:2100, P:560, z:0, rodape:100, raiz:() => ({div:{o:'h', c:[1300]}, f:[{porta:{tipo:'dir'}, int:[{t:'prat', z:420}, {t:'prat', z:850}]}, {porta:{tipo:'dir'}, int:[{t:'prat', z:300}]}]})},
  roupeiro:{nome:'Roupeiro', L:1600, A:2400, P:580, z:0, rodape:80, raiz:() => ({porta:{tipo:'correr'}, div:{o:'v', c:[880]}, f:[{div:{o:'h', c:[1780]}, f:[{int:[{t:'cab'}]}, {}]}, {div:{o:'h', c:[600]}, f:[{gav:{n:3}}, {int:[{t:'prat', z:550}, {t:'prat', z:1050}]}]}]})},
  estante:{nome:'Estante', L:900, A:1800, P:350, z:0, rodape:50, raiz:() => ({int:[{t:'prat', z:330}, {t:'prat', z:680}, {t:'prat', z:1030}, {t:'prat', z:1380}]})},
};
const ARM_PORTAS = {esq:'Porta de giro (dobradiça à esquerda)', dir:'Porta de giro (dobradiça à direita)', dupla:'Porta dupla', basc:'Porta basculante', correr:'Portas de correr (2 folhas)'};
const ARM_FUNDOS = {encaixado:'Encaixado (rasgo)', sobreposto:'Sobreposto (pregado)', nenhum:'Sem fundo'};

/* ---- chapas e bordas do Cadastro ---- */
function armChapas(){ const v = new Map(); for(const c of S.cad?.chapas || []) if(c.material && +c.esp > 0) v.set(c.material + '|' + +c.esp, {material:c.material, esp:+c.esp});
  if(!v.size) for(const [m, e] of [['MDF Branco', 15], ['MDF Branco', 18], ['MDF Branco', 6]]) v.set(m + '|' + e, {material:m, esp:e}); return [...v.values()].sort((a, b) => a.material.localeCompare(b.material) || a.esp - b.esp); }
function armChapaPadrao(fn){ const L = armChapas(); return L.find(fn) || L.find(c => c.esp >= 12) || L[0]; }
const armCh = s => { const [material, esp] = String(s || '').split('|'); return {material:material || 'MDF Branco', esp:+esp || 15}; };
function armCorChapa(material){ const m = String(material || '').toLowerCase();
  if(/pret|black|grafite|ébano/.test(m)) return {cor:'#3a3a3c', mat:'mdf'}; if(/cinz|gris|concreto|cimento|titânio|chumbo/.test(m)) return {cor:'#9c9fa3', mat:'mdf'};
  if(/carvalho|freij|nogueira|amadeir|madeira|louro|cedro|teca|imbuia|jequitib|nature|rústic|rustic|pinus|tauari|castanho/.test(m)) return {cor:'#b98a5a', mat:'madeira'};
  if(/azul/.test(m)) return {cor:'#5f86b3', mat:'mdf'}; if(/verde/.test(m)) return {cor:'#7d9b78', mat:'mdf'}; if(/bege|areia|off|creme|nude|fendi/.test(m)) return {cor:'#e3d6c0', mat:'mdf'};
  if(/branc|white|ártico|artico|neve/.test(m)) return {cor:'#f2f1ec', mat:'mdf'}; return {cor:'#e6dccb', mat:'mdf'}; }
const armBordaPadrao = () => S.cad?.bordas?.[0]?.desc || '';

/* ---- criar ---- */
let armSeq = 0;
function armNo(o = {}){ const n = {id:'v' + Date.now().toString(36) + (armSeq++).toString(36), int:[], ...o}; if(n.f) n.f = n.f.map(armNo); return n; }
function armNovo(k = 'inferior'){ if(String(k).startsWith('mod:')){ const m = armBib().find(x => x.id === k.slice(4)); if(m){ const a = armClone(m.a); a.x = 0; a.y = 0; a.est = k; return a; } k = 'inferior'; }
  const E = ARM_EST[k] || ARM_EST.inferior, c = armChapaPadrao(c => c.esp === 15), f = armChapaPadrao(c => c.esp === 18) || c, fu = armChapaPadrao(c => c.esp <= 9);
  return {id:uid(), nome:E.nome, est:k, x:0, y:0, z:E.z, rot:0, L:E.L, A:E.A, P:E.P, rodape:E.rodape, chapa:c.material + '|' + c.esp, chapaFrente:f.material + '|' + f.esp, chapaFundo:fu && fu.esp <= 9 ? fu.material + '|' + fu.esp : c.material + '|6',
    borda:armBordaPadrao(), folga:2, fundo:'encaixado', raiz:armNo(E.raiz())}; }
// Item do projeto inserido no ambiente: primeiro reutiliza um módulo real da Minha biblioteca.
// Só usa o invólucro genérico quando não existe módulo cadastrado compatível.
function armDeItem(i){
  const L = +i.L || 600, A = +i.A || 700, P = +i.P || 500;
  const mods = armBib();
  // Reutiliza apenas módulos com dimensões iguais: redimensionar a caixa sem recalcular os vãos
  // deslocaria prateleiras e divisórias e produziria peças diferentes no corte.
  const salvo = mods.find(m => m.a &&
    Math.abs(+m.a.L - L) <= 1 &&
    Math.abs(+m.a.A - A) <= 1 &&
    Math.abs(+m.a.P - P) <= 1);
  if(salvo?.a){
    const a = armClone(salvo.a);
    return {...a, nome:i.nome || a.nome, L, A, P, x:0, y:0, z:0, rot:0, deItem:i.id, est:'mod:' + salvo.id};
  }
  const a = armNovo('inferior');
  return {...a, nome:i.nome, L, A, P, z:0, rodape:0, deItem:i.id, raiz:armNo({porta:{tipo:'dupla'}})};
}
const armClone = a => { const c = JSON.parse(JSON.stringify(a)); const reid = n => { n.id = armNo().id; (n.f || []).forEach(reid); }; reid(c.raiz); c.id = uid(); delete c.item; delete c.assin; return c; };

/* ---- árvore de vãos ---- */
function armAcha(n, id, pai = null, i = -1){ if(n.id === id) return {n, pai, i}; for(let k = 0; k < (n.f || []).length; k++){ const r = armAcha(n.f[k], id, n, k); if(r) return r; } return null; }
function armCaminho(n, id){ if(n.id === id) return [n]; for(const c of n.f || []){ const r = armCaminho(c, id); if(r) return [n, ...r]; } return null; }
function armLCA(raiz, ids){ const P = ids.map(id => armCaminho(raiz, id)).filter(Boolean); if(!P.length) return null; let i = 0; while(P.every(p => p[i] && p[i] === P[0][i])) i++; return P[0][i - 1] || raiz; }
const armFolhas = n => n.f?.length ? n.f.flatMap(armFolhas) : [n];

/* ---- montagem: peças, acessórios e vãos ---- */
function armLayout(a){
  const ch = armCh(a.chapa), chF = armCh(a.chapaFrente), chU = armCh(a.chapaFundo), e = ch.esp, ef = chF.esp, eu = chU.esp, L = +a.L, A = +a.A, P = +a.P, rod = Math.max(0, +a.rodape || 0), fol = +a.folga || 0, bd = a.borda || '';
  const pecas = [], acess = [], vaos = [], divs = [], frentes = [];
  const B = (inf, sup, esq, dir) => ({inf:inf ? bd : '', sup:sup ? bd : '', esq:esq ? bd : '', dir:dir ? bd : ''});
  const add = (nome, parte, x, y, z, dx, dy, dz, o = {}) => { if(dx <= 0 || dy <= 0 || dz <= 0) return; pecas.push({nome, parte, x, y, z, dx, dy, dz, ch:o.ch || ch, bordas:o.bordas || B(1, 0, 0, 0), veio:o.veio ?? true, no:o.no, cor:o.cor, mat:o.mat}); };
  const ac = (desc, qty, o = {}) => { const k = acess.find(x => x.desc === desc); if(k) k.qty += qty; else acess.push({desc, qty, ...o}); };
  // estrutura
  const yU = a.fundo === 'sobreposto' ? eu : 0, yi = a.fundo === 'encaixado' ? 10 + eu : yU;
  add('Lateral esquerda', 'corpo', 0, yU, 0, e, P - yU, A); add('Lateral direita', 'corpo', L - e, yU, 0, e, P - yU, A);
  add('Base', 'corpo', e, yU, rod, L - 2 * e, P - yU, e); add('Tampo', 'corpo', e, yU, A - e, L - 2 * e, P - yU, e);
  if(rod > 0) add('Rodapé', 'corpo', e, P - 50 - e, 0, L - 2 * e, e, rod);
  if(a.fundo === 'encaixado') add('Fundo', 'fundo', e - 8, 10, rod + e - 8, L - 2 * e + 16, eu, A - rod - 2 * e + 16, {ch:chU, bordas:B(), veio:false});
  else if(a.fundo === 'sobreposto') add('Fundo', 'fundo', 0, 0, rod, L, eu, A - rod, {ch:chU, bordas:B(), veio:false});
  const X0 = e, X1 = L - e, Z0 = rod + e, Z1 = A - e;
  // vãos
  const no = (n, x, z, w, h, nivel) => {
    vaos.push({id:n.id, n, x, z, w, h, nivel, folha:!n.f?.length});
    if(n.div && n.f?.length){ const v = n.div.o === 'v', t = n.div.virtual ? 0 : e, tam = v ? w : h; let ini = 0; const cs = n.div.c;
      for(let i = 0; i < n.f.length; i++){ const fim = i < cs.length ? Math.max(ini + 20, Math.min(tam - t - 20, cs[i])) : tam; if(i < cs.length) cs[i] = Math.round(fim * 10) / 10;
        if(v) no(n.f[i], x + ini, z, fim - ini, h, nivel + 1); else no(n.f[i], x, z + ini, w, fim - ini, nivel + 1);
        if(i < cs.length){ divs.push({no:n.id, i, o:n.div.o, x:v ? x + fim : x, z:v ? z : z + fim, w:v ? t || 1 : w, h:v ? h : t || 1, virtual:!!n.div.virtual, ant:fim - ini, post:(i + 1 < cs.length ? cs[i + 1] : tam) - fim - t});
          if(!n.div.virtual){ if(v) add('Divisória', 'corpo', x + fim, yi, z, t, P - yi, h, {no:n.id}); else add('Divisão horizontal', 'corpo', x, yi, z + fim, w, P - yi, t, {no:n.id}); } }
        ini = fim + t; } }
    else { // internos e gavetas só nos vãos sem divisão
      for(const it of n.int || []){ if(it.t === 'prat'){ const zz = Math.max(z + 20, Math.min(z + h - e - 20, z + (+it.z || h / 2))); add('Prateleira', 'corpo', x + 1, yi, zz, w - 2, P - yi - 20, e, {no:n.id}); }
        else if(it.t === 'cab'){ add('Cabideiro', 'acessorio', x, (yi + P) / 2 - 10, z + h - 70, w, 20, 30, {cor:'#b9bec4', mat:'aluminio'}); ac('Cabideiro (tubo oblongo)', 1, {L:Math.round(w)}); ac('Suporte de cabideiro (par)', 1); }
        else if(it.t === 'cesto'){ const zz = z + (+it.z || 150); add('Cesto aramado', 'acessorio', x + 15, yi + 20, zz, w - 30, P - yi - 60, 120, {cor:'#c9ced3', mat:'aluminio'}); ac(`Cesto aramado ${Math.round(w)} mm`, 1); } }
      if(n.gav?.n > 0) frentes.push({tipo:'gav', n, x, z, w, h}); }
    if(n.porta?.tipo) frentes.push({tipo:n.porta.tipo, n, x, z, w, h});
  };
  no(a.raiz, X0, Z0, X1 - X0, Z1 - Z0, 0);
  // frentes sobrepostas: na borda de fora cobrem a chapa inteira; numa divisória cobrem a metade
  const tol = .5, ext = (de, ate) => [Math.abs(de.x - X0) < tol ? e : e / 2, Math.abs(de.x + de.w - X1) < tol ? e : e / 2, Math.abs(de.z - Z0) < tol ? e : e / 2, Math.abs(de.z + de.h - Z1) < tol ? e : e / 2].map(v => v - fol / 2);
  const dobr = h => h <= 900 ? 2 : h <= 1600 ? 3 : h <= 2000 ? 4 : 5, yF = P, puxador = (x, z, ver, nome) => add(nome || 'Puxador', 'acessorio', x - (ver ? 6 : 60), yF + ef, z - (ver ? 60 : 6), ver ? 12 : 120, 22, ver ? 120 : 12, {cor:'#8d949b', mat:'aluminio'});
  const fr = (nome, x, z, w, h, o = {}) => { add(nome, 'frente', x, o.y ?? yF, z, w, ef, h, {ch:chF, bordas:B(1, 1, 1, 1), no:o.no}); };
  for(const F of frentes){ const [eL, eR, eB, eT] = ext(F), fx = F.x - eL, fz = F.z - eB, fw = F.w + eL + eR, fh = F.h + eB + eT;
    if(F.tipo === 'gav'){ const n = F.n.gav.n, hf = (fh - (n - 1) * fol) / n, Pg = Math.max(250, Math.min(550, Math.floor((P - yi - 30) / 50) * 50)), lg = 15, folC = 13;
      for(let i = 0; i < n; i++){ const z0 = fz + i * (hf + fol); fr('Frente de gaveta', fx, z0, fw, hf, {no:F.n.id}); puxador(fx + fw / 2, z0 + hf - 40, false);
        const hg = Math.max(60, Math.min(hf - 50, 250)), zg = Math.max(F.z + 5, z0 + 15), xi = F.x + folC, wi = F.w - 2 * folC, yg = P - Pg;
        add('Lateral de gaveta', 'corpo', xi, yg, zg, lg, Pg, hg, {ch:{material:ch.material, esp:lg}, no:F.n.id}); add('Lateral de gaveta', 'corpo', xi + wi - lg, yg, zg, lg, Pg, hg, {ch:{material:ch.material, esp:lg}, no:F.n.id});
        add('Contra-frente de gaveta', 'corpo', xi + lg, P - lg, zg, wi - 2 * lg, lg, hg, {ch:{material:ch.material, esp:lg}, no:F.n.id}); add('Traseira de gaveta', 'corpo', xi + lg, yg, zg, wi - 2 * lg, lg, hg, {ch:{material:ch.material, esp:lg}, no:F.n.id});
        add('Fundo de gaveta', 'fundo', xi + lg - 6, yg + lg - 6, zg - 2, wi - 2 * lg + 12, Pg - 2 * lg + 12, eu, {ch:chU, bordas:B(), veio:false, no:F.n.id}); }
      ac(`Corrediça telescópica ${Pg} mm (par)`, n); ac('Puxador', n); }
    else if(F.tipo === 'correr'){ const fw2 = (fw + 50) / 2; fr('Porta de correr', fx, fz, fw2, fh, {y:P + 6, no:F.n.id}); fr('Porta de correr', fx + fw - fw2, fz, fw2, fh, {y:P + 12 + ef, no:F.n.id});
      puxador(fx + fw2 - 40, fz + fh / 2, true, 'Puxador'); ac('Kit porta de correr (2 folhas)', 1); ac(`Trilho superior e inferior ${Math.round(fw)} mm`, 1); ac('Puxador', 2); }
    else if(F.tipo === 'dupla'){ const w2 = (fw - fol) / 2; fr('Porta', fx, fz, w2, fh, {no:F.n.id}); fr('Porta', fx + w2 + fol, fz, w2, fh, {no:F.n.id}); puxador(fx + w2 - 35, fz + fh * (a.z > 900 ? .15 : .82), true); puxador(fx + w2 + fol + 35, fz + fh * (a.z > 900 ? .15 : .82), true); ac('Dobradiça 35 mm', 2 * dobr(fh)); ac('Puxador', 2); }
    else if(F.tipo === 'basc'){ fr('Porta basculante', fx, fz, fw, fh, {no:F.n.id}); puxador(fx + fw / 2, fz + 35, false); ac('Dobradiça 35 mm', dobr(fw)); ac('Pistão a gás (par)', 1); ac('Puxador', 1); }
    else { fr('Porta', fx, fz, fw, fh, {no:F.n.id}); puxador(F.tipo === 'esq' ? fx + fw - 35 : fx + 35, fz + fh * (a.z > 900 ? .15 : .82), true); ac('Dobradiça 35 mm', dobr(fh)); ac('Puxador', 1); } }
  if(rod > 0) ac('Pé regulável', L > 1000 ? 6 : 4);
  return {pecas, acess, vaos, divs, frentes, e, ef, yi};
}
// peça do plano de corte: o comprimento é a maior medida (veio) e a espessura é a da chapa
function armPecaPlano(p){ const d = [p.dx, p.dy, p.dz].map(v => Math.round(v * 10) / 10), k = d.findIndex(v => Math.abs(v - p.ch.esp) < .6); const r = d.filter((_, i) => i !== (k < 0 ? d.indexOf(Math.min(...d)) : k)).sort((x, y) => y - x); return {L:r[0], W:r[1]}; }
function armLista(a){ const Y = armLayout(a), g = new Map();
  for(const p of Y.pecas){ if(p.parte === 'acessorio') continue; const {L, W} = armPecaPlano(p), b = p.bordas, k = [p.nome, L, W, p.ch.material, p.ch.esp, b.inf, b.sup, b.esq, b.dir].join('|'); const x = g.get(k); if(x) x.qty++; else g.set(k, {desc:p.nome, qty:1, L, W, esp:p.ch.esp, mat:p.ch.material, veio:p.veio && p.parte !== 'fundo', bordas:{...b}}); }
  return {pecas:[...g.values()], acess:Y.acess}; }
function armPecas3D(a){ const Y = armLayout(a), cC = armCorChapa(armCh(a.chapa).material), cF = armCorChapa(armCh(a.chapaFrente).material), cU = armCorChapa(armCh(a.chapaFundo).material);
  return Y.pecas.map(p => { const c = p.cor ? {cor:p.cor, mat:p.mat} : p.parte === 'frente' ? cF : p.parte === 'fundo' ? cU : cC; return {x:p.x, y:p.y, z:p.z, dx:p.dx, dy:p.dy, dz:p.dz, mat:c.mat, cor:c.cor, parte:p.parte, nome:p.nome}; }); }

/* ---- posição na planta ---- */
function armCantos(a){ const r = (+a.rot || 0) * Math.PI / 180, ux = Math.cos(r), uy = Math.sin(r), nx = Math.sin(r), ny = -Math.cos(r), P = +a.P + (armLayout(a).frentes.length ? armCh(a.chapaFrente).esp : 0);
  return [[a.x, a.y], [a.x + ux * a.L, a.y + uy * a.L], [a.x + ux * a.L + nx * P, a.y + uy * a.L + ny * P], [a.x + nx * P, a.y + ny * P]]; }
// face interna da parede (lado de dentro do ambiente)
const armFace = w => wLinha(w, wOff(w)[0]);
function armNaParede(a, w, s){ const F = armFace(w), Lw = F.L; let x0 = Math.max(0, Math.min(Lw - a.L, s - a.L / 2));
  if(AV.colisao) for(let k = 0; k < 4; k++){ let mexeu = false; for(const o of amb().armarios) if(o !== a && o.parede === w.id && !o.oculto && a.z < +o.z + +o.A && +a.z + +a.A > +o.z){ const p = Math.hypot(o.x - F.px, o.y - F.py); if(x0 < p + o.L && x0 + a.L > p){ x0 = x0 + a.L / 2 < p + o.L / 2 ? p - a.L : p + o.L; mexeu = true; } } x0 = Math.max(0, Math.min(Lw - a.L, x0)); if(!mexeu) break; }
  a.parede = w.id; a.rot = Math.round(wAng(w) * 100) / 100; a.x = Math.round((F.px + F.dx * x0) * 10) / 10; a.y = Math.round((F.py + F.dy * x0) * 10) / 10; }
function armPosicionar(a, x, y, info = {}){ const w = info.parede ? amb().paredes.find(v => v.id === info.parede) : paredeMaisPerto(x, y, 500);
  if(w && !(Math.abs(+w.flecha || 0) > 1)){ const F = armFace(w); armNaParede(a, w, info.s ?? ((x - F.px) * F.dx + (y - F.py) * F.dy)); }
  else { delete a.parede; a.rot = 0; a.x = Math.round(x - a.L / 2); a.y = Math.round(y + a.P / 2); } }
const armPosNaParede = (a, w) => { const F = armFace(w); return (a.x - F.px) * F.dx + (a.y - F.py) * F.dy; };

/* ---- item do projeto ligado ao armário (peças filhas → Plano de Corte) ---- */
function armSync(a, forcar){ const pr = ambDono(); if(!pr || a.deItem) return null; const {pecas, acess} = armLista(a), assin = JSON.stringify([a.nome, a.L, a.A, a.P, pecas, acess]);
  let it = pr.itens.find(i => i.arm3d === a.id); if(it && !forcar && a.assin === assin) return it;
  if(!it){ it = newItem({nome:a.nome, arm3d:a.id, open:false}); pr.itens.push(it); }
  Object.assign(it, {nome:a.nome, L:Math.round(a.L), P:Math.round(a.P), A:Math.round(a.A)});
  it.filhos = [...pecas.map(p => newPart({desc:p.desc, qty:p.qty, L:p.L, W:p.W, esp:p.esp, mat:p.mat, veio:p.veio, bordas:p.bordas})), ...acess.map(c => newAcc({desc:c.desc, qty:c.qty, L:c.L || 0}))];
  a.assin = assin; a.item = it.id; pr.exemplo = false; touch(pr); return it; }
function armSyncTodos(){ const pr = ambDono(); if(!pr) return; const A = amb(), ids = new Set((A.armarios || []).map(a => a.id)); let mudou = false;
  const antes = pr.itens.length; pr.itens = pr.itens.filter(i => !i.arm3d || ids.has(i.arm3d)); if(pr.itens.length !== antes) mudou = true;
  for(const a of A.armarios || []){ const s = a.assin; armSync(a); if(a.assin !== s) mudou = true; } if(mudou) touch(pr); }

/* ---- vista frontal (SVG) ---- */
function armSVG(a, o = {}){
  const Y = armLayout(a), L = +a.L, A = +a.A, E = AV.armEd, cC = armCorChapa(armCh(a.chapa).material).cor, cF = armCorChapa(armCh(a.chapaFrente).material).cor, yv = z => A - z;
  if(o.mini){ let g = ''; for(const p of Y.pecas) if(p.parte === 'corpo' && p.dy > 30) g += `<rect x="${p.x}" y="${yv(p.z + p.dz)}" width="${p.dx}" height="${p.dz}" fill="${cC}" stroke="#5b4630" stroke-width="${L / 90}"/>`;
    for(const p of Y.pecas) if(p.parte === 'frente') g += `<rect x="${p.x}" y="${yv(p.z + p.dz)}" width="${p.dx}" height="${p.dz}" fill="${cF}" fill-opacity=".9" stroke="#5b4630" stroke-width="${L / 90}"/>`;
    return `<svg viewBox="${-L * .06} ${-A * .06} ${L * 1.12} ${A * 1.12}" preserveAspectRatio="xMidYMid meet">${g}</svg>`; }
  const modo = E?.modo || 'divisoes', selV = new Set(E?.vaos || []), sd = E?.div, k = Math.max(L, A) / 520; let g = '';
  // vãos clicáveis (os mais fundos por cima)
  for(const v of [...Y.vaos].sort((p, q) => p.nivel - q.nivel)) g += `<rect x="${v.x}" y="${yv(v.z + v.h)}" width="${v.w}" height="${v.h}" fill="${selV.has(v.id) ? 'rgba(47,109,181,.22)' : v.folha ? '#fffdf8' : 'transparent'}" stroke="${selV.has(v.id) ? '#2f6db5' : 'none'}" stroke-width="${2 * k}" data-vao="${v.id}" style="cursor:pointer"/>`;
  // peças do corpo
  for(const p of Y.pecas){ if(p.parte === 'fundo' || p.dy < 30 && p.parte !== 'acessorio') continue; if(p.parte === 'frente') continue; if(p.nome.includes('gaveta')) continue;
    const dv = Y.divs.find(d => p.no === d.no && (p.nome === 'Divisória' ? Math.abs(p.x - d.x) < .6 : p.nome === 'Divisão horizontal' && Math.abs(p.z - d.z) < .6));
    const on = dv && sd && sd.no === dv.no && sd.i === dv.i;
    g += `<rect x="${p.x}" y="${yv(p.z + p.dz)}" width="${p.dx}" height="${p.dz}" fill="${on ? '#2f6db5' : p.parte === 'acessorio' ? '#b9bec4' : cC}" stroke="#5b4630" stroke-width="${k}" ${dv ? `data-div="${dv.no}:${dv.i}" style="cursor:${dv.o === 'v' ? 'ew-resize' : 'ns-resize'}"` : 'pointer-events="none"'}/>`; }
  for(const d of Y.divs) if(d.virtual){ const on = sd && sd.no === d.no && sd.i === d.i; g += `<rect x="${d.x - (d.o === 'v' ? 4 * k : 0)}" y="${yv(d.z + d.h) - (d.o === 'h' ? 4 * k : 0)}" width="${d.o === 'v' ? 8 * k : d.w}" height="${d.o === 'h' ? 8 * k : d.h}" fill="${on ? 'rgba(47,109,181,.5)' : 'transparent'}" data-div="${d.no}:${d.i}" style="cursor:${d.o === 'v' ? 'ew-resize' : 'ns-resize'}"/><path d="M${d.x} ${yv(d.z + d.h)}${d.o === 'v' ? `V${yv(d.z)}` : `H${d.x + d.w}`}" stroke="#c8372d" stroke-width="${1.5 * k}" stroke-dasharray="${6 * k} ${4 * k}" pointer-events="none"/>`; }
  // frentes: opacas no modo Portas e Gavetas, só o contorno nos outros
  const cheia = modo === 'portas' || modo === 'gavetas';
  for(const F of Y.frentes){ for(const p of Y.pecas.filter(p => p.parte === 'frente' && p.no === F.n.id && (F.tipo === 'gav' ? p.nome === 'Frente de gaveta' : p.nome !== 'Frente de gaveta'))){ const x = p.x, y = yv(p.z + p.dz), w = p.dx, h = p.dz;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cheia ? cF : 'none'}" fill-opacity="${cheia ? .78 : 0}" stroke="${cheia ? '#5b4630' : '#8a7a5c'}" stroke-width="${k}" ${cheia ? '' : `stroke-dasharray="${8 * k} ${5 * k}"`} pointer-events="none"/>`;
      // linhas de abertura (o vértice fica no lado da dobradiça... a ponta aponta para ele)
      if(F.tipo === 'esq' || F.tipo === 'dir' || F.tipo === 'dupla'){ const dob = F.tipo === 'dupla' ? (Math.abs(x - (F.x - 50)) < 60 || x < F.x + F.w / 2 - 1 ? 'esq' : 'dir') : F.tipo, xa = dob === 'esq' ? x + w : x, xb = dob === 'esq' ? x : x + w;
        g += `<path d="M${xa} ${y}L${xb} ${y + h / 2}L${xa} ${y + h}" fill="none" stroke="#5b4630" stroke-width="${k}" stroke-dasharray="${10 * k} ${6 * k}" pointer-events="none"/>`; }
      else if(F.tipo === 'basc') g += `<path d="M${x} ${y + h}L${x + w / 2} ${y}L${x + w} ${y + h}" fill="none" stroke="#5b4630" stroke-width="${k}" stroke-dasharray="${10 * k} ${6 * k}" pointer-events="none"/>`;
      else if(F.tipo === 'correr') g += `<path d="M${x + w * .3} ${y + h / 2}h${w * .4}m${-8 * k} ${-6 * k}l${8 * k} ${6 * k}l${-8 * k} ${6 * k}" fill="none" stroke="#5b4630" stroke-width="${1.2 * k}" pointer-events="none"/>`; } }
  // cotas: total, vão selecionado e divisão selecionada
  const cotaH = (x0, x1, y, t) => `<path d="M${x0} ${y}H${x1}M${x0} ${y - 8 * k}v${16 * k}M${x1} ${y - 8 * k}v${16 * k}" stroke="#2c3a48" stroke-width="${k}" pointer-events="none"/><text x="${(x0 + x1) / 2}" y="${y - 6 * k}" font-size="${13 * k}" text-anchor="middle" fill="#2c3a48" pointer-events="none">${t}</text>`;
  const cotaV = (y0, y1, x, t) => `<path d="M${x} ${y0}V${y1}M${x - 8 * k} ${y0}h${16 * k}M${x - 8 * k} ${y1}h${16 * k}" stroke="#2c3a48" stroke-width="${k}" pointer-events="none"/><text x="${x - 8 * k}" y="${(y0 + y1) / 2}" font-size="${13 * k}" text-anchor="middle" fill="#2c3a48" transform="rotate(-90 ${x - 8 * k} ${(y0 + y1) / 2})" pointer-events="none">${t}</text>`;
  g += cotaH(0, L, A + 40 * k, fmt(L)) + cotaV(0, A, -40 * k, fmt(A));
  for(const id of selV){ const v = Y.vaos.find(x => x.id === id); if(v) g += cotaH(v.x, v.x + v.w, yv(v.z + v.h) + 18 * k, `<tspan fill="#2f6db5">${fmt(v.w)}</tspan>`) + cotaV(yv(v.z + v.h), yv(v.z), v.x + v.w - 22 * k, fmt(v.h)); }
  if(sd){ const d = Y.divs.find(x => x.no === sd.no && x.i === sd.i); if(d){ if(d.o === 'v') g += cotaH(d.x - d.ant, d.x, yv(d.z + d.h / 2), `<tspan fill="#c8372d">${fmt(d.ant)}</tspan>`) + cotaH(d.x + d.w, d.x + d.w + d.post, yv(d.z + d.h / 2), `<tspan fill="#c8372d">${fmt(d.post)}</tspan>`);
    else g += cotaV(yv(d.z), yv(d.z - d.ant), d.x + d.w / 2, `<tspan fill="#c8372d">${fmt(d.ant)}</tspan>`) + cotaV(yv(d.z + d.h + d.post), yv(d.z + d.h), d.x + d.w / 2, `<tspan fill="#c8372d">${fmt(d.post)}</tspan>`); } }
  const m = 90 * k; return `<svg id="armSvg" viewBox="${-m} ${-m * .6} ${L + 1.6 * m} ${A + 1.4 * m}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}

/* ---- Construtor (janela) ---- */
const ARM_MODOS = [['divisoes', 'Divisões'], ['gavetas', 'Gavetas'], ['internos', 'Internos'], ['portas', 'Portas'], ['fundo', 'Fundo']];
const ARM_ICS = {v:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><rect x="14" y="3" width="4" height="26" fill="#d9b380" stroke="#6b4d2e"/>', h:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><rect x="3" y="14" width="26" height="4" fill="#d9b380" stroke="#6b4d2e"/>',
  vv:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><path d="M16 3v26" stroke="#c8372d" stroke-dasharray="3 2" stroke-width="1.5"/>', hv:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><path d="M3 16h26" stroke="#c8372d" stroke-dasharray="3 2" stroke-width="1.5"/>',
  gav:n => `<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/>${Array.from({length:n}, (_, i) => `<rect x="5" y="${5 + i * 24 / n}" width="22" height="${24 / n - 2}" fill="#e8dcc8" stroke="#6b4d2e"/><path d="M13 ${5 + i * 24 / n + 3}h6" stroke="#5b4630" stroke-width="1.5"/>`).join('')}`,
  prat:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><rect x="4" y="15" width="24" height="3" fill="#d9b380" stroke="#6b4d2e"/>', cab:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><path d="M5 9h22" stroke="#8d949b" stroke-width="3"/><path d="M12 9l-4 6h8zM22 9l-4 6h8z" fill="none" stroke="#5b4630"/>',
  cesto:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><path d="M6 17h20v8H6z" fill="none" stroke="#8d949b" stroke-width="1.5"/><path d="M10 17v8M14 17v8M18 17v8M22 17v8" stroke="#8d949b"/>',
  esq:'<rect x="5" y="3" width="22" height="26" fill="#e8dcc8" stroke="#6b4d2e"/><path d="M27 3L5 16l22 13" fill="none" stroke="#5b4630" stroke-dasharray="3 2"/>', dir:'<rect x="5" y="3" width="22" height="26" fill="#e8dcc8" stroke="#6b4d2e"/><path d="M5 3l22 13L5 29" fill="none" stroke="#5b4630" stroke-dasharray="3 2"/>',
  dupla:'<rect x="3" y="3" width="13" height="26" fill="#e8dcc8" stroke="#6b4d2e"/><rect x="16" y="3" width="13" height="26" fill="#e8dcc8" stroke="#6b4d2e"/>', basc:'<rect x="3" y="7" width="26" height="18" fill="#e8dcc8" stroke="#6b4d2e"/><path d="M3 25L16 7l13 18" fill="none" stroke="#5b4630" stroke-dasharray="3 2"/>',
  correr:'<rect x="3" y="3" width="16" height="26" fill="#e8dcc8" stroke="#6b4d2e"/><rect x="13" y="3" width="16" height="26" fill="#efe5d3" stroke="#6b4d2e"/><path d="M8 16h8" stroke="#5b4630"/>', sem:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><path d="M8 8l16 16M24 8L8 24" stroke="#c8372d" stroke-width="2"/>',
  fenc:'<rect x="3" y="3" width="26" height="26" fill="#fff" stroke="#6b4d2e"/><rect x="7" y="7" width="18" height="18" fill="#d8cbb8" stroke="#6b4d2e"/>', fsob:'<rect x="3" y="3" width="26" height="26" fill="#d8cbb8" stroke="#6b4d2e"/><rect x="6" y="6" width="20" height="20" fill="#fff" stroke="#6b4d2e"/>'};
const ARM_ITENS = {
  divisoes:[['div:v', 'Divisória vertical', ARM_ICS.v], ['div:h', 'Divisão horizontal', ARM_ICS.h], ['div:vv', 'Somente divisão vertical (sem peça)', ARM_ICS.vv], ['div:hv', 'Somente divisão horizontal (sem peça)', ARM_ICS.hv]],
  gavetas:[1, 2, 3, 4, 5].map(n => ['gav:' + n, n === 1 ? '1 gaveta' : `${n} gavetas`, ARM_ICS.gav(n)]),
  internos:[['int:prat', 'Prateleira', ARM_ICS.prat], ['int:cab', 'Cabideiro', ARM_ICS.cab], ['int:cesto', 'Cesto aramado', ARM_ICS.cesto]],
  portas:[['porta:esq', 'Porta (dobradiça à esquerda)', ARM_ICS.esq], ['porta:dir', 'Porta (dobradiça à direita)', ARM_ICS.dir], ['porta:dupla', 'Porta dupla', ARM_ICS.dupla], ['porta:basc', 'Porta basculante', ARM_ICS.basc], ['porta:correr', 'Portas de correr', ARM_ICS.correr], ['porta:', 'Sem porta', ARM_ICS.sem]],
  fundo:[['fundo:encaixado', 'Fundo encaixado (rasgo)', ARM_ICS.fenc], ['fundo:sobreposto', 'Fundo sobreposto', ARM_ICS.fsob], ['fundo:nenhum', 'Sem fundo', ARM_ICS.sem]],
};
const ARM_DICA = {divisoes:'Selecione o vão (clique; Ctrl soma vãos) e arraste o item para ele, dê duplo clique no item ou use Inserir. Clique numa divisória para ver as cotas; mova com as setas (Passo) ou arrastando.', gavetas:'Selecione o vão e insira as gavetas. As frentes ficam sobrepostas à estrutura.',
  internos:'Selecione o vão e insira prateleiras, cabideiro ou cesto. Cada prateleira nova redistribui as do vão por igual.', portas:'Selecione um ou mais vãos (Ctrl): a porta cobre todos eles. Sem porta tira a porta do vão.', fundo:'O fundo vale para o armário inteiro.'};

function armConstruir(alvo){ // escolha da estrutura (6.2)
  const s = alvo || AV.sel; if(s?.t === 'armario'){ armEditar(s.id); return; }
  PB.armAlvo = s && (s.t === 'parede' || s.t === 'piso') ? {...s} : null;
  modal('Construtor de Armários · Estrutura', `<p class="muted" style="margin:0 0 10px">${PB.armAlvo?.t === 'parede' ? 'O armário vai encostado na parede selecionada.' : PB.armAlvo?.t === 'piso' ? 'O armário vai no piso; arraste no Editor de Paredes ou use as setas para posicionar.' : 'Sem parede selecionada: depois de escolher, clique na parede ou no piso para pôr o armário.'} Escolha a estrutura; as medidas e os vãos se editam na próxima tela.</p>
    <div class="arm-est">${Object.entries(ARM_EST).map(([k, v]) => `<button data-act="armEstOk" data-k="${k}">${armSVG(armNovo(k), {mini:true})}<b>${esc(v.nome)}</b><span class="muted">${v.L} × ${v.A} × ${v.P}</span></button>`).join('')}</div>
    ${armBib().length ? `<b style="display:block;margin:14px 0 8px;color:var(--title)">Minha biblioteca</b><div class="arm-est">${armBib().map(m => `<button data-act="armEstOk" data-k="mod:${m.id}">${armSVG(m.a, {mini:true})}<b>${esc(m.nome)}</b><span class="muted">${fmt(m.a.L)} × ${fmt(m.a.A)} × ${fmt(m.a.P)}</span></button>`).join('')}</div>` : ''}`,
    `<button class="btn" data-act="modalClose">Cancelar</button>`, {w:'720px'}); }
function armEditar(id, novo){ const A = amb(), a = novo || A.armarios.find(x => x.id === id); if(!a) return;
  AV.armEd = {id:novo ? null : a.id, a:JSON.parse(JSON.stringify(a)), modo:AV.armEd?.modo || 'divisoes', vaos:[a.raiz.f?.length ? armFolhas(a.raiz)[0].id : a.raiz.id], div:null, item:null, lista:false, undo:[], qtd:1}; armRender(); }
function armRender(){ const E = AV.armEd; if(!E) return; const a = E.a, ch = armChapas(), bd = S.cad?.bordas || [];
  const fld = (k, l, v, o = {}) => `<span>${l}</span>${o.sel ? `<select data-arm="${k}">${o.sel.map(([x, y]) => `<option value="${esc(String(x))}" ${String(x) === String(v) ? 'selected' : ''}>${esc(y)}</option>`).join('')}</select>` : `<input ${o.txt ? 'type="text"' : 'type="number" step="any"'} data-arm="${k}" value="${esc(String(v ?? ''))}">`}`;
  const chs = ch.map(c => [c.material + '|' + c.esp, `${c.material} ${c.esp} mm`]), chOpt = v => chs.some(c => c[0] === v) ? chs : [[v, v.replace('|', ' ') + ' mm'], ...chs];
  const Y = armLayout(a), vs = E.vaos.map(id => Y.vaos.find(v => v.id === id)).filter(Boolean), d = E.div && Y.divs.find(x => x.no === E.div.no && x.i === E.div.i);
  let sel = '';
  if(d) sel = `<div class="pb-gh">${d.o === 'v' ? 'Divisória' : 'Divisão horizontal'}${d.virtual ? ' (somente divisão)' : ''}</div><div class="pb-kv"><span>Cota anterior</span><input type="number" step="any" data-armc="ant" value="${Math.round(d.ant * 10) / 10}"><span>Cota posterior</span><input type="number" step="any" data-armc="post" value="${Math.round(d.post * 10) / 10}"></div><div class="pb-nota">${d.o === 'v' ? 'Anterior = vão à esquerda; posterior = vão à direita.' : 'Anterior = vão de baixo; posterior = vão de cima.'} Setas movem pelo Passo. Delete remove.</div>`;
  else if(vs.length){ const v = vs[0], n = v.n; sel = `<div class="pb-gh">Vão${vs.length > 1 ? `s selecionados (${vs.length})` : ''}</div><div class="pb-kv"><span>Largura</span><input readonly tabindex="-1" value="${fmt(v.w)}" style="background:#f3f5f8"><span>Altura</span><input readonly tabindex="-1" value="${fmt(v.h)}" style="background:#f3f5f8"></div>`
    + ((n.int || []).length ? `<div class="pb-gh">Internos do vão</div><div class="pb-kv">${n.int.map((it, i) => it.t === 'cab' ? `<span>Cabideiro</span><button class="btn" data-act="armIntDel" data-i="${i}">Remover</button>` : `<span>${it.t === 'prat' ? 'Prateleira' : 'Cesto'} ${i + 1} (altura)</span><span style="display:flex;gap:3px"><input type="number" data-armint="${i}" value="${Math.round(+it.z || 0)}" style="width:70px"><button class="btn" data-act="armIntDel" data-i="${i}" title="Remover">✕</button></span>`).join('')}</div>` : '')
    + (n.gav?.n ? `<div class="pb-kv"><span>Gavetas</span><input type="number" min="1" max="8" data-armgav="n" value="${n.gav.n}"></div>` : ''); }
  const lista = () => { const L = armLista(a); return `<div style="padding:8px;overflow:auto;height:100%;box-sizing:border-box"><table class="kv" style="width:100%"><tr><th style="text-align:left">Peça</th><th>Qtd</th><th>Comp.</th><th>Larg.</th><th>Esp.</th><th style="text-align:left">Material</th><th>Bordas</th></tr>${L.pecas.map(p => `<tr><td>${esc(p.desc)}</td><td style="text-align:center">${p.qty}</td><td style="text-align:right">${fmt(p.L)}</td><td style="text-align:right">${fmt(p.W)}</td><td style="text-align:center">${p.esp}</td><td>${esc(p.mat)}</td><td style="text-align:center">${Object.values(p.bordas).filter(Boolean).length}</td></tr>`).join('')}</table>
    <b style="display:block;margin:10px 0 4px">Acessórios</b><table class="kv" style="width:100%">${L.acess.map(c => `<tr><td>${esc(c.desc)}</td><td style="text-align:center">${c.qty}</td></tr>`).join('') || '<tr><td class="muted">Nenhum</td></tr>'}</table></div>`; };
  const body = `<div class="arm-grid">
    <div class="arm-col"><div class="pb-gh">Estrutura</div><div class="pb-kv">${fld('nome', 'Nome', a.nome, {txt:1})}${fld('L', 'Largura', a.L)}${fld('A', 'Altura', a.A)}${fld('P', 'Profundidade', a.P)}${fld('z', 'Altura do chão', a.z)}${fld('rodape', 'Rodapé', a.rodape)}${fld('folga', 'Folga das frentes', a.folga)}</div>
      <div class="pb-gh">Chapas e bordas (Cadastro)</div><div class="pb-kv">${fld('chapa', 'Corpo', a.chapa, {sel:chOpt(a.chapa)})}${fld('chapaFrente', 'Frentes', a.chapaFrente, {sel:chOpt(a.chapaFrente)})}${fld('chapaFundo', 'Fundo', a.chapaFundo, {sel:chOpt(a.chapaFundo)})}${fld('borda', 'Borda', a.borda, {sel:[['', 'Sem borda'], ...bd.map(b => [b.desc, b.desc])]})}${fld('fundo', 'Tipo de fundo', a.fundo, {sel:Object.entries(ARM_FUNDOS)})}</div>
      ${sel}<div class="pb-kv"><span>Passo (setas)</span><input type="number" data-armpasso="1" value="${AV.passo}"></div></div>
    <div class="arm-col" style="display:flex;flex-direction:column;background:#fff"><div class="arm-modos">${ARM_MODOS.map(([k, l]) => `<button class="${E.modo === k && !E.lista ? 'on' : ''}" data-act="armModo" data-m="${k}">${l}</button>`).join('')}<button class="${E.lista ? 'on' : ''}" data-act="armLista" style="margin-left:auto">Lista de peças</button></div>
      <div id="armSvgHost" style="flex:1;min-height:0">${E.lista ? lista() : armSVG(a)}</div></div>
    <div class="arm-col"><div class="pb-gh">Painel de Itens · ${ARM_MODOS.find(m => m[0] === E.modo)[1]}</div>${ARM_ITENS[E.modo].map(([k, l, ic]) => `<div class="arm-it ${E.item === k ? 'on' : ''}" draggable="true" data-armi="${k}" title="Arraste para o vão, dê duplo clique ou use Inserir"><svg viewBox="0 0 32 32">${ic}</svg>${esc(l)}</div>`).join('')}
      ${E.modo === 'divisoes' || E.modo === 'internos' ? `<div class="pb-kv"><span>Inserção múltipla</span><input type="number" min="1" max="20" data-armqtd="1" value="${E.qtd || 1}"></div>` : ''}
      <div style="display:flex;gap:6px;padding:6px"><button class="btn pri" data-act="armInserir" ${E.item ? '' : 'disabled'}>Inserir</button><button class="btn" data-act="armRemover">Remover</button><button class="btn" data-act="armDesfazer" ${E.undo.length ? '' : 'disabled'}>Desfazer</button></div>
      <div class="pb-nota">${ARM_DICA[E.modo]}</div></div></div>`;
  const dono = ambDono();
  modal(`Construtor de Armários · ${esc(a.nome)}`, body, `<button class="btn pri" data-act="armOk">OK</button><button class="btn" data-act="armSalvarBib" title="Guarda este armário na Minha biblioteca para usar em outros projetos">Salvar na biblioteca</button><button class="btn" data-act="armEnviar" ${dono ? '' : 'disabled'} title="Atualiza o item do armário no projeto${dono ? ' ' + esc(dono.nome) : ''}">Enviar peças ao projeto</button><span class="muted" style="margin-right:auto;font-size:12px">${armLista(a).pecas.reduce((s, p) => s + p.qty, 0)} peças${dono ? ' · projeto ' + esc(dono.nome) : ' · abra um projeto para receber as peças'}</span><button class="btn" data-act="armCancelar">Cancelar</button>`, {w:'min(1240px, 96vw)'});
  armLigarSvg(); }
function armSnap(){ const E = AV.armEd; E.undo.push(JSON.stringify(E.a)); if(E.undo.length > 40) E.undo.shift(); }
// insere o item escolhido nos vãos selecionados
function armAplicar(item, vaosAlvo){ const E = AV.armEd, a = E.a, [tp, v] = item.split(':'), ids = (vaosAlvo || E.vaos).filter(id => armAcha(a.raiz, id));
  if(tp === 'fundo'){ armSnap(); a.fundo = v; armRender(); return; }
  if(!ids.length){ toast('Selecione um vão primeiro (clique nele no desenho).'); return; }
  armSnap(); const Y = armLayout(a), e = armCh(a.chapa).esp, q = Math.max(1, Math.min(20, Math.round(+E.qtd || 1)));
  if(tp === 'porta'){ const n = ids.length > 1 ? armLCA(a.raiz, ids) : armAcha(a.raiz, ids[0]).n; const tira = x => { delete x.porta; (x.f || []).forEach(tira); }; tira(n); if(v) n.porta = {tipo:v}; }
  else for(const id of ids){ const r = armAcha(a.raiz, id), n = r.n, vv = Y.vaos.find(x => x.id === id); if(!vv) continue;
    if(tp === 'div'){ const o = v[0], virt = v.length > 1, t = virt ? 0 : e, tam = o === 'v' ? vv.w : vv.h, k = q + 1, parte = (tam - q * t) / k;
      if(parte < 40){ toast('O vão é pequeno demais para essa divisão.'); continue; }
      if(n.f?.length){ toast('Esse vão já está dividido: selecione um dos vãos de dentro.'); continue; }
      const filho = {int:n.int || [], gav:n.gav}; delete n.int; delete n.gav; n.div = {o, c:Array.from({length:q}, (_, i) => Math.round(((i + 1) * parte + i * t) * 10) / 10), virtual:virt || undefined};
      n.f = Array.from({length:k}, (_, i) => armNo(i === 0 ? filho : {})); E.vaos = [n.f[0].id]; E.div = {no:n.id, i:0}; }
    else if(tp === 'gav'){ if(n.f?.length){ toast('Gaveta vai num vão sem divisão.'); continue; } n.gav = {n:+v}; n.int = []; }
    else if(tp === 'int'){ if(n.f?.length){ toast('Internos vão num vão sem divisão.'); continue; } n.int = n.int || [];
      if(v === 'prat'){ const pr = n.int.filter(i => i.t === 'prat').length + q, outros = n.int.filter(i => i.t !== 'prat'), passo = (vv.h - pr * e) / (pr + 1); n.int = [...outros, ...Array.from({length:pr}, (_, i) => ({t:'prat', z:Math.round((i + 1) * passo + i * e)}))]; }
      else if(v === 'cab'){ if(!n.int.some(i => i.t === 'cab')) n.int.push({t:'cab'}); }
      else n.int.push({t:'cesto', z:150}); } }
  armRender(); }
function armRemoverSel(){ const E = AV.armEd, a = E.a;
  if(E.div){ const r = armAcha(a.raiz, E.div.no); if(r?.n.div){ armSnap(); const n = r.n, i = E.div.i; n.div.c.splice(i, 1); n.f.splice(i + 1, 1); if(!n.div.c.length){ const f = n.f[0]; delete n.div; delete n.f; Object.assign(n, {int:f.int || [], gav:f.gav}); if(f.div){ n.div = f.div; n.f = f.f; } if(f.porta && !n.porta) n.porta = f.porta; } E.div = null; E.vaos = [n.f?.[Math.min(i, n.f.length - 1)]?.id || n.id]; armRender(); } return; }
  if(!E.vaos.length) return; armSnap();
  for(const id of E.vaos){ const r = armAcha(a.raiz, id); if(!r) continue; const n = r.n;
    if(E.modo === 'gavetas') delete n.gav; else if(E.modo === 'internos') n.int = []; else if(E.modo === 'portas'){ const p = armCaminho(a.raiz, id).reverse().find(x => x.porta); if(p) delete p.porta; }
    else if(E.modo === 'divisoes' && r.pai){ E.div = {no:r.pai.id, i:Math.max(0, Math.min(r.i, r.pai.div.c.length) - (r.i === r.pai.div.c.length ? 1 : 0))}; E.undo.pop(); armRemoverSel(); return; } }
  armRender(); }
function armMoverDiv(delta, abs){ const E = AV.armEd, r = E.div && armAcha(E.a.raiz, E.div.no); if(!r?.n.div) return; const c = r.n.div.c; armSnap(); c[E.div.i] = Math.round(((abs ?? c[E.div.i]) + delta) * 10) / 10; armRender(); }
function armLigarSvg(){ const svg = $('#armSvg'), E = AV.armEd; if(!E) return;
  document.querySelectorAll('.arm-it').forEach(el => { el.addEventListener('click', () => { E.item = el.dataset.armi; document.querySelectorAll('.arm-it').forEach(x => x.classList.toggle('on', x === el)); $('[data-act=armInserir]')?.removeAttribute('disabled'); });
    el.addEventListener('dblclick', () => { E.item = el.dataset.armi; armAplicar(E.item); }); el.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/plain', el.dataset.armi); ev.dataTransfer.effectAllowed = 'copy'; }); });
  if(!svg) return; const loc = ev => { const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, +E.a.A - p.y]; };
  svg.addEventListener('dragover', ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
  svg.addEventListener('drop', ev => { ev.preventDefault(); const it = ev.dataTransfer.getData('text/plain'); if(!it) return; const t = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.dataset?.vao);
    if(t && !(ev.ctrlKey && E.vaos.includes(t.dataset.vao))) E.vaos = ev.ctrlKey ? [...E.vaos, t.dataset.vao] : [t.dataset.vao]; E.div = null; E.item = it; armAplicar(it); });
  svg.addEventListener('pointerdown', ev => { const dv = ev.target.closest('[data-div]'), vo = ev.target.closest('[data-vao]');
    if(dv){ const [no, i] = dv.dataset.div.split(':'); E.div = {no, i:+i}; E.vaos = []; const r = armAcha(E.a.raiz, no), o = r.n.div.o, c0 = r.n.div.c[+i], [mx, mz] = loc(ev); E.drag = {o, c0, mx, mz, moveu:false}; armSnap(); svg.setPointerCapture(ev.pointerId); armRender(); return; }
    if(vo){ const id = vo.dataset.vao; E.div = null; E.vaos = ev.ctrlKey || ev.shiftKey ? (E.vaos.includes(id) ? E.vaos.filter(x => x !== id) : [...E.vaos, id]) : [id]; armRender(); } });
  svg.addEventListener('pointermove', ev => { const D = E.drag; if(!D) return; const [mx, mz] = loc(ev), r = armAcha(E.a.raiz, E.div.no); if(!r) return; const dd = D.o === 'v' ? mx - D.mx : mz - D.mz; if(Math.abs(dd) < 1 && !D.moveu) return; D.moveu = true;
    r.n.div.c[E.div.i] = Math.round((D.c0 + dd) / (AV.atrair ? 5 : 1)) * (AV.atrair ? 5 : 1); const h = $('#armSvgHost'); if(h){ h.innerHTML = armSVG(E.a); } });
  svg.addEventListener('pointerup', () => { const D = E.drag; E.drag = null; if(!D) return; if(!D.moveu) E.undo.pop(); armRender(); }); }
// grava o armário editado no ambiente (OK)
function armGravar(){ const E = AV.armEd; if(!E) return null; const A = amb(); ambSnap(); let a;
  if(E.id){ a = A.armarios.find(x => x.id === E.id); if(!a) return null; const L0 = a.L, P = a.parede && A.paredes.find(w => w.id === a.parede); Object.assign(a, E.a);
    if(P && a.L !== L0){ armNaParede(a, P, armPosNaParede(a, P) + a.L / 2); } }
  else { a = E.a; const alvo = PB.armAlvo; A.armarios.push(a); if(alvo?.t === 'parede'){ const w = A.paredes.find(x => x.id === alvo.id); if(w) armNaParede(a, w, armFace(w).L / 2); }
    else if(alvo?.t === 'piso'){ const p = A.piso; armPosicionar(a, p.x + p.w / 2, p.y + p.h / 2, {parede:'-'}); }
    else { const b = ambBBox(A), pi = A.piso; armPosicionar(a, b ? (b.x0 + b.x1) / 2 : pi.x + pi.w / 2, b ? (b.y0 + b.y1) / 2 : pi.y + pi.h / 2, {parede:'-'}); } }
  AV.sel = {t:'armario', id:a.id}; AV.multi = []; return a; }

/* ---- ações ---- */
Object.assign(ACT, {
  armConstruir: () => armConstruir(),
  armEstOk: el => { const k = el.dataset.k, alvo = PB.armAlvo; if(PB.armSubst){ const s = PB.armSubst; PB.armSubst = null; const A = amb(), a = A.armarios.find(x => x.id === s); if(!a) return; ambSnap(); const n = armNovo(k); Object.assign(a, {est:k, nome:n.nome, raiz:n.raiz, rodape:n.rodape, L:a.L, A:n.A, P:n.P, z:n.z}); ACT.modalClose(); ambMudou(); toast(`Estrutura trocada para ${n.nome}.`); return; }
    const a = armNovo(k); if(!alvo && !AV.armDireto){ ACT.modalClose(); AV.inserir = 'arm:' + k; AV.sel = null; render(); toast('Clique na parede (o armário encosta nela) ou no piso.'); return; } armEditar(null, a); },
  armModo: el => { AV.armEd.modo = el.dataset.m; AV.armEd.lista = false; AV.armEd.item = null; armRender(); },
  armLista: () => { AV.armEd.lista = !AV.armEd.lista; armRender(); },
  armInserir: () => { if(AV.armEd?.item) armAplicar(AV.armEd.item); },
  armRemover: () => armRemoverSel(),
  armDesfazer: () => { const E = AV.armEd, s = E?.undo.pop(); if(!s) return; E.a = JSON.parse(s); E.div = null; E.vaos = E.vaos.filter(id => armAcha(E.a.raiz, id)); armRender(); },
  armIntDel: el => { const E = AV.armEd, n = E.vaos[0] && armAcha(E.a.raiz, E.vaos[0])?.n; if(!n) return; armSnap(); n.int.splice(+el.dataset.i, 1); armRender(); },
  armOk: () => { const a = armGravar(); AV.armEd = null; ACT.modalClose(); if(a){ armSync(a, true); ambMudou(); toast(ambDono() ? `${a.nome}: peças no projeto ${ambDono().nome} (aba Principal).` : `${a.nome} pronto. Abra um projeto para receber as peças.`); } },
  armEnviar: () => { const a = armGravar(); if(!a) return; const it = armSync(a, true); AV.armEd.id = a.id; ambMudou(); armRender(); if(it) toast(`${it.filhos.filter(f => f.tipo === 'peca').reduce((s, f) => s + f.qty, 0)} peças em "${it.nome}" no projeto ${ambDono().nome}. Elas já vão para o Plano de Corte.`); },
  armCancelar: () => { AV.armEd = null; ACT.modalClose(); },
});
document.addEventListener('change', e => { const t = e.target, E = AV.armEd; if(!E || !t.closest?.('#modalRoot')) return; const a = E.a;
  if(t.dataset.arm){ const k = t.dataset.arm, txt = ['nome', 'chapa', 'chapaFrente', 'chapaFundo', 'borda', 'fundo'].includes(k), v = txt ? t.value : num(t.value); if(!txt && !(v >= 0)) return armRender(); if(['L', 'A', 'P'].includes(k) && v < 150) return armRender();
    armSnap(); if(k === 'L' || k === 'A'){ armEscalar(a, k === 'L' ? v : a.L, k === 'A' ? v : a.A); } else a[k] = v; armRender(); return; }
  if(t.dataset.armc && E.div){ const Y = armLayout(a), d = Y.divs.find(x => x.no === E.div.no && x.i === E.div.i), v = num(t.value); if(!d || !(v >= 0)) return armRender(); const r = armAcha(a.raiz, d.no), c = r.n.div.c[d.i];
    armSnap(); r.n.div.c[d.i] = Math.round((t.dataset.armc === 'ant' ? c + (v - d.ant) : c - (v - d.post)) * 10) / 10; armRender(); return; }
  if(t.dataset.armint){ const n = armAcha(a.raiz, E.vaos[0])?.n; if(!n) return; armSnap(); n.int[+t.dataset.armint].z = num(t.value); armRender(); return; }
  if(t.dataset.armgav){ const n = armAcha(a.raiz, E.vaos[0])?.n; if(!n?.gav) return; armSnap(); n.gav.n = Math.max(1, Math.min(8, Math.round(num(t.value)))); armRender(); return; }
  if(t.dataset.armqtd){ E.qtd = Math.max(1, Math.min(20, Math.round(num(t.value)) || 1)); return; }
  if(t.dataset.armpasso){ AV.passo = Math.max(1, num(t.value) || 10); pbGuardar(); } });
// muda largura ou altura mantendo as proporções dos vãos
function armEscalar(a, L, A){ const e = armCh(a.chapa).esp, rod = +a.rodape || 0, fx = (L - 2 * e) / Math.max(1, a.L - 2 * e), fz = (A - rod - 2 * e) / Math.max(1, a.A - rod - 2 * e);
  const vai = n => { if(n.div) n.div.c = n.div.c.map(c => Math.round(c * (n.div.o === 'v' ? fx : fz) * 10) / 10); for(const i of n.int || []) if(i.z) i.z = Math.round(i.z * fz); (n.f || []).forEach(vai); }; vai(a.raiz); a.L = L; a.A = A; }
// teclado dentro do Construtor: setas movem a divisória pelo Passo, Delete remove
document.addEventListener('keydown', e => { const E = AV.armEd; if(!E || !$('#armSvgHost') || e.target.closest?.('input,select,textarea')) return;
  const p = (+AV.passo || 10) * (e.shiftKey ? 10 : 1), r = E.div && armAcha(E.a.raiz, E.div.no), o = r?.n.div?.o;
  if(o === 'v' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')){ e.preventDefault(); armMoverDiv(e.key === 'ArrowLeft' ? -p : p); return; }
  if(o === 'h' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){ e.preventDefault(); armMoverDiv(e.key === 'ArrowDown' ? -p : p); return; }
  if(e.key === 'Delete'){ e.preventDefault(); armRemoverSel(); return; }
  if(e.ctrlKey && e.key.toLowerCase() === 'z'){ e.preventDefault(); ACT.armDesfazer(); } }, true);

/* ---- Minha biblioteca: armários montados no Construtor, guardados no Cadastro para qualquer projeto ---- */
function armBib(){ S.cad = S.cad || {}; if(!Array.isArray(S.cad.modulos)) S.cad.modulos = []; return S.cad.modulos; }
function armSalvarBib(a){ if(!a) return; PB.armBib = JSON.parse(JSON.stringify(a)); const ja = armBib().find(m => m.nome === a.nome);
  modal('Salvar na biblioteca', `<p class="muted" style="margin:0 0 8px">O armário fica na aba <b>Minha biblioteca</b> dos Módulos e na escolha da estrutura do Construtor, em qualquer projeto.</p><div class="pb-kv" style="padding:0"><span>Nome do módulo</span><input type="text" id="bibNome" value="${esc(a.nome)}"></div>${ja ? '<p class="muted" style="margin:8px 0 0">Já existe um módulo com esse nome: ele será substituído.</p>' : ''}`,
    `<button class="btn pri" data-act="armBibOk">Salvar</button><button class="btn" data-act="armBibCancelar">Cancelar</button>`, {w:'420px'}); }
Object.assign(ACT, {
  armSalvarBib: () => { PB.bibVolta = AV.armEd ? JSON.parse(JSON.stringify(AV.armEd)) : null; armSalvarBib(AV.armEd?.a); },
  pbArmSalvarBib: () => { PB.bibVolta = null; armSalvarBib(ambSelObj()); },
  armBibOk: () => { const nome = ($('#bibNome')?.value || '').trim() || 'Meu armário', a = PB.armBib; if(!a) return; const t = armClone(a); for(const k of ['x', 'y', 'parede', 'oculto', 'deItem', 'item', 'assin']) delete t[k]; t.nome = nome;
    const L = armBib(), i = L.findIndex(m => m.nome === nome), m = {id:i >= 0 ? L[i].id : uid(), nome, a:t}; if(i >= 0) L[i] = m; else L.push(m); save(); toast(`"${nome}" salvo na Minha biblioteca.`); ACT.armBibCancelar(); },
  armBibCancelar: () => { const v = PB.bibVolta; PB.bibVolta = null; PB.armBib = null; if(v){ AV.armEd = v; armRender(); } else { ACT.modalClose(); if(UI.aba === 'vis') renderAmbiente(); } },
  pbModDel: (el, e) => { e?.stopPropagation(); const m = armBib().find(x => x.id === el.dataset.id); if(!m) return; confirmar('Apagar da biblioteca', `Apagar "${esc(m.nome)}" da Minha biblioteca? Os armários já postos nos projetos ficam como estão.`, 'Apagar', () => { S.cad.modulos = armBib().filter(x => x !== m); save(); renderAmbiente(); }); },
});
