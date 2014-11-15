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
var ContentArea;

(function(){

(ContentArea = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++ContentArea.id;
  this.highlighter = conf.highlighter || new Highlighter({
    container: conf.container
  })
  ContentArea.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return ContentArea.prefix + this.id;
  },
  getSelectedPane: function(){
    return this.selectedPane;
  },
  setSelectedPane: function(contentpane) {
    var previousSelectedPane = this.selectedPane;
    if (previousSelectedPane) {
    }
    if (hCls(contentpane.getDom(), "no-select")) return;
    this.highlighter.highlight(contentpane.getId());
    if (this.fireEvent("beforeChangeSelection", {
      oldSelection: previousSelectedPane,
      newSelection: contentpane
    }) === false) return;
    this.selectedPane = contentpane;
    this.fireEvent("selectionChanged", {
      oldSelection: previousSelectedPane,
      newSelection: contentpane
    });
  },
  getHighlighter: function() {
    return this.highlighter;
  },
  clickHandler: function(e) {
    var me = this;
    var target = e.getTarget();
    var contentpane = ContentPane.lookup(target);
    if (!contentpane) return;
    if (hCls(contentpane.getDom(), "contentpane-noselect")) return;
    this.setSelectedPane(contentpane);
  },
  createDom: function(){
    var conf = this.conf || {};
    var container = conf.container;
    container = gEl(container);
    if (!container) container =  body;
    var el = cEl("div", {
      "class": confCls(ContentArea.prefix, conf),
      id: this.getId()
    });
    container.appendChild(el);
    listen(el, "click", this.clickHandler, this);
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
  splitContentPane: function(contentPane, location, orientation) {
    if (!contentPane) return;
    var dom = contentPane.getDom();
    var parentNode = dom.parentNode;
    var refNode = dom.nextSibling;
    parentNode.removeChild(dom);
    var newContentPane = new ContentPane();
    var splitPane = new SplitPane({
      firstComponent: location === "first" ? contentPane : newContentPane,
      secondComponent: location === "second" ? contentPane : newContentPane,
      orientation: orientation
    });
    var splitPaneDom = splitPane.getDom();
    if (refNode) {
      parentNode.insertBefore(splitPaneDom, refNode)
    }
    else {
      parentNode.appendChild(splitPaneDom);
    }
    var parentSplitPane = SplitPane.lookup(parentNode);
    if (parentSplitPane) {
      if (parentSplitPane.getFirstComponent().id === dom.id) {
        parentSplitPane.conf.firstComponent = splitPane;
      }
      else
      if (parentSplitPane.getSecondComponent().id === dom.id) {
        parentSplitPane.conf.secondComponent = splitPane;
      }
      parentSplitPane.setSplitterPosition(parentSplitPane.getSplitterPosition() + "px");
    }
    splitPane.setSplitterPosition("50%");
    this.fireEvent("contentPaneSplit", {
      contentPane: contentPane,
      splitPane: splitPane
    });
    if (this.selectedPane) {
      this.highlighter.sync();
    }
    splitPane.listen("orientationChanged", this.splitPaneOrientationChanged, this);
  },
  splitPaneOrientationChanged: function(splitPane, event, data){
    data.splitPane = splitPane;
    var conf = splitPane.conf;
    switch (this.selectedPane) {
      case conf.firstComponent:
      case conf.secondComponent:
        this.highlighter.sync();
        break;
    }
    this.fireEvent("splitPaneOrientationChanged", data);
  },
  setSize: function(w, h) {
    var style = this.getDom().style;
    style.w = w;
    style.h = h;
  }
};
ContentArea.id = 0;
ContentArea.prefix = "contentarea";
ContentArea.instances = {};
ContentArea.getInstance = function(id){
    if (iInt(id)) id = ContentArea.prefix + id;
    return ContentArea.instances[id];
};
ContentArea.lookup = function(el){
  var re = new RegExp("^" + ContentArea.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return ContentArea.getInstance(el.id);
};
adopt(ContentArea, Observable);

linkCss(muiCssDir + "contentarea.css");

})();
