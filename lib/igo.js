


/********** lib/jsheap/jsheap.js **********/
(function(global) {
    function default_cmp(a, b) {
        return a < b;
    }

    var jsheap = global.jsheap = function(cmp) {
        //Compare function
        this.cmp = cmp || default_cmp;

        // heap[0] is dummpy
        this.heap = [null];
    };

    function swap(heap, a, b) {
        var tmp = heap[a];
        heap[a] = heap[b];
        heap[b] = tmp;
    }

    jsheap.prototype.push = function(item) {
        var heap = this.heap;
        var cmp = this.cmp;
        var i = heap.length;
        var j;

        heap.push(item);
        while(i>1 && cmp(heap[i], heap[ j = i/2 | 0 ])) {
            swap(heap, i, j);
            i = j;
        }
        return this;
    };

    jsheap.prototype.top = function() {
        return this.heap[1];
    };

    jsheap.prototype.pop = function() {
        if(this.empty()) throw new Error('heap is empty');
        var heap = this.heap;
        var cmp = this.cmp;
        var i;
        var item = heap.pop();
        var length = heap.length;
        if(length == 1) return this;

        i = 1;
        heap[1] = item;

        while(i*2 < length) {
            var j = i*2;
            if(j+1 < length && cmp(heap[j+1], heap[j])) {
                ++j;
            }
            if(!cmp(heap[j], heap[i])) {
                break;
            }
            swap(heap, i, j);
            i = j;
        }

        return this;
    };

    jsheap.prototype.empty = function() {
        return this.heap.length <= 1;
    };
})(this);


/********** src/tagger.js **********/
if(typeof exports === 'undefined') {
    igo = {};
} else {
    igo = exports;
    jsheap = igo.jsheap;
}

//形態素クラス
igo.Morpheme = function(surface, feature, start) {
    this.surface = surface; //形態素の表層形
    this.feature = feature; //形態素の素性
    this.start = start; //テキスト内での形態素の出現開始位置
};


igo.Tagger = function(wdc, unk, mtx) {
    this.wdc = wdc;
    this.unk = unk;
    this.mtx = mtx;
};

