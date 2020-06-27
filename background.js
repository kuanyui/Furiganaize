var dicfiles = ['char.category', 'code2category', 'word2id', 'word.dat', 'word.ary.idx', 'word.inf', 'matrix.bin'];
var tagger = null;
var furiganized = {};
var exceptions = null;
var furiganaEnabled = false;


function doInCurrentTab(tabCallback) {
    browser.tabs.query(
        { currentWindow: true, active: true },
        function (tabArray) { tabCallback(tabArray[0]); }
    );
}

class LocalStorageManager {
    get globallyShowMobileFloatingButton() {
        return JSON.parse(localStorage.getItem('globally_show_mobile_floating_button'))
    }
    set globallyShowMobileFloatingButton(nv) {
        localStorage.setItem('globally_show_mobile_floating_button', nv)
    }
    get useMobileFloatingButton() {
        return JSON.parse(localStorage.getItem('use_mobile_floating_button'))
    }
    set useMobileFloatingButton(nv) {
        localStorage.setItem('use_mobile_floating_button', nv)
    }
}
const lsMan = new LocalStorageManager()

// For keyboard shortcut only
if (browser.commands) {  // NOTE: Android does not support browser.commands
    browser.commands.onCommand.addListener(function (cmd) {
        console.log('ag')
        if (cmd === 'toggle-furigana') {
            doInCurrentTab(function (curTab) {
                if (lsMan.useMobileFloatingButton) {
                    if (lsMan.globallyShowMobileFloatingButton) {
                        browser.tabs.query({}, function (tabs) {
                            for (var i = 0; i < tabs.length; i++) {
                                browser.tabs.executeScript(tabs[i].id, { code: "fiRemoveFloatingIcon();" });
                            }
                        })
                    } else {
                        browser.tabs.query({}, function (tabs) {
                            for (var i = 0; i < tabs.length; i++) {
                                browser.tabs.executeScript(tabs[i].id, { code: "fiAddFloatingIcon();" });
                            }
                        })
                    }
                    lsMan.globallyShowMobileFloatingButton = !lsMan.globallyShowMobileFloatingButton
                } else {
                    browser.tabs.executeScript(curTab.id, {code: "toggleFurigana();"});
                }
            })
        }
    })
}

// Click on browserAction icon
browser.browserAction.onClicked.addListener(function(curTab) {
    if (JSON.parse(localStorage.getItem('persistent_mode')) == true) {
        browser.tabs.query({} ,function (tabs) {
            for (var i = 0; i < tabs.length; i++) {
                browser.tabs.executeScript(tabs[i].id, {code: "toggleFurigana();"});
            }
        });
    }
    if (lsMan.useMobileFloatingButton) {
        if (lsMan.globallyShowMobileFloatingButton) {
            browser.tabs.query({}, function (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    browser.tabs.executeScript(tabs[i].id, { code: "fiRemoveFloatingIcon();" });
                }
            })
        } else {
            browser.tabs.query({}, function (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    browser.tabs.executeScript(tabs[i].id, { code: "fiAddFloatingIcon();" });
                }
            })
        }
        lsMan.globallyShowMobileFloatingButton = !lsMan.globallyShowMobileFloatingButton
    } else {
        browser.tabs.executeScript(curTab.id, {code: "toggleFurigana();"});
    }
});

//initialize variables
if (!localStorage)
    console.log("Error: localStorage not available to background page. Has local storage been disabled in this instance of browser?");

if (localStorage.getItem("user_kanji_list") === null) {
    console.log("The localStorage \"user_kanji_list\" value was null. It will be initialised to the installation default list.");
    var defaultUserKanjiList = "日一国会人年大十二本中長出三同時政事自行社見月分議後前民生連五発間対上部東者党地合市業内相方四定今回新場金員九入選立開手米力学問高代明実円関決子動京全目表戦経通外最言氏現理調体化田当八六約主題下首意法不来作性的要用制治度務強気小七成期公持野協取都和統以機平総加山思家話世受区領多県続進正安設保改数記院女初北午指権心界支第産結百派点教報済書府活原先共得解名交資予川向際査勝面委告軍文反元重近千考判認画海参売利組知案道信策集在件団別物側任引使求所次水半品昨論計死官増係感特情投示変打男基私各始島直両朝革価式確村提運終挙果西勢減台広容必応演電歳住争談能無再位置企真流格有疑口過局少放税検藤町常校料沢裁状工建語球営空職証土与急止送援供可役構木割聞身費付施切由説転食比難防補車優夫研収断井何南石足違消境神番規術護展態導鮮備宅害配副算視条幹独警宮究育席輸訪楽起万着乗店述残想線率病農州武声質念待試族象銀域助労例衛然早張映限親額監環験追審商葉義伝働形景落欧担好退準賞訴辺造英被株頭技低毎医復仕去姿味負閣韓渡失移差衆個門写評課末守若脳極種美岡影命含福蔵量望松非撃佐核観察整段横融型白深字答夜製票況音申様財港識注呼渉達";
    localStorage.setItem("user_kanji_list", defaultUserKanjiList);
}
var userKanjiRegexp = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");

