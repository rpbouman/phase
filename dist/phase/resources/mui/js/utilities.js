/*

Copyright 2014 Roland Bouman (roland.bouman@gmail.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
var win = window,
    doc = document,
    body = doc.body,
    head = doc.getElementsByTagName("HEAD")[0],
    version = "0.1"
;

function clearBrowserSelection() {
  if (doc.selection) {
    doc.selection.clear();
  }
  else
  if (win.getSelection){
    win.getSelection().removeAllRanges();
  }
}

/**
 * Language utilities
 */
function merge(){
  var dst = arguments[0] || {};
  var i, n = arguments.length;
  var mode;
  if (n > 2) {
    mode = arguments[n-1];
    if (!iInt(mode)) {
      mode = merge.MERGE;
    }
    else n--;
  }
  else {
    mode = merge.MERGE;
  }
  var p,v;
  for (i = 1; i < n; i++) {
    src = arguments[i];
    for (p in src) {
      o = src[p];
      if ((mode & merge.DELETE) || ((o === null) && (mode & merge.DELETE_IF_NULL))) {
        delete dst[p];
      }
      else
      if (iUnd(dst[p]) || (mode & merge.OVERWRITE)) {
        dst[p] = o;
      }
    }
  }
  return dst;
}
merge.MERGE = 0;
merge.OVERWRITE = 1;
merge.DELETE_IF_NULL = 2;
merge.DELETE = 4;

//TODO: benchmark. Check whether JSON.parse(JSON.stringify(o))
function clone(o, clones){
  if (!clones) clones = [];

  if (o === null || typeof(o) !== "object") return o;
  var i, n = clones.length, e;
  for (i = 0; i < n; i++) {
    e = clones[i];
    if (e.o === o) return e.c;
  }

  var c, p;
  if (iArr(o)) {
    c = [];
    clones.push({o: o, c: c});
    for (i = 0, n = o.length; i < n; i++) {
      c[i] = clone(o[i], clones);
    }
  }
  else {
    c = {};
    clones.push({o: o, c: c});
    for (p in o) {
      if (!o.hasOwnProperty(p)) continue;
      c[p] = clone(o[p], clones);
    }
  }

  return c;
}

function adopt(){
  var args = arguments, i, n = args.length, o, p;
  var dst = args[0];
  var prot, _super;

  if (dst) {
    if (!iFun(dst)) {
      throw "Destination must be a constructor";
    }
    prot = dst.prototype;
  }
  else {
    dst = new function(){};
    prot = dst.prototype = {};
  }
  dst._supers = [];
  for (i = 1; i < n; i++) {
    o = args[i];
    if (iFun(o)) {
      _super = o;
      o = o.prototype;
    }
    else
    if (!iObj(o)) {
      throw "Argument must be a prototype or a constructor.";
    }
    else {
      _super = null;
    }
    dst._supers.push(_super);
    if (i === 1) {
      dst._super = _super;
    }

    for (p in o) {
      if (iUnd(prot[p])) {
        prot[p] = o[p];
      }
/*
      else {
        m = prot[p];
        while (m._super && m !== m._super) {
          m = m._super;
        }
        m._super = o[p];
      }
*/
    }
  }
  return dst;
}

function iFun(a){return typeof(a) === "function";}
function iUnd(a){return typeof(a) === "undefined";}
function iDef(a){return typeof(a) !== "undefined";}
function iNum(a){return typeof(a) === "number";}
function iStr(a){return typeof(a) === "string";}
function iInt(a){return parseInt(a) === a;}
function iArr(a){return a && a.constructor === Array;}
function iDat(a){return a && a.constructor === Date;}
function iObj(a){return a!==null && typeof(a) === "object";}
function iBol(a){return a===false || a===true;}

var IdGenerator;
(IdGenerator = function(conf) {
  this.prefix = String(conf.prefix || "id");
  this.id = conf.id || 0;
  this.increment = conf.increment || 1;
}).prototype = {
  getNewId: function() {
    return this.prefix + (this.id += this.increment);
  },
  getCurrentId: function(){
    return this.prefix + this.id;
  }
};
//normalize whitespace.
function nws(){
  var i, n = arguments.length, strings = [];
  for (i = 0; i < n; i++){
    strings = strings.concat(String(arguments[i]).split(/\s+/g));
  }
  return strings.join(" ");
}

function escXml(str) {
  if (str === null) return null;
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function ajax(options){
  var xhr = XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP.3.0"),
      args, url = options.url,
      name, value
  ;
  if (options.params) {
    for (name in options.params) {
      url += (url.indexOf("?") === -1 ? "?" : "&") +
              name + "=" + encodeURIComponent(options.params[name])
      ;
    }
  }
  var method = options.method || "GET";
  args = [method, url, options.async];
  if (options.username && options.password) {
      args.push(options.username, options.password);
  }
  xhr.open.apply(xhr, args);
  xhr.onreadystatechange = function(){
    switch (this.readyState) {
      case 0:
        options.aborted(options, this);
        break;
      case 4:
        if (xhr.status === 200){
          var data;
          var contentType = xhr.getResponseHeader("Content-Type");
          if (contentType) {
            var i = contentType.indexOf(";charset=");
            if (i !== -1) {
              var encoding = contentType.substr(i + ";charset=".length);
              contentType = contentType.substr(0, i);
            }
          }
          try {
            switch (contentType) {
              case "application/json":
                data = JSON.parse(xhr.responseText);
                break;
              case "application/javascript":
              case "text/javascript":
                data = eval(xhr.responseText);
                break;
              case "application/xml":
              case "text/xml":
                data = xhr.responseXML;
                break;
              default:
                data = xhr.responseText;
            }
            options.success(options, this, data);
          }
          catch (exception) {
            options.failure(options, this, exception);
          }
        }
        else {
          options.failure(options, this, {
            type: "http",
            status: xhr.status,
            message: xhr.statusText
          });
        }
        break;
    }
  };
  if (options.headers) {
    for (name in options.headers) {
      xhr.setRequestHeader(name, options.headers[name]);
    }
  }
  var data = null;
  if (options.data) {
    if (iObj(options.data)) {
      data = "";
      for (p in options.data) {
        data += p + "=" + options.data[p];
      }
    }
    else {
      data = options.data;
    }
  }
  xhr.send(data);
  return xhr;
}

//courtesy of http://blog.stevenlevithan.com/archives/parseuri
function parseUri (str) {
  var o   = parseUri.options,
    m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
    uri = {},
    i   = 14;

  while (i--) uri[o.key[i]] = m[i] || "";

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) uri[o.q.name][decodeURIComponent($1)] = decodeURIComponent($2); //rpb: added decoding.
  });

  if(uri.isRelative = (uri.protocol === "")){
    uri.path = uri.authority;
    uri.authority = uri.host = "";
  }

  uri.pathComponents = uri.path.split("/");

  return uri;
};

parseUri.options = {
  strictMode: false,
  key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
  q:   {
    name:   "queryKey",
    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  },
  parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};
