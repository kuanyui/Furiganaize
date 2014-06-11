var dicfiles = ['char.category', 'code2category', 'word2id', 'word.dat', 'word.ary.idx', 'word.inf', 'matrix.bin'];
var tagger = null;
var furiganized = {};
var exceptions = null;


//initialize variables
if (!localStorage) 
	console.log("Error: localStorage not available to background page. Has local storage been disabled in this instance of Chrome?");

if (localStorage.getItem("user_kanji_list") === null) {
	console.log("The localStorage \"user_kanji_list\" value was null. It will be initialised to the installation default list.");
	var defaultUserKanjiList = "日一国会人年大十二本中長出三同時政事自行社見月分議後前民生連五発間対上部東者党地合市業内相方四定今回新場金員九入選立開手米力学問高代明実円関決子動京全目表戦経通外最言氏現理調体化田当八六約主題下首意法不来作性的要用制治度務強気小七成期公持野協取都和統以機平総加山思家話世受区領多県続進正安設保改数記院女初北午指権心界支第産結百派点教報済書府活原先共得解名交資予川向際査勝面委告軍文反元重近千考判認画海参売利組知案道信策集在件団別物側任引使求所次水半品昨論計死官増係感特情投示変打男基私各始島直両朝革価式確村提運終挙果西勢減台広容必応演電歳住争談能無再位置企真流格有疑口過局少放税検藤町常校料沢裁状工建語球営空職証土与急止送援供可役構木割聞身費付施切由説転食比難防補車優夫研収断井何南石足違消境神番規術護展態導鮮備宅害配副算視条幹独警宮究育席輸訪楽起万着乗店述残想線率病農州武声質念待試族象銀域助労例衛然早張映限親額監環験追審商葉義伝働形景落欧担好退準賞訴辺造英被株頭技低毎医復仕去姿味負閣韓渡失移差衆個門写評課末守若脳極種美岡影命含福蔵量望松非撃佐核観察整段横融型白深字答夜製票況音申様財港識注呼渉達";
	localStorage.setItem("user_kanji_list", defaultUserKanjiList);
}
var userKanjiRegexp = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");

if (localStorage.getItem("include_link_text") === null) {
	console.log("The localStorage \"include_link_text\" value was null. It will be initialised to true.");
	localStorage.setItem("include_link_text", true);	//the default value for including links
}
if (localStorage.getItem("furigana_display") === null) {
	console.log("The localStorage \"furigana_display\" value was null. It will be initialised to hiragana.");
	localStorage.setItem("furigana_display", "hira");	//the default value for including links
}
if (localStorage.getItem("show_translations") === null) {
	console.log("The localStorage \"show_translations\" value was null. It will be initialised to false.");
	localStorage.setItem("show_translations", true);	//the default value for showing translations
}
if (localStorage.getItem("filter_okurigana") === null) {
	console.log("The localStorage \"filter_okurigana\" value was null. It will be initialised to Yes.");
	localStorage.setItem("filter_okurigana", false);	//the default value for showing translations
}

//initialize IGO-JS
igo.getServerFileToArrayBufffer("res/ipadic.zip", function(buffer) {
	try {
		var blob = new Blob([new Uint8Array(buffer)]);
		var reader = new FileReader();
		reader.onload = function(e) {
			var dic = Zip.inflate(new Uint8Array(reader.result))
			tagger = loadTagger(dic);
		}
		reader.readAsArrayBuffer(blob);
	} catch(e) {
		console.error(e.toString());
	}
});

$.getJSON( "res/exceptions.json", function(data) {
	exceptions = data;
});

/*****************
 *	Functions
 *****************/

function loadTagger(dicdir) {
	var files = new Array();
	for(var i=0;i<dicfiles.length;++i) {
		files[dicfiles[i]] = dicdir.files[dicfiles[i]].inflate();
	}

	var category = new igo.CharCategory(files['code2category'], files['char.category']);
	var wdc = new igo.WordDic(files['word2id'], files['word.dat'], files['word.ary.idx'], files['word.inf']);
	var unk = new igo.Unknown(category);
	var mtx = new igo.Matrix(files['matrix.bin']);
	return new igo.Tagger(wdc, unk, mtx);
}

function enableTabForFI(tab) {
	chrome.pageAction.setIcon({path: {"19": "img/icons/furigana_inactive_38.png","38": "img/icons/furigana_inactive_76.png"}, tabId: tab.id});
	chrome.pageAction.setTitle({title: "Insert furigana", tabId: tab.id});
	chrome.pageAction.show(tab.id);
	chrome.tabs.executeScript(tab.id, {file: "text_to_furigana_dom_parse.js"});
}

