/* ================= visualizador 3D/2D: ambiente com piso, paredes e teto =================
   Coordenadas em mm, planta com Y para cima e Z para cima no 3D. Ângulo 0° aponta para a direita, anti-horário positivo.
   As paredes são construídas no sentido horário: o lado de dentro do ambiente fica à direita de cada parede.
   O 3D é o motor do Panelizer (react-three-fiber + three.js, MIT), embutido mais abaixo e aberto num quadro. */
const AMB_TIPOS = {alvenaria:['Alvenaria', '#c9c1b3'], drywall:['Drywall', '#e1ddd3'], vidro:['Vidro', '#a9d3ea']};
const AMB_FILL = [['texturas_linhas', 'Texturas com linhas'], ['texturas', 'Texturas'], ['linhas', 'Preenchimento com linhas'], ['solido', 'Preenchimento'], ['hide', 'Hide'], ['hidepb', 'Hide PB'], ['arame', 'Sem preenchimento'], ['caixa', 'Caixa de contorno'], ['transp', 'Transparente'], ['apresentacao', 'Apresentação']];
const AMB_ACAB = {pintura:'Pintura', tijolo:'Tijolo aparente', azulejo:'Azulejo 20×20', concreto:'Concreto', pedra:'Pedra', gesso:'Gesso', madeira:'Madeira', porcelanato:'Porcelanato 60×60', ceramica:'Cerâmica 45×45', cimento:'Cimento queimado', carpete:'Carpete', aluminio:'Alumínio', branco:'Laca branca', vidro:'Vidro', mdf:'MDF'};
const AMB_ACAB_GRUPO = {parede:['pintura', 'tijolo', 'azulejo', 'concreto', 'pedra', 'gesso', 'madeira', 'porcelanato', 'ceramica', 'cimento', 'vidro'], piso:['porcelanato', 'madeira', 'ceramica', 'cimento', 'carpete', 'concreto', 'pintura'], abertura:['madeira', 'aluminio', 'branco', 'vidro'], geo:['mdf', 'pintura', 'gesso', 'madeira', 'concreto', 'pedra', 'porcelanato', 'ceramica', 'cimento', 'aluminio', 'branco', 'vidro']};
const AB_TIPOS = {porta:['Porta', 800, 2100, 0], janela:['Janela', 1200, 1000, 1100], vao:['Vão (perfurar)', 900, 2100, 0], correr:['Porta de correr', 1600, 2100, 0]};
const GEO_TIPOS = {ret:'Retangular', circ:'Circular', poli:'Poligonal', livre:'Livre', coluna:'Coluna', rebaixo:'Rebaixo de gesso', regiao:'Região do piso'};
const CLIMAS = {ensolarado:'Ensolarado', nublado:'Nublado', entardecer:'Entardecer', noite:'Noite', interno:'Só luzes internas'};
const CAMADAS = [['paredes', 'Paredes e colunas'], ['armarios', 'Armários'], ['piso', 'Piso'], ['teto', 'Teto'], ['aberturas', 'Portas e janelas'], ['geometrias', 'Geometrias'], ['luzes', 'Luzes'], ['textos', 'Textos 3D'], ['imagens', 'Imagens'], ['modelos', 'Arquivos 3D'], ['cotas', 'Cotas']];
const VISTAS = {isoDir:'Isométrica direita', isoEsq:'Isométrica esquerda', isoDirPost:'Isométrica direita posterior', isoEsqPost:'Isométrica esquerda posterior', sup:'Superior', inf:'Inferior', fre:'Frontal', pos:'Posterior', esq:'Esquerda', dir:'Direita'};
const ambNovo = () => ({paredes:[], aberturas:[], tetos:[], geometrias:[], luzes:[], textos:[], imagens:[], modelos:[], vistas:[], armarios:[], renders:[], grupos:[], piso:{x:-500, y:-500, w:5000, h:5000, esp:5, auto:true}, cfg:{esp:150, alt:2600, orient:'interna', tipo:'alvenaria', incL:50, incA:5}});
const AV = {modo:'3d', nav:'sel', multi:[], lat:null, latFixo:false, modAberto:true, lib:'armarios', matBar:false, arvore:false, passo:10, trava:null, verOcultos:false, clip:null, armEd:null, rib:'construcao', cons:null, ref:null, sel:null, ferr2d:'sel', par:null, fill:'texturas_linhas', persp:true, verTeto:true, cotas:false, autoRebaixar:false, hotpoints:false, colisao:true, atrair:true, vizinhos:true, verRef:true,
  grid:{on:false, passo:500}, camadas:{}, clima:{tipo:'ensolarado', int:1, alt:45, az:135, ceu:true}, apres:{sombras:true, ao:true, reflexos:true}, luzPadrao:1, iluminacaoPadrao:true, fundo:'#eef2f6',
  corte:{anterior:10, posterior:200000}, render:{alvo:200, escala:1}, imagem:{marca:'', brilho:100, contraste:100, saturacao:100, largura:0}, dinamica:{passo:50, fps:30, vel:20, graus:360},
  ferramenta:'navegar', inserir:null, modulos:false, undo:[], redo:[], vb:null, drag:null, drag3D:null, renderOn:false, animando:false, copiaMat:null};
function ambDono(){ return proj(UI.proj) || openProjects()[0] || null; }
function amb(){ const o = ambDono() || S; if(!o.amb) o.amb = ambNovo(); const A = o.amb; const n = ambNovo(); for(const k of Object.keys(n)) if(A[k] === undefined) A[k] = n[k]; A.cfg = {...n.cfg, ...(A.cfg || {})}; return A; }
function ambSnap(){ AV.undo.push(JSON.stringify(amb())); if(AV.undo.length > 60) AV.undo.shift(); AV.redo = []; }
function ambTroca(de, para){ const s = de.pop(); if(s === undefined) return false; para.push(JSON.stringify(amb())); (ambDono() || S).amb = JSON.parse(s); AV.sel = null; AV.cons = null; return true; }
function ambMudou(){ armSyncTodos(); const o = ambDono(); if(o) touch(o); else save(); renderRibbonVis(); renderAmbiente(); }

/* ---------- geometria ---------- */
const wOff = w => w.orient === 'externa' ? [-w.esp, 0] : w.orient === 'centro' ? [-w.esp / 2, w.esp / 2] : [0, +w.esp];
const wLen = w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
const wAng = w => Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI;
const perto = (ax, ay, bx, by, t = 1) => Math.hypot(ax - bx, ay - by) < t;
function wLinha(w, off){ const L = wLen(w) || 1, dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L; return {px:w.x1 - dy * off, py:w.y1 + dx * off, dx, dy, L}; }
function cruza(a, b){ const d = a.dx * b.dy - a.dy * b.dx; if(Math.abs(d) < 1e-6) return null; const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / d; return [a.px + a.dx * t, a.py + a.dy * t]; }
// cantos da parede no piso: [A0, A1, B1, B0], com encontro em meia-esquadria com as paredes ligadas
function wCantos(w, P){
  const off = wOff(w), ant = P.find(v => v !== w && perto(v.x2, v.y2, w.x1, w.y1)), prox = P.find(v => v !== w && perto(v.x1, v.y1, w.x2, w.y2));
  const lado = i => { const l = wLinha(w, off[i]); let s = [l.px, l.py], e = [l.px + l.dx * l.L, l.py + l.dy * l.L];
    if(ant){ const q = cruza(l, wLinha(ant, wOff(ant)[i])); if(q && Math.hypot(q[0] - s[0], q[1] - s[1]) < 4 * Math.max(w.esp, ant.esp)) s = q; }
    if(prox){ const q = cruza(l, wLinha(prox, wOff(prox)[i])); if(q && Math.hypot(q[0] - e[0], q[1] - e[1]) < 4 * Math.max(w.esp, prox.esp)) e = q; }
    return [s, e]; };
  const [a0, a1] = lado(0), [b0, b1] = lado(1); return [a0, a1, b1, b0];
}
const areaPol = pts => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
// sequência fechada de paredes a partir da primeira (para o teto)
function ambLaco(P){
  if(!P.length) return null; const laco = [P[0]];
  for(let i = 0; i < P.length; i++){ const u = laco[laco.length - 1]; const v = P.find(x => x !== u && perto(x.x1, x.y1, u.x2, u.y2)); if(!v) return null; if(v === laco[0]) return laco; if(laco.includes(v)) return null; laco.push(v); }
  return null;
}
function ambBBox(A){ let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for(const w of A.paredes){ for(const [x, y] of wCantos(w, A.paredes)) add(x, y); if(Math.abs(+w.flecha || 0) > 1){ const [mx, my] = wMeioArco(w); add(mx, my); } }
  return x0 === Infinity ? null : {x0, y0, x1, y1}; }
function ambAjustarPiso(A){ const b = ambBBox(A); if(!b) return false; Object.assign(A.piso, {x:Math.round(b.x0), y:Math.round(b.y0), w:Math.round(b.x1 - b.x0), h:Math.round(b.y1 - b.y0)}); return true; }
// move um vértice e todas as paredes presas nele
function ambMoverVertice(A, x, y, nx, ny){ for(const w of A.paredes){ if(perto(w.x1, w.y1, x, y)){ w.x1 = nx; w.y1 = ny; } if(perto(w.x2, w.y2, x, y)){ w.x2 = nx; w.y2 = ny; } } }
const AMB_LISTA = {armario:'armarios', parede:'paredes', teto:'tetos', abertura:'aberturas', geo:'geometrias', luz:'luzes', texto:'textos', imagem:'imagens', modelo:'modelos'};
function ambSelObj(){ const A = amb(), s = AV.sel; if(!s) return null; if(s.t === 'piso') return A.piso; return (A[AMB_LISTA[s.t]] || []).find(o => o.id === s.id) || null; }
// ponto do meio do arco de uma parede curva (flecha > 0 curva para a esquerda, para fora)
function wMeioArco(w){ const L = wLen(w) || 1, dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L, f = +w.flecha || 0; return [(w.x1 + w.x2) / 2 - dy * f, (w.y1 + w.y2) / 2 + dx * f]; }
// desenho da linha de uma parede curva: arco SVG pela flecha
function wArcoPath(w, off, pt){ const f = +w.flecha || 0, L = wLen(w) || 1, dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L; const R = (L * L / 4 + f * f) / (2 * Math.abs(f));
  const a = [w.x1 - dy * off, w.y1 + dx * off], b = [w.x2 - dy * off, w.y2 + dx * off]; const Rr = Math.max(1, R + (f > 0 ? off : -off));
  return `M${pt(a)}A${Rr} ${Rr} 0 ${Math.abs(f) > L / 2 ? 1 : 0} ${f > 0 ? 0 : 1} ${pt(b)}`; }
// projeção de um ponto na parede: distância s ao longo dela e distância d à linha
function wProj(w, x, y){ const L = wLen(w) || 1, dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L; const s = (x - w.x1) * dx + (y - w.y1) * dy; return {s, d:Math.abs(-(x - w.x1) * dy + (y - w.y1) * dx), L}; }
function paredeMaisPerto(x, y, tol){ let m = null, d = tol; for(const w of amb().paredes){ const p = wProj(w, x, y); if(p.s >= -10 && p.s <= p.L + 10 && p.d < d + w.esp){ d = p.d; m = w; } } return m; }

/* ---------- construção de paredes ---------- */
function consPonta(mx, my){ // ponto de chegada da parede que está sendo construída, com os incrementos
  const C = AV.cons, A = amb(), cf = A.cfg, [lx, ly] = C.pts[C.pts.length - 1];
  let ang = C.ang ?? Math.atan2(my - ly, mx - lx) * 180 / Math.PI; if(C.ang == null && +cf.incA > 0 && AV.atrair) ang = Math.round(ang / cf.incA) * cf.incA;
  let L = Math.hypot(mx - lx, my - ly); if(+cf.incL > 0 && AV.atrair) L = Math.round(L / cf.incL) * cf.incL;
  const r = ang * Math.PI / 180; let p = [lx + L * Math.cos(r), ly + L * Math.sin(r)];
  const [fx, fy] = C.pts[0]; if(C.pts.length > 2 && perto(mx, my, fx, fy, C.tol || 150)) p = [fx, fy];
  return {p, L:Math.hypot(p[0] - lx, p[1] - ly), ang};
}
function consAdd(p){
  const C = AV.cons, A = amb(), cf = A.cfg, [lx, ly] = C.pts[C.pts.length - 1];
  if(Math.hypot(p[0] - lx, p[1] - ly) < 1) return;
  if(C.pts.length === 1) ambSnap();
  p = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  A.paredes.push({id:uid(), x1:lx, y1:ly, x2:p[0], y2:p[1], esp:+cf.esp, alt:+cf.alt, altFim:+cf.alt, orient:cf.orient, tipo:cf.tipo});
  C.pts.push(p); C.ang = null;
  const [fx, fy] = C.pts[0];
  if(C.pts.length > 3 && perto(p[0], p[1], fx, fy)){ consFim(); toast('Ambiente fechado. Use Construir Teto para pôr o teto.'); return; }
  ambMudou(); setTimeout(() => { const i = $('[data-ac=comp]'); i?.focus(); i?.select(); }, 20);
}
function consFim(){ const A = amb(); const fez = AV.cons && AV.cons.pts.length > 1; AV.cons = null; AV.ref = null; if(fez && A.piso.auto) ambAjustarPiso(A); ambMudou(); }

/* ---------- editor de paredes (manual 5.1, 7, 8.3) ---------- */
// divide a parede em duas no ponto s (Adicionar Vértice / Segmentar)
function ambDividir(w, s){ const A = amb(), L = wLen(w); if(!(s > 20 && s < L - 20)) return null; const k = s / L, x = Math.round((w.x1 + (w.x2 - w.x1) * k) * 10) / 10, y = Math.round((w.y1 + (w.y2 - w.y1) * k) * 10) / 10;
  const n = {...JSON.parse(JSON.stringify(w)), id:uid(), x1:x, y1:y, flecha:0}; const h0 = +w.alt, h1 = +(w.altFim ?? w.alt), hm = Math.round(h0 + (h1 - h0) * k);
  w.x2 = x; w.y2 = y; w.altFim = hm; n.alt = hm; w.flecha = 0; A.paredes.splice(A.paredes.indexOf(w) + 1, 0, n);
  for(const a of A.aberturas.filter(a => a.parede === w.id && a.pos >= s)){ a.parede = n.id; a.pos = Math.round(a.pos - s); }
  return n; }
// tira o vértice que junta duas paredes alinhadas ou não (Remover Vértice)
function ambRemoverVertice(x, y){ const A = amb(), a = A.paredes.find(w => perto(w.x2, w.y2, x, y)), b = A.paredes.find(w => perto(w.x1, w.y1, x, y));
  if(!a || !b || a === b) return false; const La = wLen(a); a.x2 = b.x2; a.y2 = b.y2; a.altFim = b.altFim ?? b.alt;
  for(const ab of A.aberturas.filter(ab => ab.parede === b.id)){ ab.parede = a.id; ab.pos = Math.round(ab.pos + La); }
  A.paredes = A.paredes.filter(w => w !== b); return true; }
// Encontro Canto: estende/corta as duas paredes até se cruzarem
function ambEncontroCanto(a, b){ const q = cruza(wLinha(a, 0), wLinha(b, 0)); if(!q) return false;
  const pa = Math.hypot(a.x1 - q[0], a.y1 - q[1]) < Math.hypot(a.x2 - q[0], a.y2 - q[1]) ? 1 : 2, pb = Math.hypot(b.x1 - q[0], b.y1 - q[1]) < Math.hypot(b.x2 - q[0], b.y2 - q[1]) ? 1 : 2;
  const r = v => Math.round(v * 10) / 10; a['x' + pa] = r(q[0]); a['y' + pa] = r(q[1]); b['x' + pb] = r(q[0]); b['y' + pb] = r(q[1]); return true; }
// Encontro T: a ponta mais perto da parede A vai até a face da parede B
function ambEncontroT(a, b){ const offB = wOff(b), lb = [wLinha(b, offB[0]), wLinha(b, offB[1])]; const la = wLinha(a, (wOff(a)[0] + wOff(a)[1]) / 2);
  let melhor = null; for(const l of lb){ const q = cruza(wLinha(a, 0), l); if(!q) continue; for(const p of [1, 2]){ const d = Math.hypot(a['x' + p] - q[0], a['y' + p] - q[1]); if(!melhor || d < melhor.d) melhor = {d, p, q}; } }
  if(!melhor) return false; void la; a['x' + melhor.p] = Math.round(melhor.q[0] * 10) / 10; a['y' + melhor.p] = Math.round(melhor.q[1] * 10) / 10; return true; }
// 30-40-50 (7.1.3): com as medidas A e B a partir do canto e a diagonal C, acha o ângulo e gira a parede selecionada
function amb304050(w, A, B, C){ const P = amb().paredes, ant = P.find(v => v !== w && perto(v.x2, v.y2, w.x1, w.y1)); if(!ant) return 'A parede selecionada precisa estar ligada a uma parede anterior.';
  const cos = (A * A + B * B - C * C) / (2 * A * B); if(!(cos >= -1 && cos <= 1)) return 'Essas medidas não formam um triângulo. Confira A, B e C.';
  const th = Math.acos(cos), da = Math.atan2(ant.y1 - ant.y2, ant.x1 - ant.x2); // direção que volta pela parede anterior
  const sinal = ((wAng(w) - wAng(ant) + 540) % 360) - 180 < 0 ? 1 : -1; const nova = da + sinal * th, L = wLen(w);
  ambMoverVertice(amb(), w.x2, w.y2, Math.round((w.x1 + L * Math.cos(nova)) * 10) / 10, Math.round((w.y1 + L * Math.sin(nova)) * 10) / 10);
  return +(th * 180 / Math.PI).toFixed(2); }

