declare namespace JsDiff {
    type DiffResultItem =
        /** if the two string are identical */
        { value: string, added: undefined, removed: undefined } |
        /** value is old string */
        { value: string, added: undefined, removed: true } |
        /** value is new string */
        { value: string, added: true, removed: undefined }
    export function diffChars(oldStr: string, newStr: string): DiffResultItem[]
}