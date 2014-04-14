/***************************************************************
 *	This script set to run_at document load. See manifest.json.
 ***************************************************************/
var userKanjiRegexp;
var includeLinkText = false;
var insertedNodesToCheck = [];
var insertedNodeCheckTimer = null;
chrome.extension.sendMessage({message: "config_values_request"}, function(response) {
	userKanjiRegexp = new RegExp("[" + response.userKanjiList + "]");
	includeLinkText = JSON.parse(response.includeLinkText);
	//Having received the config data, start searching for relevant kanji
	//If none find, do nothing for now except start a listener for node insertions
	if (document.body.innerText.match(/[\u3400-\u9FBF]/))
		chrome.extension.sendMessage({message: "init_tab_for_fi"});
	else
		document.addEventListener("DOMNodeInserted", DOMNodeInsertedHandler);
});

function DOMNodeInsertedHandler(e) {
	if ((e.target.nodeType == Node.TEXT_NODE || e.target.nodeType == Node.CDATA_SECTION_NODE) && e.target.parentNode)
		insertedNodesToCheck.push(e.target.parentNode)
	else if (e.target.nodeType == Node.ELEMENT_NODE && e.target.tagName != "IMG" && 
		e.target.tagName != "OBJECT"  && e.target.tagName != "EMBED")
		insertedNodesToCheck.push(e.target);
	else
		return;
	if (!insertedNodeCheckTimer)
		insertedNodeCheckTimer = setTimeout(checkInsertedNodes, 1000);
}

function checkInsertedNodes() {
	var a = [];		
	for (x = 0; x < insertedNodesToCheck.length; x++)
		a.push(insertedNodesToCheck[x].innerText);
	insertedNodesToCheck = [];
	insertedNodeCheckTimer = null;
	//Doing a join-concatenation then one RegExp.match() because I assume it will be quicker 
	//  than running RegExp.match() N times.
	var s = a.join("");	
	if (s.match(/[\u3400-\u9FBF]/)) {
		document.removeEventListener("DOMNodeInserted", DOMNodeInsertedHandler);
		chrome.extension.sendMessage({message: "init_tab_for_fi"});
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

