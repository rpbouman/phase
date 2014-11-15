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
var DataGridCellEditing;

(function() {

(DataGridCellEditing = function(conf) {
  this.conf = conf;
  if (!conf.defaultEditor) conf.defaultEditor = new TextCellEditor();
  listen(this.getDataGrid().getCellsDom(), "click", this.clickHandler, this);
  this.init();
}).prototype = {
  init: function(){
    var me = this;
    this.initEditorListeners(this.getDefaultEditor());
    var dataGrid = this.getDataGrid();
    dataGrid.eachColumn(function(index, column){
      this.initEditorListeners(column.editor);
    }, this);
  },
  initEditorListeners: function(editor) {
    if (!editor) return;
    editor.listen("beforeChange", this.beforeChangeHandler, this);
    editor.listen("changed", this.changedHandler, this);
    editor.listen("keyDown", this.keyDownHandler, this);
  },
  getDataGrid: function() {
    return this.conf.datagrid;
  },
  getDefaultEditor: function() {
    return this.conf.defaultEditor;
  },
  isColumnEditable: function(index){
    var datagrid = this.getDataGrid();
    var column = datagrid.getColumn(index);
    return column.editable !== false;
  },
  getEditor: function(index) {
    var datagrid = this.getDataGrid();
    var column = datagrid.getColumn(index);
    var editor;
    if (column.editor) {
      editor = column.editor;
    }
    else {
      editor = this.getDefaultEditor();
    }
    return editor;
  },
  getCurrentEditor: function(){
    return this.currentEditor;
  },
  beforeChangeHandler: function(editor, event, data) {
    var cell = editor.getDom().parentNode;
    var cellIndex = cell.cellIndex;
    var rowIndex = cell.parentNode.rowIndex;
  },
  changedHandler: function(editor, event, data) {
    var editorDom = editor.getDom();
    var cell = editorDom.parentNode;
  },
  keyDownHandler: function(editor, type, event) {
    var shiftKey = event.getShiftKey();
    var inc;
    var editorDom = editor.getDom();
    var cell = editorDom.parentNode;
    var cellIndex = cell.cellIndex;
    var rowIndex = cell.parentNode.rowIndex;
    switch(event.getKeyCode()) {
      case 9:
        var prev = -1, next = -1
        this.getDataGrid().eachColumn(function(i, column){
          if (this.isColumnEditable(i)) {
            if (i < cellIndex) prev = i;
            else
            if (i > cellIndex) next = i;
            return;
          }
        }, this);
        if (shiftKey) {
          var j = next;
          next = prev;
          prev = j;
        }
        if (next !== -1) {
          cellIndex = next;
          inc = 0;
        }
        else
        if (prev !== -1) {
          cellIndex = prev;
          inc = 1;
        }
        else {
          inc = 1;
        }
        break;
      case 10:
      case 13:
        inc = 1;
        break;
      default:
        return;
    }
    if (shiftKey) inc *= -1;
    this.startEditing(rowIndex + inc, cellIndex);
  },
  stopEditing: function(){
    var currentEditor = this.currentEditor;
    if (!currentEditor) return;
    if (this.fireEvent("beforeStopEditing") === false) return false;
    var value = currentEditor.getValue();
    var editorDom = currentEditor.getDom();
    var cell = editorDom.parentNode;
    cell.removeChild(editorDom);
    this.getDataGrid().setCellValue(cell.parentNode.rowIndex, cell.cellIndex, currentEditor.getValue());
    this.fireEvent("editingStopped");
    this.currentCell = null;
    this.currentEditor = null;
    return true;
  },
  startEditing: function() {
    var cell;
    switch (arguments.length){
      case 1:
        cell = arguments[0];
        if (!iNod(cell) || cell.tagName !== "TD") cell = null;
        break;
      case 2:
        var rowIndex = arguments[0];
        var cellIndex = arguments[1];
        if (!iInt(rowIndex) || !iInt(cellIndex)) break;
        var cellsTableDom = this.getDataGrid().getCellsTableDom();
        var row = cellsTableDom.rows[rowIndex];
        cell = row.cells[cellIndex];
        break;
    }
    if (!cell) throw "Invalid argument";

    if (this.stopEditing() === false) return false;

    var index = cell.cellIndex;
    if (!this.isColumnEditable(index)) return false;

    var data = {
      cell: cell
    };
    if (this.fireEvent("beforeStartEditing", data) === false) return false;

    this.currentCell = cell;

    var editor = this.getEditor(index);
    var editorDom = editor.getDom();
    this.currentEditor = editor;

    var dataGrid = this.getDataGrid();
    var value = dataGrid.getCellValue(cell.parentNode.rowIndex, index);
    editor.setValue(value);

    var h = cell.firstChild.clientHeight;
    var w = cell.firstChild.clientWidth;
    var style = editorDom.style;
    style.height = h + "px";
    style.width = w + "px";

    while (cell.firstChild) cell.removeChild(cell.firstChild);

    cell.appendChild(editorDom);
    setTimeout(function(){
      editor.focus();
    }, 1);
    this.fireEvent("editingStarted", data);
  },
  clickHandler: function(event) {
    var target = event.getTarget(), cell = target;
    while (cell.tagName !== "TD") {
      cell = cell.parentNode;
      if (!cell) return;
    }
    this.startEditing(cell);
  }
};

adopt(DataGridCellEditing, Observable);

})();

var CellEditor;

(function(){

(CellEditor = function(conf){
  this.value = "";
}).prototype = {
  getDom: function() {
    if (!this.dom) this.createDom();
    return this.dom;
  },
  setValue: function(value) {
    this.value = value;
    this.getDom().value = value;
  },
  getValue: function(){
    return this.getDom().value;
  },
  focus: function(){
    this.getDom().focus();
  },
  changeHandler: function(event) {
    var data = {
      oldValue: this.value,
      newValue: this.getValue()
    };
    if (this.fireEvent("beforeChange", data) === false) {
      this.setValue(data.oldValue);
      return;
    }
    this.fireEvent("changed", data);
  },
  keydownHandler: function(event) {
    this.fireEvent("keyDown", event);
  },
  initListeners: function(){
    listen(this.dom, "change", this.changeHandler, this);
    listen(this.dom, "keydown", this.keydownHandler, this);
  }
};

CellEditor.prefix = "cell-editor";

adopt(CellEditor, Observable);
})();

var TextCellEditor;

(function(){

(TextCellEditor = function(conf){
  this.conf = conf || {};
}).prototype = {
  createDom: function() {
    var conf = this.conf;
    this.dom = cEl("input", {
      type: "text",
      "class": confCls(
        CellEditor.prefix,
        TextCellEditor.prefix,
        conf
      )
    });
    this.initListeners();
  }
};

TextCellEditor.prefix = "celleditor-text";

adopt(TextCellEditor, CellEditor);

linkCss(muiCssDir + "datagridcellediting.css");

})();
