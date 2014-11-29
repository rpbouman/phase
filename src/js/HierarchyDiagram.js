var HierarchyDiagram;
(function(){

(HierarchyDiagram = function(conf){
  if (!conf){
    conf = {};
  }

  var cellEditorListeners = {
    scope: this,
    stopEditing: function(cellEditor, event, eventData){
      var dom;
      var container = eventData.container;
      var objectInfo = this.getDiagramElementObjectInfo(container);
      objectInfo.newValue = eventData.newValue;
      objectInfo.oldValue = eventData.oldValue;
      var eventName = "change" + container.className.charAt(0).toUpperCase() + container.className.substr(1);
      return this.fireEvent(eventName, objectInfo);
    },
    editingStopped: function(cellEditor, event, eventData){
      var container = eventData.container;
      var objectInfo = this.getDiagramElementObjectInfo(container);
      var div = objectInfo.dom;
      this.moveDiagramElement(div, parseInt(div.style.left, 10), parseInt(div.style.top, 10));
      if (eventData.newValue === eventData.oldValue) {
        return true;
      }
      objectInfo.newValue = eventData.newValue;
      objectInfo.oldValue = eventData.oldValue;
      var eventName = container.className + "Changed";
      return this.fireEvent(eventName, objectInfo);
    }
  };
  this.nameCellEditor = new CellEditor({
    listeners: cellEditorListeners
  });

  this.diagramModel = new HierarchyDiagramModel({
    pedisCache: conf.pedisCache,
    listeners: {
      tableAdded: this.tableAddedHandler,
      levelAdded: this.levelAddedHandler,
      primaryKeyChanged: this.primaryKeyChangedHandler,
      tableRelationshipAdded: this.tableRelationshipAddedHandler,
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
      var isTable, isColumn, isLevel;
      if (target.tagName !== "TD" ||
          hCls(target, "remove") ||
          hCls(target, "table-alias") ||
          !(
            (isTable = hCls(target.parentNode, "relation")) ||
            (isColumn = hCls(target.parentNode, "column"))  ||
            (isLevel = hCls(target.parentNode, "level"))
          )
      ) return false;

      var tableDom = target.parentNode.parentNode.parentNode.parentNode;
      ddHandler.tableDom = tableDom;
      ddHandler.originalXY = event.getXY();

      var objectType = gAtt(tableDom, "data-type");
      ddHandler.objectType = objectType;
      var objectIndex = tableDom.id.substr(objectType.length);
      ddHandler.objectIndex = objectIndex;

      if (isColumn) {
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

      if (ddHandler.isColumn) {
        var target = event.getTarget();
        var objectInfo = this.getDiagramElementObjectInfo(target);
        var color = "";
        if (objectInfo) {
          switch (objectInfo.objectType) {
            case "relation":
              if (ddHandler.tableDom === objectInfo.dom) {
                color = "red";
              }
              else {
                var diagramModel = this.diagramModel;
                var indexOfTableRelationship = diagramModel.indexOfTableRelationship({
                  rightTable: objectInfo.objectIndex
                });
                if (indexOfTableRelationship === -1) {
                  color = "green";
                }
                else {
                  color = "red";
                }
              }
              break;
            case "level":
              color = "green";
              break;
          }
        }

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
        dragProxy.style.borderColor = color;
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
      if (ddHandler.isColumn) {
        if (target.tagName === "TD") {
          var objectType = objectInfo.objectType;
          var columnName = ddHandler.columnName;
          var sourceTableIndex = this.getTableIndexFromId(tableDom.id);
          var sourceColumnId = this.getTableColumnId(sourceTableIndex, columnName);
          switch (objectType) {
            case "relation":
              this.createTableRelationship(sourceColumnId, target.parentNode.id);
              break;
            case "level":
              var row = target.parentNode, levelColumnId;
              if (hCls(row, "level")) {  //header of level.
                levelColumnId = this.getLevelColumnId(objectInfo.objectIndex, "column");
              }
              else
              if (hCls(row, "level-column")) {
                levelColumnId = row.id;
              }
              this.setLevelColumn(levelColumnId, sourceTableIndex, columnName);
              break;
            default:
          }
        }
        delete ddHandler.isColumn;
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
  renderTableAlias: true,
  levelColumnAttributes: {
    "column": "Key",
    "nameColumn": "Name",
    "captionColumn": "Caption",
    "ordinalColumn": "Ordinal",
    "parentColumn": "Parent"
  },
  getRelationshipInfo: function(dom) {
    var diagramModel = this.getDiagramModel();
    var id = dom.id;
    var dataToId = gAtt(dom, "data-to-id");
    var dataFromId = gAtt(dom, "data-from-id");
    var prefix = this.getId() + ":";
    var relationshipInfo = {
      dom: dom,
      id: id,
      fromId: dataFromId,
      toId: dataToId
    };
    var levelIdPrefix = this.getLevelId();
    if (id.indexOf(prefix + "relationship:") === 0){
      relationshipInfo.type = "tableRelationship";
      var relationshipId = id.substr((prefix + "relationship:").length);
      relationshipId = relationshipId.split(":=:");

      relationshipInfo.leftTableIndex = parseInt(relationshipId[0].substr((prefix + "relation").length));
      relationshipInfo.leftTable = diagramModel.getTable(relationshipInfo.leftTableIndex);
      relationshipInfo.leftColumn = relationshipId[0].substr((prefix + "relation" + relationshipInfo.leftTableIndex + ":COLUMN:").length);

      relationshipInfo.rightTableIndex = parseInt(relationshipId[1].substr((prefix + "relation").length));
      relationshipInfo.rightTable = diagramModel.getTable(relationshipInfo.rightTableIndex);
      relationshipInfo.rightColumn = relationshipId[0].substr((prefix + "relation" + relationshipInfo.rightTableIndex + ":COLUMN:").length);
    }
    else
    if (id.indexOf(levelIdPrefix) === 0) {
      relationshipInfo.type = "levelColumnRelationship";
      relationshipInfo.levelIndex = parseInt(id.substr(levelIdPrefix.length), 10);
      relationshipInfo.level = diagramModel.getLevel(relationshipInfo.levelIndex);
      relationshipInfo.columnType = id.split(":")[3];
      relationshipInfo.columName = dataToId.substr(dataToId.lastIndexOf(":")+1);
      relationshipInfo.tableIndex = parseInt(dataToId.substr((prefix + "relation").length), 10);
      relationshipInfo.table = diagramModel.getTable(relationshipInfo.tableIndex);
    }
    else {
      relationshipInfo = null;
    }
    return relationshipInfo;
  },
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
      case "level":
        object = diagramModel.getLevel(objectIndex);
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
  moveDiagramElement: function(dom, x, y){
    dom.style.left = x + "px";
    dom.style.top = y + "px";
    var objectType = gAtt(dom, "data-type");
    var prefix = this.getId() + ":" + objectType;
    var objectIndex = parseInt(dom.id.substr(prefix.length), 10);
    switch (objectType) {
      case "relation":
        this.updateTableLevelRelationships(objectIndex);
        this.updateTableRelationships(objectIndex);
        break;
      case "level":
        this.updateLevelTableRelationships(objectIndex);
        break;
      default:
    }
  },
  clickHandler: function(event){
    var target = event.getTarget();
    var className = target.className;
    var eventName;
    switch (className) {
      case "checkbox":
      case "name":
      case "caption":
      case "remove":
      case "edit":
      case "relationship-menu":
        break;
      default:
        return;
    }
    var div, objectInfo
    switch (target.tagName) {
      case "TD":  //entities here,
        div = target.parentNode.parentNode.parentNode.parentNode;
        objectInfo = this.getDiagramElementObjectInfo(div);
        break;
      case "DIV": //relationships here
        div = target.parentNode;
        objectInfo = this.getRelationshipInfo(div);
        break;
    }
    var diagramModel = this.getDiagramModel();
    switch (className) {
      case "checkbox":
        var prefix = this.getTableColumnId(objectInfo.objectIndex, "");
        var column = target.parentNode.id.substr(prefix.length);
        this.setPrimaryKey(objectInfo, column);
        break;
      case "relationship-menu":
        var relationshipInfo = null;
        switch (objectInfo.type) {
          case "tableRelationship":
            this.fireEvent("removeTableRelationship", objectInfo);
            break;
          case "levelColumnRelationship":
            this.removeLevelColumnRelationship(objectInfo);
            break;
        }
        break;
      case "remove":
      case "edit":
        this.fireEvent(className + "DiagramElement", objectInfo);
        break;
      case "name":
      case "caption":
        if (objectInfo.objectType === "relation") {
          return;
        }
        var editor = this.nameCellEditor;
        editor.startEditing(target);
        this.moveDiagramElement(div, parseInt(div.style.left, 10), parseInt(div.style.top, 10));
        break;
    }
  },
  createTableRelationship: function(sourceColumnId, targetColumnId) {
    if (sourceColumnId === targetColumnId) {
      return;
    }
    var id = this.getId();

    var sourceTableIndex = this.getTableIndexFromId(sourceColumnId);
    var sourceColumn = this.getColumnNameFromId(sourceColumnId);

    var targetTableIndex = this.getTableIndexFromId(targetColumnId);
    var targetColumn = this.getColumnNameFromId(targetColumnId);

    if (sourceTableIndex === targetTableIndex) {
      return;
    }

    var diagramModel = this.getDiagramModel();
    var relationshipIndex = diagramModel.indexOfTableRelationship({
      rightTable: targetTableIndex
    });
    if (relationshipIndex !== -1) {
      var relationship = diagramModel.getTableRelationship(relationshipIndex);
      if (relationship.leftTable !== sourceTableIndex) {
        return;
      }
    }
    this.fireEvent("tableRelationshipCreated", {
      leftTable: sourceTableIndex,
      leftColumn: sourceColumn,
      rightTable: targetTableIndex,
      rightColumn: targetColumn
    });
  },
  tableRelationshipAddedHandler: function(diagramModel, event, data){
    var relationship = data.relationship;
    var fromId = this.getTableColumnId(relationship.leftTable, relationship.leftColumn);
    var fromTr = gEl(fromId);
    var toId = this.getTableColumnId(relationship.rightTable, relationship.rightColumn);
    var toTr = gEl(toId);
    var id = this.getTableRelationshipId(
      relationship.leftTable, relationship.leftColumn,
      relationship.rightTable, relationship.rightColumn
    );
    this.renderRelationship(fromTr, toTr, id, "=");
  },
  addLevel: function(rec){
    var diagramModel = this.getDiagramModel();
    diagramModel.addLevel(rec);
  },
  levelAddedHandler: function(model, event, data) {
    this.renderLevel(data.index);
  },
  updateTableRelationship: function(relationship){
    var fromId = this.getTableColumnId(relationship.leftTable, relationship.leftColumn);
    var fromTr = gEl(fromId);
    var toId = this.getTableColumnId(relationship.rightTable, relationship.rightColumn);
    var toTr = gEl(toId);
    var id = this.getTableRelationshipId(
      relationship.leftTable, relationship.leftColumn,
      relationship.rightTable, relationship.rightColumn
    );
    this.renderRelationship(fromTr, toTr, id, "=");
  },
  updateTableRelationships: function(tableIndex){
    var model = this.getDiagramModel();
    model.eachTableRelationship(function(relationship, index){
      if (
        relationship.leftTable === tableIndex ||
        relationship.rightTable === tableIndex
      ) {
        this.updateTableRelationship(relationship);
      }
    }, this);
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
          case "Join":
            break;
          case "Level":
            debugger;
            break;
        }
        break;
      case "modelElementRemoved":
        switch (type) {
          case "Table":
            break;
          case "Join":
            break;
          case "Level":
            break;
        }
        break;
    }
  },
  primaryKeyChangedHandler: function(diagramModel, event, data){
    var oldKey = data.oldKey;
    if (oldKey && oldKey.table !== null && oldKey.column !== null) {
      var oldId = this.getTableColumnId(oldKey.table, oldKey.column);
      rCls(oldId, "dimension-primary-key", "");
    }

    var newKey = data.newKey;
    var newId = this.getTableColumnId(newKey.table, newKey.column);
    aCls(newId, "dimension-primary-key", "");
  },
  setPrimaryKey: function(objectInfo, columnName){
    var diagramModel = this.getDiagramModel();
    var objectIndex = objectInfo.objectIndex;
    var eventData;
    if (diagramModel.comparePrimaryKey(objectIndex, columnName)) {
      diagramModel.clearPrimaryKey();
      eventData = {
        tableAlias: null,
        table: null,
        columnName: null
      };
    }
    else {
      diagramModel.setPrimaryKey(objectIndex, columnName);
      var table = diagramModel.getTable(objectIndex);
      eventData = {
        tableAlias: table.alias,
        table: table.metadata,
        columnName: columnName
      };
    }
    this.fireEvent("primaryKeySet", eventData);
  },
  updateTableLevelRelationships: function(tableIndex){
    //todo: only update things for this table
    var diagramModel = this.getDiagramModel();
    var table = diagramModel.getTable(tableIndex);
    diagramModel.eachLevel(function(level, i){
      level = level.level;
      var levelColumnAttributes = this.levelColumnAttributes,
          attributes = level.attributes,
          attribute,
          relationshipId
      ;
      for (attribute in levelColumnAttributes) {
        if (!levelColumnAttributes[attribute]) {
          continue;
        }
        relationshipId = this.getLevelColumnRelationshipId(i, attribute);
        this.updateRelationship(relationshipId);
      }
    }, this);
  },
  updateLevelTableRelationships: function(levelIndex){
    var diagramModel = this.getDiagramModel();
    var level = diagramModel.getLevel(levelIndex);
    level = level.level;
    var levelColumnAttributes = this.levelColumnAttributes,
        attributes = level.attributes,
        attribute,
        relationshipId
    ;
    for (attribute in levelColumnAttributes) {
      if (!attributes[attribute]) {
        continue;
      }
      relationshipId = this.getLevelColumnRelationshipId(levelIndex, attribute);
      this.updateRelationship(relationshipId);
    }
  },
  getLevelIndex: function(dom){
    var id;
    if (iNod(dom)) {
      id = dom.id;
    }
    else {
      id = dom;
    }
    var index = id.substr(this.getLevelId().length);
    return parseInt(index, 10);
  },
  getLevelId: function(index){
    return this.getId() + ":level" + (iDef(index) ? index : "");
  },
  getLevelColumnId: function(index, column){
    return this.getLevelId(index) + ":COLUMN:" + (column || "");
  },
  getLevelColumnName: function(dom){
    var id;
    if (iNod(dom)) {
      id = dom.id;
    }
    else {
      id = dom;
    }
    var levelIndex = this.getLevelIndex(dom);
    var levelColumnId = this.getLevelColumnId(levelIndex);
    return id.substr(levelColumnId.length);
  },
  getLevelColumnRelationshipId: function(index, column) {
    return this.getLevelColumnId(index, column) + ":relationship";
  },
  createLevelColumn: function(levelIndex, attribute, tab, label){
    var diagramModel = this.getDiagramModel();
    var levelId = this.getLevelId(levelIndex);
    var level = diagramModel.getLevel(levelIndex);
    var level = level.level;

    var rows = tab.rows;
    var row = tab.insertRow(rows.length);
    row.id = this.getLevelColumnId(levelIndex, attribute);
    row.className = "level-column level-column-" + attribute;

    this.createIconCell(row);

    var cells = row.cells;
    cell = row.insertCell(cells.length);
    cell.colSpan = 4;
    cell.innerHTML = label || attribute;

    //render the level relationship. There is at most just one.
    var columnId,
        columnName = level.attributes[attribute],
        tableName =  level.attributes.table
    ;
    if (columnName) {
      diagramModel.eachTableColumn(function(table, tableIndex, column, columnIndex){
        if (columnName === column.COLUMN_NAME) {
          if (
            tableName &&
            ( table.alias && table.alias !== tableName ||
              table.metadata.TABLE_NAME !== tableName)
          ) {
            return true;
          }
          var tableId = this.getTableIdForIndex(tableIndex);
          columnId = this.getTableColumnId(tableIndex, columnName);
          return false;
        }
        return true;
      }, this);
    }
    var relationshipId = this.getLevelColumnRelationshipId(levelIndex, attribute);
    this.renderRelationship(row, gEl(columnId), relationshipId, "");
  },
  renderLevel: function(index){
    var diagramModel = this.getDiagramModel();
    var level = diagramModel.getLevel(index);
    var metadata = level.level;

    var x = level.x;
    var y = level.y;

    var classes = "diagram-element level";
    var levelId = this.getLevelId(index);
    var tab = cEl("table",
      {
        "class": classes,
        cellspacing: 0,
        callpadding: 0
      }
    );
    var cell, cells, row, rows = tab.rows;
    row = tab.insertRow(rows.length);
    row.className = tab.className;
    cells = row.cells;

    this.createIconCell(row);

    cell = row.insertCell(cells.length);
    cell.className = "name";
    cell.innerHTML =  metadata.attributes.name;

    cell = row.insertCell(cells.length);
    cell.className = "caption";
    cell.innerHTML =  metadata.attributes.caption || "";

    cell = row.insertCell(cells.length);
    cell.className = "edit";

    cell = row.insertCell(cells.length);
    cell.className = "remove";

    var levelColumnAttributes = this.levelColumnAttributes, attribute, label;
    for (attribute in levelColumnAttributes) {
      label = levelColumnAttributes[attribute];
      this.createLevelColumn(index, attribute, tab, label);
    }

    var dom = this.getDom();
    var tableElement = cEl("div", {
      id: levelId,
      "data-type": "level",
      "class": classes,
      style: {
        left: x + "px",
        top: y + "px",
        "z-index": 1
      }
    }, tab, dom);
    this.updateLevelTableRelationships(index);
    return tableElement;
  },
  setLevelColumn: function(levelColumnId, sourceTableIndex, columnName) {
    var diagramModel = this.getDiagramModel();

    var levelIndex = this.getLevelIndex(levelColumnId);
    var level = diagramModel.getLevel(levelIndex);
    var levelModelElement = level.level;
    var levelAttributes = levelModelElement.attributes;
    var levelColumn = this.getLevelColumnName(levelColumnId);

    if (iDef(sourceTableIndex) && iDef(columnName)) {
      var table = diagramModel.getTable(sourceTableIndex);
      var tableName = table.alias || table.metadata.TABLE_NAME;

      levelAttributes.table = tableName;
      levelAttributes[levelColumn] = columnName;
    }
    else {
      delete levelAttributes.table;
      delete levelAttributes[levelColumn];
    }
    var relationshipId = this.getLevelColumnRelationshipId(levelIndex, levelColumn);
    var columnId = this.getTableColumnId(sourceTableIndex, columnName);
    this.renderRelationship(gEl(levelColumnId), gEl(columnId), relationshipId, "");
    //TODO: check all other level columns to see if they match the table. If not, remove the relationship.
  },
  removeLevelColumnRelationship: function(objectInfo){
    var levelColumnId = this.getLevelColumnId(objectInfo.levelIndex, objectInfo.columnType);
    this.setLevelColumn(levelColumnId);
  }
}

adopt(HierarchyDiagram, PhaseDiagram);
linkCss("../css/phase-hierarchy-diagram.css");
})();