.PHONY: dev build server build watch
NAME="Furiganaize"
XPI_DIR=../xpi
default: build

clean:
	rm -rf js/*
	rm -rf tsc_out/*
	rm -rf bundle

build:
	npx tsc

	mkdir -p bundle/js
	mkdir -p bundle/css

	# igo WebWorker
	cat "lib/igo.js" \
		"lib/zipjs/jsinflate.js" \
		"lib/zipjs/sjis.js" \
		"lib/zipjs/zip.js" \
		"lib/wanakana.js" \
		"lib/diff.js" \
		"tsc_out/igoworker.js" \
		> "bundle/js/igoworker.js"

	# Background
	cat "tsc_out/common.js" \
	    "tsc_out/msg_manager.js" \
	    "tsc_out/config_storage_manager.js" \
	    "tsc_out/background.js" \
	    > "bundle/js/background.js"

	# Content Script (content_preload, inject via manifest.json)
	cat "tsc_out/common.js" \
	    "tsc_out/msg_manager.js" \
	    "tsc_out/config_storage_manager.js" \
	    "tsc_out/content_preload.js" \
	    > "bundle/js/content_preload.js"

	# Content Script (dynamically inject via content_preload.js)
	cat "tsc_out/content_full.js" \
	    > "bundle/js/content_full.js"

	# Options UI
	cat "lib/jquery-3.3.1.min.js" \
	    "lib/colpick/colpick.js" \
	    "tsc_out/common.js" \
	    "tsc_out/config_storage_manager.js" \
	    "tsc_out/options_ui.js" \
	    > "bundle/js/options_ui.js"

	cat "lib/colpick/colpick.css" \
		"options_ui/options.css" \
		> "bundle/css/options_ui.css"

watch: clean build
	while inotifywait --event close_write --recursive ts/; do make build; echo SHIT; done

xpi: clean build
	mkdir -p "${XPI_DIR}"
	rm -f "${XPI_DIR}/${NAME}.xpi"
	zip -r -FS "${XPI_DIR}/${NAME}.xpi" [^.]* -x submodules/\* node_modules/\* user_cp_unused/\*

server: build-xpi
	ip a | grep "inet " | grep --invert-match '127.0.0.1' | sed -E "s/[^0-9]+([^\/]+).+/\1/"
	cd ${XPI_DIR}; python3 -m http.server 8888

zip-repo: clean build
	rm -f "../${NAME}-upload.zip"
	zip -r "../${NAME}-upload.zip" .    -x node_modules/\*

