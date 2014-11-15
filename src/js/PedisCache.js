var PedisCache;

(function(){

(PedisCache = function(conf){
  this.conf = conf;
  if (conf.pedis) {
    this.pedis = conf.pedis;
  }
  else {
    this.pedis = new Pedis();
  }
  this.connections = null;
  this.metaData = {
  };
  if (conf.listeners){
    this.listen(conf.listeners);
  }
  this.connectionId = null;
}).prototype = {
  loadConnections: function(conf){
    var eventData = {
      type: "connections"
    };
    this.fireEvent("loading", eventData);
    this.pedis.requestConnections({
      success: function(xhr, options, data){
        if (conf.success) {
          conf.success.call(conf.scope || null, data);
        }
        eventData.data = data;
        this.connections = data;
        this.fireEvent("loadSuccess", eventData);
      },
      failure: function(xhr, options, status, text){
        if (conf.failure) {
          conf.failure.call(conf.scope || null, status, text);
        }
        eventData.status = status;
        eventData.text = text;
        this.fireEvent("loadFailure", eventData);
      },
      scope: this
    });
  },
  getTableTypes: function(connectionId){
    var connection = this.getConnection(connectionId || this.getConnection());
    return connection.tableTypes;
  },
  getTableInfo: function(connectionId, metadata, callback, scope){
    connectionId = connectionId || this.getConnection();
    var connection = this.getConnection(connectionId);
    this.pedis.requestTableInfo({
      connection: connectionId,
      params: {
        catalog: metadata.TABLE_CAT,
        schema: metadata.TABLE_SCHEM,
        table: metadata.TABLE_NAME
      },
      success: function(pedis, options, data){
        metadata.info = data;
        if (iFun(callback)) {
          callback.call(scope || null, data);
        }
      },
      failure: function(pedis, options, status, text){
      }
    });
  },
  filterTableTypes: function(types) {
    var i, type, typeLc, n = types.length, tableTypes = [];
    for (i = 0; i < n; i++) {
      type = types[i]
      type = type.TABLE_TYPE;
      typeLc = type.toLowerCase();
      if (
        typeLc.indexOf("temporary") !== -1 ||
        (typeLc.indexOf("table") === -1 &&
        typeLc.indexOf("view") === -1)
      ) continue;
      tableTypes.push(type);
    }
    return tableTypes;
  },
  getTables: function(connectionId, metadata, callback, scope) {
    connectionId = connectionId || this.getConnection();
    metadata = metadata || this.getConnection(connectionId);
    var tables;
    if (metadata.tables) {
      tables = metadata.tables;
      callback.call(scope || null, tables);
    }
    else {
      this.pedis.requestTables({
        connection: connectionId,
        params: {
          catalog: metadata.TABLE_CATALOG || metadata.TABLE_CAT,
          schema: metadata.TABLE_SCHEM,
          types: this.filterTableTypes(this.getTableTypes(connectionId))
        },
        success: function(pedis, options, data){
          metadata.tables = data;
          callback.call(scope || null, data);
        },
        failure: function(pedis, options, status, text){
        }
      });
    }
  },
  usesSchemas: function(connectionId){
    var connection = this.getConnection(connectionId || this.getConnection());
    var term = connection.schemaTerm;
    return term !== null && term !== "";
  },
  usesCatalogs: function(connectionId){
    var connection = this.getConnection(connectionId || this.getConnection());
    var term = connection.catalogTerm;
    return term !== null && term !== "";
  },
  getSchema: function(connectionId, schemaName){
    var schemas = this.getSchemas(connectionId || this.getConnection());
    var i, n = schemas.length, schema;
    for (i = 0; i < n; i++){
      schema = schemas[i];
      if (schema.TABLE_SCHEM !== schemaName) {
        continue;
      }
      return schema;
    }
    return null;
  },
  getSchemas: function(connectionId){
    var connection = this.getConnection(connectionId || this.getConnection());
    return connection.schemas;
  },
  getCatalogs: function(connectionId){
    var connection = this.getConnection(connectionId || this.getConnection());
    return connection.catalogs;
  },
  setConnection: function(connectionId, callback) {
    var me = this;
    function action(){
      me.connectionId = connectionId;
      me.fireEvent("connectionSet", {
        type: "connection",
        connection: connectionId
      });
      if (callback) {
        callback(connectionId, this.getConnection(connectionId));
      }
    }
    if (this.hasConnection(connectionId)) {
      action();
    }
    else {
      this.loadConnection({
        connectionId: connectionId,
        success: function(data){
          action();
        },
        failure: function(status, text){
          debugger;
        },
        scope: this
      });
    }
  },
  getConnection: function(connectionId) {
    if (connectionId) {
      return this.metaData[connectionId];
    }
    else {
      return this.connectionId;
    }
  },
  hasConnection: function(connectionId){
    return Boolean(this.getConnection(connectionId));
  },
  loadConnection: function(conf){
    var connectionId = conf.connectionId || this.getConnection();
    var eventData = {
      type: "connection",
      connection: connectionId,
    };
    this.fireEvent("loading", eventData);
    this.pedis.requestConnection({
      connection: connectionId,
      success: function(xhr, options, data){
        this.metaData[connectionId] = data;
        if (conf.success) {
          conf.success.call(conf.scope || null, data);
        }
        eventData.data = data;
        this.fireEvent("loadSuccess", eventData);
      },
      failure: function(xhr, options, status, text){
        if (conf.failure) {
          conf.failure.call(conf.scope || null, status, text);
        }
        eventData.status = status;
        eventData.text = text;
        this.fireEvent("loadFailure", eventData);
      },
      scope: this
    });
  }
};

adopt(PedisCache, Observable);

})();