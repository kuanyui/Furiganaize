type MsgTab2Bg =
    { message: "text_to_furiganize", textMapNeedFuriganaize: Record<number, string> } |
    { message: "request_storage_root" } |
    { message: "load_full_content_script_for_tab" } |
    { message: "force_load_full_content_script_for_tab" } |
    { message: "set_page_action_icon_status", value: furiganaize_state_t } |
    { message: "set_cross_tabs_furigana_enabled", value: boolean }

type MsgBg2Tab =
    { furiganizedTextNodes: Record<number, string> }

type MsgBg2IgoWorker =
    {
        reqId: number,
        textMapNeedsFuriganaize: Record<number, string>
        options: {
            yomiStyle: string
            preferLongerKanjiSegments: boolean
            filterOkurigana: boolean
            furiganaType: furigana_type_t
        }
    }
type MsgIgoWorker2Bg =
    {
        reqId: number
        furiganaizedTextMap: Record<number, string>
    }


class msgManager {
    static bgSendToTab <T extends MsgBg2Tab> (tabId: number, msg: T) {
        return browser.tabs.sendMessage(tabId, msg) as Promise<T | void>
    }
    static tabSendToBg <T extends MsgTab2Bg> (msg: T) {
        return browser.runtime.sendMessage(msg)
    }
}