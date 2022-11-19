var a = 0;
var EXCEPTIONS = null;
/** Cross-tab keep on/off status. For PERSISTENT_MODE only. Not for settings. */
var CROSS_TABS_FURIGANA_ENABLED = false;


function doInCurrentTab(tabCallback: (tab: browser.tabs.Tab) => void) {
    browser.tabs.query(
        { currentWindow: true, active: true },
    ).then((tabs) => {
        tabCallback(tabs[0])
    })
}

class LocalStorageManager {
    /** Used for internal state, shared across tab */
    get globallyShowMobileFloatingButton() {
        return JSON.parse(localStorage.getItem('globally_show_mobile_floating_button')!)
    }
    /** Used for internal state, shared across tab */
    set globallyShowMobileFloatingButton(nv) {
        localStorage.setItem('globally_show_mobile_floating_button', nv)
    }
    /** Used in options */
    get useMobileFloatingButton() {
        return JSON.parse(localStorage.getItem('use_mobile_floating_button')!)
    }
    /** Used in options */
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
                        browser.tabs.query({}).then(function (tabs) {
                            for (var i = 0; i < tabs.length; i++) {
                                browser.tabs.executeScript(tabs[i].id, { code: "fiRemoveFloatingIcon();" });
                            }
                        }).catch((err) => { console.error('[To Developer] Error when tab.query()' , err) })
                    } else {
                        browser.tabs.query({}).then( function (tabs) {
                            for (var i = 0; i < tabs.length; i++) {
                                browser.tabs.executeScript(tabs[i].id, { code: "fiAddFloatingIcon();" });
                            }
                        }).catch((err) => { console.error('[To Developer] Error when tab.query()' , err) })
                    }
                    lsMan.globallyShowMobileFloatingButton = !lsMan.globallyShowMobileFloatingButton
                    setupBrowserActionIcon('UNTOUCHED', undefined)  // FIXME: Don't sure wtf is this.
                } else {
                    browser.tabs.executeScript(curTab.id, {code: "safeToggleFurigana();"});
                }
            })
        }
    })
}

// Click on browserAction icon
browser.browserAction.onClicked.addListener(function (curTab) {
    // if (JSON.parse(localStorage.getItem('persistent_mode')) == true) {
    //     browser.tabs.query({} ,function (tabs) {
    //         for (var i = 0; i < tabs.length; i++) {
    //             browser.tabs.executeScript(tabs[i].id, {code: "safeToggleFurigana();"});
    //         }
    //     });
    // }
    if (lsMan.useMobileFloatingButton) {
        if (lsMan.globallyShowMobileFloatingButton) {
            browser.tabs.query({}).then(function (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    browser.tabs.executeScript(tabs[i].id, { code: "fiRemoveFloatingIcon();" })
                        .catch(err => console.log('[Error] This exception may be due to you opened some special domains such as https://addons.mozilla.org/, which Firefox forbids you from do this', err, tabs[i]));
                }
            }).catch((err) => { console.error('[To Developer] Error when tab.query()' , err) })
        } else {
            browser.tabs.query({}).then(function (tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    browser.tabs.executeScript(tabs[i].id, { code: "fiAddFloatingIcon();" })
                        .catch(err => console.log('[Error] This exception may be due to you opened some special domains such as https://addons.mozilla.org/, which Firefox forbids you from do this', err, tabs[i]));
                }
            }).catch((err) => { console.error('[To Developer] Error when tab.query()' , err) })
        }
        lsMan.globallyShowMobileFloatingButton = !lsMan.globallyShowMobileFloatingButton
        setupBrowserActionIcon('UNTOUCHED', undefined)  // FIXME: Don't sure wtf is this.
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
// var USER_KANJI_REGEXP = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");


var request = new XMLHttpRequest();
request.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        EXCEPTIONS = request.response
    }
}
request.open('GET','res/exceptions.json',true);
request.responseType = 'json';
request.send();


