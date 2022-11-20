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

interface ConfigStorageRoot {
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
    /** Used for internal state, shared across tab */
    globally_show_mobile_floating_button: boolean
    /** Use MutationObserver to watch dynamic page */
    watch_page_change: boolean
    /** Keep Furigana on/off status across tabs and pages. NOT RECOMMENDED. */
    persistent_mode: boolean
    /** Auto-start always. NOT RECOMMENDED. */
    auto_start: boolean
    /** Always prefer to choose the longer segmentations when analyzing a
     * sentence, to prevent some wrong splitting of consecutive Kanji characters
     **/
    prevent_splitting_consecutive_kanjis: boolean
}

//initialize local storage
var DEFAULT_LOCAL_STORAGE_PREFERENCE: ConfigStorageRoot = {
    include_link_text: true,
    furigana_display: "hira",
    filter_okurigana: true,
    yomi_size_value: "",
    yomi_size_unit: "__unset__",
    yomi_color: "",
    use_mobile_floating_button: false,
    globally_show_mobile_floating_button: false,
    watch_page_change: false,
    persistent_mode: false,
    auto_start: false,
    prevent_splitting_consecutive_kanjis: true,
} as const

/**
 * @return true if modified the originalRoot. Else, false.
 */
function deepObjectShaper<T, U>(originalRoot: T, wishedShape: U): boolean {
    let modified = false
    for (const k in originalRoot) {
        // @ts-expect-error
        if (!Object.keys(wishedShape).includes(k)) {
            delete originalRoot[k]
            modified = true
        }
    }
    for (const k in wishedShape) {
        // @ts-expect-error
        const ori = originalRoot[k]
        const wish = wishedShape[k]
        if (isObject(ori) && isObject(wish)) {
            modified = modified || deepObjectShaper(ori, wish)
        // @ts-expect-error
        } else if (!Object.keys(originalRoot).includes(k)) {
            // @ts-expect-error
            originalRoot[k] = wishedShape[k]
            modified = true
        } else if (typeof ori !== typeof wish) {
            // @ts-expect-error
            originalRoot[k] = wishedShape[k]
            modified = true
        } else {
            // skip
        }
    }
    return modified
}
function isObject<T extends object>(x: any): x is T {
    return typeof x === 'object' &&
        !Array.isArray(x) &&
        x !== null
}

function deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x))
}

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
    getDefaultRoot(): ConfigStorageRoot {
        return Object.assign({}, DEFAULT_LOCAL_STORAGE_PREFERENCE)
    }
    setRootSubsetPartially(subset: Partial<ConfigStorageRoot>): Promise<void> {
        return this.getRoot().then((existingRoot) => {
            Object.assign(existingRoot, subset)
            this.area.set(existingRoot as any)
        })
    }
    setRoot(newRoot: ConfigStorageRoot) {
        this.area.set(newRoot as any)
    }
    /** Without migrations */
    initAndGetRoot(): Promise<ConfigStorageRoot> {
        return this.area.get().then((_ori) => {
            /** may be malformed */
            const DEFAULT_ROOT = this.getDefaultRoot()
            let modified: boolean
            let root = _ori as unknown as ConfigStorageRoot
            if (!root) {
                root = DEFAULT_ROOT
                modified = true
            } else {
                modified = deepObjectShaper(root, DEFAULT_ROOT)
            }
            console.log('[GET] browser.storage.sync.get() ORIGINAL', deepCopy(root))
            if (modified) {
                this.setRoot(root)
            }
            return root
        })
    }
    /** Get data object from LocalStorage */
    getRoot(): Promise<ConfigStorageRoot> {
        return this.area.get().then((root) => {
            return root as unknown as ConfigStorageRoot
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
    onOptionsChanged(cb: (newOptions: ConfigStorageRoot, changes: TypedChangeDict<ConfigStorageRoot>) => void) {
        browser.storage.onChanged.addListener((_changes, areaName) => {
            const changes = _changes as TypedChangeDict<ConfigStorageRoot>
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
