var kSelSlider = new Slider(document.getElementById("kanji_selector_slider"), document.getElementById("kanji_selector_slider_input"), "vertical");
kSelSlider.setMinimum(100);
kSelSlider.setMaximum(2500);
kSelSlider.setBlockIncrement(50);
kSelSlider.onchange = function () {
	var new_val = 20 * Math.round(kSelSlider.getValue()/20);
	document.getElementById("kanji_count_div").innerHTML = new_val;
	if (new_val != lastSliderVal) {
		lastSliderVal = new_val;
		setVisibleRTLevel(new_val);
	}
};
lastSliderVal = 500;	//Default value
setVisibleRTLevel(lastSliderVal);
kSelSlider.setValue(lastSliderVal);

window.onresize = function () {
	kSelSlider.recalculate();
};