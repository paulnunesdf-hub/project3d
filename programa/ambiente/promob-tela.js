
/* ================= Tela Principal do Promob (manual 2.3) =================
   1 abas · 2 barra de ferramentas superior · 3 barra de modulação · 4 painel de ferramentas
   5 ambiente 3D · 6 barra lateral · 7 barra de documentos · 8 barra de materiais · 9 barra de status */
const PB_CSS = `
#app.vis .body{grid-template-columns:minmax(0,1fr)} #app.vis .tree{display:none} #app.vis #dtabs{display:none} #app.vis .work{grid-template-rows:minmax(0,1fr)}
#app.vis.arvore .body{grid-template-columns:230px minmax(0,1fr)} #app.vis.arvore .tree{display:block}
#app.vis .ribbon{min-height:0;padding:3px 6px;align-items:center;gap:1px;flex-wrap:nowrap}
.pb-ic{width:30px;height:30px;flex:none;display:inline-grid;place-items:center;border:1px solid transparent;border-radius:3px;background:none;cursor:pointer;padding:0}
.pb-ic svg{width:22px;height:22px}
.pb-ic:hover:not(:disabled){background:var(--blue-hover);border-color:#a9c6e6}
.pb-ic.on{background:var(--blue-soft);border-color:#86b0dc}
.pb-ic:disabled{opacity:.35;cursor:default}
.pb-sep{width:1px;height:24px;background:var(--ribbon-line);margin:0 4px;flex:none}
.pb-dd{height:30px;flex:none;display:inline-flex;align-items:center;gap:4px;padding:0 7px;border:1px solid transparent;border-radius:3px;background:none;cursor:pointer;font-size:12px;white-space:nowrap}
.pb-dd:hover,.pb-dd.on{background:var(--blue-hover);border-color:#a9c6e6}
.pb-dd svg{width:20px;height:20px}
.pb-menu{position:fixed;z-index:40;background:#fff;border:1px solid #b9c6d4;box-shadow:0 6px 18px rgba(0,0,0,.18);padding:4px 0;min-width:230px;max-height:75vh;overflow:auto}
.pb-menu button{display:flex;align-items:center;gap:8px;width:100%;padding:5px 12px;border:0;background:none;text-align:left;cursor:pointer;font-size:12.5px;color:inherit}
.pb-menu button:hover:not(:disabled){background:var(--blue-hover)} .pb-menu button:disabled{opacity:.4;cursor:default}
.pb-menu button.on::before{content:'✓';color:var(--title);font-weight:700;margin-left:-8px;width:8px} .pb-menu hr{border:0;border-top:1px solid var(--line);margin:4px 0}
.pb-menu .k{margin-left:auto;color:var(--muted);font-size:11px;padding-left:12px} .pb-menu .t{padding:4px 12px 2px;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.03em}
.pb{display:grid;grid-template-columns:auto auto minmax(0,1fr) 290px;height:100%;min-height:0}
.pb-lat{display:flex;flex-direction:column;background:var(--chrome);border-right:1px solid var(--ribbon-line);width:24px}
.pb-lat button{writing-mode:vertical-rl;transform:rotate(180deg);border:0;border-top:1px solid var(--ribbon-line);padding:10px 2px;background:none;cursor:pointer;font-size:12px;color:var(--ink)}
.pb-lat button:hover{background:var(--blue-hover)} .pb-lat button.on{background:var(--blue-soft);color:var(--title);font-weight:600}
.pb-fly{width:260px;background:#fff;border-right:1px solid #b9c6d4;display:flex;flex-direction:column;min-height:0}
.pb-fly.solto{position:absolute;left:24px;top:0;bottom:0;z-index:6;box-shadow:4px 0 14px rgba(0,0,0,.14)}
.pb-fly header{display:flex;align-items:center;gap:6px;padding:4px 6px 4px 9px;background:var(--title);color:#fff;font-size:12.5px}
.pb-fly header b{flex:1} .pb-fly header button{border:0;background:none;color:#fff;cursor:pointer;font-size:13px;padding:0 4px}
.pb-fly .corpo{overflow:auto;padding:8px;min-height:0;flex:1}
.pb-centro{display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;min-width:0;min-height:0}
.pb-mod{border-bottom:1px solid var(--line);background:#fff}
.pb-mod .tabs{display:flex;gap:2px;padding:3px 6px 0;align-items:flex-end;border-bottom:1px solid var(--line)}
.pb-mod .tabs b{font-size:12px;color:var(--title);padding:0 8px 4px 2px}
.pb-mod .tabs button{border:1px solid transparent;border-bottom:0;background:none;padding:3px 9px;cursor:pointer;font-size:12px;border-radius:3px 3px 0 0}
.pb-mod .tabs button.on{background:#fff;border-color:var(--line);color:var(--title);font-weight:600;margin-bottom:-1px}
.pb-mod .tabs .x{margin-left:auto;color:var(--muted)}
.pb-mod .lista{display:flex;gap:6px;padding:5px 8px;overflow-x:auto}
.pb-mod .it{width:88px;flex:none;border:1px solid var(--line);border-radius:3px;background:#fafbfc;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px;font-size:11px;line-height:1.15;text-align:center;color:inherit}
.pb-mod .it svg{width:62px;height:46px} .pb-mod .it:hover{border-color:#86b0dc;background:var(--blue-hover)} .pb-mod .it.on{border-color:#2f6db5;background:var(--blue-soft)}
.pb-vista{position:relative;min-height:0;background:#fbfcfd}
.pb-docs{display:flex;gap:2px;border-top:1px solid var(--line);background:var(--chrome);padding:2px 6px;align-items:center}
.pb-docs button{border:1px solid var(--line);background:#fff;padding:3px 12px;cursor:pointer;font-size:12px;border-radius:2px}
.pb-docs button.on{border-color:#2f6db5;color:var(--title);font-weight:600}
.pb-mat{border-top:1px solid var(--line);background:#fff;padding:5px 8px;display:flex;gap:6px;overflow-x:auto;align-items:center}
.pb-mat .sw{width:62px;flex:none;border:1px solid var(--line);border-radius:3px;background:#fff;cursor:pointer;padding:3px;font-size:10.5px;line-height:1.1;text-align:center}
.pb-mat .sw i{display:block;height:30px;border-radius:2px;margin-bottom:2px;border:1px solid rgba(0,0,0,.12)} .pb-mat .sw.on{border-color:#2f6db5;background:var(--blue-soft)}
.pb-dir{border-left:1px solid var(--line);background:#fafbfc;overflow:auto;min-height:0}
.pb-h{background:var(--title);color:#fff;padding:5px 9px;font-weight:600;font-size:12.5px}
.pb-ferr{padding:6px 8px;display:flex;flex-direction:column;gap:3px;border-bottom:1px solid var(--line)}
.pb-ferr .btn{width:100%;text-align:left;justify-content:flex-start}
.pb-ferr .muted{font-size:12px}
.pb-gh{background:#dbe6f3;padding:3px 9px;font-weight:600;font-size:12px;color:var(--title)}
.pb-kv{display:grid;grid-template-columns:auto 124px;gap:4px 8px;align-items:center;padding:6px 9px}
.pb-kv input,.pb-kv select{width:100%;box-sizing:border-box}
.pb-nota{padding:6px 9px;font-size:12px;color:var(--muted)}
.status .pb-tg{border:1px solid var(--line);background:#fff;border-radius:3px;padding:1px 7px;font-size:11.5px;cursor:pointer;color:inherit}
.status .pb-tg.on{background:var(--blue-soft);border-color:#86b0dc}
.pb-rend{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;padding:12px;overflow:auto;position:absolute;inset:0}
.pb-rend figure{margin:0;border:1px solid var(--line);background:#fff;padding:6px} .pb-rend img{width:100%;display:block}
.pb-rend figcaption{display:flex;gap:6px;align-items:center;margin-top:5px;font-size:12px} .pb-rend figcaption span{flex:1}
.arm-grid{display:grid;grid-template-columns:240px minmax(0,1fr) 230px;gap:10px;height:66vh}
.arm-col{border:1px solid var(--line);background:#fafbfc;overflow:auto;min-height:0}
.arm-modos{display:flex;gap:2px;border-bottom:1px solid var(--line);padding:0 4px}
.arm-modos button{border:1px solid transparent;border-bottom:0;background:none;padding:4px 10px;cursor:pointer;font-size:12px;border-radius:3px 3px 0 0}
.arm-modos button.on{background:#fff;border-color:var(--line);color:var(--title);font-weight:600;margin-bottom:-1px}
.arm-it{display:flex;gap:8px;align-items:center;padding:4px 6px;border:1px solid var(--line);border-radius:3px;background:#fff;margin:4px 6px;cursor:grab;font-size:12px;user-select:none}
.arm-it svg{width:34px;height:30px;flex:none} .arm-it.on{border-color:#2f6db5;background:var(--blue-soft)} .arm-it:hover{border-color:#86b0dc}
#armSvg{width:100%;height:100%;display:block;background:#fff;touch-action:none}
.arm-est{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.arm-est button{border:1px solid var(--line);background:#fff;border-radius:4px;padding:8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12.5px}
.arm-est button:hover{border-color:#2f6db5;background:var(--blue-hover)} .arm-est svg{width:120px;height:96px}
`;
function pbCss(){ if($('#pbCss')) return; const s = document.createElement('style'); s.id = 'pbCss'; s.textContent = PB_CSS; document.head.appendChild(s); }

