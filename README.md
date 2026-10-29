# Project 3D — Plano de Corte CNC para marcenaria

Programa de marcenaria que recebe a lista de peças exportada pelo Promob, gera o plano de corte das chapas,
etiquetas, relatórios, orçamento, desenhos técnicos com furação e os arquivos para a máquina (DXF e G-code),
e tem um ambiente 3D/2D com editor de paredes e construtor de armários inspirado na tela do Promob.

O programa inteiro roda num único arquivo HTML, sem internet e sem servidor. Para o Windows existe um pequeno
executável em Go que abre esse HTML numa janela do Edge ou do Chrome.

> Estado: em desenvolvimento. A lista de recursos abaixo separa o que está coberto por testes automáticos do
> que ainda não foi conferido numa máquina ou num arquivo real. Veja [Limitações conhecidas](#limitações-conhecidas).

## Recursos

**Entrada de dados**
- Importação do TXT/CSV do Promob com mapeamento de colunas (lembra o último mapeamento), arquivos `.zip` e
  presets de importação. O formato `CorteCloud.txt` do Promob (sem cabeçalho, separado por `;`) tem preset próprio.
- Espessura deduzida pelo nome do material quando o TXT não traz a coluna de espessura.
- Árvore de projetos, itens e peças filhas, com novo item, duplicar, novo filho e reverter.
- Importações pendentes: vigia a pasta de exportação do Promob (quando o navegador permite acesso à pasta).

**Plano de corte**
- Otimização MaxRects e modo guilhotina, agrupada por material e espessura, respeitando o veio.
- Mover peças à mão (encaixe no espaço livre, troca de lugar, mover para outra chapa, girar), sobras, empilhar.
- Lista de corte, lista de compras, fita de borda em metros e custo.
- Etiquetas com código de barras Code128 (térmica 100×50 ou A4) e relatórios para impressão.

**Usinagem e máquina**
- Editor de Operações: furo, furo de topo, rasgo com largura, rebaixo, linha de furos, recorte vazado,
  rebaixo de borda, espelhar, esquemas do usuário e regras aplicadas em importações futuras.
- Cadastro de ferramentas (fresas e brocas) com troca manual (M0) ou automática (T M6).
- Furação automática pelo nome da peça no padrão Zinni (minifix, VB, caneco, cavilha), com regras editáveis,
  corrediças (telescópica H45 e ocultas) e mapa de furação.
- DXF R12 por chapa com camadas no padrão usado pelo Vectric Aspire (CHAPA, PERFIL_EXT_E{esp}, FURO_D{d}_P{prof}).
- G-code com pós-processadores GRBL, Mach3, NC Studio, Syntec e genérico: tabs, rampa, passadas, corte
  concordante, bolsões de rebaixo. Simulação que lê o G-code gerado e aponta erros (fundo demais, G0 dentro do
  material, fora da chapa, invasão de peça).
- Envio direto para CNC GRBL pela USB (Web Serial) e gravação na pasta da máquina (File System Access),
  quando o navegador suporta essas APIs (Edge/Chrome).
- Exportação para outros sistemas: Ardis CSV, woodWOP `.mpr`, Xilog `.xxl`, Corte Certo, Cut Planning/GPlan/
  GVision CSV e Cut Rite `.ptx` (modelos aproximados, ver limitações).

**Orçamento**
- Aba Orçamento antes do plano de corte: chapas pelo plano real, fita, dobradiças, corrediças, minifix e
  cavilhas, com cadastro de preços, quantidade editável, item avulso, margem e mão de obra.

**Visualizador 3D/2D**
- Editor de Paredes 2D (comprimento, ângulo, espessura, pé-direito, aberturas), teto e piso.
- Motor 3D (fork do Panelizer, ver abaixo): paredes com recortes, geometrias, luzes, texto 3D, imagens,
  modelos importados, vistas, modo apresentação, render por path tracing, medir, exportar GLB/OBJ/STL.
- Tela Principal no estilo do manual do Promob, Construtor de Armários que gera as peças no projeto (e daí no
  plano de corte), biblioteca de módulos do usuário e atalhos de teclado do Promob.
- Painel de diagnóstico quando o 3D não consegue iniciar (sem WebGL2, erro de JavaScript etc.).

**Dados**
- Tudo fica salvo no navegador (localStorage/IndexedDB), com salvamento seguro, aviso quando o espaço acaba e
  backup automático numa pasta escolhida pelo usuário.

## Estrutura do repositório

```
plano-de-corte-cnc.html          programa pronto (gerado pelo construir.py; abra este arquivo)
construir.py                     monta o HTML a partir dos fontes abaixo
programa/
  plano-de-corte-cnc.base.html   interface, otimizador, G-code, DXF, relatórios (HTML + JS puro)
  ambiente/                      Editor de Paredes, Tela Principal, Construtor de Armários, atalhos
motor3d/                         motor 3D: fork do Panelizer (React 19 + react-three-fiber + three.js), licença MIT
exe/                             lançador para Windows em Go (só biblioteca padrão)
testes/                          testes de ponta a ponta com Playwright + arquivos de entrada
exemplos/                        TXT de exemplo do Promob e o DXF/G-code gerados a partir dele
docs/telas/                      capturas de tela do programa
```

## Requisitos

- Para **usar**: Edge ou Chrome atualizado (WebGL2 para a aba 3D). Nada mais.
- Para **montar a partir dos fontes**: Python 3.8+, Node.js 20+ (testado com Node 22) e npm.
- Para **gerar o .exe**: Go 1.22+.
- Para **rodar os testes**: Node.js e Playwright com Chromium (`npm i playwright && npx playwright install chromium`).

## Instalação e execução

Usar sem compilar nada:

```sh
git clone https://github.com/paulnunesdf-hub/project3d.git
cd project3d
# abra plano-de-corte-cnc.html no Edge ou no Chrome
```

Montar o HTML a partir dos fontes (compila o motor 3D e junta tudo):

```sh
python3 construir.py              # roda npm ci + vite build em motor3d/ e gera plano-de-corte-cnc.html e exe/app.html
python3 construir.py --sem-npm    # só junta, usando o motor3d/dist/index.html já compilado
```

Gerar o executável do Windows (depois do `construir.py`, que coloca o `app.html` ao lado do `main.go`):

```sh
cd exe
GOOS=windows GOARCH=amd64 go build -ldflags "-s -w -H=windowsgui" -o PlanoDeCorteCNC.exe .
```

No Windows (PowerShell): `$env:GOOS="windows"; go build -ldflags "-s -w -H=windowsgui" -o PlanoDeCorteCNC.exe .`

O executável serve o programa em `http://127.0.0.1:47831/` (porta fixa, para o navegador manter os projetos
salvos) e abre uma janela do Edge/Chrome. Ele fecha sozinho uns 3 minutos depois que a janela é fechada.
O executável não é assinado, então o Windows SmartScreen pode avisar na primeira vez.

## Testes

```sh
# motor 3D: testes de unidade (Vitest), checagem de tipos e lint
cd motor3d && npm ci && npx vitest run && npx tsc -b && npx oxlint

# programa: bateria completa abrindo o HTML direto e depois pelo servidor do .exe (precisa de Go)
cd testes && sh rodar-testes.sh

# programa: clica em todos os botões de todas as telas (inclui a aba 3D, com WebGL por software)
cd testes && node botoes.js
```

Os testes do programa abrem o Chromium com WebGL por software (SwiftShader), então a aba 3D é testada mesmo
sem placa de vídeo. O resultado de cada rodada fica em `testes/ultimo-resultado*.json` (não versionado).

## Limitações conhecidas

- **Não conferido em máquina real:** os pós-processadores de G-code, os formatos de exportação para outros
  sistemas (Ardis, woodWOP, Xilog, Corte Certo, Cut Rite etc.) e a furação de corrediças foram feitos a partir de
  documentação e exemplos, sem teste numa CNC ou no software de destino. Confira a simulação e faça uma peça de
  teste antes de produzir.
- Furo de topo (horizontal) sai só como comentário no G-code: o programa não supõe cabeçote horizontal.
- No `CorteCloud.txt` a ordem das fitas (C1, C2 no comprimento; L1, L2 na largura) segue o arquivo de
  exemplo; o lado exato de cada fita é uma suposição.
- A lateral do móvel não recebe a furação das corrediças, porque o TXT do Promob não informa a altura de cada gaveta.
- O arquivo nativo `.promob` ainda não é importado; só o TXT/CSV.
- Num computador do usuário a aba 3D ficou em branco e a causa ainda não foi encontrada; o painel de
  diagnóstico foi incluído para coletar o motivo.
- Os dados ficam no navegador da máquina. Trocar de navegador ou limpar os dados do site apaga os projetos
  que não tiverem backup.
- `npm audit` aponta vulnerabilidades em ferramentas de desenvolvimento do motor 3D (vite, vitest e
  dependências indiretas). Elas afetam o servidor de desenvolvimento, não o HTML final, e a correção automática
  (`npm audit fix`) falha nesta árvore de dependências; fica pendente atualizar as versões à mão.
- Não há assinatura de código no executável.

## Licenças e terceiros

- `motor3d/` é um fork do [Panelizer](https://github.com/pelletier197/Panelizer), licença MIT
  (`motor3d/LICENSE`, mantida). A fonte usada no texto 3D vem do Android Open Source Project, licença Apache 2.0
  (`motor3d/src/ambiente/fonte3d-NOTICE.txt`).
- Promob, Cut Pro, Aspire e os demais nomes de produtos citados pertencem aos seus donos. Este projeto não
  contém código, manuais nem arquivos desses produtos; ele lê e escreve arquivos nos formatos que eles usam.
- O restante do código ainda não tem licença definida pelo autor (todos os direitos reservados até que uma
  licença seja escolhida).
