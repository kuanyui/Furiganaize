$(document).ready(function () {
	initControlValues();
});

function initControlValues() {
	try{
		//$("#userkanjilist_inp").html(localStorage.getItem("user_kanji_list"));
		$("#includelinktext_inp")[0].checked = JSON.parse(localStorage.getItem("include_link_text"));
		$("#furigana_display").val(localStorage.getItem("furigana_display"));
		$("#filter_okurigana").val(localStorage.getItem("filter_okurigana"));
		/*$("#show_translations_inp")[0].checked = JSON.parse(localStorage.getItem("show_translations"));
		alignRubyDplgnrAndGloss();	//This first call will probably be irrelevant. It's the $(window).resize() 
			//  event handler that will call it at more useful times.
		if ($("#show_translations_inp")[0].checked) {
			$("#fi_ruby_doppleganger").fadeIn();
			$("#fi_gloss_div").fadeIn();
		}*/
		$("#link_sample").find("RT").each(function() {
			$(this).css({visibility: $("#includelinktext_inp")[0].checked ? "visible" : "hidden"});
		});
		
		/*$("#userkanjilist_inp").bind("keyup", function() { 
			var userKanjListInp = $(this);
			if (userKanjListInp.val() == localStorage.getItem("user_kanji_list"))
				return;
			if (window.userKanjiListSaveTimeout)
				clearTimeout(window.userKanjiListSaveTimeout);
			window.userKanjiListSaveTimeout = setTimeout(function() {
				localStorage.setItem("user_kanji_list", userKanjListInp.val());
				$("#userkanjilist_saved_caption").fadeIn("fast").delay(3000).fadeOut();
			}, 1000);
		});*/
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
			var filterOkurigana = this.value;
			localStorage.setItem("filter_okurigana", filterOkurigana);
		});
		/*$("#show_translations_inp").bind("change", function() { 
			localStorage.setItem("show_translations", this.checked);	//N.B. saves in JSON format, i.e. the _strings_ "true" or "false", so use JSON.parse() when retrieving the value from localStorage.
			if (this.checked) {
				$("#fi_ruby_doppleganger").fadeIn();
				$("#fi_gloss_div").fadeIn();
			} else {
				$("#fi_ruby_doppleganger").fadeOut();
				$("#fi_gloss_div").fadeOut();
			}
				
		});*/
	} catch (err) { alert(err); }
	}
	
	function alignRubyDplgnrAndGloss() {
		var or = $("#orig_ruby");	//I think I should only need the ruby's position to set the doppleganger 
		var ort = $("#orig_ruby rt");	//  ruby's position top, but it seems I have to use the <rt> elem instead.
		$("#fi_ruby_doppleganger").css({top: ort.position().top, left: or.position().left});
		$("#fi_gloss_div").css({top: or.position().top + or.height(), left: or.position().left});
	}
	
	$(window).resize(function() { alignRubyDplgnrAndGloss(); });