// ícones da barra superior (32×32)
const PB_IC = {
  'n-sel':'<path d="M9 4l14 13-6.5 1 4 8-3 1.5-4-8L9 24z" fill="#fff" stroke="#2c3a48" stroke-width="2" stroke-linejoin="round"/>',
  'n-pan':'<path d="M11 15V7.5a2 2 0 0 1 4 0V14m0-9a2 2 0 0 1 4 0v9m0-7a2 2 0 0 1 4 0v10c0 6-3 10-8 10-4 0-6-2-8-5l-3-5c-1-2 1-3.5 2.5-2L11 19z" fill="#f3e2cf" stroke="#5b4630" stroke-width="1.6" stroke-linejoin="round"/>',
  'n-rot':'<path d="M7 18a9 9 0 1 0 3-10" fill="none" stroke="#2f6db5" stroke-width="3"/><path d="M5 4v8h8z" fill="#2f6db5"/>',
  'n-zoom':'<circle cx="13" cy="13" r="8" fill="#e6f0fa" stroke="#2c3a48" stroke-width="2.5"/><path d="M19 19l8 8" stroke="#2c3a48" stroke-width="3.5"/><path d="M9 13h8M13 9v8" stroke="#2f6db5" stroke-width="2.2"/>',
  'n-jan':'<rect x="4" y="6" width="17" height="13" fill="none" stroke="#c8372d" stroke-width="2" stroke-dasharray="3 2"/><circle cx="20" cy="19" r="6" fill="#e6f0fa" stroke="#2c3a48" stroke-width="2.2"/><path d="M24.5 23.5l5 5" stroke="#2c3a48" stroke-width="3"/>',
  'n-plano':'<rect x="9" y="9" width="12" height="12" fill="#cfe2f6" stroke="#2f6db5" stroke-width="2"/><path d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6" fill="none" stroke="#2c3a48" stroke-width="2.5"/>',
  'a-arm':'<rect x="5" y="4" width="22" height="24" fill="#e8dcc8" stroke="#6b4d2e" stroke-width="1.6"/><path d="M16 4v24M5 22h22" stroke="#6b4d2e" stroke-width="1.4"/><path d="M12 12v4M20 12v4" stroke="#6b4d2e" stroke-width="2"/>',
  'a-atrair':'<path d="M8 6v10a8 8 0 0 0 16 0V6h-5v10a3 3 0 0 1-6 0V6z" fill="#c8372d"/><path d="M8 6h5v4H8zM19 6h5v4h-5z" fill="#9aa0a6"/>',
  'a-viz':'<rect x="4" y="8" width="11" height="16" fill="#e8dcc8" stroke="#6b4d2e"/><rect x="17" y="8" width="11" height="16" fill="#cfe2f6" stroke="#2f6db5"/>',
  'a-copia':'<path d="M6 22l12-12 4 4-12 12H6z" fill="#f2c53d" stroke="#7a5c00"/><path d="M20 6l6 6" stroke="#2c3a48" stroke-width="3"/>',
  'a-cola':'<rect x="7" y="6" width="18" height="22" rx="2" fill="#fff" stroke="#4a5a6c"/><rect x="11" y="3" width="10" height="6" rx="1" fill="#cfe2f6" stroke="#2f6db5"/><rect x="11" y="14" width="10" height="9" fill="#d9b380"/>',
  'a-help':'<circle cx="16" cy="16" r="12" fill="#2f6db5"/><path d="M12 12.5a4 4 0 1 1 5.5 3.7c-1 .5-1.5 1.2-1.5 2.3V20" fill="none" stroke="#fff" stroke-width="2.6"/><circle cx="16" cy="24" r="1.7" fill="#fff"/>',
  'a-redo':'<path d="M22 8a10 10 0 1 0 3 9" fill="none" stroke="#b7791f" stroke-width="3.5"/><path d="M27 4v8h-8z" fill="#b7791f"/>',
};
const pbIco = ic => ic.startsWith('<') ? ic : PB_IC[ic] || RIC[ic] || `<use href="#${ic}"/>`;
const pbDados = d => d ? Object.entries(d).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(' ') : '';
const PI = (act, tip, ic, o = {}) => `<button class="pb-ic ${o.on ? 'on' : ''}" data-act="${act}" ${pbDados(o.d)} ${o.dis ? 'disabled' : ''} title="${esc(tip)}"><svg viewBox="0 0 32 32">${pbIco(ic)}</svg></button>`;
const PD = (menu, label, ic, tip) => `<button class="pb-dd ${PB.menu === menu ? 'on' : ''}" data-act="pbMenu" data-m="${menu}" title="${esc(tip || label)}">${ic ? `<svg viewBox="0 0 32 32">${pbIco(ic)}</svg>` : ''}${label} ▾</button>`;
const PB_SEP = '<span class="pb-sep"></span>';
const PB = {menu:null};