setupBrowserActionIcon("UNTOUCHED", undefined)
var blinkTimeoutId = -1
/** If tabId not specified, it means all tabs. */
function setupBrowserActionIcon(state: furiganaize_state_t, tabId: number | undefined) {
    console.log('ICON STATE===', state)
    browser.browserAction.enable(tabId)
    window.clearTimeout(blinkTimeoutId)
    if (lsMan.useMobileFloatingButton) {
        // TODO: Set different title or color for mobile floating icon
        if (lsMan.globallyShowMobileFloatingButton) {
            browser.browserAction.setTitle({ tabId: undefined, title: "フローティングアイコンを隠す", });
            browser.browserAction.setBadgeBackgroundColor({ tabId: undefined, color: "#2fafff", });
            browser.browserAction.setBadgeText({ tabId: undefined, text: "ｱｲｺﾝｵﾝ", });
        } else {
            browser.browserAction.setTitle({ tabId: undefined, title: "フローティングアイコンを表す", });
            browser.browserAction.setBadgeBackgroundColor({ tabId: undefined, color: "#aaaaaa", });
            browser.browserAction.setBadgeText({ tabId: undefined, text: "ｱｲｺﾝｵﾌ", });
        }
        return
    }
    if (state === "PROCESSING") {
        // FIXME: Want to restore icon to theme_icons but USELESS. This shit API : https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setIcon
        // NOTE: check thias, because elder Firefox for Android doesn't support this.
        // if (typeof browser.browserAction.setIcon === 'function') {
        //     browser.browserAction.setIcon({ tabId: tabId, path: null, imageData: null });  // reset to default theme icons
        // }
        browser.browserAction.disable(tabId)
        browser.browserAction.setTitle({ tabId: tabId, title: "処理中...", });
        const fn = (i=0) => {
            if (i % 2 === 0) {
                browser.browserAction.setBadgeBackgroundColor({ tabId: tabId, color: "#9600E1", });
            } else {
                browser.browserAction.setBadgeBackgroundColor({ tabId: tabId, color: "#ffffff", });
            }
            blinkTimeoutId = window.setTimeout(() => fn(++i), 200)
        }
        fn()
        browser.browserAction.setBadgeText({ tabId: tabId, text: "ﾋﾞｼﾞｰ", });
    } else if (state === "INSERTED") {
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
function enableTabForFI(tab: browser.tabs.Tab) {
    // setupBrowserActionIcon(false, tab.id)
    return browser.tabs.executeScript(tab.id, {
        file: "/js/content_full.js"
    });
}

function getYomiStyle() {
    let style = ''
    const sizeValue = localStorage.getItem('yomi_size_value')
    const sizeUnit = localStorage.getItem('yomi_size_unit')
    const color = localStorage.getItem('yomi_color')
    if (sizeUnit !== '__unset__') {
        style += `font-size:${sizeValue}${sizeUnit}`
    }
    if (color) {
        style += `;color:${color}`
    }
    return style
}

class WorkerManager {
    _reqId: number
    _promiseResolverMap: Record<number, (map: Record<number, string>) => void>
    _worker: Worker
    constructor() {
        this._reqId = 0
        this._promiseResolverMap = {}
        this._worker = new Worker('./js/concatenated_igoworker.js')
        this._worker.onmessage = (_msg) => {
            const msg = _msg.data
            const resolver = this._promiseResolverMap[msg.reqId]
            delete this._promiseResolverMap[msg.reqId]
            resolver(msg.furiganaizedTextMap)
        }
    }
    runIgo(textMapNeedsFuriganaize: Record<number, string>) {
        const yomiStyle = getYomiStyle()
        const preferLongerKanjiSegments = JSON.parse(localStorage.getItem("prevent_splitting_consecutive_kanjis")!)
        const filterOkurigana = JSON.parse(localStorage.getItem("filter_okurigana")!)
        const furiganaType = localStorage.getItem("furigana_display")
        const req = {
            reqId: ++this._reqId,
            textMapNeedsFuriganaize: textMapNeedsFuriganaize,
            options: {
                yomiStyle, preferLongerKanjiSegments, filterOkurigana, furiganaType
            }
        }
        console.log('runIgo!')
        const prom = new Promise((resolve, reject) => {
            this._worker.postMessage(req)
            this._promiseResolverMap[req.reqId] = resolve
        })
        return prom
    }
}
const workerMan = new WorkerManager()

//Extension requests listener. Handles communication between extension and the content scripts
var _debug: browser.runtime.onMessageEvent
browser.runtime.onMessage.addListener(
    function (_msg: object, sender: browser.runtime.MessageSender, sendResponseCallback: (response: object) => Promise<void>) {
        const msg: MsgCtx2Bg = _msg as any
        //send config variables to content script
        console.log('message from tab, request.message ===', msg.message, msg)
        if (!sender.tab) {
            console.warn('[To Developer] Impossible... Why sender has no tab.id???')
            return
        }
        const senderTabId = sender.tab!.id!
        if (msg.message == "config_values_request") {
            sendResponseCallback({
                userKanjiList: localStorage.getItem("user_kanji_list"),
                includeLinkText: localStorage.getItem("include_link_text"),
                useMobileFloatingButton: lsMan.useMobileFloatingButton,
                globallyShowMobileFloatingButton: lsMan.globallyShowMobileFloatingButton,
                watchPageChange: localStorage.getItem("watch_page_change"),
                persistentMode: localStorage.getItem("persistent_mode"),
                autoStart: localStorage.getItem("auto_start"),
                crossTabsFuriganaEnabled: CROSS_TABS_FURIGANA_ENABLED
            });
        //prepare tab for injection
        } else if (msg.message == "init_dom_parser_for_tab") {
            enableTabForFI(sender.tab)
        } else if (msg.message == 'force_load_dom_parser') {
            //sometime loaded `content_full` unloaded by unknown reason (ex: Idle for too long on Android?), reload it.
            return browser.tabs.executeScript(senderTabId, {
                file: "/js/content_full.js"
            });
            //process DOM nodes containing kanji and insert furigana
        } else if (msg.message == 'text_to_furiganize') {
            setupBrowserActionIcon('PROCESSING', senderTabId)
            workerMan.runIgo(msg.textMapNeedFuriganaize).then((furiganaized) => {
                //send processed DOM nodes back to the tab content script
                browser.tabs.sendMessage(senderTabId, {
                    furiganizedTextNodes: furiganaized
                });
            })
        } else if (msg.message === "set_page_action_icon_status") {
            const newValue = msg.value
            window.setTimeout(() => {
                setupBrowserActionIcon(newValue, senderTabId)
            }, 200)
        } else if (msg.message === 'set_cross_tabs_furigana_enabled') {
            console.log('set CROSS_TABS_FURIGANA_ENABLED', msg.value)
            CROSS_TABS_FURIGANA_ENABLED = msg.value
        } else {
            console.log("Programming error: a request with the unexpected \"message\" value \"" + msg + "\" was received in the background page.");
        }
    }
);

//Storage events
// window.addEventListener("storage",
    // function(e) {
        // if (e.key == "user_kanji_list") { //re-initialize the data in each tab (when they reload or they move to a new page)
            // USER_KANJI_REGEXP = new RegExp("[" + localStorage.getItem("user_kanji_list") + "]");
        // }
    // }, false);