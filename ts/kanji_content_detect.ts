/***************************************************************
 *	This script set to run_at document load. See manifest.json.
 ***************************************************************/
var USER_KANJI_REGEXP;
var INCLUDE_LINK_TEXT = false;
var INSERTED_NODES_TO_CHECK: Node[] = [];
var INSERTED_NODE_CHECK_TIMEOUT_ID = -1;
var MUTATION_OBSERVER: MutationObserver | null = null
var PERSISTENT_MODE

// Add an empty onunload function to force run this content_script even when back/forward
// https://stackoverflow.com/questions/2638292/after-travelling-back-in-firefox-history-javascript-wont-run
window.addEventListener('unload', function () { })

function autoSetBrowserActionIcon() {
    const state = document.body.hasAttribute("fiprocessed") ? 'INSERTED' : 'UNTOUCHED'
    browser.runtime.sendMessage({ message: "set_page_action_icon_status", value: state });
    return state
}

browser.runtime.sendMessage({ message: "config_values_request" }).then(function (response) {
    const alreadyEnabled = autoSetBrowserActionIcon() === 'INSERTED' // TODO: Use MutationObserver to auto call this function?
    if (alreadyEnabled) {
        // REFACTORING: May needn't because never happened after adding document.onunload ...?
        // If already enabled, just init dom_parser directly without detecting kanji again.
        // This situation may happened when using back/next of browser
        browser.runtime.sendMessage({ message: "init_dom_parser_for_tab" });
        return
    }
	USER_KANJI_REGEXP = new RegExp("[" + response.userKanjiList + "]");
	INCLUDE_LINK_TEXT = JSON.parse(response.includeLinkText);
	PERSISTENT_MODE = JSON.parse(response.persistentMode);
	let useMobileFloatingButton = JSON.parse(response.useMobileFloatingButton);
    let globallyShowMobileFloatingButton = JSON.parse(response.globallyShowMobileFloatingButton);
    if (globallyShowMobileFloatingButton) {
        fiAddFloatingIcon()
    }
	// Having received the config data, start searching for relevant kanji
	// If none find, do nothing for now except start a listener for node insertions
	// If persistent mode enabled - enable furigana right away
	if (document.body.innerText.match(/[\u3400-\u9FBF]/) || PERSISTENT_MODE || globallyShowMobileFloatingButton) {
		browser.runtime.sendMessage({message: "init_dom_parser_for_tab"});
    } else {
        MUTATION_OBSERVER = new MutationObserver(DOMNodeInsertedHandler);
        MUTATION_OBSERVER.observe(document, { childList: true, subtree: true });
    }
});

/** Node Tools */
class NT {
    static isElement(x: Node): x is HTMLElement { return x.nodeType === Node.ELEMENT_NODE }
    static isText(x: Node): x is Text { return x.nodeType === Node.TEXT_NODE }
    static isCdataSection(x: Node): x is CDATASection { return x.nodeType === Node.CDATA_SECTION_NODE }
    static isTextOrCdataSection(x: Node): x is Text | CDATASection { return x.nodeType === Node.CDATA_SECTION_NODE }
}
    // function isElementNode(x: Node): x is Element { return x.nodeType === Node.ELEMENT_NODE }

function DOMNodeInsertedHandler(mutationList: MutationRecord[], observer: MutationObserver) {
    for (let mutation of mutationList) {
        if (mutation.type === 'childList') {
            const tar = mutation.target
            if (INSERTED_NODES_TO_CHECK.includes(tar)) { continue }
            if (INSERTED_NODES_TO_CHECK.includes(tar.parentNode!)) { continue }
            if ((NT.isTextOrCdataSection(tar)) &&
                tar.textContent !== undefined &&
                tar.textContent !== '' &&
                tar.parentNode) {
                // console.log('type 1', target)
                INSERTED_NODES_TO_CHECK.push(tar.parentNode)
            } else if (
                NT.isElement(tar) &&
                tar.tagName !== "IMG" &&
                tar.tagName !== "SVG" &&
                tar.tagName !== "CANVAS" &&
                tar.tagName !== "OBJECT" &&
                tar.tagName !== "EMBED" &&
                tar.tagName !== "BODY" &&
                tar.tagName !== "HEAD" &&
                tar.innerText !== undefined &&
                tar.innerText !== ''
            ) {
                // console.log('type 2', target)
                INSERTED_NODES_TO_CHECK.push(tar);
            } else {
                return;
            }
            window.clearTimeout(INSERTED_NODE_CHECK_TIMEOUT_ID)
            INSERTED_NODE_CHECK_TIMEOUT_ID = window.setTimeout(processChangedNodes, 1000);
         }
    }
}


function processChangedNodes() {
    for (const node of INSERTED_NODES_TO_CHECK) {
        if (node.innerText.length === 0) { continue }
        if (node.innerText.match(/[\u3400-\u9FBF]/)) {
            browser.runtime.sendMessage({message: "init_dom_parser_for_tab"});
            MUTATION_OBSERVER.disconnect()
            break
        }
    }
	INSERTED_NODES_TO_CHECK = [];
	INSERTED_NODE_CHECK_TIMEOUT_ID = -1;
}