//initialize local storage
var localStoragePrefDefaults = {
    "include_link_text": true,
    "furigana_display": "hira",
    "filter_okurigana": true,
    "persistent_mode": false,
    "yomi_size": "",
    "yomi_color": "",
    "auto_start": false
}
browser.runtime.getPlatformInfo().then(info => {
    if (info.os === "android") {
        if (JSON.parse(localStorage.getItem("use_mobile_floating_button")) === null) {
            localStorage.setItem("use_mobile_floating_button", true);
        }
    }
})

for (var key in localStoragePrefDefaults) {
    if (localStorage.getItem(key) === null) {
        console.log("The localStorage \"" + key + "\" value was null. It will be initialised to" + localStoragePrefDefaults[key] + ".");
        localStorage.setItem(key, localStoragePrefDefaults[key]);
    }
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
    } catch (e) {
        console.error(e.toString());
    }
});
var request = new XMLHttpRequest();
request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        exceptions = request.response
    }
}
request.open('GET','res/exceptions.json',true);
request.responseType = 'json';
request.send();

/*****************
 *  Functions
 *****************/
//load dictionaries
function loadTagger(dicdir) {
    var files = new Array();
    for (var i = 0; i < dicfiles.length; ++i) {
        files[dicfiles[i]] = dicdir.files[dicfiles[i]].inflate();
    }

    var category = new igo.CharCategory(files['code2category'], files['char.category']);
    var wdc = new igo.WordDic(files['word2id'], files['word.dat'], files['word.ary.idx'], files['word.inf']);
    var unk = new igo.Unknown(category);
    var mtx = new igo.Matrix(files['matrix.bin']);
    return new igo.Tagger(wdc, unk, mtx);
}
//prepare a tab for furigana injection
function enableTabForFI(tab) {
    if (typeof browser.browserAction === 'function') {
        // NOTE: Firefox for Android doesn't support this.
        browser.browserAction.setIcon({
            path: {
                "19": "img/icons/furigana_inactive_38.png",
                "38": "img/icons/furigana_inactive_76.png"
            },
            tabId: tab.id
        });
    }
    browser.browserAction.setTitle({
        title: "Insert furigana",
        tabId: tab.id
    });
    // browser.browserAction.show(tab.id);
    return browser.tabs.executeScript(tab.id, {
        file: "/text_to_furigana_dom_parse.js"
    });
}

//Ruby tag injector
function addRuby(furiganized, kanji, yomi, key, processed) {
    //furigana can be displayed in either hiragana, katakana or romaji
    switch (localStorage.getItem("furigana_display")) {
        case "hira":
            yomi = wanakana.toHiragana(yomi);
            break;
        case "roma":
            yomi = wanakana.toRomaji(yomi);
            break;
        default:
            break;
    }

    ruby_rxp = new RegExp(sprintf('<ruby><rb>%s<\\/rb><rp>\\(<\\/rp><rt[ style=]*.*?>([\\u3040-\\u3096|\\u30A1-\\u30FA|\\uFF66-\\uFF9D|\\u31F0-\\u31FF]+)<\\/rt><rp>\\)<\\/rp><\\/ruby>', kanji), 'g');

    //apply user styles to furigana text
    yomi_size = '';
    yomi_color = '';

    localStorage.getItem('yomi_size').length > 0 ? yomi_size = sprintf('font-size:%spt', localStorage.getItem('yomi_size')) : yomi_size = '';
    localStorage.getItem('yomi_color').length > 0 ? yomi_color = sprintf(';color:%s', localStorage.getItem('yomi_color')) : yomi_color = '';

    yomi_style = yomi_size + yomi_color;

    //inject furigana into text nodes
    //a different regex is used for repeat passes to avoid having multiple rubies on the same base
    if (processed.indexOf(kanji) == -1) {
        processed += kanji;
        if (furiganized[key].match(ruby_rxp)) {
            furiganized[key] = furiganized[key].replace(ruby_rxp, sprintf('<ruby><rb>%s</rb><rp>(</rp><rt style="%s">%s</rt><rp>)</rp></ruby>', kanji, yomi_style, yomi));
        } else {
            bare_rxp = new RegExp(kanji, 'g');
            furiganized[key] = furiganized[key].replace(bare_rxp, sprintf('<ruby><rb>%s</rb><rp>(</rp><rt style="%s">%s</rt><rp>)</rp></ruby>', kanji, yomi_style, yomi));
        }
    }
}

