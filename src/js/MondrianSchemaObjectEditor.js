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
var editors = {
};
var SchemaEditor, CubeEditor, VirtualCubeEditor, NamedSetEditor,
    SharedDimensionEditor, PrivateDimensionEditor, DimensionUsageEditor,
    HierarchyEditor, LevelEditor, MeasureEditor
;

(function(){

var dimensionDecorations = {
  standard: {
    hierarchies: [
      {
        levels: [
          {}
        ]
      }
    ]
  },
  date: {
    attributes: {
      name: "Date",
      type: "TimeDimension"
    },
    hierarchies: [
      {
        levels: [
          {
            attributes: {
              name: "Year",
              levelType: "TimeYears"
            },
            annotations: {"AnalyzerDateFormat": "[yyyy]"}
          },
          {
            attributes: {
              name: "Quarter",
              levelType: "TimeQuarters"
            },
            annotations: {"AnalyzerDateFormat": "[yyyy].['Q'q]"}
          },
          {
            attributes: {
              name: "Month",
              levelType: "TimeMonths"
            },
            annotations: {"AnalyzerDateFormat": "[yyyy].['Q'q].[M]"}
          },
          {
            attributes: {
              name: "Day",
              levelType: "TimeDays"
            },
            annotations: {"AnalyzerDateFormat": "[yyyy].['Q'q].[M].[yyyy-MM-dd]"}
          }
        ]
      },
      {
        attributes: {
          name: "Weekly"
        },
        levels: [
          {
            attributes: {
              name: "Year",
              levelType: "TimeYears"
            },
            annotations: {"AnalyzerDateFormat": "[yyyy]"}
          },
          {
            attributes: {
              name: "Week",
              levelType: "TimeWeeeks"
            },
            annotations: {"AnalyzerDateFormat": "[yyyy].['W'w]"}
          },
          {
            attributes: {
              name: "Day",
              levelType: "TimeDays"
            },
            annotations: {"AnalyzerDateFormat": "[yyyy].['W'w].[yyyy-MM-dd]"}
          }
        ]
      }
    ]
  },
  time: {
    attributes: {
      name: "Time",
      type: "TimeDimension"
    },
    hierarchies: [
      {
        levels: [
          {
            attributes: {
              name: "Hour",
              levelType: "TimeHours"
            }
          },
          {
            attributes: {
              name: "Minutes",
              levelType: "TimeMinutes"
            }
          },
          {
            attributes: {
              name: "Seconds",
              levelType: "TimeSeconds"
            }
          }
        ]
      },
    ]
  },
  geography: {
    attributes: {
      name: "Geography"
    },
    hierarchies: [
      {
        levels: [
          {
            attributes: {
              name: "Country"
            },
            annotations: {
              "Data.Role": "Geography",
              "Geo.Role": "country"
            }
          },
          {
            attributes: {
              name: "State"
            },
            annotations: {
              "Data.Role": "Geography",
              "Geo.Role": "state",
              "Geo.RequiredParents": "country"
            }
          },
          {
            attributes: {
              name: "City"
            },
            annotations: {
              "Data.Role": "Geography",
              "Geo.Role": "city",
              "Geo.RequiredParents": "country,state"
            }
          }
        ]
      }
    ]
  }
};

var fields = {
  name: {
    labelText: "Name",
    dataPath: ["modelElement", "attributes", "name"],
    mandatory: true,
    tooltipText: "Name of this item. This is the name that will be used to identify this item in MDX queries."
  },
  caption: {
    labelText: "Caption",
    dataPath: ["modelElement", "attributes", "caption"],
    tooltipText: "A human-friendly label to identify this item in graphical user interfaces."
  },
  description: {
    labelText: "Description",
    tagName: "textarea",
    dataPath: ["modelElement", "attributes", "description"],
    tooltipText: "A human readable description for this item."
  },
  formula: {
    tagName: "textarea",
    labelText: "Formula",
    dataPath: {
      getter: function(){
        return this.model.getFormulaText(this.modelElement);
      },
      setter: function(value){
        return this.model.setFormulaText(this.modelElement, value);
      }
    },
    tooltipText: "MDX expression to calculate this item."
  },
  visible: {
    inputType: "checkbox",
    labelText: "Visible",
    dataPath: ["modelElement", "attributes", "visible"],
    defaultValue: true,
    tooltipText: "Should this item be visible?"
  },
  cache: {
    inputType: "checkbox",
    labelText: "Cache",
    dataPath: ["modelElement", "attributes", "cache"],
    defaultValue: true,
    tooltipText: "Should values for this item be cached?"
  },
  enabled: {
    inputType: "checkbox",
    labelText: "Enabled",
    dataPath: ["modelElement", "attributes", "enabled"],
    defaultValue: true,
    tooltipText: "Should this item be available to the user?"
  },
  highCardinality: {
    inputType: "checkbox",
    labelText: "High Cardinality",
    dataPath: ["modelElement", "attributes", "highCardinality"],
    tooltipText: "Are there many values associated with this item?"
  },
  usagePrefix: {
    labelText: "Usage Prefix",
    dataPath: ["modelElement", "attributes", "usagePrefix"],
    tooltipText: "If present, then this is prepended to the Dimension column names during the building of collapse dimension aggregates allowing 1) different dimension usages to be disambiguated during aggregate table recognition and 2) multiple shared dimensions that have common column names to be disambiguated."
  },
  foreignKey: {
    labelText: "Foreign key",
    tagName: "select",
    dataPath: ["modelElement", "attributes", "foreignKey"],
    tooltipText: "The foreign key in the fact table to which this item is bound."
  },
  dimensionType: {
    labelText: "Dimension type",
    tagName: "select",
    dataPath: ["modelElement", "attributes", "type"],
    defaultValue: "StandardDimension",
    options: MondrianModel.SchemaInfoValues.dimensionType,
    tooltipText: "The type of this dimension."
  },
  datatype: {
    tagName: "select",
    labelText: "Data Type",
    dataPath: ["modelElement", "attributes", "datatype"],
    options: MondrianModel.SchemaInfoValues.dataType,
    defaultValue: "",
    tooltipText: "The datatype of this item."
  },
  formatString: {
    labelText: "Format",
    dataPath: ["modelElement", "attributes", "formatString"],
    tooltipText: "Format string with which to format values of this item."
  },
  column: {
    tagName: "select",
    labelText: "Column",
    dataPath: ["modelElement", "attributes", "column"],
    tooltipText: "Column which is source of this item's values.",
    addValue: true
  }
};

var GenericEditor;
(GenericEditor = function(conf){
  if (!conf) {
    conf = {};
  }
  this.conf = conf;
  if (!conf.classes) {
    conf.classes = [];
  }
  if (!conf.tabs) {
    conf.tabs = [{
      text: "General",
      selected: true,
      component: cEl("div")
    }];
  }

  this.dialog = conf.dialog || new Dialog();
  this.tabPane = new TabPane({
    listeners: {
      scope: this,
      beforeSelectTab: this.beforeSelectTab,
      tabSelected: this.tabSelected
    }
  });

  this.mondrianSchemaCache = conf.mondrianSchemaCache;
  this.mondrianSchemaCache.listen({
    modelEvent: function(mondrianSchemaCache, event, data){
      var model = this.model;
      if (data.model !== model) {
        return;
      }
      var eventData = data.eventData;
      if (eventData.modelElementPath) {
        eventData.isDescendant = model.isModelElementPathAncestor(
          this.modelElementPath,
          eventData.modelElementPath
        );
      }
      this.handleModelEvent(data.modelEvent, eventData);
    },
    modelElementRenamed: function(mondrianSchemaCache, event, data){
      var model = this.model;
      if (data.model !== model) {
        return;
      }
      var modelElementPath = this.modelElementPath;
      var eventData = data.eventData;
      var eventModelElementPath = eventData.modelElementPath;
      if (!model.isModelElementPathAncestor(eventModelElementPath, modelElementPath)) {
        return;
      }
      this.modelElementPath[eventModelElementPath.type] = eventData.newValue;
    },
    modelPurged: function(mondrianSchemaCache, event, data){
      var model = this.model;
      if (data.model !== model) {
        return;
      }
      this.clearData();
    },
    scope: this
  });

  if (conf.listeners) {
    this.listen(conf.listeners);
  }

  this.pedisCache = conf.pedisCache;

  conf.classes.push("phase-editor");
  arguments.callee._super.apply(this, arguments);
}).prototype = {
  fields: {},
  getTab: function(text){
    var tabs = this.conf.tabs;
    var n = tabs.length, i, tab;
    for (i = 0; i < n; i++) {
      tab = tabs[i];
      if (tab.text === text) {
        return tab;
      }
    }
    return null;
  },
  hasChildElement: function(name){
    var tagName = this.objectType;
    var schemaObjectInfoItem = MondrianModel.SchemaInfo[tagName];
    if (!schemaObjectInfoItem) {
      var indexOfSpace = tagName.lastIndexOf(" ");
      if (indexOfSpace === -1) {
        return false;
      }
      schemaObjectInfoItem = MondrianModel.SchemaInfo[tagName.substr(indexOfSpace+1)];
      if (!schemaObjectInfoItem) {
        tagName = tagName.replace(/ /g, "");
        schemaObjectInfoItem = MondrianModel.SchemaInfo[tagName.substr(indexOfSpace+1)];
      }
    }
    if (!schemaObjectInfoItem) {
      return false;
    }
    var i, children = schemaObjectInfoItem.children, n = children.length;
    for (i = 0; i < n; i++){
      if (children[i] === name) {
        return true;
      }
    }
    return false;
  },
  hasAnnotations: function(){
    return this.hasChildElement("Annotations");
  },
  hasProperties: function(){
    return this.hasChildElement("Properties");
  },
  getAnnotationsTab: function(){
    return this.getTab("Annotations");
  },
  getGeneralTab: function(){
    return this.getTab("General");
  },
  cloneModelElement: function(){
    var model = this.model;
    if (!model) {
      return;
    }
    var modelElementPath = this.modelElementPath;
    if (!modelElementPath) {
      return;
    }
    model.cloneModelElement(modelElementPath);
  },
  getRelationInfo: function(relation, callback, scope){
    var pedisCache = this.pedisCache;
    var dataSourceName = this.model.getDataSourceName();
    if (!dataSourceName) {
      return;
    }
    var table = {
      TABLE_CAT: null,
      TABLE_SCHEM: relation.attributes.schema || null,
      TABLE_NAME: relation.attributes.name
    };
    var alias = relation.attributes.alias;
    var me = this;
    pedisCache.getTableInfo(dataSourceName, table, function(tableInfo){
      if (alias) {
        table.alias = alias;
      }
      table.info = tableInfo;
      callback.call(scope || null, table);
    }, this);
  },
  getHierarchyRelations: function(){
    var model = this.model, modelElement = this.modelElement;
    var relations = [], relationships = [], relationship;
    var ret = {
      relations: relations,
      relationships: relationships
    }
    var relation = model.getHierarchyRelation(this.modelElementPath);
    if (!relation) {
      return ret;
    }
    relations.push(relation);
    var i = 0, left, right;
    while (i < relations.length) {
      relation = relations[i++];
      if (relation.tagName === "Join"){
        relationship = {
          join: relation
        };
        left = model.getRelation(relation, 0);
        if (left) {
          relationship.left = {
            index: relations.length,
            relation: left
          }
          relations.push(left);
        }
        right = model.getRelation(relation, 1);
        if (right) {
          relationship.right = {
            index: relations.length,
            relation: right
          }
          relations.push(right);
        }
        relationships.push(relationship);
      }
    }
    return ret;
  },
  populateSelectFieldWithHierarchyRelations: function(fieldName){
    this.clearSelectField(fieldName);
    var relationsInfo = this.getHierarchyRelations();
    var relations = relationsInfo.relations;
    var options = [], relation;
    var i, n = relations.length;
    for (i = 0; i < n; i++){
      relation = relations[i];
      switch (relation.tagName) {
        case "Table":
          break;
        default:
          continue;
      }
      options.push(relation.attributes.alias || relation.attributes.name);
    }
    this.populateSelectField(fieldName, options);
  },
  populateSelectFieldWithHierarchyRelationColumns: function(tableName, columnField, callback, scope){
    this.clearSelectField(columnField);
    var relationsInfo = this.getHierarchyRelations();
    var i, relations = relationsInfo.relations, n = relations.length, relation;
    for (i = 0; i < n; i++) {
      relation = relations[i];
      if (
        relation.attributes.alias && relation.attributes.alias === tableName ||
        relation.attributes.name && relation.attributes.name === tableName
      ) {
        break;
      }
      relation = null;
    }
    if (!relation) {
      return;
    }
    this.getRelationInfo(relation, function(table){
      var options = [], info = table.info, columns = info.columns, column, i, n = columns.length;
      for (i = 0; i < n; i++) {
        column = columns[i];
        options.push(column.COLUMN_NAME);
      }
      this.populateSelectField(columnField, options);
      if (callback) {
        callback.call(scope || null, tableField, columnField);
      }
      else {
        this.setSelectFieldValue(columnField, this.modelElement.attributes[columnField]);
      }
    }, this);
  },
  getCubeRelationAnnotationPrefix: function(cubeRelation){
    return "phase.Table." + (cubeRelation.attributes.alias || cubeRelation.attributes.name) + ".";
  },
  getCubeRelationInfo: function(callback, scope){
    var model = this.model, modelElement = this.modelElement;
    var relation = model.getCubeRelation(this.modelElementPath);
    if (!relation) {
      callback.call(scope || null, null);
      return;
    }
    if (relation.tagName !== "Table") {
      throw "Fact relations of type " + relation.tagName + " are currently not supported.";
    }
    this.getRelationInfo(relation, function(table){
      var annotationPrefix = this.getCubeRelationAnnotationPrefix(relation);
      var rec = {
        metadata: table,
      };
      var x = model.getAnnotationValue(modelElement, annotationPrefix + "x");
      if (x) {
        rec.x = x;
      }
      var y = model.getAnnotationValue(modelElement, annotationPrefix + "y");
      if (y) {
        rec.y = y;
      }
      if (table.alias) {
        rec.alias = table.alias;
      }
      callback.call(scope || null, rec);
    }, this);
  },
  beforeSelectTab: function(tabPane, event, data){
    var oldTab = data.oldTab;
    var oldTab = tabPane.getTab(oldTab);
    if (oldTab && (oldTab.component === this.diagram)) {
      this.saveDiagram();
    }
  },
  tabSelected: function(tabPane, event, data){
    var tab = tabPane.getTab(data.newTab),
        annotationsGrid = this.annotationsGrid
    ;
    if (tab.component === annotationsGrid) {
      annotationsGrid.doLayout();
    }
  },
  handleModelEvent:function(event, data){
    var modelElement = data.modelElement;
    var modelElementPath = data.modelElementPath;
    var model = this.model;
    switch (event) {
      case "modelElementAttributeSet":
        if (this.diagram) {
          this.diagramNeedsUpdate = true;
        }
        break;
      case "modelElementRemoved":
        if (
          model &&
          model.isModelElementPathAncestor(modelElementPath, this.modelElementPath)
        ) {
          this.clearData();
        }
      case "modelElementCreated":
        if (this.diagram) {
          if (this.diagramActivated()) {
            this.updateDiagram();
          }
          else {
            this.diagramNeedsUpdate = true;
          }
        }
        break;
      default:
    }
  },
  getFields: function(){
    var myFields = this.fields;
    return myFields;
  },
  getFieldDefinition: function(field) {
    return this.getFields()[field];
  },
  forEachField: function(callback, scope, includeColumnSeparators){
    var field, fields = this.getFields(), fieldDef;
    if (!scope) {
      scope = this;
    }
    for (field in fields) {
      fieldDef = fields[field];
      if (/_column\d+/.test(field) && fieldDef === null && includeColumnSeparators !== true) {
        continue;
      }
      if (callback.call(scope, field, fieldDef) === false) {
        return false;
      }
    }
    return true;
  },
  isFieldMandatory: function(field){
    if (iStr(field)) {
      field = this.getFieldDefinition(field);
    }
    return field.mandatory === true;
  },
  isFieldDefault: function(field, value){
    if (iStr(field)) {
      field = this.getFieldDefinition(field);
    }
    if (iDef(field.defaultValue) && field.defaultValue === value) {
      return true;
    }
    return false;
  },
  createField: function(fieldset, key, definition, tabIndex) {
    var children = [], mandatory;
    if (key && definition) {
      mandatory = this.isFieldMandatory(definition);
      var id = this.getFieldId(key);
      children.push(
        cEl("label", {
          "for": id
        }, definition.labelText || key)
      );

      var inputConf = {
        "id": id,
        "name": key,
        "type": definition.inputType || "text",
        "class": key,
        tabindex: tabIndex
      };
      if (mandatory) {
        inputConf.required = true;
      }
      var input = cEl(definition.tagName || "input", inputConf);
      if (definition.options) {
        if (definition.tagName === "select") {
          var i, option, optionDefinition, options = definition.options;
          if (!mandatory) {
            options = [""].concat(options);
          }
          var n = options.length;
          for (i = 0; i < n; i++){
            optionDefinition = options[i];
            if (iStr(optionDefinition)) {
              optionDefinition = {
                labelText: optionDefinition,
                value: optionDefinition
              }
            }
            cEl("option", {
              label: optionDefinition.labelText || "",
              value: optionDefinition.value || ""
            }, optionDefinition.labelText || optionDefinition.value, input);
          }
        }
      }
      children.push(input);

      if (definition.tooltipText) {
        var indent = String.fromCharCode(160);
        indent += indent + indent + indent + indent + indent + indent;
        children.push(
          cEl("span", {
              "class": "hint-icon",
            },
            [indent, cEl("div", {
              "class": "tooltip"
            }, definition.tooltipText)]
          )
        );
      }
    }
    var pureClasses = "pure-control-group";
    if (this.columnCount > 1) {
      pureClasses += " pure-u-1 pure-u-md-1-" + this.columnCount;
    }

    var item = cEl("div", {
      "class": pureClasses + (mandatory ? " mandatory" : "") + " field-" + key
    }, children, fieldset);
    this.fieldCreated(fieldset, key, definition, tabIndex);
    return item;
  },
  fieldCreated: function(fieldset, key, definition, tabIndex){
    //noop
  },
  fieldUpdated: function(fieldName, value){
    //noop
  },
  getFormId: function(){
    return this.getId() + "-form";
  },
  getFieldId: function(key){
    return this.getId() + "-field-" + key;
  },
  getFieldElement: function(key){
    return gEl(this.getFieldId(key));
  },
  createForm: function(dom, fields){
    var fieldsetChildren = [cEl("legend")];
    var grid;

    var fieldColumn = [], fieldColumns = [fieldColumn], numFields, maxNumFields = 0;
    this.forEachField(function(field, fieldDef){
      if (/_column\d+/.test(field) && fieldDef === null) {
        numFields = fieldColumn.length;
        if (numFields > maxNumFields) {
          maxNumFields = numFields;
        }
        fieldColumn = [];
        fieldColumns.push(fieldColumn);
      }
      else {
        fieldColumn.push({
          field: field,
          fieldDef: fieldDef
        });
      }
    }, this, true);
    if (maxNumFields < fieldColumn.length) {
      maxNumFields = fieldColumn.length;
    }
    this.columnCount = fieldColumns.length;

    if (this.columnCount > 1) {
      grid = cEl("div", {
        "class": "pure-g"
      });
      fieldsetChildren.push(grid);
    }
    var fieldset = cEl("fieldset", null, fieldsetChildren);
    var form = cEl("form", {
      "class": "pure-form pure-form-aligned",
      id: this.getId() + "-form"
    }, [fieldset], dom);
    this.form = form;

    var x, y, field, fieldDef, tabIndex;
    for (y = 0; y < maxNumFields; y++) {
      for (x = 0; x < this.columnCount; x++) {
        fieldColumn = fieldColumns[x];
        if (y < fieldColumn.length) {
          this.createField(
            grid || fieldset,
            fieldColumn[y].field,
            fieldColumn[y].fieldDef,
            1 + y + (x * maxNumFields)
          );
        }
        else {
          this.createField(grid || fieldset);
        }
      }
    }
  },
  createDom: function(){
    var conf = this.conf;
    if (!conf) {
      conf = {};
    }
    if (!conf.toolbar) {
      conf.toolbar = {};
    }
    if (!conf.toolbar.buttons) {
      conf.toolbar.buttons = [];
    }
    //add the clone button and separator, if necessary.
    if (!conf.toolbar.buttons.length || conf.toolbar.buttons[0]["class"] !== "clone") {
      conf.toolbar.buttons.splice(
        0, 0,
        {"class": "clone", tooltip: "Clone this item", handler: function(){
          this.cloneModelElement();
        }}
      );
      this.conf.toolbar.buttons.splice(
        1, 0,
        {class: "separator"}
      );
    }
    var dom = GenericEditor._super.prototype.createDom.apply(this, arguments);
    var toolbar = this.toolbar;
    if (toolbar) {
      var me = this;
      toolbar.listen({
        "buttonPressed": function(toolbar, event, button){
          var conf = button.conf;
          if (conf.handler) {
            conf.handler.call(conf.scope || me);
          }
        }
      });
    }

    var hasAnnotations = this.hasAnnotations();
    if (hasAnnotations) {
      var annotationsTab = {
        text: "Annotations"
      };
      this.annotationsGrid = new EditableDataGrid({
        listeners: {
          scope: this,
          rowInserted: function(grid, event, data) {
            var model = this.model;
            var modelElement = this.modelElement;
            if (!model || !modelElement) {
              return;
            }
            model.createAnnotation(modelElement, data.rowIndex);
          },
          rowDeleted: function(grid, event, data){
            var model = this.model;
            var modelElement = this.modelElement;
            if (!model || !modelElement) {
              return;
            }
            model.removeAnnotation(modelElement, data.rowIndex);
          }
        }
      });
      annotationsTab.component = this.annotationsGrid;
      conf.tabs.push(annotationsTab);
    }

    this.tabPane.conf.container = dom;
    this.tabPane.addTab(conf.tabs);

    if (hasAnnotations) {
      this.annotationsGridCellEditor = new CellTextEditor({
        listeners: {
          scope: this,
          editingStopped: this.annotationCellEdited
        }
      });
      this.annotationsGrid.setColumns([
        {name: "name", label: "Name", cellEditor: this.annotationsGridCellEditor},
        {name: "value", label: "Value", cellEditor: this.annotationsGridCellEditor}
      ]);
      this.annotationsGrid.setRowHeaders([
        {name: "rowNum", label: "#", isAutoRowNum: true}
      ]);
    }

    this.createForm(this.getGeneralTab().component, this.getFields());
    return dom;
  },
  annotationCellEdited: function(cellEditor, event, data){
    var model = this.model;
    if (!model){
      return;
    }
    var modelElement = this.modelElement;
    if (!modelElement){
      return;
    }
    var cell = data.container;
    var row = cell.parentNode;
    var rowIndex = row.rowIndex - 1;
    var oldValue = data.oldValue;
    var newValue = data.newValue;
    var annotationsGrid = this.annotationsGrid;
    var column = annotationsGrid.getColumn(cell.cellIndex);
    var columnIndex = column.index;
    var annotation = model.getAnnotation(modelElement, rowIndex);
    switch (column.name) {
      case "name":
        annotation.attributes.name = newValue;
        break;
      case "value":
        model.setElementTextContent(annotation, newValue);
        break;
    }
  },
  getModel: function(){
    return this.model;
  },
  setModel: function(model){
    if (this.model === model) {
      return;
    }
    this.model = model;
  },
  getModelElementPath: function(){
    return merge({}, this.modelElementPath);
  },
  getModelElement: function(){
    return this.modelElement;
  },
  setModelElement: function(modelElementPath){
    this.modelElementPath = modelElementPath;
    if (this.model === null) {
      this.modelElement = null;
    }
    else
    if (this.modelElementPath === null) {
      this.modelElement = null;
    }
    else {
      var modelElement = this.model.getModelElement(modelElementPath);
      if (!modelElement) {
        switch (modelElementPath.type) {
          case "CubeUsage":
            modelElement = this.model.createCubeUsage(
              modelElementPath.VirtualCube,
              modelElementPath.CubeUsage,
              {},
              true
            );
            break;
          default:
            this.modelElement = null;
            throw "Model element not found";
        }
      }
      this.modelElement = modelElement;
    }
  },
  setSelectFieldValue: function(fieldName, value){
    var fieldEl = this.getFieldElement(fieldName);
    var option, options = fieldEl.options, i, n = options.length;
    for (i = 0; i < n; i++) {
      option = options[i];
      if (option.value !== value) {
        continue;
      }
      fieldEl.selectedIndex = i;
      return true;
    }
    return false;
  },
  getDataForPath: function(path){
    if (iObj(path) && iFun(path.getter)) {
      return path.getter.call(this);
    }
    var data = this;
    var i, n = path.length, pathElement;
    for (i = 0; i < n; i++) {
      pathElement = path[i];
      switch(typeof (pathElement)) {
        case "string":
        case "number":
          data = data[pathElement];
          break;
        case "function":
          data = pathElement.call(this, data);
          break;
      }
    }
    return data;
  },
  updateFieldValue: function(field, fieldDef) {
    if (!fieldDef) {
      fieldDef = this.getFields()[field];
    }
    var path = fieldDef.dataPath;
    if (!path) {
      return;
    }
    var data = this.getDataForPath(path);
    if ((iUnd(data) || data === "") && fieldDef.alternativeDataPath) {
      data = this.getDataForPath(fieldDef.alternativeDataPath);
    }
    var fieldEl = this.getFieldElement(field);
    if (data === null || iUnd(data)) {
      data = fieldDef.defaultValue || "";
    }
    switch (fieldDef.tagName) {
      case "select":
        this.setSelectFieldValue(field, data);
        break;
      default:
        switch (fieldEl.type) {
          case "checkbox":
            fieldEl.checked = String(data) === "true";
            break;
          default:
            fieldEl.value = data;
        }
    }
    this.fieldUpdated(field, data);
  },
  updateFieldValues: function(){
    if (!this.form) {
      return;
    }
    this.forEachField(function(field, fieldDef){
      this.updateFieldValue(field, fieldDef);
    });
    //focus the first control on the form.
    //since the fieldset counts as a control, the index is 1 not 0.
    var element = this.form.elements[1];
    try {
      element.focus();
    } catch(exception) {
      //noop. Sometimes can't get focus on IE,
    }
    if (iFun(element.select)) {
      element.select();
    }
  },
  getFieldValue: function(field, fieldDef) {
    var fieldEl = this.getFieldElement(field);
    if (!fieldDef){
      fieldDef = this.getFieldDefinition(field);
    }
    var value;
    switch (fieldEl.tagName.toLowerCase()) {
      case "select":
        if (fieldEl.selectedIndex === -1) {
          value = undefined;
        }
        else {
          value = fieldEl.options[fieldEl.selectedIndex].value;
        }
        break;
      case "input":
        switch (fieldEl.type) {
          case "text":
            value = fieldEl.value;
            break;
          case "checkbox":
            value = fieldEl.checked;
            break;
        }
        break;
      case "textarea":
        value = fieldEl.value;
        break;
      default:
        throw "Unknown field type";
    }
    if (
      (!this.isFieldMandatory(fieldDef) && this.isFieldDefault(fieldDef, value)) ||
      value === ""
    ) {
      value = undefined;
    }
    return value;
  },
  beforeCreateNew: function(){
    return this.saveFieldValues();
  },
  saveFieldValue: function(field, fieldDef){
    if (!fieldDef){
      fieldDef = this.getFieldDefinition(field);
    }
    var value = this.getFieldValue(field, fieldDef);
    var path = fieldDef.dataPath;
    if (!path) {
      return;
    }
    if (iObj(path) && iFun(path.setter)) {
      path.setter.call(this, value);
    }
    else
    if ((path.length === 3) &&
        (path[0] === "modelElement") &&
        (path[1] === "attributes")
    ) {
      var attribute = path[2], result;
      result = this.model.setAttributeValue(
        this.modelElementPath,
        attribute,
        value
      );
      if (result === false) {
        success = false;
      }
    }
    else {
      var data = this[path[0]];
      var i, n = path.length - 1, pathItem = null;
      for (i = 1; i < n; i++){
        pathItem = path[i];
        data = data[pathItem];
      }
      var key = path[path.length-1];
      if (!this.isFieldMandatory(fieldDef) && this.isFieldDefault(fieldDef, value)) {
        value = "";
      }
      if (iUnd(value) || (value === "")) {
        delete data[key];
      }
      else {
        data[key] = value;
      }
    }
    this.fieldSaved(field, value);
  },
  fieldSaved: function(field, value) {
    //noop. override
  },
  saveFieldValues: function(){
    var model = this.model;
    var modelElementPath = this.modelElementPath;
    if (!model || !this.modelElement || !modelElementPath) {
      return;
    }
    if (!model.getModelElement(modelElementPath)) {
      //this.modelElement = null;
      return;
    }
    var success = true;
    this.forEachField(function(field, fieldDef){
      this.saveFieldValue(field, fieldDef);
    }, this);
    if (success === false) {
      //if we some fields were prevented from being saved,
      //we reset the fields with the current state in the model.
      this.updateFieldValues();
    }
    if (this.diagramActivated()) {
      this.saveDiagram();
    }
    this.fieldValuesSaved();
    return success;
  },
  fieldValuesSaved: function(){
    //noop. override
  },
  modelChanged: function(){
    //noop. Override.
  },
  modelElementChanged: function(){
    //noop. Override.
  },
  clearData: function(){
    this.clearDiagram();
    this.setData(null, null);
  },
  updateAnnotationsGrid: function() {
    var annotationsGrid = this.annotationsGrid;
    if (!annotationsGrid) {
      return;
    }
    var model = this.model, modelElement = this.modelElement;
    data = {
      cells: []
    }
    var rowNum = 0;
    if (model && modelElement) {
      model.eachAnnotation(modelElement, function(annotation, i){
        data.cells.push([
          annotation.attributes.name,
          model.getNodeValue(annotation)
        ]);
      }, this);
    }
    annotationsGrid.setRowSet(data);
  },
  setData: function(model, modelElementPath){
    var oldModel = this.model;
    var oldModelElementPath = this.modelElementPath;
    if (oldModel instanceof MondrianModel &&
      (oldModel !== model || oldModelElementPath !== modelElementPath)
    ) {
//      this.saveFieldValues();
    }
    this.setModel(model);
    this.setModelElement(modelElementPath);
    if (model === null && modelElementPath === null) {
      return;
    }
    if (oldModel !== model) {
      this.modelChanged();
      this.modelElementChanged();
    }
    else
    if (model.getModelElement(oldModelElementPath) !== model.getModelElement(modelElementPath)) {
      this.modelElementChanged();
    }
    this.updateFieldValues();
    this.updateAnnotationsGrid();
  },
  clearSelectField: function(fieldName) {
    var fieldEl = this.getFieldElement(fieldName);
    while (fieldEl.options.length) {
      fieldEl.removeChild(fieldEl.options[fieldEl.options.length -1]);
    }
  },
  populateSelectField: function(fieldName, options){
    options.sort(function(a, b) {
      a = a.toLowerCase();
      b = b.toLowerCase();
      var r;
      if (a < b) {
        r = -1;
      }
      else
      if (a > b) {
        r = 1;
      }
      else {
        r = 0;
      }
      return r;
    });
    var fieldElement = this.getFieldElement(fieldName);
    if (!this.isFieldMandatory(fieldName)){
      options = [""].concat(options);
    }
    var n = options.length, option, i;
    for (i = 0; i < n; i++) {
      option = options[i];
      cEl("option", {
        label: option,
        value: option,
      }, option, fieldElement);
    }
  },
  getDiagram: function(){
    return this.diagram;
  },
  clearDiagram: function(){
    if (!this.diagram) {
      return;
    }
    this.diagram.clear();
  },
  saveDiagram: function(){
  },
  diagramActivated: function(){
    var diagram = this.getDiagram();
    if (!diagram) {
      return false;
    }
    var selectedTab = this.tabPane.getSelectedTab();
    if (!selectedTab) {
      return false;
    }
    return selectedTab.component === diagram;
  },
  updateDiagramIfDisplayed: function(){
    if (this.diagramNeedsUpdate !== true) {
      return;
    }
    if (!this.diagramActivated()) {
      return;
    }
    this.updateDiagram();
  },
  updateDiagram: function(){
  }
};
adopt(GenericEditor, ContentPane, Displayed, Observable);

(SchemaEditor = function(conf){
  linkCss("../css/phase-schema-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-schema-editor");

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = [
      {"class": "new-cube", tooltip: "New Cube", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewCube();
      }},
      {class: "separator"},
      {
        "class": "new-named-set",
        tooltip: "New Named Set",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewNamedSet();
        }
      },
      {class: "separator"},
      {"class": "new-dimension", tooltip: "New Shared Dimension", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewSharedDimension(dimensionDecorations.standard);
      }},
      {class: "separator"},
      {"class": "new-date-dimension", tooltip: "New Shared Date Dimension", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewSharedDimension(dimensionDecorations.date);
      }},
      {"class": "new-time-dimension", tooltip: "New Shared Time Dimension", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewSharedDimension(dimensionDecorations.time);
      }},
      {class: "separator"},
      {"class": "new-geography-dimension", tooltip: "New Shared Geography Dimension", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewSharedDimension(dimensionDecorations.geography);
      }},
      {group: "code", "class": "save-code", style: {display: "none"}, tooltip: "Parse and save code changes", handler: function(){
        this.parseCodeAndSaveChanges();
      }},
      {group: "code", "class": "undo-code", style: {display: "none"}, tooltip: "Reload source from document", handler: function(){
        this.loadEditorFromModel();
      }}
    ];
  }

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Schema",
  fields: {
    dataSource: {
      tagName: "select",
      labelText: "Datasource",
      mandatory: true,
      tooltipText: "Name of the JDBC datasource to use as backend.",
      dataPath: ["model", "datasourceInfo", "DataSource"],
      addValue: true
    },
    enableXmla: {
      inputType: "checkbox",
      labelText: "Enable XML/A",
      mandatory: true,
      defaultValue: true,
      tooltipText: "Enable XML/A access to this schema?",
      dataPath: ["model", "datasourceInfo", "EnableXmla"]
    },
    name: fields.name,
    description: fields.description,
    measuresCaption: {
      labelText: "Measures Caption",
      dataPath: ["modelElement", "attributes", "measuresCaption"],
      tooltipText: "The human-friendly label used to identify the measures in graphical user interfaces.",
      defaultValue: "Measures"
    },
    defaultRole: {
      tagName: "select",
      labelText: "Default Role",
      dataPath: ["modelElement", "attributes", "defaultRole"],
      tooltipText: "The name of the default role for connections to this schema."
    }
  },
  cloneModelElement: function(){
    //override. We don't want to clone just the schema element, but the entire model.
    this.fireEvent("cloneModel", {
      model: this.model
    })
  },
  getSourceTextAreaId: function(){
    return this.getId() + "-textarea";
  },
  getSourceTab: function(){
    return this.getTab("Source");
  },
  createDom: function(){
    this.conf.tabs.push({
      text: "Source",
      component: cEl("div")
    });
    var dom = SchemaEditor._super.prototype.createDom.apply(this, arguments);
    var sourceTab = this.getSourceTab();

    var textArea = cEl("textarea", {
      id: this.getSourceTextAreaId()
    }, null, sourceTab.component);
    this.setCodeDirty(false);
    return dom;
  },
  createCodeMirror: function(){
    function completeAfter(cm, pred) {
      var cur = cm.getCursor();
      if (!pred || pred()) setTimeout(function() {
        if (!cm.state.completionActive)
          cm.showHint({completeSingle: false});
      }, 100);
      return CodeMirror.Pass;
    }

    function completeIfAfterLt(cm) {
      return completeAfter(cm, function() {
        var cur = cm.getCursor();
        return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) == "<";
      });
    }

    function completeIfInTag(cm) {
      return completeAfter(cm, function() {
        var tok = cm.getTokenAt(cm.getCursor());
        if (tok.type == "string" && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1)) return false;
        var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
        return inner.tagName;
      });
    }

    var codeMirror = CodeMirror.fromTextArea(gEl(this.getSourceTextAreaId()), {
      mode: "application/xml",
      lineNumbers: true,
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      indentUnit: 2,
      smartIndent: true,
      extraKeys: {
        "'<'": completeAfter,
        "'/'": completeIfAfterLt,
        "' '": completeIfInTag,
        "'='": completeIfInTag,
        "Ctrl-Space": "autocomplete"
      },
      hintOptions: {schemaInfo: MondrianModel.SchemaInfo}
    });
    this.codeMirror = codeMirror;

    var me = this;
    codeMirror.on("changes", function(codeMirror, eventData){
      var xml = codeMirror.getDoc().getValue();
      me.setCodeDirty(xml !== me.xml);
    });
  },
  setCodeDirty: function(dirty){
    if (dirty !== this.codeDirty) {
      this.codeDirty = dirty;
      var toolbar = this.getToolbar();
      toolbar.eachButtonInGroup(function(button){
        Displayed.setDisplayed(button.getDom(), dirty);
      }, this, "code");
      this.fireEvent("dirty", dirty);
    }
  },
  afterSetDisplayed: function(displayed){
    if (displayed) {
      this.refreshCodeMirror();
    }
  },
  parseCodeAndSaveChanges: function(){
    var xml = this.codeMirror.getDoc().getValue();
    var doc;
    try {
      doc = parseXmlText(xml);
    }
    catch (exception) {
      var me = this;
      this.dialog.show({
        message:  "Couldn't parse the schema because of: \n" +
                  exception +
                  "\nDo you want to restore? Restoring will lose your changes",
        title:    "Parse Error",
        yes: {
          handler:  function(){
                      me.loadEditorFromModel();
                    },
          label: "Restore"
        },
        no: {
          label: "Cancel"
        }
      });
      return;
    }
    this.model.setDocument(doc);
  },
  loadEditorFromModel: function(){
    var value;
    if (this.model) {
      value = this.model.toXml();
      this.xml = value;
      this.dirty = false;
    }
    else {
      value = "";
    }
    this.codeMirror.getDoc().setValue(value);
    this.setCodeDirty(false);
  },
  refreshCodeMirror: function(){
    var tab = this.tabPane.getSelectedTab();
    if (tab !== this.getSourceTab()) {
      return;
    }
    var codeMirror = this.codeMirror;
    if (!codeMirror) {
      return;
    }
    this.loadEditorFromModel();
    window.setTimeout(function(){
      codeMirror.setSize(
        tab.component.clientWidth,
        tab.component.clientHeight - 30
      );
      codeMirror.refresh();
    }, 200);
  },
  initSourceCodeEditor: function(){
    if (!this.codeMirror) {
      this.createCodeMirror();
    }
    var codeMirror = this.codeMirror;
    codeMirror.focus();
    this.refreshCodeMirror();
  },
  handleModelEvent: function(event, data){
    GenericEditor.prototype.handleModelEvent.call(this, event, data);
    switch (event) {
      case "modelElementRemoved":
      case "modelElementCreated":
      case "modelElementMoved":
      case "modelElementRepositioned":
      case "modelElementAttributeSet":
      case "modelDirty":
        if (!this.codeMirror) {
          return;
        }
        this.initSourceCodeEditor();
        break;
    }
  },
  modelChanged: function(){
    if (!this.codeMirror) {
      return;
    }
    this.initSourceCodeEditor();
  },
  tabSelected: function(tabPane, event, data){
    GenericEditor.prototype.tabSelected.call(this, tabPane, event, data);
    var tab = tabPane.getTab(data.newTab);
    switch (tab) {
      case this.getSourceTab():
        this.initSourceCodeEditor();
        break;
    }
  },
  createNewCube: function(){
    var cube = this.model.createCube();
    var modelElementPath = merge({
      type: "Cube",
      Cube: cube.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: this.model,
      modelElementPath: modelElementPath
    });
  },
  createNewSharedDimension: function(conf){
    if (!conf) {
      conf = dimensionDecorations.standard;
    }
    var model = this.model;
    var dimension = model.createSharedDimension(conf.attributes || {});

    //decorate the new dimension:
    var dimensionName = dimension.attributes.name;
    //create hierarchies
    for (var i = 0; i < conf.hierarchies.length; i++) {
      var hierarchy = model.createSharedDimensionHierarchy(
        dimensionName,
        conf.hierarchies[i].attributes || {},
        true
      );
      var hierarchyName = hierarchy.attributes.name;
      //create levels
      for (var j = 0; j < conf.hierarchies[i].levels.length; j++) {
        var level = model.createSharedDimensionLevel(
          dimensionName, hierarchyName,
          conf.hierarchies[i].levels[j].attributes || {},
          true
        );
        //create annotations
        var annotation, annotations = conf.hierarchies[i].levels[j].annotations;
        for (annotation in annotations) {
          model.setAnnotationValue(level, annotation, annotations[annotation]);
        }
      }
    }
    //end decoration

    var modelElementPath = merge({
      type: "SharedDimension",
      SharedDimension: dimension.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: model,
      modelElementPath: modelElementPath
    });
  },
  fieldCreated: function(fieldset, key, definition, tabIndex){
    switch (key) {
      case "dataSource":
        this.populateDataSourceList();
        listen(this.getFieldElement(key), "change", function(){
          this.pedisCache.setConnection(this.getFieldValue("dataSource"));
        }, this);
        break;
    }
  },
  populateDataSourceList: function(){
    var me = this;
    this.pedisCache.loadConnections({
      success: function(data){
        var i, n = data.length, item, names = [""];
        for (i = 0; i < n; i++) {
          item = data[i];
          names.push(item.name);
        }
        var fieldName = "dataSource";
        me.populateSelectField(fieldName, names);
        me.updateFieldValue(fieldName);
      }
    });
  }
};
adopt(SchemaEditor, GenericEditor);