igo.Tagger.prototype = {
    parse: function(text, result) {
	if(!result) {
	    result = [];
	}
	var vn = this.getBestPath(this.parseImpl(text));
	while(vn) {
	    var surface = text.substring(vn.start, vn.start + vn.length);
	    var feature = this.wdc.wordData(vn.wordId).join('');
	    result.push(new igo.Morpheme(surface, feature, vn.start));
	    vn = vn.prev;
	}
	return result;
    },
    
    parseNBest: function(text, best, results) {
	if(!results) {
	    results = [];
	}
	var vns = this.getNBestPath(this.parseImpl(text), best);
	for(var i=0;i<vns.length;++i) {
	    var n = vns[i];
	    var result = [];
	    while(n) {
		var vn = n.node;
		if(vn.wordId!=0) {
		    var surface = text.substring(vn.start, vn.start + vn.length);
		    var feature = this.wdc.wordData(vn.wordId).join('');
		    result.push(new igo.Morpheme(surface, feature, vn.start));
		}
		n = n.next;
	    }
	    results.push(result);
	}
	return results;
    },
    
    wakati: function(text, result) {
	if(!result) {
	    result = [];
	}
	var vn = this.getBestPath(this.parseImpl(text));
	while(vn) {
	    var surface = text.substring(vn.start, vn.start + vn.length);
	    result.push(surface);
	    vn = vn.prev;
	}
	return result;
    },
    
    parseImpl: function(text) {
	var length = text.length;
	var nodesAry = new Array(length + 1);
	nodesAry[0] = [igo.ViterbiNode.makeBOSEOS()];
	
	var wdc = this.wdc;
	var unk = this.unk;
	var tagger = this;
	var ml = new igo.MakeLattice(nodesAry, function(vn, prevs) {
					 return tagger.setMincostNode(vn, prevs);
				     });
	var fn = function(vn) {
			ml.call(vn);
	};
	fn.isEmpty = function() {
	    return ml.isEmpty();
	};
	for(var i=0; i<length; i++) {
	    if(!nodesAry[i]) continue;
	    ml.set(i);
	    wdc.search(text, i, fn); //単語辞書から形態素を検索
	    if(unk) unk.search(text, i, wdc, fn); //未知語辞書から形態素を検索
	}
	
	nodesAry[length+1] = [this.setMincostNode(igo.ViterbiNode.makeBOSEOS(),
						  nodesAry[length])];
	return nodesAry;
    },
    
    getBestPath: function(nedesAry) {
	var cur = nedesAry[nedesAry.length-1][0].prev;
	var head = undefined;
	while(cur.prev) {
	    var tmp = cur.prev;
	    cur.prev = head;
	    head = cur;
	    cur = tmp;
	}
	return head;
    },
    
    getNBestPath: function(nedesAry, best) {
	var mtx = this.mtx;
	var bests = [];
	var heap = new jsheap(function(a, b) {
				  return a.predict_cost < b.predict_cost;
			      });
	var eos = nedesAry[nedesAry.length-1][0];
	heap.push({node:eos, cost:0, predict_cost: eos.cost, next:undefined});
	while(!heap.empty() && bests.length < best) {
	    var n = heap.top(); heap.pop();
	    if(n.node.wordId==0 && n.next) {
		bests.push(n);
		continue;
	    }
	    
	    var leftId = n.node.leftId;
	    var prevs = n.node.prevs;
	    for(var i=0;i<prevs.length;++i) {
		var cost = n.cost + mtx.linkCost(prevs[i].rightId, leftId) + n.node.nodecost;
		heap.push(
		    {
			node: prevs[i],
			cost: cost,
			predict_cost: cost + prevs[i].cost,
			next: n
		    }
		);
	    }
	}
	return bests;
    },
    
    setMincostNode: function(vn, prevs) {
	var mtx = this.mtx;
	var leftId = vn.leftId;
	var f = prevs[0];
	vn.prev = prevs[0];
	var minCost = f.cost + mtx.linkCost(f.rightId, leftId);
	
	for(var i=1; i<prevs.length; i++) {
	    var p = prevs[i];
	    var cost = p.cost + mtx.linkCost(p.rightId, leftId);
	    if(cost < minCost) {
		minCost = cost;
		vn.prev = p;
	    }
	}
	vn.prevs = prevs;
	vn.cost += minCost;
	return vn;
    }
};

igo.MakeLattice = function(nodesAry, setMincostNode) {
    this.nodesAry = nodesAry;
    this.i = 0;
    this.prevs = undefined;
    this.empty = true;
    this.setMincostNode = setMincostNode;
};

igo.MakeLattice.prototype = {
    set: function(i) {
	this.i = i;
	this.prevs = this.nodesAry[i];
	this.nodesAry[i] = undefined;
	this.empty = true;
    },
    
    call: function(vn) {
	this.empty = false;
	var nodesAry = this.nodesAry;
	var end = this.i + vn.length;
	var ends = nodesAry[end] || [];
	if(vn.isSpace) {
	    ends = ends.concat(this.prevs);
	} else {
	    ends.push(this.setMincostNode(vn, this.prevs));
	}
	nodesAry[end] = ends;
    },
    
    isEmpty: function() {
	return this.empty;
    }
};



/********** src/dictionary.js **********/
//Viterbiアルゴリズムで使用されるノード
igo.ViterbiNode = function(wordId, start, length, cost, leftId, rightId, isSpace) {
    this.cost = cost; //始点からノードまでの総コスト
    this.nodecost = cost; //ノード単体のコスト
    this.prev = undefined; //コスト最小の前方のノードへのリンク
    this.prevs = []; //前方のノードへのリンク
    this.wordId = wordId; //単語ID
    this.start = start; //入力テキスト内での形態素の開始位置
    this.length = length; //形態素の表層形の長さ(文字数)
    this.leftId = leftId; //左文脈ID
    this.rightId = rightId; //右文脈ID
    this.isSpace = isSpace; //形態素の文字種(文字カテゴリ)が空白文字かどうか
};

