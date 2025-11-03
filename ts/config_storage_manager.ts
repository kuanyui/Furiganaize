// This file should be loaded by
// - options_ui
// - background

type TypedStorageChange<T> = {
    oldValue: T
    newValue: T
}
/** Strong typed version ChangeDict for WebExtension (e.g. browser.storage.onChanged).
 * T is the custom storage interface
 */
type TypedChangeDict<T> = { [K in keyof T]: TypedStorageChange<T[K]> }

type furigana_type_t = 'hira' | 'kata' | 'roma'

interface MyStorageRoot {
    settings: MyStorageSettings
    state: MyStorageState
}

interface MyStorageSettings {
    /** Add furigana in anchor element (`<a>`) */
    include_link_text: boolean
    /** Show furigana as Hiragana, Katakana or Romaji */
    furigana_display: furigana_type_t
    /** Handle Okurigana (See example in options.html) */
    filter_okurigana: boolean
    /** Furigana's font-size value.
     * - Stored with string instead of number because it may be float. For example, 0.6em */
    yomi_size_value: string
    /** Furigana's font-size unit */
    yomi_size_unit: string
    /** Furigana's color */
    yomi_color: string
    /** Used in options */
    use_mobile_floating_button: boolean
    /** Use MutationObserver to watch dynamic page */
    watch_page_change: boolean
    /** Keep Furigana on/off status across tabs and pages. NOT RECOMMENDED. */
    persistent_mode: boolean
    /** Auto-start always. NOT RECOMMENDED.
     * FIXME: Remove AUTO_START?
     * @depreacted
     */
    auto_start: boolean
    /** Always prefer to choose the longer segmentations when analyzing a
     * sentence, to prevent some wrong splitting of consecutive Kanji characters
     **/
    prevent_splitting_consecutive_kanjis: boolean
}

interface MyStorageState {
    /**
     * - Used for internal state, shared across tabs.
     * - Only usable when {@link MyStorageSettings.use_mobile_floating_button} is true
     * REFACTOR: rename: `mobile_floating_button__toggled`
     **/
    mobile_floating_button__show_button_in_all_tabs: boolean
    /**
     * - `true` means the float button is toggled (furigana is visible).
     */
    // mobile_floating_button__button_is_toggled: boolean
    /**
     * - Current **"show furigana"** status, shared across tabs.
     * - Only usable when {@link MyStorageSettings.persistent_mode} is true
     * REFACTOR: rename: `persistent_mode__toggled`
     **/
    persistent_mode__all_tabs_show_furigana: boolean
}

//initialize local storage
var DEFAULT_LOCAL_STORAGE_ROOT: MyStorageRoot = {
    settings: {
        include_link_text: true,
        furigana_display: "hira",
        filter_okurigana: true,
        yomi_size_value: "",
        yomi_size_unit: "__unset__",
        yomi_color: "",
        use_mobile_floating_button: false,
        watch_page_change: false,
        persistent_mode: false,
        auto_start: false,
        prevent_splitting_consecutive_kanjis: true,
    },
    state: {
        mobile_floating_button__show_button_in_all_tabs: false,
        persistent_mode__all_tabs_show_furigana: false,
    }
} as const


class ConfigStorageManager {
    // tsconfig: useDefineForClassFields = false
    area: browser.storage.StorageArea
    constructor() {
        // this addon can be used on Mobile and desktop and may need different
        // config among them so use browser.storage.local instead of
        // browser.storage.sync
        this.area = browser.storage.local
        this.initAndGetRoot()
    }
    public getDefaultRoot(): MyStorageRoot {
        return Object.assign({}, DEFAULT_LOCAL_STORAGE_ROOT)
    }
    public deepMergeToRoot(subset: DeepPartial<MyStorageRoot>): Promise<void> {
        return this.getRoot().then((existingRoot) => {
            deepMergeSubset(existingRoot, subset)
            this.area.set(existingRoot as any)
        })
    }
    private setRootArbitrary(newRoot: MyStorageRoot) {
        this.area.set(newRoot as any)
    }
    private setRootSafely(newRoot: MyStorageRoot) {
        return this.getRoot().then((existingRoot) => {
            deepObjectShaper(newRoot, existingRoot)
            this.area.set(newRoot as any)
        })
    }
    /** Without migrations */
    private initAndGetRoot(): Promise<MyStorageRoot> {
        return this.area.get().then((_ori) => {
            /** may be malformed */
            const DEFAULT_ROOT = this.getDefaultRoot()
            let modified: boolean
            let root = _ori as unknown as MyStorageRoot
            if (!root) {
                root = DEFAULT_ROOT
                modified = true
            } else {
                modified = deepObjectShaper(root, DEFAULT_ROOT)
            }
            console.log('[GET] browser.storage.sync.get() ORIGINAL', deepCopy(root))
            if (modified) {
                this.setRootSafely(root)
            }
            return root
        })
    }
    /** Get data object from LocalStorage */
    public getRoot(): Promise<MyStorageRoot> {
        return this.area.get().then((_root) => {
            const root = _root as MyStorageRoot
            if (!root.settings) {  // if empty
                return this.initAndGetRoot()
            }
            return root
        }).catch((err) => {
            console.error('Error when getting settings from browser.storage:', err)
            return this.initAndGetRoot()
        })
    }
    // getData<K extends keyof ConfigStorageRoot>(category: K): Promise<ConfigStorageRoot[K]> {
    //     return this.getRoot().then((root) => {
    //         return root[category]
    //     })
    // }
    onRootChanged(cb: (newOptions: MyStorageRoot, changes: TypedChangeDict<MyStorageRoot>) => void) {
        browser.storage.onChanged.addListener((_changes, areaName) => {
            const changes = _changes as TypedChangeDict<MyStorageRoot>
            console.warn('[ConfigStorageManager] browser.storage.onChanged', changes)
            if (areaName === 'sync' || areaName === 'local') {
                if (changes) {
                    this.getRoot().then((newRoot) => {
                        cb(newRoot, changes)
                    })
                }
            }
        })
    }

}

const configStorageManager = (typeof browser !== 'undefined' ? new ConfigStorageManager() : null) as ConfigStorageManager