(CubeEditor = function(conf){
  linkCss("../css/phase-cube-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-cube-editor");

  this.diagram = new CubeDiagram({
    pedisCache: conf.pedisCache,
    dnd: conf.dnd,
    classes: ["phase-cube-diagram"],
    listeners: {
      scope: this,
      editDiagramElement: function(diagram, event, data){
        this.fireEvent(event, data);
      },
      removeDiagramElement: function(diagram, event, data){
        var objectType = data.objectType;
        var object = data.object;
        var modelElementPath = merge({}, this.modelElementPath);
        switch (objectType){
          case "privatedimension":
            modelElementPath.type = "PrivateDimension";
            modelElementPath[modelElementPath.type] = object.dimension.attributes.name;
            break;
          case "dimensionusage":
            modelElementPath.type = "DimensionUsage";
            modelElementPath[modelElementPath.type] = object.dimension.attributes.name;
            break;
          case "measure":
            modelElementPath.type = "Measure";
            modelElementPath[modelElementPath.type] = object.measure.attributes.name;
            break;
          case "relation":
            modelElementPath.type = "Table";
            modelElementPath[modelElementPath.type] = object.metadata.alias || object.metadata.TABLE_NAME;
            this.removeCubeRelation(modelElementPath);
            return;
          default:
            return;
        }
        this.model.removeModelElement(modelElementPath);
      },
      changeName: function(diagram, event, data){
      },
      captionChanged: function(diagram, event, data){
        var modelElementPath = merge({}, this.modelElementPath);
        switch (data.objectType) {
          case "shareddimension":
            debugger;
            return;
          case "dimensionusage":
            modelElementPath.type = "DimensionUsage";
            modelElementPath[modelElementPath.type] = data.object.dimension.attributes.name;
            break;
          case "privatedimension":
            modelElementPath.type = "PrivateDimension";
            modelElementPath[modelElementPath.type] = data.object.dimension.attributes.name;
            break;
          case "measure":
            modelElementPath.type = "Measure";
            modelElementPath[modelElementPath.type] = data.object.measure.attributes.name;
            break;
          case "relation":
          default:
            return;
        }
        this.model.setAttributeValue(modelElementPath, "caption", data.newValue);
      },
      nameChanged: function(diagram, event, data){
        var modelElementPath = merge({}, this.modelElementPath);
        switch (data.objectType) {
          case "shareddimension":
            this.model.changeSharedDimensionName(
              data.object.dimension.attributes.name,
              data.newValue
            );
            return;
          case "dimensionusage":
            modelElementPath.type = "DimensionUsage";
            modelElementPath[modelElementPath.type] = data.object.dimension.attributes.name;
            break;
          case "privatedimension":
            modelElementPath.type = "PrivateDimension";
            modelElementPath[modelElementPath.type] = data.object.dimension.attributes.name;
            break;
          case "measure":
            modelElementPath.type = "Measure";
            modelElementPath[modelElementPath.type] = data.object.measure.attributes.name;
            break;
          case "relation":
          default:
            return;
        }
        this.model.setAttributeValue(modelElementPath, "name", data.newValue);
      },
      aggregatorChanged: function(diagram, event, data){
        var modelElementPath = merge({}, this.modelElementPath);
        switch (data.objectType) {
          case "measure":
            modelElementPath.type = "Measure";
            modelElementPath[modelElementPath.type] = data.object.measure.attributes.name;
            this.model.setAttributeValue(modelElementPath, "aggregator", data.newValue);
            break;
          default:
        }
      },
      createTable: function(diagram, event, conf) {
        var relation = this.model.getCubeRelation(this.modelElementPath);
        if (relation) {
          this.dialog.show({
            message:  "Currently only one fact table is supported. " +
                      "Replace the current fact table?",
            title:    "Replace fact table?",
            yes:      {
                        handler: function(){

                        },
                        scope: this
                      },
            no:       {}
          });
          return;
        }
        this.createCubeRelation(conf);
      },
      createMeasure: function(diagram, event, conf){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewMeasure(conf);
      }
    }
  });

  if (!conf.tabs) {
    conf.tabs = [{
      text: "General",
      selected: true,
      component: cEl("div")
    }, {
      text: "Diagram",
      component: this.diagram
    }];
  }

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = [
      {
        "class": "new-measure",
        tooltip: "New Measure",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewMeasure();
        }
      },
      {
        "class": "new-calculated-member",
        tooltip: "New Calculated Member",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewCalculatedMember();
        }
      },
      {
        "class": "new-named-set",
        tooltip: "New Named Set",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewNamedSet();
        }
      },
      {class: "separator"},
      {
        "class": "new-dimension-usage",
        tooltip: "New Dimension Usage",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewDimensionUsage();
        }
      },
      {class: "separator"},
      {
        "class": "new-dimension",
        tooltip: "New Private Dimension",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewPrivateDimension(dimensionDecorations.standard);
        }
      },
      {class: "separator"},
      {"class": "new-date-dimension", tooltip: "New Private Date Dimension", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewPrivateDimension(dimensionDecorations.date);
      }},
      {"class": "new-time-dimension", tooltip: "New Private Time Dimension", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewPrivateDimension(dimensionDecorations.time);
      }},
      {class: "separator"},
      {"class": "new-geography-dimension", tooltip: "New Private Geography Dimension", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewPrivateDimension(dimensionDecorations.geography);
      }}
    ];
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Cube",
  fields: {
    name: fields.name,
    caption: fields.caption,
    defaultMeasure: {
      tagName: "select",
      labelText: "Default Measure",
      dataPath: ["modelElement", "attributes", "defaultMeasure"],
      tooltipText: "The name of the measure that would be taken as the default measure of the cube.",
      addValue: true
    },
    visible: fields.visible,
    enabled: fields.enabled,
    cache: fields.cache,
    description: fields.description
  },
  removeCubeRelation: function(modelElementPath){
    var relation = this.model.getCubeRelation(modelElementPath);
    var annotationPrefix = this.getCubeTableAnnotationPrefix(
      relation.attributes.alias,
      relation.attributes.name
    );
    this.model.removeAnnotationsWithPrefix(
      this.model.getModelElementParentPath(modelElementPath),
      annotationPrefix
    );
    this.model.removeModelElement(modelElementPath);
  },
  handleModelEvent: function(event, data){
    GenericEditor.prototype.handleModelEvent.call(this, event, data);
    var modelElement = data.modelElement;
    switch (data.modelElementPath.type) {
      case "Measure":
        this.updateDefaultMeasureField();
        break;
      case "Table":
        if (event === "modelElementCreated") {
          var attributes = modelElement.attributes;
          var annotationPrefix = this.getCubeTableAnnotationPrefix(attributes.alias, attributes.name);
          var x = parseInt(this.model.getAnnotationValue(this.modelElement, annotationPrefix + "x"), 10);
          var y = parseInt(this.model.getAnnotationValue(this.modelElement, annotationPrefix + "y"), 10);
          data.x = x;
          data.y = y;
        }
        break;
    }
  },
  updateDefaultMeasureField: function(){
    var fieldName = "defaultMeasure";
    var cube = this.modelElement;
    var options = [];
    this.model.eachMeasure(cube, function(measure){
      options.push(measure.attributes.name);
    });
    this.model.eachCalculatedMeasure(cube, function(measure){
      options.push(measure.attributes.name);
    });
    this.clearSelectField(fieldName);
    this.populateSelectField(fieldName, options);
  },
  getCubeName: function(){
    return this.modelElement.attributes.name;
  },
  getSharedDimensionAnnotationPrefix: function(sharedDimension){
    return "phase.sharedDimension." + sharedDimension.attributes.name + ".";
  },
  getCubeDimensionAnnotationPrefix: function(cubeDimension) {
    return "phase.";
  },
  addSharedDimensionToDiagram: function(sharedDimension){
    var annotationPrefix = this.getSharedDimensionAnnotationPrefix(sharedDimension);
    var rec = {
      dimension: sharedDimension
    };
    var cube = this.modelElement;
    var x = this.model.getAnnotationValue(cube, annotationPrefix + "x");
    if (x) {
      rec.x = x;
    }
    var y = this.model.getAnnotationValue(cube, annotationPrefix + "y");
    if (y) {
      rec.y = y;
    }
    this.diagram.addSharedDimension(rec);
  },
  addCubeDimensionToDiagram: function(cubeDimension){
    var annotationPrefix = this.getCubeDimensionAnnotationPrefix(cubeDimension);
    var rec = {
      dimension: cubeDimension
    };
    var x = this.model.getAnnotationValue(cubeDimension, annotationPrefix + "x");
    if (x) {
      rec.x = x;
    }
    var y = this.model.getAnnotationValue(cubeDimension, annotationPrefix + "y");
    if (y) {
      rec.y = y;
    }
    this.diagram.addCubeDimension(rec);
  },
  addDimensionUsageToDiagram: function(dimensionUsage){
    var sharedDimensionName = dimensionUsage.attributes.source;
    var diagram = this.getDiagram();
    if (!diagram.hasSharedDimension(sharedDimensionName)) {
      var model = this.model;
      var sharedDimension = model.getSharedDimension(sharedDimensionName);
      if (sharedDimension) {
        this.addSharedDimensionToDiagram(sharedDimension);
      }
    }
    this.addCubeDimensionToDiagram(dimensionUsage);
  },
  addDimensionUsagesToDiagram: function(){
    var model = this.model;
    var cubeName = this.getCubeName();
    model.eachDimensionUsage(cubeName, function(dimensionUsage, index){
      this.addDimensionUsageToDiagram(dimensionUsage);
    }, this);
  },
  addPrivateDimensionsToDiagram: function(){
    var model = this.model;
    var cubeName = this.getCubeName();
    model.eachPrivateDimension(cubeName, function(privateDimension, index){
      this.addCubeDimensionToDiagram(privateDimension);
    }, this);
  },
  addCubeDimensionsToDiagram: function(){
    this.addDimensionUsagesToDiagram();
    this.addPrivateDimensionsToDiagram();
  },
  getMeasureAnnotationPrefix: function(measure) {
    return "phase.";
  },
  addMeasureToDiagram: function(measure){
    var annotationPrefix = this.getMeasureAnnotationPrefix(measure);
    var rec = {
      measure: measure
    };
    var x = this.model.getAnnotationValue(measure, annotationPrefix + "x");
    if (x) {
      rec.x = x;
    }
    var y = this.model.getAnnotationValue(measure, annotationPrefix + "y");
    if (y) {
      rec.y = y;
    }
    this.diagram.addMeasure(rec);
  },
  addMeasuresToDiagram: function(){
    var model = this.model;
    var cubeName = this.getCubeName();
    model.eachMeasure(cubeName, function(measure, index){
      this.addMeasureToDiagram(measure);
    }, this);
  },
  getCubeTableAnnotationPrefix: function(alias, name){
    var annotationPrefix = "phase.Table." + (alias || name) + ".";
    return annotationPrefix;
  },
  createCubeRelation: function(conf){
    var metadata = conf.metadata;
    var annotationPrefix = this.getCubeTableAnnotationPrefix(metadata.alias, metadata.TABLE_NAME);
    var model = this.model;
    var cube = this.modelElement;
    var cubeName = this.modelElementPath.Cube;
    model.setAnnotationValue(cube, annotationPrefix + "x", conf.x, true);
    model.setAnnotationValue(cube, annotationPrefix + "y", conf.y, true);
    var attributes = {
      name: metadata.TABLE_NAME
    };
    if (metadata.TABLE_SCHEMA) {
      attributes.schema = metadata.TABLE_SCHEMA;
    }
    if (metadata.alias){
      attributes.alias = metadata.alias;
    }
    model.createCubeTable(cubeName, attributes);
  },
  cubeRelationAdded: function(data){
    this.addMeasuresToDiagram();
    this.addCubeDimensionsToDiagram();
    var me = this;
    window.setTimeout(function(){
      me.diagram.updateAllRelationships();
    }, 100);
  },
  addCubeRelationToDiagram: function(){
    this.getCubeRelationInfo(function(rec){
      if (rec) {
        this.diagram.addTable(rec, this.cubeRelationAdded, this);
      }
      else {
        this.cubeRelationAdded();
      }
    }, this);
  },
  saveDiagram: function() {
    var diagram = this.diagram;
    var diagramModel = diagram.getDiagramModel();
    var model = this.model;
    var cube = this.modelElement;

    diagramModel.eachSharedDimension(function(rec, index){
      var sharedDimension = rec.dimension;
      var annotationPrefix = this.getSharedDimensionAnnotationPrefix(sharedDimension);
      model.setAnnotationValue(cube, annotationPrefix + "x", rec.x, true);
      model.setAnnotationValue(cube, annotationPrefix + "y", rec.y, true);
    }, this);

    diagramModel.eachCubeDimension(function(rec, index){
      var cubeDimension = rec.dimension;
      var annotationPrefix = this.getCubeDimensionAnnotationPrefix(cubeDimension);
      model.setAnnotationValue(cubeDimension, annotationPrefix + "x", rec.x, true);
      model.setAnnotationValue(cubeDimension, annotationPrefix + "y", rec.y, true);
    }, this);

    diagramModel.eachMeasure(function(rec, index){
      var measure = rec.measure;
      var annotationPrefix = this.getMeasureAnnotationPrefix(measure);
      model.setAnnotationValue(measure, annotationPrefix + "x", rec.x, true);
      model.setAnnotationValue(measure, annotationPrefix + "y", rec.y, true);
    }, this);

    diagramModel.eachTable(function(rec, index){
      var cubeRelation = this.model.getCubeRelation(this.modelElementPath);
      if (!cubeRelation) return;
      var annotationPrefix = this.getCubeRelationAnnotationPrefix(cubeRelation);
      var cube = this.modelElement;
      model.setAnnotationValue(cube, annotationPrefix + "x", rec.x, true);
      model.setAnnotationValue(cube, annotationPrefix + "y", rec.y, true);
    }, this);
  },
  afterSetDisplayed: function(displayed){
    if (displayed) {
      this.updateDiagramIfDisplayed();
    }
  },
  updateDiagram: function(){
    this.saveDiagram();
    this.clearDiagram();
    if (this.model && this.modelElement) {
      this.addCubeRelationToDiagram();
    }
    this.diagramNeedsUpdate = false;
  },
  tabSelected: function(tabPane, event, data){
    GenericEditor.prototype.tabSelected.call(this, tabPane, event, data);
    this.fireEvent("diagramActivation", this.diagramActivated());
    this.saveFieldValues();
    this.updateDiagramIfDisplayed();
    this.updateFieldValues();
  },
  modelElementChanged: function(){
    this.updateDefaultMeasureField();

    this.clearDiagram();
    this.diagramNeedsUpdate = true;

    this.updateDiagramIfDisplayed();
  },
  createNewMeasure: function(conf){
    var cubeName = this.modelElement.attributes.name;
    var attributes, annotations;
    if (conf) {
      attributes = {
        name: conf.metadata.COLUMN_NAME,
        column: conf.metadata.COLUMN_NAME
      };
      var annotationPrefix = this.getMeasureAnnotationPrefix();
      annotations = {};
      annotations[annotationPrefix + "x"] = conf.x;
      annotations[annotationPrefix + "y"] = conf.y;
    }
    var measure = this.model.createMeasure(cubeName, attributes, annotations, false);
    var modelElementPath = merge({
      type: "Measure",
      Measure: measure.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: this.model,
      modelElementPath: modelElementPath
    });
  },
  createNewCalculatedMember: function(){
    var cubeName = this.modelElement.attributes.name;
    var calculatedMember = this.model.createCalculatedMember(cubeName);
    var modelElementPath = merge({
      type: "CalculatedMember",
      CalculatedMember: calculatedMember.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: this.model,
      modelElementPath: modelElementPath
    });
  },
  createNewPrivateDimension: function(conf){
    if (!conf) {
      conf = dimensionDecorations.standard;
    }
    var model = this.model;
    var cubeName = this.modelElement.attributes.name;
    var privateDimension = model.createPrivateDimension(cubeName, conf.attributes);

    //decorate the new dimension with a new hierarchy
    var dimensionName = privateDimension.attributes.name;
    //create hierarchies
    for (var i = 0; i < conf.hierarchies.length; i++) {
      var hierarchy = model.createPrivateDimensionHierarchy(
        cubeName,
        dimensionName,
        conf.hierarchies[i].attributes || {},
        true
      );
      var hierarchyName = hierarchy.attributes.name;
      //create levels
      for (var j = 0; j < conf.hierarchies[i].levels.length; j++) {
        var level = model.createPrivateDimensionLevel(
          cubeName, dimensionName, hierarchyName,
          conf.hierarchies[i].levels[j].attributes || {},
          true
        );
        //create annotations
        var annotation, annotations = conf.hierarchies[i].levels[j].annotations;
        for (annotation in annotations) {
          model.setAnnotationValue(level, annotation, annotations[annotation]);
        }
      }
    }
    //end decoration

    var modelElementPath = merge({
      type: "PrivateDimension",
      PrivateDimension: privateDimension.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: model,
      modelElementPath: modelElementPath
    });
  },
  createNewDimensionUsage: function(){
    var cubeName = this.modelElement.attributes.name;
    var dimensionUsage = this.model.createDimensionUsage(cubeName);
    var modelElementPath = merge({
      type: "DimensionUsage",
      DimensionUsage: dimensionUsage.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: this.model,
      modelElementPath: modelElementPath
    });
  }
};
adopt(CubeEditor, GenericEditor);