igo.ViterbiNode.makeBOSEOS = function() {
    return new igo.ViterbiNode(0, 0, 0, 0, 0, 0, false);
};

igo.CharCategory = function(code2category, charcategory, bigendian) {
    this.categories = igo.CharCategory.readCategories(charcategory, bigendian);
    var fmis = new igo.ArrayBufferStream(code2category, bigendian);
    this.char2id = fmis.getIntArray(fmis.size() / 4 / 2);
    this.eqlMasks = fmis.getIntArray(fmis.size() / 4 / 2);
};

igo.CharCategory.prototype = {
    category: function(code) {
	return this.categories[this.char2id.get(code.charCodeAt(0))];
    },
    isCompatible: function(code1, code2) {
	return (this.eqlMasks.get(code1.charCodeAt(0)) &
		this.eqlMasks.get(code2.charCodeAt(0))) != 0;
    }
};

igo.CharCategory.readCategories = function(buffer, bigendian) {
    var data = igo.getIntArray(buffer, bigendian);
    var size = data.length / 4;
    var ary = [];
    for(var i=0;i<size;i++) {
	ary.push(new igo.Category(data.get(i*4), data.get(i*4+1),
				  data.get(i*4+2)==1, data.get(i*4+3)==1));
    }
    return ary;
};

igo.Category = function(i, l, iv, g) {
    this.id = i;
    this.length = l;
    this.invoke = iv;
    this.group = g;
};

//未知語の検索を行うクラス
igo.Unknown = function(category) {
    this.category = category;
    this.spaceId = this.category.category(' ').id;
};

igo.Unknown.prototype.search = function(text, start, wdic, callback) {
    var category = this.category;
    var ch = text[start];
    var ct = category.category(ch);
    var length = text.length;
    var i;

    if(!callback.isEmpty() && !ct.invoke) {
	return ;
    }

    var isSpace = ct.id == this.spaceId;
    var limit = Math.min(length, ct.length + start);
    for(i=start; i<limit; i++) {
	wdic.searchFromTrieId(ct.id, start,
			      (i-start)+1, isSpace, callback);
	if(i+1!=limit && !category.isCompatible(ch, text[i+1])) {
	    return;
	}
    }

    if(ct.group && limit < length) {
	for(i=limit; i<length; i++) {
	    if(!category.isCompatible(ch, text[i])) {
		wdic.searchFromTrieId(ct.id, start, i-start, isSpace, callback);
		return;
	    }
	}
	wdic.searchFromTrieId(ct.id, start, length-start, isSpace, callback);
    }
};

//形態素の連接コスト表を扱うクラス
igo.Matrix = function(buffer, bigendian) {
    fmis = new igo.ArrayBufferStream(buffer, bigendian);
    this.leftSize = fmis.getInt();
    this.rightSize = fmis.getInt();
    this.matrix = fmis.getShortArray(this.leftSize * this.rightSize);
};

//形態素同士の連接コストを求める
igo.Matrix.prototype.linkCost = function(leftId, rightId) {
    return this.matrix.get(rightId * this.leftSize + leftId);
};

igo.WordDic = function(word2id, worddat, wordary, wordinf, bigendian) {
    this.trie = new igo.Searcher(word2id, bigendian);
    this.data = igo.getCharArray(worddat, bigendian);
    this.indices = igo.getIntArray(wordary, bigendian);

    var fmis = new igo.ArrayBufferStream(wordinf, bigendian);
    var wordCount = fmis.size() / (4 + 2 + 2 + 2);

    //dataOffsets[単語ID] = 単語の素性データの開始位置
    this.dataOffsets = fmis.getIntArray(wordCount);

    //leftIds[単語ID] = 単語の左文脈ID
    this.leftIds = fmis.getShortArray(wordCount);

    //rightIds[単語ID] = 単語の右文脈ID
    this.rightIds = fmis.getShortArray(wordCount);

    //consts[単語ID] = 単語のコスト
    this.costs = fmis.getShortArray(wordCount);
};

