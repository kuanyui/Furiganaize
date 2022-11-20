import jquery from 'jquery'
export { }
declare global {
    $: jQuery
    interface Document {
        FURIGANAIZE_ENABLED: boolean
    }
}