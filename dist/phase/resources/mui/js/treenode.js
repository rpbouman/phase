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
var TreeNode;
(TreeNode = function(conf){
  this.conf = conf;
  this.id = conf.id ? conf.id : ++TreeNode.id;
  TreeNode.instances[this.getId()] = this;
  if (conf.compare) {
    this.compare = conf.compare;
  }
  var parentTreeNode = conf.parentTreeNode;
  if (parentTreeNode) {
    if (iStr(parentTreeNode)) {
      parentTreeNode = TreeNode.getInstance(parentTreeNode);
    }
    if (!(parentTreeNode instanceof TreeNode)) {
      throw "Invalid parent treenode";
    }
    if (conf.insertBefore) {
      parentTreeNode.addTreeNodeBefore(this, conf.insertBefore);
    }
    else {
      parentTreeNode.appendTreeNode(this);
    }
  }
  else
  if (conf.parentElement) {
    if (conf.insertBefore) {
      this.addToElementBefore(conf.parentElement, conf.insertBefore);
    }
    else {
      this.appendToElement(gEl(conf.parentElement));
    }
  }
}).prototype = {
  getId: function(){
      return TreeNode.prefix + ":" + this.id;
  },
  getConf: function() {
      return this.conf;
  },
  addToElementBefore: function(parentEl, referenceEl){
    gEl(parentEl).insertBefore(this.getDom(), getDom(referenceEl));
  },
  appendToElement: function(el) {
    aCh(el, this.getDom());
  },
  addTreeNodeBefore: function(treeNode, body, referenceEl){
    if (!body) {
      body = this.getDomBody();
    }
    treeNode = treeNode.getDom();
    referenceEl = getDom(referenceEl);
    try {
      body.insertBefore(treeNode, referenceEl);
    }
    catch (e) {
      debugger;
    }
  },
  compare: function(treeNode){
    var t1 = this.getTitle(), t2 = treeNode.getTitle();
    if (t1 > t2) {
      return 1;
    }
    else
    if (t1 < t2) {
      return -1;
    }
    else {
      return 0;
    }
  },
  appendTreeNode: function(treeNode, body){
    treeNode.conf.parentTreeNode = this;
    var referenceEl = null;
    if (this.conf.sorted === true) {
      this.eachChild(function(child, index){
        if (treeNode.compare(child) === -1) {
          referenceEl = child;
          return false;
        }
      }, this);
      if (referenceEl) {
        this.addTreeNodeBefore(treeNode, body, referenceEl);
        return;
      }
    }
    aCh(body || this.getDomBody(), treeNode.getDom());
  },
  getState: function(){
    return this.conf.state || TreeNode.states.collapsed;
  },
  getCustomClass: function(){
    return this.conf.customClass;
  },
  setCustomClass: function(customClass){
    this.conf.customClass = customClass;
    var dom = this.getDomFromDocument();
    if (!dom) return;
    if (hCls(dom, customClass)) return;
    aCls(dom, customClass);
  },
  getTitle: function(){
    return this.conf.title || "";
  },
  setId: function(id){
    var oldId = this.getId();
    var dom = this.getDomFromDocument();
    this.id = id;
    this.conf.id = id;
    delete TreeNode.instances[oldId];
    var newId = this.getId();
    TreeNode.instances[newId] = this;
    if (!dom) {
      return;
    }
    dom.id = newId;
  },
  setTitle: function(title) {
    this.conf.title = title;
    if (!this.isRendered()){
      return;
    }
    this.getDomLabel().innerHTML = title;
  },
  isRendered: function(){
    return this.getDomFromDocument() !== null;
  },
  getDomFromDocument: function() {
    return gEl(this.getId())
  },
  getDom: function() {
      var dom;
      if (!(dom = this.getDomFromDocument())){
          dom = this.createDom();
      }
      return dom;
  },
  getDomHead: function() {
    return gEls(this.getDom(), "DIV", 0);
  },
  getDomLabel: function(){
    var head = this.getDomHead();
    return gEls(head, "SPAN", 1);
  },
  getDomBody: function() {
    return gEls(this.getDom(), "DIV", 1);
  },
  toggle: function() {
    var state = this.getState();
    switch (state) {
      case TreeNode.states.collapsed:
        state = TreeNode.states.expanded;
        break;
      case TreeNode.states.expanded:
        state = TreeNode.states.collapsed;
        break;
    }
    this.setState(state);
  },
  checkState: function(state) {
    var k, states = TreeNode.states;
    for (k in states) {
      if (state === states[k]) return true;
    }
    return false;
  },
  setState: function(state){
    if (!this.checkState(state)) {
      throw "Illegal state: "  + state;
    }
    rCls(this.getDom(), this.getState(), this.conf.state = state);
    if (state === TreeNode.states.collapsed || this.childrenRendered()) {
      return;
    }
    this.loadChildren();
  },
  expand: function(){
    this.setState(TreeNode.states.expanded);
  },
  collapsed: function(){
    this.setState(TreeNode.states.collapsed);
  },
  childrenRendered: function(){
    return gEls(this.getDomBody(), "DIV").length;
  },
  loadChildren: function(body, callback, scope) {
    var me = this,
        conf = me.conf,
        loader = conf.loadChildren,
        children
    ;
    if (!body) {
      body = this.getDomBody();
    }
    var sorted = conf.sorted;
    //if the children are not explicitly marked as unsorted,
    if (loader) {
      var ajaxLoader = cEl("IMG", {
          src: muiImgDir + "ajax-loader-small.gif"
      }, null, me.getDomBody());
      var f = function(){
        if (conf.childrenSorted !== false) {
          //mark this node as not sorted to speed up loading the children
          conf.sorted = false;
        }
        loader.call(me, function(){
          conf.sorted = sorted;
          dEl(ajaxLoader);
          if (callback) {
            callback.call(scope, me);
          }
        });
      }
      setTimeout(f, 1);
    }
    else
    if (children = me.conf.children) {
      var i, n = children.length, child;
      for (i = 0; i < n; i++){
          child = children[i];
          if (!iObj(child)) continue;
          if (!(child instanceof TreeNode)) {
              child = new TreeNode(child);
          }
          this.appendTreeNode(child, body);
      }
    }
  },
  createDom: function() {
    var state = this.getState(), conf = this.conf;
    var body = cEl("DIV", {
      "class": "body"
    });
    var labelContents = [this.getTitle()];
    var toggleConf = {
      "class": "toggle"
    };
    if (conf.icon) {
      toggleConf.style = {
        "background-image": "url('" + conf.icon + "')"
      }
    }
    var contents = [
      cEl("SPAN", toggleConf),
      cEl("SPAN", {
          "class": "label"
      }, labelContents)
    ];
    var dom = cEl("DIV", {
      id: this.getId(),
      "class": confCls(TreeNode.prefix, state, conf).join(" ")
    }, [
      cEl("DIV", {
          "class": "head"
      }, contents),
      body
    ]);
    if (state === TreeNode.states.expanded && conf.children) {
      this.loadChildren(body);
    }
    return dom;
  },
  getSaveData: function(){
    var children = [];
    this.eachChild(function(treeNode) {
      children.push(treeNode.getSaveData());
    });
    return {
      conf: this.conf,
      children: children
    }
  },
  eachDescendantDepthFirst: function(callback, scope){
    if (this.eachChild(function(child, i){
      if (callback.call(scope || this, child, i) === false) {
        return false;
      }
      return child.eachDescendantDepthFirst(callback, scope);
    }, this) === false){
      return false;
    }
    return true;
  },
  expandDescendants: function(){
    this.eachDescendantDepthFirst(function(node, i){
      if (node.getState() !== TreeNode.states.expanded) {
        node.setState(TreeNode.states.expanded);
      }
    }, this);
  },
  eachAncestor: function(callback, scope){
    var node = this, level = 0;
    while (node = node.getParentTreeNode()) {
      if (callback.call(scope || this, node, ++level) === false) {
        return false;
      }
    }
    return true;
  },
  expandAncestors: function(){
    this.eachAncestor(function(node, level){
      if (node.getState() !== TreeNode.states.expanded) {
        node.setState(TreeNode.states.expanded);
      }
    });
  },
  getParentTreeNode: function(){
    return this.conf.parentTreeNode;
  },
  getRootTreeNode: function(){
    var parentNode, node = this;
    while (parentNode = node.getParentTreeNode()) {
      node = parentNode;
    }
    return node;
  },
  getTree: function(){
    var root = this.getRootTreeNode();
    if (!root) {
      return null;
    }
    return root.getDom().parentNode;
  },
  eachChild: function(callback, scope) {
    if (!scope) {
      scope = this;
    }
    var body = this.getDomBody();
    var children = body.children;
    var i, n = children.length, child;
    for (i = 0; i < n; i++) {
      child = children.item(i);
      if (!child.id) {
        continue;
      }
      child = TreeNode.getInstance(child.id);
      if (!child) {
        continue;
      }
      if (callback.call(scope, child, i) === false) {
        return false;
      }
    }
    return true;
  },
  removeFromParent: function(keepNode){
    var dom = this.getDom();
    if (!dom) return;
    var parentNode = dom.parentNode;
    if (!parentNode) return;
    parentNode.removeChild(dom);
    if (keepNode) {
      return;
    }
    this.eachChild(function(child, i){
      child.removeFromParent(false);
    }, this);
    delete TreeNode.instances[this.getId()];
  }
};
TreeNode.states = {
    collapsed: "collapsed",
    expanded: "expanded",
    leaf: "leaf"
};
TreeNode.id = 0;
TreeNode.prefix = "node";
TreeNode.instances = {};
TreeNode.getInstance = function(id){
    if (iInt(id)) id = TreeNode.prefix + id;
    return TreeNode.instances[id];
};
TreeNode.lookup = function(element){
  var el = element;
  var re = new RegExp("\\b" + TreeNode.prefix + "\\b", "g");
  while (el && !re.test(el.className)) {
    el = el.parentNode;
    if (!el || el === doc) {
      return null;
    }
  }
  return TreeNode.getInstance(el.id);
};

linkCss(muiCssDir + "treenode.css");