igo.WordDic.prototype = {
    search: function(text, start, callback) {
	var costs = this.costs;
	var leftIds = this.leftIds;
	var rightIds = this.rightIds;
	var indices = this.indices;

	function fn(start, offset, trieId) {
	    var end = indices.get(trieId + 1);
	    for(var i=indices.get(trieId); i<end; i++) {
		callback(new igo.ViterbiNode(i, start, offset, costs.get(i),
					     leftIds.get(i), rightIds.get(i), false));
	    }
	}
	this.trie.eachCommonPrefix(text, start, fn);
    },

    searchFromTrieId: function(trieId, start, wordLength, isSpace, callback) {
	var costs = this.costs;
	var leftIds = this.leftIds;
	var rightIds = this.rightIds;
	var end = this.indices.get(trieId + 1);
	for(var i=this.indices.get(trieId); i<end; i++) {
	    callback(new igo.ViterbiNode(i, start, wordLength, costs.get(i),
					 leftIds.get(i), rightIds.get(i), isSpace));
	}
    },

    wordData: function(wordId) {
	var res = Array();
	var start = this.dataOffsets.get(wordId);
	var end = this.dataOffsets.get(wordId+1);
	for(var i=start;i<end;i++) {
	    res.push(String.fromCharCode(this.data.get(i)));
	}
	return res;
    }
};



/********** src/trie.js **********/
//DoubleArrayのノード用の定数などが定義されているクラス
igo.Node = {
    Base: {
	//BASEノードに格納するID値をエンコードするためのメソッド
	//BASEノードに格納されているID値をデコードするためにも用いられる
	ID: function(nid) {
	    return (-nid) - 1;
	}
    },
    
    //CHECKノード用の定数が定義されているクラス
    Chck: {
	//文字列の終端を表す文字コード
	//この文字はシステムにより予約されており、辞書内の形態素の表層形および解析対象テキストに含まれていた場合の動作は未定義
	TERMINATE_CODE: 0,
	
	//CHECKノードが未使用だということを示すための文字コード
	//この文字はシステムにより予約されており、辞書内の形態素の表層形および解析対象テキストに含まれていた場合の動作は未定義
	VACANT_CODE: 1,
	
	//使用可能な文字の最大値
	CODE_LIMIT: 0xFFFF
    }
};

//文字列の終端を表す文字定数
igo.Node.Chck.TERMINATE_CHAR = String.fromCharCode(igo.Node.Chck.TERMINATE_CODE);


//文字列を文字のストリームとして扱うためのクラス。
//readメソッドで個々の文字を順に読み込み、文字列の終端に達した場合には{@code Node.Chck.TERMINATE_CHAR}が返される。
//* XXX: クラス名は不適切
igo.KeyStream = function(key, start) {
    this.s = key;
    this.cur = start || 0;
    this.len = key.length;
}

igo.KeyStream.compare = function(ks1, ks2) {
    var rest1 = ks1.rest();
    var rest2 = ks2.rest();
    if(rest1<rest2) return -1;
    else if(rest1>rest2) return 1;
    else return 0;
};

igo.KeyStream.prototype = {
    startsWith: function(prefix, beg, length) {
	var cur = this.cur;
	var s = this.s;
	if(this.len - cur < length) {
	    return false;
	}
	return s.substring(cur, cur+length) == prefix.substring(beg, beg + length);
    },
    
    rest: function() {
	return this.s.substring(this.cur);
    },
    
    read: function() {
	if(this.eos()) {
	    return igo.Node.Chck.TERMINATE_CHAR;
	} else {
	    var p = this.cur;
	    this.cur += 1;
	    return this.s.charAt(p);
	}
    },
    
    eos: function() {
	return this.cur == this.len;
    },
};

