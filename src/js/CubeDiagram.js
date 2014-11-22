var CubeDiagram;

(function(){

(CubeDiagram = function(conf){
  if (!conf){
    conf = {};
  }
  var cellEditorListeners = {
    scope: this,
    stopEditing: function(cellEditor, event, eventData){
      var dom;
      var container = eventData.container;
      var objectInfo = this.getDiagramElementObjectInfo(eventData.container);
      objectInfo.newValue = eventData.newValue;
      objectInfo.oldValue = eventData.oldValue;
      var eventName;
      switch (cellEditor) {
        case this.nameCellEditor:
          eventName = "changeName";
          break;
        case this.aggregatorCellEditor:
          eventName = "changeAggregator";
          break;
      }
      return this.fireEvent(eventName, objectInfo);
    },
    editingStopped: function(cellEditor, event, eventData){
      var objectInfo = this.getDiagramElementObjectInfo(eventData.container);
      var div = objectInfo.dom;
      this.moveDiagramElement(div, parseInt(div.style.left, 10), parseInt(div.style.top, 10));
      if (eventData.newValue === eventData.oldValue) {
        return true;
      }
      objectInfo.newValue = eventData.newValue;
      objectInfo.oldValue = eventData.oldValue;
      var eventName;
      switch (cellEditor) {
        case this.nameCellEditor:
          eventName = "nameChanged";
          break;
        case this.aggregatorCellEditor:
          eventName = "aggregatorChanged";
          break;
      }
      return this.fireEvent(eventName, objectInfo);
    }
  };
  this.nameCellEditor = new CellEditor({
    listeners: cellEditorListeners
  });
  this.aggregatorCellEditor = new CellEditor({
    listeners: cellEditorListeners,
    input: {
      tagName: "select",
      options: ["avg", "count", "distinct-count", "min", "max", "sum"]
    }
  });

  this.diagramModel = new CubeDiagramModel({
    pedisCache: conf.pedisCache,
    listeners: {
      tableAdded: this.tableAddedHandler,
      sharedDimensionAdded: this.sharedDimensionAddedHandler,
      cubeDimensionAdded: this.cubeDimensionAddedHandler,
      measureAdded: this.measureAddedHandler,
      scope: this
    }
  });

  this.dnd = conf.dnd;
  //handle dnd inside the diagram.
  this.dnd.listen({
    scope: this,
    startDrag: function(event, ddHandler) {
      var target = event.getTarget();
      if (!iDesc(target, this.getDom())) return false;
      clearBrowserSelection();
      var isTable, isColumn, isDimension, isDimensionUsage, isDimensionUsageSource, isMeasure;
      if (target.tagName !== "TD" ||
          hCls(target, "remove") ||
          hCls(target, "table-alias") ||
          !(
            (isTable = hCls(target.parentNode, "relation")) ||
            (isColumn = hCls(target.parentNode, "column"))  ||
            (isDimensionUsageSource = hCls(target.parentNode, "dimensionusage-source"))  ||
            (isMeasure = hCls(target.parentNode, "measure")) ||
            (isDimension = hCls(target.parentNode, "shareddimension")) ||
            (isDimension = hCls(target.parentNode, "privatedimension")) ||
            (isDimensionUsage = hCls(target.parentNode, "dimensionusage"))
          )
      ) return false;

      var tableDom = target.parentNode.parentNode.parentNode.parentNode;
      ddHandler.tableDom = tableDom;
      ddHandler.originalXY = event.getXY();

      var objectType = gAtt(tableDom, "data-type");
      ddHandler.objectType = objectType;
      var objectIndex = tableDom.id.substr(objectType.length);
      ddHandler.objectIndex = objectIndex;

      if (isColumn || isDimensionUsageSource) {
        target = target.parentNode;
        var p = pos(target);
        var y = p.top + (1/2 * target.clientHeight);
        ddHandler.left = {x: p.left, y: y}
        ddHandler.right = {x: p.left + target.clientWidth, y: y};
        ddHandler.columnName = target.id.substr(target.id.lastIndexOf(":") + 1);
        var dragProxy = ddHandler.dragProxy;
        dragProxy.style.display = "block";
        dragProxy.innerHTML = "";
        ddHandler.isColumn = isColumn;
        ddHandler.isDimensionUsageSource = isDimensionUsageSource;
      }
      else {
        ddHandler.originalZIndex = tableDom.style.zIndex;
        tableDom.style.zIndex = 10000;

        var p1 = pos(tableDom);
        var p2 = pos(this.getDom());
        p1.left -= p2.left;
        p1.top -= p2.top;
        ddHandler.originalTablePos = p1;
      }
      return true;
    },
    whileDrag: function(event, ddHandler) {
      var originalXY = ddHandler.originalXY;
      var xy = event.getXY();
      var diffX = xy.x - originalXY.x;
      var diffY = xy.y - originalXY.y;
      if (ddHandler.isColumn || ddHandler.isDimensionUsageSource) {
        var x = xy.x, y = xy.y, x1, y1 = ddHandler.left.y;
        var distLeft = this.getDistance(ddHandler.left.x, y1, x, y);
        var distRight = this.getDistance(ddHandler.right.x, y1, x, y);
        if (distLeft < distRight) {
          x1 = ddHandler.left.x;
        }
        else {
          x1 = ddHandler.right.x;
        }
        var dragProxy = ddHandler.dragProxy;
        this.drawLine(
          dragProxy, this.diagramModel.getRelationalOperator(),
          x1, y1,
          xy.x + (xy.x > x1 ? -1 : 1) * 2,
          xy.y + (xy.y > y1 ? -1 : 1) * 2
        );
        dragProxy.style.zIndex = 1000;
      }
      else {
        var originalTablePos = ddHandler.originalTablePos;
        var pos = {
          left: originalTablePos.left + diffX,
          top: originalTablePos.top + diffY
        };
        if (pos.left < 0) {
          pos.left = 0;
        }
        if (pos.top < 0) {
          pos.top = 0;
        }
        this.moveDiagramElement(ddHandler.tableDom, pos.left, pos.top);
      }
    },
    endDrag: function(event, ddHandler) {
      var tableDom = ddHandler.tableDom;
      tableDom.style.zIndex = ddHandler.originalZIndex;
      var table = ddHandler.table;
      var target = event.getTarget();
      var objectInfo = this.getDiagramElementObjectInfo(target);
      if (ddHandler.isColumn || ddHandler.isDimensionUsageSource) {
        if (target.tagName === "TD") {
          var objectType = objectInfo.objectType;
          var columnName = ddHandler.columnName;
          var tableIndex = this.getTableIndexFromId(tableDom.id);
          var columnId = this.getTableColumnId(tableIndex, columnName);
          var columnDom = gEl(columnId);
          if (ddHandler.isColumn) {
            switch (objectType) {
              case "measure":
                this.setMeasureColumn(objectInfo, columnDom, columnName);
                break;
              case "privatedimension":
              case "dimensionusage":
                this.setCubeDimensionForeignKey(objectInfo, columnDom, columnName);
                break;
              case "shareddimension":
                this.createDimensionUsage(objectInfo, columnDom, columnName);
                break;
            }
          }
          else
          if (ddHandler.isDimensionUsageSource) {
            switch (objectType) {
              case "shareddimension":
                this.setDimensionUsageSource(objectInfo, columnDom, columnName);
                break;
            }
          }
        }
        delete ddHandler.isColumn;
        delete ddHandler.isDimensionUsageSource;
      }
      else {
        var objectInfo = this.getDiagramElementObjectInfo(tableDom);
        objectInfo.object.x = parseInt(tableDom.style.left, 10);
        objectInfo.object.y = parseInt(tableDom.style.top, 10);
      }

      delete ddHandler.originalTablePos;
      delete ddHandler.tableDom;
      delete ddHandler.originalXY;
      delete ddHandler.originalZIndex;
      delete ddHandler.objectType;
      delete ddHandler.objectIndex

      var dragProxy = ddHandler.dragProxy;
      dragProxy.className = "dnd-drag-proxy";
      sAtt(dragProxy, "style", "");
    }
  });

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  getDiagramElementObjectInfo: function(dom){
    var objectType, objectIndex, object;
    while(dom && dom.nodeType === 1) {
      objectType = gAtt(dom, "data-type");
      if (objectType) {
        break;
      }
      dom = dom.parentNode;
    }
    if (dom === null || dom.nodeType !== 1) {
      return null;
    }
    var id = this.getId() + ":" + objectType;
    var objectIndex = parseInt(dom.id.substr(id.length), 10);
    var diagramModel = this.getDiagramModel();
    switch (objectType) {
      case "relation":
        object = diagramModel.getTable(objectIndex);
        break;
      case "measure":
        object = diagramModel.getMeasure(objectIndex);
        break;
      case "dimensionusage":
      case "privatedimension":
        object = diagramModel.getCubeDimension(objectIndex);
        break;
      case "shareddimension":
        object = diagramModel.getSharedDimension(objectIndex);
        break;
      default:
        object = null;
    }
    return {
      dom: dom,
      objectType: objectType,
      objectIndex: objectIndex,
      object: object
    };
  },
  updateAllRelationships: function(){
    this.updateCubeDimensionRelationships();
    this.updateMeasureRelationships();
    this.updateDimensionUsageRelationships();
  },
  moveDiagramElement: function(dom, x, y){
    dom.style.left = x + "px";
    dom.style.top = y + "px";
    var objectType = gAtt(dom, "data-type");
    var id = this.getId() + ":" + objectType;
    var objectIndex = parseInt(dom.id.substr(id.length), 10);
    switch (objectType) {
      case "relation":
        this.updateCubeDimensionRelationships();
        this.updateMeasureRelationships();
        this.updateTableRelationships(objectIndex);
        break;
      case "measure":
        this.updateMeasureRelationship(objectIndex);
        break;
      case "privatedimension":
        this.updateCubeDimensionRelationship(objectIndex);
        break;
      case "shareddimension":
        this.updateDimensionUsageRelationships(objectIndex);
        break;
      case "dimensionusage":
        this.updateCubeDimensionRelationship(objectIndex);
        this.updateDimensionUsageRelationship(objectIndex);
        break;
    }
  },
  updateTableRelationships: function(objectIndex){
  },
  hasSharedDimension: function(dimensionName){
    return this.diagramModel.eachSharedDimension(function(dimension, index){
      if (dimension.dimension.attributes.name !== dimensionName) {
        return true;
      }
      return false;
    }) === false;
  },
  getPrivateDimensionId: function(cubeName, privateDimension, index){
    return "privatedimension" + index;
  },
  clickHandler: function(event){
    var target = event.getTarget();
    var className = target.className;
    var eventName;
    switch (className) {
      case "name":
      case "remove":
      case "edit":
      case "aggregator":
      case "relationship-menu":
        break;
      default:
        return;
    }
    var div;
    switch (target.tagName) {
      case "TD":  //entities here,
        div = target.parentNode.parentNode.parentNode.parentNode;
        break;
      case "DIV": //relationships here
        div = target.parentNode;
        break;
    }
    switch (className) {
      case "relationship-menu":
        var relationshipInfo = null;
        this.fireEvent("removeRelationship", relationshipInfo);
        break;
      case "remove":
      case "edit":
        var objectInfo = this.getDiagramElementObjectInfo(div);
        this.fireEvent(className + "DiagramElement", objectInfo);
        break;
      case "name":
      case "aggregator":
        var editor = null;
        switch (className) {
          case "name":
            editor = this.nameCellEditor;
            break;
          case "aggregator":
            editor = this.aggregatorCellEditor;
            break;
        }
        editor.startEditing(target);
        this.moveDiagramElement(div, parseInt(div.style.left, 10), parseInt(div.style.top, 10));
        break;
    }
  },
  addMeasure: function(conf) {
    this.diagramModel.addMeasure(conf);
  },
  measureAddedHandler: function(diagramModel, event, data){
    this.renderMeasure(data.index);
  },
  updateMeasureRelationships: function(){
    var diagramModel = this.diagramModel;
    diagramModel.eachMeasure(function(measure, index){
      this.updateMeasureRelationship(index);
    }, this);
  },
  getMeasureRelationshipId: function(index){
    return this.getId() + ":measure" + index + ":relationship";
  },
  updateMeasureRelationship: function(index){
    var id = this.getMeasureRelationshipId(index);
    this.updateRelationship(id);
  },
  setMeasureColumn: function(objectInfo, columnDom, columnName) {
    var object = objectInfo.object;
    object.measure.attributes.column = columnName;

    var objectIndex = objectInfo.objectIndex;
    var measureRelationshipId = this.getMeasureRelationshipId(objectIndex);

    var measureRelationship = gEl(measureRelationshipId);
    sAtt(measureRelationship, "data-to-id", columnDom.id);

    this.updateMeasureRelationship(objectInfo.objectIndex);
  },
  renderMeasure: function(index) {
    var diagramModel = this.diagramModel;
    var rec = diagramModel.getMeasure(index);
    var measure = rec.measure;
    var x = rec.x;
    var y = rec.y;
    var type = "measure";
    var classes = "diagram-element " + type;
    var measureId = this.getId() + ":" + type + index;
    var tab = cEl("table",
      {
        "class": classes,
        cellspacing: 0,
        callpadding: 0
      }
    );
    var cell, cells, row, rows = tab.rows;
    row = tab.insertRow(rows.length);
    row.id = measureId + "-header";
    row.className = tab.className;
    cells = row.cells;

    this.createIconCell(row);

    cell = row.insertCell(cells.length);
    cell.className = "name";
    cell.innerHTML =  measure.attributes.name;

    cell = row.insertCell(cells.length);
    cell.className = "edit";

    cell = row.insertCell(cells.length);
    cell.className = "remove";

    row = tab.insertRow(rows.length);
    row.id = measureId + "-aggregator";
    row.className = tab.className + "-aggregator";
    cells = row.cells;

    this.createIconCell(row);

    cell = row.insertCell(cells.length);
    cell.className = "aggregator";
    cell.colSpan = 3;
    cell.innerHTML =  measure.attributes.aggregator || MeasureEditor.prototype.fields.aggregator.defaultValue;

    var dom = this.getDom();
    var measureElement = cEl("div", {
      id: measureId,
      "class": classes,
      "data-type": type,
      style: {
        left: x + "px",
        top: y + "px",
        "z-index": 1
      }
    }, tab, dom);

    //if no position was specified, center the table.
    //use the parent node as container since the actual container might not be visible.
    var container = dom.parentNode;
    if (!rec.x) {
      x = parseInt(3 * container.clientWidth / 4, 10);
      if (x < 0) {
        x = 0;
      }
      rec.x = x;
      measureElement.style.left = x + "px";

    }
    if (!rec.y) {
      y = 10 + (index * 60);
      rec.y = y;
      measureElement.style.top = y + "px";
    }

    //render the measure relationship. There is at most just one.
    var columnId, columnName = measure.attributes.column;
    if (columnName) {
      var tableId;
      this.diagramModel.eachTableColumn(function(table, tableIndex, column, columnIndex){
        if (columnName === column.COLUMN_NAME) {
          tableId = this.getTableIdForIndex(tableIndex);
          columnId = this.getTableColumnId(tableIndex, columnName);
          return false;
        }
        return true;
      }, this);
    }
    this.renderRelationship(gEl(measureId), gEl(columnId), measureId + ":relationship", "");

    return measureElement;
  },
  addSharedDimension: function(conf){
    this.diagramModel.addSharedDimension(conf);
  },
  sharedDimensionAddedHandler: function(diagramModel, event, data){
    this.renderSharedDimension(data.index);
  },
  addCubeDimension: function(conf){
    this.diagramModel.addCubeDimension(conf);
  },
  cubeDimensionAddedHandler: function(diagramModel, event, data){
    this.renderCubeDimension(data.index);
  },
  updateCubeDimensionRelationships: function(){
    var diagramModel = this.diagramModel;
    diagramModel.eachCubeDimension(function(cubeDimension, index){
      this.updateCubeDimensionRelationship(index);
    }, this);
  },
  updateDimensionUsageRelationships: function(sharedDimensionIndex){
    var diagramModel = this.diagramModel;
    diagramModel.eachDimensionUsage(function(dimensionUsage, i){
      this.updateDimensionUsageRelationship(i);
    }, this, sharedDimensionIndex);
  },
  setCubeDimensionForeignKey: function(objectInfo, columnDom, columnName) {
    var object = objectInfo.object;
    object.dimension.attributes.foreignKey = columnName;
    var objectIndex = objectInfo.objectIndex;
    var cubeDimensionRelationshipId = this.getCubeDimensionRelationshipId(objectIndex);
    var cubeDimensionRelationship = gEl(cubeDimensionRelationshipId);
    sAtt(cubeDimensionRelationship, "data-from-id", columnDom.id);
    this.updateCubeDimensionRelationship(objectInfo.objectIndex);
  },
  createDimensionUsage: function(objectInfo, columnDom, columnName){
    debugger;
  },
  setDimensionUsageSource: function(objectInfo, columnDom, columnName){
    var cubeDimensionIndex = parseInt(columnName.substr("dimensionusage".length), 10);
    var diagramModel = this.getDiagramModel();
    var dimensionUsage = diagramModel.getCubeDimension(cubeDimensionIndex);
    var dimensionUsage = dimensionUsage.dimension;
    var sharedDimension = objectInfo.object.dimension;
    dimensionUsage.attributes.source = sharedDimension.attributes.name;
    var id = "dimensionusage" + cubeDimensionIndex + ":sharedDimension";
    var relationship = gEl(id);
    sAtt(relationship, "data-to-id", objectInfo.dom.id);
    this.updateDimensionUsageRelationship(cubeDimensionIndex);
  },
  getCubeDimensionRelationshipId: function(index){
    var diagramModel = this.diagramModel;
    var rec = diagramModel.getCubeDimension(index);
    var cubeDimension = rec.dimension;
    var tagName = cubeDimension.tagName.toLowerCase();
    var id;
    switch (tagName) {
      case "dimension":
        id = "privatedimension";
        break;
      case "dimensionusage":
        id = "dimensionusage";
        break;
      default:
        id = tagName;
    }
    id += index + ":foreignKey";
    return this.getId() + ":" + id;
  },
  updateCubeDimensionRelationship: function(index){
    var id = this.getCubeDimensionRelationshipId(index);
    this.updateRelationship(id);
  },
  updateDimensionUsageRelationship: function(index){
    var id = this.getDimensionId(index, "dimensionusage") + ":sharedDimension";
    this.updateRelationship(id);
  },
  getDimensionId: function(index, type){
    return this.getId() + ":" + type + index;
  },
  renderDimension: function(rec, index, type){
    var dimension = rec.dimension;
    var dimensionId = this.getDimensionId(index, type);
    var classes = "diagram-element " + type;
    var tab = cEl("table",
      {
        "class": classes,
        cellspacing: 0,
        callpadding: 0
      }
    );
    var cell, cells, row, rows = tab.rows;
    row = tab.insertRow(rows.length);
    row.id = dimensionId + "-header";
    row.className = type;
    cells = row.cells;

    this.createIconCell(row);

    cell = row.insertCell(cells.length);
    cell.className = "name";
    cell.innerHTML =  dimension.attributes.name;

    cell = row.insertCell(cells.length);
    cell.className = "edit";

    cell = row.insertCell(cells.length);
    cell.className = "remove";

    var dom = this.getDom();
    var dimensionElement = cEl("div", {
      id: dimensionId,
      "class": classes,
      "data-type": type,
      style: {
        "z-index": 1
      }
    }, tab, dom);

    var container = dom.parentNode;
    if (!rec.x) {
      rec.x = (type === "shareddimension") ? 10 : (container.clientWidth / 4);
    }
    dimensionElement.style.left = rec.x + "px";
    if (!rec.y) {
      switch (type) {
        case "shareddimension":
          rec.y = 10 + (index * 30);
          break;
        case "dimensionusage":
          rec.y = 10 + (index * 60);
          break;
        case "privatedimension":
          rec.y = 10 + (index * 60);
          break;
      }
    }
    dimensionElement.style.top = rec.y + "px";

    if (type === "dimensionusage") {
      row = tab.insertRow(rows.length);
      row.id = dimensionId + "-source";
      row.className = type + "-source";
      cells = row.cells;

      this.createIconCell(row);

      cell = row.insertCell(cells.length);
      cell.colSpan = 3;
      cell.innerHTML = "source";

      //add relationship to connect to shared dimension
      var sharedDimensionId, source = dimension.attributes.source;
      this.diagramModel.eachSharedDimension(function(dimension, index){
        if (dimension.dimension.attributes.name !== source) {
          return true;
        }
        sharedDimensionId = this.getDimensionId(index, "shareddimension");
        return false;
      }, this);
      if (sharedDimensionId) {
        this.renderRelationship(
          row,
          gEl(sharedDimensionId),
          dimensionId + ":sharedDimension",
          ""
        );
      }
    }

    //render the dimension relationship. There is at most just one.
    if (type === "dimensionusage" || type === "privatedimension") {
      var foreignKey = dimension.attributes.foreignKey;
      var tableId, columnId, columnElement;
      if (foreignKey) {
        this.diagramModel.eachTableColumn(function(table, tableIndex, column, columnIndex){
          var columnName = column.COLUMN_NAME;
          if (foreignKey === columnName) {
            tableId = this.getTableIdForIndex(tableIndex);
            columnId = this.getTableColumnId(tableIndex, columnName);
            return false;
          }
          return true;
        }, this);
        columnElement = gEl(columnId);
      }
      this.renderRelationship(columnElement, dimensionElement, dimensionId + ":foreignKey", "");
    }

    return dimensionElement;
  },
  renderSharedDimension: function(index){
    var diagramModel = this.diagramModel;
    var rec = diagramModel.getSharedDimension(index);

    var type = "shareddimension";

    var element = this.renderDimension(rec, index, type);
    return element;
  },
  renderCubeDimension: function(index){
    var diagramModel = this.diagramModel;
    var rec = diagramModel.getCubeDimension(index);

    var type, tagName = rec.dimension.tagName.toLowerCase();
    switch (tagName) {
      case "dimension":
        type = "privatedimension";
        break;
      case "dimensionusage":
        type = "dimensionusage";
      default:
    }

    var element = this.renderDimension(rec, index, type);
    return element;
  },
  createMeasure: function(conf){
    this.fireEvent("createMeasure", conf);
  },
  handleModelEvent: function(event, data){
    var modelElementPath = data.modelElementPath;
    var modelElement = data.modelElement;
    var type = modelElementPath.type;
    switch (event) {
      case "modelDirty":
        break;
      case "modelElementAttributeSet":
        break;
      case "modelElementCreated":
        switch (type){
          case "Table":
            var metadata = {
              TABLE_NAME: modelElement.attributes.name
            };
            if (modelElement.attributes.schema) {
              metadata.TABLE_SCHEM = modelElement.attributes.schema;
            }
            if (modelElement.attributes.alias) {
              metadata.alias = modelElement.attributes.alias;
            }
            this.addTable({
              metadata: metadata,
              x: data.x,
              y: data.y
            });
            break;
          case "DimensionUsage":
          case "PrivateDimension":
            this.addCubeDimension({
              dimension: modelElement
            });
            break;
          case "Measure":
            this.addMeasure({
              measure: modelElement
            });
            break;
        }
        break;
      case "modelElementRemoved":
        switch (type) {
          case "SharedDimension":
            break;
          case "Measure":
            break;
          case "DimensionUsage":
            break;
          case "PrivateDimension":
            break;
        }
        break;
    }
  }
}

adopt(CubeDiagram, PhaseDiagram);

linkCss("../css/phase-cube-diagram.css");
})();