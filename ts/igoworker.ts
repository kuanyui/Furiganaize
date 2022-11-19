var DICT_FILES = ['char.category', 'code2category', 'word2id', 'word.dat', 'word.ary.idx', 'word.inf', 'matrix.bin'];
var TAGGER: igo.Tagger

console.log('WORKER!!!')
// initialize IGO-JS
igo.getServerFileToArrayBufffer("../res/ipadic.zip", function(buffer) {
    try {
        var blob = new Blob([new Uint8Array(buffer)]);
        var reader = new FileReader();
        reader.onload = function(e) {
            console.log('Unzipping data for igo.js...')
            var dic = Zip.inflate(new Uint8Array(reader.result as ArrayBuffer))
            console.log('Loading data for igo.js...')
            TAGGER = loadTagger(dic);
            console.log('igo.js is ready.')
        }
        reader.readAsArrayBuffer(blob);
        console.log('Initialize data for igo.js....')
    } catch (e: any) {
        console.error(e.toString());
    }
});

function loadTagger(dicdir: Zip.ZipData) {
    var inflatedFiles: Record<string, Uint8Array> = {}
    for (const fileName of DICT_FILES) {
        inflatedFiles[fileName] = dicdir.files[fileName].inflate();
    }
    var category = new igo.CharCategory(inflatedFiles['code2category'], inflatedFiles['char.category']);
    var wdc = new igo.WordDic(inflatedFiles['word2id'], inflatedFiles['word.dat'], inflatedFiles['word.ary.idx'], inflatedFiles['word.inf']);
    var unk = new igo.Unknown(category);
    var mtx = new igo.Matrix(inflatedFiles['matrix.bin']);
    return new igo.Tagger(wdc, unk, mtx);
}

onmessage = (_request) => {
    const req: MsgBg2IgoWorker = _request.data
    const response: MsgIgoWorker2Bg = {
        reqId: req.reqId,
        furiganaizedTextMap: {}
    }
    const processedMap = response.furiganaizedTextMap
    // console.log('onMessage ==>', req)
    const yomiStyle = req.options.yomiStyle
    const preferLongerKanjiSegments = req.options.preferLongerKanjiSegments
    const filterOkurigana = req.options.filterOkurigana
    const furiganaType = req.options.furiganaType
    for (const _key in req.textMapNeedsFuriganaize) {
        const key = parseInt(_key)
        processedMap[key] = req.textMapNeedsFuriganaize[key];
        const tagged = TAGGER.parse(req.textMapNeedsFuriganaize[key]);
        // console.log('-->', tagged)
        let processed = '';
        // override numeric term (dates, ages etc) readings
        // TODO: implement override
        // var numeric = false;
        // var numeric_yomi = EXCEPTIONS;
        // var numeric_kanji = '';

        if (preferLongerKanjiSegments) {
            // sort tagged in order to add furigana
            // for the longer Kanji series first
            tagged.sort(function(a: igo.Morpheme, b: igo.Morpheme) {
                var kanjiRegExp = /([\u3400-\u9FBF]*)/
                const aMatch = a.surface.match(kanjiRegExp)
                const bMatch = b.surface.match(kanjiRegExp)
                if (!aMatch) { return 0 }
                if (!bMatch) { return 0 }
                var aKanji = aMatch[0]
                var bKanji = bMatch[0]
                return bKanji.length - aKanji.length
            });
        }
        // console.log('tagged ===>', tagged)

        tagged.forEach((t) => {
            if (t.surface.match(/[\u3400-\u9FBF]/)) {
                let kanji = t.surface;
                let yomi = t.feature.split(',')[t.feature.split(',').length - 2];

                //filter okurigana (word endings)
                if (filterOkurigana) {
                    const diff = JsDiff.diffChars(kanji, wanakana.toHiragana(yomi));
                    let kanjiFound = false;
                    let yomiFound = false;
                    //separate kanji and kana characters in the string using diff
                    //and inject furigana only into kanji part
                    diff.forEach((part) => {
                        if (part.added) {
                            yomi = wanakana.toKatakana(part.value);
                            yomiFound = true;
                        }
                        if (part.removed) {
                            kanji = part.value;
                            kanjiFound = true;
                        }
                        if (kanjiFound && yomiFound) {
                            addRuby(processedMap, key, kanji, yomi, processed, yomiStyle, furiganaType, preferLongerKanjiSegments);
                            kanjiFound = false;
                            yomiFound = false;
                        }
                    });
                } else {
                    addRuby(processedMap, key, kanji, yomi, processed, yomiStyle, furiganaType, preferLongerKanjiSegments);
                }
            }
        });
    }
    // console.log('Furiganized ===>', FURIGANAIZED)
    postMessage(response)
}


//Ruby tag injector
function addRuby(processMap: Record<number, string>,  key: number, kanji: string, yomi: string, processed: string, yomiStyle: string, furiganaType: furigana_type_t, preferLongerKanjiSegments: boolean) {
    //furigana can be displayed in either hiragana, katakana or romaji
    switch (furiganaType) {
        case "hira":
            yomi = wanakana.toHiragana(yomi);
            break;
        case "roma":
            yomi = wanakana.toRomaji(yomi);
            break;
        default:
            break;
    }
    // const rubyPatt = new RegExp(`<ruby><rb>${kanji}<\\/rb><rp>\\(<\\/rp><rt[ style=]*.*?>([\\u3040-\\u3096|\\u30A1-\\u30FA|\\uFF66-\\uFF9D|\\u31F0-\\u31FF]+)<\\/rt><rp>\\)<\\/rp><\\/ruby>`, 'g');
    const rubyPatt = new RegExp(`<ruby><rb>${kanji}<\\/rb><rt[ style=]*.*?>([\\u3400-\\u9FBF]+)<\\/rt><\\/ruby>`, 'g');

    //inject furigana into text nodes
    //a different regex is used for repeat passes to avoid having multiple rubies on the same base
    if (processed.indexOf(kanji) == -1) {
        processed += kanji;
        if (processMap[key].match(rubyPatt)) {
            // furiganized[key] = furiganized[key].replace(rubyPatt, `<ruby><rb>${kanji}</rb><rp>(</rp><rt style="${yomiStyle}">${yomi}</rt><rp>)</rp></ruby>`);
            processMap[key] = processMap[key].replace(rubyPatt, `<ruby><rb>${kanji}</rb><rt style="${yomiStyle}">${yomi}</rt></ruby>`);
        } else {
            let bare_rxp: RegExp
            if (preferLongerKanjiSegments) {
                bare_rxp = new RegExp(kanji + `(?![^<]*<\/rb>)`, 'g');
            } else {
                bare_rxp = new RegExp(kanji, 'g');
            }
            processMap[key] = processMap[key].replace(bare_rxp, `<ruby><rb>${kanji}</rb><rt style="${yomiStyle}">${yomi}</rt></ruby>`);
        }
    }
}
