/* Importador Promob .bak/.zip: leitura inicial e inventário sem alterar o arquivo original. */
let PROMOB_IMPORT_PENDENTE=null;
function prBytes(b){const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
function prText(a){return new TextDecoder('utf-8').decode(a).replace(/^\uFEFF/,'');}
async function prZip(a){
 const v=new DataView(a.buffer,a.byteOffset,a.byteLength);let e=-1;
 for(let p=a.length-22,m=Math.max(0,a.length-65557);p>=m;p--)if(v.getUint32(p,true)===0x06054b50){e=p;break;}
 if(e<0)throw Error('Arquivo ZIP inválido.');
 const n=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);const out=new Map();
 for(let i=0;i<n;i++){if(v.getUint32(p,true)!==0x02014b50)throw Error('Diretório ZIP inválido.');
  const method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true);
  const name=new TextDecoder().decode(a.slice(p+46,p+46+nl)).replace(/\\/g,'/'),start=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true),raw=a.slice(start,start+size);let data;
  if(method===0)data=raw;else if(method===8){const st=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));data=new Uint8Array(await new Response(st).arrayBuffer());}else{p+=46+nl+el+cl;continue;}
  out.set(name,data);p+=46+nl+el+cl;
 }return out;
}
function prAmb(nome,bytes){
 const xml=prText(bytes),doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('XML inválido: '+nome);
 const root=doc.documentElement,infos=[...root.getElementsByTagName('INFORMACOES')],tipos={},comp=infos.map((e,i)=>{
  const d=e.getElementsByTagName('INSERTDIMENSION')[0],p=e.getElementsByTagName('POSICAOINSERCAO')[0],pt=p&&p.getElementsByTagName('PONTOBASE')[0];
  const mats=[...new Set([...e.getElementsByTagName('MATERIAL')].map(m=>m.getAttribute('ID')).filter(Boolean))];
  const models=[...e.getElementsByTagName('MODEL')].map(m=>({id:m.getAttribute('IDMODEL')||'',tipo:m.getAttribute('IDMODELTYPE')||'',remoto:m.getAttribute('ISREMOTE')||''}));
  const regioes=[...e.getElementsByTagName('REGION')].map((g,ri)=>{
   const pos=g.getElementsByTagName('POSITION')[0],base=pos&&pos.getElementsByTagName('PONTOBASE')[0],normal=pos&&pos.getElementsByTagName('NORMAL')[0],rot=pos&&pos.getElementsByTagName('ROTATION')[0],pts=g.getElementsByTagName('POINTS')[0];
   return {id:g.getAttribute('ID')||'',editavel:g.getAttribute('EDIT')||'',material:g.getElementsByTagName('MATERIAL')[0]?.getAttribute('ID')||'',base:base?Object.fromEntries([...base.attributes].map(a=>[a.name,Number(a.value)||0])):{},normal:normal?Object.fromEntries([...normal.attributes].map(a=>[a.name,Number(a.value)||0])):{},rotacao:rot?Number(rot.textContent)||0:0,pontos:pts?[...pts.getElementsByTagName('POINT')].map(q=>Object.fromEntries([...q.attributes].map(a=>[a.name,Number(a.value)||0]))):[]};
  });
  const c={indice:i,tipo:e.getAttribute('TYPE')||'desconhecido',id:e.getAttribute('ID')||'',largura:Number(d&&d.getAttribute('WIDTH'))||null,altura:Number(d&&d.getAttribute('HEIGHT'))||null,profundidade:Number(d&&d.getAttribute('DEPTH'))||null,posicao:pt?Object.fromEntries([...pt.attributes].map(a=>[a.name,Number(a.value)||0])):{},rotacao:p&&p.getElementsByTagName('ROTATION')[0]?Number(p.getElementsByTagName('ROTATION')[0].textContent)||0:0,materiais:mats,modelos:models,regioes:regioes};
  tipos[c.tipo]=(tipos[c.tipo]||0)+1;return c;
 });
 return {nome:root.getAttribute('NAME'),id:root.getAttribute('ID'),guid:root.getAttribute('GUID'),tipos,componentes:comp,xml:xml};
}
function prBaixar(nome,obj){const u=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=nome;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
async function prImportar(){
 const r=await lerArquivo('.bak,.zip');if(!r)return;
 try{
 const raw=String(r.dados||''),b64=raw.includes(',')?raw.split(',')[1]:raw,files=await prZip(prBytes(b64)),amb=[],mat=[],imgs=[];
 for(const [n,b] of files){const l=n.toLowerCase();if(l.endsWith('.ambient3d'))amb.push({path:n,...prAmb(n,b)});else if(l.endsWith('.material'))mat.push({nome:n,xml:prText(b)});else if(/\.(jpg|jpeg|png|bmp|tif|tiff)$/i.test(n))imgs.push({nome:n,bytes:b.length});}
 if(!amb.length)throw Error('Nenhum .ambient3d encontrado no backup.');
 const all=amb.flatMap(a=>a.componentes),tipos={};all.forEach(c=>tipos[c.tipo]=(tipos[c.tipo]||0)+1);
 const resumo={arquivo:r.f.name,bytes:r.f.size||Math.round(b64.length*.75),ambientes:amb.map(a=>({nome:a.nome,id:a.id,componentes:a.componentes.length,tipos:a.tipos})),totalComponentes:all.length,tipos:tipos,materiaisReferenciados:[...new Set(all.flatMap(c=>c.materiais))].sort(),arquivosMateriais:mat.map(m=>m.nome),imagens:imgs.map(i=>({nome:i.nome,bytes:i.bytes})),componentes:all};
 PROMOB_IMPORT_PENDENTE={nome:r.f.name,base64:b64,resumo,amb,mat,imgs};
 const rows=Object.entries(tipos).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+v+'</td></tr>').join('');
 const ambs=resumo.ambientes.map(a=>'<li>'+esc(a.nome||a.id)+' : '+a.componentes+' registros</li>').join('');
 modal('Importar projeto Promob','<p>Arquivo lido: <b>'+esc(r.f.name)+'</b>. O original não foi alterado.</p><div class="box"><b>Leitura estrutural concluída</b><p>Ambientes: '+amb.length+' · Componentes: '+all.length+' · Imagens: '+imgs.length+' · Arquivos de materiais: '+mat.length+'</p><p>Tamanho: '+(resumo.bytes/1024).toFixed(0)+' KB</p></div><b>Ambientes</b><ul>'+ambs+'</ul><b>Componentes identificados</b><div style="max-height:180px;overflow:auto"><table class="kv" style="width:100%"><tr><th>Tipo</th><th>Qtd.</th></tr>'+rows+'</table></div><p><b>IDs de materiais:</b><br>'+resumo.materiaisReferenciados.slice(0,35).map(x=>'<code>'+esc(x)+'</code>').join(', ')+'</p><p class="muted">Esta primeira entrega lê a estrutura e permite guardar o backup original. A reconstrução visual de móveis e a aplicação das texturas serão validadas em uma etapa seguinte, sem inventar geometrias.</p>','<button class="btn pri" data-act="prGuardar">Guardar backup no projeto</button><button class="btn" data-act="prRelatorio">Baixar relatório JSON</button><button class="btn" data-act="modalClose">Fechar</button>',{w:'650px'});
 }catch(e){toast('Falha ao ler backup Promob: '+(e.message||e));}
}
ACT.prImportar=prImportar;
ACT.prGuardar=()=>{if(!PROMOB_IMPORT_PENDENTE)return;if(!confirm('Guardar o backup original dentro do projeto atual? O arquivo aumenta o espaço ocupado pelos dados salvos.'))return;const A=amb();ambSnap();A.promobOrigem={formato:'promob-bak-v1',nome:PROMOB_IMPORT_PENDENTE.nome,base64:PROMOB_IMPORT_PENDENTE.base64,resumo:PROMOB_IMPORT_PENDENTE.resumo,importadoEm:new Date().toISOString()};ambMudou();ACT.modalClose();toast('Backup original guardado no projeto.');};
ACT.prRelatorio=()=>{if(!PROMOB_IMPORT_PENDENTE)return;const p=PROMOB_IMPORT_PENDENTE;prBaixar(p.nome.replace(/\.(bak|zip)$/i,'')+'-relatorio.json',{resumo:p.resumo,ambientes:p.amb.map(a=>({nome:a.nome,id:a.id,tipos:a.tipos,componentes:a.componentes})),materiais:p.mat,imagens:p.imgs});};
