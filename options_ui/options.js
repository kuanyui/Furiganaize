$(document).ready(function () {
    reloadDataFromLocalStorageToOptionUi()
	bindUiEvents();
});

function rerenderSample() {
    const $sampleEl = $(".style_sample")
    const fontSizeUnit = localStorage.getItem("yomi_size_unit")
    const fontSizeValue = localStorage.getItem("yomi_size_value")
    const color = localStorage.getItem("yomi_color")
    const fontSize = fontSizeUnit === '__unset__' ? '' : fontSizeValue + fontSizeUnit
    for (const el of $sampleEl) {
        el.style.fontSize = fontSize
        el.style.color = color
    }
}

function reloadDataFromLocalStorageToOptionUi() {
    try {
        $("#includelinktext_inp")[0].checked = JSON.parse(localStorage.getItem("include_link_text"));
        $("#furigana_display").val(localStorage.getItem("furigana_display"));
        $("#filter_okurigana")[0].checked = JSON.parse(localStorage.getItem("filter_okurigana"));
        $("#persistent_mode")[0].checked = JSON.parse(localStorage.getItem("persistent_mode"));
        $("#watch_page_change")[0].checked = JSON.parse(localStorage.getItem("watch_page_change"));
        $("#use_mobile_floating_button")[0].checked = JSON.parse(localStorage.getItem("use_mobile_floating_button"));
        // $("#auto_start")[0].checked = JSON.parse(localStorage.getItem("auto_start"));
        $("#prevent_splitting_consecutive_kanjis")[0].checked = JSON.parse(localStorage.getItem("prevent_splitting_consecutive_kanjis"));
        $("#yomi_size_value").val(localStorage.getItem("yomi_size_value"));
        $("#yomi_size_unit").val(localStorage.getItem("yomi_size_unit"));
        $("#yomi_color").colpick({
            layout: 'hex',
            submit: 0,
            onChange: function (hsb, hex, rgb, el, bySetColor) {
                const colorCode = '#' + hex
                if (!bySetColor) {
                    localStorage.setItem("yomi_color", colorCode)
                    rerenderSample({ color: colorCode })
                }
            }
        });
        $("#yomi_color").colpickSetColor(localStorage.getItem("yomi_color"));

        //update preview with saved style

        rerenderSample()
    } catch (err) { console.error('[To Developer] Error:', err); }
}
function bindUiEvents() {
    try {
		$("#link_sample").find("RT").each(function() {
			$(this).css({visibility: $("#includelinktext_inp")[0].checked ? "visible" : "hidden"});
		});
		$("#includelinktext_inp").bind("change", function() {
			var inclLinks = this.checked;
			localStorage.setItem("include_link_text", inclLinks);	//N.B. saves in JSON format, i.e. the _strings_ "true" or "false", so use JSON.parse() when retrieving the value from localStorage.
			$("#link_sample").find("RT").each(function() {
				$(this).css({visibility: inclLinks ? "visible" : "hidden"});
			});
		});
		$("#furigana_display").bind("change", function() {
			var furiganaDisplay = this.value;
			localStorage.setItem("furigana_display", furiganaDisplay);
		});
		$("#filter_okurigana").bind("change", function() {
			var filterOkurigana = this.checked;
			localStorage.setItem("filter_okurigana", filterOkurigana);
		});
		$("#watch_page_change").bind("change", function() {
			var watchPageChange = this.checked;
			localStorage.setItem("watch_page_change", watchPageChange);
		});
        $("#use_mobile_floating_button").bind("change", function() {
            var useMobileFloatingButton = this.checked;
            localStorage.setItem("use_mobile_floating_button", useMobileFloatingButton);
            if (!useMobileFloatingButton) {
                localStorage.setItem('globally_show_mobile_floating_button', false)
            }
        });
		$("#persistent_mode").bind("change", function() {
			var persistentMode = this.checked;
			localStorage.setItem("persistent_mode", persistentMode);
			// if (!persistentMode) {
			// 	localStorage.setItem("auto_start", false);
			// 	$("#auto_start").prop('checked', false);
			// }
		});
		$("#auto_start").bind("change", function() {
			var autoStart = this.checked;
			localStorage.setItem("auto_start", autoStart);
			if (autoStart) {
				localStorage.setItem("persistent_mode", autoStart);
				$("#persistent_mode").prop('checked', autoStart);
			}
		});
		$("#prevent_splitting_consecutive_kanjis").bind("change", function() {
			var preventSplittingConsecutiveKanjis = this.checked;
			localStorage.setItem("prevent_splitting_consecutive_kanjis", preventSplittingConsecutiveKanjis);
			if (preventSplittingConsecutiveKanjis) {
				localStorage.setItem("prevent_splitting_consecutive_kanjis", preventSplittingConsecutiveKanjis);
				$("#prevent_splitting_consecutive_kanjis").prop('checked', preventSplittingConsecutiveKanjis);
			}
        });
        function fixFontSizeValue(self) {
            if (self.value.endsWith('.')) {
                return
            }
            let fixedValue = +self.value
            if (fixedValue !== fixedValue) { fixedValue = 2 }
            if (fixedValue > 48) { fixedValue = 48 }
            else if (fixedValue < 0.2) { fixedValue = 0.2 }
            self.value = fixedValue + ''
        }
        $("#yomi_size_inc").bind("click", function (_ev) {
            const inputEl = $("#yomi_size_value")[0]
            inputEl.value = ~~inputEl.value + 1
            fixFontSizeValue(inputEl)
            localStorage.setItem("yomi_size_value", inputEl.value);
            rerenderSample()
        })
        $("#yomi_size_dec").bind("click", function (_ev) {
            const inputEl = $("#yomi_size_value")[0]
            inputEl.value = ~~inputEl.value - 1
            fixFontSizeValue(inputEl)
            localStorage.setItem("yomi_size_value", inputEl.value);
            rerenderSample()
        })
		$("#yomi_size_value").bind("input", function() {
            fixFontSizeValue(this)
            localStorage.setItem("yomi_size_value", this.value);
            rerenderSample()
		});
        $("#yomi_size_value").bind("keydown", function (_ev) {
            const ev = _ev.originalEvent
            let delta = 0
            switch (ev.key) {
                case "ArrowUp":
                    delta = +1
                    break
                case "ArrowDown":
                    delta = -1
                    break
                default:
                    return
            }
            this.value = ~~this.value + delta
            fixFontSizeValue(this)
            localStorage.setItem("yomi_size_value", this.value);
            // localStorage.setItem("yomi_size_value", sizeValue);
            rerenderSample()
		});
		$("#yomi_size_unit").bind("change", function() {
			var sizeUnit = this.value;
            localStorage.setItem("yomi_size_unit", sizeUnit);
            rerenderSample()
		});
		$("#yomi_size_reset").bind("click", function() {
            localStorage.setItem("yomi_size_value", DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_value);
            localStorage.setItem("yomi_size_unit", DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_unit);
			$("#yomi_size_value").val(DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_value);
			$("#yomi_size_unit").val(DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_unit);
            rerenderSample()
		});
		$("#yomi_color_reset").bind("click", function() {
            console.log('resetting color')
			localStorage.setItem("yomi_color", '');
			$("#yomi_color").colpickSetColor('');
            rerenderSample()
		});
        $("#reset_all").bind("click", function () {
            for (const [key, val] of Object.entries(DEFAULT_LOCAL_STORAGE_PREFERENCE)) {
                localStorage.setItem(key, val)
            }
            reloadDataFromLocalStorageToOptionUi()
		});
	} catch (err) { console.error('[To Developer] Error:', err); }
}