//保存されているDoubleArrayを読み込んで、このクラスのインスタンスを作成する
igo.Searcher = function(buffer, bigendian) {
    var fmis = new igo.ArrayBufferStream(buffer, bigendian);
    var nodeSz = fmis.getInt();
    var tindSz = fmis.getInt();
    var tailSz = fmis.getInt();
    this.keySetSize = tindSz;
    this.begs = fmis.getIntArray(tindSz);
    this.base = fmis.getIntArray(nodeSz);
    this.lens = fmis.getShortArray(tindSz);
    this.chck = fmis.getCharArray(nodeSz);
    this.tail = fmis.getString(tailSz);
}

igo.Searcher.prototype = {
    size: function() {
	return this.keySetSize;
    },
    
    search: function(key) {
	var base = this.base;
	var chck = this.chck;
	
	var node = base.get(0);
	var kin = new KeyStream(key);
	var code = kin.read();
	while(true) {
	    var idx = node + code;
	    node = base.get(idx);
	    if(chck.get(idx) == code) {
		if(node >= 0) {
		    continue;
		} else if(kin.eos() || this.keyExists(kin, node)) {
		    return igo.Node.Base.ID(node);
		}
	    }
	    return -1;
	}
    },
    
    eachCommonPrefix: function(key, start, fn) {
	var base = this.base;
	var chck = this.chck;
	
	var node = base.get(0);
	var offset = -1;
	var kin = new igo.KeyStream(key, start);

	while(true) {
	    var code = kin.read().charCodeAt(0);
	    offset++;
	    var terminalIdx = node + igo.Node.Chck.TERMINATE_CODE;
	    if(chck.get(terminalIdx) == igo.Node.Chck.TERMINATE_CODE) {
		fn(start, offset, igo.Node.Base.ID(base.get(terminalIdx)));
		if(code == igo.Node.Chck.TERMINATE_CODE) {
		    return;
		}
	    }
	    var idx = node + code;
	    node = base.get(idx);
	    
	    if(chck.get(idx) == code) {
		if(node>=0) {
		    continue;
		} else {
		    this.call_if_keyIncluding(kin, node, start, offset, fn);
		}
	    }
	    return ;
	}
    },
    
    call_if_keyIncluding: function(kin, node, start, offset, fn) {
	var nodeId = igo.Node.Base.ID(node);
	if(kin.startsWith(this.tail, this.begs.get(nodeId), this.lens.get(nodeId))) {
	    fn(start, offset + this.lens.get(nodeId) + 1, nodeId);
	}
    },
    
    keyExists: function(kin, node) {
	var nodeId = Node.Base.ID(node);
	var beg = this.begs.get(nodeId);
	var s = this.tail.substring(beg, beg + this.lens.get(nodeId));
	return kin.rest() == s;
    }
};



/********** src/util.js **********/
//urlからArrayBufferを読み取って返す
igo.getServerFileToArrayBufffer = function (url, successCallback) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
	if (xhr.readyState == xhr.DONE) {
	    if ((xhr.status==200 || xhr.status==304) && xhr.response) {
		// 'response' プロパティが ArrayBuffer を返す
		successCallback(xhr.response);
	    } else {
		alert("Failed to download:" + xhr.status + " " + xhr.statusText);
	    }
	}
    };

    // 指定された URL へのリクエストを作成
    xhr.open("GET", url, true);

    // ArrayBuffer オブジェクトでの応答を得るため、responseType を 'arraybuffer' に設定
    xhr.responseType = "arraybuffer";
    xhr.send();

    return xhr;
};

//4バイト整数型の配列を表すクラス
igo.IntArray = function (buffer, pos, elementCount, bigendian) {
    this.buffer = buffer;
    this.pos = pos;
    this.length = elementCount;
    this.bigendian = bigendian;
};

igo.IntArray.readUInt = function(buffer, pos, bigendian) {
    var result = igo.IntArray.readInt(buffer, pos, bigendian);
    return result >>> 0;
};

