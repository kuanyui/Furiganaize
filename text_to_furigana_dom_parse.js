﻿var USER_KANJI_REGEXP;
var INCLUDE_LINK_TEXT;
var KANJI_TEXT_NODES = {};
var SUBMITTED_KANJI_TEXT_NODES = {};
// May re-declare
var PERSISTENT_MODE;
/** Cross-tab keep on/off status. For PERSISTENT_MODE.  Not for settings. */
var CROSS_TABS_FURIGANA_ENABLED;
var AUTO_START;
// For dynamic Nodes (dynamically inserted / changed Nodes)
var WATCH_PAGE_CHANGE;
var MUTATION_OBSERVER_FOR_INSERTING_FURIGANA = null
var DYNAMICALLY_CHANGED_NODES = []

var __LAST_UID = 0
function getNextUid() {
    if (__LAST_UID === Number.MAX_SAFE_INTEGER - 1) {
        __LAST_UID = 0
    }
    __LAST_UID += 1
    return __LAST_UID
}

// fetch stored configuration values from the background script
browser.runtime.sendMessage({ message: "config_values_request" }).then(function (response) {
    console.log('bg.crossTabsFuriganaEnabled', JSON.parse(response.crossTabsFuriganaEnabled))
    USER_KANJI_REGEXP = new RegExp("[" + response.userKanjiList + "]");
    INCLUDE_LINK_TEXT = JSON.parse(response.includeLinkText);
    WATCH_PAGE_CHANGE = JSON.parse(response.watchPageChange);

    PERSISTENT_MODE = JSON.parse(response.persistentMode);
    CROSS_TABS_FURIGANA_ENABLED = JSON.parse(response.crossTabsFuriganaEnabled);
    AUTO_START = JSON.parse(response.autoStart);
    //Parse for kanji and insert furigana immediately if persistent mode is enabled
    if (PERSISTENT_MODE && CROSS_TABS_FURIGANA_ENABLED) {
        enableFurigana();
    }
    if (PERSISTENT_MODE && AUTO_START){   // FIXME: Remove AUTO_START?
        //waiting for dictionary to load
        setTimeout(enableFurigana, 1000);
    }
});

/*****************
 *	Functions
 *****************/
