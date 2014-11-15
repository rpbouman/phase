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
function unescapeEntities(text) {
  var t = "", match, value, i = 0, re = /&((#x([\dA-Fa-f]+))|(\w+));/g;
  while (match = re.exec(text)) {
    t += text.substr(i, match.index - i);
    if (value = match[3]){
      t += String.fromCharCode(parseInt(value, 16));
    }
    else
    if (value = match[4]){
      switch (value) {
        case "lt":
          t += "<";
          break;
        case "gt":
          t += ">";
          break;
        case "amp":
          t += "&";
          break;
        case "apos":
          t += "'";
          break;
        case "quot":
          t += "\"";
          break;
        default:
          throw "Don't recognize named entity " + value;
      }
    }
    i = re.lastIndex;
  }
  t += text.substr(i);
  return t;
}

function parseXmlText(xml) {
  var nameStartChar = /[:_A-Za-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
  var nameChar = /[\-\.\d\xB7\u0300-\u036F\u203F-\u2040]/;
  var name = new RegExp("(" + nameStartChar.source + nameChar.source.substr(0, nameChar.source.length-1) + nameStartChar.source.substr(1) + "*)");
  var atts = /([^>]+)?/;
  var piTarget = /(([^\?]|\?[^>])+)/;
  var comment = /(([^\-]|-[^\-])*)/;
  var cdata = /!\[CDATA\[(([^\]]+(\][^\]])?)+)\]\]/;
  var text = /([^<>]+)/;
  //         12          3           4            5    6           7   8                  9          1011    12                   13
  var re = /<(([:_A-Za-z\uC0-\uD6\uD8-\uF6\uF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF][\-\.\d\uB7\u0300-\u036F\u203F-\u2040:_A-Za-z\uC0-\uD6\uD8-\uF6\uF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF]*)([^>]+)?|\/([:_A-Za-z\uC0-\uD6\uD8-\uF6\uF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF][\-\.\d\uB7\u0300-\u036F\u203F-\u2040:_A-Za-z\uC0-\uD6\uD8-\uF6\uF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF]*)|\?(\w+)([^\?]+)?\?|(!--([^\-]|-[^\-])*--)|(!\[CDATA\[(([^\]]+(\][^\]])?)+)\]\]))>|([^<>]+)/ig;
  var re = new RegExp([
    "<(" +
    name.source + atts.source,
    "\\/" + name.source,
    "\\?" + name.source + "\\s+" + piTarget.source + "\\?",
    "!--" + comment.source +"--",
    cdata.source +
    ")>",
    text.source
  ].join("|"), "ig");

  var match, value, atts;
  var pop, push, stack = [];
  var root = {}, obj, pObj = root;

  var attMatch;
  //            123          4                5 6         7
  var attRe = /((([\w\-]+):)?([\w\-]+))\s*=\s*('([^']*)'|"([^"]*)")/g;
  var objAtts, attName, attVal;

  while (match = re.exec(xml)) {
    if (value = match[2]) { //we have an element start tag
      push = true;
      obj = {
        nodeType: 1,
        tagName: value
      };
      if (!pObj.childNodes) pObj.childNodes = [];
      pObj.childNodes.push(obj);
      objAtts = null;
      //do we have "stuff" beyond the tagname?
      if (atts = match[3]) {
        //check if this element is self-closing
        if (atts.length && atts.substr(atts.length - 1, 1) === "\/") {
          //it is. remove the trailing "/" character
          //make sure not to push this item on the stack
          atts = atts.substr(0, atts.length - 1);
          push = false;
        }
        //parse attributes
        if (attRe.lastIndex) attRe.lastIndex = 0;
        while (attMatch = attRe.exec(atts)) {
          if (!objAtts) objAtts = obj.attributes = {};
          attName = attMatch[1];
          if (typeof(objAtts[attName]) === "undefined") {
            attVal = attMatch[5].substr(1, attMatch[5].length - 2);
            objAtts[attName] = unescapeEntities(attVal);
          }
          else {
            throw "Duplicate attribute";
          }
        }
      }
      //push the item on the stack, and make it the new parent object.
      if (push) {
        pObj = obj;
        stack.push(obj);
      }
    }
    else
    if (value = match[4]) {  //element end tag
      pop = stack.pop();
      //check if tagname matches the current item.
      if (pop.tagName !== value) {
        //nope. this means the tags aren't balanced.
        throw "Error: not wellformed. Found closing tag " + value + " but expected " + pop.tag + " at " + match.index;
      }
      //set the current parent object
      pObj = stack.length ? stack[stack.length -1] : root;
    }
    else
    if (value = match[5]) {                              //processing instruction
      if (!pObj.childNodes) pObj.childNodes = [];
      pObj.childNodes.push({
        nodeType: 7,
        target: value,
        content: match[6]
      });
    }
    else
    if (value = match[8]) {                              //comment
      if (!pObj.childNodes) pObj.childNodes = [];
      pObj.childNodes.push({
        nodeType: 8,
        data: value
      });
    }
    else
    if (value = match[10]) {                              //cdata
      //grab the text, add that as value
      if (!pObj.childNodes) pObj.childNodes = [];
      pObj.childNodes.push({
        nodeType: 4,
        data: match[10]
      });
    }
    else
    if ((value = match[13]) && (!/^\s+$/.test(value))) {  //text (but not whitespace)
      //grab the text, add that as value
      if (!pObj.childNodes) pObj.childNodes = [];
      pObj.childNodes.push({
        nodeType: 3,
        data: unescapeEntities(value)
      });
    }
  }
  return root;
}

function escapeEntities(text) {
  if (typeof(text) !== "string") {
    return text;
  }
  text = text.replace(/&/g, "&amp;");
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  text = text.replace(/'/g, "&apos;");
  text = text.replace(/"/g, "&quot;");
  return text;
}

function serializeToXml(obj, indentString, indent) {
  if (!indentString) indentString = "  ";
  if (!indent) indent = "";
  var str = "";
  var childNodes = obj.childNodes, i, n = childNodes.length, childNode;
  for (i = 0; i < n; i++) {
    childNode = childNodes[i];
    switch (childNode.nodeType) {
      case 1:   //element
        str += "\n" + indent + "<" + childNode.tagName;

        var atts = childNode.attributes;
        if (atts){
          var att;
          for (att in atts) {
            str += " " + att + "=\"" + escapeEntities(atts[att]) + "\""
          }
        }

        if (
          !childNode.childNodes ||
          !childNode.childNodes.length
        ) {
          str += "/>";
        }
        else {
          str += ">";
          if (childNode.childNodes.length === 1 && childNode.childNodes[0].nodeType === 3) {
            str += childNode.childNodes[0].data;
          }
          else {
            str += serializeToXml(childNode, indentString, indent + indentString);
            str += "\n" + indent;
          }
          str += "</" + childNode.tagName + ">";
        }
        break;
      case 2:
        break;
      case 3:   //text
        str += childNode.data
        break;
      case 4:   //cdata
        str += "\n" + indent + "<![CDATA[" + childNode.data + "]]>";
        break;
      case 5:
        break;
      case 6:
        break;
      case 7:   //processing instruction
        str += "\n" + indent + "<?" + childNode.target + " " + childNode.content + "?>";
        break;
      case 8:   //comment
        str += "\n" + indent + "<!--" + childNode.data + "-->";
        break;
    }
  }
  return str;
}