# Furiganaize

A browser extension that can inject phonetic annotations of Japanese text (振り仮名, furigana) on the fly.

Forked from [ilya.lissoboi's FuriganaInjectorPlusPlus](https://github.com/ilyalissoboi/FuriganaInjectorPlusPlus)

- Ported to WebExtension
- Compatible with Firefox for Android.

# Install
You can install latest stable release on [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/furiganaize/)

# Todo list
- New icon on SVG
- Use `browser.browserAction` to make it more convenient to tap on Android?
- Check `typeof toggleFurigana` before calling it. (if undefined, load it.)
- Customizable shortcuts

# Known Issues
- Not works on Google search result page.
- For overlapped word splitting, for example, 低音域（ていおんいき）, will be splitted into ていおん and おんいき, then it will has an overlapping. However, when disable Furiganaize, this will cause something like (おん)(おん)(おん).
  - Seems some other conditions will result to the above issue.
- Don't add furigana in `<input>`, `<textarea>`
- Considering remove `persistent_mode` because I don't know what it is doing...

# About License
I originally found this great Chrome extension at [ilya.lissoboi](https://github.com/ilyalissoboi)'s [FuriganaInjectorPlusPlus](https://github.com/ilyalissoboi/FuriganaInjectorPlusPlus), but I want to make it run on my Firefox for Android so I forked it and port it into WebExtension. [It's license is MIT](https://github.com/ilyalissoboi/FuriganaInjectorPlusPlus/blob/master/LICENSE) so I decide to follow it.

HOWEVER, after some DuckDuckGoing, I found it seems the original author may be [https://github.com/akira-kurogane](https://github.com/akira-kurogane), with his [Furigana Injector](http://code.google.com/p/furigana-injector/) hosting on Google Code which has been redirected to [Github](https://github.com/akira-kurogane/furigana-injector). **AND its Firefox extension (legacy, not WebExtension) is released under GPLv2**. The worse thing is that Chrome extension version has no information about license.

This is a chaos, so I searched [getServerFileToArrayBufffer](https://github.com/search?q=getServerFileToArrayBufffer) on Github, I found several people use the same code, but the copyright holder in LICENSE is replaced with themselves names. The worst, somebody even deleted all commit history, I don't know why they did such thing.

I have to say this made me so sad. The developers spending their free time and vacations on FLOSS projects should always be respected.

## 3rd-party libraries
For those who has no license declaration in `lib/`:
- [igo.js](https://github.com/shogo82148/igo-javascript) - MIT
- [zip.js](https://github.com/shogo82148/zipjs) - Unknown
