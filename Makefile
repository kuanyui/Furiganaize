.PHONY: dev build server build watch
NAME="Furiganaize"
XPI_DIR=../xpi

build:
	./node_modules/.bin/tsc
	# bundle with simplest GNU "cat" because the latest Firefox still doesn't support background.service_worker in manifest.json
	# https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#browser_compatibility
	cat "lib/igo.js" \
		"lib/zipjs/jsinflate.js" \
		"lib/zipjs/sjis.js" \
		"lib/zipjs/zip.js" \
		"lib/wanakana.js" \
		"lib/diff.js" \
		"js/igoworker.js" > "js/concatenated_igoworker.js"

watch: build
	while inotifywait --event close_write --recursive ts/; do make build; echo SHIT; done

xpi: build
	mkdir -p "${XPI_DIR}"
	rm -f "${XPI_DIR}/${NAME}.xpi"
	zip -r -FS "${XPI_DIR}/${NAME}.xpi" [^.]* -x submodules/\* node_modules/\* user_cp_unused/\*

server: build-xpi
	ip a | grep "inet " | grep --invert-match '127.0.0.1' | sed -E "s/[^0-9]+([^\/]+).+/\1/"
	cd ${XPI_DIR}; python3 -m http.server 8888

zip-repo: build
	rm -f "../${NAME}-upload.zip"
	zip -r "../${NAME}-upload.zip" .    -x node_modules/\*