(VirtualCubeEditor = function(conf){
  linkCss("../css/phase-virtualcube-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-virtualcube-editor");

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = [
      {
        "class": "new-cube-usage",
        tooltip: "New Cube Usage",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewCubeUsage();
        }
      },
      {class: "separator"},
      {
        "class": "new-calculated-member",
        tooltip: "New Calculated Member",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewCalculatedMember();
        }
      },
      {
        "class": "new-named-set",
        tooltip: "New Named Set",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewNamedSet();
        }
      },
      {class: "separator"},
      {
        "class": "new-virtual-dimension",
        tooltip: "New Virtual Dimension",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewCubeUsage();
        }
      }
    ];
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "VirtualCube",
  fields: CubeEditor.prototype.fields,
  handleModelEvent: function(event, data){
    GenericEditor.prototype.handleModelEvent.call(this, event, data);
    var modelElement = data.modelElement;
    switch (data.modelElementPath.type) {
      case "VirtualCubeMeasure":
        this.updateDefaultMeasureField();
        break;
    }
  },
  updateDefaultMeasureField: function(){
    var fieldName = "defaultMeasure";
    var virtualCube = this.modelElement;
    var options = [];
    this.model.eachVirtualMeasure(virtualCube, function(virtualCubeMeasure, i){
      options.push(virtualCubeMeasure.attributes.name);
    });
    this.clearSelectField(fieldName);
    this.populateSelectField(fieldName, options);
  },
  createNewCubeUsage: function(){

  },
  createNewCalculatedMember: function(){
  }
};
adopt(VirtualCubeEditor, GenericEditor);

