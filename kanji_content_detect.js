/***************************************************************
 *	This script set to run_at document load. See manifest.json.
 ***************************************************************/
var userKanjiRegexp;
var includeLinkText = false;
var insertedNodesToCheck = [];
var insertedNodeCheckTimeoutId = null;
let mutationObserver = null

browser.runtime.sendMessage({message: "config_values_request"}).then(function(response) {
	userKanjiRegexp = new RegExp("[" + response.userKanjiList + "]");
	includeLinkText = JSON.parse(response.includeLinkText);
	persistentMode = JSON.parse(response.persistentMode);
	let useMobileFloatingButton = JSON.parse(response.useMobileFloatingButton);
    let globallyShowMobileFloatingButton = JSON.parse(response.globallyShowMobileFloatingButton);
    if (globallyShowMobileFloatingButton) {
        fiAddFloatingIcon()
    }
	// Having received the config data, start searching for relevant kanji
	// If none find, do nothing for now except start a listener for node insertions
	// If persistent mode enabled - enable furigana right away
	if (document.body.innerText.match(/[\u3400-\u9FBF]/) || persistentMode || globallyShowMobileFloatingButton) {
		browser.runtime.sendMessage({message: "init_tab_for_fi"});
    } else {
        mutationObserver = new MutationObserver(DOMNodeInsertedHandler);
        mutationObserver.observe(document, { childList: true, subtree: true });
    }
});

function DOMNodeInsertedHandler(mutationList, observer) {
    for (let mutation of mutationList) {
        if (mutation.type === 'childList') {
            e = mutation;
            if (insertedNodesToCheck.includes(e.target)) { continue }
            if (insertedNodesToCheck.includes(e.target.parentNode)) { continue }
            if ((e.target.nodeType == Node.TEXT_NODE || e.target.nodeType == Node.CDATA_SECTION_NODE) &&
                e.target.innerText !== undefined &&
                e.target.innerText !== '' &&
                e.target.parentNode) {
                // console.log('type 1', e.target)
                insertedNodesToCheck.push(e.target.parentNode)
            } else if (
                e.target.nodeType === Node.ELEMENT_NODE &&
                e.target.tagName !== "IMG" &&
                e.target.tagName !== "SVG" &&
                e.target.tagName !== "CANVAS" &&
                e.target.tagName !== "OBJECT" &&
                e.target.tagName !== "EMBED" &&
                e.target.tagName !== "BODY" &&
                e.target.tagName !== "HEAD" &&
                e.target.innerText !== undefined &&
                e.target.innerText !== ''
            ) {
                // console.log('type 2', e.target)
                insertedNodesToCheck.push(e.target);
            } else {
                return;
            }
            window.clearTimeout(insertedNodeCheckTimeoutId)
            insertedNodeCheckTimeoutId = window.setTimeout(checkInsertedNodes, 1000);
         }
    }

}

function checkInsertedNodes() {
	var a = [];
    for (const node of insertedNodesToCheck) {
        if (node.innerText.length === 0) { continue }
        a.push(node.innerText);
    }
	insertedNodesToCheck = [];
	insertedNodeCheckTimeoutId = null;
	// doing a join-concatenation then one RegExp.match() because I assume it will be quicker
	// than running RegExp.match() N times.
	var s = a.join("");
    if (s.match(/[\u3400-\u9FBF]/)) {
        mutationObserver.disconnect()
		browser.runtime.sendMessage({message: "init_tab_for_fi"});
		return;
	}
}

function hasOnlySimpleKanji(rubySubstr) {
	var foundKanji = rubySubstr.match(/[\u3400-\u9FBF]/g);
	if (foundKanji) {
		for (var x = 0; x < foundKanji.length; x++) {
			if (!userKanjiRegexp.exec(foundKanji[x]))
				return false;
		}
	} else {
		return null;
	}
	return true;
}


function fiFloatingIconIsExist () {
    return document.getElementById('furiganaize_use_mobile_floating_button')
}

function fiToggleFloatingIcon() {
    const el = fiFloatingIconIsExist()
    if (el) {
        el.remove()
    } else {
        fiAddFloatingIcon()
    }
}

function fiRemoveFloatingIcon() {
    const el = fiFloatingIconIsExist()
    if (el) { el.remove() }
}

async function safeToggleFurigana() {
    if ((typeof toggleFurigana) !== 'function') {
        await browser.runtime.sendMessage({ message: "force_load_dom_parser" })
    }
    fiRemoveNoScriptTags()
    toggleFurigana()  // In `text_to_furigana_dom_parse.js`
}

function fiAddFloatingIcon() {
    const existed = fiFloatingIconIsExist()
    if (existed) {
        existed.remove()
    }
    const div = document.createElement('div')
    const span = document.createElement('span')
    div.id = 'furiganaize_use_mobile_floating_button'
    span.innerText = `ふ`
    div.append(span)
    // TODO: Draggable floating button
    // div.draggable = true
    // div.ondrag = function (ev) {
    //     console.log(ev)
    // }
    div.onclick = function () { safeToggleFurigana() }
    const styleEl = document.createElement('style')
    styleEl.innerText = `
    #furiganaize_use_mobile_floating_button {
        position: fixed;
        right: 20px;
        bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background : #eeeeee;
        border: 1px solid #aaa;
        border-radius: 2rem;
        width: 4rem;
        height: 4rem;
        cursor: pointer;
        user-select: none;
        font-family: sans;
    }
    #furiganaize_use_mobile_floating_button span {
        font-size: 3rem;
        user-select: none;
        margin-top: -0.5rem;
    }
    #furiganaize_use_mobile_floating_button:active {
        background: #cccccc;
    }
    `
    document.body.append(div)
    document.body.append(styleEl)
}
/** <noscript> tag will cause many issues to Furiganaize, for example:
 *   - Google: force reload / redirect page. (Clue: 1. Use window.beforeunload to avoid reload, then insert furigana. 2. A suspicious style tag is found: <style>table,div,span,p{display:none}</style> 3. This tag is in <noscript>)
 *   - Twitter: the whole page becomes blank.
 * so remove it before inserting furigana.
 **/
function fiRemoveNoScriptTags() {
    document.querySelectorAll('noscript').forEach(el => el.remove())
}