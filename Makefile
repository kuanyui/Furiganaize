.PHONY: dev build server

DIR=../xpi

dev:
	web-ext run
build:
	mkdir -p ${DIR}
	zip -r -FS ${DIR}/furiganaize.xpi *
server: build
	ifconfig | grep "inet " | grep --invert-match '127.0.0.1'
	cd ${DIR}; python3 -m http.server 8888