igo.IntArray.readInt = function(buffer, pos, bigendian) {
    var result = 0;
    if(bigendian) {
	result = (buffer[pos] << 24) |
	    (buffer[pos+1] << 16) |
	    (buffer[pos+2] << 8) |
	    (buffer[pos+3]);
    } else {
	result = (buffer[pos+3] << 24) |
	    (buffer[pos+2] << 16) |
	    (buffer[pos+1] << 8) |
	    (buffer[pos]);
    }
    return result;
};

igo.IntArray.prototype = {
    get: function(offset) {
	var pos = this.pos + offset * 4;
	return igo.IntArray.readInt(this.buffer, pos, this.bigendian);
    }
};

//2バイト整数型の配列を表すクラス
igo.ShortArray = function (buffer, pos, elementCount, bigendian) {
    this.buffer = buffer;
    this.pos = pos;
    this.length = elementCount;
    this.bigendian = bigendian;
}

igo.ShortArray.readUShort = function(buffer, pos, bigendian) {
    var result = 0;
    if(bigendian) {
	result = (buffer[pos] << 8) |
	    (buffer[pos+1]);
    } else {
	result = (buffer[pos+1] << 8) |
	    (buffer[pos]);
    }
    return result;
};

igo.ShortArray.readShort = function(buffer, pos, bigendian) {
    var result = igo.ShortArray.readUShort(buffer, pos, bigendian);
    if(result>=0x8000) {
	result -= 0x10000;
    }
    return result;
};

igo.ShortArray.prototype = {
    get: function(offset) {
	var pos = this.pos + offset * 2;
	return igo.ShortArray.readShort(this.buffer, pos, this.bigendian);
    }
};

//UTF-16の文字列を表すクラス
igo.CharArray = function(buffer, pos, elementCount, bigendian) {
    this.buffer = buffer;
    this.pos = pos;
    this.length = elementCount;
    this.bigendian = bigendian;
};

igo.CharArray.prototype = {
    get: function(offset) {
	var pos = this.pos + offset * 2;
	return igo.ShortArray.readUShort(this.buffer, pos, this.bigendian);
    }
};

//ArrayBufferを読み取るストリーム
igo.ArrayBufferStream = function(buffer, bigendian) {
    if(typeof buffer === 'ArrayBuffer') {
	this.buffer = new Uint8Array(buffer);
    } else {
	this.buffer = buffer;
    }
    this.bigendian = bigendian;
    this.pos = 0;
};

igo.ArrayBufferStream.prototype = {
    getInt: function () {
	var result = igo.IntArray.readInt(this.buffer, this.pos, this.bigendian);
	this.pos += 4;
	return result;
    },

    getIntArray: function(elementCount) {
	var array = new igo.IntArray(this.buffer, this.pos, elementCount, this.bigendian);
	this.pos += elementCount*4;
	return array;
    },

    getShortArray: function(elementCount) {
	var array = new igo.ShortArray(this.buffer, this.pos, elementCount, this.bigendian);
	this.pos += elementCount*2;
	return array;
    },

    getCharArray: function(elementCount) {
	var array = new igo.CharArray(this.buffer, this.pos, elementCount, this.bigendian);
	this.pos += elementCount*2;
	return array;
    },

    getString: function(elementCount) {
	var array = new igo.CharArray(this.buffer, this.pos, elementCount, this.bigendian);
	var s = '';
	for(var i=0; i<elementCount; i++) {
	    s += String.fromCharCode(array.get(i));
	}
	this.pos += elementCount*2;
	return s;
    },

    size: function() {
	return this.buffer.length;
    }
};

igo.getIntArray = function(buffer, bigendian) {
    var stream = new igo.ArrayBufferStream(buffer, bigendian);
    return stream.getIntArray(stream.size()/4);
};

igo.getCharArray = function(buffer, bigendian) {
    var stream = new igo.ArrayBufferStream(buffer, bigendian);
    return stream.getCharArray(stream.size()/2);
};
