declare namespace Zip {
    interface ZipData {
        directories: Record<string, ZipDirectory>
        files: Record<string, ZipFile>
        record: ZipRecord
    }
    interface ZipDirectory {
        attributes: number
        bitFlag: nubmer
        comment: string
        commentLength: number
        crc32: number
        diskNumberStart: number
        extAttributes: number
        extVersion: number
        extra: string
        extraLength: number
        fileDate: number
        fileSize: number
        fileTime: number
        headerOffset: number
        method: number
        /** ファイル名前 */
        name: string
        nameLength: number
        size: number
        version: number
    }
    class ZipFile {
        bitFlag:number
        crc32: number
        /** 圧縮済みデータ(バイト列) */
        data: Uint8Array
        extra: string
        extraLength: number
        fileDate: number
        /** 圧縮前サイズ */
        fileSize: number
        fileTime: number
        method: number
        /** ファイル名前 */
        name: string
        nameLength: number
        /** 圧縮後サイズ */
        size: number
        version: number
        /** ファイル作成日時を取る */
        modified(): Date
        /** 展開されたデータを取る */
        inflate(): Uint8Array
    }
    interface ZipRecord {
        comment: string
        commentLength: number
        directorySize: number
        diskLength: number
        diskNumber: number
        length: number
        offset: number
        startNumber: number
    }
    export function inflate_file(url: string, callback: (result: ZipData) => void)
    export function inflate(bytes: Uint8Array): ZipData
}