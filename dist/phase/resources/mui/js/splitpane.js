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
var SplitPane;

(function(){
(SplitPane = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++SplitPane.id;
  SplitPane.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return SplitPane.prefix + this.id;
  },
  getSize: function(arg) {
    var orientation = this.getOrientation();
    var property;
    switch (orientation) {
      case SplitPane.orientations.vertical:
        property = "clientWidth";
        break;
      case SplitPane.orientations.horizontal:
        property = "clientHeight";
        break;
    }
    var dom;
    switch (typeof(arg)) {
      case "undefined":
        dom = this.getDom();
        break;
      case "string":
        switch (arg) {
          case "first":
            dom = this.getFirstComponent();
            break;
          case "second":
            dom = this.getSecondComponent();
            break;
          case "splitter":
            dom = this.getSplitter();
          default:
        }
        break;
      default:
        throw "not supported";
    }
    return dom[property];
  },
  getSplitterRatio: function(){
    var size = this.getSize();
    var splitterSize = this.getSize("splitter");
    var splitterPosition = this.getSplitterPosition();
    var ratio = splitterPosition / (size - splitterSize);
    if (isNaN(ratio)) {
      ratio = 0;
    }
    else
    if (ratio < 0) {
      ratio = 0;
    }
    else
    if (ratio > 1) {
      ratio = 1;
    }
    return ratio;
  },
  getSplitterPosition: function(splitter, orientation){
    if (!splitter) splitter = this.getSplitter();
    if (!orientation) orientation = orientation = this.getOrientation();

    var property;
    switch (orientation) {
      case SplitPane.orientations.vertical:
        property = "offsetLeft";
        break;
      case SplitPane.orientations.horizontal:
        property = "offsetTop";
        break;
    }
    return splitter[property];
  },
  maintainRatio: function(){
    return iDef(this.conf.maintainRatio) ? Boolean(this.conf.maintainRatio) : true;
  },
  setSplitterPosition: function(position) {
    var me = this;
    var orientation = this.getOrientation();
    var splitter = this.getSplitter();
    var data = {
      oldPosition: this.getSplitterPosition(splitter, orientation),
      newPosition: position
    };
    if (this.fireEvent("beforeSplitterPositionChange", data) === false) return;
    var property, complementaryProperty;
    switch (orientation) {
      case SplitPane.orientations.vertical:
        property = "left";
        complementaryProperty = "width";
        break;
      case SplitPane.orientations.horizontal:
        property = "top";
        complementaryProperty = "height";
        break;
    }
    var postfix = "";
    if (iInt(position) && /^\w*\d+\w*$/.test(position)) {
      postfix = "px";
    }
    splitter.style[property] = position + postfix;

    var clientProperty;
    clientProperty = "offset" + property.charAt(0).toUpperCase() + property.substr(1);
    position = splitter[clientProperty];
    splitter.style[property] = position + "px";

    var dom = me.getDom();
    var complementaryPropertyPostfix = complementaryProperty.charAt(0).toUpperCase() + complementaryProperty.substr(1);
    clientProperty = "client" + complementaryPropertyPostfix;
    var size = dom[clientProperty];
    var splitterSize = splitter[clientProperty];
    //size -= splitterSize;
    //dom.style["min" + complementaryPropertyPostfix] = (position + splitterSize) + "px";

    var style;
    style = me.getFirstComponent().style;
    style[complementaryProperty] = position +"px"; //(position + splitterSize/2) + "px";

    style = me.getSecondComponent().style;
    style[complementaryProperty] = (size - (position + splitterSize)) + "px"; //((size - position) + splitterSize/2) + "px";
    style[property] = (position + splitterSize) + "px"; //(position + splitterSize/2) + "px";
    this.restoreCollapsers();
    this.fireEvent("splitterPositionChanged", data);
  },
  getOrientation: function(){
    return this.conf.orientation || SplitPane.orientations.vertical;
  },
  setOrientation: function(orientation){
    var oldOrientation = this.getOrientation();
    if (orientation == oldOrientation) return;
    if (
      orientation !== SplitPane.orientations.vertical &&
      orientation !== SplitPane.orientations.horizontal
    ) throw "Invalid orientation";

    var data = {
      oldOrientation: oldOrientation,
      newOrientation: orientation
    };
    if (this.fireEvent("beforeOrientationChange", data) === false) return;

    var size = this.getSize();
    var splitterPosition = this.getSplitterPosition();

    var splitterStyle = this.getSplitter().style;
    splitterStyle.top = "";
    splitterStyle.left = "";

    var firstComponentStyle = this.getFirstComponent().style;
    firstComponentStyle.height = "";
    firstComponentStyle.width = "";
    firstComponentStyle.top = "";
    firstComponentStyle.left = "";

    var secondComponentStyle = this.getSecondComponent().style;
    secondComponentStyle.height = "";
    secondComponentStyle.width = "";
    secondComponentStyle.top = "";
    secondComponentStyle.left = "";

    rCls(this.getDom(), this.conf.orientation, orientation);
    this.conf.orientation = orientation;
    this.setSplitterPosition((100 * splitterPosition / size) + "%");

    this.fireEvent("orientationChanged", data);
  },
  getFirstComponent: function() {
    return getDom(this.conf.firstComponent);
  },
  getSecondComponent: function() {
    return getDom(this.conf.secondComponent);
  },
  createDom: function(){
    var conf = this.conf;

    var componentPrefix = SplitPane.prefix + "-component";
    var parentNode;

    var firstComponent = this.getFirstComponent();
    if (parentNode = firstComponent.parentNode) parentNode.removeChild(firstComponent);
    firstComponent.className += " " + componentPrefix + " " + componentPrefix + "-first";

    var secondComponent = this.getSecondComponent();
    if (parentNode =  secondComponent.parentNode) parentNode.removeChild(secondComponent);
    secondComponent.className += " " + componentPrefix + " " + componentPrefix + "-second";

    var firstCollapserDom = cEl("div", {
      id: this.getFirstCollapserId(),
      "class": "splitter-collapser splitter-collapser-first"
    });
    var secondCollapserDom = cEl("div", {
      id: this.getSecondCollapserId(),
      "class": "splitter-collapser splitter-collapser-second"
    });
    listen(firstCollapserDom, "click", this.collapserDomClicked, this);
    listen(secondCollapserDom, "click", this.collapserDomClicked, this);

    var splitterDom = cEl("div", {
      id: this.getSplitterId(),
      "class": SplitPane.prefix + "-splitter"
    }, [firstCollapserDom, secondCollapserDom]);

    var el = cEl("div", {
      id: this.getId(),
      "class": confCls(
        SplitPane.prefix,
        SplitPane.prefix + "-" + this.getOrientation(),
        conf
      )
    }, [
      firstComponent,
      splitterDom,
      secondComponent
    ]);
    var container = conf.container;
    if (container) {
      container = gEl(container);
      container.appendChild(el);
    }
    if(conf.splitterPosition) this.setSplitterPosition(conf.splitterPosition);
    return el;
  },
  collapserDomClicked: function(event){
    var target = event.getTarget();
    if (hCls(target, "splitter-uncollapser")) {
      this.uncollapse(target);
      return;
    }
    var component;
    if (hCls(target, "splitter-collapser-first")) {
      component = this.getFirstComponent();
    }
    else
    if (hCls(target, "splitter-collapser-second")) {
      component = this.getSecondComponent();
    }
    if (component) {
      this.collapse(component);
    }
  },
  collapse: function(component){
    var splitterPosition = this.getSplitterPosition();
    var size = this.getSize();
    this.uncollapsedSplitterPosition = (100 * (splitterPosition / size)) + "%";
    var collapser, otherCollapser;
    var className = "splitter-uncollapser";
    switch (component) {
      case this.getFirstComponent():
        collapser = this.getFirstCollapser();
        otherCollapser= this.getSecondCollapser();
        splitterPosition = 0;
        break;
      case this.getSecondComponent():
        collapser = this.getSecondCollapser();
        otherCollapser= this.getFirstCollapser();
        splitterPosition = size - this.getSize("splitter");
        break;
    }
    this.setSplitterPosition(splitterPosition);
    aCls(collapser, className);
    rCls(otherCollapser, className);
  },
  restoreCollapsers: function(){
    rCls(this.getFirstCollapser(), "splitter-uncollapser");
    rCls(this.getSecondCollapser(), "splitter-uncollapser");
  },
  uncollapse: function(uncollapser){
    var className;
    this.setSplitterPosition(this.uncollapsedSplitterPosition);
  },
  getSplitterId: function(){
    return this.getId() + "-splitter";
  },
  getSplitter: function() {
    return gEl(this.getSplitterId());
  },
  getFirstCollapserId: function(){
    return this.getId() + "-collapser-first";
  },
  getFirstCollapser: function(){
    return gEl(this.getFirstCollapserId());
  },
  getSecondCollapserId: function(){
    return this.getId() + "-collapser-second";
  },
  getSecondCollapser: function(){
    return gEl(this.getSecondCollapserId());
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) el = this.createDom();
    return el;
  },
  render: function() {
    this.createDom();
  }
};
SplitPane.orientations = {
  horizontal: "horizontal",
  vertical: "vertical"
}
SplitPane.id = 0;
SplitPane.prefix = "splitpane";
SplitPane.instances = {};
SplitPane.getInstance = function(id){
    if (iInt(id)) id = SplitPane.prefix + id;
    return SplitPane.instances[id];
};
SplitPane.lookup = function(el){
  var re = new RegExp("^" + SplitPane.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return SplitPane.getInstance(el.id);
};
SplitPane.orientations.vertical = "vertical";
SplitPane.orientations.horizontal = "horizontal";
SplitPane.listenToDnd = function(dnd){
  dnd.listen({
    startDrag: function(event, ddHandler) {
      var target = event.getTarget();
      if (!hCls(target, "splitpane-splitter")) return false;

      var currentSplitPane = SplitPane.lookup(target);
      if (!currentSplitPane) {
        console.log("Error: splitter found but corresponding splitpane not found.");
        return false;
      }
      var orientation = currentSplitPane.getOrientation();
      var dom = currentSplitPane.getDom();
      var splitter = currentSplitPane.getSplitter();
      var splitterPos = pos(splitter);
      var xy = event.getXY();
      currentSplitPane.pos = pos(dom);
      var max, min = 0;
      var first = currentSplitPane.getFirstComponent();
      var firstSplitPane = SplitPane.lookup(first);
      //if (currentSplitPane.maintainRatio()) firstSplitPane = null;
      if (firstSplitPane === currentSplitPane) firstSplitPane = null;
      if (firstSplitPane) firstSplitPane = firstSplitPane.getDom().style;
      switch (orientation) {
        case SplitPane.orientations.horizontal:
          max = dom.clientHeight - splitter.clientHeight;
          if (firstSplitPane) min = parseInt(firstSplitPane.minHeight, 10);
          currentSplitPane._extra = xy.y - splitterPos.top;
          break;
        case SplitPane.orientations.vertical:
          max = dom.clientWidth - splitter.clientWidth;
          if (firstSplitPane) min = parseInt(firstSplitPane.minWidth, 10);
          currentSplitPane._extra = xy.x - splitterPos.left;
          break;
      }
      currentSplitPane.max = max;
      currentSplitPane.min = min;

      var contentArea = ContentArea.lookup(dom);
      if (contentArea) {
        var selectedPane = contentArea.getSelectedPane();
        if (selectedPane) {
          dnd.highlighter = contentArea.getHighlighter();
        }
        else {
          dnd.highlighter = null;
        }
      }
      dnd.currentSplitPane = currentSplitPane;
      return true;
    },
    whileDrag: function(event, dnd) {
      var currentSplitPane = dnd.currentSplitPane;
      var xy = event.getXY();
      var pos;
      var dom = currentSplitPane.getDom();

      switch (currentSplitPane.getOrientation()) {
        case SplitPane.orientations.horizontal:
          pos = xy.y - currentSplitPane.pos.top;
          break;
        case SplitPane.orientations.vertical:
          pos = xy.x - currentSplitPane.pos.left;
          break;
        default:
          return;
      }

      var min = currentSplitPane.min;
      if (pos < min) pos = min;

      var max = currentSplitPane.max;
      if (pos > max) pos = max;

      currentSplitPane.setSplitterPosition((pos - currentSplitPane._extra) + "px");
      if (dnd.highlighter) {
        dnd.highlighter.sync();
      }
    },
    endDrag: function(event, ddHandler) {
      var currentSplitPane = dnd.currentSplitPane;
      if (!currentSplitPane) return;
      /*
      if (currentSplitPane.maintainRatio()) {
        var splitter = currentSplitPane.getSplitter();
        var firstComponent = currentSplitPane.getFirstComponent();
        var secondComponent = currentSplitPane.getSecondComponent();
        var position = currentSplitPane.getSplitterPosition();
        var size = currentSplitPane.getSize();
        var size100 = size / 100;
        var ratio = position / size100;
        var otherRatio = (size - position) / size100;
        switch (currentSplitPane.getOrientation()) {
          case SplitPane.orientations.horizontal:
            firstComponent.style.height = ratio + "%";
            splitter.style.top = ratio + "%";
            secondComponent.style.top = ratio + "%";
            break;
          case SplitPane.orientations.vertical:
            firstComponent.style.width = ratio + "%";
            splitter.style.left = ratio + "%";
            secondComponent.style.left = ratio + "%";
            break;
          default:
        }
      }
      */
      dnd.currentSplitPane = null;
    }
  });
};
adopt(SplitPane, Observable);

linkCss(muiCssDir + "splitpane.css");

})();
