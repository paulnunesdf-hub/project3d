# Testes do Plano de Corte CNC

Rodar tudo (HTML direto e pelo servidor do .exe):

    sh rodar-testes.sh

Só o HTML:

    node testes.js

Só pelo .exe já aberto no Windows (com o programa rodando):

    node testes.js http://127.0.0.1:47831/

Instalar o que precisa: Node 18+, `npm i playwright && npx playwright install chromium`, Go 1.22+.

O resultado da última rodada fica em `ultimo-resultado.json`.
Arquivos de entrada dos testes ficam em `dados/`. Quando chegar um TXT real do Promob, ele entra aqui com um teste próprio.
