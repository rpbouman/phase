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
var Highlighter;
(function() {

(Highlighter = function(conf) {
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++Highlighter.id;
}).prototype = {
  getId: function(){
    return Highlighter.prefix + this.id;
  },
  createDom: function(){
    var conf = this.conf || {};
    var container = conf.container;
    container = gEl(container);
    if (!container) container =  body;
    var el = cEl("div", {
      "class": confCls(Highlighter.prefix, conf),
      id: this.getId()
    });
    container.appendChild(el);
    return el;
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
  render: function() {
    this.createDom();
  },
  sync: function() {
    var dom = this.getDom();
    var style = dom.style;
    var el = gEl(this.highlightedElement);
    if (!el) {
      style.display = "none";
      return;
    }
    style.display = "";
    var position = pos(el);
    style.left = (position.left + 4) + "px";
    style.top = (position.top + 4) + "px";
    style.width = (el.clientWidth - 8) + "px";
    style.height = (el.clientHeight - 8) + "px";
  },
  highlight: function(el){
    this.highlightedElement = el;
    this.sync();
  }
};

Highlighter.id = 0;
Highlighter.prefix = "highlighter";

adopt(Highlighter, Displayed);

linkCss(muiCssDir + "highlighter.css");
})();
