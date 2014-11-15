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
var TabPane;

(function(){
(TabPane = function(conf) {
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++TabPane.id;
  TabPane.instances[this.getId()] = this;
  this.tabs = [];
  this.selectedTab = null;
  if (conf.listeners) {
    this.listen(conf.listeners);
  }
}).prototype = {
  getId: function(){
    return TabPane.prefix + this.id;
  },
  getTab: function(index){
    var tabs = this.tabs, ret;
    if (index < 0 || index >= tabs.length) {
      ret = null;
    }
    else {
      ret = tabs[index];
    }
    return ret;
  },
  getSelectedTab: function() {
    var selectedTab = this.selectedTab;
    if (selectedTab >= 0 && selectedTab < this.getTabCount()) {
      return this.getTab(selectedTab);
    }
    return null;
  },
  newComponentId: function(){
    return TabPane.prefix + "-component-" + (++TabPane.componentId);
  },
  getDom: function(){
    var el = gEl(this.getId());
    if (!el) {
      return this.createDom();
    }
    return el;
  },
  getTabButtonIndex: function(tabButton){
    var id;
    if (iStr(tabButton)){
      id = tabButton;
    }
    else
    if (iNod(tabButton)) {
      id = tabButton.id;
    }
    if (!iStr(id)) {
      throw "Invalid id";
    }
    var i, tabs = this.tabs, n = tabs.length, tab;
    for (i = 0; i < n; i++) {
      tab = tabs[i];
      if (tab.id === id) {
        return i;
      }
    }
    return -1;
  },
  clickHandler: function(e) {
    var target = e.getTarget();
    var el = fEl(target, "pentaho-tabWidget");
    if (!el) {
      return;
    }
    var index = this.getTabButtonIndex(el);
    if (index === -1) {
      return;
    }
    if (hCls(target, "pentaho-tabWidget-close")) {
      this.closeTab(index);
    }
    else {
      this.setSelectedTab(index);
    }
  },
  createDom: function(){
    var conf = this.conf;
    var container = conf.container;
    container = gEl(container);
    if (!container) {
      container =  body;
    }
    var tabBar = cEl("div", {
      "class": "pentaho-tab-bar"
    });
    listen(tabBar, "click", this.clickHandler, this);
    var el = cEl("div", {
      "class": confCls(
        "pentaho-tab-panel",
        "tabpane",
        conf
      ),
      "id": this.getId()
    }, [
      tabBar,
      cEl("div", {
        "class": confCls(
          "pentaho-tab-deck-panel",
//          "mantle-default-tab-background",
          "tabpane-components",
          conf
        )
      })
    ]);
    container.appendChild(el);
    if (conf.tabs) {
      this.addTab(conf.tabs);
    }
    return el;
  },
  render: function() {
    this.createDom();
  },
  getTabStrip: function() {
    var dom = this.getDom();
    return dom.childNodes[0];
  },
  getTabContainer: function() {
    var dom = this.getDom();
    return dom.childNodes[1];
  },
  getTabCount: function() {
    return this.tabs.length;
  },
  getTabPage: function(index){
    var tab = this.getTab(index);
    if (!tab) {
      return null;
    }
    return gEl(tab.componentId);
  },
  setTabSelected: function(index, selected) {
    var tabs = this.tabs;
    if (!this.hasTab(index)) {
      return;
    }
    var tab = tabs[index];
    var tabButton = gEl(tab.id);
    var component;
    if (iDef(tab.componentId)) {
      component = gEl(tab.componentId);
    }
    switch (selected) {
      case true:
        aCls(tabButton, "pentaho-tabWidget-selected");
        if (component) {
          Displayed.show(component);
        }
        break;
      case false:
        rCls(tabButton, "pentaho-tabWidget-selected");
        if (component) {
          Displayed.hide(component);
        }
        break;
    }
  },
  hasTab: function(index) {
    return (index >= 0 && index < this.tabs.length);
  },
  setSelectedTab: function(index){
    if (!this.hasTab(index)) {
      return;
    }
    if (this.selectedTab === index) {
      return;
    }
    var data = {
      newTab: index
    };
    if (this.hasTab(this.selectedTab)) {
      data.oldTab = this.selectedTab;
    }
    if (this.fireEvent("beforeSelectTab", data) === false) {
      return;
    }
    if (iInt(this.selectedTab)) {
      this.setTabSelected(this.selectedTab, false);
    }
    if (iInt(index)) {
      this.setTabSelected(index, true);
    }
    this.selectedTab = index;
    this.fireEvent("tabSelected", data);
  },
  closeTab: function(index) {
    var data = {
      oldTab: index
    };
    if (this.fireEvent("beforeCloseTab", data) === false) {
      return;
    }
    if (index < this.selectedTab) {
      this.selectedTab--;
    }
    else
    if (index === this.selectedTab) {
      if (index + 1 < this.tabs.length) {
        this.setSelectedTab(index + 1);
      }
      else
      if (index - 1 >= 0) {
        this.setSelectedTab(index - 1);
      }
      else {
        this.selectedTab = -1;
      }
    }
    var tab = this.getTab(index);
    this.tabs.splice(index, 1);
    var dom;
    dom = gEl(tab.id);
    dom.parentNode.removeChild(dom);
    if (tab.componentId) {
      dom = gEl(tab.componentId);
      dom.parentNode.removeChild(dom);
    }
    this.fireEvent("tabClosed", data);
  },
  addTab: function(conf) {
    if (conf instanceof Array) {
      var i, n = conf.length;
      for (i = 0; i < conf.length; i++){
        this.addTab(conf[i]);
      }
      return;
    }
    var classes = confCls("pentaho-tabWidget", conf);
    var content = [];

    if (conf.text) {
      content.push(cEl("span", {
        "class": "pentaho-tabWidgetLabel"
      }, conf.text));
    }

    if (conf.closeable === true) {
      content.push(cEl("span", {
        "class": "pentaho-tabWidget-close"
      }));
    }

    if (conf && conf.tooltip) {
      content.push(cEl("div", {
        "class": "tooltip"
      }, conf.tooltip));
    }

    var id;
    if (iUnd(conf.id)) {
      conf.id = id = this.newComponentId();
    }
    else {
      id = conf.id;
    }

    var tabButton = cEl("div", {
      "class": classes,
      "id": id
    }, content);

    var component;
    if (iDef(conf.component)) {
      component = getDom(conf.component);
      if (component.id === null || component.id === "") {
        component.id = this.newComponentId();
      }
      conf.componentId = component.id;
    }

    var tabs = this.tabs, numTabs = tabs.length;
    var tabStrip = this.getTabStrip();
    var tabContainer = this.getTabContainer();
    var index = (iUnd(conf.index) || conf.index >= numTabs) ? numTabs: conf.index;
    tabs.splice(index, 0, conf);
    if (index === numTabs) {
      tabStrip.appendChild(tabButton);
    }
    else {
      var prev = tabs[index+1];
      tabStrip.insertBefore(tabButton, gEl(prev.id));
    }

    if (component) {
      tabContainer.appendChild(component);
    }

    if (conf.selected === true) {
      this.setSelectedTab(index);
    }
    else {
      this.setTabSelected(index, false);
    }
  }
};

adopt(TabPane, Observable);

TabPane.componentId = 0;
TabPane.id = 0;
TabPane.prefix = "tabpane";
TabPane.instances = {};
TabPane.getInstance = function(id){
    if (iInt(id)) id = TabPane.prefix + id;
    return TabPane.instances[id];
};
TabPane.lookup = function(el){
  var re = new RegExp("^" + TabPane.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return TabPane.getInstance(el.id);
};

linkCss(muiCssDir + "tabpane.css");

})();
