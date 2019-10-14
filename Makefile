.PHONY: dev build server
NAME="Furiganaize"
XPI_DIR=../xpi

dev:
	web-ext run

build-xpi:
	mkdir -p ${XPI_DIR}
	zip -r -FS ${XPI_DIR}/${NAME}.xpi [^.]*

server: build-xpi
	ifconfig | grep "inet " | grep --invert-match '127.0.0.1'
	cd ${XPI_DIR}; python3 -m http.server 8888

zip-repo:
	zip -r "../${NAME}-upload.zip" .    -x * node_modules/\*