function utf8_encode (string) {
	string = string.replace(/\r\n/g,"\n");
	var utftext = "";
	for (var n = 0; n < string.length; n++) {
		var c = string.charCodeAt(n);
		if (c < 128) {
			utftext += String.fromCharCode(c);
		} else if((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		} else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
	}
	return utftext;
}

/*****************
 *	Chrome events
 *****************/

//Page action listener
chrome.pageAction.onClicked.addListener(function(tab) {
	chrome.tabs.executeScript(tab.id, {code:"toggleFurigana();"});
});

chrome.commands.onCommand.addListener(function(command) {
	chrome.tabs.executeScript(null, {code:"toggleFurigana();"});
});

function addRuby(furiganized, kanji, yomi, key, processed) {
	switch(localStorage.getItem("furigana_display")) {
		case "hira":
			yomi = wanakana.toHiragana(yomi);
			break;
		case "roma":
			yomi = wanakana.toRomaji(yomi);
			break;
		default:
			break;
	}
						
	ruby_rxp = new RegExp(sprintf('<ruby><rb>%s<\\/rb><rp>\\(<\\/rp><rt>([\u3040-\u3096|\u30A1-\u30FA|\uFF66-\uFF9D|\u31F0-\u31FF]+)<\\/rt><rp>\\)<\\/rp><\\/ruby>', kanji), 'g');

	if (processed.indexOf(kanji) == -1) {
		processed += kanji;
		if (furiganized[key].match(ruby_rxp)) {
			furiganized[key] = furiganized[key].replace(ruby_rxp, sprintf('<ruby><rb>%s</rb><rp>(</rp><rt>%s</rt><rp>)</rp></ruby>', kanji, yomi));
		} else {
			bare_rxp = new RegExp(kanji, 'g');
			furiganized[key] = furiganized[key].replace(bare_rxp, sprintf('<ruby><rb>%s</rb><rp>(</rp><rt>%s</rt><rp>)</rp></ruby>', kanji, yomi));
		}
	}
}

//Extension requests listener. Handles communication between extension and the content scripts
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponseCallback) {
		if (request.message == "config_values_request") {
			sendResponseCallback({userKanjiList: localStorage.getItem("user_kanji_list"), includeLinkText: localStorage.getItem("include_link_text")});
		} else if (request.message == "init_tab_for_fi") {
			enableTabForFI(sender.tab);
		} else if (request.message == 'text_to_furiganize') {
			furiganized = {};
			for (key in request.textToFuriganize) {
				furiganized[key] = request.textToFuriganize[key];
				tagged = tagger.parse(request.textToFuriganize[key]);

				processed = '';
				var numeric = false;
				var numeric_yomi = exceptions;
				var numeric_kanji = '';

				tagged.forEach(function(t) {
					if (t.surface.match(/[\u3400-\u9FBF]/)) {
						kanji = t.surface;
						yomi = t.feature.split(',')[t.feature.split(',').length - 2];

						if (JSON.parse(localStorage.getItem("filter_okurigana"))) {
							diff = JsDiff.diffChars(kanji, wanakana.toHiragana(yomi));
							kanjiFound = false;
							yomiFound = false;
							diff.forEach(function(part){
								if (part.added) { 
									yomi = wanakana.toKatakana(part.value);
									yomiFound = true;
								}
								if (part.removed) { 
									kanji = part.value;
									kanjiFound = true;
								}
								if (kanjiFound && yomiFound) {
									addRuby(furiganized, kanji, yomi, key, processed);
									kanjiFound = false;
									yomiFound = false;
								}
							});
						} else {
							addRuby(furiganized, kanji, yomi, key, processed);
						}
					}
				});
			}
			chrome.tabs.sendMessage(sender.tab.id, {furiganizedTextNodes: furiganized});
		} else if (request.message == "show_page_processed") {
			chrome.pageAction.setIcon({path: {"19": "img/icons/furigana_active_38.png","38": "img/icons/furigana_active_76.png"}, tabId: sender.tab.id});
			chrome.pageAction.setTitle({title: "Remove furigana", tabId: sender.tab.id});
		} else if (request.message == "reset_page_action_icon") {
			chrome.pageAction.setIcon({path: {"19": "img/icons/furigana_inactive_38.png","38": "img/icons/furigana_inactive_76.png"}, tabId: sender.tab.id});
			chrome.pageAction.setTitle({title: "Insert furigana", tabId: sender.tab.id});
		} else if (request.message == "execute_css_fontsize_fix_for_rt") {
			chrome.tabs.executeScript(sender.tab.id, {file: "css_fontsize_fix_for_rt.js"/*, allFrames: false*/});
		} else {
			console.log("Programming error: a request with the unexpected \"message\" value \"" + request.message + "\" was received in the background page.");
		}
	}
);

//Storage events
window.addEventListener("storage",
	function(e) {
		if (e.key == "user_kanji_list") {	//re-initialize the data in each tab (when they reload or they move to a new page)
			userKanjiRegexp = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");
		}
	}, false);