/* ---------- planta de referência (DXF ou imagem, cap. 9) ---------- */
function lerDXFLinhas(txt){ const L = txt.split(/\r?\n/).map(s => s.trim()), out = []; let i = 0; const pares = []; for(; i < L.length - 1; i += 2) pares.push([L[i], L[i + 1]]);
  let ent = null, pts = [], e = {}; const fecha = () => { if(!ent) return; if(ent === 'LINE' && e[10] != null) out.push([[+e[10], +e[20]], [+e[11], +e[21]]]); else if(ent === 'LWPOLYLINE' && pts.length > 1){ for(let k = 0; k < pts.length - 1; k++) out.push([pts[k], pts[k + 1]]); if((+e[70] & 1) === 1) out.push([pts[pts.length - 1], pts[0]]); }
    else if((ent === 'CIRCLE' || ent === 'ARC') && e[40] != null){ const a0 = ent === 'ARC' ? +e[50] : 0, a1 = ent === 'ARC' ? +e[51] : 360, n = 24; let fim = a1 < a0 ? a1 + 360 : a1; for(let k = 0; k < n; k++){ const t0 = (a0 + (fim - a0) * k / n) * Math.PI / 180, t1 = (a0 + (fim - a0) * (k + 1) / n) * Math.PI / 180; out.push([[+e[10] + e[40] * Math.cos(t0), +e[20] + e[40] * Math.sin(t0)], [+e[10] + e[40] * Math.cos(t1), +e[20] + e[40] * Math.sin(t1)]]); } } };
  for(const [c, v] of pares){ if(c === '0'){ fecha(); ent = v; pts = []; e = {}; continue; } if(ent === 'LWPOLYLINE' && c === '10'){ pts.push([+v, 0]); continue; } if(ent === 'LWPOLYLINE' && c === '20' && pts.length){ pts[pts.length - 1][1] = +v; continue; } e[c] = v; }
  fecha(); return out.slice(0, 20000); }

/* ---------- planta 2D ---------- */
function planta2D(){
  const A = amb(), P = A.paredes, sel = AV.sel, pi = A.piso; const b = ambBBox(A) || {x0:pi.x, y0:pi.y, x1:pi.x + pi.w, y1:pi.y + pi.h};
  const fx0 = Math.min(b.x0, pi.x) - 700, fy0 = Math.min(b.y0, pi.y) - 700, fx1 = Math.max(b.x1, pi.x + pi.w) + 700, fy1 = Math.max(b.y1, pi.y + pi.h) + 700;
  const vb = AV.vb || {x:fx0, y:-fy1, w:fx1 - fx0, h:fy1 - fy0};
  const host = $('#amb2dHost'), pt = ([x, y]) => `${x.toFixed(1)},${(-y).toFixed(1)}`, k = Math.max(vb.w / (host?.clientWidth || 900), vb.h / (host?.clientHeight || 600)); // k: mm por pixel
  const on = (t, id) => (sel?.t === t && sel.id === id) || !!AV.multi?.some(m => m.t === t && m.id === id);
  let g = '';
  // planta de referência (DXF ou imagem)
  const R = A.ref; if(R && AV.verRef){ if(R.tipo === 'dxf') g += `<path d="${R.linhas.map(([a, c]) => `M${(R.x + a[0] * R.esc).toFixed(1)} ${(-(R.y + a[1] * R.esc)).toFixed(1)}L${(R.x + c[0] * R.esc).toFixed(1)} ${(-(R.y + c[1] * R.esc)).toFixed(1)}`).join('')}" stroke="#7d93ad" stroke-width="${k}" fill="none" pointer-events="none"/>`;
    else if(R.tipo === 'img') g += `<image href="${R.src}" x="${R.x}" y="${-(R.y + R.h * R.esc)}" width="${R.w * R.esc}" height="${R.h * R.esc}" opacity="${R.opac ?? .5}" pointer-events="none" preserveAspectRatio="none"/>`; }
  g += `<rect x="${pi.x}" y="${-(pi.y + pi.h)}" width="${pi.w}" height="${pi.h}" fill="${sel?.t === 'piso' ? '#dbe8f6' : '#f3efe7'}" fill-opacity="${R && AV.verRef ? .55 : 1}" stroke="${sel?.t === 'piso' ? '#2f6db5' : '#c9bfae'}" stroke-width="${2 * k}" data-sel="piso"/>`;
  const passo = AV.grid.on ? Math.max(50, +AV.grid.passo || 500) : 500;
  if((pi.w / passo) * (pi.h / passo) < 40000){ for(let x = Math.ceil(pi.x / passo) * passo; x <= pi.x + pi.w; x += passo) g += `<path d="M${x} ${-pi.y}V${-(pi.y + pi.h)}" stroke="#e2dbcf" stroke-width="${k}" pointer-events="none"/>`;
    for(let y = Math.ceil(pi.y / passo) * passo; y <= pi.y + pi.h; y += passo) g += `<path d="M${pi.x} ${-y}H${pi.x + pi.w}" stroke="#e2dbcf" stroke-width="${k}" pointer-events="none"/>`; }
  // regiões do piso e geometrias (vizinhos)
  if(AV.vizinhos) for(const o of A.geometrias){ const s = on('geo', o.id), cor = s ? '#2f6db5' : o.perfurar ? '#c8372d' : '#8a7a5c', fill = o.tipo === 'regiao' ? 'rgba(201,191,174,.45)' : o.tipo === 'coluna' ? '#b9b0a0' : 'rgba(217,179,128,.35)';
    let forma; if(o.tipo === 'circ' || o.tipo === 'poli'){ const n = o.tipo === 'circ' ? 40 : Math.max(3, o.lados || 6), r = o.w / 2, a0 = (o.rot || 0) * Math.PI / 180; forma = `<polygon points="${Array.from({length:n}, (_, i) => pt([o.x + r * Math.cos(a0 + i * 2 * Math.PI / n), o.y + r * Math.sin(a0 + i * 2 * Math.PI / n)])).join(' ')}"`; }
    else if(o.pts?.length > 2) forma = `<polygon points="${o.pts.map(pt).join(' ')}"`;
    else { const cx = o.x + o.w / 2, cy = o.y + o.d / 2; forma = `<rect x="${o.x}" y="${-(o.y + o.d)}" width="${o.w}" height="${o.d}" transform="rotate(${-(o.rot || 0)} ${cx} ${-cy})"`; }
    g += `${forma} fill="${fill}" stroke="${cor}" stroke-width="${(s ? 2.5 : 1.2) * k}" ${o.tipo === 'rebaixo' ? `stroke-dasharray="${8 * k} ${5 * k}"` : ''} data-sel="geo" data-id="${o.id}" style="cursor:move"/>`; }
  for(const t of A.tetos) if(t.pts?.length > 2) g += `<polygon points="${t.pts.map(pt).join(' ')}" fill="${on('teto', t.id) ? 'rgba(47,109,181,.12)' : 'none'}" stroke="${on('teto', t.id) ? '#2f6db5' : '#8a96a3'}" stroke-dasharray="${8 * k} ${6 * k}" stroke-width="${1.5 * k}" pointer-events="none"/>`;
  for(const w of P){ const c = wCantos(w, P), s = on('parede', w.id) || (AV.par && AV.par.a === w.id);
    const fill = s ? '#9cc2ea' : AMB_TIPOS[w.tipo]?.[1] || '#c9c1b3', st = `stroke="${s ? '#2f6db5' : '#4d4a44'}" stroke-width="${(s ? 2.5 : 1.2) * k}" data-sel="parede" data-id="${w.id}" style="cursor:${AV.ferr2d === 'sel' ? 'move' : 'pointer'}"`;
    if(Math.abs(+w.flecha || 0) > 1){ const [o0, o1] = wOff(w); g += `<path d="${wArcoPath(w, o0, pt)}" fill="none" ${st.replace(/stroke-width="[^"]+"/, `stroke-width="${Math.max(2 * k, w.esp)}"`).replace(/stroke="[^"]+"/, `stroke="${fill}"`)} stroke-opacity="${w.transp ? .45 : 1}" transform="translate(0,0)"/>`;
      g += `<path d="${wArcoPath(w, (o0 + o1) / 2, pt)}" fill="none" stroke="${s ? '#2f6db5' : '#4d4a44'}" stroke-width="${k}" pointer-events="none" stroke-dasharray="${4 * k} ${3 * k}"/>`; }
    else g += `<polygon points="${c.map(pt).join(' ')}" fill="${fill}" fill-opacity="${w.transp ? .45 : 1}" ${st}/>`;
    if(w.rebaixada) g += `<path d="M${pt(c[0])}L${pt(c[2])}M${pt(c[1])}L${pt(c[3])}" stroke="#8a96a3" stroke-width="${k}" pointer-events="none"/>`; }
  // portas e janelas na planta: folha com arco de abertura e linhas da janela
  for(const a of A.aberturas){ const w = P.find(x => x.id === a.parede); if(!w) continue; const s = on('abertura', a.id), L = wLinha(w, 0), [o0, o1] = wOff(w);
    const p = (d, off) => [L.px + L.dx * d - L.dy * off, L.py + L.dy * d + L.dx * off]; const q = [p(a.pos, o0), p(a.pos + a.larg, o0), p(a.pos + a.larg, o1), p(a.pos, o1)];
    g += `<polygon points="${q.map(pt).join(' ')}" fill="${s ? '#cfe2f6' : '#fff'}" stroke="${s ? '#2f6db5' : '#4d4a44'}" stroke-width="${(s ? 2 : 1) * k}" data-sel="abertura" data-id="${a.id}" style="cursor:move"/>`;
    if(a.tipo === 'porta'){ const ph = a.inv ? a.pos + a.larg : a.pos, h = p(ph, o0), fim = p(ph, o0 - a.larg); g += `<path d="M${pt(h)}L${pt(fim)}A${a.larg} ${a.larg} 0 0 ${a.inv ? 0 : 1} ${pt(p(a.inv ? a.pos : a.pos + a.larg, o0))}" fill="none" stroke="${s ? '#2f6db5' : '#6b665d'}" stroke-width="${k}" pointer-events="none"/>`; }
    else if(a.tipo === 'janela' || a.tipo === 'correr'){ const m = (o0 + o1) / 2; g += `<path d="M${pt(p(a.pos, m - w.esp / 6))}L${pt(p(a.pos + a.larg, m - w.esp / 6))}M${pt(p(a.pos, m + w.esp / 6))}L${pt(p(a.pos + a.larg, m + w.esp / 6))}" stroke="${s ? '#2f6db5' : '#4d8ad0'}" stroke-width="${1.2 * k}" pointer-events="none"/>`; } }
  // armários (Construtor): planta com a frente tracejada; aéreos tracejados
  for(const a of A.armarios || []){ if(a.oculto && !AV.verOcultos) continue; const q = armCantos(a), s = on('armario', a.id), fr = armLayout(a).frentes.length;
    g += `<polygon points="${q.map(pt).join(' ')}" fill="${s ? 'rgba(47,109,181,.25)' : a.oculto ? 'rgba(232,220,200,.3)' : 'rgba(232,220,200,.85)'}" stroke="${s ? '#2f6db5' : '#6b4d2e'}" stroke-width="${(s ? 2.5 : 1.2) * k}" ${+a.z > 0 ? `stroke-dasharray="${8 * k} ${5 * k}"` : ''} data-sel="armario" data-id="${a.id}" style="cursor:move"/>`;
    if(fr){ const f = armCh(a.chapaFrente).esp, r = a.rot * Math.PI / 180, nx = Math.sin(r), ny = -Math.cos(r), d = +a.P; g += `<path d="M${pt([q[0][0] + nx * d, q[0][1] + ny * d])}L${pt([q[1][0] + nx * d, q[1][1] + ny * d])}" stroke="#6b4d2e" stroke-width="${k}" pointer-events="none"/>`; void f; }
    const c = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2]; let ang = -a.rot; if(ang < -90 || ang > 90) ang += 180;
    g += `<text x="${c[0]}" y="${-c[1]}" font-size="${10 * k}" text-anchor="middle" dominant-baseline="middle" fill="#5b4630" transform="rotate(${ang} ${c[0]} ${-c[1]})" pointer-events="none">${esc(a.nome)} ${fmt(a.L)}</text>`; }
  // luzes, textos, imagens e arquivos 3D (vizinhos)
  if(AV.vizinhos){ for(const l of A.luzes) g += `<circle cx="${l.x}" cy="${-l.y}" r="${9 * k}" fill="${on('luz', l.id) ? '#2f6db5' : '#f2c53d'}" stroke="#7a5c00" stroke-width="${k}" data-sel="luz" data-id="${l.id}" style="cursor:move"/>`;
    for(const t of A.textos) g += `<text x="${t.x}" y="${-t.y}" font-size="${12 * k}" fill="${on('texto', t.id) ? '#2f6db5' : '#2c3a48'}" text-anchor="middle" data-sel="texto" data-id="${t.id}" style="cursor:move">T: ${esc(t.txt || '')}</text>`;
    for(const m of A.modelos) g += `<rect x="${m.x - 150}" y="${-m.y - 150}" width="300" height="300" fill="rgba(47,109,181,.12)" stroke="${on('modelo', m.id) ? '#2f6db5' : '#5a6573'}" stroke-width="${k}" data-sel="modelo" data-id="${m.id}" style="cursor:move"/><text x="${m.x}" y="${-m.y}" font-size="${10 * k}" text-anchor="middle" pointer-events="none">${esc(m.nome)}</text>`;
    for(const im of A.imagens) g += `<circle cx="${im.x}" cy="${-im.y}" r="${7 * k}" fill="${on('imagem', im.id) ? '#2f6db5' : '#8a96a3'}" data-sel="imagem" data-id="${im.id}" style="cursor:move"/>`; }
  if(AV.cotas) for(const w of P){ const c = wCantos(w, P), L = wLinha(w, wOff(w)[1] + 16 * k); const ext = Math.hypot(c[2][0] - c[3][0], c[2][1] - c[3][1]), int = Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]);
    const mx = L.px + L.dx * L.L / 2, my = L.py + L.dy * L.L / 2; let a = Math.atan2(L.dy, L.dx) * 180 / Math.PI; if(a > 90 || a <= -90) a += 180;
    g += `<text x="${mx}" y="${-my}" font-size="${12 * k}" text-anchor="middle" dominant-baseline="middle" fill="#2c3a48" transform="rotate(${-a} ${mx} ${-my})" pointer-events="none">${fmt(int)}${Math.abs(ext - int) > .5 ? ` <tspan fill="#8a96a3">(ext. ${fmt(ext)})</tspan>` : ''}</text>`; }
  if(sel?.t === 'parede'){ const w = P.find(x => x.id === sel.id); if(w){ for(const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) g += `<circle cx="${x}" cy="${-y}" r="${6 * k}" fill="#fff" stroke="#2f6db5" stroke-width="${2 * k}" data-vert="${x},${y}" style="cursor:move"/>`;
    const [mx, my] = wMeioArco(w); g += `<rect x="${mx - 5 * k}" y="${-my - 5 * k}" width="${10 * k}" height="${10 * k}" fill="#2f6db5" stroke="#fff" stroke-width="${k}" data-meio="${w.id}" style="cursor:move"><title>Arraste para curvar a parede</title></rect>`; } }
  if(AV.ferr2d === 'remVert') for(const w of P) g += `<circle cx="${w.x1}" cy="${-w.y1}" r="${6 * k}" fill="#c8372d" stroke="#fff" stroke-width="${k}" data-rv="${w.x1},${w.y1}" style="cursor:pointer"/>`;
  const C = AV.cons; if(C){ for(const [x, y] of C.pts) g += `<circle cx="${x}" cy="${-y}" r="${4 * k}" fill="#c8372d" pointer-events="none"/>`;
    if(C.mouse && C.pts.length){ const q = consPonta(...C.mouse), l = C.pts[C.pts.length - 1];
      g += `<path d="M${pt(l)}L${pt(q.p)}" stroke="#c8372d" stroke-width="${2 * k}" stroke-dasharray="${6 * k} ${4 * k}" pointer-events="none"/><text x="${q.p[0] + 10 * k}" y="${-q.p[1] - 10 * k}" font-size="${13 * k}" fill="#c8372d" pointer-events="none">${fmt(q.L)} mm · ${fmt(((q.ang % 360) + 360) % 360, 1)}°</text>`; } }
  const Rf = AV.ref; if(Rf?.p){ g += `<circle cx="${Rf.p[0]}" cy="${-Rf.p[1]}" r="${5 * k}" fill="#2f6db5" pointer-events="none"/>`; if(Rf.mouse){ const q = refPonto(Rf.mouse); g += `<path d="M${pt(Rf.p)}L${pt(q.p)}" stroke="#2f6db5" stroke-width="${2 * k}" pointer-events="none"/><text x="${q.p[0] + 8 * k}" y="${-q.p[1] - 8 * k}" font-size="${12 * k}" fill="#2f6db5" pointer-events="none">${fmt(q.d)} mm</text>`; } }
  if(AV.zoomJanela) g += `<rect x="${Math.min(AV.zoomJanela.a[0], AV.zoomJanela.b[0])}" y="${-Math.max(AV.zoomJanela.a[1], AV.zoomJanela.b[1])}" width="${Math.abs(AV.zoomJanela.b[0] - AV.zoomJanela.a[0])}" height="${Math.abs(AV.zoomJanela.b[1] - AV.zoomJanela.a[1])}" fill="rgba(200,55,45,.08)" stroke="#c8372d" stroke-width="${k}" pointer-events="none"/>`;
  return `<svg id="amb2d" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;background:#fbfcfd;touch-action:none">${g}</svg>`;
}
// Referências (5.1.3): a nova parede começa a uma distância medida a partir de um ponto de parede existente
function refPonto(m){ const R = AV.ref, dx = m[0] - R.p[0], dy = m[1] - R.p[1]; let a = Math.atan2(dy, dx); if(AV.atrair) a = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
  let d = Math.hypot(dx, dy); if(AV.atrair && +amb().cfg.incL > 0) d = Math.round(d / amb().cfg.incL) * amb().cfg.incL; return {p:[R.p[0] + d * Math.cos(a), R.p[1] + d * Math.sin(a)], d, a}; }
function svgMM(svg, e){ const m = svg.getScreenCTM().inverse(); const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m); return [p.x, -p.y]; }
function ambSnapPt(x, y, tol){ const A = amb(); if(AV.atrair) for(const w of A.paredes) for(const [vx, vy] of [[w.x1, w.y1], [w.x2, w.y2]]) if(perto(x, y, vx, vy, tol)) return [vx, vy];
  const i = AV.atrair ? +A.cfg.incL || 1 : 1; return [Math.round(x / i) * i, Math.round(y / i) * i]; }
