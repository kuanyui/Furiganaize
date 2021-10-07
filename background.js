var DICT_FILES = ['char.category', 'code2category', 'word2id', 'word.dat', 'word.ary.idx', 'word.inf', 'matrix.bin'];
var TAGGER = null;
var FURIGANAIZED = {};
var EXCEPTIONS = null;
var FURIGANA_ENABLED = false;


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
    /** in options */
    get useMobileFloatingButton() {
        return JSON.parse(localStorage.getItem('use_mobile_floating_button'))
    }
    /** in options */
    set useMobileFloatingButton(nv) {
        localStorage.setItem('use_mobile_floating_button', nv)
    }
}
const lsMan = new LocalStorageManager()

// For keyboard shortcut only
if (browser.commands) {  // NOTE: Android does not support browser.commands
    browser.commands.onCommand.addListener(function (cmd) {
        console.log('trigger via browser commands (keyboard shortcuts)')
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
                    setupBrowserActionIcon()
                } else {
                    browser.tabs.executeScript(curTab.id, {code: "safeToggleFurigana();"});
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
                browser.tabs.executeScript(tabs[i].id, {code: "safeToggleFurigana();"});
            }
        });
    }
    if (lsMan.useMobileFloatingButton) {
        if (lsMan.globallyShowMobileFloatingButton) {
            browser.tabs.query({}, function (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    browser.tabs.executeScript(tabs[i].id, { code: "fiRemoveFloatingIcon();" })
                        .catch(err => console.log('[Error] This exception may be due to you opened some special domains such as https://addons.mozilla.org/, which Firefox forbids you from do this', err, tabs[i]));
                }
            })
        } else {
            browser.tabs.query({}, function (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    browser.tabs.executeScript(tabs[i].id, { code: "fiAddFloatingIcon();" })
                        .catch(err => console.log('[Error] This exception may be due to you opened some special domains such as https://addons.mozilla.org/, which Firefox forbids you from do this', err, tabs[i]));
                }
            })
        }
        lsMan.globallyShowMobileFloatingButton = !lsMan.globallyShowMobileFloatingButton
        setupBrowserActionIcon()
    } else {
        browser.tabs.executeScript(curTab.id, {code: "safeToggleFurigana();"});
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
var USER_KANJI_REGEXP = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");

//initialize local storage
var localStoragePrefDefaults = {
    "include_link_text": true,
    "furigana_display": "hira",
    "filter_okurigana": true,
    "persistent_mode": false,
    "yomi_size": "",
    "yomi_color": "",
    "use_mobile_floating_button": false,
    "watch_page_change": false,
    "auto_start": false
}

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
            TAGGER = loadTagger(dic);
        }
        reader.readAsArrayBuffer(blob);
    } catch (e) {
        console.error(e.toString());
    }
});
var request = new XMLHttpRequest();
request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        EXCEPTIONS = request.response
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
    for (var i = 0; i < DICT_FILES.length; ++i) {
        files[DICT_FILES[i]] = dicdir.files[DICT_FILES[i]].inflate();
    }

    var category = new igo.CharCategory(files['code2category'], files['char.category']);
    var wdc = new igo.WordDic(files['word2id'], files['word.dat'], files['word.ary.idx'], files['word.inf']);
    var unk = new igo.Unknown(category);
    var mtx = new igo.Matrix(files['matrix.bin']);
    return new igo.Tagger(wdc, unk, mtx);
}

setupBrowserActionIcon(false)

function setupBrowserActionIcon(furiInserted, tabId) {
    if (lsMan.useMobileFloatingButton) {
        // TODO: Set different title or color for mobile floating icon
        if (lsMan.globallyShowMobileFloatingButton) {
            browser.browserAction.setTitle({ tabId: null, title: "フローティングアイコンを隠す", });
            browser.browserAction.setBadgeBackgroundColor({ tabId: null, color: "#2fafff", });
            browser.browserAction.setBadgeText({ tabId: null, text: "ｱｲｺﾝｵﾝ", });
        } else {
            browser.browserAction.setTitle({ tabId: null, title: "フローティングアイコンを表す", });
            browser.browserAction.setBadgeBackgroundColor({ tabId: null, color: "#aaaaaa", });
            browser.browserAction.setBadgeText({ tabId: null, text: "ｱｲｺﾝｵﾌ", });
        }
        return
    }
    if (furiInserted) {
        // FIXME: Want to restore icon to theme_icons but USELESS. This shit API : https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setIcon
        // NOTE: check thias, because elder Firefox for Android doesn't support this.
        // if (typeof browser.browserAction.setIcon === 'function') {
        //     browser.browserAction.setIcon({ tabId: tabId, path: null, imageData: null });  // reset to default theme icons
        // }
        browser.browserAction.setTitle({ tabId: tabId, title: "振り仮名を削除", });
        browser.browserAction.setBadgeBackgroundColor({ tabId: tabId, color: "#99dd22", });
        browser.browserAction.setBadgeText({ tabId: tabId, text: "ｵﾝ", });
    } else {
        if (typeof browser.browserAction.setIcon === 'function') {
            // browser.browserAction.setIcon({
            //     tabId: tabId,
            //     path: {
            //         "48": "img/icon_inactive.svg"
            //     },
            // });
        }
        browser.browserAction.setTitle({ tabId: tabId, title: "振り仮名を挿入", });
        browser.browserAction.setBadgeBackgroundColor({ tabId: tabId, color: "#ff4444", });
        browser.browserAction.setBadgeText({ tabId: tabId, text: "ｵﾌ", });
    }
}

