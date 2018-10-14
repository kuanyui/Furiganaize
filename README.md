# Furiganaize

A browser extension that can inject phonetic annotations of Japanese text (振り仮名, furigana) on the fly.

Forked from [ilya.lissoboi's FuriganaInjectorPlusPlus](https://github.com/ilyalissoboi/FuriganaInjectorPlusPlus)

- Ported to WebExtension
- Compatible with Firefox for Android.

# Install
You can install latest stable release on [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/furiganaize/)

# Todo list
- `document.addEventListener("DOMNodeInserted", DOMNodeInsertedHandler);  // FIXME: Mutation Events has been deprecated, use MutationObserve instead.`
- New icon on SVG
- Use `browser.browserAction` to make it more convenient to tap on Android?
