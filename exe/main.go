// Plano de Corte CNC: abre o programa numa janela do Edge/Chrome servida localmente.
package main

import (
	"crypto/sha1"
	_ "embed"
	"encoding/hex"
	"io"
	"os"
	"net"
	"net/http"
	"os/exec"
	"strings"
	"sync/atomic"
	"syscall"
	"time"
)

//go:embed app.html
var page string

// Porta fixa para o navegador lembrar os projetos salvos entre uma abertura e outra.
const addr = "127.0.0.1:47831"
const url = "http://" + addr + "/"

const heartbeat = `<script>setInterval(function(){fetch('/ping').catch(function(){})},15000);</script></body>`

func openWindow() {
	hide := &syscall.SysProcAttr{HideWindow: true}
	for _, args := range [][]string{
		{"cmd", "/c", "start", "", "msedge", "--app=" + url},
		{"cmd", "/c", "start", "", "chrome", "--app=" + url},
		{"rundll32", "url.dll,FileProtocolHandler", url},
	} {
		c := exec.Command(args[0], args[1:]...)
		c.SysProcAttr = hide
		if c.Run() == nil {
			return
		}
	}
}

func main() {
	sum := sha1.Sum([]byte(page))
	version := hex.EncodeToString(sum[:8])
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		// Já está aberto. Se for esta mesma versão, só abre outra janela;
		// se for outra versão, pede para a antiga fechar e assume o lugar.
		cl := http.Client{Timeout: 2 * time.Second}
		if r, e := cl.Get(url + "version"); e == nil {
			b, _ := io.ReadAll(r.Body)
			r.Body.Close()
			if string(b) == version {
				openWindow()
				return
			}
		}
		if r, e := cl.Get(url + "quit"); e == nil {
			r.Body.Close()
		}
		for i := 0; i < 20 && err != nil; i++ {
			time.Sleep(250 * time.Millisecond)
			ln, err = net.Listen("tcp", addr)
		}
		if err != nil {
			openWindow()
			return
		}
	}
	var last atomic.Int64
	last.Store(time.Now().Unix() + 120)
	html := page
	if i := strings.LastIndex(page, "</body>"); i >= 0 {
		html = page[:i] + heartbeat + page[i+len("</body>"):]
	}
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		last.Store(time.Now().Unix())
		w.WriteHeader(204)
	})
	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(version))
	})
	http.HandleFunc("/quit", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(204)
		go func() {
			time.Sleep(100 * time.Millisecond)
			os.Exit(0)
		}()
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		last.Store(time.Now().Unix())
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write([]byte(html))
	})
	go func() {
		// Fecha sozinho alguns minutos depois que a janela do programa for fechada.
		for range time.Tick(30 * time.Second) {
			if time.Now().Unix()-last.Load() > 180 {
				ln.Close()
				return
			}
		}
	}()
	go openWindow()
	http.Serve(ln, nil)
}
