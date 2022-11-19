// This file should be loaded by
// - options_ui
// - background

type furigana_type_t = 'hira' | 'kata' | 'roma'
type MsgCtx2Bg =
    { message: "text_to_furiganize", textMapNeedFuriganaize: Record<number, string> } |
    { message: "config_values_request" } |
    { message: "init_dom_parser_for_tab" } |
    { message: "force_load_dom_parser" } |
    { message: "set_page_action_icon_status", value: furiganaize_state_t } |
    { message: "set_cross_tabs_furigana_enabled", value: boolean }

type MsgBg2Ctx =
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

//initialize local storage
var DEFAULT_LOCAL_STORAGE_PREFERENCE = {
    "include_link_text": true,
    "furigana_display": "hira",
    "filter_okurigana": true,
    "yomi_size_value": "",
    "yomi_size_unit": "__unset__",
    "yomi_color": "",
    "use_mobile_floating_button": false,
    "watch_page_change": false,
    "persistent_mode": false,
    "auto_start": false,
    "prevent_splitting_consecutive_kanjis": true,
} as const

function initLocalStorageWithDefaultValues() {
    let key: keyof typeof DEFAULT_LOCAL_STORAGE_PREFERENCE
    for (key in DEFAULT_LOCAL_STORAGE_PREFERENCE) {
        if (localStorage.getItem(key) === null) {
            console.log("The localStorage \"" + key + "\" value was null. It will be initialised to" + DEFAULT_LOCAL_STORAGE_PREFERENCE[key] + ".");
            localStorage.setItem(key, DEFAULT_LOCAL_STORAGE_PREFERENCE[key] + "");
        }
    }
}