function ligar2D(){
  const svg = $('#amb2d'); if(!svg) return; const pxmm = () => { const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal; return Math.max(vb.width / r.width, vb.height / r.height); };
  const setVB = () => svg.setAttribute('viewBox', `${AV.vb.x} ${AV.vb.y} ${AV.vb.w} ${AV.vb.h}`);
  svg.addEventListener('contextmenu', e => { e.preventDefault(); if(AV.cons) consFim(); else if(AV.ref?.p){ AV.cons = {pts:[refPonto(AV.ref.mouse || AV.ref.p).p], ang:null}; AV.ref = null; renderAmbiente(); } else if(AV.ferr2d !== 'sel' || AV.inserir){ AV.ferr2d = 'sel'; AV.inserir = null; AV.par = null; render(); } });
  svg.addEventListener('wheel', e => { e.preventDefault(); const vb = svg.viewBox.baseVal, [mx, my] = svgMM(svg, e), f = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    AV.vb = {x:mx - (mx - vb.x) * f, y:-my - (-my - vb.y) * f, w:vb.width * f, h:vb.height * f}; setVB(); }, {passive:false});
  svg.addEventListener('pointerdown', e => {
    const [x, y] = svgMM(svg, e), A = amb();
    if(e.button === 1 || (e.button === 0 && (e.shiftKey || AV.nav === 'pan'))){ const vb = svg.viewBox.baseVal; AV.drag = {pan:true, sx:e.clientX, sy:e.clientY, vb:{x:vb.x, y:vb.y, w:vb.width, h:vb.height}}; svg.setPointerCapture(e.pointerId); return; }
    if(e.button !== 0) return;
    if(e.button === 0 && AV.nav === 'zoom' && !AV.cons){ const vb = svg.viewBox.baseVal; AV.drag = {zdrag:true, sy:e.clientY, vb:{x:vb.x, y:vb.y, w:vb.width, h:vb.height}}; svg.setPointerCapture(e.pointerId); return; }
    if(AV.ferr2d === 'zoomJanela' || AV.nav === 'janela'){ AV.zoomJanela = {a:[x, y], b:[x, y]}; AV.drag = {zoom:true}; svg.setPointerCapture(e.pointerId); return; }
    if(AV.cons){ const C = AV.cons; C.tol = 12 * pxmm(); if(!C.pts.length){ C.pts.push(ambSnapPt(x, y, C.tol)); renderAmbiente(); } else consAdd(consPonta(x, y).p); return; }
    if(AV.ref){ if(!AV.ref.p){ const w = paredeMaisPerto(x, y, 40 * pxmm()); if(!w){ toast('Clique sobre uma parede já construída.'); return; } const p = wProj(w, x, y), L = wLinha(w, 0); AV.ref.p = [L.px + L.dx * p.s, L.py + L.dy * p.s]; refresh2D(); toast('Mova o mouse para a direção da nova parede, digite a distância e tecle Enter (ou clique).'); }
      else { AV.cons = {pts:[refPonto([x, y]).p], ang:null}; AV.ref = null; renderAmbiente(); } return; }
    if(AV.inserir){ ambInserirEm(AV.inserir, x, y); return; }
    const tgt = e.target.closest('[data-sel],[data-vert],[data-meio],[data-rv]');
    if(AV.ferr2d === 'remVert'){ const rv = e.target.closest('[data-rv]'); if(rv){ const [vx, vy] = rv.dataset.rv.split(',').map(Number); ambSnap(); if(ambRemoverVertice(vx, vy)) ambMudou(); else { AV.undo.pop(); toast('Esse vértice não junta duas paredes.'); } } return; }
    if(AV.ferr2d === 'addVert'){ const w = paredeMaisPerto(x, y, 30 * pxmm()); if(w){ ambSnap(); ambDividir(w, wProj(w, x, y).s); AV.sel = {t:'parede', id:w.id}; ambMudou(); } return; }
    if(AV.ferr2d === 'curva'){ const w = paredeMaisPerto(x, y, 30 * pxmm()); if(w){ ambSnap(); AV.sel = {t:'parede', id:w.id}; AV.drag = {meio:w.id, moved:false}; svg.setPointerCapture(e.pointerId); refresh2D(); } return; }
    if(AV.ferr2d === 'coluna'){ ambSnap(); const g = {id:uid(), tipo:'coluna', x:Math.round(x - 150), y:Math.round(y - 150), w:300, d:300, z:0, alt:+A.cfg.alt, rot:0}; A.geometrias.push(g); AV.sel = {t:'geo', id:g.id}; ambMudou(); return; }
    if(AV.ferr2d === 'cantoA' || AV.ferr2d === 'tA'){ const w = paredeMaisPerto(x, y, 30 * pxmm()); if(!w) return; if(!AV.par){ AV.par = {a:w.id}; refresh2D(); toast('Agora clique na outra parede.'); return; }
      const a = A.paredes.find(v => v.id === AV.par.a); if(!a || a === w) return; ambSnap(); const ok = AV.ferr2d === 'cantoA' ? ambEncontroCanto(a, w) : ambEncontroT(a, w); AV.par = null; if(!ok){ AV.undo.pop(); toast('As paredes são paralelas: não há encontro.'); return; } if(A.piso.auto) ambAjustarPiso(A); ambMudou(); return; }
    if(tgt?.dataset.meio){ const w = A.paredes.find(v => v.id === tgt.dataset.meio); if(w){ ambSnap(); AV.drag = {meio:w.id, moved:false}; svg.setPointerCapture(e.pointerId); } return; }
    if(tgt?.dataset.vert){ const [vx, vy] = tgt.dataset.vert.split(',').map(Number); ambSnap(); AV.drag = {vx, vy, moved:false}; svg.setPointerCapture(e.pointerId); return; }
    const t = tgt?.dataset.sel ? tgt : null, novo = t ? (t.dataset.sel === 'piso' ? {t:'piso'} : {t:t.dataset.sel, id:t.dataset.id}) : null;
    const jaNaSel = novo && AV.multi?.length > 1 && AV.multi.some(m => m.t === novo.t && m.id === novo.id) && !e.ctrlKey; if(jaNaSel) AV.sel = novo; else ambSelecionar(novo, e.ctrlKey || e.metaKey);
    // Selecionar/Mover: arrastar a parede (perpendicular), a abertura (ao longo da parede) ou um item; com vários selecionados, move todos
    if(t && t.dataset.sel !== 'piso' && t.dataset.sel !== 'teto' && !(e.ctrlKey && !jaNaSel)){ ambSnap(); const multi = AV.multi?.length > 1 ? AV.multi.filter(m => m.t !== 'parede' && m.t !== 'abertura').map(m => ({s:m, orig:JSON.parse(JSON.stringify(ambObjDe(m)))})) : null;
      AV.drag = {obj:{...AV.sel}, x0:x, y0:y, moved:false, orig:JSON.parse(JSON.stringify(ambSelObj())), multi}; svg.setPointerCapture(e.pointerId); }
    renderRibbonVis(); renderAmbiente();
  });
  svg.addEventListener('pointermove', e => {
    const d = AV.drag; if(d?.zdrag){ const f = Math.exp((e.clientY - d.sy) * .006), cx = d.vb.x + d.vb.w / 2, cy = d.vb.y + d.vb.h / 2; AV.vb = {x:cx - d.vb.w * f / 2, y:cy - d.vb.h * f / 2, w:d.vb.w * f, h:d.vb.h * f}; setVB(); return; }
    if(d?.pan){ const k = pxmm(); AV.vb = {...d.vb, x:d.vb.x - (e.clientX - d.sx) * k, y:d.vb.y - (e.clientY - d.sy) * k}; setVB(); return; }
    const [x, y] = svgMM(svg, e), A = amb();
    if(d?.zoom){ AV.zoomJanela.b = [x, y]; refresh2D(); return; }
    if(d?.meio){ const w = A.paredes.find(v => v.id === d.meio); if(!w) return; const L = wLen(w) || 1, dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L; let f = -(x - (w.x1 + w.x2) / 2) * dy + (y - (w.y1 + w.y2) / 2) * dx; if(Math.abs(f) < 20) f = 0; w.flecha = Math.round(Math.max(-L * .9, Math.min(L * .9, f))); d.moved = true; refresh2D(); return; }
    if(d?.obj){ const o = ambSelObj(); let dx = x - d.x0, dy = y - d.y0; if(!o) return; if(AV.trava === 'x') dy = 0; else if(AV.trava === 'y') dx = 0; if(Math.hypot(dx, dy) < 2 * pxmm() && !d.moved) return; d.moved = true; const r = v => AV.atrair ? Math.round(v / 10) * 10 : Math.round(v);
      if(d.obj.t === 'parede'){ const L = wLen(d.orig) || 1, nx = -(d.orig.y2 - d.orig.y1) / L, ny = (d.orig.x2 - d.orig.x1) / L, m = r(dx * nx + dy * ny);
        ambMoverVertice(A, o.x1, o.y1, d.orig.x1 + nx * m, d.orig.y1 + ny * m); const w2 = A.paredes.find(v => v.id === o.id); ambMoverVertice(A, w2.x2, w2.y2, d.orig.x2 + nx * m, d.orig.y2 + ny * m); }
      else if(d.obj.t === 'abertura'){ const w = A.paredes.find(v => v.id === o.parede); if(w){ const L = wLen(w), ux = (w.x2 - w.x1) / L, uy = (w.y2 - w.y1) / L; o.pos = Math.max(0, Math.min(L - o.larg, r(d.orig.pos + dx * ux + dy * uy))); if(AV.colisao) o.pos = abColisao(o, w); } }
      else if(d.multi){ for(const m of d.multi){ const q = ambObjDe(m.s); if(!q || !('x' in q)) continue; q.x = r(m.orig.x + dx); q.y = r(m.orig.y + dy); if(q.pts && m.orig.pts) q.pts = m.orig.pts.map(p => [r(p[0] + dx), r(p[1] + dy)]); if(m.s.t === 'armario') delete q.parede; } }
      else if(d.obj.t === 'armario' && d.orig.parede){ const w = A.paredes.find(v => v.id === d.orig.parede); if(w){ const F = armFace(w), s0 = armPosNaParede(d.orig, w), m = dx * F.dx + dy * F.dy, fora = Math.abs(-dx * F.dy + dy * F.dx);
          if(fora > 400){ delete o.parede; o.x = r(d.orig.x + dx); o.y = r(d.orig.y + dy); } else { o.x = d.orig.x; o.y = d.orig.y; armNaParede(o, w, r(s0 + m) + o.L / 2); } } }
      else { o.x = r(d.orig.x + dx); o.y = r(d.orig.y + dy); if(o.pts && d.orig.pts) o.pts = d.orig.pts.map(p => [r(p[0] + dx), r(p[1] + dy)]);
        if(d.obj.t === 'armario'){ const w = paredeMaisPerto(o.x + o.L / 2, o.y, 250); if(w && !(Math.abs(+w.flecha || 0) > 1)){ const F = armFace(w); armNaParede(o, w, (o.x - F.px) * F.dx + (o.y - F.py) * F.dy + o.L / 2); } } }
      refresh2D(); motorRoom(); return; }
    if(d){ const [nx, ny] = ambSnapPt(x, y, 0); if(nx === d.vx && ny === d.vy) return; ambMoverVertice(A, d.vx, d.vy, nx, ny); d.vx = nx; d.vy = ny; d.moved = true; refresh2D(); return; }
    if(AV.ref?.p){ AV.ref.mouse = [x, y]; refresh2D(); const q = refPonto([x, y]), ci = $('[data-ac=refDist]'); if(ci && document.activeElement !== ci) ci.value = Math.round(q.d); return; }
    if(AV.cons?.pts.length){ AV.cons.mouse = [x, y]; refresh2D(); motorRoom(); const q = consPonta(x, y); const ci = $('[data-ac=comp]'); if(ci && document.activeElement !== ci) ci.value = Math.round(q.L);
      const ai = $('[data-ac=angAbs]'); if(ai && document.activeElement !== ai) ai.value = +(((q.ang % 360) + 360) % 360).toFixed(1); }
  });
  svg.addEventListener('pointerup', () => { const d = AV.drag; AV.drag = null; if(!d || d.pan || d.zdrag) return;
    if(d.zoom){ const z = AV.zoomJanela; AV.zoomJanela = null; const w = Math.abs(z.b[0] - z.a[0]), h = Math.abs(z.b[1] - z.a[1]); if(w > 50 && h > 50) AV.vb = {x:Math.min(z.a[0], z.b[0]), y:-Math.max(z.a[1], z.b[1]), w, h}; if(AV.ferr2d === 'zoomJanela') AV.ferr2d = 'sel'; if(AV.nav === 'janela'){ AV.nav = 'sel'; renderRibbonVis(); } refresh2D(); return; }
    if(d.moved){ if(amb().piso.auto) ambAjustarPiso(amb()); ambMudou(); } else AV.undo.pop(); });
}
function refresh2D(){ const h = $('#amb2dHost'); if(!h) return; h.innerHTML = planta2D(); ligar2D(); }
// a abertura não passa por cima de outra na mesma parede (Colisão, 3.8)
function abColisao(a, w){ const L = wLen(w); let p = Math.max(0, Math.min(L - a.larg, a.pos)); for(const o of amb().aberturas) if(o !== a && o.parede === a.parede && p < o.pos + o.larg && p + a.larg > o.pos) p = a.pos + a.larg / 2 < o.pos + o.larg / 2 ? o.pos - a.larg : o.pos + o.larg; return Math.max(0, Math.min(L - a.larg, p)); }

/* ---------- inserir itens (pelo 2D ou pelo 3D) ---------- */
function ambInserirEm(tipo, x, y, info = {}){
  const A = amb(); ambSnap(); let sel = null;
  if(AB_TIPOS[tipo] || tipo === 'imagem'){ const w = info.parede ? A.paredes.find(v => v.id === info.parede) : paredeMaisPerto(x, y, 400); if(!w){ AV.undo.pop(); toast('Clique sobre uma parede.'); return; }
    const s = info.s ?? wProj(w, x, y).s;
    if(tipo === 'imagem'){ AV.undo.pop(); ACT.ambImagem(null, {parede:w, s}); return; }
    const [n, larg, alt, afast] = AB_TIPOS[tipo]; const a = {id:uid(), parede:w.id, tipo, pos:Math.round(s - larg / 2), larg, alt, afast, mat:tipo === 'correr' ? 'aluminio' : 'madeira'}; void n; a.pos = AV.colisao ? abColisao(a, w) : Math.max(0, Math.min(wLen(w) - larg, a.pos)); A.aberturas.push(a); sel = {t:'abertura', id:a.id}; }
  else if(tipo.startsWith('geo:')){ const t = tipo.slice(4), g = {id:uid(), tipo:t, x:Math.round(x - 300), y:Math.round(y - 300), w:600, d:600, z:0, alt:t === 'regiao' ? 2 : 750, rot:0, lados:6};
    if(t === 'circ' || t === 'poli'){ g.x = Math.round(x); g.y = Math.round(y); }
    if(t === 'coluna'){ g.w = g.d = 300; g.alt = +A.cfg.alt; }
    if(t === 'rebaixo'){ const alt = A.tetos[0]?.afast || A.cfg.alt; g.w = 1500; g.d = 1000; g.x = Math.round(x - 750); g.y = Math.round(y - 500); g.alt = 200; g.z = alt - 200; g.mat = 'gesso'; }
    if(t === 'livre' || t === 'regiao'){ g.pts = [[x - 400, y - 300], [x + 400, y - 300], [x + 500, y + 200], [x - 300, y + 350]].map(p => p.map(Math.round)); if(t === 'regiao') g.mat = 'madeira'; }
    if(info.perfurar){ g.perfurar = true; g.w = 900; g.d = 400; g.alt = 2100; }
    A.geometrias.push(g); sel = {t:'geo', id:g.id}; }
  else if(tipo.startsWith('luz:')){ const l = {id:uid(), tipo:tipo.slice(4), x:Math.round(x), y:Math.round(y), z:(A.tetos[0]?.afast || A.cfg.alt) - 50, int:1, cor:'#fff1dc', inc:90, abertura:60, comp:1000, larg:40, rot:0, sombra:false}; A.luzes.push(l); sel = {t:'luz', id:l.id}; }
  else if(/^(arm|item):/.test(tipo)){ let a; if(tipo.startsWith('arm:')) a = armNovo(tipo.slice(4)); else { const it = ambDono()?.itens.find(i => i.id === tipo.slice(5)); if(!it){ AV.undo.pop(); toast('Esse item não está mais no projeto.'); return; } a = armDeItem(it); }
    armPosicionar(a, x, y, info); A.armarios.push(a); sel = {t:'armario', id:a.id}; }
  else if(tipo === 'texto'){ const t = {id:uid(), txt:'Texto', x:Math.round(x), y:Math.round(y), z:1200, tam:200, prof:30, rot:0, cor:'#2c3a48'}; A.textos.push(t); sel = {t:'texto', id:t.id}; }
  AV.inserir = null; AV.sel = sel; AV.multi = []; ambMudou();
}

