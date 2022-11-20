/// <reference path="jquery.d.ts"/>

interface ColpickHSB { h: number, s: number, b: number }
interface ColpickRGB { r: number, g: number, b: number }
interface ColpickOptions {
    layout: string,
    submit: number,
    onChange: (hsb: ColpickHSB, hex: string, rgb: ColpickRGB, el: HTMLElement, bySetColor: boolean) => void
}
interface JQuery {
    colpick: (options: ColpickOptions) => JQuery
    colpickHide: () => JQuery
    colpickShow: () => JQuery
    colpickSetColor: (col: ColpickHSB | ColpickRGB | string, setCurrent: boolean = true) => JQuery
}