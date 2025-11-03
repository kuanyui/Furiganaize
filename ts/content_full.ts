/** For read synchronously in content script. */
var STORAGE: MyStorageRoot;

var KANJI_TEXT_NODES: Record<number, Text> = {}
var SUBMITTED_KANJI_TEXT_NODES: Record<string, Text> = {}

var MUTATION_OBSERVER_FOR_INSERTING_FURIGANA: MutationObserver | null = null
var DYNAMICALLY_CHANGED_NODES: Node[] = []

var __LAST_UID = 0
function getNextUid() {
    if (__LAST_UID === Number.MAX_SAFE_INTEGER - 1) {
        __LAST_UID = 0
    }
    __LAST_UID += 1
    return __LAST_UID
}

// fetch stored configuration values from the background script
browser.runtime.sendMessage({ message: "request_storage_root" }).then(function (_root) {
    STORAGE = _root

    //Parse for kanji and insert furigana immediately if persistent mode is enabled
    if (STORAGE.settings.persistent_mode && STORAGE.state.persistent_mode__all_tabs_show_furigana) {
        enableFurigana();
    }
    if (STORAGE.settings.persistent_mode && STORAGE.settings.auto_start){   // FIXME: Remove AUTO_START?
        //waiting for dictionary to load
        setTimeout(enableFurigana, 1000);
    }
});

/*****************
 *	Functions
 *****************/
