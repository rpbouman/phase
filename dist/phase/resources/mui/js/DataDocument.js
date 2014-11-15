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
var DataDocument;

(function(){

(DataDocument = function(conf){
  conf = conf || {};
  this.setData(conf.data || {});
}).prototype = {
  pathComponentSeparator: "/",
  getRoot: function() {
    return this.getDataAtPath(this.rootPath);
  },
  getJson: function() {
    return JSON.stringify(this.data, null, " ");
  },
  getXml: function(data, tag) {
    var xml;
    if (arguments.length) {
      xml = "";
    }
    else {
      xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>";
      data = this.getRoot();
      tag = this.rootPath;
    }
    if (typeof(tag)==="undefined") {
      debugger;
    }
    if (iArr(data)) {
      var i, n = data.length;
      for (i = 0; i < n; i++) {
        xml += this.getXml(data[i], tag);
      }
    }
    else {
      xml += "<" + tag;
      switch(typeof data) {
        case "undefined":
          xml += ">";
          break;
        case "number":
          xml += ">" + data;
          break;
        case "string":
          xml += ">" + escXml(data);
          break;
        case "object":
          if (data === null) {
            xml += ">";
          }
          else {
            var p, v, atts = data["@"];
            if (atts) {
              for (p in atts) {
                xml += " " + p + "=\"" + escXml(atts[p]) + "\"";
              }
            }
            xml += ">";
            for (p in data) {
              if (p === "@") continue;
              v = data[p];
              xml += this.getXml(v, p);
            }
          }
          break;
      }
      xml += "</" + tag + ">";
    }
    return xml;
  },
  eachElement: function(array, callback, scope){
    if (!array) return true;
    if (!scope) scope = this;
    var i, n = array.length;
    for (i = 0; i < n; i++){
      if (callback.call(scope, i, array[i]) === false) return false;
    }
    return true;
  },
  eachProperty: function(object, callback, scope) {
    if (!object) return true;
    var p, v;
    for (p in object) {
      if (!object.hasOwnProperty(p)) continue;
      v = object[p];
      if (iFun(v)) continue;
      if (callback(scope, p, v) === false) return false;
    }
    return true;
  },
  getFile: function() {
    return this.file;
  },
  setFile: function(file) {
    this.file = file;
  },
  setData: function(data){
    this.data = data;
  },
  setXml: function(xml) {
    if (iStr(xml)) {
      this.setXmlText(xml);
    }
    else
    if (iNod(xml)){
      this.setXmlNode(xml);
    }
  },
  setXmlText: function(text) {
    this.setData(parseXmlText(text));
  },
  setXmlNode: function(node){
    this.setData(parseXmlNode(node));
  },
  setJson: function(json){
    this.setData(JSON.parse(json));
  },
  getData: function(){
    return data;
  },
  preparePath: function(path) {
    var pathArray;
    if (iArr(path)) {
      pathArray = path;
    }
    else
    if (iStr(path)) {
      pathArray = path.split(this.pathComponentSeparator);
    }
    if (!iArr(pathArray)) {
      throw "Invalid path " + path;
      debugger;
    }
    return pathArray;
  },
  checkData: function(data){
    if (iUnd(data)) data = this.data;
    if (!data) throw "Invalid data";
    return data;
  },
  getArrayAtPath: function(path, root){
    path = this.preparePath(path);
    var data = this.getDataAtPath(path, root);
    var arr;
    if (data === null || iUnd(data)) {
      arr = [];
    }
    else
    if (iArr(data)) {
      return data;
    }
    else
    if (iObj(data)){
      arr = [data];
    }
    else {
      throw "Unexpected error getting array at path " + path
    }
    this.setDataAtPath(path, arr, merge.MERGE, root);
    return arr;
  },
  spliceArrayAtPath: function(path, index, remove, add, data) {
    var array = this.getArrayAtPath(path, data);
    if (!array) {
      this.setDataAtPath(path, array = [], null, data);
    }
    if (iUnd(index) || index === null) {
      index = array.length;
    }
    var args = [index, remove];
    if (iDef(add) && add !== null) {
      if (iArr(add)) {
        args.splice(args.length, 0, add);
      }
      else {
        args.push(add);
      }
    }
    array.splice.apply(array, args);
    return index;
  },
  insertIntoArrayAtPath: function(path, index, add, data) {
    return this.spliceArrayAtPath(path, index, 0, add, data);
  },
  appendToArrayAtPath: function(path, add, data) {
    return this.insertIntoArrayAtPath(path, null, add, data);
  },
  removeFromArrayAtPath: function(path, index, remove, data) {
    this.spliceArrayAtPath(path, index, remove, null, data);
  },
  getDataAtPath: function(path, data) {
    data = this.checkData(data);
    path = this.preparePath(path);
    var i, n = path.length, p, v = data;
    for (i = 0; i < n; i++) {
      if (v === null) return null;
      if (iUnd(v)) return undefined;
      p = path[i];
      if (iStr(p) && /^\d+$/.test(p)) p = parseInt(p, 10);
      if (iInt(p)) {
        if (iArr(v)) v = v[p];
        else
        if (p === 0) v = v;
      }
      else
      if (iArr(v)) throw "Array requires int path component";
      else
      if (iObj(v)) v = v[p];
      else throw "Invalid type for path operation";
    }
    return v;
  },
  setDataAtPath: function(path, value, mode, data) {
    data = this.checkData(data);
    path = this.preparePath(path);
    var property = path.pop();
    var i, n = path.length, p, v = data, v1;
    for (i = 0; i < n; i++) {
      p = path[i];
      if (iStr(p) && /^\d+$/.test(p)) p = parseInt(p, 10);
      if (iInt(p)) {
        if (iArr(v)) {
          if (v.length <= p) {
            v.length = p + 1;
            v1 = null;
          }
          else {
            v1 = v[p];
          }
        }
        else
        if (p === 0) {
          v1 = v;
        }
      }
      else
      if (iArr(v)) {
        throw "Array requires int path component";
      }
      else
      if (iObj(v)) {
        v1 = v[p];
      }
      else throw "Invalid type for path operation";
      if (!v1) v[p] = v1 = {};
      v = v1;
    }
    if (iArr(value)) {
      v[property] = value;
    }
    else
    if (iObj(value)) {
      v1 = v[property];
      if (iUnd(v1)) {
        v[property] = value;
      }
      else
      if (iObj(v1)) {
        merge(v1, value, mode);
      }
    }
    else {
      v[property] = value;
    }
  }
};

adopt(DataDocument, Observable);

})();