(CubeUsageEditor = function(conf){
  linkCss("../css/phase-cubeusage-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-cubeusage-editor");

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = [
      {
        "class": "new-measure",
        tooltip: "New Virtual Measure",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewVirtualMeasure();
        }
      },
      {class: "separator"},
      {
        "class": "new-dimension",
        tooltip: "New Virtual Dimension",
        handler: function(){
          if (!this.beforeCreateNew()){
            return;
          }
          this.createNewVirtualDimension();
        }
      },
    ];
  }

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "CubeUsage",
  fields: {
    cubeName: {
      labelText: "Cube Name",
      dataPath: ["modelElement", "attributes", "cubeName"],
      mandatory: true,
      tooltipText: "Name of the imported cube.",
      tagName: "select"
    },
    ignoreUnrelatedDimensions: {
      inputType: "checkbox",
      labelText: "Rollup Unrelated Dimensions",
      dataPath: ["modelElement", "attributes", "ignoreUnrelatedDimensions"],
      defaultValue: false,
      tooltipText: "Should dimensions that are not related to selected measures be pushed to top level member?"
    }
  },
  createNewVirtualMeasure: function(){
  },
  createNewVirtualDimension: function(){
  },
  updateCubeNameField: function(){
    var fieldName = "cubeName";
    var virtualCube = this.modelElement;
    var options = [""];
    this.model.eachCube(function(cube, i){
      options.push(cube.attributes.name);
    });
    this.clearSelectField(fieldName);
    this.populateSelectField(fieldName, options);
  },
  modelElementChanged: function(){
    this.updateCubeNameField();
  }
};
adopt(CubeUsageEditor, GenericEditor);

