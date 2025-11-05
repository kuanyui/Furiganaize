/**
 * [experimental]
 *
 * Request & expected response (message) sent from tab to background */
type MsgMap_Tab2Bg = {
  text_to_furiganize: {
    req: { message: "text_to_furiganize", textMapNeedFuriganaize: Record<number, string> },
    res: { furiganizedTextNodes: Record<number, string> },
  },
  request_storage_root: {
    req: { message: "request_storage_root" },
    res: MyStorageRoot,
  },
  load_full_content_script_for_tab: {
    req: { message: "load_full_content_script_for_tab" },
    res: never,
  },
  force_load_full_content_script_for_tab: {
    req: { message: "force_load_full_content_script_for_tab" },
    res: never,
  },
  set_page_action_icon_status: {
    req: { message: "set_page_action_icon_status", value: furiganaize_state_t },
    res: never,
  },
  set_cross_tabs_furigana_enabled: {
    req: { message: "set_cross_tabs_furigana_enabled", value: boolean },
    res: never,
  },
}

type MsgTab2Bg = MsgMap_Tab2Bg[keyof MsgMap_Tab2Bg]['req']

type MsgTab2Bg_Resp = { furiganizedTextNodes: Record<number, string> }
  // | MsgMap_Tab2Bg[keyof MsgMap_Tab2Bg]['res']

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
    static bgSendToTab <T extends MsgTab2Bg_Resp> (tabId: number, msg: T) {
        return browser.tabs.sendMessage(tabId, msg) as Promise<T | void>
    }
    static bgSendToTab2 <T extends MsgMap_Tab2Bg[keyof MsgMap_Tab2Bg]['res']> (tabId: number, msg: T) {
        return browser.tabs.sendMessage(tabId, msg)
    }
    static tabSendToBg <T extends MsgTab2Bg> (msg: T) {
        return browser.runtime.sendMessage(msg)
    }
    static tabSendToBg2<M extends MsgMap_Tab2Bg[keyof MsgMap_Tab2Bg]['req']>(msg: M):
        Promise< M["message"] extends keyof MsgMap_Tab2Bg ? MsgMap_Tab2Bg[M["message"]]["res"] : never> {
        return browser.runtime.sendMessage(msg) as any
    }
}