function scanForKanjiTextNodes(contextNode) {
    if (!contextNode) {
        contextNode = document.body
    }
    //Scan all text for /[\u3400-\u9FBF]/, then add each text node that isn't made up only of kanji only in the user's simple kanji list
    const xPathPattern = '//*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)and not(ancestor-or-self::ruby)' + (INCLUDE_LINK_TEXT ? '' : ' and not(ancestor-or-self::a)') + ']/text()[normalize-space(.) != ""]';
    var foundNodes = {};
    try {
        var iterator = document.evaluate(xPathPattern, contextNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        var thisNode;
        while (thisNode = iterator.iterateNext()) {
            if (thisNode.parentElement && thisNode.parentElement.isContentEditable) { continue }
            if (thisNode.nodeType === Node.ELEMENT_NODE && thisNode.isContentEditable) { continue }
            if (thisNode.textContent.match(/[\u3400-\u9FBF]/)) {
                var uid = getNextUid()
                foundNodes[uid] = thisNode;
            }
        }
    } catch (e) {
        alert('Error during XPath document iteration: ' + e);
    }
    return foundNodes;
}

function submitKanjiTextNodes(keepAllRuby=undefined) {
    var msgData = {
        message: "text_to_furiganize",
        keepAllRuby: keepAllRuby
    };
    msgData.textMapNeedFuriganaize = {};
    var strLength = 0;
    for (key in KANJI_TEXT_NODES) {
        if (KANJI_TEXT_NODES[key] && KANJI_TEXT_NODES[key].data) {
            strLength += KANJI_TEXT_NODES[key].data.length;
            msgData.textMapNeedFuriganaize[key] = KANJI_TEXT_NODES[key].data;
            //reduce the nodes just to strings for passing to the background page.
            SUBMITTED_KANJI_TEXT_NODES[key] = KANJI_TEXT_NODES[key];
        }
        //unset each member as done.
        delete KANJI_TEXT_NODES[key];
    }
    browser.runtime.sendMessage(msgData, function(response) {});
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

function isEmpty(obj) {
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
 * Called by kanji_content_detect.
 * When user clicks browserAction, this function would be invoked.
 */
function toggleFurigana() {
    const pageIsProcessed = document.body.hasAttribute("fiprocessed")
    console.log('PERSISTENT_MODE  ==', PERSISTENT_MODE)
    console.log('Original CROSS_TABS_FURIGANA_ENABLED ==', CROSS_TABS_FURIGANA_ENABLED)
    if (PERSISTENT_MODE) {
        if (CROSS_TABS_FURIGANA_ENABLED) {
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
        if (WATCH_PAGE_CHANGE) {
            startWatcher()
        }
        return
    }
    KANJI_TEXT_NODES = scanForKanjiTextNodes();
    if (!isEmpty(KANJI_TEXT_NODES) || PERSISTENT_MODE) {
        document.body.setAttribute("fiprocessed", "true");
        //The background page will respond with data including a "furiganizedTextNodes" member, see below.
        submitKanjiTextNodes();
    } else {
        // alert("No text with kanji found. Sorry, false alarm!");
    }
    if (WATCH_PAGE_CHANGE) {
        startWatcher()
    }
    if (PERSISTENT_MODE) {
        browser.runtime.sendMessage({ message: 'set_cross_tabs_furigana_enabled', value: true })
    }
    CROSS_TABS_FURIGANA_ENABLED = true
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
    if (WATCH_PAGE_CHANGE) {
        stopWatcher()
    }
    KANJI_TEXT_NODES = {};
    document.body.removeAttribute("fiprocessed");
    if (PERSISTENT_MODE) {
        browser.runtime.sendMessage({ message: 'set_cross_tabs_furigana_enabled', value: false })
    }
    CROSS_TABS_FURIGANA_ENABLED = false
    document.FURIGANAIZE_ENABLED = false
}

/*** Events ***/
browser.runtime.onMessage.addListener(
    function(request, sender, sendResponseCallback) {
        if (request.furiganizedTextNodes) {
            // NOTE: When furiganaize has been disabled, this request should be ignored. Because a debounce is existed, this request may come after disabling Furiganaize.
            if (!document.FURIGANAIZE_ENABLED) { return }
            if (WATCH_PAGE_CHANGE) { stopWatcher() }  // 1. pause watcher when inserting <ruby> (to prevent infinite loop of mutation)
            for (key in request.furiganizedTextNodes) {
                if (SUBMITTED_KANJI_TEXT_NODES[key]) {
                    var tempDocFrag = document.createDocumentFragment();
                    var dummyParent = document.createElement("DIV");
                    dummyParent.innerHTML = request.furiganizedTextNodes[key];
                    while (dummyParent.firstChild) {
                        tempDocFrag.appendChild(dummyParent.firstChild);
                    }
                    if (SUBMITTED_KANJI_TEXT_NODES[key].parentNode) {
                        SUBMITTED_KANJI_TEXT_NODES[key].parentNode.replaceChild(tempDocFrag, SUBMITTED_KANJI_TEXT_NODES[key]);
                    }
                    delete SUBMITTED_KANJI_TEXT_NODES[key];
                }
            }
            if (WATCH_PAGE_CHANGE) { startWatcher() } // 2. resume watcher after the insertion of <ruby> finished
            if (!isEmpty(KANJI_TEXT_NODES)) {
                submitKanjiTextNodes();
            } else {
                KANJI_TEXT_NODES = {};
                document.body.setAttribute("fiprocessed", "true");
                autoSetBrowserActionIcon()
            }
            fiSetFloatingButtonState('INSERTED')
        } else {
            console.log("Unexpected msg received from extension script: " + JSON.stringify(data).substr(0, 200));

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
var NODE_WATCHER_DEBOUNCE_TIMEOUT_ID = null
function nodeWatcherFn(mutationList, observer) {
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
function pushDynamicallyChangedNodes(node) {
    if (DYNAMICALLY_CHANGED_NODES.includes(node)) {
        return
    }
    if (DYNAMICALLY_CHANGED_NODES.includes(node.parentNode)) {
        return
    }
    if (node.parentElement && node.parentElement.isContentEditable) {
        return
    }
    if (node.nodeType === Node.ELEMENT_NODE && node.isContentEditable) {
        return
    }
    if ((node.nodeType == Node.TEXT_NODE || node.nodeType == Node.CDATA_SECTION_NODE) &&
        node.innerText !== undefined &&
        node.innerText !== '' &&
        node.parentNode) {
        DYNAMICALLY_CHANGED_NODES.push(node.parentNode)
        return
    }
    if (
        node.nodeType === Node.ELEMENT_NODE &&
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
    NODE_WATCHER_TIMEOUT_ID = null;
    while (DYNAMICALLY_CHANGED_NODES.length) {
        const node = DYNAMICALLY_CHANGED_NODES.pop()
        const textNodesObj = scanForKanjiTextNodes(node)
        Object.assign(KANJI_TEXT_NODES, textNodesObj)
    }
    submitKanjiTextNodes()
}