/* ---- 2. barra de ferramentas superior ---- */
function renderRibbonVis(){
  pbCss(); const s = AV.sel, ed = AV.modo === '2d', ren = AV.modo === 'renders', nav = AV.nav || 'sel', d3 = ed || ren;
  let h = PI('pbNav', 'Seleção (M)', 'n-sel', {d:{n:'sel'}, on:nav === 'sel'}) + PI('pbNav', 'Pan (P)', 'n-pan', {d:{n:'pan'}, on:nav === 'pan'}) + PI('pbNav', 'Rotação (R)', 'n-rot', {d:{n:'rot'}, on:nav === 'rot', dis:ed})
    + PI('pbNav', 'Zoom (Z): arraste para cima e para baixo', 'n-zoom', {d:{n:'zoom'}, on:nav === 'zoom'}) + PI('pbNav', 'Zoom Window (W): marque a região', 'n-jan', {d:{n:'janela'}, on:nav === 'janela'})
    + PI('ambEnquadrar', 'Zoom Total (F6)', 'a-fit') + PI('pbZoomPlano', 'Zoom Total Plano: aproxima o item selecionado (F5)', 'n-plano', {dis:!s}) + PB_SEP;
  if(!ed) h += PD('vistas', 'Vistas', 'a-cam', 'Vistas (2.4.2)') + PD('preench', 'Preenchimento', 'a-3d', 'Modos de preenchimento (2.4.3)') + PI('ambPersp', 'Ortogonal / Perspectiva (F8)', AV.persp ? 'a-3d' : 'a-2d', {on:!AV.persp, dis:d3}) + PB_SEP;
  h += PI('ambConstruir', 'Construir Paredes', 'a-wall', {on:!!AV.cons}) + PI('ambRetangular', 'Ambiente Retangular', 'a-ret') + PI('ambTeto', 'Construir Teto', 'a-teto') + PI('ambPiso', 'Ajustar Limites do Piso', 'a-piso')
    + PI('armConstruir', 'Construir Armário: selecione a parede ou o piso (6.2)', 'a-arm') + PB_SEP;
  if(ed) h += PI('ambRefs', 'Referências', 'a-ref', {on:!!AV.ref}) + PI('ambFerr', 'Adicionar Vértice', 'a-vert', {d:{f:'addVert'}, on:AV.ferr2d === 'addVert'}) + PI('ambFerr', 'Remover Vértice', 'a-rvert', {d:{f:'remVert'}, on:AV.ferr2d === 'remVert'})
    + PI('ambFerr', 'Encontro Canto', 'a-canto', {d:{f:'cantoA'}, on:AV.ferr2d === 'cantoA'}) + PI('ambFerr', 'Encontro T', 'a-t', {d:{f:'tA'}, on:AV.ferr2d === 'tA'}) + PI('ambFerr', 'Colunas', 'a-col', {d:{f:'coluna'}, on:AV.ferr2d === 'coluna'})
    + PI('ambFerr', 'Mover Hotpoint: curvar parede (H)', 'a-vert', {d:{f:'curva'}, on:AV.ferr2d === 'curva'}) + PI('amb304050', '30-40-50', 'a-345', {dis:s?.t !== 'parede'}) + PI('ambAtrair', 'Junções / Atrair', 'a-atrair', {on:AV.atrair}) + PI('ambVizinhos', 'Mostrar Vizinhos', 'a-viz', {on:AV.vizinhos})
    + PD('refplanta', 'Planta', 'a-dxf', 'Planta de referência (DXF ou imagem)') + PB_SEP;
  h += PD('inserir', 'Inserir', 'a-porta') + (ed ? '' : PD('ilum', 'Iluminação', 'a-luz') + PD('render', 'Render', 'a-render')) + PB_SEP;
  h += PI('ambMedir', 'Calcular Distância (D)', 'a-medir', {on:AV.ferramenta === 'medir', dis:d3}) + PI('ambCaminhar', 'Caminhar (C)', 'a-andar', {on:AV.ferramenta === 'caminhar', dis:ren}) + PB_SEP
    + PI('ambDesfazer', 'Desfazer (Ctrl+Z)', 'i-undo', {dis:!AV.undo.length}) + PI('ambRefazer', 'Refazer (Ctrl+Y)', 'a-redo', {dis:!AV.redo.length}) + PB_SEP
    + PI('ambCopiarMat', 'Copiar Material', 'a-copia', {dis:!s}) + PI('ambColarMat', 'Colar Material', 'a-cola', {dis:!s || !AV.copiaMat}) + PB_SEP + PI('pbAjuda', 'Atalhos e ajuda (F1)', 'a-help');
  $('#ribbon').innerHTML = h;
}

