declare namespace igo {
    export function getServerFileToArrayBufffer<T=any>(url: string, successCb: (xhrResponse: T) => void)
    export class CharCategory {
        constructor(code2category: Uint8Array, charcategory: Uint8Array, bigendian: boolean = false)
    }
    export class WordDic {
        constructor(word2id: Uint8Array, worddat: Uint8Array, wordary: Uint8Array, wordinf: Uint8Array, bigendian: boolean = false)
    }
    export class Matrix {
        constructor(buffer: Uint8Array, bigendian: boolean = false)
    }
    /** 未知語の検索を行うクラス */
    export class Unknown {
        constructor(category)
        search(text: string, start: number, wdic: WordDic, callback)
    }
    export class Tagger {
        constructor(worddic: WordDic, unknown: Unknown, matrix: Matrix)
        parse (text: string, result: Morpheme[] = [])
    }
    /** 形態素クラス */
    export class Morpheme {
        /**
         * @param surface 形態素の表層形
         * @param feature 形態素の素性
         * @param start テキスト内での形態素の出現開始位置
         */
        constructor(surface: string, feature: string, start: number)
        /** 形態素の表層形 */
        surface: string
        /** 形態素の素性 */
        feature: string
        /** テキスト内での形態素の出現開始位置 */
        start: number
    }
}