function scanForKanjiTextNodes(contextNode?: Node): Record<number, Text> {
    if (!contextNode) {
        contextNode = document.body
    }
    // @see https://www.w3.org/TR/2017/REC-xpath-31-20170321/
    // ancestor::div        selects all div ancestors of the context node
    const _xPathAnd: string[] = [
        'not(ancestor-or-self::head)',
        'not(ancestor-or-self::script)',
        'not(ancestor-or-self::style)',
        'not(ancestor::select)',
        'not(ancestor-or-self::svg)',
        'not(ancestor-or-self::ruby)',
        'not(ancestor-or-self::canvas)',
        'not(ancestor-or-self::object)',  // is this truly necessary?
        'not(ancestor-or-self::img)',     // is this truly necessary?
        // NOTE: the Text node must NOT have any ancestor Element is contenteditable.
        // But this syntax cannot be interpreted by Firefox correctly...
        // 'not(ancestor-or-self::*[attribute::contenteditable eq "true"])'
    ]
    if (!STORAGE.settings.include_link_text) {
        _xPathAnd.push('not(ancestor-or-self::a)')
    }
    //Scan all text for /[\u3400-\u9FBF]/, then add each text node that isn't made up only of kanji only in the user's simple kanji list
    const xPathPattern = `//*[${_xPathAnd.join(' and ')}]/text()[normalize-space(.) != ""]`;
    var foundTextNodes: Record<number, Text> = {}
    try {
        var iterator = document.evaluate(xPathPattern, contextNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        var node: Text
        while (node = iterator.iterateNext() as Text) {
            if (node.textContent && node.textContent.match(/[\u3400-\u9FBF]/)) {  // TODO: REFACTOR
                var uid = getNextUid()
                foundTextNodes[uid] = node;
            }
        }
    } catch (e) {
        alert('Error during XPath document iteration: ' + e);
    }
    return foundTextNodes;
}


function submitKanjiTextNodes() {
    fiSetFloatingButtonState('PROCESSING')
    browser.runtime.sendMessage({ message: "set_page_action_icon_status", value: 'PROCESSING' });
    const msgData: MsgTab2Bg = {
        message: "text_to_furiganize",
        textMapNeedFuriganaize: {}
    };
    for (const key in KANJI_TEXT_NODES) {
        const node = KANJI_TEXT_NODES[key]
        if (node && node.data) {
            msgData.textMapNeedFuriganaize[key] = node.data;
            //reduce the nodes just to strings for passing to the background page.
            SUBMITTED_KANJI_TEXT_NODES[key] = node
        }
        //unset each member as done.
        delete KANJI_TEXT_NODES[key];
    }
    browser.runtime.sendMessage(msgData)
}

function revertRubies() {
    browser.runtime.sendMessage({ message: "set_page_action_icon_status", value: 'PROCESSING' });
    document.querySelectorAll("rp,rt").forEach(x=>x.remove())
    var rubies = document.getElementsByTagName("RUBY");
    const parentElMap = new Map()
    for (const rubyElem of rubies) {
        var parentNode = rubyElem.parentNode;
        let arr = parentElMap.get(parentNode)
        if (!arr) {
            arr = []
            parentElMap.set(parentNode, arr)
        }
        arr.push(rubyElem)
    }
    for (const x of parentElMap.entries()) {
        const parentNode = x[0]
        const rubyElems = x[1]
        if (parentNode.nodeType === Node.ELEMENT_NODE) {
            parentNode.innerHTML = parentNode.innerHTML.replace(/<[/]?(ruby|rb)>/ig, '')
            // parentNode.normalize();
        } else {
            for (const rubyElem of rubyElems) {
                parentNode.replaceChild(document.createTextNode(rubyElem.textContent), rubyElems);
            }
        }
    }
    document.body.removeAttribute("fiprocessed");
    browser.runtime.sendMessage({ message: "set_page_action_icon_status", value: 'UNTOUCHED' });
    fiSetFloatingButtonState('UNTOUCHED')
}

function isEmptyObject(obj: object) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

console.log('dom_parse executed!')
// function autoSetBrowserActionIcon() {
//     const enabled = document.body.hasAttribute("fiprocessed")
//     browser.runtime.sendMessage({ message: "set_page_action_icon_status", value: enabled });
// }
// autoSetBrowserActionIcon()

/**
 * Called by content_preload.
 * When user clicks browserAction, this function would be invoked.
 */
function toggleFurigana() {
    const pageIsProcessed = document.body.hasAttribute("fiprocessed")
    console.log('STORAGE.settings.persistent_mode  ==', STORAGE.settings.persistent_mode)
    console.log('Original STORAGE.state.persistent_mode__all_tabs_show_furigana ==', STORAGE.state.persistent_mode__all_tabs_show_furigana)
    if (STORAGE.settings.persistent_mode) {
        if (STORAGE.state.persistent_mode__all_tabs_show_furigana) {
            if (pageIsProcessed) {
                disableFurigana()
            }
        } else {
            if (!pageIsProcessed) {
                enableFurigana()
            }
        }
        autoSetBrowserActionIcon()
        return
    }
    if (pageIsProcessed) {
        disableFurigana()
    } else {
        enableFurigana()
    }
}

function enableFurigana() {
    fiSetFloatingButtonState('PROCESSING')
    console.log('enableFurigana()')
    if (document.body.hasAttribute("fiprocessed")) {  // If already enabled (this may happened when using back/next of browser)  // REFACTORING: May needn't because never happened after adding document.onunload ...?
        console.log('============ has already processed before, skip.')
        if (STORAGE.settings.watch_page_change) {
            startWatcher()
        }
        return
    }
    KANJI_TEXT_NODES = scanForKanjiTextNodes();
    if (!isEmptyObject(KANJI_TEXT_NODES) || STORAGE.settings.persistent_mode) {
        document.body.setAttribute("fiprocessed", "true");
        //The background page will respond with data including a "furiganizedTextNodes" member, see below.
        submitKanjiTextNodes();
    } else {
        // alert("No text with kanji found. Sorry, false alarm!");
    }
    if (STORAGE.settings.watch_page_change) {
        startWatcher()
    }
    if (STORAGE.settings.persistent_mode) {
        browser.runtime.sendMessage({ message: 'set_cross_tabs_furigana_enabled', value: true })
    }
    STORAGE.state.persistent_mode__all_tabs_show_furigana = true
    document.FURIGANAIZE_ENABLED = true
}

function disableFurigana() {
    fiSetFloatingButtonState('PROCESSING')
    console.log('disableFurigana()')
    if (!document.body.hasAttribute("fiprocessed")) {
        return
    }
    revertRubies();
    autoSetBrowserActionIcon()
    if (STORAGE.settings.watch_page_change) {
        stopWatcher()
    }
    KANJI_TEXT_NODES = {};
    document.body.removeAttribute("fiprocessed");
    if (STORAGE.settings.persistent_mode) {
        browser.runtime.sendMessage({ message: 'set_cross_tabs_furigana_enabled', value: false })
    }
    STORAGE.state.persistent_mode__all_tabs_show_furigana = false
    document.FURIGANAIZE_ENABLED = false
}

/*** Events ***/
browser.runtime.onMessage.addListener((_msg: any, sender: browser.runtime.MessageSender) => {
    const msg: MsgBg2Tab = _msg
    if (msg.furiganizedTextNodes) {
        // NOTE: When furiganaize has been disabled, this request should be ignored. Because a debounce is existed, this request may come after disabling Furiganaize.
        if (!document.FURIGANAIZE_ENABLED) {
            browser.runtime.sendMessage({ message: "set_page_action_icon_status", value: 'UNTOUCHED' });
            fiSetFloatingButtonState('UNTOUCHED')
            return
        }
        if (STORAGE.settings.watch_page_change) { stopWatcher() }  // 1. pause watcher when inserting <ruby> (to prevent infinite loop of mutation)
        for (const key in msg.furiganizedTextNodes) {
            if (SUBMITTED_KANJI_TEXT_NODES[key]) {
                var tempDocFrag = document.createDocumentFragment();
                var dummyParent = document.createElement("DIV");
                dummyParent.innerHTML = msg.furiganizedTextNodes[key];
                while (dummyParent.firstChild) {
                    tempDocFrag.appendChild(dummyParent.firstChild);
                }
                const parentNode = SUBMITTED_KANJI_TEXT_NODES[key].parentNode
                if (parentNode) {
                    parentNode.replaceChild(tempDocFrag, SUBMITTED_KANJI_TEXT_NODES[key]);
                }
                delete SUBMITTED_KANJI_TEXT_NODES[key];
            }
        }
        if (STORAGE.settings.watch_page_change) { startWatcher() } // 2. resume watcher after the insertion of <ruby> finished
        if (!isEmptyObject(KANJI_TEXT_NODES)) {
            submitKanjiTextNodes();
        } else {
            KANJI_TEXT_NODES = {};
            document.body.setAttribute("fiprocessed", "true");
            autoSetBrowserActionIcon()
        }
        fiSetFloatingButtonState('INSERTED')
    } else {
        console.log("Unexpected msg received from background script: ", msg)

    }
}
);

function startWatcher() {
    if (MUTATION_OBSERVER_FOR_INSERTING_FURIGANA) {
        console.log('[Furiganaize][DEBUG](skip) Dynamic content mutation observer existed, skip.')
        return
    }
    console.log('[Furiganaize][DEBUG] =====> Dynamic content mutation observer started.')
    MUTATION_OBSERVER_FOR_INSERTING_FURIGANA = new MutationObserver(nodeWatcherFn);
    MUTATION_OBSERVER_FOR_INSERTING_FURIGANA.observe(document, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}
function stopWatcher() {
    console.log('[Furiganaize][DEBUG] =====> Dynamic content mutation observer stop.')
    if (!MUTATION_OBSERVER_FOR_INSERTING_FURIGANA) { return }
    MUTATION_OBSERVER_FOR_INSERTING_FURIGANA.disconnect()
    MUTATION_OBSERVER_FOR_INSERTING_FURIGANA = null
}
var NODE_WATCHER_DEBOUNCE_TIMEOUT_ID = -1
function nodeWatcherFn(mutationList: MutationRecord[], observer: MutationObserver) {
    for (let mutation of mutationList) {
        if (mutation.type === 'childList') {
            const e = mutation;
            pushDynamicallyChangedNodes(e.target)
            // Seems unnecessary
            // for (const node of e.addedNodes) {
            //     pushDynamicallyChangedNodes(node)
            // }
        }
    }
    window.clearTimeout(NODE_WATCHER_DEBOUNCE_TIMEOUT_ID)
    NODE_WATCHER_DEBOUNCE_TIMEOUT_ID = window.setTimeout(processDynamicallyChangedNodes, 500);
    // console.log('setTimout...', NODE_WATCHER_DEBOUNCE_TIMEOUT_ID)
}
function pushDynamicallyChangedNodes(node: Node) {
    if (DYNAMICALLY_CHANGED_NODES.includes(node)) {
        return
    }
    if (DYNAMICALLY_CHANGED_NODES.includes(node.parentNode!)) {
        return
    }
    if (node.parentElement && node.parentElement.isContentEditable) {
        return
    }
    if (NT.isElement(node) && node.isContentEditable) {
        return
    }
    if (NT.isTextOrCdataSection(node) &&
        node.textContent !== undefined &&
        node.textContent !== '' &&
        node.parentNode) {
        DYNAMICALLY_CHANGED_NODES.push(node.parentNode)
        return
    }
    if (
        NT.isElement(node) &&
        node.tagName !== "IMG" &&
        node.tagName !== "SVG" &&
        node.tagName !== "CANVAS" &&
        node.tagName !== "OBJECT" &&
        node.tagName !== "EMBED" &&
        node.tagName !== "HTML" &&
        node.tagName !== "BODY" &&
        node.tagName !== "HEAD" &&
        node.innerText !== undefined &&
        node.innerText !== '' &&
        node.innerText.match(/[\u3400-\u9FBF]/)
    ) {
        DYNAMICALLY_CHANGED_NODES.push(node);
        return
    }
}
function processDynamicallyChangedNodes() {
    // console.log('==================================================> Process dynamic changed nodes!', DYNAMICALLY_CHANGED_NODES)
    NODE_WATCHER_DEBOUNCE_TIMEOUT_ID = -1;
    while (DYNAMICALLY_CHANGED_NODES.length) {
        const node = DYNAMICALLY_CHANGED_NODES.pop()
        const textNodesObj = scanForKanjiTextNodes(node)
        Object.assign(KANJI_TEXT_NODES, textNodesObj)
    }
    submitKanjiTextNodes()
}