//Extension requests listener. Handles communication between extension and the content scripts
browser.runtime.onMessage.addListener(
    function(request, sender, sendResponseCallback) {
        //send config variables to content script
        if (request.message == "config_values_request") {
            sendResponseCallback({
                userKanjiList: localStorage.getItem("user_kanji_list"),
                includeLinkText: localStorage.getItem("include_link_text"),
                useMobileFloatingButton: lsMan.useMobileFloatingButton,
                globallyShowMobileFloatingButton: lsMan.globallyShowMobileFloatingButton,
                persistentMode: localStorage.getItem("persistent_mode"),
                autoStart: localStorage.getItem("auto_start"),
                furiganaEnabled: furiganaEnabled
            });
        //prepare tab for injection
        } else if (request.message == "init_tab_for_fi") {
            enableTabForFI(sender.tab)
        //process DOM nodes containing kanji and insert furigana
        } else if (request.message == 'text_to_furiganize') {
            furiganized = {};
            for (key in request.textToFuriganize) {
                furiganized[key] = request.textToFuriganize[key];
                tagged = tagger.parse(request.textToFuriganize[key]);

                processed = '';
                // override numeric term (dates, ages etc) readings
                // TODO: implement override
                var numeric = false;
                var numeric_yomi = exceptions;
                var numeric_kanji = '';

                tagged.forEach(function(t) {
                    if (t.surface.match(/[\u3400-\u9FBF]/)) {
                        kanji = t.surface;
                        yomi = t.feature.split(',')[t.feature.split(',').length - 2];

                        //filter okurigana (word endings)
                        if (JSON.parse(localStorage.getItem("filter_okurigana"))) {
                            diff = JsDiff.diffChars(kanji, wanakana.toHiragana(yomi));
                            kanjiFound = false;
                            yomiFound = false;
                            //separate kanji and kana characters in the string using diff
                            //and inject furigana only into kanji part
                            diff.forEach(function(part) {
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
            //send processed DOM nodes back to the tab content script
            browser.tabs.sendMessage(sender.tab.id, {
                furiganizedTextNodes: furiganized
            });
            furiganaEnabled = true;
        //update page icon to 'enabled'
        } else if (request.message == "show_page_processed") {
            if (typeof browser.browserAction.setIcon === 'function') {
                browser.browserAction.setIcon({
                    path: {
                        "19": "img/icons/furigana_active_38.png",
                        "38": "img/icons/furigana_active_76.png"
                    },
                    tabId: sender.tab.id
                });
            }
            browser.browserAction.setTitle({
                title: "Remove furigana",
                tabId: sender.tab.id
            });
        //update page icon to 'disabled'
        } else if (request.message == "reset_page_action_icon") {
            if (typeof browser.browserAction.setIcon === 'function') {
                browser.browserAction.setIcon({
                    path: {
                        "19": "img/icons/furigana_inactive_38.png",
                        "38": "img/icons/furigana_inactive_76.png"
                    },
                    tabId: sender.tab.id
                });
            }
            browser.browserAction.setTitle({
                title: "Insert furigana",
                tabId: sender.tab.id
            });
            furiganaEnabled = false;
        } else {
            console.log("Programming error: a request with the unexpected \"message\" value \"" + request.message + "\" was received in the background page.");
        }
    }
);

//Storage events
window.addEventListener("storage",
    function(e) {
        if (e.key == "user_kanji_list") { //re-initialize the data in each tab (when they reload or they move to a new page)
            userKanjiRegexp = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");
        }
    }, false);

