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

function deepMergeSubset<T>(originalRoot: T, subsetRoot: DeepPartial<T>): void {
    if (!originalRoot) { return }
    for (const k in subsetRoot) {
        if (isObject(subsetRoot[k])) {
            // @ts-ignore
            deepMergeSubset(originalRoot[k], subsetRoot[k])
        } else {
            // @ts-ignore
            originalRoot[k] = subsetRoot[k]
        }
    }
    return
}


function isObject<T extends object>(x: any): x is T {
    return typeof x === 'object' &&
        !Array.isArray(x) &&
        x !== null
}

function deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x))
}

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>
} : T
