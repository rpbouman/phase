var MondrianSchemaTreeView;
(function(){

(MondrianSchemaTreeView = function(conf){
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("tree");
  conf.classes.push("mondrian-schema-tree");
  arguments.callee._super.apply(this, [conf]);
  this.pham = conf.pham;

  this.mondrianSchemaCache = conf.mondrianSchemaCache;
  this.mondrianSchemaCache.listen("modelEvent", this.handleModelEvent, this);

  var dnd = conf.dnd;
  dnd.listen({
    scope: this,
    startDrag: function(event, ddHandler) {
      clearBrowserSelection();
      var target = event.getTarget();
      if (target.className === "toggle") {
        return false;
      }

      var treeNode = TreeNode.lookup(target);
      if (!treeNode) {
        return false;
      }

      if (treeNode.getTree() !== this.getDom()){
        return false;
      }

      var dom = treeNode.getDom();
      var proxy = ddHandler.dragProxy;
      ddHandler.treeNode = treeNode;
      ddHandler.proxyClassName = proxy.className;
      proxy.innerHTML = "<div class=\"head\">" + treeNode.getDomHead().innerHTML + "</head>";

      var className;
      className = (proxy.className + " " + dom.className).replace(
        /collapsed|expanded/ig, "leaf"
      ).replace(
        /dirty/ig, ""
      ).replace(
        /selected/ig, ""
      );
      proxy.className = className;

      var style = proxy.style;
      var xy = event.getXY();
      style.display = "block";
      style.left = (1+xy.x) + "px";
      style.top = (1+xy.y) + "px";
      return true;

    },
    whileDrag: function(event, ddHandler) {
      var proxy = ddHandler.dragProxy;
      var proxy = ddHandler.dragProxy;
      var style = proxy.style;
      var xy = event.getXY();
      style.left = (1+xy.x) + "px";
      style.top = (1+xy.y) + "px";
      clearBrowserSelection();
    },
    endDrag: function(event, ddHandler) {
      var target = event.getTarget();
      var proxy = ddHandler.dragProxy;
      proxy.className = ddHandler.proxyClassName;
      proxy.style.display = "";
      clearBrowserSelection();
    }
  });

  if (conf.listeners) {
    this.listen(conf.listeners);
  }
}).prototype = {
  handleModelEvent: function(mondrianSchemaCache, event, data){
    var model = data.model;
    var modelEvent = data.modelEvent;
    var eventData = data.eventData;
    var modelElementPath = eventData.modelElementPath;
    switch (modelEvent) {
      case "modelElementCreated":
        this.handleModelElementCreated(modelElementPath);
        break;
      case "modelElementRemoved":
        this.handleModelElementRemoved(modelElementPath);
        break;
      case "modelElementAttributeSet":
        if (eventData.attribute === "name") {
          this.handleModelElementNameChange(
            modelElementPath,
            eventData.oldValue,
            eventData.newValue
          );
        }
        break;
      case "modelDirty":
        this.markDirty(model, eventData.dirty);
        break;
    }
  },
  markDirty: function(model, dirty){
    var schemaName = model.getSchemaName();
    var treeNode = this.getModelTreeNode(schemaName);
    var dom = treeNode.getDom();
    if (dirty) {
      aCls(dom, "dirty");
    }
    else {
      rCls(dom, "dirty");
    }
  },
  handleModelElementCreated: function(modelElementPath){
    var type = modelElementPath.type;
    switch (type) {
      case "Schema":
      case "Cube":
      case "SharedDimension":
      case "PrivateDimension":
      case "DimensionUsage":
      case "Measure":
      case "CalculatedMember":
      case "Hierarchy":
      case "Level":
        break;
      default:
        return;
    }
    this.createModelElementTreeNodeForPath(modelElementPath, function(treeNode){
      //dimensions are pre-decorated, so we will expand them.
      switch (type) {
        case "SharedDimension":
        case "PrivateDimension":
        case "Hierarchy":
          treeNode.loadChildren(null, function(){
            switch (type) {
              case "SharedDimension":
              case "PrivateDimension":
                treeNode.eachChild(function(hierarchyNode, i){
                  hierarchyNode.loadChildren(null, function(){
                    hierarchyNode.expand();
                  })
                });
            }
            treeNode.expand();
          });
      }
      this.fireEvent("treeNodeCreatedForModelElementPath", treeNode);
    }, this);
  },
  handleModelElementRemoved: function(modelElementPath){
    var treeNode = this.getTreeNodeForPath(modelElementPath);
    if (!treeNode) {
      //it's possible that the parent node of this node never loaded its children -bail.
      return;
    };
    this.removeTreeNode(treeNode);
  },
  handleModelElementNameChange: function(modelElementPath, oldName, newName){
    var treeNode = this.getTreeNodeForPath(modelElementPath);
    if (!treeNode) {
      //it's possible that this node was not yet loaded.
      return;
    };
    var oldId = treeNode.id;
    var lastIndexOf = oldId.lastIndexOf(":");
    if (oldId.substr(lastIndexOf + 1) !== oldName) {
      throw {
        message: "Invalid id"
      };
    }
    var newId = oldId.substr(0, lastIndexOf) + ":" + newName;
    treeNode.setId(newId);
    treeNode.eachDescendantDepthFirst(function(descendantNode, i){
      var id = descendantNode.id;
      id = id.substr(oldId.length);
      id = newId + id;
      descendantNode.setId(id);
    }, this);
    treeNode.setTitle(newName);
  },
  createDom: function(){
    var dom = ContentPane.prototype.createDom.apply(this);
    this.modelTreeListener = new TreeListener({
      container: dom
    });
    this.modelTreeSelection = new TreeSelection({
      treeListener: this.modelTreeListener,
      listeners: {
        scope: this,
        beforeChangeSelection: function(modelTreeSelection, event, data){
          return this.fireBeforeChangeSelection(data);
        },
        selectionChanged: function(modelTreeSelection, event, data){
          var selectedTreeNode = data.newSelection ? data.newSelection[0] : null;
          this.fireSelectionChanged(selectedTreeNode);
        }
      }
    });
    return dom;
  },
  fireBeforeChangeSelection: function(data){
    return this.fireEvent("beforeChangeSelection", data);
  },
  fireSelectionChanged: function(selectedTreeNode){
    return this.fireEvent("selectionChanged", selectedTreeNode);
  },
  getSelection: function(){
    return this.modelTreeSelection.getSelection();
  },
  getSelectedTreeNode: function(){
    var selection = this.getSelection();
    selection = selection.length ? selection[0] : null;
    return selection;
  },
  setSelection: function(selection){
    this.modelTreeSelection.setSelection(selection);
  },
  setSelectedTreeNode: function(selectedTreeNode) {
    this.setSelection(selectedTreeNode === null ? null: [selectedTreeNode]);
  },
  loadCubeTreeNodeChildren: function (callback, parentTreeNode){
    var me = this;
    var modelSelection = this.parseModelElementPath(parentTreeNode.id);
    var model = this.mondrianSchemaCache.getModel(modelSelection.Schema);
    var cubeName = modelSelection.Cube;
    model.eachMeasure(cubeName, function(measure, index){
      this.createMeasureTreeNode(measure, parentTreeNode);
    }, this);
    model.eachCubeCalculatedMember(cubeName, function(calculatedMember, index){
      this.createCalculatedMemberTreeNode(calculatedMember, parentTreeNode);
    }, this);
    model.eachPrivateDimension(cubeName, function(dimension, index){
      this.createDimensionTreeNode(dimension, parentTreeNode);
    }, this);
    model.eachDimensionUsage(cubeName, function(dimensionUsage, index){
      this.createDimensionUsageTreeNode(dimensionUsage, parentTreeNode)
    }, this);

    callback();
  },
  loadHierarchyTreeNodeChildren: function (callback, parentTreeNode){
    var me = this;
    var modelSelection = this.parseModelElementPath(parentTreeNode.id);
    var model = this.mondrianSchemaCache.getModel(modelSelection.Schema);
    var hierarchy = model.getModelElement(modelSelection);
    model.eachHierarchyLevel(hierarchy, function(level, index){
      me.createLevelTreeNode(level, parentTreeNode)
    });
    callback();
  },
  loadDimensionTreeNodeChildren: function (callback, parentTreeNode){
    var me = this;
    var modelSelection = this.parseModelElementPath(parentTreeNode.id);
    var model = this.mondrianSchemaCache.getModel(modelSelection.Schema);
    var dimension = model.getModelElement(modelSelection);
    model.eachDimensionHierarchy(dimension, function(hierarchy, index){
      me.createHierarchyTreeNode(hierarchy, parentTreeNode);
    });
    callback();
  },
  createMeasureTreeNode: function(measure, parentTreeNode){
    return this.createModelElementTreeNode(
      measure,
      parentTreeNode,
      "Measure"
    );
  },
  createCalculatedMemberTreeNode: function(calculatedMember, parentTreeNode){
    return this.createModelElementTreeNode(
      calculatedMember,
      parentTreeNode,
      "CalculatedMember"
    );
  },
  createDimensionUsageTreeNode: function(dimensionUsage, parentTreeNode){
    return this.createModelElementTreeNode(
      dimensionUsage,
      parentTreeNode,
      "DimensionUsage"
    );
  },
  createLevelTreeNode: function(level, parentTreeNode) {
    return this.createModelElementTreeNode(
      level,
      parentTreeNode,
      "Level"
    );
  },
  createHierarchyTreeNode: function(hierarchy, parentTreeNode){
    return this.createModelElementTreeNode(
      hierarchy,
      parentTreeNode,
      "Hierarchy",
      this.loadHierarchyTreeNodeChildren
    );
  },
  createSharedDimensionTreeNode: function (dimension, parentTreeNode){
    return this.createDimensionTreeNode(dimension, parentTreeNode);
  },
  createPrivateDimensionTreeNode: function (dimension, parentTreeNode){
    return this.createDimensionTreeNode(dimension, parentTreeNode);
  },
  createDimensionTreeNode: function (dimension, parentTreeNode){
    var selection = this.parseModelElementPath(parentTreeNode.id);
    return this.createModelElementTreeNode(
      dimension,
      parentTreeNode,
      selection.type === "Schema" ? "SharedDimension" : "PrivateDimension",
      this.loadDimensionTreeNodeChildren
    );
  },
  createCubeTreeNode: function(cube, parentTreeNode) {
    return this.createModelElementTreeNode(
      cube,
      parentTreeNode,
      "Cube",
      this.loadCubeTreeNodeChildren
    );
  },
  createVirtualCubeTreeNode: function(virtualCube, parentTreeNode){
    return this.createModelElementTreeNode(
      virtualCube,
      parentTreeNode,
      "VirtualCube",
      this.loadVirtualCubeTreeNodeChildren
    );
  },
  compareTreeNode: function(treeNode){
    var thisId = this.conf.id.split(":");
    var thatId = treeNode.conf.id.split(":");

    var thisName = thisId[thisId.length - 1];
    var thatName = thatId[thatId.length - 1];

    var thisType = thisId[thisId.length - 2];
    var thatType = thatId[thatId.length - 2];

    var parentType = thisId[thisId.length - 4];

    switch (parentType) {
      case "Schema":
        switch (thisType) {
          case "Cube":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              default:
                return -1;
            }
          case "Dimension":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "Cube":
                return 1;
              default:
                return -1;
            }
          case "VirtualCube":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              default:
                return 1;
            }
        }
      case "Cube":
        switch (thisType){
          case "Measure":
            switch (thatType){
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              default:
                return -1;
            }
          case "CalculatedMember":
            switch (thatType){
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "Measure":
                return 1;
              default:
                return -1;
            }
          case "PrivateDimension":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "Measure":
              case "CalculatedMember":
                return 1;
              default:
                return -1;
            }
          case "DimensionUsage":
            switch (thatType){
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              default:
                return 1;
            }
        }
      case "SharedDimension":
      case "PrivateDimension":
        return TreeNode.prototype.compare.call(this, treeNode);
      case "VirtualCube":
        return TreeNode.prototype.compare.call(this, treeNode);
    }
  },
  createModelElementTreeNode: function (modelElement, parentTreeNode, type, childLoader){
    var me = this, name = modelElement.attributes.name || "";
    var treeNode = new TreeNode({
      id: parentTreeNode.id + ":" + type + ":" + name,
      classes: [type],
      parentTreeNode: parentTreeNode,
      title: name,
      tooltip: name,
      state: childLoader ? TreeNode.states.collapsed : TreeNode.states.leaf,
      loadChildren: function(callback){
        childLoader.call(me, callback, this);
      },
      sorted: true,
      compare: this.compareTreeNode
    });
    return treeNode;
  },
  renderModelTreeNodeChildren: function (parentTreeNode, callback){
    var me = this;
    var modelName = parentTreeNode.getId();
    modelName = modelName.substr(modelName.lastIndexOf(":") + 1);
    var model = this.mondrianSchemaCache.getModel(modelName);

    model.eachCube(function(cube, index){
      me.createCubeTreeNode(cube, parentTreeNode);
    });
    model.eachSharedDimension(function(dimension, index){
      me.createDimensionTreeNode(dimension, parentTreeNode);
    });
    model.eachVirtualCube(function(virtualCube, index){
      me.createVirtualCubeTreeNode(virtualCube, parentTreeNode);
    });

    callback();
  },
  parseModelElementPath: function(selection){
    if (selection instanceof TreeNode) {
      selection = selection.conf.id;
    }
    if (iStr(selection)){
      selection = selection.split(":");
    }
    var data = {}, i, n = selection.length, key, value;
    for (i = 0; i < n; i++) {
      key = selection[i];
      value = selection[++i];
      data[key] = value;
    }
    data.type = key;
    return data;
  },
  getTreeNodeIdForPath: function(path){
    var elements = {
      Schema: {
        Cube: {
          PrivateDimension: null,
          DimensionUsage: null,
          Measure: null,
          CalculatedMember: null
        },
        SharedDimension: {
          Hierarchy: {
            Level: null
          }
        }
      }
    }
    var id = "", name, value = elements;
    outer: do {
      for (name in value) {
        if (iDef(path[name])) {
          id += ":" + name + ":" + path[name];
          break;
        }
      }
      value = value[name];
    } while (value);
    return TreeNode.prefix + id;
  },
  getTreeNodeForPath: function(path){
    var id = this.getTreeNodeIdForPath(path);
    return TreeNode.getInstance(id);
  },
  createModelElementTreeNodeForPath: function(path, callback, scope){
    path = merge({}, path);
    var type = path.type;
    var method = this["create" + type + "TreeNode"];
    if (!iFun(method)) {
      throw "No method to create node of type \"" + type + "\"."
    }
    var model = this.mondrianSchemaCache.getModel(path.Schema);
    var modelElement = model.getModelElement(path);
    delete path[path.type];
    delete path.type;
    var parentTreeNode = this.getTreeNodeForPath(path);
    if (!parentTreeNode.childrenRendered()) {
      parentTreeNode.loadChildren(null, function(parentTreeNode){
        var treeNode = method.call(this, modelElement, parentTreeNode);
        if (callback) {
          callback.call(scope, treeNode);
        }
      }, this);
    }
    else {
      var treeNode = method.call(this, modelElement, parentTreeNode);
      if (callback) {
        callback.call(scope, treeNode);
      }
    }
  },
  loadModelTreeNodeChildren: function (callback, parentNode){
    var me = this;
    var modelName = parentNode.getId();
    modelName = modelName.substr(modelName.lastIndexOf(":") + 1);
    if (this.mondrianSchemaCache.hasModel(modelName)) {
      var model = this.mondrianSchemaCache.getModel(modelName);
      if (model.getName() !== "") {
        this.renderModelTreeNodeChildren(parentNode, callback);
      }
    }
    else {
      this.mondrianSchemaCache.loadModel(modelName, function(model){
        me.renderModelTreeNodeChildren(parentNode, callback);
      });
    }
  },
  renderModelTreeNode: function (modelName, append){
    var me = this;

    var nodeId = "Schema:" + modelName;
    var treeNode = new TreeNode({
      id: nodeId,
      classes: "Schema",
      title: modelName,
      tooltip: modelName,
      state: TreeNode.states.collapsed,
      loadChildren: function(callback) {
        me.loadModelTreeNodeChildren(callback, this);
      },
      sorted: true
    });
    var parentElement = this.getDom();
    if (append) {
      treeNode.appendToElement(parentElement);
    }
    else {
      var i, childNodes = parentElement.childNodes, n = childNodes.length, childNode, removeTreeNode;
      childNodeLoop: for (i = 0; i < n; i++){
        childNode = childNodes[i];
        childNode = TreeNode.lookup(childNode);
        switch (treeNode.compare(childNode)) {
          case 0:
            removeTreeNode = childNode;
            break childNodeLoop;
          case -1:
            treeNode.addToElementBefore(parentElement, childNode);
            break childNodeLoop;
        }
      }
    }
    treeNode.getDom();
    return treeNode;
  },
  getModelTreeNode: function(modelName){
    return TreeNode.getInstance(TreeNode.prefix + ":Schema:" + modelName);
  },
  renderModelTreeNodes: function(modelNames){
    var n = modelNames.length, i, modelName;
    for (i = 0; i < n; i++) {
      modelName = modelNames[i];
      this.renderModelTreeNode(modelName, true);
    }
  },
  removeModelTreeNode: function(modelName, keepNode) {
    var modelTreeNode = this.getModelTreeNode(modelName);
    if (!modelTreeNode) return;
    this.removeTreeNode(modelTreeNode, keepNode);
  },
  removeTreeNode: function(treeNode, keepNode){
    var parentTreeNode = treeNode.getParentTreeNode() || null;
    if (this.getSelectedTreeNode() === treeNode) {
      this.setSelectedTreeNode(parentTreeNode);
    }
    treeNode.removeFromParent(keepNode);
  }
};
adopt(MondrianSchemaTreeView, ContentPane, Observable);
linkCss("../css/phase-schema-treeview.css");

})();