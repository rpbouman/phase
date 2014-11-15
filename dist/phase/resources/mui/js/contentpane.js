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
var ContentPane;

(function() {
(ContentPane = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++ContentPane.id;
  ContentPane.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return ContentPane.prefix + this.id;
  },
  getTitleId: function(){
    return this.getId() + "-title";
  },
  createDom: function(){
    var conf = this.conf;
    var id = this.getId();
    var el = cEl("div", {
      "class": confCls(ContentPane.prefix, conf),
      id: id,
      style: conf.style || ""
    });

    var titleBar, titleId = this.getTitleId();
    if (conf.title || conf.toolbar) {
      titleBar = cEl("div", {
        id: titleId,
        "class": "pentaho-titled-toolbar"
      }, conf.title, el);
    }
    if (conf.toolbar) {
      if (conf.toolbar instanceof Toolbar){
        this.toolbar = conf.toolbar;
      }
      else {
        this.toolbar = new Toolbar(conf.toolbar);
      }
      this.toolbar.conf.container = titleBar;
      this.toolbar.createDom();
    }

    var container = conf.container;
    container = gEl(container);
    if (container) container.appendChild(el);
    return el;
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
  setTitle: function(title){
    this.conf.title = title;
    var title = gEl(this.getTitleId());
    title.innerHTML = title;
  },
  render: function() {
    this.createDom();
  },
  clearAll: function(){
    dCh(this.getDom());
  }
}
ContentPane.id = 0;
ContentPane.prefix = "contentpane";
ContentPane.instances = {};
ContentPane.getInstance = function(id){
    if (iInt(id)) id = ContentPane.prefix + id;
    return ContentPane.instances[id];
};
ContentPane.lookup = function(el){
  var re = new RegExp("^" + ContentPane.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return ContentPane.getInstance(el.id);
};

linkCss(muiCssDir + "contentpane.css");

})();
