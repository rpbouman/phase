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
var ConnectionTreeView;

(function(){

(ConnectionTreeView = function(conf){
  if (!conf){
    conf = {};
  }
  if (!conf.classes) {
    conf.classes = [];
  }
  conf.classes.push("tree");
  conf.classes.push("connection-tree");

  arguments.callee._super.apply(this, [conf]);

  this.pedisCache = conf.pedisCache;
  this.pedisCache.listen({
    connectionSet: function(pedisCache, event, data){
      this.setDataSourceName(data.connection);
    },
    scope: this
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

      var dom = treeNode.getDom();
      if (!hCls(dom, "relation") && !hCls(dom, "column")) {
        return false;
      }

      var proxy = ddHandler.dragProxy;
      ddHandler.treeNode = treeNode;
      ddHandler.proxyClassName = proxy.className;
      proxy.innerHTML = "<div class=\"head\">" + treeNode.getDomHead().innerHTML + "</head>";
      proxy.className = (proxy.className + " " + dom.className).replace(/collapsed|expanded/ig, "leaf");
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

      var phaseDiagram = PhaseDiagram.lookup(target);
      if (!phaseDiagram) {
        return;
      }
      var treeNode = ddHandler.treeNode;
      var dom = treeNode.getDom();
      ddHandler.treeNode = null;

      var xy = event.getXY();
      var conf = {
        metadata: treeNode.conf.metadata,
        x: xy.x,
        y: xy.y
      };
      phaseDiagram.normalizePosition(conf);
      if (hCls(dom, "relation")) {
        phaseDiagram.createTable(conf);
      }
      else
      if (hCls(dom, "column")) {
        if (phaseDiagram instanceof CubeDiagram) {
          phaseDiagram.createMeasure(conf);
        }
        else
        if (phaseDiagram instanceof HierarchyDiagram) {
          phaseDiagram.createLevel(conf);
        }
      }
    }
  });

}).prototype = {
  createDom: function(){
    var el = ConnectionTreeView._super.prototype.createDom.apply(this, arguments);
    this.treeListener = new TreeListener({container: el});
    return el;
  },
  renderCatalog: function(connection, catalog, catalogChildrenLoader) {
    var conf = {
      treeview: this,
      parentElement: this.getId(),
      id: "TABLE_CAT:" + catalog.TABLE_CAT,
      classes: "catalog",
      title: catalog.TABLE_CAT,
      tooltip: catalog.TABLE_CAT,
      state: TreeNode.states.expanded,
      metadata: catalog
    };
    if (catalogChildrenLoader) {
      conf.loadChildren = catalogChildrenLoader;
      conf.state = TreeNode.states.collapsed;
    }
    else {
      conf.state = TreeNode.states.expanded;
    }
    var treeNode = new TreeNode(conf);
    treeNode.createDom();
    return treeNode;
  },
  renderCatalogs: function(connection){
    var connection = this.getDataSource();
    var me = this,
        catalogs = connection.catalogs,
        n = catalogs.length,
        catalog, i, catalogNode,
        schemas = connection.schemas,
        m = schemas.length,
        schema, j = 0
    ;
    schema = m ? schemas[j] : null;
    for (i = 0; i < n; i++){
      catalog = catalogs[i];
      if (schema) {
        catalogNode = this.renderCatalog(connection, catalog);
        while (schema && ((connection.databaseProductName === "PostgreSQL") || (schema.TABLE_CATALOG === catalog.TABLE_CAT))) {
          this.renderSchema(connection, schema, catalogNode);
          schema = (++j < m) ? schemas[j] : null;
        }
      }
      else {
        catalogNode = this.renderCatalog(connection, catalog, function(callback) {
          me.loadSchemaChildren(callback, this);
        });
      }
    }
  },
/*
  loadColumnChildren: function(callback){
    var node = this;
    var conf = this.conf;
    var treeview = conf.treeview;
    var column = conf.metadata;
    var connection = treeview.relationalModel.getConnection();
    var connectionInfo = treeview.relationalModel.getConnectionInfo();
    var metadata = connectionInfo.databaseMetadata;
    var quoteString = metadata.identifierQuoteString;
    if (quoteString === " ") quoteString = "";

    var tableName = quoteString + column.TABLE_NAME + quoteString;
    if (column.TABLE_SCHEM !== "" && column.TABLE_SCHEM !== null) {
      tableName = quoteString + column.TABLE_SCHEM + quoteString + "." + tableName;
    }
    if (column.TABLE_CAT !== "" && column.TABLE_CAT !== null) {
      tableName = quoteString + column.TABLE_CAT + quoteString +
                  metadata.catalogSeparator + tableName
      ;
    }
    var columnAlias = "valuecount";
    var columnName = quoteString + column.COLUMN_NAME + quoteString;
    var sql = "SELECT COUNT(DISTINCT " + columnName + ") AS " + columnAlias + " FROM " + tableName;
    treeview.pedis.requestQuery({
      connection: connection,
      params: {sql: sql},
      success: function(pedis, options, data){
        debugger;
      },
      failure: function(pedis, options, status, text){
        callback();
        showAlert(
          "Error getting value count",
          "Error occurred while fetching the value count (" +
          status +
          ")\n" + text
        );
      }
    });
  },
*/
  getColumnClasses: function(table, column){
    var classes = [
      "column",
      "nullable-" + column.IS_NULLABLE,
      "datatype-" + column.DATA_TYPE,
      "auto-increment-" + column.IS_AUTOINCREMENT
    ];
    var columnName = column.COLUMN_NAME;
    var tableInfo = table.info;
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
  renderColumn: function(table, column, parentTreeNode){
    var treeview = this;
    var columnName = column.COLUMN_NAME;
    var nodeId = parentTreeNode.getId() + ":COLUMN:" + columnName;
    var classes = this.getColumnClasses(table, column);
    var conf = {
      id: nodeId,
      classes: classes,
      title: columnName,
      tooltip: columnName,
      //state: TreeNode.states.collapsed,
      state: TreeNode.states.leaf,
      metadata: column,
      parentTreeNode: parentTreeNode,
      //loadChildren: treeview.loadColumnChildren
    };
    var treeNode = new TreeNode(conf);
    treeNode.createDom();
    return treeNode;
  },
  renderColumns: function(table, parentTreeNode){
    var columns = table.info.columns, i, n = columns.length, column;
    for (i = 0; i < n; i++){
      column = columns[i];
      this.renderColumn(table, column, parentTreeNode);
    }
  },
  loadTableChildren: function(callback, parentTreeNode){
    var treeview = this;
    var conf = parentTreeNode.conf;
    var table = conf.metadata;
    this.pedisCache.getTableInfo(this.getDataSourceName(), table, function(tableInfo){
      treeview.renderColumns(table, parentTreeNode);
      callback();
    });
  },
  renderTable: function(table, schemaNode){
    var treeview = this;
    var tableName = table.TABLE_NAME;
    var nodeId = schemaNode.conf.id + ":RELATION:" + tableName;
    var tableType = table.TABLE_TYPE;
    if (tableType) {
      tableType = tableType.toLowerCase();
      tableType = tableType.replace(/ /g, "_");
    }
    var conf = {
      id: nodeId,
      classes: "relation " + tableType,
      title: tableName,
      tooltip: tableName,
      state: TreeNode.states.collapsed,
      metadata: table,
      treeview: treeview,
      parentTreeNode: schemaNode,
      loadChildren: function(callback){
                      treeview.loadTableChildren(callback, this)
                    }
    };
    var treeNode = new TreeNode(conf);
    treeNode.createDom();
    return treeNode;
  },
  renderTables: function(tables, schemaNode){
    var i, n = tables.length, table;
    for (i = 0; i < n; i++){
      table = tables[i];
      this.renderTable(table, schemaNode);
    }
  },
  loadSchemaChildren: function(callback, parentTreeNode){
    var me = this;
    var conf = parentTreeNode.conf;
    var schema = conf.metadata;
    var dataSource = this.getDataSource();
    this.pedisCache.getTables(
      this.getDataSourceName(),
      schema,
      function(tables){
        me.renderTables(tables, parentTreeNode);
        callback();
      }
    );
  },
  renderSchema: function(connection, schema, catalogNode) {
    var me = this;
    var tableTypes = connection.usedTableTypes;
    var schemaName = schema.TABLE_SCHEM;
    var conf = {
      id: "TABLE_SCHEM:" + schemaName,
      classes: "schema",
      title: schemaName,
      tooltip: schemaName,
      state: TreeNode.states.collapsed,
      metadata: schema,
      loadChildren: function(callback){
                      me.loadSchemaChildren(callback, this);
                    }
    };

    if (catalogNode) {
      conf.parentTreeNode = catalogNode;
    }
    else {
      conf.parentElement = this.getId();
    }

    var treeNode = new TreeNode(conf);
    treeNode.createDom();
  },
  renderSchemas: function (connection){
    var connection = this.getDataSource();
    var schemas = connection.schemas,
        n = schemas.length,
        schema, i
    ;
    for (i = 0; i < n; i++){
      schema = schemas[i];
      this.renderSchema(connection, schema);
    }
  },
  setDataSourceName: function(dataSourceName) {
    if (this.dataSourceName === dataSourceName) {
      return;
    }
    this.clearAll();
    this.dataSourceName = dataSourceName;
    var connection = this.getDataSource();

    if (!connection) {
      return;
    }

    var term;
    if ((term = connection.catalogTerm) !== null && term !== "") {
      this.renderCatalogs();
    }
    else
    if ((term = connection.schemaTerm) !== null && term !== "") {
      this.renderSchemas();
    }
  },
  getDataSourceName: function(){
    return this.dataSourceName;
  },
  getDataSource: function(){
    var dataSourceName = this.getDataSourceName();
    return this.pedisCache.getConnection(dataSourceName);
  }
};

adopt(ConnectionTreeView, ContentPane);

linkCss("../css/phase-connection-treeview.css");
linkCss("../css/phase-tables-and-columns.css");

})();