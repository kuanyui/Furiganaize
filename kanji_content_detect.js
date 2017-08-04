/***************************************************************
 *	This script set to run_at document load. See manifest.json.
 ***************************************************************/
var userKanjiRegexp;
var includeLinkText = false;
var insertedNodesToCheck = [];
var insertedNodeCheckTimer = null;
var furiganaEnabled = false;

chrome.extension.sendMessage({ message: "config_values_request" }, function(response) {
    userKanjiRegexp = new RegExp("[" + response.userKanjiList + "]");
    includeLinkText = JSON.parse(response.includeLinkText);
    persistentMode = JSON.parse(response.persistentMode);
    furiganaEnabled = JSON.parse(response.furiganaEnabled);
    // Having received the config data, start searching for relevant kanji
    // If none find, do nothing for now except start a listener for node insertions
    // If persistent mode enabled - enable furigana right away
    if (document.body.innerText.match(/[\u3400-\u9FBF]/) || persistentMode) {
        chrome.extension.sendMessage({ message: "init_tab_for_fi" });
    }
});

var observer = new MutationSummary({
    callback: mutationHandler,
    queries: [{ characterData: true }]
});

function mutationHandler(summaries) {
    var kanji_summary = summaries[0];

    kanji_summary.added.forEach(function(e) {
        if (e.tagName != "RUBY" && e.tagName != "RT" && e.tagName != "RP" && e.tagName != "RB") {
            if ((e.nodeType == Node.TEXT_NODE || e.nodeType == Node.CDATA_SECTION_NODE) && e.parentNode)
                if (e.parentNode.tagName != "RUBY" && e.parentNode.tagName != "RT" && e.parentNode.tagName != "RP" && e.parentNode.tagName != "RB") {
                    insertedNodesToCheck.push(e.parentNode);
                } else if (e.nodeType == Node.ELEMENT_NODE && e.tagName != "IMG" &&
                e.tagName != "OBJECT" && e.tagName != "EMBED")
                insertedNodesToCheck.push(e);
        }
    });

    console.log('inserted nodes');
    console.log(insertedNodesToCheck.length);

    if (!insertedNodeCheckTimer && insertedNodesToCheck)
        insertedNodeCheckTimer = setTimeout(checkInsertedNodes, 1000);
}

// function DOMNodeInsertedHandler(e) {
// 	if ((e.target.nodeType == Node.TEXT_NODE || e.target.nodeType == Node.CDATA_SECTION_NODE) && e.target.parentNode)
// 		insertedNodesToCheck.push(e.target.parentNode)
// 	else if (e.target.nodeType == Node.ELEMENT_NODE && e.target.tagName != "IMG" &&
// 		e.target.tagName != "OBJECT"  && e.target.tagName != "EMBED")
// 		insertedNodesToCheck.push(e.target);
// 	else
// 		return;
// 	if (!insertedNodeCheckTimer)
// 		insertedNodeCheckTimer = setTimeout(checkInsertedNodes, 1000);
// }

function checkInsertedNodes() {
    var a = [];
    for (x = 0; x < insertedNodesToCheck.length; x++)
        a.push(insertedNodesToCheck[x].innerText);
    insertedNodesToCheck = [];
    insertedNodeCheckTimer = null;
    // doing a join-concatenation then one RegExp.match() because I assume it will be quicker
    // than running RegExp.match() N times.
    var s = a.join("");
    if (s.match(/[\u3400-\u9FBF]/)) {
        if (!furiganaEnabled) {
            chrome.extension.sendMessage({ message: "init_tab_for_fi" });
            return;
        } else {
            console.log('toggling furigana');
        }
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