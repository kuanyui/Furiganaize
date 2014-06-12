// var extBgPort = chrome.extension.connect();
var userKanjiRegexp;
var includeLinkText;
var kanjiTextNodes = {};	//This object will be used like a hash
var submittedKanjiTextNodes = {};

chrome.runtime.sendMessage({message: "config_values_request"}, function(response) {
	userKanjiRegexp = new RegExp("[" + response.userKanjiList + "]");
	includeLinkText = JSON.parse(response.includeLinkText);
	//Init anything for the page?
});

/*****************
 *	Functions
 *****************/
function scanForKanjiTextNodes() {
	//Scan all text for /[\u3400-\u9FBF]/, then add each text node that isn't made up only of kanji only in the user's simple kanji list
	var xPathPattern = '//*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)and not(ancestor-or-self::ruby)' + (includeLinkText ? '' : ' and not(ancestor-or-self::a)') + ']/text()[normalize-space(.) != ""]';
	console.log(xPathPattern);
	var foundNodes = {};
	var maxTextLength = 2730;	//There's a input buffer length limit in Mecab.
	try {
		var iterator = document.evaluate(xPathPattern, document.body, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		var nodeCtr = 100;
		var thisNode ;
		while (thisNode = iterator.iterateNext()) {
			if (thisNode.textContent.match(/[\u3400-\u9FBF]/)) {
				foundNodes[nodeCtr] = thisNode;
			}
			nodeCtr++;
		}
	} catch (e) {
		alert( 'Error during XPath document iteration: ' + e );
	}
	return foundNodes;
}

function submitKanjiTextNodes(keepAllRuby) {
	var msgData = {message: "text_to_furiganize", keepAllRuby: keepAllRuby};
	msgData.textToFuriganize = {};
	var strLength = 0;
	for (key in kanjiTextNodes) {
		if (kanjiTextNodes[key] && kanjiTextNodes[key].data) {
			strLength += kanjiTextNodes[key].data.length;
			msgData.textToFuriganize[key] = kanjiTextNodes[key].data;	//reduce the nodes just to strings for passing to the background page.
			submittedKanjiTextNodes[key] = kanjiTextNodes[key];
		}
		delete kanjiTextNodes[key];	//unset each member as done.
		if (strLength > 3500)	//Stop on length of 3500 chars (apparently ~50kb data in POST form).
			break;
	}
	chrome.runtime.sendMessage(msgData, function(response) {});
}

function revertRubies() {
	var rubies = document.getElementsByTagName("RUBY");
	while (rubies.length > 0) {
		var rubyElem = rubies.item(0);	//this iterates because this item will be removed, shortening the list
		var newText = "";
		var childNd = rubyElem.firstChild;
		var parentNd = rubyElem.parentNode;
		while (childNd) {
			newText += childNd.nodeType == Node.TEXT_NODE ? childNd.data : (childNd.tagName != "RT" && childNd.tagName != "RP" ? childNd.textContent : "");
			childNd = childNd.nextSibling;
		}
		parentNd.replaceChild(document.createTextNode(newText), rubyElem);
		parentNd.normalize();
	}
	document.body.removeAttribute("fiprocessed");
}

function shortTextParts(origTxt, maxLength) {
	if (!maxLength)	//error
		return [origTxt];
	var substrParts = [];
	var offset = 0;
	while (offset + maxLength < origTxt.length) {
		var strTemp = origTxt.substr(offset, maxLength);
		var matches = strTemp.match(/^[\s\S]+[。\?\!？！]/);	//characters that end a sentence 
		if (matches)
			strTemp = matches[0];
		substrParts.push(strTemp);
		offset += strTemp.length;
	}
	substrParts.push(origTxt.substr(offset));
	return substrParts;
}

function isEmpty(obj) {
	for(var prop in obj) {
		if(obj.hasOwnProperty(prop))
			return false;
	}
	return true;
}

function toggleFurigana() {
	console.log('Toggling furigana');
	console.log(document.body.hasAttribute("fiprocessed"));
	if (document.body.hasAttribute("fiprocessed")) {
		revertRubies();
		chrome.runtime.sendMessage({message: "reset_page_action_icon"}, function(response) {});	//icon can only be changed by background page
		kanjiTextNodes = {};
	} else if (document.body.hasAttribute("fiprocessing")) {
		//alert("Wait a sec, still awaiting a reply from the furigana server.");
	} else {
		//chrome.runtime.sendMessage({message: "execute_css_fontsize_fix_for_rt"}, function(response) {});	//send a request to have "css_fontsize_fix_for_rt.js" executed on this page
		kanjiTextNodes = scanForKanjiTextNodes();
		if (!isEmpty(kanjiTextNodes)) {
			document.body.setAttribute("fiprocessed", "true");
			submitKanjiTextNodes(false);	//The background page will respond with data including a "furiganizedTextNodes" member, see below.
		} else {
			alert("No text with kanji above your level found. Sorry, false alarm!");
		}
	}
}

/*** Events ***/
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponseCallback) {
		if (request.furiganizedTextNodes) {
			for (key in request.furiganizedTextNodes) {
				if (submittedKanjiTextNodes[key]) {
					var tempDocFrag = document.createDocumentFragment();
					var dummyParent = document.createElement("DIV");
					dummyParent.innerHTML = request.furiganizedTextNodes[key];
					while(dummyParent.firstChild)
						tempDocFrag.appendChild(dummyParent.firstChild);
					submittedKanjiTextNodes[key].parentNode.replaceChild(tempDocFrag, submittedKanjiTextNodes[key]);
					delete submittedKanjiTextNodes[key];
				}
			}
			if (!isEmpty(kanjiTextNodes)) {
				submitKanjiTextNodes(false);
			} else {
				kanjiTextNodes = {};	//clear the entire hash. Delete this logic if requests are processed in multiple batches.
				document.body.removeAttribute("fiprocessing");
				document.body.setAttribute("fiprocessed", "true");
				chrome.runtime.sendMessage({message: "show_page_processed"}, function(response) {});
			}
		} else {
			alert("Unexpected msg received from extension script: " + JSON.stringify(data).substr(0,200));
		}
	}
);