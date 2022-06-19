$(document).ready(function () {
	initControlValues();
});

function initControlValues() {
    try {
		$("#includelinktext_inp")[0].checked = JSON.parse(localStorage.getItem("include_link_text"));
		$("#furigana_display").val(localStorage.getItem("furigana_display"));
		$("#filter_okurigana")[0].checked = JSON.parse(localStorage.getItem("filter_okurigana"));
		$("#persistent_mode")[0].checked = JSON.parse(localStorage.getItem("persistent_mode"));
        $("#watch_page_change")[0].checked = JSON.parse(localStorage.getItem("watch_page_change"));
        $("#use_mobile_floating_button")[0].checked = JSON.parse(localStorage.getItem("use_mobile_floating_button"));
		// $("#auto_start")[0].checked = JSON.parse(localStorage.getItem("auto_start"));
		$("#prevent_splitting_consecutive_kanjis")[0].checked = JSON.parse(localStorage.getItem("prevent_splitting_consecutive_kanjis"));
		$("#yomi_size").val(localStorage.getItem("yomi_size"));
		$("#yomi_color").colpick({
			layout:'hex',
			submit:0,
			onChange:function(hsb, hex, rgb, el, bySetColor) {
				if(!bySetColor){
					localStorage.setItem("yomi_color", '#' + hex)
					for (var item in $(".style_sample")) {
						if ($(".style_sample")[item].style){
							$(".style_sample")[item].style.color = '#' + hex;
						}
					}
				}
			}
		});
		$("#yomi_color").colpickSetColor(localStorage.getItem("yomi_color"));

		//update preview with saved style
		for (var item in $(".style_sample")) {
			if ($(".style_sample")[item].style){
				$(".style_sample")[item].style.color = localStorage.getItem("yomi_color");
				$(".style_sample")[item].style.fontSize = localStorage.getItem("yomi_size");
			}
		}
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
		$("#yomi_size").bind("change", function() {
			var yomi_size = this.value;
			for (var item in $(".style_sample")) {
				if ($(".style_sample")[item].style){
					$(".style_sample")[item].style.fontSize = yomi_size;
				}
			}
			localStorage.setItem("yomi_size", yomi_size);
		});
		$("#yomi_size_reset").bind("click", function() {
			localStorage.setItem("yomi_size", '');
			$("#yomi_size").val($("#yomi_size")[0].defaultValue);
			for (var item in $(".style_sample")) {
				if ($(".style_sample")[item].style){
					$(".style_sample")[item].style.fontSize = null;
				}
			}
		});
		$("#yomi_color_reset").bind("click", function() {
			console.log('resetting color')
			localStorage.setItem("yomi_color", '');
			$("#yomi_color").colpickSetColor('');
			for (var item in $(".style_sample")) {
				if ($(".style_sample")[item].style){
					$(".style_sample")[item].style.color = '';
				}
			}
		});
	} catch (err) { alert(err); }
}