//prepare a tab for furigana injection
function enableTabForFI(tab) {
    setupBrowserActionIcon(false, tab.id)
    // browser.browserAction.show(tab.id);
    return browser.tabs.executeScript(tab.id, {
        file: "/text_to_furigana_dom_parse.js"
    });
}

//Ruby tag injector
function addRuby(furiganized, kanji, yomi, key, processed, yomiStyle) {
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
    // const rubyPatt = new RegExp(`<ruby><rb>${kanji}<\\/rb><rp>\\(<\\/rp><rt[ style=]*.*?>([\\u3040-\\u3096|\\u30A1-\\u30FA|\\uFF66-\\uFF9D|\\u31F0-\\u31FF]+)<\\/rt><rp>\\)<\\/rp><\\/ruby>`, 'g');
    const rubyPatt = new RegExp(`<ruby><rb>${kanji}<\\/rb><rt[ style=]*.*?>([\\u3040-\\u3096|\\u30A1-\\u30FA|\\uFF66-\\uFF9D|\\u31F0-\\u31FF]+)<\\/rt><\\/ruby>`, 'g');

    //inject furigana into text nodes
    //a different regex is used for repeat passes to avoid having multiple rubies on the same base
    if (processed.indexOf(kanji) == -1) {
        processed += kanji;
        if (furiganized[key].match(rubyPatt)) {
            // furiganized[key] = furiganized[key].replace(rubyPatt, `<ruby><rb>${kanji}</rb><rp>(</rp><rt style="${yomiStyle}">${yomi}</rt><rp>)</rp></ruby>`);
            furiganized[key] = furiganized[key].replace(rubyPatt, `<ruby><rb>${kanji}</rb><rt style="${yomiStyle}">${yomi}</rt></ruby>`);
        } else {
            bare_rxp = new RegExp(kanji, 'g');
            furiganized[key] = furiganized[key].replace(bare_rxp, `<ruby><rb>${kanji}</rb><rt style="${yomiStyle}">${yomi}</rt></ruby>`);
        }
    }
}

function getYomiStyle() {
    let yomiSize = ''
    let yomiColor = ''
    if (localStorage.getItem('yomi_size').length > 0) {
        yomiSize = `font-size:${localStorage.getItem('yomi_size')}pt`
    }
    if (localStorage.getItem('yomi_color').length > 0) {
        yomiColor = `;color:${localStorage.getItem('yomi_color')}`
    }
    let yomiStyle = yomiSize + yomiColor;
    return yomiStyle
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
                watchPageChange: localStorage.getItem("watch_page_change"),
                persistentMode: localStorage.getItem("persistent_mode"),
                autoStart: localStorage.getItem("auto_start"),
                furiganaEnabled: FURIGANA_ENABLED
            });
        //prepare tab for injection
        } else if (request.message == "init_tab_for_fi") {
            enableTabForFI(sender.tab)
        } else if (request.message == 'force_load_dom_parser') {
        //sometime loaded `text_to_furigana_dom_parse` unloaded by unknown reason (ex: Idle for too long on Android?), reload it.
            return browser.tabs.executeScript(sender.tab.id, {
                file: "/text_to_furigana_dom_parse.js"
            });
        //process DOM nodes containing kanji and insert furigana
        } else if (request.message == 'text_to_furiganize') {
            const yomiStyle = getYomiStyle()
            FURIGANAIZED = {};
            for (key in request.textToFuriganize) {
                FURIGANAIZED[key] = request.textToFuriganize[key];
                tagged = TAGGER.parse(request.textToFuriganize[key]);

                processed = '';
                // override numeric term (dates, ages etc) readings
                // TODO: implement override
                var numeric = false;
                var numeric_yomi = EXCEPTIONS;
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
                                    addRuby(FURIGANAIZED, kanji, yomi, key, processed, yomiStyle);
                                    kanjiFound = false;
                                    yomiFound = false;
                                }
                            });
                        } else {
                            addRuby(FURIGANAIZED, kanji, yomi, key, processed, yomiStyle);
                        }
                    }
                });
            }
            //send processed DOM nodes back to the tab content script
            browser.tabs.sendMessage(sender.tab.id, {
                furiganizedTextNodes: FURIGANAIZED
            });
            FURIGANA_ENABLED = true;
        //update page icon to 'enabled'
        } else if (request.message == "show_page_processed") {
            setupBrowserActionIcon(true, sender.tab.id)
        //update page icon to 'disabled'
        } else if (request.message == "reset_page_action_icon") {
            setupBrowserActionIcon(false, sender.tab.id)
            FURIGANA_ENABLED = false;
        } else {
            console.log("Programming error: a request with the unexpected \"message\" value \"" + request.message + "\" was received in the background page.");
        }
    }
);

//Storage events
window.addEventListener("storage",
    function(e) {
        if (e.key == "user_kanji_list") { //re-initialize the data in each tab (when they reload or they move to a new page)
            USER_KANJI_REGEXP = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");
        }
    }, false);