/* ---------- motor 3D (Panelizer) num quadro ---------- */
const MOTOR = {frame:null, pronto:false, host:null, ro:null, ultimo:null, dono:null};
window.__motor3d = {
  get design(){ return amb().pz || null; },
  salvarDesign: d => { const A = amb(); A.pz = d; const o = ambDono(); if(o) touch(o); else save(); },
  selecionar: (s, x) => { if(AV.cons || AV.ref) return; ambSelecionar(s, x?.ctrl); renderRibbonVis(); renderAmbiente(true); },
  tecla: t => pbTecla(t),
  cliquePiso: (x, y, botao) => { if(!AV.cons) return; if(botao === 2){ consFim(); render(); return; } const C = AV.cons; C.tol = 150; if(!C.pts.length){ C.pts.push(ambSnapPt(x, y, C.tol)); renderAmbiente(); } else consAdd(consPonta(x, y).p); },
  movePiso: (x, y) => { if(!AV.cons?.pts.length) return; AV.cons.mouse = [x, y]; motorRoom(); if($('#amb2dHost')) refresh2D(); },
  inserir: (tipo, i) => { if(i.parede){ const w = amb().paredes.find(v => v.id === i.parede); if(!w) return; const L = wLinha(w, 0); ambInserirEm(tipo, L.px + L.dx * i.s, L.py + L.dy * i.s, i); } else ambInserirEm(tipo, i.x, i.y, i); },
  acao: (nome, s, arg) => ambAcao3D(nome, s, arg),
  baixar: (nome, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast(`Arquivo ${nome} salvo na pasta Downloads.`); },
  vistaMudou: v => { MOTOR.vista = v; },
  enviarPecas: pecas => ambEnviarPecas(pecas),
  aviso: t => toast(t),
  pronto: () => { if(!motorGL().gl2){ MOTOR.pronto = false; motorFalhou(true); return; }
    setTimeout(() => { let tem = false; try { tem = !!MOTOR.frame.contentDocument.querySelector('canvas'); } catch(e){} if(!tem){ MOTOR.erros = [...(MOTOR.erros || []), 'o quadro do 3D não criou a área de desenho (canvas)']; MOTOR.pronto = false; motorFalhou(true); } }, 2500);
    MOTOR.pronto = true; MOTOR.falha = null; clearTimeout(MOTOR.relogio); MOTOR.dono = null; motorRoom(); if(UI.aba === 'vis' && $('#motorDiag')) renderAmbiente(); },
  erro: t => { (MOTOR.erros = MOTOR.erros || []).push(String(t || 'erro sem mensagem')); if(MOTOR.erros.length > 8) MOTOR.erros.shift(); if(!MOTOR.pronto || /webgl|context/i.test(t)){ MOTOR.pronto = false; motorFalhou(true); } },
};
const motor = () => { try { return MOTOR.frame?.contentWindow?.Motor3D || null; } catch(e){ return null; } };
function motorHTML(){ const b = $('#motor3dFonte'); if(!b) return ''; const bin = atob(b.textContent.trim()); const u = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }
function motorCriar(){
  if(MOTOR.frame) return; const h = document.createElement('div'); h.id = 'motorHost'; h.style.cssText = 'position:fixed;z-index:1;display:none;background:#eef2f6'; const f = document.createElement('iframe'); f.title = 'Ambiente 3D'; f.style.cssText = 'border:0;width:100%;height:100%;display:block'; f.setAttribute('allow', 'fullscreen');
  h.appendChild(f); document.body.appendChild(h); MOTOR.host = h; MOTOR.frame = f; motorCarregar();
  window.addEventListener('resize', motorPosicionar); MOTOR.ro = new ResizeObserver(motorPosicionar);
}
// carrega o motor no quadro; os erros de dentro dele vêm para cá, e se ele não ficar pronto a tela explica o motivo
function motorCarregar(){ const f = MOTOR.frame; if(!f) return; MOTOR.pronto = false; MOTOR.falha = null; MOTOR.erros = [];
  const espia = `<script>addEventListener('error',function(e){try{parent.__motor3d.erro(e.message||(e.target&&e.target.src)||'erro')}catch(_){}},true);addEventListener('unhandledrejection',function(e){try{parent.__motor3d.erro(e.reason&&e.reason.message||String(e.reason))}catch(_){}});<\/script>`;
  const html = motorHTML(); f.srcdoc = html.includes('<head>') ? html.replace('<head>', '<head>' + espia) : espia + html;
  clearTimeout(MOTOR.relogio); MOTOR.relogio = setTimeout(() => { if(!MOTOR.pronto) motorFalhou(); }, 20000); }
function motorGL(){ const c = document.createElement('canvas'); let gl2 = null, gl1 = null; try { gl2 = c.getContext('webgl2'); } catch(e){} if(!gl2) try { gl1 = c.getContext('webgl') || c.getContext('experimental-webgl'); } catch(e){}
  const g = gl2 || gl1, d = g && g.getExtension('WEBGL_debug_renderer_info'); return {gl2:!!gl2, gl1:!!gl1, placa:d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''}; }
function motorFalhou(forca){ if(MOTOR.pronto && !forca) return; const G = motorGL(); MOTOR.falha = {G, erros:[...(MOTOR.erros || [])]}; motorPosicionar(); if(UI.aba === 'vis' && AV.modo === '3d') renderAmbiente(); }
function motorDiag(){ const F = MOTOR.falha; if(!F) return ''; const G = F.G;
  const motivo = !G.gl2 && !G.gl1 ? 'Este navegador não conseguiu usar a placa de vídeo (WebGL desligado ou bloqueado).' : !G.gl2 ? 'A placa de vídeo ou o navegador não tem WebGL 2, que o motor 3D precisa.' : F.erros.length ? 'O motor 3D deu erro ao abrir.' : 'O motor 3D não respondeu em 20 segundos.';
  return `<div id="motorDiag" style="position:absolute;inset:0;display:grid;place-items:center;background:#f6f8fb;padding:20px;overflow:auto"><div style="max-width:620px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:16px 18px">
    <b style="color:#c8372d;font-size:15px">O Ambiente 3D não abriu</b><p style="margin:8px 0">${motivo}</p>
    <table class="kv" style="font-size:12px;margin:6px 0"><tr><td>WebGL 2</td><td>${G.gl2 ? 'sim' : '<b style="color:#c8372d">não</b>'}</td></tr><tr><td>WebGL 1</td><td>${G.gl2 || G.gl1 ? 'sim' : '<b style="color:#c8372d">não</b>'}</td></tr><tr><td>Placa de vídeo</td><td>${esc(G.placa || 'não informada')}</td></tr><tr><td>Navegador</td><td>${esc(navigator.userAgent)}</td></tr>${F.erros.map(e => `<tr><td>Erro</td><td style="color:#c8372d">${esc(e)}</td></tr>`).join('')}</table>
    <p class="muted" style="margin:8px 0;font-size:12px">O que costuma resolver: atualizar o Edge ou o Chrome; no Chrome/Edge abrir edge://settings/system (ou chrome://settings/system) e ligar "Usar aceleração de hardware"; atualizar o driver da placa de vídeo. O Editor de Paredes (2D) e o Construtor de Armários funcionam mesmo sem o 3D.</p>
    <div style="display:flex;gap:8px"><button class="btn pri" data-act="motorDeNovo">Tentar de novo</button><button class="btn" data-act="motorCopiarDiag">Copiar o diagnóstico</button><button class="btn" data-act="ambModo" data-m="2d">Ir para o Editor de Paredes</button></div></div></div>`; }
Object.assign(ACT, {
  motorDeNovo: () => { MOTOR.falha = null; motorCarregar(); renderAmbiente(); },
  motorCopiarDiag: () => { const F = MOTOR.falha; if(!F) return; const t = `WebGL2: ${F.G.gl2} | WebGL1: ${F.G.gl1} | Placa: ${F.G.placa} | ${navigator.userAgent} | Erros: ${F.erros.join(' / ') || 'nenhum'}`; navigator.clipboard?.writeText(t).then(() => toast('Diagnóstico copiado. Cole na conversa.'), () => toast(t)); },
});
// o quadro fica fora do conteúdo (para não recarregar a cada mudança) e é posto em cima do lugar do 3D
function motorPosicionar(){ const h = MOTOR.host, alvo = $('#amb3dHost'); if(!h) return; const vis = UI.aba === 'vis' && !UI.back && alvo && AV.modo === '3d' && !MOTOR.falha;
  if(!vis){ h.style.display = 'none'; return; } const r = alvo.getBoundingClientRect(); if(!r.width || !r.height){ h.style.display = 'none'; return; }
  Object.assign(h.style, {display:'block', left:r.left + 'px', top:r.top + 'px', width:r.width + 'px', height:r.height + 'px'}); }
function motorRoom(){
  const M = motor(); if(!M || !MOTOR.pronto) return; const A = amb(), dono = ambDono()?.id || 'S';
  if(MOTOR.dono !== dono){ MOTOR.dono = dono; M.carregarDesign(A.pz || {panels:[]}); setTimeout(() => M.cmd('vista', 'isoDir'), 60); }
  const P = A.paredes, vis = o => !o.oculto || AV.verOcultos, room = {...A, paredes:P.map(w => ({...w, c:wCantos(w, P)}))}; delete room.pz; delete room.cfg; delete room.ref; delete room.renders; delete room.grupos;
  for(const k of ['aberturas', 'geometrias', 'luzes', 'textos', 'imagens', 'modelos']) room[k] = (A[k] || []).filter(vis);
  room.armarios = (A.armarios || []).filter(vis).map(a => ({id:a.id, nome:a.nome, x:+a.x, y:+a.y, z:+a.z, rot:+a.rot || 0, L:+a.L, A:+a.A, P:+a.P, pecas:armPecas3D(a)}));
  const C = AV.cons; M.setRoom(room, {fill:AV.fill, persp:AV.persp, verTeto:AV.verTeto, cotas:AV.cotas, sel:AV.sel, fundo:AV.fundo, camadas:AV.camadas, autoRebaixar:AV.autoRebaixar, hotpoints:AV.hotpoints, grid:AV.grid, colisao:AV.colisao,
    luzPadrao:AV.luzPadrao, iluminacaoPadrao:AV.iluminacaoPadrao, clima:AV.clima, apres:AV.apres, corte:AV.corte, imagem:AV.imagem, modulos:AV.modulos, nav:AV.nav, multi:AV.multi,
    cons:C ? {ativo:true, pts:C.pts, prev:C.mouse && C.pts.length ? consPonta(...C.mouse).p : null} : null, inserir:AV.inserir, ferramenta:AV.ferramenta});
  // ambiente que acabou de ganhar paredes (ou trocou de projeto): enquadra na isométrica
  const n = P.length; if(n && !MOTOR.nP && !C) setTimeout(() => M.cmd('vista', 'isoDir'), 80); MOTOR.nP = n;
}
function ambAcao3D(nome, s, arg){
  const A = amb(), w = s?.t === 'parede' ? A.paredes.find(v => v.id === s.id) : null, o = s ? (s.t === 'piso' ? A.piso : (A[AMB_LISTA[s.t]] || []).find(x => x.id === s?.id)) : null;
  const mexe = f => { ambSnap(); f(); if(A.piso.auto) ambAjustarPiso(A); ambMudou(); };
  switch(nome){
    case 'arrastarArmarioInicio': {
      const a = A.armarios.find(v => v.id === s?.id);
      if(a && Number.isFinite(+arg?.x) && Number.isFinite(+arg?.y)){ ambSnap(); AV.drag3D = {id:a.id, dx:a.x - +arg.x, dy:a.y - +arg.y}; AV.sel = s; AV.multi = []; }
      break;
    }
    case 'arrastarArmario': {
      const a = A.armarios.find(v => v.id === s?.id);
      if(a && AV.drag3D?.id === a.id && Number.isFinite(+arg?.x) && Number.isFinite(+arg?.y)){
        let x = Math.round(+arg.x + AV.drag3D.dx), y = Math.round(+arg.y + AV.drag3D.dy);
        // Evita saltos para longe quando o raio do mouse cruza o plano do piso perto do horizonte.
        const P = A.paredes || [];
        if(P.length){
          const margem = 500;
          const minX = Math.min(...P.flatMap(w => [w.x1, w.x2])) - margem;
          const maxX = Math.max(...P.flatMap(w => [w.x1, w.x2])) + margem;
          const minY = Math.min(...P.flatMap(w => [w.y1, w.y2])) - margem;
          const maxY = Math.max(...P.flatMap(w => [w.y1, w.y2])) + margem;
          x = Math.max(minX, Math.min(maxX - (a.L || 0), x));
          y = Math.max(minY, Math.min(maxY - (a.P || 0), y));
        }
        a.x = x; a.y = y;
        motorRoom();
        if($('#amb2dHost')) refresh2D();
      }
      break;
    }
    case 'arrastarArmarioFim': {
      if(AV.drag3D?.id === s?.id){ AV.drag3D = null; ambMudou(); }
      break;
    }
    case 'duplo': if(s?.t === 'parede') motor()?.cmd('vistaRapida', s.id); else { AV.sel = s; motor()?.cmd('aproximar'); } break;
    case 'rebaixar': if(w) mexe(() => { w.rebaixada = true; }); break;
    case 'levantar': if(w) mexe(() => { w.rebaixada = false; }); break;
    case 'transparente': if(w) mexe(() => { w.transp = !w.transp; }); break;
    case 'vistaRapida': if(w) motor()?.cmd('vistaRapida', w.id); break;
    case 'segmentar': case 'adicionarVertice': if(w) mexe(() => ambDividir(w, wLen(w) / 2)); break;
    case 'faixas': if(w) ambFaixasDialog(w); break;
    case 'editarParedes': AV.modo = '2d'; render(); break;
    case 'construtor': if(s?.t === 'armario') armEditar(s.id); else armConstruir(s); break;
    case 'enviarArmario': { const a = A.armarios.find(x => x.id === s?.id); if(!a) break; const it = armSync(a, true); if(it){ touch(ambDono()); toast(`Peças de ${a.nome} no projeto ${ambDono().nome}.`); } else toast(a.deItem ? 'Esse armário veio de um item do projeto: as peças já estão lá.' : 'Abra um projeto primeiro.'); break; }
    case 'inverter': pbInverter(s); break;
    case 'substituir': pbSubstituir(s); break;
    case 'ocultar': AV.sel = s; AV.multi = []; pbOcultar(); break;
    case 'navFim': AV.nav = 'sel'; renderRibbonVis(); pbStatus(); motorRoom(); break;
    case 'aproximar': AV.sel = s; motor()?.cmd('aproximar'); break;
    case 'excluirSegmento': case 'excluir': ambSnap(); ambExcluirSel(); ambMudou(); break;
    case 'manterSelecionado': if(w) confirmar('Manter selecionado', 'Excluir todas as paredes, menos a selecionada?', 'Excluir as outras', () => mexe(() => { A.paredes = [w]; A.aberturas = A.aberturas.filter(a => a.parede === w.id); })); break;
    case 'excluirTudo': ACT.ambExcluirTudo(); break;
    case 'ajustarPiso': ACT.ambPiso(); break;
    case 'grid': ACT.ambGridDialog(); break;
    case 'regiao': AV.inserir = 'geo:regiao'; renderAmbiente(); toast('Clique no piso onde fica a região.'); break;
    case 'material': AV.sel = s; renderAmbiente(); break;
    case 'centralizar': if(o && s.t === 'abertura'){ const pw = A.paredes.find(v => v.id === o.parede); if(pw) mexe(() => { o.pos = Math.round((wLen(pw) - o.larg) / 2); }); } break;
    case 'centralizarX': case 'centralizarY': if(o && 'x' in o){ const b = ambBBox(A); if(!b) break; mexe(() => { if(nome === 'centralizarX') o.x = Math.round((b.x0 + b.x1) / 2 - (o.tipo === 'circ' || o.tipo === 'poli' || !o.w ? 0 : o.w / 2)); else o.y = Math.round((b.y0 + b.y1) / 2 - (o.tipo === 'circ' || o.tipo === 'poli' || !o.d ? 0 : o.d / 2)); }); } break;
    case 'duplicar': if(s?.t === 'armario'){ AV.sel = s; AV.multi = []; pbDuplicar(); break; } if(o && s.t !== 'piso'){ mexe(() => { const c = {...JSON.parse(JSON.stringify(o)), id:uid()}; if('x' in c){ c.x += 300; if(c.pts) c.pts = c.pts.map(p => [p[0] + 300, p[1]]); } else if('pos' in c) c.pos += c.larg + 100; A[AMB_LISTA[s.t]].push(c); AV.sel = {t:s.t, id:c.id}; }); } break;
    case 'vistaAtual': if(MOTOR.salvarVista){ const n = MOTOR.salvarVista; MOTOR.salvarVista = null; ambSnap(); A.vistas.push({id:uid(), nome:n, pos:arg.pos, alvo:arg.alvo, persp:arg.persp}); ambMudou(); toast(`Vista "${n}" salva.`); } break;
    case 'animacaoFim': AV.animando = false; renderRibbonVis(); break;
    case 'renderFim': AV.renderOn = false; renderRibbonVis(); break;
  }
}
function ambExcluirSel(){ const A = amb(), L = (AV.multi?.length > 1 ? AV.multi : [AV.sel]).filter(s => s && s.t !== 'piso');
  for(const s of L){ const k = AMB_LISTA[s.t]; if(!k) continue; A[k] = A[k].filter(o => o.id !== s.id); if(s.t === 'parede') A.aberturas = A.aberturas.filter(a => a.parede !== s.id); }
  A.grupos = (A.grupos || []).map(g => g.filter(m => !L.some(s => s.t === m.t && s.id === m.id))).filter(g => g.length > 1); AV.sel = null; AV.multi = []; }
// peças desenhadas no 3D (módulos) entram no projeto como um item com as peças
function ambEnviarPecas(pecas){ const pr = ambDono(); if(!pr){ toast('Abra um projeto primeiro.'); return; } if(!pecas?.length){ toast('Não há peças para enviar.'); return; }
  const grupos = new Map(); for(const p of pecas){ const k = [p.nome, Math.round(p.L), Math.round(p.W), +p.esp, p.mat].join('|'); const g = grupos.get(k); if(g) g.qty++; else grupos.set(k, {...p, qty:1}); }
  let it = pr.itens.find(i => i.origem3d); if(!it){ it = newItem({nome:'Módulos do ambiente 3D', origem3d:true}); pr.itens.push(it); }
  it.filhos = it.filhos.filter(c => c.tipo !== 'peca'); for(const g of grupos.values()) it.filhos.push(newPart({desc:g.nome, qty:g.qty, L:Math.round(g.L), W:Math.round(g.W), esp:+g.esp, mat:g.mat ? `${g.mat}` : 'MDF Branco'}));
  touch(pr); toast(`${pecas.length} peça(s) enviadas para "${it.nome}" no projeto ${pr.nome}. Veja na aba Principal.`); }