/* ---- menus das listas da barra superior ---- */
const MI = (act, label, o = {}) => `<button data-act="${act}" ${pbDados(o.d)} ${o.dis ? 'disabled' : ''} class="${o.on ? 'on' : ''}">${label}${o.k ? `<span class="k">${o.k}</span>` : ''}</button>`;
function pbMenuHTML(m){ const s = AV.sel, A = amb(), d3 = AV.modo !== '3d';
  if(m === 'vistas') return Object.entries(VISTAS).map(([k, v]) => MI('pbVista', v, {d:{v:k}})).join('') + '<hr>' + MI('ambCmd', 'Voltar vista', {d:{c:'voltar'}}) + MI('ambCmd', 'Avançar vista', {d:{c:'avancar'}}) + MI('ambVistaRapida', 'Vista rápida da parede', {dis:s?.t !== 'parede'}) + MI('pbZoomPlano', 'Zoom total plano', {dis:!s, k:'F5'}) + MI('ambCmd', 'Tela cheia', {d:{c:'telaCheia'}, k:'F10'})
    + '<hr>' + MI('ambSalvarVista', 'Salvar vista…') + MI('pbLat', 'Vistas salvas', {d:{l:'vistas'}}) + MI('ambVistasDialog', 'Vista dinâmica…', {dis:!A.vistas.length});
  if(m === 'preench') return AMB_FILL.map(([k, l]) => MI('pbFill', l, {d:{f:k}, on:AV.fill === k})).join('') + '<hr>' + MI('ambCotas', 'Cotas', {on:AV.cotas}) + MI('ambVerTeto', 'Mostrar teto', {on:AV.verTeto}) + MI('ambAutoRebaixar', 'Auto rebaixar paredes', {on:AV.autoRebaixar}) + MI('ambHotpoints', 'Hotpoints', {on:AV.hotpoints})
    + MI('ambGridDialog', 'Grid do piso…') + MI('pbLat', 'Camadas…', {d:{l:'camadas'}}) + MI('ambPreferencias', 'Preferências…');
  if(m === 'inserir') return '<div class="t">Aberturas</div>' + Object.entries(AB_TIPOS).map(([k, v]) => MI('ambInserir', v[0], {d:{t:k}, on:AV.inserir === k})).join('')
    + '<hr><div class="t">Geometrias</div>' + Object.entries(GEO_TIPOS).map(([k, v]) => MI('ambInserir', v, {d:{t:'geo:' + k}, on:AV.inserir === 'geo:' + k})).join('') + MI('ambInserir', 'Perfurar parede (vão livre)', {d:{t:'geo:ret', p:1}})
    + '<hr><div class="t">Armários e módulos</div>' + MI('armConstruir', 'Construir armário…') + Object.entries(ARM_EST).map(([k, v]) => MI('pbLib', v.nome, {d:{t:'arm:' + k}, on:AV.inserir === 'arm:' + k})).join('') + armBib().map(m => MI('pbLib', '★ ' + esc(m.nome), {d:{t:'arm:mod:' + m.id}})).join('')
    + '<hr><div class="t">Decoração</div>' + MI('ambInserir', 'Texto 3D', {d:{t:'texto'}}) + MI('ambInserir', 'Imagem na parede', {d:{t:'imagem'}}) + MI('ambImportar3D', 'Importar arquivo 3D (GLB, OBJ, STL)…') + MI('prImportar', 'Importar projeto Promob (.BAK)…') + MI('ambModulos', 'Barra de peças do Panelizer', {on:AV.modulos}) + MI('ambArranjo', 'Arranjo linear…');
  if(m === 'ilum') return MI('ambApresentar', 'Modo apresentação', {on:AV.fill === 'apresentacao'}) + MI('ambClima', 'Clima…') + MI('ambIlumPadrao', 'Iluminação padrão', {on:AV.iluminacaoPadrao}) + '<hr>' + MI('ambInserir', 'Luz ambiente', {d:{t:'luz:ponto'}}) + MI('ambInserir', 'Spot', {d:{t:'luz:spot'}}) + MI('ambInserir', 'Luz linear', {d:{t:'luz:linear'}}) + MI('ambEditorLuzes', 'Editor de luzes');
  if(m === 'render') return MI('ambRender', AV.renderOn ? 'Parar render' : 'Renderizar', {on:AV.renderOn, dis:d3}) + MI('ambRenderCfg', 'Configurar render…') + MI('ambSalvarImg', 'Salvar imagem (vai para Renders)', {dis:d3})
    + '<hr>' + MI('ambSalvarVista', 'Salvar vista…') + MI('ambVistasDialog', 'Vista dinâmica…', {dis:!A.vistas.length}) + MI('ambGirar', AV.animando ? 'Parar animação' : 'Girar', {dis:d3}) + MI('ambPercorrer', 'Caminhar entre as vistas', {dis:d3 || A.vistas.length < 2}) + MI('ambGravar', 'Gravar vídeo', {dis:d3})
    + '<hr>' + ['glb', 'obj', 'stl'].map(f => MI('ambExportar3D', 'Exportar ' + f.toUpperCase(), {d:{f}, dis:d3})).join('') + MI('ambEspelhar', 'Espelhar ambiente…');
  if(m === 'refplanta') return MI('ambRefDXF', 'Importar DXF…') + MI('ambRefImg', 'Importar imagem…') + MI('ambVerRef', 'Mostrar planta', {on:AV.verRef, dis:!A.ref}) + MI('ambRefCfg', 'Ajustar posição e escala…', {dis:!A.ref});
  if(m === 'mostrar') return MI('ambVerTeto', 'Teto', {on:AV.verTeto}) + MI('ambCotas', 'Cotas', {on:AV.cotas}) + MI('ambHotpoints', 'Hotpoints', {on:AV.hotpoints}) + MI('pbGrid', 'Grid do piso', {on:AV.grid.on}) + MI('ambVizinhos', 'Vizinhos na planta', {on:AV.vizinhos}) + MI('pbOcultos', 'Itens ocultos', {on:AV.verOcultos}) + MI('pbArvore', 'Árvore do programa', {on:AV.arvore});
  return '';
}
function pbFecharMenu(){ PB.menu = null; $('#pbMenu')?.remove(); document.querySelectorAll('.pb-dd.on').forEach(b => b.classList.remove('on')); }
document.addEventListener('pointerdown', e => { if(PB.menu && !e.target.closest('#pbMenu,[data-act=pbMenu]')) pbFecharMenu(); }, true);

