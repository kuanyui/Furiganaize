var USER_KANJI_REGEXP;
var INCLUDE_LINK_TEXT;
var KANJI_TEXT_NODES = {};
var SUBMITTED_KANJI_TEXT_NODES = {};

// fetch stored configuration values from the background script
browser.runtime.sendMessage({ message: "config_values_request"}).then(function(response) {
    USER_KANJI_REGEXP = new RegExp("[" + response.userKanjiList + "]");
    INCLUDE_LINK_TEXT = JSON.parse(response.includeLinkText);
    persistentMode = JSON.parse(response.persistentMode);
    furiganaEnabled = JSON.parse(response.furiganaEnabled);
    autoStart = JSON.parse(response.autoStart);
    //Parse for kanji and insert furigana immediately if persistent mode is enabled
    if (persistentMode && furiganaEnabled) {
        enableFurigana();
    }
    if (persistentMode && autoStart){
        //waiting for dictionary to load
        setTimeout(enableFurigana, 1000);
    }
});

/*****************
 *	Functions
 *****************/
function scanForKanjiTextNodes() {
    //Scan all text for /[\u3400-\u9FBF]/, then add each text node that isn't made up only of kanji only in the user's simple kanji list
    var xPathPattern = '//*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)and not(ancestor-or-self::ruby)' + (INCLUDE_LINK_TEXT ? '' : ' and not(ancestor-or-self::a)') + ']/text()[normalize-space(.) != ""]';
    var foundNodes = {};
    try {
        var iterator = document.evaluate(xPathPattern, document.body, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        var nodeCtr = 100;
        var thisNode;
        while (thisNode = iterator.iterateNext()) {
            if (thisNode.textContent.match(/[\u3400-\u9FBF]/)) {
                foundNodes[nodeCtr] = thisNode;
            }
            nodeCtr++;
        }
    } catch (e) {
        alert('Error during XPath document iteration: ' + e);
    }
    return foundNodes;
}

function submitKanjiTextNodes(keepAllRuby) {
    var msgData = {
        message: "text_to_furiganize",
        keepAllRuby: keepAllRuby
    };
    msgData.textToFuriganize = {};
    var strLength = 0;
    for (key in KANJI_TEXT_NODES) {
        if (KANJI_TEXT_NODES[key] && KANJI_TEXT_NODES[key].data) {
            strLength += KANJI_TEXT_NODES[key].data.length;
            msgData.textToFuriganize[key] = KANJI_TEXT_NODES[key].data;
            //reduce the nodes just to strings for passing to the background page.
            SUBMITTED_KANJI_TEXT_NODES[key] = KANJI_TEXT_NODES[key];
        }
        //unset each member as done.
        delete KANJI_TEXT_NODES[key];
    }
    browser.runtime.sendMessage(msgData, function(response) {});
}

function revertRubies() {
    document.querySelectorAll("rp,rt").forEach(x=>x.remove())
    var rubies = document.getElementsByTagName("RUBY");
    while (rubies.length > 0) {
        //this iterates because this item will be removed, shortening the list
        var rubyElem = rubies.item(0);
        var newText = "";
        var childNd = rubyElem.firstChild;
        var parentNd = rubyElem.parentNode;
        while (childNd) {
            // newText += childNd.nodeType == Node.TEXT_NODE ? childNd.data : (childNd.tagName != "RT" && childNd.tagName != "RP" ? childNd.textContent : "");
            newText += childNd.nodeType == Node.TEXT_NODE ? childNd.data : childNd.textContent;
            childNd = childNd.nextSibling;
        }
        parentNd.replaceChild(document.createTextNode(newText), rubyElem);
        parentNd.normalize();
    }
    document.body.removeAttribute("fiprocessed");
}

function isEmpty(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

function toggleFurigana() {
    if (document.body.hasAttribute("fiprocessed")) {
        revertRubies();
        browser.runtime.sendMessage({
            message: "reset_page_action_icon"
            //icon can only be changed by background page
        }, function(response) {});
        KANJI_TEXT_NODES = {};
    } else {
        KANJI_TEXT_NODES = scanForKanjiTextNodes();
        if (!isEmpty(KANJI_TEXT_NODES) || persistentMode) {
            document.body.setAttribute("fiprocessed", "true");
            //The background page will respond with data including a "furiganizedTextNodes" member, see below.
            submitKanjiTextNodes(false);
        } else {
            alert("No text with kanji above your level found. Sorry, false alarm!");
        }
    }
}

function enableFurigana() {
    KANJI_TEXT_NODES = scanForKanjiTextNodes();
    if (!isEmpty(KANJI_TEXT_NODES) || persistentMode) {
        document.body.setAttribute("fiprocessed", "true");
        //The background page will respond with data including a "furiganizedTextNodes" member, see below.
        submitKanjiTextNodes(false);
    } else {
        alert("No text with kanji found. Sorry, false alarm!");
    }
}

function disableFurigana() {
    if (document.body.hasAttribute("fiprocessed")) {
        revertRubies();
        browser.runtime.sendMessage({
            message: "reset_page_action_icon"
            //icon can only be changed by background page
        }, function(response) {});
        KANJI_TEXT_NODES = {};
    }
}

/*** Events ***/
browser.runtime.onMessage.addListener(
    function(request, sender, sendResponseCallback) {
        if (request.furiganizedTextNodes) {
            for (key in request.furiganizedTextNodes) {
                if (SUBMITTED_KANJI_TEXT_NODES[key]) {
                    var tempDocFrag = document.createDocumentFragment();
                    var dummyParent = document.createElement("DIV");
                    dummyParent.innerHTML = request.furiganizedTextNodes[key];
                    while (dummyParent.firstChild)
                        tempDocFrag.appendChild(dummyParent.firstChild);
                    SUBMITTED_KANJI_TEXT_NODES[key].parentNode.replaceChild(tempDocFrag, SUBMITTED_KANJI_TEXT_NODES[key]);
                    delete SUBMITTED_KANJI_TEXT_NODES[key];
                }
            }
            if (!isEmpty(KANJI_TEXT_NODES)) {
                submitKanjiTextNodes(false);
            } else {
                KANJI_TEXT_NODES = {};
                document.body.setAttribute("fiprocessed", "true");
                browser.runtime.sendMessage({
                    message: "show_page_processed"
                }, function(response) {});
            }
        } else {
            console.log("Unexpected msg received from extension script: " + JSON.stringify(data).substr(0, 200));
        }
    }
);

'dom_parse ends here'