function ambFaixasDialog(w){ const F = (w.faixas || []).slice(); const linha = (f, i) => `<tr><td><input type="number" data-fx="${i}" data-k="ate" value="${f.ate}" style="width:80px"></td><td><select data-fx="${i}" data-k="mat">${AMB_ACAB_GRUPO.parede.map(k => `<option value="${k}" ${f.mat === k ? 'selected' : ''}>${AMB_ACAB[k]}</option>`).join('')}</select></td><td><input type="color" data-fx="${i}" data-k="cor" value="${f.cor || '#e9f1f5'}"></td></tr>`;
  MOTOR.faixas = {w:w.id, F}; modal('Editar faixas da parede', `<p class="muted" style="margin:0 0 8px">Faixas horizontais a partir do piso, cada uma com seu acabamento (ex.: azulejo até 1200). Acima da última faixa vale o acabamento da parede.</p><table class="kv"><tr><th>Até a altura (mm)</th><th>Acabamento</th><th>Cor</th></tr>${F.map(linha).join('')}<tr><td colspan="3"><button class="btn" data-act="ambFaixaNova">+ Faixa</button></td></tr></table>`,
    `<button class="btn pri" data-act="ambFaixasOk">Aplicar</button><button class="btn" data-act="ambFaixasLimpar">Tirar faixas</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'460px'}); }

/* ---------- painel de propriedades ---------- */
function ambPainel(){
  const A = amb(), cf = A.cfg, o = ambSelObj(), s = AV.sel;
  const campo = (attr, k, label, v, o2 = {}) => `<label style="display:contents"><span>${label}</span>${o2.sel ? `<select data-${attr}="${k}">${o2.sel.map(([a, b]) => `<option value="${a}" ${String(a) === String(v) ? 'selected' : ''}>${b}</option>`).join('')}</select>` : o2.chk ? `<input type="checkbox" data-${attr}="${k}" ${v ? 'checked' : ''}>` : o2.cor ? `<input type="color" data-${attr}="${k}" value="${v || '#cccccc'}">` : o2.txt ? `<input type="text" data-${attr}="${k}" value="${esc(v ?? '')}">` : `<input type="number" step="any" data-${attr}="${k}" value="${v ?? ''}" ${o2.ro ? 'readonly tabindex="-1" style="background:#f3f5f8"' : ''}>`}</label>`;
  const ORI = [['interna', 'Face interna'], ['centro', 'Centro'], ['externa', 'Face externa']], TIP = Object.entries(AMB_TIPOS).map(([k, v]) => [k, v[0]]);
  const ACAB = grupo => [['', 'Padrão'], ...AMB_ACAB_GRUPO[grupo].map(k => [k, AMB_ACAB[k]])];
  const box = (tit, corpo, rod = '') => `<div class="pb-h">Ferramentas · ${tit}</div><div class="pb-ferr">${rod || '<span class="muted">Sem ferramentas para este item.</span>'}</div><div class="pb-h">Propriedades</div><div class="pb-kv">${corpo}</div>`;
  const matRod = `<button class="btn" data-act="ambCopiarMat" title="Copiar material (4.1.4)">Copiar material</button>${AV.copiaMat ? '<button class="btn" data-act="ambColarMat">Colar material</button>' : ''}`;
  let h = '';
  if(AV.multi?.length > 1 && !AV.cons){ const L = AV.multi, g = (A.grupos || []).some(g => g.length === L.length && g.every(m => L.some(x => x.t === m.t && x.id === m.id)));
    return box(`${L.length} itens selecionados`, L.map(m => `<span>${{armario:'Armário', parede:'Parede', abertura:'Abertura', geo:'Geometria', luz:'Luz', texto:'Texto', imagem:'Imagem', modelo:'Arquivo 3D', teto:'Teto'}[m.t] || m.t}</span><span>${esc(ambObjDe(m)?.nome || '')}</span>`).join(''),
      `<button class="btn" data-act="pbAgrupar">${g ? 'Desagrupar (U)' : 'Agrupar (U)'}</button><button class="btn" data-act="pbCopiar">Copiar (Ctrl+C)</button><button class="btn" data-act="pbOcultar">Ocultar (O)</button><button class="btn danger" data-act="ambExcluir">Excluir (Delete)</button>`) + `<div class="pb-nota">Setas movem todos pelo Passo. Ctrl + clique tira ou põe itens na seleção.</div>`; }
  if(s?.t === 'armario' && o && !AV.cons){ const ch = armChapas().map(c => [c.material + '|' + c.esp, `${c.material} ${c.esp}`]), op = v => ch.some(c => c[0] === v) ? ch : [[v, v.replace('|', ' ')], ...ch], it = ambDono()?.itens.find(i => i.arm3d === o.id || i.id === o.deItem), Lp = armLista(o);
    return box('Armário', campo('aa', 'nome', 'Nome', o.nome, {txt:1}) + campo('aa', 'L', 'Largura', o.L) + campo('aa', 'A', 'Altura', o.A) + campo('aa', 'P', 'Profundidade', o.P) + campo('aa', 'z', 'Altura do chão', o.z) + campo('aa', 'x', 'X', Math.round(o.x)) + campo('aa', 'y', 'Y', Math.round(o.y)) + campo('aa', 'rot', 'Rotação °', o.rot || 0)
      + campo('aa', 'rodape', 'Rodapé', o.rodape) + campo('aa', 'chapa', 'Chapa do corpo', o.chapa, {sel:op(o.chapa)}) + campo('aa', 'chapaFrente', 'Chapa das frentes', o.chapaFrente, {sel:op(o.chapaFrente)}) + campo('aa', 'borda', 'Borda', o.borda || '', {sel:[['', 'Sem borda'], ...(S.cad?.bordas || []).map(b => [b.desc, b.desc])]})
      + campo('aa', 'pc', 'Peças', o.deItem ? 'do item' : Lp.pecas.reduce((t, p) => t + p.qty, 0), {ro:1}) + `<span>Item do projeto</span><span style="font-size:12px">${it ? esc(it.nome) : '<span class="muted">nenhum (abra um projeto)</span>'}</span>`,
      `<button class="btn pri" data-act="pbArmEditar">Construtor de Armários (A)</button><button class="btn" data-act="pbArmSalvarBib">Salvar na biblioteca</button><button class="btn" data-act="pbArmEnviar">Enviar peças ao projeto</button><button class="btn" data-act="pbInverter">Inverter portas (I)</button><button class="btn" data-act="pbSubstituir">Substituir estrutura (S)</button><button class="btn" data-act="pbDuplicar">Duplicar (Ctrl+D)</button><button class="btn" data-act="pbOcultar">${o.oculto ? 'Mostrar' : 'Ocultar (O)'}</button><button class="btn danger" data-act="ambExcluir">Excluir (Delete)</button>`)
      + `<div class="pb-nota">${o.parede ? 'Encostado na parede: as setas ← → movem ao longo dela e ↑ ↓ mudam a altura.' : 'Solto no piso: as setas movem em X e Y.'} As peças ficam no item “${esc(o.nome)}” do projeto e vão para o Plano de Corte.</div>`; }
  if(AV.cons){ const q = AV.cons.mouse && AV.cons.pts.length ? consPonta(...AV.cons.mouse) : null; const ant = A.paredes.length && AV.cons.pts.length > 1 ? wAng(A.paredes[A.paredes.length - 1]) : null;
    h += box('Construir paredes', campo('ac', 'comp', 'Comprimento', q ? Math.round(q.L) : '') + campo('ac', 'angAbs', 'Ângulo absoluto °', AV.cons.ang ?? (q ? +(((q.ang % 360) + 360) % 360).toFixed(1) : 0)) + campo('ac', 'angRel', 'Ângulo relativo °', ant == null || !q ? '' : +(((q.ang - ant + 540) % 360) - 180).toFixed(1))
      + campo('acf', 'esp', 'Espessura', cf.esp) + campo('acf', 'alt', 'Pé-direito', cf.alt) + campo('acf', 'orient', 'Orientação', cf.orient, {sel:ORI}) + campo('acf', 'tipo', 'Tipo', cf.tipo, {sel:TIP}) + campo('acf', 'incL', 'Incr. linear', cf.incL) + campo('acf', 'incA', 'Incr. angular °', cf.incA),
      `<button class="btn pri" data-act="ambConsFim">Finalizar</button>`)
      + `<div class="pb-nota">${AV.cons.pts.length ? 'Mova o mouse (na planta ou no piso do 3D) para dar a direção, digite o comprimento e tecle Enter. Ou clique no ponto final. Tab vai para o ângulo relativo. Clique no ponto inicial para fechar; botão direito ou Esc termina. Construa no sentido horário.' : 'Clique na planta 2D ou no piso do 3D onde a primeira parede começa.'}</div>`;
  } else if(AV.ref){ h += box('Referências', campo('ac', 'refDist', 'Distância', AV.ref.mouse ? Math.round(refPonto(AV.ref.mouse).d) : ''), `<button class="btn" data-act="ambRefSair">Cancelar</button>`) + `<div class="pb-nota">${AV.ref.p ? 'Mova o mouse para a direção da nova parede, digite a distância e tecle Enter. Depois construa a parede normalmente.' : 'Clique no ponto de uma parede que serve de referência.'}</div>`; }
  else if(s?.t === 'parede' && o){ const c = wCantos(o, A.paredes), fi = Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]), fe = Math.hypot(c[2][0] - c[3][0], c[2][1] - c[3][1]); const ant = A.paredes.find(v => v !== o && perto(v.x2, v.y2, o.x1, o.y1));
    const f = +o.flecha || 0, L = wLen(o), R = Math.abs(f) > 1 ? (L * L / 4 + f * f) / (2 * Math.abs(f)) : 0, angArco = R ? 2 * Math.asin(Math.min(1, L / 2 / R)) * 180 / Math.PI * (Math.abs(f) > L / 2 ? -1 : 1) + (Math.abs(f) > L / 2 ? 360 : 0) : 0;
    h += box('Parede', campo('ap', 'comp', 'Comprimento', Math.round(L * 10) / 10) + campo('ap', 'ang', 'Ângulo absoluto °', +(((wAng(o) % 360) + 360) % 360).toFixed(1)) + campo('ap', 'angRel', 'Ângulo relativo °', ant ? +(((wAng(o) - wAng(ant) + 540) % 360) - 180).toFixed(1) : '', {ro:!ant}) + campo('ap', 'esp', 'Espessura', o.esp) + campo('ap', 'alt', 'Pé-direito inicial', o.alt) + campo('ap', 'altFim', 'Pé-direito final', o.altFim ?? o.alt)
      + campo('ap', 'flecha', 'Flecha (curva)', f) + campo('ap', 'angArco', 'Ângulo do arco °', +angArco.toFixed(1), {ro:1}) + campo('ap', 'orient', 'Orientação', o.orient, {sel:ORI}) + campo('ap', 'tipo', 'Tipo', o.tipo, {sel:TIP}) + campo('ap', 'mat', 'Acabamento', o.mat || '', {sel:ACAB('parede')}) + campo('ap', 'cor', 'Cor', o.cor || '#ece8df', {cor:1})
      + campo('ap', 'transp', 'Transparente', o.transp, {chk:1}) + campo('ap', 'rebaixada', 'Rebaixada', o.rebaixada, {chk:1}) + campo('ap', 'fi', 'Cota interna', Math.round(fi * 10) / 10, {ro:1}) + campo('ap', 'fe', 'Cota externa', Math.round(fe * 10) / 10, {ro:1}),
      `<button class="btn" data-act="ambVistaRapida">Vista rápida</button><button class="btn" data-act="ambSegmentar">Segmentar</button><button class="btn" data-act="armConstruir">Construir armário nesta parede (A)</button><button class="btn" data-act="ambAcaoSel" data-a="rebaixar">${o.rebaixada ? 'Levantar' : 'Rebaixar'}</button><button class="btn" data-act="ambAcaoSel" data-a="transparente">Transparente</button><button class="btn" data-act="amb304050">30-40-50</button><button class="btn" data-act="ambFaixas">Faixas…</button>${matRod}<button class="btn danger" data-act="ambExcluir">Excluir parede</button>`);
  } else if(s?.t === 'abertura' && o){ const w = A.paredes.find(v => v.id === o.parede), L = w ? wLen(w) : 0, hp = w ? Math.min(+w.alt, +(w.altFim ?? w.alt)) : 0;
    h += box(AB_TIPOS[o.tipo]?.[0] || 'Abertura', campo('ab', 'tipo', 'Tipo', o.tipo, {sel:Object.entries(AB_TIPOS).map(([k, v]) => [k, v[0]])}) + campo('ab', 'larg', 'Largura', o.larg) + campo('ab', 'alt', 'Altura', o.alt) + campo('ab', 'afast', 'Afastamento (piso)', o.afast)
      + campo('ab', 'cAnt', 'Cota anterior', Math.round(o.pos)) + campo('ab', 'cPost', 'Cota posterior', Math.round(L - o.pos - o.larg)) + campo('ab', 'cInf', 'Cota inferior', Math.round(o.afast)) + campo('ab', 'cSup', 'Cota superior', Math.round(hp - o.afast - o.alt))
      + campo('ab', 'mat', 'Material', o.mat || '', {sel:ACAB('abertura')}) + campo('ab', 'cor', 'Cor', o.cor || '#b98a5a', {cor:1}),
      `<button class="btn" data-act="ambCentralizar">Centralizar</button><button class="btn" data-act="pbInverter">Inverter lado (I)</button><button class="btn" data-act="pbSubstituir">Substituir tipo (S)</button><button class="btn" data-act="pbOcultar">Ocultar (O)</button><button class="btn danger" data-act="ambExcluir">Excluir</button>`);
  } else if(s?.t === 'geo' && o){ const redonda = o.tipo === 'circ' || o.tipo === 'poli';
    h += box('Geometria · ' + (GEO_TIPOS[o.tipo] || ''), campo('ag', 'nome', 'Nome', o.nome || '', {txt:1}) + campo('ag', 'x', redonda ? 'Centro X' : 'X', o.x) + campo('ag', 'y', redonda ? 'Centro Y' : 'Y', o.y) + campo('ag', 'w', redonda ? 'Diâmetro' : 'Largura', o.w) + (redonda ? '' : campo('ag', 'd', 'Profundidade', o.d)) + campo('ag', 'alt', 'Altura', o.alt) + campo('ag', 'z', 'Afastamento (piso)', o.z)
      + (o.tipo === 'poli' ? campo('ag', 'lados', 'Lados', o.lados || 6) : '') + campo('ag', 'rot', 'Rotação °', o.rot || 0) + campo('ag', 'perfurar', 'Perfurar paredes', o.perfurar, {chk:1}) + campo('ag', 'mat', 'Material', o.mat || '', {sel:ACAB('geo')}) + campo('ag', 'cor', 'Cor', o.cor || '#d9b380', {cor:1})
      + campo('ag', 'area', 'Área m²', +(o.pts?.length > 2 ? Math.abs(areaPol(o.pts)) / 1e6 : redonda ? Math.PI * (o.w / 2) ** 2 / 1e6 : o.w * o.d / 1e6).toFixed(3), {ro:1}),
      `<button class="btn" data-act="ambGeoAcao" data-a="centralizarX">Centralizar X</button><button class="btn" data-act="ambGeoAcao" data-a="centralizarY">Centralizar Y</button><button class="btn" data-act="ambGeoAcao" data-a="duplicar">Duplicar</button>${matRod}<button class="btn danger" data-act="ambExcluir">Excluir</button>`);
  } else if(s?.t === 'luz' && o){ h += box('Luz · ' + ({ponto:'Ambiente (ponto)', spot:'Spot', linear:'Linear'}[o.tipo] || ''), campo('al', 'tipo', 'Tipo', o.tipo, {sel:[['ponto', 'Ambiente (ponto)'], ['spot', 'Spot'], ['linear', 'Linear']]}) + campo('al', 'cor', 'Cor', o.cor, {cor:1}) + campo('al', 'int', 'Intensidade (0 a 2)', o.int) + campo('al', 'x', 'X', o.x) + campo('al', 'y', 'Y', o.y) + campo('al', 'z', 'Z (altura)', o.z)
      + (o.tipo === 'spot' ? campo('al', 'inc', 'Inclinação do foco °', o.inc ?? 90) + campo('al', 'abertura', 'Abertura do foco °', o.abertura ?? 60) + campo('al', 'rot', 'Direção °', o.rot || 0) : '') + (o.tipo === 'linear' ? campo('al', 'comp', 'Comprimento', o.comp || 1000) + campo('al', 'larg', 'Espessura', o.larg || 40) + campo('al', 'rot', 'Rotação °', o.rot || 0) : '') + campo('al', 'sombra', 'Sombra', o.sombra, {chk:1}),
      `<button class="btn" data-act="ambGeoAcao" data-a="duplicar">Duplicar</button><button class="btn danger" data-act="ambExcluir">Excluir</button>`) + `<div class="pb-nota">As luzes aparecem no modo Apresentação e no Renderizar.</div>`; }
  else if(s?.t === 'texto' && o){ h += box('Texto 3D', campo('ax', 'txt', 'Texto', o.txt, {txt:1}) + campo('ax', 'tam', 'Altura da letra', o.tam) + campo('ax', 'prof', 'Profundidade', o.prof) + campo('ax', 'x', 'X', o.x) + campo('ax', 'y', 'Y', o.y) + campo('ax', 'z', 'Z (altura)', o.z) + campo('ax', 'rot', 'Rotação °', o.rot) + campo('ax', 'cor', 'Cor', o.cor, {cor:1}), `<button class="btn danger" data-act="ambExcluir">Excluir</button>`); }
  else if(s?.t === 'imagem' && o){ h += box('Imagem', campo('ai', 'larg', 'Largura', o.larg) + campo('ai', 'alt', 'Altura', o.alt) + campo('ai', 'x', 'X', o.x) + campo('ai', 'y', 'Y', o.y) + campo('ai', 'z', 'Z (centro)', o.z) + campo('ai', 'rot', 'Rotação °', o.rot), `<button class="btn danger" data-act="ambExcluir">Excluir</button>`); }
  else if(s?.t === 'modelo' && o){ h += box('Arquivo 3D · ' + esc(o.nome), campo('am', 'x', 'X', o.x) + campo('am', 'y', 'Y', o.y) + campo('am', 'z', 'Z', o.z) + campo('am', 'rot', 'Rotação °', o.rot) + campo('am', 'esc', 'Escala', o.esc), `<button class="btn danger" data-act="ambExcluir">Excluir</button>`) + `<div class="pb-nota">STL e OBJ são lidos em mm; GLB/GLTF em metros. Ajuste a escala se o tamanho vier errado (polegada = 25,4).</div>`; }
  else if(s?.t === 'teto' && o){ const ar = Math.abs(areaPol(o.pts)) / 1e6, per = o.pts.reduce((a, p, i) => a + Math.hypot(...[0, 1].map(j => o.pts[(i + 1) % o.pts.length][j] - p[j])), 0);
    h += box('Teto', campo('at', 'afast', 'Afastamento do piso', o.afast) + campo('at', 'esp', 'Espessura', o.esp) + campo('at', 'cor', 'Cor', o.cor || '#f4f4f2', {cor:1}) + campo('at', 'area', 'Área m²', +ar.toFixed(3), {ro:1}) + campo('at', 'per', 'Perímetro', Math.round(per), {ro:1}),
      `<button class="btn" data-act="ambTetoPe">Usar pé-direito das paredes</button><button class="btn" data-act="ambInserir" data-t="geo:rebaixo">Rebaixo de gesso</button><button class="btn danger" data-act="ambExcluir">Excluir teto</button>`);
  } else if(s?.t === 'piso'){ const p = A.piso;
    h += box('Piso', campo('api', 'x', 'X', p.x) + campo('api', 'y', 'Y', p.y) + campo('api', 'w', 'Largura', p.w) + campo('api', 'h', 'Profundidade', p.h) + campo('api', 'esp', 'Espessura', p.esp) + campo('api', 'mat', 'Acabamento', p.mat || '', {sel:ACAB('piso')}) + campo('api', 'cor', 'Cor', p.cor || '#dcd8d0', {cor:1}) + campo('api', 'area', 'Área m²', +(p.w * p.h / 1e6).toFixed(3), {ro:1}) + campo('api', 'auto', 'Ajustar sozinho', p.auto, {chk:1}),
      `<button class="btn" data-act="ambPiso">Ajustar limites do piso</button><button class="btn" data-act="ambGridDialog">Grid do piso…</button>${matRod}`);
  } else {
    h += box('Ambiente', campo('acf', 'esp', 'Espessura padrão', cf.esp) + campo('acf', 'alt', 'Pé-direito padrão', cf.alt) + campo('acf', 'orient', 'Orientação', cf.orient, {sel:ORI}) + campo('acf', 'tipo', 'Tipo de parede', cf.tipo, {sel:TIP}) + campo('acf', 'incL', 'Incr. linear', cf.incL) + campo('acf', 'incA', 'Incr. angular °', cf.incA), `<button class="btn" data-act="ambConstruir">Construir paredes</button><button class="btn" data-act="ambRetangular">Ambiente retangular</button><button class="btn" data-act="armConstruir">Construir armário</button><button class="btn" data-act="ambTeto">Construir teto</button><button class="btn" data-act="ambPiso">Ajustar limites do piso</button><button class="btn danger" data-act="ambExcluirTudo">Excluir tudo</button>`)
      + `<div class="pb-nota">${A.paredes.length} parede(s), ${A.armarios.length} armário(s) · ${A.aberturas.length} abertura(s) · ${A.geometrias.length} geometria(s) · ${A.luzes.length} luz(es) · piso ${fmt(A.piso.w)} × ${fmt(A.piso.h)} mm.<br><br>Clique num item na planta ou no 3D para ver as propriedades aqui. Botão direito no 3D abre as opções do item. Botão do meio move a vista, botão direito arrastando gira, roda dá zoom. F1 mostra os atalhos.</div>`;
  }
  return h;
}
// Localizar rápido (4.10): lista de tudo que há no ambiente
function ambLocalizar(){ const A = amb(), q = (AV.busca || '').toLowerCase(); const it = [];
  (A.armarios || []).forEach(a => it.push(['armario', a.id, `${a.nome} · ${fmt(a.L)} × ${fmt(a.A)}${a.oculto ? ' (oculto)' : ''}`]));
  A.paredes.forEach((w, i) => it.push(['parede', w.id, `Parede ${i + 1} · ${fmt(wLen(w))} mm`])); A.aberturas.forEach(a => it.push(['abertura', a.id, `${AB_TIPOS[a.tipo]?.[0] || 'Abertura'} ${a.larg}×${a.alt}`]));
  A.geometrias.forEach(g => it.push(['geo', g.id, `${GEO_TIPOS[g.tipo]}${g.nome ? ' · ' + g.nome : ''}`])); A.luzes.forEach(l => it.push(['luz', l.id, `Luz ${l.tipo}`])); A.textos.forEach(t => it.push(['texto', t.id, `Texto: ${t.txt}`])); A.imagens.forEach(m => it.push(['imagem', m.id, 'Imagem'])); A.modelos.forEach(m => it.push(['modelo', m.id, m.nome]));
  const f = it.filter(x => !q || x[2].toLowerCase().includes(q));
  return `<div class="pad" style="border-top:1px solid var(--line)"><b style="color:var(--title)">Localizar</b><input type="search" id="ambBusca" placeholder="Procurar item…" value="${esc(AV.busca || '')}" style="width:100%;margin:6px 0"><div style="max-height:220px;overflow:auto">${f.map(([t, id, n]) => `<div class="rowlink" data-act="ambIr" data-t="${t}" data-id="${id}" style="padding:3px 4px;cursor:pointer;border-bottom:1px dotted var(--line2)">${esc(n)}</div>`).join('') || '<span class="muted">Nada encontrado.</span>'}</div></div>`; }

/* ---------- tela (desenhada no arquivo da Tela Principal) ---------- */
const RIC = {'a-2d':'<rect x="3" y="5" width="26" height="22" fill="#fff" stroke="#4a5a6c"/><path d="M7 9h18v14H7z" fill="none" stroke="#c9bfae" stroke-width="3"/>', 'a-3d':'<path d="M4 10l12-6 12 6v13l-12 6-12-6z" fill="#cfe2f6" stroke="#2f6db5"/><path d="M4 10l12 6 12-6M16 16v13" fill="none" stroke="#2f6db5"/>', 'a-split':'<rect x="3" y="5" width="12" height="22" fill="#fff" stroke="#4a5a6c"/><path d="M18 10l6-3 6 3v10l-6 3-6-3z" fill="#cfe2f6" stroke="#2f6db5"/>',
  'a-wall':'<path d="M4 26V8h24v18" fill="none" stroke="#7a705f" stroke-width="5"/><circle cx="26" cy="24" r="6" fill="#2e9d4b"/><path d="M26 21v6M23 24h6" stroke="#fff" stroke-width="2"/>', 'a-ret':'<rect x="5" y="7" width="22" height="18" fill="#f3efe7" stroke="#7a705f" stroke-width="4"/>', 'a-del':'<path d="M4 24V10h22v14" fill="none" stroke="#7a705f" stroke-width="5"/><circle cx="24" cy="23" r="6" fill="#c8372d"/><path d="M21 20l6 6M27 20l-6 6" stroke="#fff" stroke-width="2"/>',
  'a-teto':'<path d="M3 12l13-7 13 7z" fill="#f4f4f2" stroke="#4a5a6c"/><path d="M6 13v14M26 13v14" stroke="#7a705f" stroke-width="3"/>', 'a-piso':'<path d="M3 22l8-10h18l-8 10z" fill="#d9cfbf" stroke="#7a705f"/><path d="M2 26h28" stroke="#2f6db5" stroke-width="2"/>', 'a-cam':'<rect x="4" y="10" width="18" height="14" rx="2" fill="#4a5a6c"/><path d="M22 14l7-4v14l-7-4z" fill="#4a5a6c"/><circle cx="13" cy="17" r="4" fill="#cfe2f6"/>',
  'a-cota':'<path d="M4 12v10M28 12v10M4 17h24" stroke="#2c3a48" stroke-width="1.6"/><path d="M4 17l4-3v6zM28 17l-4-3v6z" fill="#2c3a48"/>', 'a-fit':'<path d="M4 11V4h7M21 4h7v7M28 21v7h-7M11 28H4v-7" fill="none" stroke="#2f6db5" stroke-width="3"/>',
  'a-sel':'<path d="M8 4l16 12-7 1 4 9-3 1-4-9-6 5z" fill="#fff" stroke="#2c3a48" stroke-width="1.5"/>', 'a-vert':'<path d="M3 24L16 8l13 16" fill="none" stroke="#7a705f" stroke-width="3"/><rect x="12" y="4" width="8" height="8" fill="#2f6db5"/>', 'a-rvert':'<path d="M3 24L16 8l13 16" fill="none" stroke="#7a705f" stroke-width="3"/><circle cx="16" cy="8" r="5" fill="#c8372d"/>',
  'a-canto':'<path d="M6 28V6h22" fill="none" stroke="#7a705f" stroke-width="5"/><circle cx="6" cy="6" r="4" fill="#2e9d4b"/>', 'a-t':'<path d="M4 8h24M16 8v20" fill="none" stroke="#7a705f" stroke-width="5"/><circle cx="16" cy="8" r="4" fill="#2e9d4b"/>', 'a-col':'<rect x="11" y="4" width="10" height="24" fill="#c9c1b3" stroke="#4a5a6c"/>', 'a-ref':'<path d="M4 26V6M4 16h14" stroke="#7a705f" stroke-width="4"/><path d="M18 16h10" stroke="#2f6db5" stroke-width="2" stroke-dasharray="3 2"/><text x="20" y="12" font-size="10" fill="#2f6db5">R</text>',
  'a-345':'<path d="M4 26h20L4 8z" fill="#f3efe7" stroke="#4a5a6c"/><text x="6" y="22" font-size="8" fill="#c8372d">3-4-5</text>', 'a-dxf':'<rect x="4" y="4" width="22" height="24" fill="#fff" stroke="#4a5a6c"/><path d="M8 20l6-8 4 5 5-7" fill="none" stroke="#7d93ad" stroke-width="2"/>', 'a-img':'<rect x="3" y="6" width="26" height="20" fill="#cfe2f6" stroke="#4a5a6c"/><path d="M5 24l8-9 6 6 4-4 6 7z" fill="#7a9c6b"/><circle cx="22" cy="11" r="3" fill="#f2c53d"/>',
  'a-porta':'<rect x="9" y="3" width="14" height="26" fill="#b98a5a" stroke="#6b4d2e"/><circle cx="20" cy="17" r="1.5" fill="#fff"/>', 'a-jan':'<rect x="4" y="7" width="24" height="18" fill="#cfe2f6" stroke="#6b4d2e" stroke-width="2"/><path d="M16 7v18" stroke="#6b4d2e" stroke-width="2"/>', 'a-vao':'<path d="M4 28V4h24v24" fill="none" stroke="#7a705f" stroke-width="4"/><rect x="10" y="10" width="12" height="18" fill="#fff" stroke="#c8372d" stroke-dasharray="3 2"/>', 'a-correr':'<rect x="3" y="5" width="15" height="22" fill="#cfe2f6" stroke="#8b939b"/><rect x="14" y="5" width="15" height="22" fill="#e1eef9" stroke="#8b939b"/>',
  'a-geo':'<path d="M6 22l10-6 10 6-10 6z" fill="#d9b380" stroke="#6b4d2e"/><path d="M6 22V12l10-6 10 6v10M16 16V6" fill="none" stroke="#6b4d2e"/>', 'a-circ':'<ellipse cx="16" cy="8" rx="10" ry="4" fill="#d9b380" stroke="#6b4d2e"/><path d="M6 8v16a10 4 0 0 0 20 0V8" fill="#e8cba0" stroke="#6b4d2e"/>', 'a-poli':'<path d="M16 3l11 7v12l-11 7-11-7V10z" fill="#d9b380" stroke="#6b4d2e"/>',
  'a-luz':'<circle cx="16" cy="13" r="8" fill="#f2c53d" stroke="#7a5c00"/><rect x="12" y="21" width="8" height="6" fill="#8b939b"/>', 'a-spot':'<path d="M10 4h12l-3 8h-6z" fill="#8b939b"/><path d="M13 12L6 28h20l-7-16z" fill="#f2c53d" opacity=".6"/>', 'a-linear':'<rect x="3" y="12" width="26" height="6" rx="3" fill="#f2c53d" stroke="#7a5c00"/>',
  'a-render':'<rect x="3" y="6" width="26" height="20" rx="2" fill="#2c3a48"/><circle cx="16" cy="16" r="6" fill="#f2c53d"/><path d="M16 6v4M16 22v4M6 16h4M22 16h4" stroke="#f2c53d" stroke-width="2"/>', 'a-sol':'<circle cx="16" cy="16" r="6" fill="#f2c53d"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3" stroke="#e0a800" stroke-width="2"/>',
  'a-girar':'<path d="M26 16a10 10 0 1 1-4-8" fill="none" stroke="#2f6db5" stroke-width="3"/><path d="M24 2l-2 7 7 0z" fill="#2f6db5"/>', 'a-andar':'<circle cx="16" cy="5" r="3" fill="#2c3a48"/><path d="M16 9l-1 9-5 9M15 18l5 4 2 6M12 12l-5 4M17 11l6 3" stroke="#2c3a48" stroke-width="2.5" fill="none"/>', 'a-video':'<rect x="3" y="8" width="18" height="16" rx="2" fill="#c8372d"/><path d="M21 13l8-4v14l-8-4z" fill="#c8372d"/>',
  'a-medir':'<rect x="2" y="12" width="28" height="9" fill="#f2c53d" stroke="#7a5c00"/><path d="M6 12v4M10 12v3M14 12v4M18 12v3M22 12v4M26 12v3" stroke="#7a5c00"/>', 'a-texto':'<text x="5" y="25" font-size="22" font-weight="bold" fill="#2c3a48">A</text><path d="M20 10h8M24 10v16" stroke="#2f6db5" stroke-width="2.5"/>', 'a-imp':'<path d="M16 3v16M10 13l6 6 6-6" stroke="#2f6db5" stroke-width="3" fill="none"/><path d="M4 22v6h24v-6" stroke="#4a5a6c" stroke-width="2.5" fill="none"/>', 'a-exp':'<path d="M16 19V3M10 9l6-6 6 6" stroke="#2e9d4b" stroke-width="3" fill="none"/><path d="M4 22v6h24v-6" stroke="#4a5a6c" stroke-width="2.5" fill="none"/>',
  'a-esp':'<path d="M16 3v26" stroke="#c8372d" stroke-dasharray="3 2" stroke-width="2"/><path d="M13 8L4 16l9 8z" fill="#7a705f"/><path d="M19 8l9 8-9 8z" fill="none" stroke="#7a705f" stroke-width="2"/>', 'a-cam2':'<path d="M3 16h26M16 3v26" stroke="#8a96a3" stroke-width="1.5"/><rect x="6" y="6" width="9" height="9" fill="#2f6db5"/><rect x="17" y="17" width="9" height="9" fill="#2e9d4b"/>', 'a-lupa':'<circle cx="13" cy="13" r="8" fill="#e3eefa" stroke="#2f6db5" stroke-width="3"/><path d="M19 19l9 9" stroke="#2f6db5" stroke-width="4"/>',
  'a-tela':'<path d="M4 11V4h7M21 4h7v7M28 21v7h-7M11 28H4v-7" fill="none" stroke="#2c3a48" stroke-width="3"/><rect x="9" y="9" width="14" height="14" fill="#cfe2f6"/>', 'a-mod':'<rect x="4" y="6" width="24" height="22" fill="#e8cba0" stroke="#6b4d2e"/><path d="M16 6v22M4 17h24" stroke="#6b4d2e"/>', 'a-voltar':'<path d="M12 8L4 16l8 8" fill="none" stroke="#2f6db5" stroke-width="3.5"/><path d="M4 16h22" stroke="#2f6db5" stroke-width="3.5"/>', 'a-avancar':'<path d="M20 8l8 8-8 8" fill="none" stroke="#2f6db5" stroke-width="3.5"/><path d="M28 16H6" stroke="#2f6db5" stroke-width="3.5"/>'};
const RA = (act, label, ic, o = {}) => `<button class="rbtn ${o.on ? 'on' : ''}" data-act="${act}" ${o.d ? Object.entries(o.d).map(([k, v]) => `data-${k}="${v}"`).join(' ') : ''} ${o.dis ? 'disabled' : ''} title="${esc(o.tip || label.replace(/<br>/g, ' '))}"><svg viewBox="0 0 32 32">${ic.startsWith('<') ? ic : RIC[ic] || `<use href="#${ic}"/>`}</svg><span>${label}</span></button>`;
/* ---------- ações ---------- */
const lerArquivo = (accept, comoTexto) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => { const f = i.files[0]; if(!f) return res(null); const r = new FileReader(); r.onload = () => res({f, dados:r.result}); if(comoTexto) r.readAsText(f); else r.readAsDataURL(f); }; i.click(); });
// imagens grandes ficam com no máximo 1600 px para caber no salvamento
const reduzirImg = (src, max = 1600) => new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res({src:c.toDataURL('image/jpeg', .85), w:c.width, h:c.height}); }; im.onerror = () => res(null); im.src = src; });
Object.assign(ACT, {
  aba: el => { UI.aba = el.dataset.a; if(UI.aba !== 'vis'){ AV.cons = null; AV.ref = null; } closeBack(); render(); },
  ambRib: el => { AV.rib = el.dataset.r; renderRibbonVis(); },
  ambModo: el => { AV.modo = el.dataset.m; render(); },
  ambConstruir: () => { if(AV.cons){ consFim(); render(); return; } AV.cons = {pts:[], ang:null}; AV.ref = null; AV.sel = null; AV.inserir = null; const vb = $('#amb2d')?.viewBox.baseVal; if(vb && vb.width) AV.vb = {x:vb.x, y:vb.y, w:vb.width, h:vb.height}; render(); toast('Clique na planta 2D ou no piso do 3D onde a primeira parede começa. Construa no sentido horário.'); },
  ambConsFim: () => { consFim(); render(); },
  ambRefs: () => { AV.ref = AV.ref ? null : {}; AV.cons = null; if(AV.modo !== '2d') AV.modo = '2d'; render(); if(AV.ref) toast('Clique no ponto de uma parede que serve de referência.'); },
  ambRefSair: () => { AV.ref = null; render(); },
  ambFerr: el => { const f = el.dataset.f; AV.ferr2d = AV.ferr2d === f && f !== 'sel' ? 'sel' : f; AV.par = null; AV.inserir = null; if(AV.modo !== '2d') AV.modo = '2d'; render();
    const dica = {addVert:'Clique sobre a parede onde fica o novo vértice.', remVert:'Clique num vértice vermelho para juntar as duas paredes.', cantoA:'Clique na primeira parede e depois na segunda.', tA:'Clique na parede que vai até a outra, e depois na outra.', coluna:'Clique na planta onde fica a coluna.', zoomJanela:'Arraste uma janela na planta.', curva:'Arraste o corpo de uma parede para curvá-la (Mover hotpoint).'}[AV.ferr2d]; if(dica) toast(dica); },
  ambAtrair: () => { AV.atrair = !AV.atrair; renderRibbonVis(); },
  ambVizinhos: () => { AV.vizinhos = !AV.vizinhos; render(); },
  ambVerRef: () => { AV.verRef = !AV.verRef; render(); },
  ambRefDXF: async () => { const r = await lerArquivo('.dxf', true); if(!r) return; const linhas = lerDXFLinhas(r.dados); if(!linhas.length){ toast('Não achei linhas nesse DXF (LINE, LWPOLYLINE, ARC, CIRCLE).'); return; }
    const A = amb(); ambSnap(); const xs = linhas.flat().map(p => p[0]), ys = linhas.flat().map(p => p[1]); A.ref = {tipo:'dxf', linhas:linhas.map(l => l.map(p => [Math.round((p[0] - Math.min(...xs)) * 10) / 10, Math.round((p[1] - Math.min(...ys)) * 10) / 10])), x:0, y:0, esc:1}; AV.verRef = true; AV.vb = null; ambMudou(); ACT.ambRefCfg(); },
  ambRefImg: async () => { const r = await lerArquivo('image/*'); if(!r) return; const im = await reduzirImg(r.dados, 2000); if(!im) return; const A = amb(); ambSnap(); A.ref = {tipo:'img', src:im.src, w:im.w, h:im.h, x:0, y:0, esc:10, opac:.5}; AV.verRef = true; AV.vb = null; ambMudou(); ACT.ambRefCfg(); },
  ambRefCfg: () => { const R = amb().ref; if(!R) return; modal('Planta de referência', `<div class="kv" style="display:grid;grid-template-columns:auto 120px;gap:6px 10px;align-items:center"><span>Posição X (mm)</span><input type="number" id="rfX" value="${R.x}"><span>Posição Y (mm)</span><input type="number" id="rfY" value="${R.y}"><span>${R.tipo === 'img' ? 'mm por pixel' : 'Escala (DXF em mm = 1; em cm = 10; em m = 1000)'}</span><input type="number" step="any" id="rfE" value="${R.esc}">${R.tipo === 'img' ? `<span>Opacidade (0 a 1)</span><input type="number" step=".1" id="rfO" value="${R.opac}">` : ''}</div><p class="muted" style="margin:10px 0 0">Construa as paredes por cima da planta. Para a imagem, meça uma parede conhecida e ajuste os mm por pixel.</p>`, `<button class="btn pri" data-act="ambRefCfgOk">Aplicar</button><button class="btn" data-act="ambRefTirar">Tirar planta</button><button class="btn" data-act="modalClose">Fechar</button>`, {w:'420px'}); },
  ambRefCfgOk: () => { const R = amb().ref; R.x = num($('#rfX').value); R.y = num($('#rfY').value); R.esc = num($('#rfE').value) || 1; if($('#rfO')) R.opac = Math.max(0, Math.min(1, num($('#rfO').value))); ACT.modalClose(); AV.vb = null; ambMudou(); },
  ambRefTirar: () => { ambSnap(); delete amb().ref; ACT.modalClose(); ambMudou(); },
  ambRetangular: () => { const cf = amb().cfg; modal('Ambiente retangular', `<div class="kv" style="display:grid;grid-template-columns:auto 110px;gap:6px 10px;align-items:center"><span>Largura (mm)</span><input type="number" id="arL" value="4000"><span>Profundidade (mm)</span><input type="number" id="arP" value="3000"><span>Espessura</span><input type="number" id="arE" value="${cf.esp}"><span>Pé-direito</span><input type="number" id="arA" value="${cf.alt}"></div><p class="muted" style="margin:10px 0 0">As medidas são da face interna. As paredes que já existem são substituídas.</p>`, `<button class="btn pri" data-act="ambRetOk">Criar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'380px'}); },
  ambRetOk: () => { const L = num($('#arL').value), P = num($('#arP').value), e = num($('#arE').value), a = num($('#arA').value); if(!(L > 0 && P > 0 && e > 0 && a > 0)){ toast('Preencha largura, profundidade, espessura e pé-direito.'); return; }
    ambSnap(); const A = amb(); A.cfg.esp = e; A.cfg.alt = a; const V = [[0, 0], [0, P], [L, P], [L, 0]];
    A.paredes = V.map((p, i) => { const q = V[(i + 1) % 4]; return {id:uid(), x1:p[0], y1:p[1], x2:q[0], y2:q[1], esp:e, alt:a, altFim:a, orient:'interna', tipo:A.cfg.tipo}; }); A.tetos = []; A.aberturas = [];
    ambAjustarPiso(A); A.piso.auto = true; AV.sel = null; AV.cons = null; AV.vb = null; ACT.modalClose(); ambMudou(); motor()?.cmd('vista', 'isoDir'); },
  ambExcluir: () => { const s = AV.sel; if(!s || s.t === 'piso') return; ambSnap(); ambExcluirSel(); ambMudou(); },
  pbArmEditar: () => { if(AV.sel?.t === 'armario') armEditar(AV.sel.id); },
  pbArmEnviar: () => ambAcao3D('enviarArmario', AV.sel),
  pbInverter: () => pbInverter(), pbSubstituir: () => pbSubstituir(), pbOcultar: () => pbOcultar(), pbAgrupar: () => pbAgrupar(), pbCopiar: () => pbCopiar(), pbDuplicar: () => pbDuplicar(),
  ambExcluirTudo: () => confirmar('Excluir tudo', 'Apagar todas as paredes, aberturas e tetos deste ambiente? Dá para voltar com Desfazer.', 'Excluir tudo', () => { ambSnap(); const A = amb(); A.paredes = []; A.tetos = []; A.aberturas = []; AV.sel = null; AV.cons = null; render(); }),
  ambTeto: () => { const A = amb(), laco = ambLaco(A.paredes); let pts;
    if(laco){ const ref = laco.map(w => [w.x1, w.y1]), lado = areaPol(ref) < 0 ? 0 : 1; pts = laco.map(w => { const c = wCantos(w, A.paredes); return lado === 0 ? c[0] : c[3]; }); }
    else { const p = A.piso; pts = [[p.x, p.y], [p.x, p.y + p.h], [p.x + p.w, p.y + p.h], [p.x + p.w, p.y]]; toast('As paredes não formam um ambiente fechado: o teto foi feito do tamanho do piso.'); }
    ambSnap(); const alt = A.paredes.length ? Math.min(...A.paredes.map(w => Math.min(+w.alt, +(w.altFim ?? w.alt)))) : A.cfg.alt;
    const t = {id:uid(), pts:pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]), afast:alt, esp:150}; A.tetos = [t]; AV.sel = {t:'teto', id:t.id}; AV.verTeto = true; render(); },
  ambTetoPe: () => { const t = ambSelObj(), A = amb(); if(!t || !A.paredes.length) return; ambSnap(); t.afast = Math.min(...A.paredes.map(w => Math.min(+w.alt, +(w.altFim ?? w.alt)))); render(); },
  ambPiso: () => { const A = amb(); ambSnap(); if(!ambAjustarPiso(A)){ AV.undo.pop(); toast('Construa as paredes primeiro.'); return; } render(); },
  ambVerTeto: () => { AV.verTeto = !AV.verTeto; render(); },
  ambPersp: () => { AV.persp = !AV.persp; render(); },
  ambEnquadrar: () => { AV.vb = null; motor()?.cmd('enquadrar'); render(); },
  ambCotas: () => { AV.cotas = !AV.cotas; render(); },
  ambVistaRapida: () => { const w = ambSelObj(); if(!w || AV.sel?.t !== 'parede') return; if(AV.modo !== '3d') AV.modo = '3d'; render(); setTimeout(() => motor()?.cmd('vistaRapida', w.id), 50); },
  ambCmd: el => { const c = el.dataset.c; if(AV.modo !== '3d'){ AV.modo = '3d'; render(); } setTimeout(() => motor()?.cmd(c), 30); },
  ambDesfazer: () => { if(ambTroca(AV.undo, AV.redo)) ambMudou(); },
  ambRefazer: () => { if(ambTroca(AV.redo, AV.undo)) ambMudou(); },
  ambInserir: el => { const t = el.dataset.t; AV.perfurar = !!el.dataset.p; AV.inserir = AV.inserir === t ? null : t; AV.cons = null; AV.ref = null; render();
    if(AV.inserir) toast(AB_TIPOS[t] ? 'Clique numa parede (na planta ou no 3D, onde ela fica amarela).' : 'Clique na planta ou no piso do 3D onde o item fica.'); },
  ambSegmentar: () => { const w = ambSelObj(); if(AV.sel?.t !== 'parede' || !w) return; confirmar('Segmentar parede', 'Dividir esta parede em dois segmentos (no meio)? Cada um passa a ter suas próprias propriedades.', 'Segmentar', () => { ambSnap(); ambDividir(w, wLen(w) / 2); ambMudou(); }); },
  amb304050: () => { const w = ambSelObj(); if(AV.sel?.t !== 'parede' || !w){ toast('Selecione a parede que vai se deslocar.'); return; }
    modal('30-40-50', `<p class="muted" style="margin:0 0 8px">Meça no ambiente real, a partir do canto entre a parede anterior e a selecionada (que vai girar): A na parede anterior, B na parede selecionada e C a diagonal entre esses dois pontos.</p><div class="kv" style="display:grid;grid-template-columns:auto 110px;gap:6px 10px;align-items:center"><span>A (parede anterior)</span><input type="number" id="t3A" value="300"><span>B (parede selecionada)</span><input type="number" id="t3B" value="400"><span>C (diagonal)</span><input type="number" id="t3C" value="500"></div>`, `<button class="btn pri" data-act="amb304050Ok">Aplicar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'420px'}); },
  amb304050Ok: () => { const w = ambSelObj(); if(!w) return; ambSnap(); const r = amb304050(w, num($('#t3A').value), num($('#t3B').value), num($('#t3C').value)); if(typeof r === 'string'){ AV.undo.pop(); toast(r); return; } ACT.modalClose(); if(amb().piso.auto) ambAjustarPiso(amb()); ambMudou(); toast(`Ângulo entre as paredes: ${fmt(r, 2)}°.`); },
  ambFaixas: () => { const w = ambSelObj(); if(w) ambFaixasDialog(w); },
  ambFaixaNova: () => { const F = MOTOR.faixas?.F; if(!F) return; ambFaixasLer(); F.push({ate:(F[F.length - 1]?.ate || 0) + 1200, mat:'azulejo', cor:'#e9f1f5'}); const w = amb().paredes.find(v => v.id === MOTOR.faixas.w); if(w){ const keep = MOTOR.faixas; ambFaixasDialog({...w, faixas:F}); MOTOR.faixas = keep; } },
  ambFaixasOk: () => { const w = amb().paredes.find(v => v.id === MOTOR.faixas?.w); if(!w) return; ambFaixasLer(); ambSnap(); w.faixas = MOTOR.faixas.F.filter(f => f.ate > 0).sort((a, b) => a.ate - b.ate); ACT.modalClose(); ambMudou(); },
  ambFaixasLimpar: () => { const w = amb().paredes.find(v => v.id === MOTOR.faixas?.w); if(!w) return; ambSnap(); w.faixas = []; ACT.modalClose(); ambMudou(); },
  ambCentralizar: () => ambAcao3D('centralizar', AV.sel),
  ambGeoAcao: el => ambAcao3D(el.dataset.a, AV.sel),
  ambAcaoSel: el => { const w = ambSelObj(); if(!w) return; ambAcao3D(el.dataset.a === 'rebaixar' && w.rebaixada ? 'levantar' : el.dataset.a, AV.sel); },
  ambCopiarMat: () => { const o = ambSelObj(); if(!o) return; AV.copiaMat = {mat:o.mat || '', cor:o.cor || ''}; toast('Material copiado. Selecione outro item e clique em Colar material.'); renderAmbiente(true); },
  ambColarMat: () => { const o = ambSelObj(); if(!o || !AV.copiaMat) return; ambSnap(); o.mat = AV.copiaMat.mat; if(AV.copiaMat.cor) o.cor = AV.copiaMat.cor; ambMudou(); },
  ambIr: el => { ambSelecionar({t:el.dataset.t, id:el.dataset.id}); renderRibbonVis(); renderAmbiente(); if(AV.modo === '3d') setTimeout(() => motor()?.cmd('aproximar'), 60); else pbZoomPlano(); },
  ambGridDialog: () => modal('Grid do piso', `<label style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><input type="checkbox" id="gdOn" ${AV.grid.on ? 'checked' : ''}> Mostrar o grid no 3D</label><div class="kv" style="display:grid;grid-template-columns:auto 110px;gap:6px 10px;align-items:center"><span>Intervalo (mm)</span><input type="number" id="gdP" value="${AV.grid.passo}"><span>Atrair (incremento linear)</span><input type="number" id="gdA" value="${amb().cfg.incL}"></div>`, `<button class="btn pri" data-act="ambGridOk">Aplicar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'360px'}),
  ambGridOk: () => { AV.grid = {on:$('#gdOn').checked, passo:Math.max(10, num($('#gdP').value) || 500)}; amb().cfg.incL = Math.max(0, num($('#gdA').value)); ACT.modalClose(); render(); },
  ambAutoRebaixar: () => { AV.autoRebaixar = !AV.autoRebaixar; render(); },
  ambMedir: () => { AV.ferramenta = AV.ferramenta === 'medir' ? 'navegar' : 'medir'; motor()?.limparMedida(); render(); },
  ambHotpoints: () => { AV.hotpoints = !AV.hotpoints; render(); },
  ambColisao: () => { AV.colisao = !AV.colisao; renderRibbonVis(); motorRoom(); },
  ambCamadas: () => modal('Camadas', `<table class="kv"><tr><th>Camada</th><th>Ligada</th><th>Bloqueada</th></tr>${CAMADAS.map(([k, l]) => `<tr><td>${l}</td><td style="text-align:center"><input type="checkbox" data-cam="${k}" data-k="on" ${AV.camadas[k]?.on !== false ? 'checked' : ''}></td><td style="text-align:center"><input type="checkbox" data-cam="${k}" data-k="lock" ${AV.camadas[k]?.lock ? 'checked' : ''}></td></tr>`).join('')}</table><p class="muted" style="margin:8px 0 0">Camada bloqueada aparece mas não pode ser selecionada.</p>`, `<button class="btn pri" data-act="modalClose">Fechar</button>`, {w:'360px'}),
  ambPreferencias: () => modal('Preferências do ambiente', `<div class="kv" style="display:grid;grid-template-columns:auto 140px;gap:6px 10px;align-items:center"><span>Cor de fundo</span><input type="color" id="pfF" value="${AV.fundo}"><span>Tipo de preenchimento</span><select id="pfP">${AMB_FILL.map(([k, l]) => `<option value="${k}" ${AV.fill === k ? 'selected' : ''}>${l}</option>`).join('')}</select><span>Intensidade da luz padrão</span><input type="number" step=".1" id="pfL" value="${AV.luzPadrao}"><span>Corte anterior (mm)</span><input type="number" id="pfCa" value="${AV.corte.anterior}"><span>Corte posterior (mm)</span><input type="number" id="pfCp" value="${AV.corte.posterior}"><span>Incremento linear</span><input type="number" id="pfIl" value="${amb().cfg.incL}"><span>Incremento angular °</span><input type="number" id="pfIa" value="${amb().cfg.incA}"></div>`, `<button class="btn pri" data-act="ambPrefOk">Aplicar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'400px'}),
  ambPrefOk: () => { AV.fundo = $('#pfF').value; AV.fill = $('#pfP').value; AV.luzPadrao = Math.max(0, num($('#pfL').value)); AV.corte = {anterior:Math.max(1, num($('#pfCa').value)), posterior:Math.max(1000, num($('#pfCp').value))}; const cf = amb().cfg; cf.incL = Math.max(0, num($('#pfIl').value)); cf.incA = Math.max(0, num($('#pfIa').value)); S.ui = {...(S.ui || {}), amb3d:{fundo:AV.fundo, fill:AV.fill, luzPadrao:AV.luzPadrao}}; ACT.modalClose(); save(); render(); },
  ambApresentar: () => { AV.fill = AV.fill === 'apresentacao' ? 'texturas_linhas' : 'apresentacao'; render(); },
  ambClima: () => modal('Clima (luz natural)', `<div class="kv" style="display:grid;grid-template-columns:auto 140px;gap:6px 10px;align-items:center"><span>Tipo de clima</span><select id="clT">${Object.entries(CLIMAS).map(([k, v]) => `<option value="${k}" ${AV.clima.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select><span>Intensidade (0 a 2)</span><input type="number" step=".1" id="clI" value="${AV.clima.int}"><span>Altitude do sol °</span><input type="number" id="clA" value="${AV.clima.alt}"><span>Azimute °</span><input type="number" id="clZ" value="${AV.clima.az}"><span>Mostrar céu</span><input type="checkbox" id="clC" ${AV.clima.ceu ? 'checked' : ''}><span>Sombras</span><input type="checkbox" id="clS" ${AV.apres.sombras ? 'checked' : ''}><span>Oclusão de ambiente</span><input type="checkbox" id="clO" ${AV.apres.ao ? 'checked' : ''}><span>Reflexos</span><input type="checkbox" id="clR" ${AV.apres.reflexos ? 'checked' : ''}></div><p class="muted" style="margin:8px 0 0">Aparece no modo Apresentação e no Renderizar.</p>`, `<button class="btn pri" data-act="ambClimaOk">Aplicar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'400px'}),
  ambClimaOk: () => { AV.clima = {tipo:$('#clT').value, int:Math.max(0, Math.min(2, num($('#clI').value))), alt:Math.max(0, Math.min(90, num($('#clA').value))), az:num($('#clZ').value) % 360, ceu:$('#clC').checked}; AV.apres = {sombras:$('#clS').checked, ao:$('#clO').checked, reflexos:$('#clR').checked}; if(AV.fill !== 'apresentacao') AV.fill = 'apresentacao'; ACT.modalClose(); render(); },
  ambIlumPadrao: () => { AV.iluminacaoPadrao = !AV.iluminacaoPadrao; render(); },
  ambEditorLuzes: () => { AV.modo = '2d'; AV.vizinhos = true; AV.sel = amb().luzes[0] ? {t:'luz', id:amb().luzes[0].id} : null; render(); toast('Arraste as luzes (círculos amarelos) na planta; as propriedades ficam no painel à direita.'); },
  ambRender: () => { if(AV.modo !== '3d') return; AV.renderOn = !AV.renderOn; motor()?.render(AV.renderOn, AV.render); renderRibbonVis(); if(AV.renderOn) toast('Renderizando: a imagem vai ficando mais limpa a cada amostra. Salvar imagem quando quiser.'); },
  ambRenderCfg: () => modal('Configurar render', `<div class="kv" style="display:grid;grid-template-columns:auto 140px;gap:6px 10px;align-items:center"><span>Qualidade</span><select id="rqA">${[[64, 'Rascunho (64)'], [200, 'Boa (200)'], [600, 'Alta (600)'], [1500, 'Máxima (1500)']].map(([v, l]) => `<option value="${v}" ${+AV.render.alvo === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span>Resolução do render</span><select id="rqE">${[[.5, '50%'], [1, '100%'], [1.5, '150%'], [2, '200%']].map(([v, l]) => `<option value="${v}" ${+AV.render.escala === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span>Largura da imagem (px, 0 = tela)</span><input type="number" id="riL" value="${AV.imagem.largura || 0}"><span>Marca d'água</span><input type="text" id="riM" value="${esc(AV.imagem.marca || '')}"><span>Brilho %</span><input type="number" id="riB" value="${AV.imagem.brilho}"><span>Contraste %</span><input type="number" id="riC" value="${AV.imagem.contraste}"><span>Saturação %</span><input type="number" id="riS" value="${AV.imagem.saturacao}"><span>Cor de fundo</span><input type="color" id="riF" value="${AV.fundo}"></div>`, `<button class="btn pri" data-act="ambRenderCfgOk">Aplicar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'420px'}),
  ambRenderCfgOk: () => { AV.render = {alvo:+$('#rqA').value, escala:+$('#rqE').value}; AV.imagem = {largura:Math.max(0, num($('#riL').value)), marca:$('#riM').value, brilho:num($('#riB').value) || 100, contraste:num($('#riC').value) || 100, saturacao:num($('#riS').value) || 100}; AV.fundo = $('#riF').value; ACT.modalClose(); if(AV.renderOn){ motor()?.render(false); setTimeout(() => motor()?.render(true, AV.render), 50); } render(); },
  ambSalvarImg: async () => { const M = motor(); if(!M) return; M.salvarImagem(AV.imagem); const src = M.imagemDataURL(); if(!src) return; const im = await reduzirImg(src, 960); if(!im) return; const A = amb(); A.renders = [...(A.renders || []), {id:uid(), nome:`Render ${(A.renders || []).length + 1}`, src:im.src}].slice(-6); const o = ambDono(); if(o) touch(o); else save(); renderAmbiente(); },
  ambSalvarVista: () => { modal('Salvar vista', `<span>Nome da vista</span> <input type="text" id="vsN" value="Vista ${amb().vistas.length + 1}">`, `<button class="btn pri" data-act="ambSalvarVistaOk">Salvar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'340px'}); },
  ambSalvarVistaOk: () => { MOTOR.salvarVista = $('#vsN').value || 'Vista'; ACT.modalClose(); motor()?.cmd('pedirVista'); },
  ambVistasDialog: () => { const A = amb(), D = AV.dinamica; modal('Vista dinâmica', `<table class="kv" style="width:100%"><tr><th>Vista</th><th></th></tr>${A.vistas.map((v, i) => `<tr><td>${i + 1}. ${esc(v.nome)}</td><td style="text-align:right"><button class="btn" data-act="ambIrVista" data-i="${i}">Ir</button> <button class="btn" data-act="ambVistaSobe" data-i="${i}" ${i ? '' : 'disabled'}>▲</button> <button class="btn danger" data-act="ambVistaDel" data-i="${i}">✕</button></td></tr>`).join('')}</table>
    <div class="kv" style="display:grid;grid-template-columns:auto 110px;gap:6px 10px;align-items:center;margin-top:10px"><span>Passo (mm por quadro)</span><input type="number" id="vdP" value="${D.passo}"><span>Quadros por segundo</span><input type="number" id="vdF" value="${D.fps}"><span>Velocidade do girar (°/s)</span><input type="number" id="vdV" value="${D.vel}"><span>Girar (graus, 0 = sem parar)</span><input type="number" id="vdG" value="${D.graus}"></div><p class="muted" style="margin:8px 0 0">Caminhar percorre as vistas na ordem da lista. Girar Observador gira a câmera em volta do alvo; Girar Alvo gira o alvo em volta da câmera.</p>`,
    `<button class="btn" data-act="ambDinOk" data-go="percorrer">Caminhar</button><button class="btn" data-act="ambDinOk" data-go="observador">Girar observador</button><button class="btn" data-act="ambDinOk" data-go="alvo">Girar alvo</button><button class="btn" data-act="ambDinOk" data-go="gravar">Gravar vídeo</button><button class="btn" data-act="modalClose">Fechar</button>`, {w:'520px'}); },
  ambDinOk: el => { AV.dinamica = {passo:Math.max(1, num($('#vdP').value)), fps:Math.max(1, num($('#vdF').value)), vel:num($('#vdV').value) || 20, graus:Math.max(0, num($('#vdG').value))}; const go = el.dataset.go; ACT.modalClose();
    if(go === 'percorrer') ACT.ambPercorrer(); else if(go === 'gravar') ACT.ambGravar(); else { AV.animando = true; motor()?.cmd('girar', {modo:go, vel:AV.dinamica.vel, graus:AV.dinamica.graus}); renderRibbonVis(); } },
  ambIrVista: el => { const v = amb().vistas[+el.dataset.i]; if(v){ if(v.persp !== AV.persp){ AV.persp = v.persp; render(); } setTimeout(() => motor()?.cmd('irVista', v), 80); } },
  ambVistaSobe: el => { const V = amb().vistas, i = +el.dataset.i; if(i > 0){ [V[i - 1], V[i]] = [V[i], V[i - 1]]; save(); ACT.ambVistasDialog(); } },
  ambVistaDel: el => { amb().vistas.splice(+el.dataset.i, 1); save(); ACT.ambVistasDialog(); renderRibbonVis(); },
  ambGirar: () => { if(AV.animando){ motor()?.cmd('parar'); AV.animando = false; renderRibbonVis(); return; } AV.animando = true; motor()?.cmd('girar', {modo:'observador', vel:AV.dinamica.vel, graus:AV.dinamica.graus}); renderRibbonVis(); },
  ambPercorrer: () => { const V = amb().vistas; if(V.length < 2){ toast('Salve pelo menos duas vistas para caminhar entre elas.'); return; } AV.animando = true; motor()?.cmd('percorrer', {vistas:V, passo:AV.dinamica.passo, fps:AV.dinamica.fps}); renderRibbonVis(); },
  ambGravar: () => { const V = amb().vistas; AV.animando = true; if(V.length >= 2) motor()?.cmd('percorrer', {vistas:V, passo:AV.dinamica.passo, fps:AV.dinamica.fps, gravar:true}); else motor()?.cmd('girar', {modo:'observador', vel:AV.dinamica.vel, graus:AV.dinamica.graus || 360, gravar:true}); renderRibbonVis(); toast('Gravando o vídeo. Ele é salvo (.webm) quando a animação terminar.'); },
  ambCaminhar: () => { AV.ferramenta = AV.ferramenta === 'caminhar' ? 'navegar' : 'caminhar'; if(AV.modo === '2d') AV.modo = '3d'; render(); },
  ambEspelhar: () => confirmar('Espelhar ambiente', 'Espelhar todo o ambiente (paredes, aberturas, itens e módulos) da esquerda para a direita?', 'Espelhar', () => { const A = amb(), b = ambBBox(A); if(!b) return; const cx = b.x0 + b.x1, mx = x => Math.round((cx - x) * 10) / 10; ambSnap();
    for(const w of A.paredes){ const L = wLen(w); [w.x1, w.y1, w.x2, w.y2] = [mx(w.x2), w.y2, mx(w.x1), w.y1]; const h0 = w.alt; w.alt = w.altFim ?? w.alt; w.altFim = h0; if(w.flecha) w.flecha = -w.flecha; for(const a of A.aberturas.filter(a => a.parede === w.id)) a.pos = Math.round(L - a.pos - a.larg); }
    for(const g of A.geometrias){ g.x = (g.tipo === 'circ' || g.tipo === 'poli') ? mx(g.x) : mx(g.x + g.w); if(g.pts) g.pts = g.pts.map(p => [mx(p[0]), p[1]]); g.rot = -(g.rot || 0); }
    for(const o of [...A.luzes, ...A.textos, ...A.imagens, ...A.modelos]){ o.x = mx(o.x); if('rot' in o) o.rot = 180 - (o.rot || 0); }
    for(const t of A.tetos) t.pts = t.pts.map(p => [mx(p[0]), p[1]]).reverse(); A.piso.x = Math.round(cx - A.piso.x - A.piso.w); motor()?.espelharPaineis(cx / 2); ambMudou(); }),
  ambImportar3D: async () => { const r = await lerArquivo('.glb,.gltf,.obj,.stl'); if(!r) return; const fmt = r.f.name.split('.').pop().toLowerCase(), b64 = String(r.dados).split(',')[1] || '';
    if(b64.length > 4e6) toast('Arquivo grande: ele aparece no 3D, mas pode não caber no salvamento automático.'); const A = amb(), b = ambBBox(A); ambSnap(); const m = {id:uid(), nome:r.f.name, fmt, dados:b64, x:b ? Math.round((b.x0 + b.x1) / 2) : 1000, y:b ? Math.round((b.y0 + b.y1) / 2) : 1000, z:0, rot:0, esc:1}; A.modelos.push(m); AV.sel = {t:'modelo', id:m.id}; ambMudou(); },
  ambExportar3D: el => motor()?.exportar(el.dataset.f),
  ambImagem: async (el, info) => { const r = await lerArquivo('image/*'); if(!r) return; const im = await reduzirImg(r.dados, 1600); if(!im) return; const A = amb(); const w = info?.parede; ambSnap();
    let x = 1000, y = 1000, rot = 0; if(w){ const L = wLinha(w, -2), o = {s:info.s}; x = Math.round(L.px + L.dx * o.s); y = Math.round(L.py + L.dy * o.s); rot = Math.round(wAng(w)); }
    const larg = 800, alt = Math.round(800 * im.h / im.w); const i = {id:uid(), src:im.src, x, y, z:1300, larg, alt, rot}; A.imagens.push(i); AV.sel = {t:'imagem', id:i.id}; AV.inserir = null; ambMudou(); },
  ambModulos: () => { AV.modulos = !AV.modulos; render(); },
  ambArranjo: () => modal('Arranjo linear', `<p class="muted" style="margin:0 0 8px">Faz cópias da peça selecionada na barra de Módulos, em linha.</p><div class="kv" style="display:grid;grid-template-columns:auto 110px;gap:6px 10px;align-items:center"><span>Cópias</span><input type="number" id="alN" value="3"><span>Passo X (mm)</span><input type="number" id="alX" value="600"><span>Passo Y altura (mm)</span><input type="number" id="alY" value="0"><span>Passo Z profund. (mm)</span><input type="number" id="alZ" value="0"></div>`, `<button class="btn pri" data-act="ambArranjoOk">Criar</button><button class="btn" data-act="modalClose">Cancelar</button>`, {w:'360px'}),
  ambArranjoOk: () => { const n = motor()?.arranjoLinear(num($('#alN').value), [num($('#alX').value), num($('#alY').value), num($('#alZ').value)]); ACT.modalClose(); toast(n ? `${n} peça(s) criadas.` : 'Selecione uma peça na barra de Módulos primeiro.'); },
});
function ambFaixasLer(){ const F = MOTOR.faixas?.F; if(!F) return; document.querySelectorAll('[data-fx]').forEach(i => { const f = F[+i.dataset.fx]; if(f) f[i.dataset.k] = i.dataset.k === 'ate' ? num(i.value) : i.value; }); }
document.addEventListener('input', e => { if(e.target.id === 'ambBusca'){ AV.busca = e.target.value; const p = $('#pbLatCorpo'); if(p){ const pos = e.target.selectionStart; p.innerHTML = pbLatCorpo(AV.lat); const b = $('#ambBusca'); b?.focus(); b?.setSelectionRange(pos, pos); } } });
document.addEventListener('change', e => {
  const t = e.target; if(UI.aba !== 'vis') return;
  if(t.id === 'ambFill'){ AV.fill = t.value; motorRoom(); renderRibbonVis(); return; }
  if(t.id === 'ambVistaSel'){ if(t.value) motor()?.cmd('vista', t.value); t.value = ''; return; }
  if(t.dataset.cam){ const c = AV.camadas[t.dataset.cam] = {...(AV.camadas[t.dataset.cam] || {on:true})}; c[t.dataset.k] = t.checked; motorRoom(); if(AV.modo !== '3d') refresh2D(); return; }
  if(t.dataset.fx) return;
  const A = amb(), d = t.dataset, val = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' || t.type === 'color' || t.type === 'text' ? t.value : num(t.value);
  if(d.acf){ if(t.type === 'number' && !(val >= 0)) return; A.cfg[d.acf] = val; save(); return; }
  if(d.ap){ const w = ambSelObj(); if(!w) return; if(typeof val === 'number' && !(val > 0) && !['ang', 'angRel', 'flecha'].includes(d.ap)) return render(); ambSnap();
    if(d.ap === 'comp' || d.ap === 'ang' || d.ap === 'angRel'){ const ant = A.paredes.find(v => v !== w && perto(v.x2, v.y2, w.x1, w.y1)); const L = d.ap === 'comp' ? val : wLen(w), a = (d.ap === 'ang' ? val : d.ap === 'angRel' ? (ant ? wAng(ant) : 0) + val : wAng(w)) * Math.PI / 180;
      ambMoverVertice(A, w.x2, w.y2, Math.round((w.x1 + L * Math.cos(a)) * 10) / 10, Math.round((w.y1 + L * Math.sin(a)) * 10) / 10); }
    else { if(d.ap === 'alt' && (w.altFim ?? w.alt) === w.alt) w.altFim = val; w[d.ap] = val; }
    if(A.piso.auto) ambAjustarPiso(A); ambMudou(); return; }
  if(d.ab){ const a = ambSelObj(); if(!a) return; const w = A.paredes.find(v => v.id === a.parede), L = w ? wLen(w) : 0, hp = w ? Math.min(+w.alt, +(w.altFim ?? w.alt)) : 0; if(typeof val === 'number' && !(val >= 0)) return render(); ambSnap();
    if(d.ab === 'cAnt') a.pos = val; else if(d.ab === 'cPost') a.pos = L - a.larg - val; else if(d.ab === 'cInf') a.afast = val; else if(d.ab === 'cSup') a.afast = hp - a.alt - val;
    else if(d.ab === 'tipo'){ a.tipo = val; const n = AB_TIPOS[val]; if(n){ a.larg = n[1]; a.alt = n[2]; a.afast = n[3]; } } else a[d.ab] = val;
    a.pos = Math.max(0, Math.min(L - a.larg, a.pos)); a.afast = Math.max(0, a.afast); if(AV.colisao && w) a.pos = abColisao(a, w); ambMudou(); return; }
  for(const k of ['ag', 'al', 'ax', 'ai', 'am']) if(d[k]){ const o = ambSelObj(); if(!o) return; if(typeof val === 'number' && !isFinite(val)) return render(); ambSnap();
    if(k === 'ag' && (d.ag === 'x' || d.ag === 'y') && o.pts){ const dv = val - o[d.ag], j = d.ag === 'x' ? 0 : 1; o.pts = o.pts.map(p => { const q = [...p]; q[j] += dv; return q; }); }
    if(k === 'ag' && (d.ag === 'w' || d.ag === 'd') && o.pts && o[d.ag] > 0){ const f = val / o[d.ag], j = d.ag === 'w' ? 0 : 1, base = o[d.ag === 'w' ? 'x' : 'y']; o.pts = o.pts.map(p => { const q = [...p]; q[j] = Math.round(base + (q[j] - base) * f); return q; }); }
    o[d[k]] = val; ambMudou(); return; }
  if(d.at){ const o = ambSelObj(); if(!o || (typeof val === 'number' && !(val > 0))) return; ambSnap(); o[d.at] = val; ambMudou(); return; }
  if(d.api){ const p = A.piso; if(!['auto', 'mat', 'cor'].includes(d.api) && !(typeof val === 'number' && isFinite(val)) || (['w', 'h', 'esp'].includes(d.api) && !(val > 0))) return render(); ambSnap(); p[d.api] = val; if(['x', 'y', 'w', 'h'].includes(d.api)) p.auto = false; ambMudou(); return; }
});
document.addEventListener('keydown', e => {
  if(UI.aba !== 'vis' || $('#modalRoot').innerHTML || UI.back) return; const t = e.target, emCampo = !!t.closest?.('input,select,textarea');
  if(t.dataset?.ac && e.key === 'Enter'){ e.preventDefault(); const v = num(t.value);
    if(t.dataset.ac === 'refDist' && AV.ref?.p && v > 0){ const m = AV.ref.mouse || [AV.ref.p[0] + 1, AV.ref.p[1]], a = Math.atan2(m[1] - AV.ref.p[1], m[0] - AV.ref.p[0]); AV.cons = {pts:[[AV.ref.p[0] + v * Math.cos(a), AV.ref.p[1] + v * Math.sin(a)]], ang:null}; AV.ref = null; renderAmbiente(); return; }
    const C = AV.cons; if(!C?.pts.length) return;
    if(t.dataset.ac === 'comp' && v > 0){ const [lx, ly] = C.pts[C.pts.length - 1], q = C.mouse ? consPonta(...C.mouse) : {ang:C.ang ?? 0}; const a = (C.ang ?? q.ang) * Math.PI / 180; consAdd([lx + v * Math.cos(a), ly + v * Math.sin(a)]); }
    else if(t.dataset.ac === 'angAbs' && isFinite(v)){ C.ang = v; $('[data-ac=comp]')?.focus(); $('[data-ac=comp]')?.select(); refresh2D(); motorRoom(); }
    else if(t.dataset.ac === 'angRel' && isFinite(v)){ const ant = amb().paredes.length ? wAng(amb().paredes[amb().paredes.length - 1]) : 0; C.ang = ant + v; $('[data-ac=comp]')?.focus(); $('[data-ac=comp]')?.select(); refresh2D(); motorRoom(); }
    return; }
  if(e.key === 'Escape' && (AV.cons || AV.ref || AV.inserir || AV.ferr2d !== 'sel' || AV.ferramenta !== 'navegar')){ e.preventDefault(); if(AV.cons) consFim(); AV.ref = null; AV.inserir = null; AV.ferr2d = 'sel'; AV.par = null; if(AV.ferramenta === 'medir') AV.ferramenta = 'navegar'; AV.nav = 'sel'; render(); return; }
  if(emCampo) return;
  if(AV.cons?.pts.length && /^[0-9]$/.test(e.key)){ const i = $('[data-ac=comp]'); if(i){ e.preventDefault(); i.focus(); i.value = e.key; } return; }
  if(AV.ref?.p && /^[0-9]$/.test(e.key)){ const i = $('[data-ac=refDist]'); if(i){ e.preventDefault(); i.focus(); i.value = e.key; } return; }
  if(pbTecla({key:e.key, ctrl:e.ctrlKey || e.metaKey, shift:e.shiftKey, alt:e.altKey})) e.preventDefault();
});
window.addEventListener('resize', () => { if(UI.aba === 'vis') motorPosicionar(); });
// preferências do 3D guardadas entre aberturas do programa
if(S.ui?.amb3d) Object.assign(AV, S.ui.amb3d);

