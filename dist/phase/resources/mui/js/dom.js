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
function iNod(a){return iObj(a) && a.nodeType===1;}

function iDesc(desc, anc) {
  anc = gEl(anc);
  if (!anc) return false;

  desc = gEl(desc);
  while (desc && desc.parentNode) {
    if (desc.parentNode === anc) {
      return true;
    }
    desc = desc.parentNode;
  }
  return false;
}

function fEl(el, cls){
  while (el && !hCls(el, cls)) el = el.parentNode;
  return el;
}

function gEl(id) {
  if (iStr(id)) id = doc.getElementById(id);
  return id;
}
function gEls(node, tag, idx){
  var node = node.getElementsByTagName(tag);
  return (node && iInt(idx) && idx < node.length) ? node.item(idx) : node;
}
function cssStr(obj) {
  if (iStr(obj)) return obj;
  if (obj === null) return "";
  if (!iObj(obj)) throw "Style must be a string or an object";
  var p, s = "";
  for (p in obj) {
    s += p + ": " + obj[p] + ";";
  }
  return s;
}
function sAtts(e, atts){
  e = gEl(e);
  var name, val;
  for (name in atts) {
    val = atts[name];
    if (iArr(val)) {
      val = val.join(" ");
    }
    else
    if (iObj(val)) {
      if (name === "style"){
        val = cssStr(val);
      }
      else {
        val = val.toString();
      }
    }
    e.setAttribute(name, val);
  }
}

function gAtt(e, att){
  return gEl(e).getAttribute(att);
}

function sAtt(e, att, val){
  if (att === "style") val = cssStr(val);
  gEl(e).setAttribute(att, val);
}

function rAtt(e, att){
  gEl(e).removeAttribute(att);
}

function aCh(e, chs) {
  var m;
  e = gEl(e);
  if (e === doc) e = body;
  if (!iArr(chs)){
    chs = [chs];
  }
  for (var i = 0, n = chs.length, c; i < n; i++){
    c = chs[i];
    if (iNod(c)) {
    }
    else
    if (iStr(c) || iNum(c) || iDat(c) || iBol(c)) {
      c = doc.createTextNode(c);
    }
    else
    if (iObj(c)) {
      c = cEl(c);
    }
    e.appendChild(c);
  }
}

function dCh(e, check) {
  var e = gEl(e), c;
  if (iFun(check)) {
    while(c = e.lastChild) {
      if (check(c)) e.removeChild(c);
    }
  }
  else {
    while(c = e.lastChild) e.removeChild(c);
  }
}

function cEl(tag, atts, chs, p){
  var el = doc.createElement(tag);
  if (atts) sAtts(el, atts);
  if (chs) aCh(el, chs);
  if (p) aCh(p, el)
  return el;
}

function dEl(el) {
  var el = gEl(el);
  el.parentNode.removeChild(el);
}

function pos(e1, e2){
  try {
    var left = 0, top = 0;
    e1 = gEl(e1);
    do {
      left += e1.offsetLeft;
      top += e1.offsetTop;
    } while (e1 = e1.offsetParent);

    if (e2) {
      var p = pos(e2);
      left -= p.left;
      top -= p.top;
    }

    return {
      left: left,
      top: top
    };
  } catch(e) {
    debugger;
  }
}

function hCls(e, c){
  var e = gEl(e);
  if (!e) return false;
  var re = new RegExp("(^|\\s)" + c + "($|\\s)", "g");
  return re.test(e.className);
}

function aCls(e, c){
  var e = gEl(e);
  if (!e) return false;
  var re = new RegExp("\\b" + c + "\\b", "g");
  if(re.test(e.className)) return;
  e.className += " " + c;
}

function rCls(e, c, nc){
  var e = gEl(e);
  if (!e) return false;
  if (iArr(c)) c = "(" + c.join("|") + ")";
  var re = new RegExp("\\b" + c + "\\b", "g");
  e.className = e.className.replace(re, nc ? nc : "");
  e.className = e.className.replace(/\s\s+/g, " ");
}


function getDom(arg) {
  if (iNod(arg)) return arg;
  var comp;
  if (iStr(arg)){
    comp = gEl(arg);
    if (!comp) throw "Can't find element with id " + arg;
  }
  else
  if (iObj(arg)) {
    if (iFun(arg.getDom)) {
      comp = arg.getDom();
    }
    else {
      throw "Component doesn't implement method getDom()"
    }
  }
  else {
    throw "Invalid component";
  }
  return comp;
}

function confCls(){
  var arg, i, n = arguments.length, classes = [];
  for (i = 0; i < n; i++) {
    arg = arguments[i];
    switch (typeof(arg)) {
      case "string":
        classes = classes.concat(nws(arg).split(" "));
        break;
      case "object":
        if (iArr(arg)) {
          classes = classes.concat(arg);
        }
        else
        if (arg !== null){
          if (iDef(arg["classes"])) {
            classes = classes.concat(confCls(arg["classes"]));
          }
          if (iDef(arg["class"])) {
            classes = classes.concat(confCls(arg["class"]));
          }
        }
        break;
      default:
        throw "Must be string or object."
    }
  }
  return classes;
}

function link(conf){
  cEl("link", conf, null, head);
}

function linkCss(uri) {
  if (gEl(uri)) return;
  link({
    rel: "stylesheet",
    type: "text/css",
    href: uri,
    id: uri
  });
}
