.PHONY: dev build server
NAME="Furiganaize"
XPI_DIR=../xpi

dev:
	web-ext --verbose --firefox-profile ${HOME}/.mozilla/firefox/8mjc3gr8.DEV/ run

build-xpi:
	mkdir -p ${XPI_DIR}
	zip -r -FS ${XPI_DIR}/${NAME}.xpi [^.]*

server: build-xpi
	ip a | grep "inet " | grep --invert-match '127.0.0.1' | sed -E "s/[^0-9]+([^\/]+).+/\1/"
	cd ${XPI_DIR}; python3 -m http.server 8888

zip-repo:
	zip -r "../${NAME}-upload.zip" .    -x * node_modules/\*