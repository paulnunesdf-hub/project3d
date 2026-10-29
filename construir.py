#!/usr/bin/env python3
"""Monta o programa num único HTML (plano-de-corte-cnc.html) a partir dos fontes.

1. Compila o motor 3D (motor3d/, fork do Panelizer) com o Vite: motor3d/dist/index.html.
2. Pega programa/plano-de-corte-cnc.base.html, troca a marca /*@@AMBIENTE@@*/ pelos
   arquivos de programa/ambiente/ (nesta ordem) e embute o motor em base64 dentro de
   <script type="text/plain" id="motor3dFonte">.
3. Grava plano-de-corte-cnc.html na raiz e uma cópia em exe/app.html (para o go build).

Uso:  python3 construir.py            (instala dependências e compila o motor)
      python3 construir.py --sem-npm  (usa o motor3d/dist/index.html que já existe)
"""
import base64
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
AMBIENTE = ['amb-novo.js', 'promob-tela.js', 'promob-armario.js', 'promob-atalhos.js']
MARCA = '/*@@AMBIENTE@@*/'
TAG = '<script type="text/plain" id="motor3dFonte">'


def caminho(*p):
    return os.path.join(RAIZ, *p)


def compilar_motor():
    motor = caminho('motor3d')
    npm = 'npm.cmd' if os.name == 'nt' else 'npm'
    npx = 'npx.cmd' if os.name == 'nt' else 'npx'
    if not os.path.isdir(os.path.join(motor, 'node_modules')):
        subprocess.run([npm, 'ci'], cwd=motor, check=True)
    subprocess.run([npx, 'vite', 'build'], cwd=motor, check=True)


def main():
    if '--sem-npm' not in sys.argv:
        compilar_motor()
    dist = caminho('motor3d', 'dist', 'index.html')
    if not os.path.exists(dist):
        sys.exit('Falta motor3d/dist/index.html: rode sem --sem-npm para compilar o motor.')

    with open(caminho('programa', 'plano-de-corte-cnc.base.html'), encoding='utf-8', newline='') as f:
        html = f.read()
    ambiente = ''.join(open(caminho('programa', 'ambiente', a), encoding='utf-8', newline='').read() for a in AMBIENTE).rstrip('\n')
    assert html.count(MARCA) == 1, 'marca do ambiente não encontrada no HTML base'
    assert html.count(TAG + '</script>') == 1, 'lugar do motor não encontrado no HTML base'
    html = html.replace(MARCA, ambiente)
    with open(dist, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    html = html.replace(TAG + '</script>', TAG + b64 + '</script>')

    for destino in (caminho('plano-de-corte-cnc.html'), caminho('exe', 'app.html')):
        with open(destino, 'w', encoding='utf-8', newline='') as f:
            f.write(html)
    print('Pronto: plano-de-corte-cnc.html e exe/app.html (%d KB)' % (len(html) // 1024))


if __name__ == '__main__':
    main()
