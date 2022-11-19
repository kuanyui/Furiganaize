// This file should be loaded by
// - options_ui
// - background

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