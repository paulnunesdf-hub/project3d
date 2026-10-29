# Motor 3D da aba Visualizador 3D/2D

Fork do Panelizer (github.com/pelletier197/Panelizer, licença MIT: React 19 + react-three-fiber + drei + three.js),
com o ambiente do Promob em `src/ambiente/` (paredes com CSG, aberturas, teto, geometrias, luzes, texto 3D,
imagens, modelos importados, vistas, apresentação com N8AO, render por path tracing do three-gpu-pathtracer,
medir, exportar GLB/OBJ/STL, menu do botão direito).

Montagem:

1. `npm install` (o package.json força three-mesh-bvh ^0.9 em "overrides")
2. `npx vite build` gera `dist/index.html` (um arquivo só, vite-plugin-singlefile)
3. A parte do programa (Editor de Paredes 2D, Tela Principal, Construtor de Armários e atalhos) fica em
   `../programa/ambiente/`. O `construir.py` da raiz junta esses arquivos no HTML base do programa e embute
   este motor em base64 em `<script type="text/plain" id="motor3dFonte">`. Não edite o base64 à mão: mude
   o fonte aqui, rode `python3 construir.py` na raiz e depois os testes.

Ponte: o programa define `window.__motor3d` (o quadro lê `window.parent.__motor3d`) e chama
`iframe.contentWindow.Motor3D` (setRoom, setOpts, cmd, render, exportar, estado...).
Coordenadas: planta (x, y) em mm vira (x, altura, -y) em metros no 3D.