// function hasOnlySimpleKanji(rubySubstr) {
// 	var foundKanji = rubySubstr.match(/[\u3400-\u9FBF]/g);
// 	if (foundKanji) {
// 		for (var x = 0; x < foundKanji.length; x++) {
// 			if (!USER_KANJI_REGEXP.exec(foundKanji[x]))
// 				return false;
// 		}
// 	} else {
// 		return null;
// 	}
// 	return true;
// }


function fiFloatingIconIsExist () {
    return document.getElementById('furiganaize_buttons_container')
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
function transposeFloatButton() {
    const el = document.querySelector('#furiganaize_buttons_container')
    if (!el) {
        console.error('[To Developer] This should not happened.')
        return
    }
    if (el.classList.contains('leftSide')) {
        el.classList.remove('leftSide')
    } else {
        el.classList.add('leftSide')
    }
}

function fiAddFloatingIcon() {
    const existed = fiFloatingIconIsExist()
    if (existed) {
        existed.remove()
    }

    const btnsWrapper = document.createElement('div')
    btnsWrapper.id = 'furiganaize_buttons_container'
    const ledIndicator = document.createElement('div')
    ledIndicator.classList.add('led_indicator')
    ledIndicator.classList.add('red')
    const triggerBtn = document.createElement('div')
    triggerBtn.id = 'furiganaize_trigger_button'
    triggerBtn.classList.add('furiganaize_button')
    const transposeBtn = document.createElement('div')
    transposeBtn.id = 'furiganaize_transpose_button'
    transposeBtn.classList.add('furiganaize_button')
    transposeBtn.innerText = 'うつす'
    btnsWrapper.appendChild(triggerBtn)
    btnsWrapper.appendChild(ledIndicator)
    btnsWrapper.appendChild(transposeBtn)
    const fu = document.createElement('span')
    fu.innerText = `ふ`
    triggerBtn.append(fu)
    // TODO: Draggable floating button
    // div.draggable = true
    // div.ondrag = function (ev) {
    //     console.log(ev)
    // }
    triggerBtn.onclick = function () { safeToggleFurigana() }
    transposeBtn.onclick = function () { transposeFloatButton() }
    const styleEl = document.createElement('style')
    styleEl.innerText = `
    #furiganaize_buttons_container {
        position: fixed;
        bottom: 30px;
        display: flex;
        flex-direction: column;
        right: 20px;
        z-index: 555555;
    }
    #furiganaize_buttons_container.leftSide {
        left: 20px;
    }
    #furiganaize_buttons_container .led_indicator {
        display: block;
        position: absolute;
        top: 4px;
        left: 4px;
        width: 6px;
        height: 6px;
        border-radius: 6px;
        border: 1px solid #333333;
        background: #666666
    }
    #furiganaize_buttons_container .led_indicator.purple {
        border: 1px solid #5500a1;
        background: #ee33f1
    }
    #furiganaize_buttons_container .led_indicator.red {
        border: 1px solid #660000;
        background: #ff6666
    }
    #furiganaize_buttons_container .led_indicator.green {
        border: 1px solid #337700;
        background: #99dd22
    }
    #furiganaize_trigger_button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
    }
    #furiganaize_trigger_button span {
        font-size: 40px;
        user-select: none;
        margin-top: -0.5rem;
    }
    .furiganaize_button {
        color: #000000;
        background : #eeeeee;
        border: 1px solid #aaa;
        margin-top: -1px;
        cursor: pointer;
        user-select: none;
        font-family: sans;
        width: 50px;

    }
    .furiganaize_button:active {
        background: #cccccc;
    }
    #furiganaize_buttons_container.busy .furiganaize_button {
        background: #cccccc;
        pointer-events: none;
    }
    #furiganaize_buttons_container.busy .furiganaize_button span,
    #furiganaize_buttons_container.busy .led_indicator {
        animation: furiganaize_blinking 0.5s linear infinite;
    }
    #furiganaize_transpose_button {
        text-align: center;
        font-size: 12px;
    }

    @keyframes furiganaize_blinking {
        50% { opacity: 0.2; }
    }
    `
    document.body.append(btnsWrapper)
    document.body.append(styleEl)
}

type furiganaize_state_t = 'UNTOUCHED' | 'PROCESSING' | 'INSERTED'

function fiSetFloatingButtonState(state: furiganaize_state_t) {
    const wrapper = document.querySelector('#furiganaize_buttons_container')
    if (!wrapper) { return }
    const led = document.querySelector('#furiganaize_buttons_container .led_indicator')
    if (!led) { return }
    led.className = 'led_indicator'
    // console.trace('Button====>', wrapper, state)
    switch (state) {
        case 'UNTOUCHED': {
            wrapper.classList.remove('busy')
            led.classList.add('red')
            break
        }
        case 'PROCESSING': {
            wrapper.classList.add('busy')
            led.classList.add('purple')
            break
        }
        case 'INSERTED': {
            wrapper.classList.remove('busy')
            led.classList.add('green')
            break
        }
    }
}

/** <noscript> tag will cause many issues to Furiganaize, for example:
 *   - Google: force reload / redirect page. (Clue: 1. Use window.beforeunload to avoid reload, then insert furigana. 2. A suspicious style tag is found: <style>table,div,span,p{display:none}</style> 3. This tag is in <noscript>)
 *   - Twitter: the whole page becomes blank.
 * so remove it before inserting furigana.
 **/
function fiRemoveNoScriptTags() {
    document.querySelectorAll('noscript').forEach(el => el.remove())
}