(MeasureEditor = function(conf){
  linkCss("../css/phase-measure-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-measure-editor");

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Measure",
  fields: {
    name: fields.name,
    caption: fields.caption,
    aggregator: {
      tagName: "select",
      labelText: "Aggregator",
      dataPath: ["modelElement", "attributes", "aggregator"],
      options: MondrianModel.SchemaInfoValues.aggregator,
      mandatory: true,
      defaultValue: "",
      tooltipText: "The function used to aggregate this measure's values."
    },
    column: fields.column,
    datatype: fields.datatype,
    formatString: fields.formatString,
    visible: fields.visible,
    description: fields.description
  },
  updateColumnField: function(){
    var fieldName = "column";
    this.clearSelectField(fieldName);
    this.getCubeRelationInfo(function(data){
      var options = [];
      if (data) {
        var metadata = data.metadata;
        var info = metadata.info;
        var columns = info.columns;
        var i, column, n = columns.length;
        for (i = 0; i < n; i++) {
          column = columns[i];
          options.push(column.COLUMN_NAME);
        }
      }
      this.populateSelectField(fieldName, options);
      this.setSelectFieldValue(fieldName, this.modelElement.attributes.column);
    }, this);
  },
  modelElementChanged: function(){
    this.updateColumnField()
  }
};
adopt(MeasureEditor, GenericEditor);

(NamedSetEditor = function(conf){
  linkCss("../css/phase-named-set-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-named-set-editor");

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Named Set",
  fields: {
    name: fields.name,
    caption: fields.caption,
    formula: fields.formula,
    description: fields.description
  }
};
adopt(NamedSetEditor, GenericEditor);

(CalculatedMemberEditor = function(conf){
  linkCss("../css/phase-calculated-member-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-calculated-member-editor");

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Calculated Member",
  fields: {
    name: fields.name,
    caption: fields.caption,
    formula: fields.formula,
    hierarchy: {
      tagName: "select",
      labelText: "Hierarchy",
      dataPath: ["modelElement", "attributes", "hierarchy"],
      tooltipText: "Name of the hierarchy that this member belongs to.",
      addValue: true
    },
    parent: {
      labelText: "Parent Member",
      dataPath: ["modelElement", "attributes", "parent"],
      tooltipText: "Fully-qualified name of the parent member."
    },
    formatString: fields.formatString,
    visible: fields.visible,
    description: fields.description
  },
  handleModelEvent:function(event, data){
    GenericEditor.prototype.handleModelEvent.call(this, event, data);
    switch (data.modelElementPath.type) {
      case "Hierarchy":
        switch (event) {
          case "modelElementCreated":
          case "modelElementRemoved":
            this.updateHierarchyField();
            break;
          default:
        }
        break;
      default:
    }
  },
  fieldSaved: function(field, value) {
    var modelElement = this.modelElement;
    switch (field) {
      case "hierarchy":
        if (modelElement) {
          if (modelElement.attributes.dimension) {
            modelElement.attributes.dimension = value;
          }
        }
        break;
    }
  },
  fieldUpdated: function(field, value) {
    var modelElement = this.modelElement;
    switch (field) {
      case "hierarchy":
        if (modelElement) {
          if (!modelElement.attributes.hierarchy && modelElement.attributes.dimension) {
            this.setSelectFieldValue(field, modelElement.attributes.dimension);
          }
        }
        break;
    }
  },
  updateHierarchyField: function(){
    var model = this.model;
    var modelElementPath = this.modelElementPath;
    var fieldName = "hierarchy";
    var options = ["", "Measures"];
    if (modelElementPath) {
      if (modelElementPath.Cube) {
        var cube = model.getCube(modelElementPath.Cube);
        model.eachPrivateDimension(cube, function(privateDimension, i){
          var dimensionName = privateDimension.attributes.name;
          model.eachDimensionHierarchy(privateDimension, function(hierarchy, i){
            var hierarchyName = dimensionName;
            if (hierarchy.attributes.name) {
              hierarchyName += hierarchy.attributes.name;
            }
            options.push(hierarchyName);
          });
        });
        model.eachDimensionUsage(cube, function(dimensionUsage, i){
          var dimensionName = dimensionUsage.attributes.name;
          var sharedDimensionName = dimensionUsage.attributes.source;
          model.eachDimensionHierarchy(sharedDimensionName, function(hierarchy, i){
            var hierarchyName = dimensionName;
            if (hierarchy.attributes.name) {
              hierarchyName += hierarchy.attributes.name;
            }
            options.push(hierarchyName);
          });
        });
      }
      else
      if (modelElementPath.VirtualCube){
        var virtualCube = model.getVirtualCube(modelElementPath.VirtualCube);
        model.eachVirtualCubeDimension(virtualCube, function(virtualCubeDimension, i){
          //TODO: load hierarchies for virtual cubes.
        });
      }
    }
    this.clearSelectField(fieldName);
    this.populateSelectField(fieldName, options);
  },
  modelChanged: function(){
    this.updateHierarchyField();
  },
};
adopt(CalculatedMemberEditor, GenericEditor);

(SharedDimensionEditor = function(conf){
  linkCss("../css/phase-dimension-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-dimension-editor");
  conf.classes.push("phase-shared-dimension-editor");

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = SharedDimensionEditor.prototype.toolbarButtons;
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  toolbarButtons: [
    {"class": "new-hierarchy", tooltip: "New Hierarchy", handler: function(){
      if (!this.beforeCreateNew()){
        return;
      }
      this.createNewHierarchy();
    }}
  ],
  objectType: "Shared Dimension",
  fields: {
    name: fields.name,
    caption: fields.caption,
    visible: fields.visible,
    description: fields.description
  },
  getFields: function(){
    return merge(SharedDimensionEditor.prototype.fields, {
      dimensiontype: fields.dimensionType,
      highCardinality: fields.highCardinality
    });
  },
  createNewHierarchy: function(){
    var model = this.model;
    var dimensionName = this.modelElement.attributes.name;
    var hierarchy = model.createSharedDimensionHierarchy(dimensionName);

    //decorate hierarchy
    var hierarchyName = hierarchy.attributes.name;
    var level = model.createSharedDimensionLevel(
      dimensionName, hierarchyName, null, true
    );
    //end decoration

    var modelElementPath = merge({
      type: "Hierarchy",
      Hierarchy: hierarchy.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: model,
      modelElementPath: modelElementPath
    });
  }
};
adopt(SharedDimensionEditor, GenericEditor);

(PrivateDimensionEditor = function(conf){
  linkCss("../css/phase-dimension-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-dimension-editor");
  conf.classes.push("phase-private-dimension-editor");

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = SharedDimensionEditor.prototype.toolbarButtons;
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Private Dimension",
  fields: {
    usagePrefix: fields.usagePrefix,
    foreignKey: fields.foreignKey
  },
  getFields: function(){
    return merge({},
      SharedDimensionEditor.prototype.getFields.call(),
      this.fields
    );
  },
  createNewHierarchy: function(){
    var model = this.model;
    var cubeName = this.modelElementPath.Cube;
    var dimensionName = this.modelElement.attributes.name;
    var hierarchy = model.createPrivateDimensionHierarchy(cubeName, dimensionName);

    //decorate hierarchy
    var hierarchyName = hierarchy.attributes.name;
    var level = model.createPrivateDimensionLevel(
      cubeName, dimensionName, hierarchyName, null, true
    );
    //end decoration

    var modelElementPath = merge({
      type: "Hierarchy",
      Hierarchy: hierarchy.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: model,
      modelElementPath: modelElementPath
    });
  },
  updateForeignKeyField: function(){
    var fieldName = "foreignKey";
    this.clearSelectField(fieldName);
    this.getCubeRelationInfo(function(data){
      var options = [];
      if (data) {
        var metadata = data.metadata;
        var info = metadata.info;
        var columns = info.columns;
        var i, column, n = columns.length;
        for (i = 0; i < n; i++) {
          column = columns[i];
          options.push(column.COLUMN_NAME);
        }
      }
      this.populateSelectField(fieldName, options);
      this.setSelectFieldValue(fieldName, this.modelElement.attributes.foreignKey);
    }, this);
  },
  modelElementChanged: function(){
    this.updateForeignKeyField()
  }
};
adopt(PrivateDimensionEditor, GenericEditor);

(DimensionUsageEditor = function(conf){
  linkCss("../css/phase-dimension-usage-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-dimension-usage-editor");
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Shared Dimension Usage",
  fields: merge(
    {
      source: {
        labelText: "Shared Dimension",
        tagName: "select",
        dataPath: ["modelElement", "attributes","source"],
        mandatory: true,
        tooltipText: "The name of the shared dimension that used by this cube.",
        addValue: true
      },
      level: {
        labelText: "Join to Level",
        tagName: "select",
        dataPath: ["modelElement", "attributes","level"],
        tooltipText: "Name of the level to join to. If not specified, joins to the lowest level of the dimension.",
        addValue: true
      }
    },
    SharedDimensionEditor.prototype.fields,
    PrivateDimensionEditor.prototype.fields
  ),
  handleModelEvent:function(event, data){
    GenericEditor.prototype.handleModelEvent.call(this, event, data);
    switch (data.modelElementPath.type) {
      case "SharedDimension":
        switch (event) {
          case "modelElementCreated":
          case "modelElementRemoved":
            this.updateSharedDimensionsField();
            break;
          default:
        }
        break;
      default:
    }
  },
  updateSharedDimensionsField: function(){
    var fieldName = "source";
    var options = [""];
    this.model.eachSharedDimension(function(sharedDimension){
      options.push(sharedDimension.attributes.name);
    });
    this.clearSelectField(fieldName);
    this.populateSelectField(fieldName, options);
  },
  modelChanged: function(){
    this.updateSharedDimensionsField();
  },
  updateForeignKeyField: PrivateDimensionEditor.prototype.updateForeignKeyField,
  modelElementChanged: PrivateDimensionEditor.prototype.modelElementChanged,
};
adopt(DimensionUsageEditor, GenericEditor);

(HierarchyEditor = function(conf){
  linkCss("../css/phase-hierarchy-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-hierarchy-editor");

  this.diagram = new HierarchyDiagram({
    pedisCache: conf.pedisCache,
    dnd: conf.dnd,
    classes: ["phase-hierarchy-diagram"],
    listeners: {
      scope: this,
      editDiagramElement: function(diagram, event, data){
        this.fireEvent(event, data);
      },
      removeDiagramElement: function(diagram, event, data){
        var objectType = data.objectType;
        var object = data.object;
        var modelElementPath = merge({}, this.modelElementPath);
        switch (objectType){
          case "level":
            modelElementPath.type = "Level";
            modelElementPath[modelElementPath.type] = object.level.attributes.name;
            this.model.removeModelElement(modelElementPath);
            break;
          case "relation":
            this.removeHierarchyRelation(data);
            return;
          default:
            return;
        }
      },
      changeName: function(diagram, event, data){
      },
      captionChanged: function(diagram, event, data){
        var modelElementPath = merge({}, this.modelElementPath);
        switch (data.objectType) {
          case "level":
            modelElementPath.type = "Level";
            modelElementPath[modelElementPath.type] = data.object.level.attributes.name;
            break;
          case "relation":
          default:
            return;
        }
        this.model.setAttributeValue(modelElementPath, "caption", data.newValue);
      },
      nameChanged: function(diagram, event, data){
        var modelElementPath = merge({}, this.modelElementPath);
        switch (data.objectType) {
          case "level":
            modelElementPath.type = "Level";
            modelElementPath[modelElementPath.type] = data.object.level.attributes.name;
            break;
          case "relation":
          default:
            return;
        }
        this.model.setAttributeValue(modelElementPath, "name", data.newValue);
      },
      createTable: function(diagram, event, conf) {
        this.createHierarchyRelation(conf);
      },
      createLevel: function(diagram, event, conf){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewLevel(conf);
      },
      primaryKeySet: function(diagram, event, data){
        this.model.setHierarchyPrimaryKey(
          this.modelElementPath,
          data.tableAlias || (data.table ? data.table.TABLE_NAME : null),
          data.columnName
        );
        this.updatePrimaryKeyTableField();
        this.updateFieldValue("primaryKeyTable");
        this.updatePrimaryKeyField();
        this.updateFieldValue("primaryKey");
      },
      tableRelationshipCreated: function(diagram, event, data){
        this.handleTableRelationshipCreated(data);
      },
      removeTableRelationship: function(diagram, event, data){
        this.handleTableRelationshipRemoved(data);
      }
    }
  });

  if (!conf.tabs) {
    conf.tabs = [{
      text: "General",
      selected: true,
      component: cEl("div")
    }, {
      text: "Diagram",
      component: this.diagram
    }];
  }

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = [
      {"class": "new-level", tooltip: "New Level", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewLevel();
      }},
    ];
  }

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Hierarchy",
  fields: {
    name: fields.name,
    caption: fields.caption,
    visible: fields.visible,
    primaryKeyTable: {
      tagName: "select",
      labelText: "Dimension Table",
      dataPath: ["modelElement", "attributes", "primaryKeyTable"],
      tooltipText: "The name of the dimension table that is bound to the fact table.",
      addValue: true
    },
    primaryKey: {
      tagName: "select",
      labelText: "Dimension Table Key",
      dataPath: ["modelElement", "attributes", "primaryKey"],
      tooltipText: "The name of the column in the dimension table that is used to bind the the fact table.",
      addValue: true
    },
    uniqueKeyLevelName: {
      tagName: "select",
      labelText: "Unique Key Level",
      dataPath: ["modelElement", "attributes", "uniqueKeyLevelName"],
      tooltipText: "Should be set to the level (if such a level exists) at which depth it is known that all members have entirely unique rows. (To optimize the query by GROUP BY elimination)",
      defaultValue: ""
    },
    description: fields.description,
    _column1: null,
    hasAll: {
      inputType: "checkbox",
      labelText: "Has \"All\" level",
      dataPath: ["modelElement", "attributes", "hasAll"],
      defaultValue: true,
      mandatory: true,
      tooltipText: "Check to specify that this hierarchy has an \"All\" level."
    },
    allLevelName: {
      labelText: "\"All\" level name",
      dataPath: ["modelElement", "attributes", "allLevelName"],
      defaultValue: "(All)",
      tooltipText: "Name of the 'all' level. If this attribute is not specified, the all member is named '(All)'."
    },
    allMemberName: {
      labelText: "\"All\" member name",
      dataPath: ["modelElement", "attributes", "allMemberName"],
      tooltipText: "Name of the \"All\" member. If this attribute is not specified, the all member is named 'All hierarchyName', for example, 'All Store'."
    },
    allMemberCaption: {
      labelText: "\"All\" member caption",
      dataPath: ["modelElement", "attributes", "allMemberCaption"],
      tooltipText: "The human-friendly label for the \"All\" member to be used in graphical front-ends."
    }
  },
  removeHierarchyRelation: function(objectInfo){
    var diagram = this.getDiagram();
    var diagramModel = diagram.getDiagramModel();
    diagramModel.removeTable(objectInfo.objectIndex);
    var annotationPrefix = this.getHierarchyTableAnnotationPrefix(
      objectInfo.object.alias,
      objectInfo.object.metadata.TABLE_NAME
    );
    this.model.removeAnnotationsWithPrefix(this.modelElementPath, annotationPrefix);
    this.recalculateHierarchyRelations();
  },
  handleModelEvent: function(event, data){
    GenericEditor.prototype.handleModelEvent.call(this, event, data);
    var modelElement = data.modelElement;
    switch (data.modelElementPath.type) {
      case "Table":
      case "Join":
        this.updatePrimaryKeyTableField();
        break;
    }
  },
  getLevelAnnotationPrefix: function(){
    var annotationPrefix = "phase.";
    return annotationPrefix;
  },
  createNewLevel: function(){
    var model = this.model;
    var modelElementPath = this.modelElementPath;
    var level;
    if (modelElementPath.SharedDimension) {
      level = model.createSharedDimensionLevel(
        modelElementPath.SharedDimension,
        modelElementPath.Hierarchy
      );
    }
    else {
      level = model.createPrivateDimensionLevel(
        modelElementPath.Cube,
        modelElementPath.PrivateDimension,
        modelElementPath.Hierarchy
      );
    }
    modelElementPath = merge({
      type: "Level",
      Level: level.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: this.model,
      modelElementPath: modelElementPath
    });
  },
  afterSetDisplayed: function(displayed){
    if (displayed) {
      this.updateDiagramIfDisplayed();
    }
  },
  recalculateHierarchyRelations: function(){
    var model = this.model;
    var diagram = this.getDiagram();
    var diagramModel = diagram.getDiagramModel();

    var tableRelationship, roots = {}, tableRelationships = {
    };
    diagramModel.eachTableRelationship(function(relationship, index){
      if (!roots[relationship.leftTable]) {
        roots[relationship.leftTable] = [];
      }

      tableRelationship = tableRelationships[relationship.leftTable];
      if (!tableRelationship) {
        tableRelationship = {
          left: [],
          right: []
        }
        tableRelationships[relationship.leftTable] = tableRelationship;
      }
      tableRelationship.left.push(relationship);

      if (tableRelationship.right.length) {
        delete roots[relationship.leftTable];
      }

      if (!roots[relationship.rightTable]) {
        roots[relationship.rightTable] = [];
      }

      tableRelationship = tableRelationships[relationship.rightTable];
      if (!tableRelationship) {
        tableRelationship = {
          left: [],
          right: []
        }
        tableRelationships[relationship.rightTable] = tableRelationship;
      }
      tableRelationship.right.push(relationship);

      if (tableRelationship.right.length) {
        delete roots[relationship.rightTable];
      }
    }, this);

    var createTableElement = function(tableIndex){
      var rec = diagramModel.getTable(tableIndex);
      var metadata = rec.metadata;
      var attributes = {
        name: metadata.TABLE_NAME,
        alias: metadata.alias
      };
      if (metadata.TABLE_SCHEM) {
        attributes.schema = metadata.TABLE_SCHEM;
      }
      return model.createElement("Table", attributes);
    }

    var makeRelation = function(tableIndex) {
      var leftRelation, tableRelationship, relationships;

      leftRelation = createTableElement(tableIndex);
      tableRelationship = tableRelationships[tableIndex];
      if (tableRelationship) {
        relationships = tableRelationship.left;

        var i, n = relationships.length, attributes, right, relationship, joinElement;
        for (i = 0; i < n; i++){
          relationship = relationships[i];
          right = diagramModel.getTable(relationship.rightTable);
          attributes = {
            leftAlias: leftRelation.attributes.alias,
            leftKey: relationship.leftColumn,
            rightAlias: right.alias || right.metadata.TABLE_NAME,
            rightKey: relationship.rightColumn
          }
          joinElement = model.createElement("Join", attributes)
          joinElement.childNodes[0] = leftRelation;
          joinElement.childNodes[1] = makeRelation(relationship.rightTable);
          leftRelation = joinElement;
        }
      }
      return leftRelation;
    }
    //
    var prevRootRelation, rootRelation, attributes;
    for (item in roots) {
      rootRelation = makeRelation(parseInt(item, 10));
      if (prevRootRelation) {
        attributes = {};
        joinElement = model.createElement("Join", attributes);
        joinElement.childNodes[0] = prevRootRelation;
        joinElement.childNodes[1] = rootRelation;
        prevRootRelation = joinElement;
      }
      else {
        prevRootRelation = rootRelation;
      }
    }
    diagramModel.eachTable(function(table, i){
      if (tableRelationships[i]) {
        return true;
      }
      rootRelation = createTableElement(i);
      if (prevRootRelation) {
        attributes = {};
        joinElement = model.createElement("Join", attributes);
        joinElement.childNodes[0] = prevRootRelation;
        joinElement.childNodes[1] = rootRelation;
        prevRootRelation = joinElement;
      }
      else {
        prevRootRelation = rootRelation;
      }
    }, this);
    model.setHierarchyTable(this.modelElementPath, prevRootRelation || rootRelation);
  },
  handleTableRelationshipCreated: function(data){
    var model = this.model;
    var diagram = this.getDiagram();
    var diagramModel = diagram.getDiagramModel();
    diagramModel.relationships.push(data);
    this.recalculateHierarchyRelations();
  },
  handleTableRelationshipRemoved: function(data){
    var model = this.model;
    var diagram = this.getDiagram();
    var diagramModel = diagram.getDiagramModel();
    var relationshipIndex = diagramModel.indexOfTableRelationship({
      leftTable: data.leftTableIndex,
      leftColumn: data.leftColumn,
      rightTable: data.rightTableIndex,
      rightColumn: data.rightColumn
    });
    if (relationshipIndex === -1) {
      throw "Relationship not found!";
    }
    diagramModel.relationships.splice(relationshipIndex, 1);
    this.recalculateHierarchyRelations();
  },
  getHierarchyRelationsInfo: function(relations, index, callback1, callback2, scope){
    if (!index) {
      index = 0;
    }

    if (index >= relations.length) {
      callback2.call(scope);
      return;
    }

    var relation = relations[index];
    switch (relation.tagName) {
      case "Table":
        break;
      //TODO: support for <View>
      default:
        //ignore anything other than Table.
        this.getHierarchyRelationsInfo(relations, ++index, callback1, callback2, scope);
        return;
    }

    this.getRelationInfo(relation, function(table){
      var tableName = relation.attributes.name;
      var alias;
      if (iUnd(relations[tableName])) {
        relations[tableName] = 0;
        alias = tableName;
      }
      else {
        alias = tableName + (++relations[tableName]);
      }
      relation.attributes.alias = alias;
      var annotationPrefix = this.getHierarchyTableAnnotationPrefix(
        alias,
        tableName
      );
      var rec = {
        metadata: table,
        alias: alias
      };
      var model = this.model, modelElement = this.modelElement;
      var x = model.getAnnotationValue(modelElement, annotationPrefix + "x");
      if (!x) {
        var diagram = this.diagram;
        var diagramModel = diagram.getDiagramModel();
        var tableId = diagram.getTableIdForIndex(diagramModel.getTableCount() - 1);
        var lastTable = gEl(tableId);
        if (lastTable) {
          x = lastTable.clientLeft + lastTable.clientWidth + 50;
        }
        else {
          x = 10;
        }
      }
      rec.x = x;
      var y = model.getAnnotationValue(modelElement, annotationPrefix + "y");
      if (y) {
        rec.y = y;
      }
      callback1.call(scope || null, rec);
      this.getHierarchyRelationsInfo(relations, ++index, callback1, callback2, scope);
    }, this);
  },
  getHierarchyTableAnnotationPrefix: function(alias, name){
    var annotationPrefix = "phase.Table." + (alias || name) + ".";
    return annotationPrefix;
  },
  createHierarchyRelation: function(conf){
    var metadata = conf.metadata;
    var tableName = metadata.TABLE_NAME;
    var alias = conf.alias;
    if (!conf.alias) {
      var relationsInfo = this.getHierarchyRelations();
      relationsInfo = relationsInfo.relations;
      var n = relationsInfo.length, i, element;
      for (i = 0; i < n; i++) {
        relationInfo = relationsInfo[i];
        if (relationInfo.tagName !== "Table") {
          continue;
        }

        if (relationInfo.attributes.name !== tableName) {
          continue;
        }

        if (iUnd(relationsInfo[tableName])) {
          relationsInfo[tableName] = 0;
        }
        else {
          relationsInfo[tableName]++;
        }
      }
      if (iUnd(relationsInfo[tableName])) {
        alias = tableName;
      }
      else {
        alias = tableName + (relationsInfo[tableName] + 1);
      }
      conf.alias = alias;
    }
    var annotationPrefix = this.getHierarchyTableAnnotationPrefix(alias, tableName);
    var model = this.model;
    var hierarchy = this.modelElement;
    model.setAnnotationValue(hierarchy, annotationPrefix + "x", conf.x, true);
    model.setAnnotationValue(hierarchy, annotationPrefix + "y", conf.y, true);
    var attributes = {
      name: tableName
    };
    if (metadata.TABLE_SCHEMA) {
      attributes.schema = metadata.TABLE_SCHEMA;
    }
    attributes.alias = alias;
    model.createHierarchyTable(this.modelElementPath, attributes);
  },
  addTableRelationshipToDiagram: function(relationship) {
    var join = relationship.join;
    var joinAttributes = join.attributes;

    var diagram = this.diagram;
    var diagramModel = diagram.getDiagramModel();

    var rec;
    rec = {};
    if (joinAttributes.leftAlias) {
      rec.alias = joinAttributes.leftAlias;
    }
    else
    if (join.childNodes[0].attributes.alias){
      rec.alias = join.childNodes[0].attributes.alias;
    }
    else {
      rec.TABLE_NAME = join.childNodes[0].attributes.name;
    }

    var leftIndex = diagramModel.getTableIndex(rec);
    var leftColumn = joinAttributes.leftKey;

    rec = {};
    if (joinAttributes.rightAlias) {
      rec.alias = joinAttributes.rightAlias;
    }
    else
    if (join.childNodes[1].attributes.alias){
      rec.alias = join.childNodes[1].attributes.alias;
    }
    else {
      rec.TABLE_NAME = join.childNodes[1].attributes.name;
    }
    var rightIndex = diagramModel.getTableIndex(rec);
    var rightColumn = joinAttributes.rightKey;
    diagramModel.addTableRelationship({
      leftTable: leftIndex,
      leftColumn: leftColumn,
      rightTable: rightIndex,
      rightColumn: rightColumn
    });
  },
  addTableRelationshipsToDiagram: function(){
    var relationsInfo = this.getHierarchyRelations();
    var relationships = relationsInfo.relationships,
        relationship, i, n = relationships.length,
        joinAttributes
    ;
    for (i = 0; i < n; i++){
      relationship = relationships[i];
      joinAttributes = relationship.join.attributes;
      if (iUnd(joinAttributes.leftKey) || iUnd(joinAttributes.rightKey)) {
        continue;
      }
      this.addTableRelationshipToDiagram(relationship);
    }
  },
  addLevelToDiagram: function(level, i) {
    var model = this.model;
    var x = parseInt(model.getAnnotationValue(level, "phase.x"), 10);
    if (!x) {
      x = this.getDom().clientWidth - 250;
    }
    var y = parseInt(model.getAnnotationValue(level, "phase.y"), 10);
    if (!y) {
      var diagram = this.diagram;
      var diagramModel = diagram.getDiagramModel();
      y = 10 + (diagramModel.getLevelCount() * 160);
    }
    this.diagram.addLevel({
      level: level,
      x: x,
      y: y
    });
  },
  addLevelsToDiagram: function(){
    var model = this.model;
    var modelElement = this.modelElement;
    model.eachLevel(modelElement, function(level, i){
      this.addLevelToDiagram(level, i);
    }, this);
  },
  addHierarchyRelationsToDiagram: function(){
    var relationsInfo = this.getHierarchyRelations();
    var tableIndex = 0;

    var model = this.model;
    var modelElement = this.modelElement;
    var attributes = modelElement.attributes;

    var primaryKeyTable = attributes.primaryKeyTable;
    var primaryKeyColumn = attributes.primaryKey;
    var primaryKeyTableIndex;

    this.getHierarchyRelationsInfo(relationsInfo.relations, 0, function(rec){
      var alias = rec.alias;
      var tableName = rec.metadata.TABLE_NAME;
      var annotationPrefix = this.getHierarchyTableAnnotationPrefix(alias, tableName);
      var x = parseInt(model.getAnnotationValue(modelElement, annotationPrefix + "x"), 10);
      var y = parseInt(model.getAnnotationValue(modelElement, annotationPrefix + "y"), 10);
      this.diagram.addTable(rec, function(){
        if (
          (primaryKeyTable === (tableName || alias))  ||
          (!primaryKeyTable && tableIndex === 0)
        ) {
          primaryKeyTableIndex = tableIndex;
          var diagramModel = this.diagram.getDiagramModel();
          diagramModel.setPrimaryKey(primaryKeyTableIndex, primaryKeyColumn);
        }
      }, this);
      tableIndex++;

    }, function(){
      this.addTableRelationshipsToDiagram();
      this.addLevelsToDiagram();
    }, this);
  },
  saveDiagram: function(){
    var model = this.model;
    var modelElement = this.modelElement;
    var diagram = this.diagram;
    var diagramModel = this.diagram.getDiagramModel();
    var relationsInfo = this.getHierarchyRelations();
    var relations = relationsInfo.relations;
    var i, n = relations.length, relation, rec, relationAttributes,
        tableIndex, table, tableDom, annotationPrefix
    ;
    for (i = 0; i < n; i++) {
      relation = relations[i];
      if (relation.tagName !== "Table") {
        continue;
      }
      relationAttributes = relation.attributes;
      rec = {};
      if (relationAttributes.alias) {
        rec.alias = relationAttributes.alias;
      }
      else {
        rec.TABLE_NAME = relationAttributes.name;
        if (relationAttributes.schema) {
          rec.TABLE_SCHEM = relationAttributes.schema;
        }
      }
      tableIndex = diagramModel.getTableIndex(rec);
      if (tableIndex === -1) {
        continue;
      }
      table = diagramModel.getTable(tableIndex);
      annotationPrefix = this.getHierarchyTableAnnotationPrefix(rec.alias, rec.TABLE_NAME);
      model.setAnnotationValue(modelElement, annotationPrefix + "x", table.x, true);
      model.setAnnotationValue(modelElement, annotationPrefix + "y", table.y, true);
    }
    diagramModel.eachLevel(function(level, i){
      model.setAnnotationValue(level.level, "phase.x", level.x, true);
      model.setAnnotationValue(level.level, "phase.y", level.y, true);
    }, this);
  },
  updateDiagram: function(){
    this.saveDiagram();
    this.clearDiagram();
    if (this.model && this.modelElement) {
      this.addHierarchyRelationsToDiagram();
    }
    this.diagramNeedsUpdate = false;
  },
  tabSelected: function(tabPane, event, data){
    GenericEditor.prototype.tabSelected.call(this, tabPane, event, data);
    var tab = tabPane.getTab(data.newTab);
    this.fireEvent("diagramActivation", this.diagramActivated());
    this.saveFieldValues();
    this.updateDiagramIfDisplayed();
    this.updateFieldValues();
  },
  updateUniqueKeyLevelNameField: function(){
    var fieldName = "uniqueKeyLevelName";
    var options = [];
    this.model.eachHierarchyLevel(this.modelElement, function(level, index){
      options.push(level.attributes.name);
    });
    this.clearSelectField(fieldName);
    this.populateSelectField(fieldName, options);
  },
  fieldCreated: function(fieldset, key, definition, tabIndex){
    switch (key) {
      case "primaryKeyTable":
        listen(this.getFieldElement(key), "change", function(){
          this.updatePrimaryKeyField();
        }, this);
        break;
    }
  },
  updatePrimaryKeyTableField: function(){
    this.populateSelectFieldWithHierarchyRelations("primaryKeyTable");
  },
  fieldUpdated: function(fieldName, value) {
    switch (fieldName) {
      case "primaryKeyTable":
        var primaryKeyTable = this.modelElement.attributes.primaryKeyTable;
        if (!primaryKeyTable) {
          var options = this.getFieldElement(fieldName).options;
          primaryKeyTable = options[options.length - 1].value;
          this.setSelectFieldValue(fieldName, primaryKeyTable);
        }
        this.updatePrimaryKeyField();
        break;
      default:
    }
  },
  updatePrimaryKeyField: function(){
    var tableName = this.getFieldValue("primaryKeyTable");
    this.populateSelectFieldWithHierarchyRelationColumns(tableName, "primaryKey");
  },
  modelElementChanged: function(){
    this.updateUniqueKeyLevelNameField();
    this.updatePrimaryKeyTableField();

    this.clearDiagram();
    this.diagramNeedsUpdate = true;

    this.updateDiagramIfDisplayed();
  },
  modelChanged: function(){
    this.updateUniqueKeyLevelNameField();
    this.updatePrimaryKeyTableField();

    this.clearDiagram();
    this.diagramNeedsUpdate = true;

    this.updateDiagramIfDisplayed();
  },
};
adopt(HierarchyEditor, GenericEditor);

(LevelEditor = function(conf){
  linkCss("../css/phase-level-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }

  conf.classes.push("phase-level-editor");

  if (!conf.toolbar) {
    conf.toolbar = {};
  }
  if (!conf.toolbar.buttons) {
    conf.toolbar.buttons = [
      {"class": "new-property", tooltip: "New Property", handler: function(){
        if (!this.beforeCreateNew()){
          return;
        }
        this.createNewProperty();
      }},
    ];
  }

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  columns: 2,
  objectType: "Level",
  fields: {
    name: fields.name,
    caption: fields.caption,
    levelType: {
      labelText: "Level Type",
      tagName: "select",
      tooltipText: "Whether this is a regular or a time-related level.",
      dataPath: ["modelElement", "attributes", "levelType"],
      options: MondrianModel.SchemaInfoValues.levelType
    },
    type: merge({
      dataPath: ["modelElement", "attributes", "type"]
    }, fields.datatype),
    internalType: {
      labelText: "Java Type",
      tagName: "select",
      tooltipText: "Indicates the Java type (and JDBC method) that Mondrian uses to store and retrieve this level's key column.",
      dataPath: ["modelElement", "attributes", "internalType"],
      options: MondrianModel.SchemaInfoValues.internalType
    },
    visible: fields.visible,
    hideMemberIf: {
      labelText: "Hide Member If",
      tagName: "select",
      tooltipText: "Condition which determines whether a member of this level is hidden.",
      dataPath: ["modelElement", "attributes", "hideMemberIf"],
      options: MondrianModel.SchemaInfoValues.hideMemberIf
    },
    description: fields.description,
    _column1: null,
    table: {
      labelText: "Table Name",
      tagName: "select",
      dataPath: ["modelElement", "attributes", "table"],
      tooltipText: "The name of the table that stores this level's values.",
      addValue: true
    },
    column: {
      labelText: "Level Key Column",
      tagName: "select",
      dataPath: ["modelElement", "attributes", "column"],
      tooltipText: "The name of the column which uniquely identifies the members in this level.",
      addValue: true
    },
    approxRowCount: {
      labelText: "Approx. Row Count",
      dataPath: ["modelElement", "attributes", "approxRowCount"],
      tooltipText: "The estimated number of members in this level."
    },
    uniqueMembers: {
      inputType: "checkbox",
      labelText:  "Is unique?",
      dataPath: ["modelElement", "attributes", "uniqueMembers"],
      tooltipText: "Indicates whether the values in this level are unique."
    },
    nameColumn: {
      labelText: "Level Name Column",
      tagName: "select",
      dataPath: ["modelElement", "attributes", "nameColumn"],
      tooltipText: "The name of the column which gives the members in this level a unique name.",
      addValue: true
    },
    ordinalColumn: {
      labelText: "Level Ordinal Column",
      tagName: "select",
      dataPath: ["modelElement", "attributes", "ordinalColumn"],
      tooltipText: "The name of the column that is used to sort the members in this level.",
      addValue: true
    },
    captionColumn: {
      labelText: "Level Caption Column",
      tagName: "select",
      dataPath: ["modelElement", "attributes", "captionColumn"],
      tooltipText: "The name of the column which holds the caption of this level's members.",
      addValue: true
    },
    parentColumn: {
      labelText: "Parent Column",
      tagName: "select",
      dataPath: ["modelElement", "attributes", "parentColumns"],
      tooltipText: "The name of the column which references the parent member in a parent-child hierarchy.",
      addValue: true
    },
    nullParentValue: {
      labelText: "Null Parent Value",
      dataPath: ["modelElement", "attributes", "nullParentValue"],
      tooltipText: "Value which identifies null parents in a parent-child hierarchy."
    }
  },
  createNewProperty: function(){
    var model = this.model;
    var modelElementPath = this.modelElementPath;
    var property;
    if (modelElementPath.SharedDimension) {
      property = model.createSharedDimensionProperty(
        modelElementPath.SharedDimension,
        modelElementPath.Hierarchy,
        modelElementPath.Level
      );
    }
    else {
      property = model.createPrivateDimensionProperty(
        modelElementPath.Cube,
        modelElementPath.PrivateDimension,
        modelElementPath.Hierarchy,
        modelElementPath.Level
      );
    }
    modelElementPath = merge({
      type: "Property",
      Property: property.attributes.name
    }, this.modelElementPath);
    this.fireEvent("editorCreateAction", {
      model: this.model,
      modelElementPath: modelElementPath
    });
  },
  updateTableField: function(){
    this.populateSelectFieldWithHierarchyRelations("table");
  },
  fieldUpdated: function(fieldName, value) {
    switch (fieldName) {
      case "table":
        var table = this.modelElement.attributes.table;
        if (!table) {
          var options = this.getFieldElement(fieldName).options;
          table = options[options.length - 1].value;
          this.setSelectFieldValue(fieldName, table);
        }
        this.updateColumnFields();
        break;
      default:
    }
  },
  updateColumnFields: function(){
    this.updateColumnField();
    this.updateNameColumnField();
    this.updateOrdinalColumnField();
    this.updateCaptionColumnField();
    this.updateParentColumnField();
  },
  updateColumnField: function(){
    var tableName = this.getFieldValue("table");
    this.populateSelectFieldWithHierarchyRelationColumns(tableName, "column");
  },
  updateNameColumnField: function(){
    var tableName = this.getFieldValue("table");
    this.populateSelectFieldWithHierarchyRelationColumns(tableName, "nameColumn");
  },
  updateOrdinalColumnField: function(){
    var tableName = this.getFieldValue("table");
    this.populateSelectFieldWithHierarchyRelationColumns(tableName, "ordinalColumn");
  },
  updateCaptionColumnField: function(){
    var tableName = this.getFieldValue("table");
    this.populateSelectFieldWithHierarchyRelationColumns(tableName, "captionColumn");
  },
  updateParentColumnField: function(){
    var tableName = this.getFieldValue("table");
    this.populateSelectFieldWithHierarchyRelationColumns(tableName, "parentColumn");
  },
  modelElementChanged: function(){
    this.updateTableField();
  },
  modelChanged: function(){
    this.updateTableField();
  },
};
adopt(LevelEditor, GenericEditor);

(PropertyEditor = function(conf){
  linkCss("../css/phase-property-editor.css");
  if (!conf) {
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("phase-property-editor");

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  objectType: "Property",
  fields: {
    name: fields.name,
    caption: fields.caption,
    column: fields.column,
    type: merge({dataPath: ["modelElement", "attributes", "type"]}, fields.datatype),
    dependsOnLevelValue: {
      inputType: "checkbox",
      labelText: "Depends on Level",
      dataPath: ["modelElement", "attributes", "dependsOnLevelValue"],
      defaultValue: true,
      tooltipText: "Is the propery value functionally dependent upon the level key value?"
    },
    formatter: {
      labelText: "Formatter",
      dataPath: ["modelElement", "attributes", "formatter"],
      tooltipText: "The classname of a member formatter."
    },
    description: fields.description
  },
  updateColumnField: function(){
    var model = this.model;
    var fieldName = "column";
    if (!model) {
      this.clearSelectField(fieldName);
      return;
    }
    var level = model.getModelElementParent(this.modelElementPath);
    this.populateSelectFieldWithHierarchyRelationColumns(level.attributes.table, "column");
  },
  modelElementChanged: function(){
    this.updateColumnField();
  }
};
adopt(PropertyEditor, GenericEditor);


linkCss("../css/phase-editor.css");
linkCss("../../lib/pure/css/pure-min.css");
linkCss("../../lib/pure/css/grids-responsive-min.css");

})();