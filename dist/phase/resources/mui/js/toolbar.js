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

var Toolbar;
(Toolbar = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++Toolbar.id;
  Toolbar.instances[this.getId()] = this;
  this.groups = {};
}).prototype = {
  getId: function(){
    return Toolbar.prefix + this.id;
  },
  getContainer: function(){
    return gEl(this.conf.container) || body;
  },
  createDom: function(){
    var conf = this.conf;
    var container = this.getContainer();
    var el = cEl("div", {
      "class": confCls(
        "toolbar",
        "pentaho-titled-toolbar",
        conf.rounded === false ?  "" : "pentaho-rounded-panel2-shadowed",
        conf.shiny === false ? "" : "pentaho-shine" ,
        "pentaho-background",
        conf
      ),
      "id": this.getId()
    });
    if (container) {
//      if (container.firstChild) {
//        container.insertBefore(el, container.firstChild);
//      }
//      else {
        container.appendChild(el);
//      }
    }
    if (this.conf.buttons) {
      this.addButton(this.conf.buttons, el);
    }
    listen(el, "click", this.clickHandler, this);
    return el;
  },
  render: function() {
    this.createDom();
  },
  clickHandler: function(e) {
    var me = this;
    var target = e.getTarget();
    if (hCls(target, "tooltip") || hCls(target, "separator")) return;
    var button = ToolbarButton.lookup(target);
    if (!button || button.isDisabled()) return;

    var toggleGroup = button.getToggleGroup();
    if (toggleGroup) {
      var depressedButton = this.getDepressedButtonInToggleGroup(toggleGroup);
      if (me.fireEvent("beforeToggleGroupStateChanged", {
        group: toggleGroup,
        oldButton: depressedButton,
        newButton: button
      }) === false) return;
      if (depressedButton) depressedButton.setDepressed(false);
      if (depressedButton !== button || this.groupCount(toggleGroup)!==1) {
        button.setDepressed(true);
      }
      me.fireEvent("afterToggleGroupStateChanged", {
        group: toggleGroup,
        oldButton: depressedButton,
        newButton: button
      });
    }
    else {
      button.press();
      this.fireEvent("buttonPressed", button);
    }
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  addGroup: function(group) {
    var name, isO;
    if (iStr(group)) {
      name = group;
    }
    else
    if (isO = iObj(group)) {
      name = group.name;
    }
    var grp = this.getGroup(name);
    if (iUnd(grp)) {
      grp = this.groups[name] = isO ? group : {};
    }
    if (iUnd(grp.buttons)) {
      grp.buttons = {};
    }
    return grp;
  },
  eachButton: function(callback, scope) {
    var dom = getDom(),
        childNodes = dom.childNodes,
        n = childNodes.length,
        i, node, button, ret
    ;
    if (!scope) scope = this;
    for (i = 0; i < n; i++) {
      node = childNodes[i];
      button = ToolbarButton.lookup(node.id);
      ret = callback.call(scope, button, i);
      if (ret === false) return ret;
    }
    return true;
  },
  groupCount: function(name){
    var count = 0;
    this.eachButtonInGroup(function(button){
      count++;
    }, this, name);
    return count;
  },
  eachButtonInGroup: function(callback, scope, name) {
    var group = this.groups[name];
    if (!group) return true;
    if (!scope) scope = this;
    var buttons = group.buttons, button, ret;
    for (name in buttons) {
      button = buttons[name];
      ret = callback.call(scope, button);
      if (ret === false) return ret;
    }
    return true;
  },
  getDepressedButtonInToggleGroup: function(name) {
    var group = this.groups[name];
    if (!group) throw "No such group " + name;
    var buttn;
    this.eachButtonInGroup(function(button){
      if (button.isDepressed()) {
        buttn = button;
        return false;
      }
    }, this, name);
    return buttn;
  },
  getGroup: function(name) {
    var groups = this.groups;
    var grp = groups[name];
    return grp;
  },
  addButton: function(button, dom) {
    if (!dom) {
      dom = this.getDom();
    }
    if (iArr(button)) {
      var i, n = button.length;
      for (i = 0; i < n; i++) {
        this.addButton(button[i], dom);
      }
    }
    else
    if (iStr(button)){
      cEl("div", {
        "class": "toolbar-label"
      }, button, dom);
    }
    else
    if (button.getDom && iFun(button.getDom)) {
      var buttonDom = button.getDom();
      if (!hCls(buttonDom, "toolbar-item")) aCls(buttonDom, "toolbar-item");
      dom.appendChild(buttonDom);
    }
    else
    if (iNod(button)){
      if (!hCls(button, "toolbar-item")) aCls(button, "toolbar-item");
      dom.appendChild(button);
    }
    else {
      if (!(button instanceof ToolbarButton)) {
        button = new ToolbarButton(button);
      }
      var buttonDom = button.getDom();
      dom.appendChild(buttonDom);
      var grpName, grp;
      grpName = button.getGroup();
      if (grpName) {
        grp = this.getGroup(grpName);
        if (iUnd(grp)) {
          grp = this.addGroup({
            name: grpName,
            buttons: {}
          });
        }
        else {
          if (iUnd(grp.buttons)) {
            grp.buttons = {};
          }
        }
        grp.buttons[button.getId()] = button;
      }
      grpName = button.getToggleGroup();
      if (grpName) {
        grp = this.getGroup(grpName);
        if (iUnd(grp)) {
          grp = this.addGroup({
            name: grpName,
            buttons: {},
          });
        }
        else {
          if (iUnd(grp.buttons)) {
            grp.buttons = {};
          }
        }
        grp.toggle = true;
        grp.buttons[button.getId()] = button;
      }
    }
  }
};
adopt(Toolbar, Observable);

Toolbar.id = 0;
Toolbar.prefix = "toolbar";
Toolbar.instances = {};
Toolbar.getInstance = function(id){
    if (iInt(id)) id = Toolbar.prefix + id;
    return Toolbar.instances[id];
};
Toolbar.lookup = function(el){
  var re = new RegExp("^" + Toolbar.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return Toolbar.getInstance(el.id);
};

/***************************************************************
*
*   ToolbarButton
*
***************************************************************/
var ToolbarButton;
(ToolbarButton = function(conf){
  this.conf = conf || {};
  this.id = conf.id ? conf.id : ++ToolbarButton.id;
  this.pressTimeout = conf.pressTimeout;
  if (iUnd(this.pressTimeout)){
    this.pressTimeout = ToolbarButton.defaultPressTimeout;
  }
  ToolbarButton.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return ToolbarButton.prefix + this.id;
  },
  getToggleGroup: function() {
    return this.conf.toggleGroup;
  },
  getGroup: function() {
    return this.conf.group;
  },
  createDom: function() {
    var conf = this.conf || {};
    var classes = confCls(
      "toolbar-item",
      "toolbar-button",
      "pentaho-titled-toolbar-label",
      conf
    );
    if (this.getToggleGroup()) {
      var i, n = classes.length,
          className,
          hasToggleClass = false,
          hasIsDepressed = false,
          toggleClassName = "toolbar-toggle-button",
          depressedClassName = "toolbar-toggle-button-down"
      ;
      for (i = 0; i < n; i++) {
        className = classes[i]
        switch (className) {
          case toggleClassName:
            hasToggleClass = true;
            break;
          case depressedClassName:
            hasIsDepressed = true;
            break;
        }
      }
      if (!hasToggleClass) {
        classes.push(toggleClassName);
      }
      if (this.conf.depressed === true && !hasIsDepressed) {
        classes.push(depressedClassName);
      }
    }
    var content = [];
    if (conf && conf.text) {
      content.push(conf.text);
    }
    if (conf && conf.tooltip) {
      content.push(
        cEl("div", {
          "class": "tooltip"
        }, conf.tooltip)
      );
    }
    var el = cEl("div", {
      "class": classes,
      "id": this.getId()
    }, content);
    return el;
  },
  press: function() {
    var me = this;
    if (me.isDisabled()) return;
    me.setDepressed(true);
    setTimeout(function() {
      me.setDepressed(false)
    }, me.pressTimeout);
  },
  isDepressed: function() {
    var dom = this.getDom();
    var depressedClassName = "toolbar-toggle-button-down";
    return hCls(dom, depressedClassName);
  },
  setDepressed: function(depressed) {
    var dom = this.getDom();
    var className = dom.className;
    var depressedClassName = "toolbar-toggle-button-down";
    rCls(dom, depressedClassName);
    if (depressed) aCls(dom, depressedClassName);
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
};
ToolbarButton.id = 0;
ToolbarButton.prefix = "toolbar-button";
ToolbarButton.instances = {};
ToolbarButton.getInstance = function(id){
    if (iInt(id)) id = ToolbarButton.prefix + id;
    return ToolbarButton.instances[id];
};
ToolbarButton.lookup = function(el){
  var re = new RegExp("^" + ToolbarButton.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return ToolbarButton.getInstance(el.id);
};
ToolbarButton.defaultPressTimeout = 200;

adopt(ToolbarButton, Displayed, Disabled);

linkCss(muiCssDir + "toolbar.css");