/* ---- 6. barra lateral (janelas que se recolhem, 2.3.1) ---- */
const PB_LAT = [['projeto', 'Projeto'], ['camadas', 'Camadas'], ['itens', 'Lista de itens'], ['vistas', 'Vistas salvas']];
function pbLatCorpo(l){ const A = amb();
  if(l === 'projeto'){ const ab = openProjects(), d = ambDono();
    return `<p class="muted" style="margin:0 0 6px;font-size:12px">O ambiente fica guardado no projeto marcado. As peças dos armários vão para ele.</p>${ab.map(p => `<label style="display:flex;gap:6px;align-items:center;padding:3px 0"><input type="radio" name="pbProj" data-act="pbProjeto" data-id="${p.id}" ${d?.id === p.id ? 'checked' : ''}> ${esc(p.nome)}</label>`).join('') || '<span class="muted">Nenhum projeto aberto.</span>'}
      <div style="display:flex;flex-direction:column;gap:5px;margin-top:10px"><button class="btn" data-act="pbArvore">${AV.arvore ? 'Esconder' : 'Mostrar'} a árvore do programa</button><button class="btn" data-act="aba" data-a="principal">Ir para a aba Principal</button></div>`; }
  if(l === 'camadas') return `<table class="kv" style="width:100%"><tr><th style="text-align:left">Camada</th><th>Ligada</th><th>Bloq.</th></tr>${CAMADAS.map(([k, n]) => `<tr><td>${n}</td><td style="text-align:center"><input type="checkbox" data-cam="${k}" data-k="on" ${AV.camadas[k]?.on !== false ? 'checked' : ''}></td><td style="text-align:center"><input type="checkbox" data-cam="${k}" data-k="lock" ${AV.camadas[k]?.lock ? 'checked' : ''}></td></tr>`).join('')}</table><p class="muted" style="margin:8px 0 0;font-size:12px">Camada bloqueada aparece mas não pode ser selecionada.</p>`;
  if(l === 'itens') return ambLocalizar();
  if(l === 'vistas') return `${A.vistas.map((v, i) => `<div style="display:flex;gap:4px;align-items:center;padding:3px 0;border-bottom:1px dotted var(--line2)"><span style="flex:1">${i + 1}. ${esc(v.nome)}</span><button class="btn" data-act="ambIrVista" data-i="${i}">Ir</button><button class="btn" data-act="ambVistaSobe" data-i="${i}" ${i ? '' : 'disabled'}>▲</button><button class="btn danger" data-act="ambVistaDel" data-i="${i}">✕</button></div>`).join('') || '<span class="muted">Nenhuma vista salva.</span>'}
    <div style="display:flex;flex-direction:column;gap:5px;margin-top:10px"><button class="btn pri" data-act="ambSalvarVista">Salvar a vista atual</button><button class="btn" data-act="ambVistasDialog" ${A.vistas.length ? '' : 'disabled'}>Vista dinâmica…</button></div>`;
  return ''; }
function pbLateral(){ const l = AV.lat, n = PB_LAT.find(x => x[0] === l);
  const fly = n ? `<div class="pb-fly ${AV.latFixo ? '' : 'solto'}" id="pbFly"><header><b>${n[1]}</b><button data-act="pbFixar" title="${AV.latFixo ? 'Soltar (recolhe sozinha)' : 'Fixar (alfinete)'}">${AV.latFixo ? '📌' : '📍'}</button><button data-act="pbLat" data-l="" title="Fechar">✕</button></header><div class="corpo" id="pbLatCorpo">${pbLatCorpo(l)}</div></div>` : '';
  return `<div class="pb-lat">${PB_LAT.map(([k, v]) => `<button class="${l === k ? 'on' : ''}" data-act="pbLat" data-l="${k}">${v}</button>`).join('')}</div><div style="position:relative;display:flex">${AV.latFixo ? fly : ''}</div>${AV.latFixo ? '' : fly}`; }
function pbLatRefresh(){ const c = $('#pbLatCorpo'); if(c && AV.lat && document.activeElement?.id !== 'ambBusca') c.innerHTML = pbLatCorpo(AV.lat); }

/* ---- 3. barra de modulação (biblioteca) ---- */
const PB_LIB = [['armarios', 'Armários'], ['minha', 'Minha biblioteca'], ['itens', 'Itens do projeto'], ['pecas', 'Peças'], ['aberturas', 'Portas e janelas'], ['geo', 'Geometrias'], ['luzes', 'Luzes'], ['deco', 'Decoração']];
const PB_PECAS = [['Lateral', {name:'Lateral', normal:'x', length:580, width:720}], ['Base / Prateleira', {name:'Base', normal:'y', length:600, width:580}], ['Fundo', {name:'Fundo', normal:'z', length:600, width:720, thickness:6}], ['Porta', {name:'Porta', normal:'z', length:400, width:716, thickness:18}], ['Divisória', {name:'Divisória', normal:'x', length:560, width:684}], ['Tampo de pia', {name:'Tampo', normal:'y', length:1800, width:600, thickness:30}]];
function pbModulacao(){ if(!AV.modAberto) return `<div class="pb-mod"><div class="tabs"><b>Módulos</b><button data-act="pbModAbrir" title="Mostrar a biblioteca">▸ mostrar a biblioteca</button></div></div>`;
  const t = AV.lib || 'armarios', card = (act, d, svg, nome, on, tip) => `<button class="it ${on ? 'on' : ''}" data-act="${act}" ${pbDados(d)} title="${esc(tip || nome)}"><svg viewBox="0 0 32 32">${svg}</svg>${esc(nome)}</button>`;
  let it = '';
  if(t === 'armarios') it = Object.entries(ARM_EST).map(([k, v]) => `<button class="it ${AV.inserir === 'arm:' + k ? 'on' : ''}" data-act="pbLib" data-t="arm:${k}" title="Clique e depois clique na parede ou no piso">${armSVG(armNovo(k), {mini:true})}${esc(v.nome)}</button>`).join('') + card('armConstruir', null, PB_IC['a-arm'], 'Construir armário…', false, 'Construtor de Armários (selecione a parede ou o piso)');
  else if(t === 'minha') it = armBib().map(m => `<div class="it ${AV.inserir === 'arm:mod:' + m.id ? 'on' : ''}" data-act="pbLib" data-t="arm:mod:${m.id}" title="${esc(m.nome)} · ${fmt(m.a.L)} × ${fmt(m.a.P)} × ${fmt(m.a.A)} mm. Clique e depois clique na parede ou no piso." style="position:relative">${armSVG(m.a, {mini:true})}${esc(m.nome.length > 26 ? m.nome.slice(0, 25) + '…' : m.nome)}<span data-act="pbModDel" data-id="${m.id}" title="Apagar da biblioteca" style="position:absolute;top:1px;right:4px;color:#c8372d;font-weight:700">✕</span></div>`).join('') || '<span class="muted" style="padding:14px 6px">Monte um armário no Construtor e clique em <b>Salvar na biblioteca</b>: ele aparece aqui para usar em qualquer projeto.</span>';
  else if(t === 'itens'){ const pr = ambDono(); const L = (pr?.itens || []).filter(i => !i.arm3d && +i.L > 0 && +i.A > 0); it = L.map(i => `<button class="it ${AV.inserir === 'item:' + i.id ? 'on' : ''}" data-act="pbLib" data-t="item:${i.id}" title="${esc(i.nome)} · ${fmt(i.L)} × ${fmt(i.P)} × ${fmt(i.A)} mm">${armSVG(armDeItem(i), {mini:true})}${esc(i.nome.length > 26 ? i.nome.slice(0, 25) + '…' : i.nome)}</button>`).join('') || '<span class="muted" style="padding:14px 6px">Os itens do projeto com largura, profundidade e altura aparecem aqui para pôr no ambiente.</span>'; }
  else if(t === 'pecas') it = PB_PECAS.map(([n], i) => card('pbPeca', {i}, RIC['a-mod'], n, false, 'Peça solta do Panelizer: entra no centro do ambiente')).join('') + card('ambModulos', null, RIC['a-mod'], AV.modulos ? 'Esconder barra do Panelizer' : 'Barra do Panelizer', AV.modulos);
  else if(t === 'aberturas') it = Object.entries(AB_TIPOS).map(([k, v]) => card('ambInserir', {t:k}, RIC[{porta:'a-porta', janela:'a-jan', vao:'a-vao', correr:'a-correr'}[k]], v[0], AV.inserir === k)).join('');
  else if(t === 'geo') it = Object.entries(GEO_TIPOS).map(([k, v]) => card('ambInserir', {t:'geo:' + k}, RIC[{circ:'a-circ', poli:'a-poli', coluna:'a-col', rebaixo:'a-teto', regiao:'a-piso'}[k] || 'a-geo'], v, AV.inserir === 'geo:' + k)).join('');
  else if(t === 'luzes') it = [['luz:ponto', 'Luz ambiente', 'a-luz'], ['luz:spot', 'Spot', 'a-spot'], ['luz:linear', 'Linear', 'a-linear']].map(([k, n, ic]) => card('ambInserir', {t:k}, RIC[ic], n, AV.inserir === k)).join('');
  else it = card('ambInserir', {t:'texto'}, RIC['a-texto'], 'Texto 3D', AV.inserir === 'texto') + card('ambInserir', {t:'imagem'}, RIC['a-img'], 'Imagem na parede', AV.inserir === 'imagem') + card('ambImportar3D', null, RIC['a-imp'], 'Arquivo 3D (GLB, OBJ, STL)');
  return `<div class="pb-mod"><div class="tabs"><b>Módulos</b>${PB_LIB.map(([k, v]) => `<button class="${t === k ? 'on' : ''}" data-act="pbLibAba" data-l="${k}">${v}</button>`).join('')}<button class="x" data-act="pbModAbrir" title="Recolher a biblioteca">▾ recolher</button></div><div class="lista">${it}</div></div>`; }

