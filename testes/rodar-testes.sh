#!/bin/sh
# Roda a bateria duas vezes: abrindo o HTML direto e pelo mesmo servidor que vai dentro do .exe.
# Precisa de Node + Playwright (Chromium) e Go 1.22+.
set -e
cd "$(dirname "$0")"
node testes.js
TMP=$(mktemp -d)
cp ../exe/main.go ../exe/go.mod "$TMP"/
cp ../plano-de-corte-cnc.html "$TMP"/app.html
# HideWindow só existe no Windows; para o teste no Linux/Mac ele é tirado.
sed -i.bak 's/SysProcAttr{HideWindow: true}/SysProcAttr{}/' "$TMP"/main.go
(cd "$TMP" && go build -o servidor .)
"$TMP"/servidor & PID=$!
sleep 2
node testes.js http://127.0.0.1:47831/ || { kill $PID; exit 1; }
kill $PID
