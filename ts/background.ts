var a = 0;
var EXCEPTIONS = null;
/**
 * - Current **"(cross-tab) keep on/off"** status.
 * - NOT stored in settings.
 * - For PERSISTENT_MODE only.
 **/
var CROSS_TABS_FURIGANA_ENABLED = false;
/** For read synchronously. To write, please use configStorageManager */
var STORAGE: ConfigStorageRoot = configStorageManager.getDefaultRoot()

configStorageManager.getRoot().then((obj) => {
    Object.assign(STORAGE, obj)
  })
  configStorageManager.onOptionsChanged((newRoot, changes) => {
    console.log('[background] storage changed!', changes)
    Object.assign(STORAGE, newRoot)
})

function doInCurrentTab(tabCallback: (tab: browser.tabs.Tab) => void) {
    browser.tabs.query(
        { currentWindow: true, active: true },
    ).then((tabs) => {
        tabCallback(tabs[0])
    })
}


// For keyboard shortcut only
if (browser.commands) {  // NOTE: Android does not support browser.commands
    browser.commands.onCommand.addListener(function (cmd) {
        console.log('trigger via browser commands (keyboard shortcuts)')
        if (cmd === 'toggle-furigana') {
            doInCurrentTab(function (curTab) {
                if (STORAGE.use_mobile_floating_button) {
                    if (STORAGE.globally_show_mobile_floating_button) {
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
                    STORAGE.globally_show_mobile_floating_button = !STORAGE.globally_show_mobile_floating_button
                    setupBrowserActionIcon('UNTOUCHED', undefined)  // FIXME: Don't sure wtf is this.
                } else {
                    browser.tabs.executeScript(curTab.id, {code: "safeToggleFurigana();"});
                }
            })
        }
    })
}

// Click on browserAction icon
browser.browserAction.onClicked.addListener(function (curTab) {    // if (STORAGE.'persistent_mode')) == true) {//     browser.tabs.query({} ,function (tabs) {
    //         for (var i = 0; i < tabs.length; i++) {
    //             browser.tabs.executeScript(tabs[i].id, {code: "safeToggleFurigana();"});
    //         }
    //     });
    // }
    if (STORAGE.use_mobile_floating_button) {
        if (STORAGE.globally_show_mobile_floating_button) {
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
        STORAGE.globally_show_mobile_floating_button = !STORAGE.globally_show_mobile_floating_button
        setupBrowserActionIcon('UNTOUCHED', undefined)  // FIXME: Don't sure wtf is this.
    } else {
        browser.tabs.executeScript(curTab.id, {code: "safeToggleFurigana();"});
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


setupBrowserActionIcon("UNTOUCHED", undefined)
var blinkTimeoutId = -1
/** If tabId not specified, it means all tabs. */
function setupBrowserActionIcon(state: furiganaize_state_t, tabId: number | undefined) {
    console.log('ICON STATE===', state)
    browser.browserAction.enable(tabId)
    window.clearTimeout(blinkTimeoutId)
    if (STORAGE.use_mobile_floating_button) {
        // TODO: Set different title or color for mobile floating icon
        if (STORAGE.globally_show_mobile_floating_button) {
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
        const preferLongerKanjiSegments = STORAGE.prevent_splitting_consecutive_kanjis
        const filterOkurigana = STORAGE.filter_okurigana
        const furiganaType = STORAGE.furigana_display
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
        const msg: MsgTab2Bg = _msg as any
        //send config variables to content script
        console.log('message from tab, request.message ===', msg.message, msg)
        if (!sender.tab) {
            console.warn('[To Developer] Impossible... Why sender has no tab.id???')
            return
        }
        const senderTabId = sender.tab!.id!
        if (msg.message == "config_values_request") {
            sendResponseCallback({
                // userKanjiList: STORAGE.user_kanji_list,  // DEPRECATED
                includeLinkText: STORAGE.include_link_text,
                use_mobile_floating_button: STORAGE.use_mobile_floating_button,
                globally_show_mobile_floating_button: STORAGE.globally_show_mobile_floating_button,  // TODO: shit
                watchPageChange: STORAGE.watch_page_change,
                persistentMode: STORAGE.persistent_mode,
                autoStart: STORAGE.auto_start,
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

