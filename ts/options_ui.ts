$(document).ready(function () {
    reloadDataFromLocalStorageToOptionUi()
	bindUiEvents();
});

/** update preview with saved style */
async function rerenderSample(tmpVal?: {
    color?: string,
    fontSizeUnit?: string,
    fontSizeValue?: string
}) {
    tmpVal = tmpVal || {}
    const root = await configStorageManager.getRoot()
    const $sampleEl = $(".style_sample")
    const fontSizeUnit = tmpVal.fontSizeUnit || root.yomi_size_unit
    const fontSizeValue = tmpVal.fontSizeValue || root.yomi_size_value
    const color = tmpVal.color || root.yomi_color
    const fontSize = fontSizeUnit === '__unset__' ? '' : fontSizeValue + fontSizeUnit
    for (const el of $sampleEl) {
        el.style.fontSize = fontSize
        el.style.color = color
    }
}

function selectAllFormElement() {
    return {
        include_link_text: $<HTMLInputElement>("#includelinktext_inp"),
        furigana_display: $<HTMLSelectElement>("#furigana_display"),
        filter_okurigana: $<HTMLInputElement>("#filter_okurigana"),
        persistent_mode: $<HTMLInputElement>("#persistent_mode"),
        watch_page_change: $<HTMLInputElement>("#watch_page_change"),
        use_mobile_floating_button: $<HTMLInputElement>("#use_mobile_floating_button"),
        auto_start: $<HTMLInputElement>("#auto_start"),
        prevent_splitting_consecutive_kanjis: $<HTMLInputElement>("#prevent_splitting_consecutive_kanjis"),
        yomi_size_value: $<HTMLInputElement>("#yomi_size_value"),
        yomi_size_unit: $<HTMLSelectElement>("#yomi_size_unit"),
        yomi_color: $<HTMLInputElement>("#yomi_color"),
        _yomi_size_value__inc: $<HTMLButtonElement>("#yomi_size_inc"),
        _yomi_size_value__dec: $<HTMLButtonElement>("#yomi_size_dec"),
        _yomi_size_reset: $<HTMLButtonElement>("#yomi_size_reset"),
        _yomi_color_reset: $<HTMLButtonElement>("#yomi_size_reset"),
        _reset_all: $<HTMLButtonElement>("#reset_all"),
    }
}

async function reloadDataFromLocalStorageToOptionUi() {
    try {
        const root = await configStorageManager.getRoot()
        const form = selectAllFormElement()
        form.include_link_text[0].checked = root.include_link_text;
        form.furigana_display.val(root.furigana_display);
        form.filter_okurigana[0].checked = root.filter_okurigana;
        form.persistent_mode[0].checked = root.persistent_mode;
        form.watch_page_change[0].checked = root.watch_page_change;
        form.use_mobile_floating_button[0].checked = root.use_mobile_floating_button;
        form.auto_start[0].checked = root.auto_start;
        form.prevent_splitting_consecutive_kanjis[0].checked = root.prevent_splitting_consecutive_kanjis;
        form.yomi_size_value.val(root.yomi_size_value);
        form.yomi_size_unit.val(root.yomi_size_unit);
        $<HTMLInputElement>("#yomi_color").colpick({
            layout: 'hex',
            submit: 0,
            onChange: function (hsb, hex, rgb, el, bySetColor) {
                const colorCode = '#' + hex
                if (!bySetColor) {
                    configStorageManager.setRootSubsetPartially({ yomi_color: colorCode })
                    rerenderSample({ color: colorCode })
                }
            }
        });
        $<HTMLInputElement>("#yomi_color").colpickSetColor(root.yomi_color);

        rerenderSample()
    } catch (err) { console.error('[To Developer] Error:', err); }
}


