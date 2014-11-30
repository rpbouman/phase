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
  this.mondrianSchemaCache.listen({
    scope: this,
    modelEvent: this.handleModelEvent,
    modelElementRenamed: this.handleModelElementRenamed
  });

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

      if (this.getTreeNodeType(treeNode) === "Schema") {
        //we could technically do things by dragging schemas, like merging them,
        //but we'll hold that off for now. Later perhaps.
        return false;
      }

      var dom = treeNode.getDom();
      var proxy = ddHandler.dragProxy;
      ddHandler.treeNode = treeNode;
      ddHandler.parentTreeNode = treeNode.getParentTreeNode();
      ddHandler.treeNodeType = this.getTreeNodeType(treeNode);
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

      //handle dnd inside the schema tree
      var target = event.getTarget();
      var treeNode = TreeNode.lookup(target);
      if (!treeNode) {
        return false;
      }

      this.dragTreeNodeOverTreeNode(ddHandler, treeNode);

    },
    endDrag: function(event, ddHandler) {
      var target = event.getTarget();
      var proxy = ddHandler.dragProxy;
      proxy.className = ddHandler.proxyClassName;
      proxy.style.display = "";
      clearBrowserSelection();
      if (ddHandler.insertionPoint) {
        this.handleMoveTreeNode(ddHandler.treeNode, ddHandler.insertionPoint);
        delete ddHandler.insertionPoint;
      }
      this.cleanUpInsertBelowTreeNodeMark(ddHandler);
      delete ddHandler.treeNode;
      delete ddHandler.prevOverTreeNode;
    }
  });

  if (conf.listeners) {
    this.listen(conf.listeners);
  }
}).prototype = {
  insertBelowClass: "insert-below-treenode",
  dragTreeNodeOverTreeNode: function(ddHandler, overTreeNode){
    var cursor = "", treeNode = ddHandler.treeNode;
    //treeNode is being dragged, overTreeNode is some node sitting in our tree.

    //bail if overTreeNode happens to be in a different treeview.
    if (overTreeNode.getTree() !== this.getDom()){
      return false;
    }

    //determine if a drop would be valid, and if so where the drop would occur.
    var type = this.getTreeNodeType(treeNode);
    var overType = this.getTreeNodeType(overTreeNode);
    var cls = this.insertBelowClass, insertionPoint;
    if (type === overType) {
      if (treeNode === overTreeNode) {
        cursor = "no-drop";
      }
      else
      if (treeNode.getPreviousSiblingTreeNode() === overTreeNode) {
        cursor = "no-drop";
      }
      else {
        insertionPoint = overTreeNode;
      }
    }
    else {
      var comp = this.compareTreeNode.call(overTreeNode, treeNode);
      console.log("compare: " + comp);
      if (comp === null){
        var parentTreeNode = treeNode.getParentTreeNode();
        if (parentTreeNode && this.getTreeNodeType(parentTreeNode) === overType) {
          if (parentTreeNode !== overTreeNode) {
            cursor = "copy";
          }
          insertionPoint = overTreeNode;
        }
        else {
          cursor = "no-drop";
        }
      }
      else {
        var sibling = overTreeNode, prev, c;
        switch (comp) {
          case -1:
            do {
              c = this.compareTreeNode.call(sibling, treeNode);
              if (this.getTreeNodeType(sibling) === type || c !== comp) {
                insertionPoint = prev;
                break;
              }
              prev = sibling;
            } while (sibling = sibling.getNextSiblingTreeNode());
            break;
          case 1:
            do {
              if (this.getTreeNodeType(sibling) === type) {
                insertionPoint = sibling;
                break;
              }
              else
              if (this.compareTreeNode.call(sibling, treeNode) !== comp){
                insertionPoint = sibling;
                break;
              }
              prev = sibling;
            } while (sibling = sibling.getPreviousSiblingTreeNode());
            break;
        }
      }
    }

    if (ddHandler.prevOverTreeNode) {
      ddHandler.prevOverTreeNode.getDomHead().cursor = "";
    }
    if (insertionPoint) {
      if (ddHandler.prevOverTreeNode !== insertionPoint) {
        this.cleanUpInsertBelowTreeNodeMark(ddHandler);
      }

      var domHead = insertionPoint.getDomHead();
      domHead.style.cursor = cursor;
      if (cursor !== "copy" && !hCls(domHead, cls)) {
        aCls(domHead, cls);
      }
      ddHandler.prevOverTreeNode = insertionPoint;
    }
    else {
      //overTreeNode.getDomHead().style.cursor = cursor;
      //ddHandler.prevOverTreeNode = overTreeNode;
    }
    ddHandler.insertionPoint = insertionPoint;
  },
  cleanUpInsertBelowTreeNodeMark: function(ddHandler) {
    var head;
    if (ddHandler.prevOverTreeNode) {
      head = ddHandler.prevOverTreeNode.getDomHead();
      rCls(head, this.insertBelowClass, "");
      head.style.cursor = "";
    }
    if (ddHandler.treeNode) {
      head = ddHandler.treeNode.getDomHead();
      head.style.cursor = "";
      var parentTreeNode = ddHandler.treeNode.getParentTreeNode();
      if (parentTreeNode) {
        head = parentTreeNode.getDomHead();
        head.style.cursor = "";
      }
    }
  },
  handleMoveTreeNode: function(treeNode, toTreeNode){
    var modelElement = this.parseModelElementPath(treeNode);
    var parentTreeNode = treeNode.getParentTreeNode();

    var toModelElement = this.parseModelElementPath(toTreeNode);
    var parentToTreeNode = toTreeNode.getParentTreeNode();

    var eventType = "moveModelElement";
    var eventData = {
      moveModelElement: modelElement,
      toModelElement: toModelElement
    };
    this.fireEvent(eventType, eventData);
  },
  handleModelElementRenamed: function(mondrianSchemaCache, event, data){
    var eventData = data.eventData;
    this.handleModelElementNameChange(
      eventData.modelElementPath,
      eventData.oldValue,
      eventData.newValue
    );
  },
  handleModelEvent: function(mondrianSchemaCache, event, data){
    var model = data.model;
    var modelEvent = data.modelEvent;
    var eventData = data.eventData;
    var modelElementPath = eventData.modelElementPath;
    switch (modelEvent) {
      case "modelElementMoved":
        debugger;
        break;
      case "modelElementRepositioned":
        this.handleModelElementRepositioned(modelElementPath, eventData.afterModelElementPath);
        break;
      case "modelElementCreated":
        this.handleModelElementCreated(modelElementPath);
        break;
      case "modelElementRemoved":
        this.handleModelElementRemoved(modelElementPath);
        break;
      case "modelDirty":
        this.markDirty(model, eventData.dirty);
        break;
      case "modelElementAttributeSet":
        switch (eventData.attribute){
          case "visible":
            this.setVisibility(modelElementPath, eventData.newValue);
            break;
        }
    }
  },
  handleModelElementRepositioned: function(modelElementPath, afterModelElementPath){
    var treeNode = this.getTreeNodeForPath(modelElementPath);
    var dom = treeNode.getDom(), parentNode = dom.parentNode;
    parentNode.removeChild(dom);
    var afterTreeNode = this.getTreeNodeForPath(afterModelElementPath);
    var next = afterTreeNode.getNextSiblingTreeNode();
    if (next) {
      parentNode.insertBefore(dom, next.getDom());
    }
    else {
      parentNode.appendChild(dom);
    }
  },
  setVisibility: function(modelElementPath, visibility){
    var treeNode = this.getTreeNodeForPath(modelElementPath);
    if (!treeNode) {
      return;
    }
    var removeClass, addClass;
    if (String(visibility) === "false") {
      removeClass = "visible-true";
      addClass = "visible-false";
    }
    else {
      removeClass = "visible-false";
      addClass = "visible-true";
    }
    var dom = treeNode.getDom();
    rCls(dom, removeClass, addClass);
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
      //it's also possible someone sloppily asked us to remove a type of treenode that doesn't even exist (like Table, Join etc).
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
    model.eachCalculatedMember(cubeName, function(calculatedMember, index){
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
  loadVirtualCubeTreeNodeChildren: function(callback, parentTreeNode){
    var me = this;
    var modelSelection = this.parseModelElementPath(parentTreeNode.id);
    var model = this.mondrianSchemaCache.getModel(modelSelection.Schema);
    var virtualCubeName = modelSelection.VirtualCube;
    var virtualCube = model.getVirtualCube(virtualCubeName);

    //figure out which cubes are referenced by this virtual cube
    var cubeUsages = {};
    var cubeUsageData;
    var getCubeUsageData = function(cubeName){
      cubeUsageData = cubeUsages[cubeName];
      if (iUnd(cubeUsageData)) {
        cubeUsageData = {
          attributes: {
            name: cubeName
          },
          measures: {
          },
          dimensions: {
          }
        };
        cubeUsages[cubeName] = cubeUsageData;
      }
      return cubeUsageData;
    };
    var sharedDimensions = {};
    model.eachCubeUsage(virtualCube, function(cubeUsage, index){
      var cubeName = cubeUsage.attributes.cubeName;
      var cubeUsageData = getCubeUsageData(cubeName);
    }, this);
    model.eachVirtualCubeMeasure(virtualCube, function(virtualCubeMeasure, index){
      var cubeName = virtualCubeMeasure.attributes.cubeName;
      var cubeUsageData = getCubeUsageData(cubeName);
      cubeUsageData.measures[virtualCubeMeasure.attributes.name] = virtualCubeMeasure;
    }, this);
    model.eachVirtualCubeDimension(virtualCube, function(virtualCubeDimension, index){
      var dimensionName = virtualCubeDimension.attributes.name;
      var cubeName = virtualCubeDimension.attributes.cubeName;
      if (cubeName) {
        var cubeUsageData = getCubeUsageData(cubeName);
        cubeUsageData.dimensions[dimensionName] = virtualCubeDimension;
      }
      else {
        sharedDimensions[dimensionName] = true;
      }
    }, this);

    var cubeUsageTreeNode, measure, measures, dimension, dimensions, children;
    for (cubeName in cubeUsages) {
      cubeUsageData = getCubeUsageData(cubeName);
      cubeUsageTreeNode = this.createCubeUsageTreeNode(cubeUsageData, parentTreeNode);
    }

    model.eachCalculatedMember(virtualCube, function(calculatedMember, index){
      this.createCalculatedMemberTreeNode(calculatedMember, parentTreeNode);
    }, this);
    callback();
  },
  createVirtualCubeTreeNode: function(virtualCube, parentTreeNode){
    return this.createModelElementTreeNode(
      virtualCube,
      parentTreeNode,
      "VirtualCube",
      this.loadVirtualCubeTreeNodeChildren
    );
  },
  createCubeUsageTreeNode: function(cubeUsageData, parentTreeNode){
    var cubeUsageTreeNode = this.createModelElementTreeNode(
      cubeUsageData,
      parentTreeNode,
      "CubeUsage",
      true
    );

    var measure, measures = cubeUsageData.measures;
    for (measure in measures){
      measure = measures[measure];
      this.createMeasureTreeNode(measure, cubeUsageTreeNode);
    }

    var dimension, dimensions = cubeUsageData.dimensions;
    for (dimension in dimensions){
      dimension = dimensions[dimension];
      this.createDimensionTreeNode(dimension, cubeUsageTreeNode);
    }
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
              case "SharedDimension":
              case "VirtualCube":
                return -1;
              default:
                return null;
            }
          case "SharedDimension":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "Cube":
                return 1;
              case "VirtualCube":
                return -1;
              default:
                return null;
            }
          case "VirtualCube":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "SharedDimension":
              case "VirtualCube":
                return 1;
              default:
                return null;
            }
        }
        return null;
        break;
      case "Cube":
        switch (thisType){
          case "Measure":
            switch (thatType){
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "CalculatedMember":
              case "PrivateDimension":
              case "DimensionUsage":
                return -1;
              default:
                return null;
            }
          case "CalculatedMember":
            switch (thatType){
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "Measure":
                return 1;
              case "PrivateDimension":
              case "DimensionUsage":
                return -1;
              default:
                return null;
            }
          case "PrivateDimension":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "Measure":
              case "CalculatedMember":
                return 1;
              case "DimensionUsage":
                return -1;
              default:
                return null;
            }
          case "DimensionUsage":
            switch (thatType){
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              case "Measure":
              case "CalculatedMember":
              case "PrivateDimension":
                return 1;
              default:
                return null;
            }
        }
        return null;
        break;
      case "SharedDimension":
      case "PrivateDimension":
        switch (thisType) {
          case "Hierarchy":
            switch (thatType) {
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              default:
                return null;
            }
          default:
            return null;
        }
      case "VirtualCube":
        return TreeNode.prototype.compare.call(this, treeNode);
      case "Hierarchy":
        switch (thisType){
          case "Level":
            switch (thatType){
              case thisType:
                return TreeNode.prototype.compare.call(this, treeNode);
              default:
                return null;
            }
          default:
            return null;
        }
        break;
    }
    return null;
  },
  createModelElementTreeNode: function (modelElement, parentTreeNode, type, childLoader){
    var me = this, name = modelElement.attributes.name || "";
    var visibility;
    if (modelElement.attributes && modelElement.attributes.visible && String(modelElement.attributes.visible) === "false") {
      visibility = "visible-false";
    }
    else {
      visibility = "visible-true";
    }
    var classes = [type, visibility];
    var conf = {
      id: parentTreeNode.id + ":" + type + ":" + name,
      classes: classes,
      parentTreeNode: parentTreeNode,
      title: name,
      tooltip: name,
      state: childLoader ? TreeNode.states.collapsed : TreeNode.states.leaf,
      sorted: true,
      compare: this.compareTreeNode
    }
    if (iFun(childLoader)) {
      conf.loadChildren = function(callback){
        childLoader.call(me, callback, this);
      };
    }
    else
    if (iArr(childLoader)) {
      conf.children = childLoader;
    }
    var treeNode = new TreeNode(conf);
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
  getTreeNodeType: function(treeNode){
    return this.parseModelElementPath(treeNode).type;
  },
  getTreeNodeIdForPath: function(path){
    var pathCopy = merge({}, path);
    var dimensionElements = {
      Hierarchy: {
        Level: null
      }
    };
    var elements = {
      Schema: {
        Cube: {
          PrivateDimension: dimensionElements,
          DimensionUsage: null,
          Measure: null,
          CalculatedMember: null
        },
        SharedDimension: dimensionElements
      }
    }
    var id = "", name, value = elements;
    outer: do {
      for (name in value) {
        if (iDef(path[name])) {
          delete pathCopy[name];
          id += ":" + name + ":" + path[name];
          break;
        }
      }
      value = value[name];
    } while (value);
    for (name in pathCopy) {
      if (name === name.toLowerCase()) {
        continue;
      }
      //if we arrive here, the argument path contains elements that are not in our tree of predefined elements.
      //that means the path reaches deeper than what we depict in our tree so we cannot generate an id for it.
      return null;
    }
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
    this.clearAll();
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