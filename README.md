# Furiganaize

A browser extension that can inject phonetic annotations of Japanese text (振り仮名, furigana) on the fly.

Forked from [ilya.lissoboi's FuriganaInjectorPlusPlus](https://github.com/ilyalissoboi/FuriganaInjectorPlusPlus)

> I develop and release **all** my open-source software projects **for free**, and are ALL licensed under **`WTFPL`, `GPL`, `MIT`, or `MPL`. however, my “free time” is not free actually**.
> If my works are usable to you or make you happy, please consider to donate to **reduce my business hours to _make more free and open-source projects for you and this world_**.
>
> Attention: Donate **only if you feel happy**; it is totally voluntary, I would never force you to do this. I always try as possible as I can to make good project because I need, and wish my work could also be helpful to others. If you donate, I will be glad and grateful, **but I cannot provide any gurantee or warranty for this project even if you do this.**
>
> - <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=G4F7NM38ADPEC&source=url"> <img width="24" height="24" src="https://raw.githubusercontent.com/kuanyui/kuanyui/main/img/paypal.svg"/>PayPal</a>
> - <a href="https://liberapay.com/onoono"> <img width="24" height="24" src="https://raw.githubusercontent.com/kuanyui/kuanyui/main/img/liberapay.svg"/>LiberaPay</a></li>
> - <a href="https://www.patreon.com/onoono"> <img width="24" height="24" src="https://raw.githubusercontent.com/kuanyui/kuanyui/main/img/patreon.svg"/>Patreon</a></li>
>
> Thanks for your contribution!

## Differences between FuriganaInjectorPlusPlus:
### Compatible
- Ported to WebExtension
- Compatible with Firefox for Android / Fenix.
### Features
- `[beta]` Add floating button for mobile, which let you able to trigger it quickly.
- `[beta]` Add dynamic page support (e.g. Twitter).
- Show enable / disable status via badge. (Because WebExtension API doesn't provide any way to detect dark/light status of browser theme)
- Add support for light / dark theme.
### Performance
- Use WebWorker to analyze sentence to prevent blocking and improve performance & UX.
- Huge improvement on the performance of removing ruby tags.
- Some other small performance improvements.
### Bugfixes
- Improved compatibility for website with `<noscript>`, like Google, Twitter.
- Fix bugs that some Furiganas may unable to be removed correctly. (For overlapped word splitting, for example, 低音域（ていおんいき）, will be splitted into ていおん and おんいき, then it will has an overlapping. However, when disable Furiganaize, this will cause something like (おん)(おん)(おん).)
- Fix potential freezing in some page (e.g. https://materialdesignicons.com/)
- Some other little bugfixes.

# Install
You can install latest stable release on [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/furiganaize/)

# Dev
```bash
web-ext --verbose --firefox-profile ${HOME}/.mozilla/firefox/PROFILE_DIR/ run

# or
adb devices
web-ext run -t firefox-android --adb-device XXXXXX --firefox-apk org.mozilla.fenix
```
> ATTENTION: Due to Firefox currently doesn't support `background.service_worker` in manifest.json, this project use the most simple GNU `cat` to concatenate JS files for WebWorker... please use `make cat` to create JS file for WebWorker before you dev.

# Build to *.xpi
```bash
make xpi
```

# Known Issues
- It's **IMPOSSIBLE** to use this add-on under some special pages or domains like https://addons.mozilla.org/ . This is the restriction of Firefox browser itself.
- Some kanjis are annotated with wrong furigana. This is a known issue, and not the responsibility of this package (instead, this is implemented via 3rd-party library `igo.js`). **PLEASE DO NOT OPEN ISSUE ABOUT THIS ANYMORE.**


# About License
I originally found this great Chrome extension at [ilya.lissoboi](https://github.com/ilyalissoboi)'s [FuriganaInjectorPlusPlus](https://github.com/ilyalissoboi/FuriganaInjectorPlusPlus), but I want to make it run on my Firefox for Android so I forked it and port it into WebExtension. [It's license is MIT](https://github.com/ilyalissoboi/FuriganaInjectorPlusPlus/blob/master/LICENSE) so I decide to follow it.

HOWEVER, after some DuckDuckGoing, I found it seems the original author may be [https://github.com/akira-kurogane](https://github.com/akira-kurogane), with his [Furigana Injector](http://code.google.com/p/furigana-injector/) hosting on Google Code which has been redirected to [Github](https://github.com/akira-kurogane/furigana-injector). **AND its Firefox extension (legacy, not WebExtension) is released under GPLv2**. The worse thing is that Chrome extension version has no information about license.

This is a chaos, so I searched [getServerFileToArrayBufffer](https://github.com/search?q=getServerFileToArrayBufffer) on Github, I found several people use the same code, but the copyright holder in LICENSE is replaced with themselves names. The worst, somebody even deleted all commit history, I don't know why they did such thing.

I have to say this made me so sad. The developers spending their free time and vacations on FLOSS projects should always be respected.

## 3rd-party libraries
For those who has no license declaration in `lib/`:
- [igo.js](https://github.com/shogo82148/igo-javascript) - MIT
- [zip.js](https://github.com/shogo82148/zipjs) - Unknown
- [WanaKana](https://github.com/WaniKani/WanaKana) - MIT
