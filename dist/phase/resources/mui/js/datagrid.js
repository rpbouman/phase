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
var DataGrid;

(function() {

(DataGrid = function(conf) {
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++DataGrid.id;
  DataGrid.instances[this.getId()] = this;
  this.rows = [];
  this.columns = [];
}).prototype = {
  getId: function(){
    return DataGrid.prefix + this.id;
  },
  getContainer: function(){
    var conf = this.conf;
    var container = conf.container;
    container = gEl(container);
    if (!container) {
      container =  body;
    }
    return container;
  },
  createDom: function(){
    var id = this.getId();
    var conf = this.conf;
    var container = this.getContainer();
    var el = cEl("div", {
      "class": "datagrid",
      id: id
    }, null, container);

    var spacer = cEl("div", {
      "class": "datagrid-spacer",
      id: id + "-spacer"
    }, null, el);

    var cols = cEl("div", {
        "class": "datagrid-col-headers",
        id: id + "-cols"
      },
      cEl("table", {
        "class": "datagrid-col-headers",
        cellpadding: 0,
        cellspacing: 0,
        id: id + "-cols-table"
      }), el
    );

    var rows = cEl("div", {
        "class": "datagrid-row-headers",
        id: id + "-rows"
      },
      cEl("table", {
        cellpadding: 0,
        cellspacing: 0,
        "class": "datagrid-row-headers",
        id: id + "-rows-table"
      }), el
    );

    var cellsTable = cEl("table", {
        cellpadding: 0,
        cellspacing: 0,
      "class": "datagrid-cells",
      id: id + "-cells-table"
    });
    var cells = cEl("div", {
      "class": "datagrid-cells",
      id: id + "-cells"
    }, cellsTable, el);

    listen(cells, "scroll", this.scrollHandler, this);
    return el;
  },
  addPositionableRow: function(table, n, last) {
    var c, i, r = table.insertRow(last ? table.rows.length : 0);
    r.className = "positioning-row";
    for (i = 0; i < n; i++){
        c = r.insertCell(i);
        c.innerHTML = "<div>&#160;</div>"
    }
    return r;
  },
  getColumn: function(index) {
    return this.columns[index];
  },
  getCellValue: function(row, column) {
    return this.cells[row][column];
  },
  eachColumn: function(callback, scope) {
    if (!scope) scope = this;
    var i, column, columns = this.columns, n = columns.length;
    for (i = 0; i < n; i++) {
      column = columns[i];
      callback.call(scope, i, column);
    }
  },
  eachRow: function(callback, scope){
    if (!scope) scope = this;
    var rows = this.rows, i, n = rows.length, row;
    for (i = 0; i < n; i++) {
      row = rows[i];
      callback.call(scope, i, row);
    }
  },
  eachCellRow: function(callback, scope){
    if (!scope) scope = this;
    var rows = this.cells, i, n = rows.length, row;
    for (i = 0; i < n; i++) {
      row = rows[i];
      callback.call(scope, i, row);
    }
  },
  setColumns: function(columns) {
    var me = this;
    var columnsDom = me.getColumnsTableDom();
    var rows = columnsDom.rows;
    var colCount = columns.length;
    //clear the columns table.
    while (rows.length) columnsDom.deleteRow(rows.length-1);
    //add a row for positioning/sizing purposes.
    var columnsPositionRowCells = me.addPositionableRow(columnsDom, colCount).cells;
    var row = columnsDom.insertRow(rows.length);

    me.columns = columns;
    me.eachColumn(function(i, column){
      var cell = row.insertCell(i);
      cell.className = "th";
      cell.innerHTML = escXml(column.label || column.name);
    });
  },
  setRows: function(dataRows) {
    var me = this;
    var rowsDom = this.getRowsTableDom();
    var rows = rowsDom.rows;
    while (rows.length) rowsDom.deleteRow(rows.length-1);
    me.rows = dataRows || [];
    me.eachRow(function(i, row){
      var tr = rowsDom.insertRow(i);
      var n = row.length, j, td, val;
      if (i === 0) {
        me.addPositionableRow(rowsDom, n);
      }
      for (j = 0; j < n; j++){
        td = tr.insertCell(tr.cells.length);
        td.className = "th";
        val = row[j];
        td.innerHTML = "<div>" + (iStr(val) ? escXml(val) : val) + "</div>";
      }
    });
  },
  setCells: function(dataCells) {
    var me = this;
    var cellsDom = this.getCellsTableDom();
    var rows = cellsDom.rows;
    while (rows.length) cellsDom.deleteRow(rows.length-1);

    var widths = [], width;
    var cellsPositionRowCells;
    me.cells = dataCells || [];
    me.eachCellRow(function(i, row){
      var tr = cellsDom.insertRow(i), array = iArr(row);
      var j, n = row.length, td, val;
      for (j = 0; j < n; j++){
        td = tr.insertCell(tr.cells.length);
        td.className = "th";
        val = row[j];
        td.innerHTML = "<div>" + (iStr(val) ? (val !== null && val.length ? escXml(val): "&#160;") : val) + "</div>" ;

        width = widths[j];
        if (iUnd(width)) width = widths[j] = 0;
        if (td.firstChild.clientWidth > width) widths[j] = td.firstChild.clientWidth;
      }
    });
    var columnsPositionRowCells = me.getColumnsTableDom().rows[0].cells;
    var cellsPositionRowCells = me.addPositionableRow(cellsDom, columnsPositionRowCells.length).cells;
    me.eachColumn(function(i, column){
      var cell = columnsPositionRowCells[i];
      var width1 = cell.clientWidth;
      var width2 = widths[i];
      if (width1 > width2) cellsPositionRowCells[i].firstChild.style.width = width1 + "px";
      else cell.firstChild.style.width = width2 + "px";
    });
    me.doLayout();
  },
  setData: function(data) {
    this.setColumns(data.columns);
    this.setRows(data.rows);
    this.setCells(data.cells);
  },
  doLayout: function() {
    var dom = this.getDom(),
      spacer = this.getSpacerDom(),
      rows = this.getRowsDom(),
      rowsTable = this.getRowsTableDom(),
      rowsTableWidth = (rowsTable ? rowsTable.clientWidth : 0),
      rowsTableHeight = (rowsTable ? rowsTable.clientHeight : 0),
      cols = this.getColumnsDom(),
      colsTable = this.getColumnsTableDom(),
      cells = this.getCellsDom(),
      cellsTable = this.getCellsTableDom(),
      width, height
    ;
    cols.style.top = 0 + "px";

    cells.style.left = cols.style.left = rows.style.width = rowsTableWidth + "px";
    //cells.style.left = rows.style.width = rowsTableWidth + "px";
    //cols.style.left = rows.style.left;

    cells.style.top = rows.style.top = colsTable.clientHeight + "px";
    cols.style.height = colsTable.clientHeight + "px";

    width = dom.clientWidth;
    cols.style.width = (width - rows.clientWidth) + "px";

    //height = dom.clientHeight;
    //rows.style.height = (height - cols.clientHeight) + "px";
    //cells.style.width = (colsTable.clientWidth + (cellsTable.clientHeight + colsTable.clientHeight > (height + 5) ? 16 : 0)) + "px";
    //cells.style.height = ((rowsTable ? rowsTable.clientHeight: cellsTable.clientHeight) + (cellsTable.clientWidth + cellsTable.clientLeft > (width + 5) ? 16 : 0)) + "px";
    cells.style.height = ((dom.clientHeight - colsTable.clientHeight) - 33) + "px";
    if ((dom.clientWidth - rowsTable.clientWidth) < cellsTable.clientWidth) console.log("horizontal scrollbar");
    cells.style.width = (dom.clientWidth - rowsTable.clientWidth) + "px";

    spacer.style.width = rowsTable.clientWidth + "px";
    spacer.style.height = colsTable.clientHeight + "px";
  },
  getSpacerDom: function() {
    return gEl(this.getId() + "-spacer");
  },
  getCellsDom: function() {
    return gEl(this.getId() + "-cells");
  },
  getCellsTableDom: function() {
    return gEl(this.getId() + "-cells-table");
  },
  getRowsDom: function() {
    return gEl(this.getId() + "-rows");
  },
  getRowsTableDom: function() {
    return gEl(this.getId() + "-rows-table");
  },
  getColumnsDom: function() {
    return gEl(this.getId() + "-cols");
  },
  getColumnsTableDom: function() {
    return gEl(this.getId() + "-cols-table");
  },
  scrollHandler: function(event) {
    var cells = this.getCellsDom(),
        rowsTable = this.getRowsTableDom(),
        colsTable = this.getColumnsTableDom()
    ;
    if (rowsTable) {
        rowsTable.style.top = (-cells.scrollTop) + "px";
    }
    colsTable.style.left = (-cells.scrollLeft) + "px";
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  },
  setCellValue: function(rowIndex, colIndex, value){
    var cellsTableDom = this.getCellsTableDom();
    var cell = cellsTableDom.rows[rowIndex].cells[colIndex];
    var xml = (value === "" ? "&#160;" : escXml(value));
    cell.innerHTML = "<div>" + xml + "<div>";
    var cells = this.cells;
    var row = cells[rowIndex];
    row[colIndex] = value;
  }
};

DataGrid.id = 0;
DataGrid.prefix = "datagrid";
DataGrid.instances = {};
DataGrid.getInstance = function(id){
    if (iInt(id)) id = DataGrid.prefix + id;
    return DataGrid.instances[id];
};
DataGrid.lookup = function(el){
  var re = new RegExp("^" + DataGrid.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return DataGrid.getInstance(el.id);
};

linkCss(muiCssDir + "datagrid.css");

})();
