/************************************************************************
 *	Timers and events to count-off visible text nodes as they are viewed
 ************************************************************************/
$("body").append("<ul id='reading_timer_debug' style='position: fixed; top: 8px; left: 8px; border: solid 2px red; background-color: yellow; color: black;'><li>Debug Div</li></ul>");

var textNodesToCountOff = [];
scanForKanjiTextNodes();	//Debug execution just to get textNodesToCountOff filled.
kanjiTextNodes = {};	//Clear to undo the effects of running scanForKanjiTextNodes() above to fill textNodesToCountOff.
var currVisibleTextNodes = [];	//will be filled by scanForKanjiTextNodes

function debugPrint(msg) {
	var debugUL = $("#reading_timer_debug");
	debugUL.append("<li>" + msg + "</li>");
	while (debugUL.find("li").length > 10)
		debugUL.find("li:first").remove();
}
setTimeout(startVisibleTextCountOff, 1000/*5000*/);
$(document).scroll(function() { 
	if (window.scrollEventDelay)
		clearTimeout(window.scrollEventDelay);
	window.scrollEventDelay = setTimeout(startVisibleTextCountOff, 1000/*5000*/);
});

//Todo: add events to stop the count-off when tab loses visibility / re-enable it when the tab gains focus again

function startVisibleTextCountOff() {
	if (window.textCountOffTimeout)
		clearTimeout(window.textCountOffTimeout);
	currVisibleTextNodes = getVisibleTextNodes();
	countOffOneVisibleTextNode();
}

function countOffOneVisibleTextNode() {
	var currNode = currVisibleTextNodes.shift();
	if (!currNode) 
{ console.log("Finished last visible text node"); debugPrint("Finished last visible text node");
		return;
}
	var currIdx = textNodesToCountOff.indexOf(currNode);
	while (currIdx < 0 /*|| jQuery.contains($("#reading_timer_debug"), currNode.parentNode)*/) {
console.log("Skipping text node already viewed: '" + currNode.data + "'");
		currNode = currVisibleTextNodes.shift();
		if (!currNode)
{ console.log("Finished last visible text node"); debugPrint("Finished last visible text node");
			return;
}
		currIdx = textNodesToCountOff.indexOf(currNode);
	}
console.log("Counting off: " + currNode.data);
	textNodesToCountOff.splice(textNodesToCountOff.indexOf(currNode), 1);
	var t = estimatedStringReadingTime(currNode.data);
	debugPrint(t + "ms for " + currNode.data.length + " char text node.");
	window.textCountOffTimeout = setTimeout(countOffOneVisibleTextNode, t);
}

function estimatedStringReadingTime(str) {
	var m = str.match(/[A-Za-z]{4,}/g);
	var countAsciiWords = m ? m.length - 1 : 0;
	m = str.match(/[\u3040-\u30FF]/g);
	var countKanaChars = m ? m.length - 1 : 0;
	m = str.match(/[\u3400-\u9FBF]/g);
	var countEasyKanji = m ? m.length - 1 : 0;
	var countHardKanji = 0;	//Todo
	return countAsciiWords * 250 + countKanaChars * 200 + countEasyKanji * 400 + countHardKanji * 800;
}

function getVisibleTextNodes() {
  var xPathAllTextNodesPattern = '//*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)]/text()[normalize-space(.) != ""]';
  var resultSet = document.evaluate(xPathAllTextNodesPattern, document.body, null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  var visibleTextNodes = [];

  // Prune all invisible elements.
  for (var i = 0; i < resultSet.snapshotLength; i++) {
    var element = resultSet.snapshotItem(i).parentNode;
	var boundingRect = element.getBoundingClientRect();	// Note that getBoundingClientRect() is relative to the viewport
    // Exclude links which have just a few pixels on screen, because the link hints won't show for them anyway.
    if (boundingRect.bottom <= 4 || boundingRect.top >= window.innerHeight - 4 ||
        boundingRect.left <= 0 || boundingRect.left >= window.innerWidth - 4)
      continue;
    if (boundingRect.width < 3 || boundingRect.height < 3)
      continue;
    // eliminate invisible elements (see test_harnesses/visibility_test.html)
    var computedStyle = window.getComputedStyle(element, null);
    if (computedStyle.getPropertyValue('visibility') != 'visible' ||
        computedStyle.getPropertyValue('display') == 'none')
      continue;
    var clientRect = element.getClientRects()[0];
    if (!clientRect)
        continue;
    visibleTextNodes.push(resultSet.snapshotItem(i));	//I.e. the text node, not the element that holds it.
  }
  return visibleTextNodes;
}