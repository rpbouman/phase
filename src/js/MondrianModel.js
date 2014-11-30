var MondrianModel;
(function(){

(MondrianModel = function(doc){
  this.setDocument(
    doc ||
    this.createElement("Schema", {
      name: ""
    })
  );
  this.datasourceInfo = {};
  this.setDirty();
}).prototype = {
  setDocument: function(doc) {
    if (iStr(doc)) {
      doc = parseXmlText(doc);
    }
    if (iEmt(doc) && doc.tagName === "Schema") {
      doc = {
        nodeType: 9,
        childNodes: [doc]
      }
    }
    if (!iDoc(doc)) {
      throw "Invalid document";
    }
    var eventData = {
      oldDoc: this.doc,
      newDoc: doc
    };
    if (this.fireEvent("setDocument", eventData)===false) {
      return false;
    }
    this.doc = doc;
    return this.fireEvent("documentSet", eventData);
  },
  isDirty: function(){
    return this.dirty;
  },
  setDirty: function(dirty, dontFireEvent){
    if (dirty !== false) {
      dirty = true;
    }
    if (this.dirty !== dirty) {
      this.dirty = dirty;
      if (dontFireEvent !== true) {
        this.fireEvent("modelDirty", {
          modelElementPath: {
            Schema: this.getSchemaName(),
            type: "Schema"
          },
          dirty: dirty
        });
      }
    }
  },
  fireEvent: function(event, eventData){
    switch (event) {
      case "modelElementAttributeSet":
      case "modelElementCreated":
      case "modelElementMoved":
      case "modelElementRemoved":
      case "modelElementRepositioned":
        this.setDirty(true);
    }
    return Observable.prototype.fireEvent.call(this, event, eventData);
  },
  setNotDirty: function(){
    this.setDirty(false);
  },
  toXml: function(){
    return serializeToXml(this.doc);
  },
  fromXml: function(xml){
    this.setDocument(xml);
  },
  getNewModelElementName: function(modelElementPath, name){
    var type = modelElementPath.type;
    var newName;
    switch (type) {
      case "Cube":
        newName = this.newCubeName(name);
        break;
      case "VirtualCube":
        newName = this.newVirtualCubeName(name);
        break;
      case "Measure":
        newName = this.newMeasureName(
          modelElementPath.Cube,
          name
        );
        break;
      case "CalculatedMember":
        newName = this.newCalculatedMemberName(
          modelElementPath.Cube,
          name
        );
        break;
      case "PrivateDimension":
        newName = this.newPrivateDimensionName(
          modelElementPath.Cube,
          name
        );
        break;
      case "PrivateDimensionHierarchy":
        newName = this.newPrivateDimensionHierarchyName(
          modelElementPath.Cube,
          modelElementPath.PrivateDimension,
          name
        );
        break;
      case "DimensionUsage":
        newName = this.newDimensionUsageName(
          modelElementPath.Cube,
          name
        );
        break;
      case "SharedDimension":
        newName = this.newSharedDimensionName(name);
        break;
      case "Hierarchy":
        if (modelElementPath.SharedDimension) {
          newName = this.newSharedDimensionHierarchyName(
            modelElementPath.SharedDimension,
            name
          );
        }
        else {
          newName = this.newPrivateDimensionHierarchyName(
            modelElementPath.Cube,
            modelElementPath.PrivateDimension,
            name
          );
        }
        break;
      case "Level":
        if (modelElementPath.SharedDimension) {
          newName = this.newSharedDimensionLevelName(
            modelElementPath.SharedDimension,
            modelElementPath.Hierarchy,
            name
          );
        }
        else {
          newName = this.newPrivateDimensionLevelName(
            modelElementPath.Cube,
            modelElementPath.PrivateDimension,
            modelElementPath.Hierarchy,
            name
          );
        }
        break;
      default:
        throw "Invalid type " + type;
    }
    return newName;
  },
  clone: function(){
    var xml = this.toXml();
    var model = new MondrianModel(xml);
    var srcDatasourceInfo = this.datasourceInfo,
        tgtDatasourceInfo = model.datasourceInfo
    ;
    for (prop in srcDatasourceInfo) {
      tgtDatasourceInfo[prop] = srcDatasourceInfo[prop];
    }
    return model;
  },
  cloneModelElement: function(modelElementPath, dontFireEvent){
    var modelElement = this.getModelElement(modelElementPath);
    if (!modelElement) {
      throw "No such element";
    }
    var xml = serializeToXml(modelElement);
    var newModelElement = parseXmlText(xml).childNodes[0];

    var type = modelElementPath.type;
    var newName = this.getNewModelElementName(
      modelElementPath,
      modelElement.attributes.name || type
    );
    newModelElement.attributes.name = newName;

    var modelElementParent = this.getModelElementParent(modelElementPath);
    var index = -1;
    this.eachElementWithTag(modelElementParent, modelElement.tagName, function(node, i){
      index = i;
      if (node.attributes.name > newName) {
        return false;
      }
      return true;
    });
    if (index === -1){
      throw "Unexpected error cloning element";
    }
    modelElementParent.childNodes.splice(index, 0, newModelElement);

    if (dontFireEvent !== true){
      var newModelElementPath = merge({}, modelElementPath);
      newModelElementPath[newModelElementPath.type] = newName;
      this.fireEvent("modelElementCreated", {
        modelElementPath: newModelElementPath,
        modelElement: newModelElement
      });
    }
    return newModelElement;
  },
  createElement: function(tagName, standardAttributes, extraAttributes){
    return {
      nodeType: 1,
      tagName: tagName,
      attributes: merge(extraAttributes || {}, standardAttributes || {}),
      childNodes: []
    }
  },
  setAttributeValue: function(modelElementPath, attribute, value){
    var modelElement = this.getModelElement(modelElementPath);
    if (!modelElement) {
      throw "No such modelelement";
    }
    var oldValue = modelElement.attributes[attribute];
    if (oldValue === value || oldValue === "" && iUnd(value)) {
      return true;
    }
    var eventData = {
      modelElementPath: modelElementPath,
      modelElement: modelElement,
      attribute: attribute,
      newValue: value,
      oldValue: oldValue
    };

    if (this.fireEvent("setModelElementAttribute", eventData) === false) {
      return false;
    }

    if (
      attribute === "name" &&
      this.fireEvent("renameModelElement", eventData) === false
    ) {
      return false;
    }

    if (iUnd(value)) {
      delete modelElement.attributes[attribute];
    }
    else {
      modelElement.attributes[attribute] = value;
    }

    if (attribute === "name") {
      this.fireEvent("modelElementRenamed", eventData);
    }

    this.fireEvent("modelElementAttributeSet", eventData);

    return true;
  },
  getAttributeValue: function(modelElementPath, attribute){
    var modelElement = this.getModelElement(modelElementPath);
    return modelElement.attributes[attribute];
  },
  addChildNode: function(parent, index, child) {
    var childNodes = parent.childNodes;
    if (!childNodes){
      childNodes = parent.childNodes = [];
    }
    childNodes.splice(index, 0, child);
    this.setDirty();
  },
  newCubeName: function(){
    return this.newName([this.getCube, this.getVirtualCube], [], "new Cube");
  },
  createCube: function(attributes, dontFireEvent){
    var type = "Cube";
    var name = this.newCubeName();
    var cube = this.createElement(type, {
      name: name
    }, attributes);

    var schema = this.getSchema();

    //get the index and insert new node
    var index = this.getIndexOfLastElementWithTagName(
      schema,
      "Annotations",
      "Dimension",
      "Cube"
    );
    index = index + 1;
    this.addChildNode(schema, index, cube);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          Cube: name,
          type: type,
          index: index
        },
        modelElement: cube
      };
      this.fireEvent("modelElementCreated", eventData);

    }
    return cube;
  },
  createCubeTable: function(cubeName, attributes, dontFireEvent){
    var table = this.createElement("Table", attributes);
    var cube = this.getCube(cubeName);

    var index = this.getIndexOfLastElementWithTagName(
      cube,
      "Annotations"
    );
    index = index + 1;
    this.addChildNode(cube, index, table);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: this.getSchemaName(),
          Cube: cubeName,
          Table: attributes.name,
          type: "Table",
          index: index
        },
        modelElement: table
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return table;
  },
  setHierarchyTable: function(hierarchyModelElementPath, table, dontFireEvent){
    var hierarchy = this.getHierarchy(hierarchyModelElementPath);
    var index = this.getIndexOfLastElementWithTagName(
      hierarchy,
      "Annotations"
    );
    index = index + 1;
    var childNodes = hierarchy.childNodes, oldRelation;

    //see if there is an existing relation
    var relationIndex = this.getRelationIndex(hierarchy);
    if (relationIndex !== -1) {
      //yes, existing. save it and remove it.
      oldRelation = hierarchy.childNodes[relationIndex];
      childNodes.splice(index, 1);
    }
    else //no existing relation
    if (!table) { //no ne relation
      return; //bail out.
    }
    //store the new relation
    if (table) {
      childNodes.splice(index, 0, table);
    }
    if (dontFireEvent !== true) {
      var eventType;
      var modelElementPath = merge({}, hierarchyModelElementPath);
      if (table) {
        eventType = "modelElementCreated";
        modelElementPath.type = table.tagName;
        modelElementPath[modelElementPath.type] = table.attributes.name || "";
      }
      else
      if (oldRelation) {
        eventType = "modelElementRemoved";
        modelElementPath.type = oldRelation.tagName;
        modelElementPath[modelElementPath.type] = oldRelation.attributes.name || "";
      }
      var eventData = {
        modelElementPath: modelElementPath,
        modelElement: table || oldRelation
      };
      this.fireEvent("modelElementCreated", eventData);
    }
  },
  setHierarchyPrimaryKey: function(hierarchyPath, table, column){
    var hierarchy = this.getHierarchy(hierarchyPath);
    this.setAttributeValue(hierarchyPath, "primaryKeyTable", table || undefined);
    this.setAttributeValue(hierarchyPath, "primaryKey", column || undefined);
  },
  createHierarchyTable: function(hierarchyModelElementPath, attributes, dontFireEvent){
    var table = this.createElement("Table", attributes);

    var hierarchy = this.getHierarchy(hierarchyModelElementPath);
    var index = this.getIndexOfLastElementWithTagName(
      hierarchy,
      "Annotations"
    );
    index = index + 1;

    var relationIndex = this.getRelationIndex(hierarchy);
    var join;
    if (relationIndex === -1) {
      hierarchy.childNodes.splice(index, 0, table);
    }
    else {
      if (relationIndex !== index) {
        throw "unexpected index";
      }
      var relation = hierarchy.childNodes[relationIndex];
      join = this.createElement("Join", {});
      join.childNodes.push(relation);
      join.childNodes.push(table);

      hierarchy.childNodes[relationIndex] = join;
    }

    if (dontFireEvent !== true) {
      var modelElementPath = merge({}, hierarchyModelElementPath);
      modelElementPath.type = "Table";
      if (join) {
        modelElementPath.Join = "";
      }
      modelElementPath.Table = table.attributes.name;
      var eventData = {
        modelElementPath: modelElementPath,
        modelElement: table
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return table;
  },
  changeSharedDimensionName: function(oldName, newName){
    var sharedDimension = this.getSharedDimension(oldName);
    if (!sharedDimension) {
      throw "No such dimension " + oldName;
    }
    this.eachCube(function(cube, index){
      this.eachDimensionUsage(cube, function(dimensionUsage, index){
        dimensionUsage.attributes.source = newName;
      }, this, function(dimensionUsage, index){
        return dimensionUsage.attributes.source === oldName;
      });
    }, this);
  },
  newSharedDimensionName: function(name){
    return this.newName(this.getSharedDimension, [], name || "new Dimension");
  },
  createSharedDimension: function(attributes, dontFireEvent){
    var name = this.newSharedDimensionName();
    var dimension = this.createElement("Dimension", {
      name: name,
      type: "StandardDimension"
    }, attributes);

    var schema = this.getSchema();

    //get the index and insert new node
    var index = this.getIndexOfLastElementWithTagName(
      schema,
      "Annotations",
      "Dimension"
    );
    index = index + 1;
    this.addChildNode(schema, index, dimension);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          SharedDimension: name,
          type: "SharedDimension",
          index: index
        },
        modelElement: dimension
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return dimension;
  },
  newMeasureName: function(cube, name){
    return this.newName(this.getMeasure, [cube], name || "new Measure");
  },
  createMeasure: function(cubeName, attributes, annotations, dontFireEvent){
    var schema = this.getSchema();
    var cube = this.getCube(cubeName);
    var type = "Measure";
    var name = this.newMeasureName(cube, attributes && attributes.name ? attributes.name : null);
    if (attributes && attributes.name) {
      delete attributes.name;
    }
    var measure = this.createElement(type, {
      name: name,
      aggregator: "sum"
    }, attributes);
    if (annotations) {
      var key, value;
      for (key in annotations) {
        value = annotations[key];
        this.setAnnotationValue(measure, key, value, true)
      }
    }

    //get the index and insert new node
    var index = this.getIndexOfLastElementWithTagName(
      cube,
      "Annotations",
      "Table",
      "Dimension",
      "DimensionUsage",
      "Measure"
    );
    index = index + 1;
    this.addChildNode(cube, index, measure);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          Cube: cubeName,
          Measure: name,
          type: type,
          index: index
        },
        modelElement: measure
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return measure;
  },
  newCalculatedMemberName: function(cube, name){
    return this.newName(this.getCalculatedMember, [cube], name || "new CalculatedMember");
  },
  createCalculatedMember: function(cubeName, attributes, dontFireEvent){
    var schema = this.getSchema();
    var cube = this.getCube(cubeName);
    var type = "CalculatedMember";
    var name = this.newCalculatedMemberName(cube);
    var calculatedMember = this.createElement(type, {
      name: name,
    }, attributes);

    var index = this.getIndexOfLastElementWithTagName(
      cube,
      "Annotations",
      "Table",
      "Dimension",
      "DimensionUsage",
      "Measure",
      "CalculatedMember"
    );
    index = index + 1;
    this.addChildNode(cube, index, calculatedMember);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          Cube: cubeName,
          CalculatedMember: name,
          type: type,
          index: index
        },
        modelElement: calculatedMember
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return calculatedMember;
  },
  newPrivateDimensionName: function(cube, name){
    return this.newName([this.getPrivateDimension, this.getDimensionUsage], [cube], name || "new Dimension");
  },
  createPrivateDimension: function(cubeName, attributes, dontFireEvent){
    var schema = this.getSchema();
    var cube = this.getCube(cubeName);
    var type = "PrivateDimension";
    var name = this.newPrivateDimensionName(cube);
    var dimension = this.createElement("Dimension", {
      name: name,
      type: "StandardDimension"
    }, attributes);

    var index = this.getIndexOfLastElementWithTagName(
      cube,
      "Annotations",
      "Table",
      "Dimension"
    );
    index = index + 1;
    this.addChildNode(cube, index, dimension);

    if (dontFireEvent !== true) {
      var eventData = {
          modelElementPath: {
          Schema: schema.attributes.name,
          Cube: cubeName,
          PrivateDimension: name,
          type: type,
          index: index
        },
        modelElement: dimension
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return dimension;
  },
  newDimensionUsageName: function(cube, name){
    return this.newName([this.getPrivateDimension, this.getDimensionUsage], [cube], name || "new Dimension");
  },
  createDimensionUsage: function(cubeName, attributes, dontFireEvent){
    var schema = this.getSchema();
    var cube = this.getCube(cubeName);
    var type = "DimensionUsage";
    var name = this.newDimensionUsageName(cube);
    var dimensionUsage = this.createElement("DimensionUsage", {
      name: name
    }, attributes);

    //get the index of the last shared dimension.
    var index = this.getIndexOfLastElementWithTagName(
      cube,
      "Annotations",
      "Table",
      "Dimension",
      "DimensionUsage"
    );
    index = index + 1;

    this.addChildNode(cube, index, dimensionUsage);
    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          Cube: cubeName,
          DimensionUsage: name,
          type: type,
          index: index
        },
        modelElement: dimensionUsage
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return dimensionUsage;
  },
  newSharedDimensionHierarchyName: function(sharedDimension, name){
    if (iUnd(name)) {
      name = "";
      unnamedHierarchy = this.getSharedDimensionHierarchy(sharedDimension, name);
      if (unnamedHierarchy) {
        name = this.newName(this.getSharedDimensionHierarchy, [sharedDimension], "new Hierarchy");
      }
    }
    else {
      name = this.newName(this.getSharedDimensionHierarchy, [sharedDimension], name);
    }
    return name;
  },
  createSharedDimensionHierarchy: function(dimensionName, attributes, dontFireEvent) {
    var schema = this.getSchema();
    var dimension = this.getSharedDimension(dimensionName);
    var type = "Hierarchy";
    var name = this.newSharedDimensionHierarchyName(dimension);
    var hierarchy = this.createElement("Hierarchy", {
      name: name,
      hasAll: true
    }, attributes);

    var index = this.getIndexOfLastElementWithTagName(
      dimension,
      "Annotations",
      "Hierarchy"
    );
    index = index + 1;

    this.addChildNode(dimension, index, hierarchy);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          SharedDimension: dimensionName,
          Hierarchy: name,
          type: type,
          index: index
        },
        modelElement: hierarchy
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return hierarchy;
  },
  newPrivateDimensionHierarchyName: function(cube, privateDimension, name){
    if (iUnd(name)) {
      name = "";
      var unnamedHierarchy = this.getPrivateDimensionHierarchy(cube, privateDimension, name);
      if (unnamedHierarchy) {
        name = this.newName(this.getPrivateDimensionHierarchy, [cube, privateDimension], "new Hierarchy");
      }
    }
    else {
      name = this.newName(this.getPrivateDimensionHierarchy, [cube, privateDimension], name);
    }
    return name;
  },
  createPrivateDimensionHierarchy: function(cubeName, dimensionName, attributes, dontFireEvent) {
    var schema = this.getSchema();
    var cube = this.getCube(cubeName);
    var dimension = this.getPrivateDimension(cube, dimensionName);
    var type = "Hierarchy";
    var name = this.newPrivateDimensionHierarchyName(cube, dimension);
    var hierarchy = this.createElement("Hierarchy", {
      name: name,
      hasAll: true
    }, attributes);

    var index = this.getIndexOfLastElementWithTagName(
      dimension,
      "Annotations",
      "Hierarchy"
    );
    index = index + 1;

    this.addChildNode(dimension, index, hierarchy);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          Cube: cubeName,
          PrivateDimension: dimensionName,
          Hierarchy: name,
          type: type,
          index: index
        },
        modelElement: hierarchy
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return hierarchy;
  },
  newSharedDimensionLevelName: function(dimensionName, hierarchyName, name){
    return this.newName(this.getSharedDimensionLevel, [dimensionName, hierarchyName], name || "new Level");
  },
  getLevelCount: function(hierarchy) {
    var count = this.getCountOfElementsWithTagName(hierarchy, "Level");
    return count;
  },
  createLevel: function(hierarchy, attributes){
    var levelCount = this.getLevelCount(hierarchy);
    var level = this.createElement("Level", attributes);
    var index = this.getIndexOfLastElementWithTagName(
      hierarchy,
      "Annotations",
      "Table",
      "Join",
      "Level"
    );
    index = index + 1;
    this.addChildNode(hierarchy, index, level);
    return level;
  },
  createSharedDimensionLevel: function(dimensionName, hierarchyName, attributes, dontFireEvent){
    var schema = this.getSchema();
    var hierarchy = this.getSharedDimensionHierarchy(dimensionName, hierarchyName);

    if (!attributes) {
      attributes = {};
    }
    if (!attributes.name) {
      attributes.name = this.newSharedDimensionLevelName(dimensionName, hierarchyName);
    }
    var level = this.createLevel(hierarchy, attributes);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          SharedDimension: dimensionName,
          Hierarchy: hierarchyName,
          Level: attributes.name,
          type: "Level"
        },
        modelElement: level
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return level;
  },
  newPrivateDimensionLevelName: function(cubeName, dimensionName, hierarchyName, name){
    return this.newName(this.getPrivateDimensionLevel, [cubeName, dimensionName, hierarchyName], name || "new Level");
  },
  createPrivateDimensionLevel: function(cubeName, dimensionName, hierarchyName, attributes, dontFireEvent){
    var schema = this.getSchema();
    var hierarchy = this.getPrivateDimensionHierarchy(cubeName, dimensionName, hierarchyName);
    var cube = this.getCube(cubeName);

    if (!attributes) {
      attributes = {};
    }
    if (!attributes.name) {
      attributes.name = this.newPrivateDimensionLevelName(cubeName, dimensionName, hierarchyName);
    }
    var level = this.createLevel(hierarchy, attributes);

    if (dontFireEvent !== true) {
      var eventData = {
        modelElementPath: {
          Schema: schema.attributes.name,
          Cube: cubeName,
          PrivateDimension: dimensionName,
          Hierarchy: hierarchyName,
          Level: attributes.name,
          type: "Level"
        },
        modelElement: level
      };
      this.fireEvent("modelElementCreated", eventData);
    }
    return level;
  },
  newName: function(getters, args, name, num){
    if (!num) {
      num = "1";
    }
    args.push(name + num);
    if (!iArr(getters)){
      getters = [getters];
    }
    var i, n = getters.length, getter;
    for (i = 0; i < n; i++) {
      getter = getters[i];
      if (getter.apply(this, args)) {
        args.pop();
        return this.newName(getters, args, name, ++num);
      }
    }
    return args.pop();
  },
  getAnnotations: function(element){
    var annotations = null;
    this.eachElementWithTag(element, "Annotations", function(node, index){
      annotations = node;
      return false;
    });
    return annotations;
  },
  removeAnnotations: function(element) {
    var index = -1
    this.eachElementWithTag(element, "Annotations", function(node, i){
      index = i;
      return false;
    });
    if (index === -1) {
      return;
    }
    element.childNodes.splice(index, 1);
  },
  removeAnnotation: function(modelElement, index) {
    var annotations = this.getAnnotations(modelElement);
    var childNodes = annotations.childNodes;
    var ret = childNodes.splice(index, 1);
    if (childNodes.length === 0){
      this.removeAnnotations(modelElement);
    }
    return ret;
  },
  removeAnnotationsWithPrefix: function(element, prefix){
    if (!iEmt(element)) {
      element = this.getModelElement(element);
    }
    if (!iEmt(element)) {
      throw "Invalid element";
    }
    var indexes = [];
    this.eachAnnotation(element, function(annotation, i){
      indexes.push(i);
    }, this, function(annotation, i){
      return
        annotation.attributes &&
        annotation.attributes.name &&
        annotation.attributes.name.indexOf(prefix) === 0
      ;
    });
    var i, n = indexes.length;
    for (i = n - 1; i >= 0; i--) {
      this.removeAnnotation(element, i);
    }
  },
  getElementText: function(element){
    if (!element.childNodes) {
      return null;
    }
    if (element.childNodes.length > 1) {
      throw "Multiple children";
    }
    var childNode = element.childNodes[0];
    if (childNode.nodeType !== 3) {
      throw "Not a textnode";
    }
    return childNode.data;
  },
  setElementTextContent: function(element, text){
    element.childNodes = [{
      nodeType: 3,
      data: text
    }];
  },
  setAnnotationValue: function(element, name, value, appendOrOverwrite){
    var annotations = this.getAnnotations(element);
    if (!annotations) {
      annotations = this.createElement("Annotations");
      if (!element.childNodes) {
        element.childNodes = [];
      }
      element.childNodes.splice(0, 0, annotations);
    }
    var annotation;
    if (appendOrOverwrite) {  //overwrite
      this.eachAnnotation(element, function(el, index){
        annotation = el;
      }, this, function(annotation, index){
        return annotation.attributes.name === name;
      });
    }
    if (!annotation) {
      annotation = this.createElement("Annotation", {
        name: name
      });
      annotations.childNodes.push(annotation);
    }
    this.setElementTextContent(annotation, value);
  },
  getAnnotationValue: function(element, name){
    var annotation = null;
    this.eachAnnotation(element, function(node, i){
      annotation = node;
    }, this, function(node, i){
      return node.attributes.name === name;
    });
    if (!annotation) {
      return null;
    }
    return this.getElementText(annotation);
  },
  eachAnnotation: function(element, callback, scope, filter){
    var annotations = this.getAnnotations(element);
    if (!annotations) {
      return;
    }
    return this.eachElementWithTag(annotations, "Annotation", callback, scope, filter);
  },
  eachLevel: function(hierarchy, callback, scope, filter){
    if (!(hierarchy.nodeType === 1 && hierarchy.tagName === "Hierarchy")) {
      hierarchy = this.getHierarchy(hierarchy);
    }
    return this.eachElementWithTag(hierarchy, "Level", callback, scope, filter);
  },
  eachChild: function(node, callback, scope, filter){
    var childNodes = node.childNodes;
    if (childNodes) {
      var n = childNodes.length, i, child
      for (i = 0; i < n; i++) {
        child = childNodes[i];
        if (
          iFun(filter) &&
          (filter.call(scope || null, child, i) === false)
        ) continue;
        if (callback.call(scope || null, child, i) === false) return false;
      }
    }
    return true;
  },
  eachElementWithTag: function(node, tagName, callback, scope, filter){
    var tagNames;
    if (iStr(tagName)) {
      tagName = tagName.split(",");
    }
    if (iArr(tagName)){
      var i = 0, n = tagName.length;
      tagNames = {};
      for (i = 0; i < n; i++){
        tagNames[tagName[i]] = true;
      }
    }
    else
    if (iObj(tagName)) {
      tagNames = tagName;
    }
    return this.eachChild(node, function(node, index){
      return callback.call(scope || null, node, index);
    }, null, function(node, index){
      if (node.nodeType !== 1) return false;
      if (!tagNames[node.tagName]) return false;
      if (iFun(filter) && filter(node, index) === false) return false;
      return true;
    });
  },
  getTagNamesFromArguments: function(){
    var tagNames = [];
    var i, n = arguments.length, argument;
    for (i = 1; i < n; i++){
      argument = arguments[i];
      if (iStr(argument)){
        tagNames = tagNames.concat(argument.split(","));
      }
      else
      if (iArr(argument)){
        tagNames = tagNames.concat(argument);
      }
      else
      if (iObj(argument)){
        var p;
        for (p in argument) {
          tagNames.push(p);
        }
      }
    }
    return tagNames;
  },
  getCountOfElementsWithTagName: function(element){
    var tagNames = this.getTagNamesFromArguments.apply(this, arguments);
    var count = 0;
    this.eachElementWithTag(element, tagNames, function(child, i){
      count++;
    });
    return count;
  },
  getIndexOfModelElement: function(modelElementPath){
    var parentElement = this.getModelElementParent(modelElementPath);
    var modelElement = this.getModelElement(modelElementPath);
    var index = -1;
    this.eachChild(parentElement, function(node, i){
      index = i;
      return false;
    }, this, function(node, i){
      return node === modelElement;
    });
    return index;
  },
  getIndexOfLastElementWithTagName: function(element) {
    var tagNames = this.getTagNamesFromArguments.apply(this, arguments);
    var index = -1;
    this.eachElementWithTag(element, tagNames, function(child, i){
      index = i;
    });
    return index;
  },
  getSchema: function(){
    var schemaNode = null;
    this.eachElementWithTag(this.doc, "Schema", function(node, index){
      schemaNode = node;
      return false;
    })
    return schemaNode;
  },
  setSchemaName: function(name){
    return this.setAttributeValue({
      Schema: this.getSchemaName(),
      type: "Schema"
    }, "name", name);
  },
  getSchemaName: function(){
    var schemaNode = this.getSchema();
    return schemaNode.attributes["name"];
  },
  getDataSourceInfo: function(){
    return this.datasourceInfo;
  },
  getDataSourceName: function(){
    var datasourceInfo = this.getDataSourceInfo();
    if (!datasourceInfo) {
      return null;
    }

    var datasource = datasourceInfo.DataSource;
    if (!datasource) {
      return null;
    }

    return datasource;
  },
  getXmlaEnabled: function(){
    var datasourceInfo = this.getDataSourceInfo();
    if (!datasourceInfo) {
      return null;
    }

    var enableXmla = datasourceInfo.EnableXmla;
    if (!enableXmla) {
      return null;
    }
    if (enableXmla === "true" || enableXmla === true) {
      return true;
    }
    return false;
  },
  setDataSourceInfo: function(datasourceInfo){
    this.datasourceInfo = datasourceInfo;
  },
  setName: function(name) {
    this.name = name;
  },
  getName: function() {
    return this.name || null;
  },
  eachCube: function(callback, scope, filter){
    var schemaNode = this.getSchema();
    return this.eachElementWithTag(schemaNode, "Cube", callback, scope, filter);
  },
  eachVirtualCube: function(callback, scope, filter){
    var schemaNode = this.getSchema();
    return this.eachElementWithTag(schemaNode, "VirtualCube", callback, scope, filter);
  },
  eachCubeUsage: function(virtualCube, callback, scope, filter){
    if (iStr(virtualCube)) {
      virtualCube = this.getVirtualCube(virtualCube);
    }
    if (!iEmt(virtualCube)) {
      throw "No such virtual cube.";
    }
    return this.eachElementWithTag(virtualCube, "CubeUsage", callback, scope, filter);
  },
  eachVirtualCubeMeasure: function(virtualCube, callback, scope, filter){
    if (iStr(virtualCube)) {
      virtualCube = this.getVirtualCube(virtualCube);
    }
    if (!iEmt(virtualCube)) {
      throw "No such virtual cube.";
    }
    return this.eachElementWithTag(virtualCube, "VirtualCubeMeasure", callback, scope, filter);
  },
  eachVirtualCubeDimension: function(virtualCube, callback, scope, filter){
    if (iStr(virtualCube)) {
      virtualCube = this.getVirtualCube(virtualCube);
    }
    if (!iEmt(virtualCube)) {
      throw "No such virtual cube.";
    }
    return this.eachElementWithTag(virtualCube, "VirtualCubeDimension", callback, scope, filter);
  },
  eachParameter: function(callback, scope, filter){
    var schemaNode = this.getSchema();
    return this.eachElementWithTag(schemaNode, "Parameter", callback, scope, filter);
  },
  getCube: function(cubeName){
    var cubeNode = null;
    this.eachCube(function(cube, index){
      cubeNode = cube;
      return false;
    }, this, function(cube, index){
      return cube.attributes.name === cubeName;
    })
    return cubeNode;
  },
  getVirtualCube: function(virtualCubeName){
    var virtualCubeNode = null;
    this.eachVirtualCube(function(virtualCube, index){
      virtualCubeNode = virtualCube;
      return false;
    }, this, function(virtualCube, index){
      return virtualCube.attributes.name === virtualCubeName;
    })
    return virtualCubeNode;
  },
  getCubeTable: function(cube){
    var table = null;
    this.eachElementWithTag(cube, "Table", function(element, index){
      table = element;
      return false;
    }, this);
    return table;
  },
  eachMeasure: function(cube, callback, scope, filter){
    if (iStr(cube)) {
      cube = this.getCube(cube);
    }
    if (!iEmt(cube)) {
      throw "Invalid cube";
    }
    var ret = this.eachElementWithTag(cube, "Measure", callback, scope, filter);
    return ret;
  },
  getMeasure: function(cube, measureName){
    var measureNode = null;
    this.eachMeasure(cube, function(measure, index){
      measureNode = measure;
    }, this, function(measure, index){
      return measure.attributes.name === measureName;
    });
    return measureNode;
  },
  eachCubeCalculatedMember: function(cube, callback, scope, filter){
    if (iStr(cube)) {
      cube = this.getCube(cube);
    }
    if (!iEmt(cube)) {
      throw "Invalid cube";
    }
    return this.eachElementWithTag(cube, "CalculatedMember", callback, scope, filter);
  },
  getCalculatedMember: function(cube, calculatedMemberName){
    var calculatedMemberNode = null;
    this.eachCubeCalculatedMember(cube, function(calculatedMember, index){
      calculatedMemberNode = calculatedMember;
    }, this, function(calculatedMember, index){
      return calculatedMember.attributes.name === calculatedMemberName;
    });
    return calculatedMemberNode;
  },
  eachSharedDimension: function(callback, scope, filter){
    var schemaNode = this.getSchema();
    return this.eachElementWithTag(schemaNode, "Dimension", callback, scope, filter);
  },
  getSharedDimension: function(dimensionName){
    var dimensionNode = null;
    this.eachSharedDimension(function(dimension, index){
      dimensionNode = dimension;
    }, this, function(dimension, index){
      return dimension.attributes.name === dimensionName;
    })
    return dimensionNode;
  },
  eachCubeCalculatedMember: function(cube, callback, scope, filter){
    if (iStr(cube)) {
      cube = this.getCube(cube);
    }
    if (!iEmt(cube)) {
      throw "Invalid cube";
    }
    return this.eachElementWithTag(cube, "CalculatedMember", callback, scope, filter);
  },
  getCubeCalculatedMember: function(cube, calculatedMemberName){
    var calculatedMemberNode = null;
    this.eachCubeCalculatedMember(cube, function(calculatedMember, index){
      calculatedMemberNode = calculatedMember;
    }, this, function(calculatedMember, index){
      return calculatedMember.attributes.name === calculatedMemberName;
    });
    return calculatedMemberNode;
  },
  eachPrivateDimension: function(cube, callback, scope, filter){
    if (iStr(cube)) {
      cube = this.getCube(cube);
    }
    if (!iEmt(cube)) {
      throw "Invalid cube";
    }
    return this.eachElementWithTag(cube, "Dimension", callback, scope, filter);
  },
  getPrivateDimension: function(cube, dimensionName){
    var dimensionNode = null;
    this.eachPrivateDimension(cube, function(dimension, index){
      dimensionNode = dimension;
    }, this, function(dimension, index){
      return dimension.attributes.name === dimensionName;
    });
    return dimensionNode;
  },
  eachDimensionUsage: function(cube, callback, scope, filter){
    if (iStr(cube)) {
      cube = this.getCube(cube);
    }
    if (!iEmt(cube)) {
      throw "Invalid cube";
    }
    return this.eachElementWithTag(cube, "DimensionUsage", callback, scope, filter);
  },
  getDimensionUsage: function(cube, dimensionName){
    var dimensionNode = null;
    this.eachDimensionUsage(cube, function(dimension, index){
      dimensionNode = dimension;
    }, this, function(dimension, index){
      return dimension.attributes.name === dimensionName;
    });
    return dimensionNode;
  },
  eachDimensionHierarchy: function(dimension, callback, scope, filter){
    if (iStr(dimension)) {
      dimension = this.getSharedDimension(dimension);
    }
    if (!iEmt(dimension)) {
      throw "Invalid dimension";
    }
    var ret = this.eachElementWithTag(
      dimension, "Hierarchy",
      callback, scope, filter
    );
    return ret;
  },
  getSharedDimensionHierarchy: function(dimensionName, hierarchyName){
    var hierarchyNode = null;
    this.eachDimensionHierarchy(dimensionName, function(hierarchy, index){
      hierarchyNode = hierarchy;
    }, this,
      function(hierarchy, index){
        var name = hierarchy.attributes.name;
        return (
          ((iUnd(hierarchyName) || hierarchyName === "") && (iUnd(name) || name === "")) ||
          (hierarchyName === name)
        );
      }
    );
    return hierarchyNode;
  },
  getPrivateDimensionHierarchy: function(cube, dimension, hierarchy){
    if (iStr(dimension)) {
      if (iStr(cube)) {
        cube = this.getCube(cube);
      }
      if (!iEmt(cube)) {
        throw "Now such cube";
      }
      dimension = this.getPrivateDimension(cube, dimension);
    }
    if (!iEmt(dimension)) {
      throw "Now such dimension";
    }
    return this.getSharedDimensionHierarchy(dimension, hierarchy);
  },
  eachHierarchyLevel: function(hierarchy, callback, scope, filter) {
    //TODO: accept string argument for hiearchy.
    if (!iEmt(hierarchy)) {
      throw "Invalid hierarchy";
    }
    return this.eachElementWithTag(hierarchy, "Level", callback, scope, filter);
  },
  getPrivateDimensionLevel: function(cubeName, dimensionName, hierarchyName, levelName){
    var hierarchy = this.getPrivateDimensionHierarchy(cubeName, dimensionName, hierarchyName);
    var l;
    this.eachHierarchyLevel(hierarchy, function(level, index){
      l = level;
      return false;
    }, this, function(level, index){
      return level.attributes.name === levelName;
    });
    return l;
  },
  getSharedDimensionLevel: function(dimensionName, hierarchyName, levelName){
    var hierarchy = this.getSharedDimensionHierarchy(dimensionName, hierarchyName);
    var l;
    this.eachHierarchyLevel(hierarchy, function(level, index){
      l = level;
      return false;
    }, this, function(level, index){
      return level.attributes.name === levelName;
    });
    return l;
  },
  eachDimensionUsage: function(cube, callback, scope, filter){
    if (iStr(cube)) {
      cube = this.getCube(cube);
    }
    if (!iEmt(cube)) {
      throw "Invalid cube";
    }
    return this.eachElementWithTag(cube, "DimensionUsage", callback, scope, filter);
  },
  removeModelElement: function(modelElementPath){
    var me = this;
    var modelElements = this.getModelElementsForPath(modelElementPath);
    var modelElementToDelete = modelElements.pop();
    var parentModelElement = modelElements.pop();
    var eventData = {
      modelElementPath: modelElementPath,
      modelElement: modelElementToDelete,
      parentElement: parentModelElement
    };
    if (me.fireEvent("removingModelElement", eventData) === false) {
      return false;
    }
    var index = -1;
    //TODO: this is unsafe - we're reading and deleting from the same array.
    this.eachChild(parentModelElement, function(child, i){
      parentModelElement.childNodes.splice(i, 1);
      me.fireEvent("modelElementRemoved", eventData);
      return false;
    }, this, function(child, i){
      return child === modelElementToDelete;
    });
    return modelElementToDelete;
  },
  moveModelElement: function(fromModelElementPath, toModelElementPath, toIndex){
  },
  repositionModelElement: function(fromModelElementPath, toModelElementPath, dontFireEvent){
    var schema = fromModelElementPath.Schema;
    if (this.getSchemaName() !== schema) {
      throw "From element is not from this model";
    }
    if (toModelElementPath.Schema !== schema) {
      throw "To element is not from this model";
    }
    var modelElement = this.getModelElement(fromModelElementPath);
    if (!modelElement) {
      throw "Invalid model element path";
    }
    var fromModelElementParent = this.getModelElementParent(fromModelElementPath);
    var toModelElementParent = this.getModelElementParent(toModelElementPath);
    if (fromModelElementParent !== toModelElementParent) {
      throw "Paths do not have the same parent";
    }
    var oldIndex;
    this.eachChild(fromModelElementParent, function(node, i){
      oldIndex = i;
    }, this, function(node, i){
      return node === modelElement;
    });

    var toModelElement = this.getModelElement(toModelElementPath);
    if (!toModelElement) {
      throw "Invalid model element path";
    }
    fromModelElementParent.childNodes.splice(oldIndex, 1);

    var newIndex;
    this.eachChild(fromModelElementParent, function(node, i){
      newIndex = i;
    }, this, function(node, i){
      return node === toModelElement;
    });
    newIndex = newIndex + 1;
    fromModelElementParent.childNodes.splice(newIndex, 0, modelElement);

    if (dontFireEvent !== true) {
      this.fireEvent("modelElementRepositioned", {
        modelElement: modelElement,
        modelElementPath: fromModelElementPath,
        afterModelElementPath: toModelElementPath,
        oldIndex: oldIndex,
        newIndex: newIndex
      });
    }
    return modelElement;
  },
  getModelElement: function(modelElementPath){
    var data;
    switch (modelElementPath.type) {
      case "Schema":
        data = this.getSchema();
        break;
      case "Cube":
        data = this.getCube(modelElementPath.Cube);
        break;
      case "SharedDimension":
        data = this.getSharedDimension(modelElementPath.SharedDimension);
        break;
      case "PrivateDimension":
        var cube = this.getCube(modelElementPath.Cube);
        data = this.getPrivateDimension(cube, modelElementPath.PrivateDimension);
        break;
      case "DimensionUsage":
        var cube = this.getCube(modelElementPath.Cube);
        data = this.getDimensionUsage(cube, modelElementPath.DimensionUsage);
        break;
      case "Hierarchy":
        var hierarchy = modelElementPath.Hierarchy === "" ? undefined : modelElementPath.Hierarchy;
        if (modelElementPath.SharedDimension) {
          data = this.getSharedDimensionHierarchy(
            modelElementPath.SharedDimension,
            hierarchy
          );
        }
        else
        if (modelElementPath.PrivateDimension) {
          var cube = this.getCube(modelElementPath.Cube);
          data = this.getPrivateDimensionHierarchy(
            cube,
            modelElementPath.PrivateDimension,
            hierarchy
          );
        }
        break;
      case "Level":
        var level = modelElementPath.Level === "" ? undefined : modelElementPath.Level;
        if (modelElementPath.SharedDimension) {
          data = this.getSharedDimensionLevel(modelElementPath.SharedDimension, modelElementPath.Hierarchy, level);
        }
        else
        if (modelElementPath.PrivateDimension) {
          data = this.getPrivateDimensionLevel(modelElementPath.Cube, modelElementPath.PrivateDimension, modelElementPath.Hierarchy, level);
        }
        break;
      case "Measure":
        var cube = this.getCube(modelElementPath.Cube);
        data = this.getMeasure(cube, modelElementPath.Measure);
        break;
      case "CalculatedMember":
        if (modelElementPath.Cube) {
          var cube = this.getCube(modelElementPath.Cube);
          data = this.getCubeCalculatedMember(cube, modelElementPath.CalculatedMember);
        }
        else {
          throw "TODO: get calculated member for this context."
        }
        break;
      case "Table":
        if (modelElementPath.Cube) {
          var cube = this.getCube(modelElementPath.Cube);
          var table = this.getCubeTable(cube);
          data = table;
        }
        else {
        }
        break;
      case "VirtualCube":
        data = this.getVirtualCube(modelElementPath.VirtualCube);
        break;
      default:
        data = null;
    }
    return data;
  },
  getCubeRelation: function(cubeIdentifier){
    var cube;
    if (iStr(cubeIdentifier)) {
      cube = this.getCube(cubeIdentifier);
    }
    else
    if (iObj(cubeIdentifier) && cubeIdentifier.Cube){
      cube = this.getCube(cubeIdentifier.Cube);
    }
    if (!cube || cube.nodeType !== 1 || cube.tagName !== "Cube") {
      throw "Invalid cube: " + cubeIdentifier
    }
    var relation = this.getRelation(cube);
    return relation;
  },
  getHierarchy: function(modelElementPath){
    var hierarchy = this.getModelElement(modelElementPath);
    if (hierarchy.tagName !== "Hierarchy") {
      throw "Invalid Hierarchy";
    }
    return hierarchy;
  },
  getHierarchyRelation: function(hierarchyIdentifier){
    var hierarchy;
    if (hierarchyIdentifier.nodeType === 1 && hierarchyIdentifier.tagName === "Hierarchy") {
      //identifier is in fact already a hierarchy
      hierarchy = hierarchyIdentifier;
    }
    else
    if (iDef(hierarchyIdentifier.Hierarchy)) {
      //identifier is expected to be a model path.
      if (hierarchyIdentifier.type !== "Hierarchy") {
        hierarchyIdentifier = merge({}, hierarchyIdentifier);
        hierarchyIdentifier.type = "Hierarchy";
      }
      hierarchy = this.getHierarchy(hierarchyIdentifier);
    }
    var relation = this.getRelation(hierarchy);
    return relation;
  },
  getRelation: function(modelElement, index){
    var relationIndex = this.getRelationIndex(modelElement, index);
    if (relationIndex === -1){
      return null;
    }
    var relation = modelElement.childNodes[relationIndex];
    return relation;
  },
  getRelationIndex: function(modelElement, index){
    if (modelElement.nodeType !== 1) {
      modelElement = this.getModelElement(modelElement);
    }
    if (!index) {
      index = 0;
    }
    var relationIndex = -1, count = -1;
    this.eachElementWithTag(
      modelElement,
      ["Join", "InlineTable", "Table", "View"],
      function(node, i){
        relationIndex = i;
      },
      this,
      function(node, i){
        return index === ++count;
      }
    );
    return relationIndex;
  },
  getModelElementPaths: function(modelElementPath) {
    var paths = [], component;
    var parentObject = {};
    var key, value;
    for (key in modelElementPath) {
      if (key === key.toLowerCase()) {
        continue;
      }
      value = modelElementPath[key];
      parentObject[key] = value;
      parentObject.type = key;
      paths.push(merge({}, parentObject));
    }
    return paths;
  },
  getModelElementParentPath: function(modelElementPath){
    var paths = this.getModelElementPaths(modelElementPath);
    paths.pop();
    return paths.pop();
  },
  getModelElementParent: function(modelElementPath){
    var modelElementParentPath = this.getModelElementParentPath(modelElementPath);
    return this.getModelElement(modelElementParentPath);
  },
  getModelElementsForPath: function(modelElementPath){
    var componentPath = [], component;
    var parentObject = {};
    var key, value;
    for (key in modelElementPath) {
      if (key === key.toLowerCase()) {
        continue;
      }
      value = modelElementPath[key];
      parentObject[key] = value;
      parentObject.type = key;
      component = this.getModelElement(parentObject);
      componentPath.push(component);
    }
    return componentPath;
  },
  isModelElementPathAncestor: function(ancestor, descendant) {
    var p, v;
    for (p in ancestor) {
      if (p.toLowerCase() === p) {
        continue;
      }
      v = descendant[p];
      if (iUnd(v)) {
        return false;
      }
      if (!v === ancestor[p]) {
        return false;
      }
    }
    return true;
  }
};
adopt(MondrianModel, Observable);