/* ---- 8. barra de materiais ---- */
const PB_COR = {pintura:'#ece8df', tijolo:'#b5654a', azulejo:'#e9f1f5', concreto:'#a9a59c', pedra:'#9c958a', gesso:'#f4f4f2', madeira:'#b98a5a', porcelanato:'#e2ded6', ceramica:'#d8cbb8', cimento:'#9fa3a6', carpete:'#8a7f73', aluminio:'#c4c8cc', branco:'#fafafa', vidro:'#a9d3ea', mdf:'#e6dccb'};
function pbMateriais(){ const s = AV.sel, o = ambSelObj();
  if(!s || !o) return `<div class="pb-mat"><span class="muted">Selecione um item (parede, piso, porta, geometria ou armário) para aplicar um material.</span></div>`;
  if(s.t === 'armario'){ const ch = armChapas(); const sw = (k, c) => `<button class="sw ${o[k] === c.material + '|' + c.esp ? 'on' : ''}" data-act="pbMatArm" data-k="${k}" data-v="${esc(c.material + '|' + c.esp)}" title="${esc(c.material)} ${c.esp} mm"><i style="background:${armCorChapa(c.material).cor}"></i>${esc(c.material)} ${c.esp}</button>`;
    return `<div class="pb-mat"><b style="font-size:12px">Corpo</b>${ch.filter(c => c.esp >= 12).map(c => sw('chapa', c)).join('')}<span class="pb-sep"></span><b style="font-size:12px">Frentes</b>${ch.filter(c => c.esp >= 12).map(c => sw('chapaFrente', c)).join('')}</div>`; }
  const g = s.t === 'parede' ? 'parede' : s.t === 'piso' ? 'piso' : s.t === 'abertura' ? 'abertura' : 'geo'; if(!['parede', 'piso', 'abertura', 'geo'].includes(s.t)) return `<div class="pb-mat"><span class="muted">Este item não tem material.</span></div>`;
  return `<div class="pb-mat">${AMB_ACAB_GRUPO[g].map(k => `<button class="sw ${o.mat === k ? 'on' : ''}" data-act="pbMat" data-m="${k}"><i style="background:${PB_COR[k] || '#ddd'}"></i>${AMB_ACAB[k]}</button>`).join('')}<label style="font-size:12px;display:flex;gap:4px;align-items:center;margin-left:6px">Cor <input type="color" id="pbMatCor" value="${o.cor || PB_COR[o.mat] || '#cccccc'}"></label></div>`; }

/* ---- renders guardados (barra de documentos) ---- */
function pbRenders(){ const R = amb().renders || [];
  return `<div class="pb-rend">${R.map(r => `<figure><img src="${r.src}" alt=""><figcaption><span>${esc(r.nome)}</span><button class="btn" data-act="pbRendBaixar" data-id="${r.id}">Baixar</button><button class="btn danger" data-act="pbRendDel" data-id="${r.id}">✕</button></figcaption></figure>`).join('') || '<p class="muted">Nenhuma imagem ainda. No Ambiente 3D use Render ▾ › Salvar imagem: a imagem fica guardada aqui e também é baixada.</p>'}</div>`; }

