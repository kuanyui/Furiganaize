var lastSliderVal = 500;
function setVisibleRTLevel(fouVal) {
	var bunronTDElem = document.getElementById("bunron_examples");
	var rtElems = bunronTDElem.getElementsByTagName("rt");
	for (var x = 0; x < rtElems.length; x++) {
		rtElems[x].style.visibility = rtElems[x].getAttribute("fouMax") < fouVal ? "hidden" : "visible";
	}
	var rpElems = bunronTDElem.getElementsByTagName("rp");
	for (var x = 0; x < rpElems.length; x++) {
		rpElems[x].style.visibility = rpElems[x].getAttribute("fouMax") < fouVal ? "hidden" : "visible";
	}
}