function bindUiEvents() {
    const formEls = selectAllFormElement()
    try {
		$("#link_sample").find("RT").each(function() {
			$(this).css({visibility: formEls.include_link_text[0].checked ? "visible" : "hidden"});
		});
		formEls.include_link_text.bind("change", function() {
			var inclLinks = this.checked;
			configStorageManager.setRootSubsetPartially({include_link_text: inclLinks});	//N.B. saves in JSON format, i.e. the _strings_ "true" or "false", so use JSON.parse() when retrieving the value from localStorage
			$("#link_sample").find("RT").each(function() {
				$(this).css({visibility: inclLinks ? "visible" : "hidden"});
			});
		});
		formEls.furigana_display.bind("change", function() {
			var furiganaDisplay = this.value;
			configStorageManager.setRootSubsetPartially({furigana_display: furiganaDisplay as furigana_type_t})
		});
		formEls.filter_okurigana.bind("change", function() {
			var filterOkurigana = this.checked;
			configStorageManager.setRootSubsetPartially({filter_okurigana: filterOkurigana})
		});
		formEls.watch_page_change.bind("change", function() {
			var watchPageChange = this.checked;
			configStorageManager.setRootSubsetPartially({watch_page_change: watchPageChange})
		});
        formEls.use_mobile_floating_button.bind("change", function() {
            var useMobileFloatingButton = this.checked;
            configStorageManager.setRootSubsetPartially({use_mobile_floating_button: useMobileFloatingButton})
            if (!useMobileFloatingButton) {
                configStorageManager.setRootSubsetPartially({ 'globally_show_mobile_floating_button': false })
            }
        });
		formEls.persistent_mode.bind("change", function() {
			var persistentMode = this.checked;
			configStorageManager.setRootSubsetPartially({persistent_mode: persistentMode})
			// if (!persistentMode) {
			// 	configStorageManager.setRootSubsetPartially({auto_start: false})
			// 	$("#auto_start").prop('checked', false);
			// }
		});
		formEls.auto_start.bind("change", function() {
			var autoStart = this.checked;
			configStorageManager.setRootSubsetPartially({auto_start: autoStart})
			if (autoStart) {
				configStorageManager.setRootSubsetPartially({persistent_mode: autoStart})
				$("#persistent_mode").prop('checked', autoStart);
			}
		});
		formEls.prevent_splitting_consecutive_kanjis.bind("change", function() {
			var preventSplittingConsecutiveKanjis = this.checked;
			configStorageManager.setRootSubsetPartially({prevent_splitting_consecutive_kanjis: preventSplittingConsecutiveKanjis})
			if (preventSplittingConsecutiveKanjis) {
				configStorageManager.setRootSubsetPartially({prevent_splitting_consecutive_kanjis: preventSplittingConsecutiveKanjis})
				$("#prevent_splitting_consecutive_kanjis").prop('checked', preventSplittingConsecutiveKanjis);
			}
        });
        function fixFontSizeValue(self: HTMLInputElement) {
            if (self.value.endsWith('.')) {
                return
            }
            let fixedValue = +self.value
            if (fixedValue !== fixedValue) { fixedValue = 2 }
            if (fixedValue > 48) { fixedValue = 48 }
            else if (fixedValue < 0.2) { fixedValue = 0.2 }
            self.value = fixedValue + ''
        }
        formEls._yomi_size_value__inc.bind("click", function (_ev) {
            const inputEl = formEls.yomi_size_value[0]
            inputEl.value = (~~inputEl.value + 1) + ''
            fixFontSizeValue(inputEl)
            configStorageManager.setRootSubsetPartially({yomi_size_value: inputEl.value})
            rerenderSample({ fontSizeValue: inputEl.value })
        })
        formEls._yomi_size_value__dec.bind("click", function (_ev) {
            const inputEl = formEls.yomi_size_value[0]
            inputEl.value = (~~inputEl.value - 1) + ''
            fixFontSizeValue(inputEl)
            configStorageManager.setRootSubsetPartially({yomi_size_value: inputEl.value})
            rerenderSample({ fontSizeValue: inputEl.value  })
        })
        formEls.yomi_size_value
        .bind("input", function () {
            fixFontSizeValue(this)
            configStorageManager.setRootSubsetPartially({yomi_size_value: this.value})
            rerenderSample({ fontSizeValue: this.value })
        })
        .bind("keydown", function (_ev) {
            const ev = _ev.originalEvent!
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
            this.value = (~~this.value + delta) + ''
            fixFontSizeValue(this)
            configStorageManager.setRootSubsetPartially({ yomi_size_value: this.value })
            // configStorageManager.setRootSubsetPartially({yomi_size_value: sizeValue})
            rerenderSample({ fontSizeValue: this.value })
        });
		formEls.yomi_size_unit.bind("change", function() {
            var sizeUnit = this.value;
            configStorageManager.setRootSubsetPartially({yomi_size_unit: sizeUnit})
            rerenderSample({ fontSizeUnit: sizeUnit })
        });
        formEls._yomi_size_reset.bind("click", function() {
            configStorageManager.setRootSubsetPartially({
                yomi_size_value: DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_value,
                yomi_size_unit: DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_unit,
            }).then(() => {
                rerenderSample()
            })
            formEls.yomi_size_value.val(DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_value);
            formEls.yomi_size_unit.val(DEFAULT_LOCAL_STORAGE_PREFERENCE.yomi_size_unit);
        });
        formEls._yomi_color_reset.bind("click", function() {
            console.log('resetting color')
            configStorageManager.setRootSubsetPartially({ yomi_color: '' });
			$("#yomi_color").colpickSetColor('');
            rerenderSample()
		});
        formEls._reset_all.bind("click", function () {
            configStorageManager.setRootSubsetPartially(DEFAULT_LOCAL_STORAGE_PREFERENCE).then(() => {
                reloadDataFromLocalStorageToOptionUi()
            })
		});
	} catch (err) { console.error('[To Developer] Error:', err); }
}

