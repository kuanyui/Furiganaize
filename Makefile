.PHONY: dev build server
NAME="Furiganaize"
XPI_DIR=../xpi

xpi:
	mkdir -p "${XPI_DIR}"
	rm -f "${XPI_DIR}/${NAME}.xpi"
	zip -r -FS "${XPI_DIR}/${NAME}.xpi" [^.]* -x submodules/\* node_modules/\* user_cp_unused/\*

server: build-xpi
	ip a | grep "inet " | grep --invert-match '127.0.0.1' | sed -E "s/[^0-9]+([^\/]+).+/\1/"
	cd ${XPI_DIR}; python3 -m http.server 8888
zip-repo:
	rm -f "../${NAME}-upload.zip"
	zip -r "../${NAME}-upload.zip" .    -x node_modules/\*
