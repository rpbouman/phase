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
var PhaseDiagram;

(function(){

(PhaseDiagram = function(conf) {
  if (!conf){
    conf = {};
  }
  this.conf = conf;
  if (!conf.classes) {
    conf.classes = [];
  }
  this.id = conf.id ? conf.id : ++arguments.callee.id;
  arguments.callee.instances[this.getId()] = this;
  conf.classes.push(arguments.callee.prefix);

  if (conf.listeners) {
    this.listen(conf.listeners);
  }

}).prototype = {
  renderTableAlias: true,
  getDiagramModel: function(){
    return this.diagramModel;
  },
  getId: function() {
    return PhaseDiagram.prefix + this.id;
  },
  getDom: function() {
    var dom = gEl(this.getId());
    if (!dom) {
      dom = this.createDom();
    }
    return dom;
  },
  createDom: function() {
    var dom = cEl("div", {
      "class": this.conf.classes.join(" "),
      id: this.getId()
    })
    listen(dom, "click", this.clickHandler, this);
    return dom;
  },
  getSmallestDistance: function(posA, posB) {
    var relationshipEndWidth = 20;

    var y1 = posA.top + 1/2 * posA.height;
    var xA1 = posA.left;
    var xA2 = posA.left + posA.width;

    var y2 = posB.top + 1/2 * posB.height;
    var xB1 = posB.left;
    var xB2 = posB.left + posB.width;

    var points, points1, dist, dist1;
    points = {
      x1: xA1 - relationshipEndWidth, y1: y1,
      x2: xB1 - relationshipEndWidth, y2: y2,
      from: xA1 - relationshipEndWidth,
      to: xB1 - relationshipEndWidth,
      fromSide: "left",
      toSide: "left"
    };
    dist = this.getDistance(points.x1, points.y1, points.x2, points.y2);

    points1 = {
      x1: xA2 + relationshipEndWidth, y1: y1,
      x2: xB1 - relationshipEndWidth, y2: y2,
      from: xA2,
      to: xB1 - relationshipEndWidth,
      fromSide: "right",
      toSide: "left"
    };
    dist1 = this.getDistance(points1.x1, points1.y1, points1.x2, points1.y2);
    if (dist1 < dist) {
      points = points1;
      dist = dist1;
    }

    points1 = {
      x1: xA1 - relationshipEndWidth, y1: y1,
      x2: xB2 + relationshipEndWidth, y2: y2,
      from: xA1 - relationshipEndWidth,
      to: xB2,
      fromSide: "left",
      toSide: "right"
    };
    dist1 = this.getDistance(points1.x1, points1.y1, points1.x2, points1.y2);
    if (dist1 < dist) {
      points = points1;
      dist = dist1;
    }

    points1 = {
      x1: xA2 + relationshipEndWidth, y1: y1,
      x2: xB2 + relationshipEndWidth, y2: y2,
      from: xA2,
      to: xB2,
      fromSide: "right",
      toSide: "right"
    };

    dist1 = this.getDistance(points1.x1, points1.y1, points1.x2, points1.y2);
    if (dist1 < dist) {
      points = points1;
      dist = dist1;
    }

    return points;
  },
  getDistance: function(x1, y1, x2, y2) {
    return Math.sqrt(
      Math.pow(x1 - x2, 2) +
      Math.pow(y1 - y2, 2)
    );
  },
  renderRelationship: function(fromTr, toTr, id, relationshipOperator) {
    var dom = this.getDom();

    var fromPos, fromTrId;
    if (fromTr) {
      fromPos = pos(fromTr, dom);
      fromPos.width = fromTr.clientWidth;
      fromPos.height = fromTr.clientHeight;
      fromTrId = fromTr.id
    }
    else {
      fromTrId = "";
    }

    var toPos, toTrId;
    if (toTr) {
      toPos = pos(toTr, dom);
      toPos.width = toTr.clientWidth;
      toPos.height = toTr.clientHeight;
      toTrId = toTr.id;
    }
    else {
      toTrId = "";
    }


    var fromStyle, toStyle, points;
    if (fromPos && toPos) {
      points = this.getSmallestDistance(fromPos, toPos);
      var x1 = points.x1;
      var y1 = points.y1;
      var x2 = points.x2;
      var y2 = points.y2;
      fromStyle = {
        left: points.from + "px",
        top: y1 + "px"
      };
      toStyle = {
        left: points.to + "px",
        top: y2 + "px"
      };
    }
    else {
      points = {
        fromSide: "",
        toSide: ""
      };
    }

    var attsFrom = {
      "class": [
        "relationship",
        "from",
        points.fromSide
      ].join("-")
    };
    if (fromStyle) {
      attsFrom.style = fromStyle;
    }

    var attsTo = {
      "class": [
        "relationship",
        "to",
        points.toSide
      ].join("-")
    };
    if (toStyle) {
      attsTo.style = toStyle;
    }

    var divFromId = id + ":from";
    var divToId = id + ":to";
    var div = gEl(id), divFrom, divTo;
    if (div) {
      divFrom = gEl(divFromId);
      divTo = gEl(divToId);
    }
    else {
      div = cEl("div", {
        id: id
      }, [
        cEl("div", {
          "class": [
            "relationship-menu"
          ]
        })
      ], dom);
      divFrom = cEl("div", {id: divFromId}, null, dom);
      divTo = cEl("div", {id: divToId}, [
        cEl("div", {
          "class": [
            "relationship-arrow"
          ]
        })
      ], dom);
    }
    sAtts(div, {
      "data-from-id": fromTrId,
      "data-to-id": toTrId
    })
    this.drawLine(div, relationshipOperator, x1, y1, x2, y2);
    sAtts(divFrom, attsFrom);
    sAtts(divTo, attsTo);
  },
  updateRelationship: function(relationshipId){
    var relationshipDom = gEl(relationshipId);
    if (!relationshipDom) {
      return;
    }
    var fromEl = gEl(gAtt(relationshipDom, "data-from-id"));
    var toEl = gEl(gAtt(relationshipDom, "data-to-id"));
    this.renderRelationship(fromEl, toEl, relationshipId, "");
  },
  drawLine: function(el, className, x1, y1, x2, y2) {
    if(y1 < y2){
        var pom = y1;
        y1 = y2;
        y2 = pom;
        pom = x1;
        x1 = x2;
        x2 = pom;
    }

    var a = Math.abs(x1-x2);
    var b = Math.abs(y1-y2);
    var c;
    var sx = (x1+x2)/2 ;
    var sy = (y1+y2)/2 ;
    var width = Math.sqrt(a*a + b*b ) ;
    var x = sx - width/2;
    var y = sy;

    a = width / 2;

    c = Math.abs(sx-x);

    b = Math.sqrt(Math.abs(x1-x)*Math.abs(x1-x)+Math.abs(y1-y)*Math.abs(y1-y) );

    var cosb = (b*b - a*a - c*c) / (2*a*c);
    var rad = Math.acos(cosb);
    var deg = (rad*180)/Math.PI
    var rotation = "rotate(" + deg + "deg)";
    var atts = {
      "class": "relationship " + className,
      style: {
        left: Math.round(x) + "px",
        top: Math.round(y) + "px",
        width: width + "px",
        "transform": rotation,
        "-moz-transform": rotation,
        "-webkit-transform": rotation
      }
    };
    sAtts(el, atts);
  },
  clear: function(){
    if (!this.diagramModel.clear()) {
      return false;
    }
    this.getDom().innerHTML = "";
    return true;
  },
  normalizePosition: function(conf) {
    var dom = this.getDom();
    var p = pos(dom);
    conf.x = conf.x - p.left;
    conf.y = conf.y - p.top;
  },
  createIconCell: function(row){
    var cell = row.insertCell(row.cells.length);
    cell.className = "icon";
    cell.innerHTML = String.fromCharCode(160);
  },
  createTable: function(conf){
    this.fireEvent("createTable", conf);
  },
  getTableIdForIndex: function(index){
    return this.getId() + ":relation" + index;
  },
  getTableColumnId: function(tableIndex, columnName){
    return this.getTableIdForIndex(tableIndex) + ":COLUMN:" + columnName;
  },
  getTableRelationshipId: function(leftTableIndex, leftColumn, rightTableIndex, rightColumn) {
    return this.getId() + ":relationship:" +
          this.getTableColumnId(leftTableIndex, leftColumn) +
          ":=:" +
          this.getTableColumnId(rightTableIndex, rightColumn)
    ;
  },
  getTableIndexFromId: function(id){
    var prefix = this.getId() + ":relation";
    return parseInt(id.substr(prefix.length), 10);
  },
  getColumnNameFromId: function(id){
    var tableIndex = this.getTableIndexFromId(id);
    var columnIdPrefix = this.getTableColumnId(tableIndex, "");
    return id.substr(columnIdPrefix.length);
  },
  addTable: function(conf, callback, scope){
    this.diagramModel.addTable(conf, callback, scope);
  },
  tableAddedHandler: function(diagramModel, event, data){
    this.renderTable(data.index);
  },
  getColumnClasses: function(column, tableInfo){
    var classes = [
      "column",
      "nullable-" + column.IS_NULLABLE,
      "datatype-" + column.DATA_TYPE,
      "auto-increment-" + column.IS_AUTOINCREMENT
    ];
    var columnName = column.COLUMN_NAME;
    var i, n;

    var primaryKey = tableInfo.primaryKey;
    n = primaryKey.length;
    for (i = 0; i < n; i++) {
      if (primaryKey[i].COLUMN_NAME !== columnName) continue;
      classes.push("primary-key");
      break;
    }

    var importedKeys = tableInfo.importedKeys;
    n = importedKeys.length;
    for (i = 0; i < n; i++) {
      if (importedKeys[i].FKCOLUMN_NAME !== columnName) continue;
      classes.push("foreign-key");
      break;
    }

    var indexInfo = tableInfo.indexInfo;
    n = indexInfo.length;
    for (i = 0; i < n; i++) {
      if (indexInfo[i].COLUMN_NAME !== columnName) continue;
      classes.push("indexed");
      break;
    }

    return classes;
  },
  renderTable: function(index){
    var diagramModel = this.diagramModel;
    var table = diagramModel.getTable(index);
    var metadata = table.metadata;
    var tableInfo = metadata.info;

    var tableType = tableInfo.TABLE_TYPE;
    if (tableType) {
      tableType = tableType.toLowerCase();
      tableType = tableType.replace(/ /g, "_");
    }
    var classes = "diagram-element relation " + tableType;

    var x = table.x || 0;
    var y = table.y || 0;

    var tableId = this.getTableIdForIndex(index);
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
    cell.colSpan = 2;
    cell.innerHTML =  diagramModel.getFullyQualifiedTableName(index);

    if (this.renderTableAlias) {
      cell = row.insertCell(cells.length);
      cell.className = "label";
      cell.innerHTML =  diagramModel.getTableAlias(index);
    }

    cell = row.insertCell(cells.length);
    cell.className = "remove";

    diagramModel.eachColumnOfTable(index, function(column, i){
      var columnName = column.COLUMN_NAME;
      row = tab.insertRow(rows.length);
      row.id = this.getTableColumnId(index, columnName);
      row.className = this.getColumnClasses(column, tableInfo).join(" ");
      cells = row.cells;

      cell = row.insertCell(cells.length);
      cell.className = "checkbox";

      this.createIconCell(row);

      cell = row.insertCell(cells.length);
      cell.className = "name";
      cell.innerHTML = columnName;
      cell.colSpan = this.renderTableAlias ? 3 : 2;

    }, this);

    var dom = this.getDom();
    var tableElement = cEl("div", {
      id: tableId,
      "data-type": "relation",
      "class": classes,
      style: {
        left: x + "px",
        top: y + "px",
        "z-index": 1
      }
    }, tab, dom);

    //if no position was specified, center the table.
    //use the parent node as container since the actual container might not be visible.
    var container = dom.parentNode;
    if (!table.x) {
      x = parseInt(2 * container.clientWidth / 4, 10);
      if (x < 0) {
        x = 0;
      }
      table.x = x;
      tableElement.style.left = x + "px";
    }
    if (!table.y) {
      y = 10;
      table.y = y;
      tableElement.style.top = y + "px";
    }
    return tableElement;
  }
};

PhaseDiagram.id = 0;
PhaseDiagram.prefix = "phase-diagram";
PhaseDiagram.instances = {};
PhaseDiagram.getInstance = function(id){
  if (iInt(id)) id = PhaseDiagram.prefix + id;
  return PhaseDiagram.instances[id];
};
PhaseDiagram.lookup = function(el){
  var re = new RegExp("^" + PhaseDiagram.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
    if ((el = el.parentNode) === doc) return null;
  }
  return PhaseDiagram.getInstance(el.id);
};

adopt(PhaseDiagram, Observable);

linkCss("../css/phase-diagram.css");
linkCss("../css/phase-tables-and-columns.css");
})();