/* ---- 9. barra de status ---- */
function pbSelTexto(){ const s = AV.sel, o = ambSelObj(), A = amb(), n = (AV.multi || []).length;
  if(AV.cons) return 'Construindo paredes: clique o próximo ponto ou digite o comprimento. Botão direito ou Esc termina.';
  if(AV.inserir) return /^(arm|item):/.test(AV.inserir) ? 'Inserir módulo: clique na parede (ele encosta nela) ou no piso. Esc cancela.' : 'Inserir: clique onde o item fica. Esc cancela.';
  if(n > 1) return `${n} itens selecionados${A.grupos?.some(g => g.length === n && g.every(x => AV.multi.some(m => m.t === x.t && m.id === x.id))) ? ' (grupo)' : ''} · setas movem, Delete exclui, U agrupa`;
  if(!s || !o) return `Ambiente: ${A.paredes.length} parede(s), ${A.aberturas.length} abertura(s), ${A.armarios.length} armário(s), piso ${fmt(A.piso.w * A.piso.h / 1e6, 2)} m²`;
  const P = A.paredes;
  if(s.t === 'parede') return `Selecionado: Parede ${P.indexOf(o) + 1} → (${fmt(wLen(o))} × ${fmt(o.esp)} × ${fmt(Math.max(+o.alt, +(o.altFim ?? o.alt)))}) mm`;
  if(s.t === 'armario') return `Selecionado: ${esc(o.nome)} → (${fmt(o.L)} × ${fmt(o.P)} × ${fmt(o.A)}) mm · X ${fmt(o.x)} Y ${fmt(o.y)}${o.oculto ? ' · oculto' : ''}`;
  if(s.t === 'abertura') return `Selecionado: ${AB_TIPOS[o.tipo]?.[0] || 'Abertura'} → (${fmt(o.larg)} × ${fmt(o.alt)}) mm`;
  if(s.t === 'piso') return `Selecionado: Piso → (${fmt(o.w)} × ${fmt(o.h)}) mm (Área ${fmt(o.w * o.h / 1e6, 2)} m²)`;
  if(s.t === 'geo') return `Selecionado: ${GEO_TIPOS[o.tipo] || 'Geometria'} → (${fmt(o.w)} × ${fmt(o.d)} × ${fmt(o.alt)}) mm`;
  return `Selecionado: ${{teto:'Teto', luz:'Luz', texto:'Texto 3D', imagem:'Imagem', modelo:'Arquivo 3D'}[s.t] || s.t}`; }
function pbStatus(){ if(UI.aba !== 'vis') return; const tg = (act, l, on, tip) => `<button class="pb-tg ${on ? 'on' : ''}" data-act="${act}" title="${esc(tip || l)}">${l}</button>`;
  $('#status').innerHTML = `<span>${pbSelTexto()}</span><span class="sp"></span>${AV.trava ? `<b style="color:#c8372d">Trava em ${AV.trava.toUpperCase()}</b>` : ''}<button class="pb-tg" data-act="pbMenu" data-m="mostrar">Mostrar ▾</button>${tg('ambColisao', 'Colisão', AV.colisao, 'Colisão (B)')}${tg('ambAtrair', 'Junções', AV.atrair, 'Atrair nas junções e no incremento')}${tg('ambAutoRebaixar', 'Auto rebaixar', AV.autoRebaixar)}${tg('ambModulos', 'Panelizer', AV.modulos, 'Barra de peças do Panelizer no 3D')}<label style="font-size:11.5px" title="Passo das setas do teclado">Passo <input type="number" id="pbPasso" value="${AV.passo}" style="width:54px"> mm</label>`; }

/* ---- a tela inteira ---- */
function renderAmbiente(soPainel){
  pbCss(); const m = AV.modo; motorCriar();
  if(soPainel && $('#ambPainel')){ $('#ambPainel').innerHTML = ambPainel(); if(m === '2d') refresh2D(); if(AV.matBar && $('#pbMatHost')) $('#pbMatHost').innerHTML = pbMateriais(); motorRoom(); pbStatus(); pbLatRefresh(); return; }
  const A = amb();
  $('#content').innerHTML = `<div class="pb">${pbLateral()}
    <div class="pb-centro">${pbModulacao()}
      <div class="pb-vista" id="pbVista">${m === '2d' ? '<div id="amb2dHost" style="position:absolute;inset:0"></div>' : m === 'renders' ? pbRenders() : `<div id="amb3dHost" style="position:absolute;inset:0;overflow:hidden">${motorDiag()}</div>`}</div>
      <div id="pbMatHost">${AV.matBar ? pbMateriais() : ''}</div>
      <div class="pb-docs">${[['3d', 'Ambiente 3D'], ['2d', 'Editor de Paredes'], ['renders', `Renders (${(A.renders || []).length})`]].map(([k, l]) => `<button class="${m === k ? 'on' : ''}" data-act="ambModo" data-m="${k}">${l}</button>`).join('')}<span style="flex:1"></span><button class="${AV.matBar ? 'on' : ''}" data-act="pbMatBar">Materiais ${AV.matBar ? '▾' : '▴'}</button></div>
    </div>
    <div id="ambPainel" class="pb-dir">${ambPainel()}</div></div>`;
  if(m === '2d') refresh2D();
  requestAnimationFrame(motorPosicionar); if(MOTOR.ro){ MOTOR.ro.disconnect(); const a = $('#amb3dHost'); if(a) MOTOR.ro.observe(a); }
  const fly = $('#pbFly.solto'); if(fly) fly.addEventListener('mouseleave', () => { clearTimeout(PB.tf); PB.tf = setTimeout(() => { if(!AV.latFixo && AV.lat && !$('#pbFly')?.matches(':hover') && !$('#pbFly')?.contains(document.activeElement)){ AV.lat = null; renderAmbiente(); } }, 700); });
  motorRoom(); pbStatus();
}
function syncAbas(){ $('#abaVis')?.classList.toggle('on', UI.aba === 'vis'); $('#abaPrin')?.classList.toggle('on', UI.aba !== 'vis'); $('#app')?.classList.toggle('vis', UI.aba === 'vis' && !UI.back); $('#app')?.classList.toggle('arvore', !!AV.arvore); if(UI.aba !== 'vis' || UI.back){ pbFecharMenu(); motorPosicionar(); } }

