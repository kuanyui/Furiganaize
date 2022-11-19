(function (global) {
  global.Zip || (global.Zip = {
    inflate : Zip_inflate,
    inflate_file : Zip_inflate_file
  });

  function ZipData() {
    this.files = {};
    this.directories = {};
    this.record = null;
  }

  function FileBase() {}

  FileBase.prototype = {
    version : 0,
    bitFlag : 0,
    method : 0,
    fileTime : 0,
    fileDate : 0,
    crc32 : 0,
    size : 0,
    fileSize : 0,
    nameLength : 0,
    extraLength : 0,
    name : null,
    extra : null,
    modified : function () {
      return new Date(
        1980 + (this.fileDate >> 9),
        (this.fileDate >> 5 & 15) - 1,
        this.fileDate & 31,
        this.fileTime >> 11,
        this.fileTime >> 5 & 60
      );
    }
  };

  function File(b) {
    this.version = b.read_int16();
    this.bitFlag = b.read_int16();
    this.method = b.read_int16();
    this.fileTime = b.read_int16();
    this.fileDate = b.read_int16();
    this.crc32 = b.read_int();
    this.size = b.read_int();
    this.fileSize = b.read_int();
    this.nameLength = b.read_int16();
    this.extraLength = b.read_int16();
    this.name = b.read_text(this.nameLength);
    this.extra = b.read_ascii(this.extraLength);
    this.data = b.read(this.size);
  }

  File.prototype = new FileBase;
  File.prototype.data = null;
  File.prototype.header = null;
  File.prototype.inflate = function () {
    var blob = this.data;
    if ( this.method == 0 ) {
      return blob;
    } else {
      return JSInflate.inflate(blob, this.fileSize);
    }
  };

  File.Header = function (b) {
    this.crc32 = b.read_int();
    this.size = b.read_int();
    this.fileSize = this.read_int();
  };

  File.Header.prototype = {
    crc32 : 0,
    size : 0,
    fileSize : 0
  };

  function Directory(b) {
    this.version = b.read_int16();
    this.extVersion = b.read_int16();
    this.bitFlag = b.read_int16();
    this.method = b.read_int16();
    this.fileTime = b.read_int16();
    this.fileDate = b.read_int16();
    this.crc32 = b.read_int();
    this.size = b.read_int();
    this.fileSize = b.read_int();
    this.nameLength = b.read_int16();
    this.extraLength = b.read_int16();
    this.commentLength = b.read_int16();
    this.diskNumberStart = b.read_int16();
    this.attributes = b.read_int16();
    this.extAttributes = b.read_int();
    this.headerOffset = b.read_int();
    this.name = b.read_text(this.nameLength);
    this.extra = b.read_text(this.extraLength);
    this.comment = b.read_text(this.commentLength);
  }

  Directory.prototype = new FileBase;
  Directory.prototype.extVersion = 0;
  Directory.prototype.commentLength = null;
  Directory.prototype.comment = null;
  Directory.prototype.diskNumberStart = 0;
  Directory.prototype.attributes = 0;
  Directory.prototype.extAttributes = 0;
  Directory.prototype.headerOffset = 0;
  Directory.prototype.record = null;

  Directory.Record = function (b) {
    this.diskNumber = b.read_int16();
    this.startNumber = b.read_int16();
    this.diskLength = b.read_int16();
    this.length = b.read_int16();
    this.directorySize = b.read_int();
    this.offset = b.read_int();
    this.commentLength = b.read_int16();
    this.comment = b.read_text(this.commentLength);
  };

  Directory.Record.prototype = {
    diskNumber : 0,
    startNumber : 0,
    diskLength : 0,
    length : 0,
    directorySize : 0,
    offset : 0,
    commentLength : 0,
    comment : null
  };

  function ByteReader(bytes) {
    this.bytes = bytes;
    this.length = bytes.length;
  }

  ByteReader.prototype = {
    position : 0,
    eos : function () {
      return this.position >= this.length;
    },
    read : function (len) {
      var b = this.bytes.subarray(this.position, this.position + len);
      this.position += len;
      return b;
    },
    read_ascii : function (len) {
      return String.fromCharCode.apply(null, this.read(len));
    },
    read_text : function (len) {
      var b = this.read_ascii(len);
      return b.sjis2utf16 ? b.sjis2utf16() : b;
    },
    read_int : function () {
      var b = this.read(4);
      return  b[0] |
              b[1] << 8  |
              b[2] << 16 |
              b[3] << 24;
    },
    read_int16 : function () {
      var b = this.read(2);
      return b[0] | b[1] << 8;
    }
  };

  function Zip_inflate(bytes) {
    var bin = new ByteReader(bytes);
    var sign_types = {
      file : 0x04034b50,
      header : 0x08074b50,
      directory : 0x02014b50,
      record : 0x06054b50
    };
    var zip = new ZipData;
    var file;

    while (!bin.eos()) {
      var sign = bin.read_int(4);

      if ( sign == sign_types.file ) {
        file = new File(bin);
        zip.files[file.name] = file;
      } else if ( sign == sign_types.header ) {
        file.header = new File.Header(bin);
      } else if ( sign == sign_types.directory ) {
        var directory = new Directory(bin);
        zip.directories[directory.name] = directory;
      } else if ( sign == sign_types.record ) {
        var record = new Directory.Record(bin);
        zip.record = record;
      } else {
        throw "Invalid ZIP header.";
      }
    }

    delete bin;
    delete byes;
    return zip;
  }

  function Zip_inflate_file(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url)
    xhr.onload = function () {
      var blob = xhr.response;
      var bytes = new Uint8Array(blob);

      callback(Zip_inflate(bytes));
    };
    xhr.responseType = "arraybuffer";
    xhr.send(null);
  }
})(this);