MondrianModel.SchemaInfoValues = {
  bool: ["true", "false"],
  dataType: ["Boolean", "Date", "Integer", "Numeric", "String", "Time", "Timestamp"],
  internalType: ["int", "long", "Object", "String"],
  levelType: ["Regular", "TimeYears", "TimeHalfYears", "TimeHalfYear", "TimeQuarters", "TimeMonths", "TimeWeeks", "TimeDays", "TimeHours", "TimeMinutes", "TimeSeconds", "TimeUndefined"],
  aggregator: [ "sum", "count", "min", "max", "avg", "distinct-count"],
  dimensionType: ["StandardDimension", "TimeDimension"],
  hideMemberIf: ["Never", "IfBlankName", "IfParentsName"],
  sqlDialect: ["generic", "access", "db2", "derby", "firebird", "hsqldb", "mssql", "mysql", "oracle", "postgres", "sybase", "teradata", "ingres", "infobright", "luciddb", "vertica", "neoview"]
};

MondrianModel.SchemaInfo = {
  "!top": ["Schema"],
  "!attrs": {},
  Schema: {
    attrs: {
      name: null,
      description: null,
      measuresCaption: null,
      defaultRole: null
    },
    children: ["Annotations", "Parameter", "Dimension", "Cube", "VirtualCube", "NamedSet", "Role", "UserDefinedFunction"]
  },
  Annotations: {
    attrs: {},
    children: ["Annotation"]
  },
  Annotation: {
    attrs: {name: null}
  },
  Parameter: {
    attrs: {
      name: null,
      description: null,
      type: MondrianModel.SchemaInfoValues.dataType.concat(["Member"]),
      modifiable: MondrianModel.SchemaInfoValues.bool,
      defaultValue: null
    }
  },
  Dimension: {
    attrs: {
      type: MondrianModel.SchemaInfoValues.dimensionType,
      usagePrefix: null,
      visible: MondrianModel.SchemaInfoValues.bool,
      foreignKey: null,
      highCardinality: MondrianModel.SchemaInfoValues.bool,
      name: null,
      caption: null,
      description: null
    },
    children: ["Annotations", "Hierarchy"]
  },
  Cube: {
    attrs: {
      name: null,
      caption: null,
      visible: MondrianModel.SchemaInfoValues.bool,
      description: null,
      defaultMeasure: null,
      cache: MondrianModel.SchemaInfoValues.bool,
      enabled: MondrianModel.SchemaInfoValues.bool
    },
    children: ["Annotations", "Table", "View", "Dimension", "DimensionUsage", "Measure", "CalculatedMember", "NamedSet"]
  },
  DimensionUsage: {
    attrs: {
      source: null,
      level: null,
      usagePrefix: null,
      name: null,
      caption: null,
      visible: MondrianModel.SchemaInfoValues.bool,
      description: null,
      foreignKey: null,
      highCardinality: MondrianModel.SchemaInfoValues.bool
    }
  },
  Hierarchy: {
    attrs: {
      name: null,
      visible: MondrianModel.SchemaInfoValues.bool,
      hasAll: MondrianModel.SchemaInfoValues.bool,
      allMemberName: null,
      allMemberCaption: null,
      allLevelName: null,
      primaryKey: null,
      primaryKeyTable: null,
      defaultMember: null,
      memberReaderClass: null,
      caption: null,
      description: null,
      uniqueKeyLevelName: null
    },
    children: ["Annotations", "Table", "View", "Join", "InlineTable", "Level", "MemberReaderParameter"]
  },
  Level: {
    attrs: {
      approxRowCount: null,
      name: null,
      visible: MondrianModel.SchemaInfoValues.bool,
      table: null,
      column: null,
      nameColumn: null,
      ordinalColumn: null,
      parentColumn: null,
      nullParentValue: null,
      type: MondrianModel.SchemaInfoValues.dataType,
      internalType: MondrianModel.SchemaInfoValues.internalType,
      uniqueMembers: MondrianModel.SchemaInfoValues.bool,
      levelType: MondrianModel.SchemaInfoValues.levelType,
      hideMemberIf: MondrianModel.SchemaInfoValues.hideMemberIf,
      formatter: null,
      caption: null,
      description: null,
      captionColumn: null
    },
    children: ["Annotations", "KeyExpression", "NameExpression", "CaptionExpression", "OrdinalExpression", "ParentExpression", "MemberFormatter", "Closure", "Property"]
  },
  Closure: {
    attrs: {
      parentColumn: null,
      childColumn: null
    }
  },
  Property: {
    attrs: {
      name: null,
      column: null,
      type: MondrianModel.SchemaInfoValues.dataType,
      formatter: null,
      caption: null,
      description: null,
      dependsOnLevelValue: MondrianModel.SchemaInfoValues.bool
    },
    children: ["PropertyFormatter"]
  },
  Measure: {
    attrs: {
      name: null,
      column: null,
      datatype: MondrianModel.SchemaInfoValues.dataType,
      formatString: null,
      aggregator: MondrianModel.SchemaInfoValues.aggregator,
      formatter: null,
      caption: null,
      description: null,
      visible: MondrianModel.SchemaInfoValues.bool
    },
    children: ["Annotations", "MeasureExpression", "CellFormatter", "CalculatedMemberProperty"]
  },
  CalculatedMember: {
    attrs: {
      name: null,
      formatString: null,
      caption: null,
      description: null,
      formula: null,
      dimension: null,
      hierarchy: null,
      parent: null,
      visible: MondrianModel.SchemaInfoValues.bool
    },
    children: ["Annotations", "Formula", "CellFormatter", "CalculatedMemberProperty"]
  },
  CalculatedMemberProperty: {
    attrs: {
      name: null,
      caption: null,
      description: null,
      expression: null,
      value: null
    }
  },
  NamedSet: {
    attrs: {
      name: null,
      caption: null,
      description: null,
      formula: null
    },
    children: ["Annotations", "Formula"]
  },
  View: {
    attrs: {
      alias: null
    },
    children: ["SQL"]
  },
  Join: {
    attrs: {
      leftAlias: null,
      leftKey: null,
      rightAlias: null,
      rightKey: null
    },
    children: ["View", "Table", "Join", "InlineTable"]
  },
  Table: {
    attrs: {
      name: null,
      schema: null,
      alias: null
    },
    children: ["SQL", "AggExclude", "AggTable", "Hint"]
  },
  SQL: {
    attrs: {
      dialect: MondrianModel.SchemaInfoValues.sqlDialect
    }
  }
};

})();