Object.assign(ACT, {
  pbMenu: el => { const m = el.dataset.m; if(PB.menu === m){ pbFecharMenu(); return; } pbFecharMenu(); PB.menu = m; el.classList.add('on'); const r = el.getBoundingClientRect(), d = document.createElement('div'); d.id = 'pbMenu'; d.className = 'pb-menu'; d.innerHTML = pbMenuHTML(m);
    document.body.appendChild(d); const w = d.offsetWidth, hh = d.offsetHeight; d.style.left = Math.min(r.left, innerWidth - w - 6) + 'px'; d.style.top = (r.bottom + hh > innerHeight - 4 ? Math.max(4, r.top - hh) : r.bottom) + 'px';
    d.addEventListener('click', e => { if(e.target.closest('[data-act]')) setTimeout(pbFecharMenu, 0); }); },
  pbNav: el => pbNav(el.dataset.n),
  pbVista: el => { if(AV.modo !== '3d'){ AV.modo = '3d'; render(); } setTimeout(() => motor()?.cmd('vista', el.dataset.v), 30); },
  pbFill: el => { AV.fill = el.dataset.f; motorRoom(); renderRibbonVis(); },
  pbZoomPlano: () => pbZoomPlano(),
  pbAjuda: () => pbAjuda(),
  pbLat: el => { const l = el.dataset.l || null; AV.lat = AV.lat === l ? null : l; renderAmbiente(); },
  pbFixar: () => { AV.latFixo = !AV.latFixo; pbGuardar(); renderAmbiente(); },
  pbArvore: () => { AV.arvore = !AV.arvore; pbGuardar(); syncAbas(); renderTree(); renderAmbiente(); },
  pbProjeto: el => { UI.proj = el.dataset.id; MOTOR.dono = null; AV.sel = null; AV.undo = []; AV.redo = []; render(); },
  pbModAbrir: () => { AV.modAberto = !AV.modAberto; pbGuardar(); renderAmbiente(); },
  pbLibAba: el => { AV.lib = el.dataset.l; renderAmbiente(); },
  pbLib: el => { const t = el.dataset.t; AV.inserir = AV.inserir === t ? null : t; AV.cons = null; AV.ref = null; renderRibbonVis(); renderAmbiente(); if(AV.inserir) toast('Clique na parede (o módulo encosta nela) ou no piso, no 3D ou no Editor de Paredes.'); },
  pbPeca: el => { const p = PB_PECAS[+el.dataset.i]; if(!p) return; const A = amb(), b = ambBBox(A); const c = b ? [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2] : [1000, 1000]; motor()?.addPanel({...p[1], position:[c[0], 400, -c[1]]}); toast(`${p[0]} colocada no centro do ambiente. Ligue a barra do Panelizer para mover e redimensionar.`); },
  pbMatBar: () => { AV.matBar = !AV.matBar; renderAmbiente(); },
  pbMat: el => { const o = ambSelObj(); if(!o) return; ambSnap(); (AV.multi?.length > 1 ? AV.multi.map(ambObjDe).filter(Boolean) : [o]).forEach(x => { x.mat = el.dataset.m; if(PB_COR[el.dataset.m] && !x.cor) x.cor = undefined; }); ambMudou(); },
  pbMatArm: el => { const o = ambSelObj(); if(!o) return; ambSnap(); o[el.dataset.k] = el.dataset.v; ambMudou(); },
  pbRendBaixar: el => { const r = (amb().renders || []).find(x => x.id === el.dataset.id); if(r){ const a = document.createElement('a'); a.href = r.src; a.download = (r.nome || 'render') + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); } },
  pbRendDel: el => { const A = amb(); A.renders = (A.renders || []).filter(x => x.id !== el.dataset.id); ambMudou(); },
  pbOcultos: () => { AV.verOcultos = !AV.verOcultos; motorRoom(); pbStatus(); },
  pbGrid: () => { AV.grid = {...AV.grid, on:!AV.grid.on}; render(); },
});
function pbGuardar(){ S.ui = {...(S.ui || {}), amb3d:{...(S.ui?.amb3d || {}), fundo:AV.fundo, fill:AV.fill, luzPadrao:AV.luzPadrao, latFixo:AV.latFixo, modAberto:AV.modAberto, arvore:AV.arvore, passo:AV.passo}}; save(); }
function pbNav(n){ AV.nav = AV.nav === n && n !== 'sel' ? 'sel' : n; if(AV.ferramenta === 'medir') AV.ferramenta = 'navegar'; motorRoom(); renderRibbonVis(); pbStatus(); if(AV.modo === '2d') refresh2D();
  const dica = {pan:'Pan: arraste para deslocar a vista. M volta para a seleção.', rot:'Rotação: arraste para girar o ambiente. M volta para a seleção.', zoom:'Zoom: arraste para cima (aproxima) e para baixo (afasta).', janela:'Zoom Window: marque com o mouse a região que quer aproximar.'}[AV.nav]; if(dica) toast(dica); }
function pbZoomPlano(){ const s = AV.sel, o = ambSelObj(); if(!s || !o){ toast('Selecione um item para o Zoom Total Plano.'); return; }
  if(AV.modo === '2d'){ const b = ambItemBBox(s, o); if(b){ const m = Math.max(b.x1 - b.x0, b.y1 - b.y0) * .35 + 300; AV.vb = {x:b.x0 - m, y:-(b.y1 + m), w:b.x1 - b.x0 + 2 * m, h:b.y1 - b.y0 + 2 * m}; refresh2D(); } return; }
  if(AV.modo !== '3d'){ AV.modo = '3d'; render(); } setTimeout(() => motor()?.cmd('aproximar'), 40); }
function ambItemBBox(s, o){ if(s.t === 'parede') return {x0:Math.min(o.x1, o.x2), y0:Math.min(o.y1, o.y2), x1:Math.max(o.x1, o.x2), y1:Math.max(o.y1, o.y2)};
  if(s.t === 'armario'){ const q = armCantos(o), xs = q.map(p => p[0]), ys = q.map(p => p[1]); return {x0:Math.min(...xs), y0:Math.min(...ys), x1:Math.max(...xs), y1:Math.max(...ys)}; }
  if(s.t === 'piso') return {x0:o.x, y0:o.y, x1:o.x + o.w, y1:o.y + o.h};
  if(s.t === 'abertura'){ const w = amb().paredes.find(v => v.id === o.parede); if(!w) return null; const L = wLinha(w, 0), a = [L.px + L.dx * o.pos, L.py + L.dy * o.pos], b = [L.px + L.dx * (o.pos + o.larg), L.py + L.dy * (o.pos + o.larg)]; return {x0:Math.min(a[0], b[0]), y0:Math.min(a[1], b[1]), x1:Math.max(a[0], b[0]), y1:Math.max(a[1], b[1])}; }
  if('x' in o) return {x0:o.x, y0:o.y, x1:o.x + (o.w || 300), y1:o.y + (o.d || 300)}; return null; }
const ambObjDe = s => { const A = amb(); if(!s) return null; if(s.t === 'piso') return A.piso; return (A[AMB_LISTA[s.t]] || []).find(o => o.id === s.id) || null; };
