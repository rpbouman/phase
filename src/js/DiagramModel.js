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
var DiagramModel;

(function(){

(DiagramModel = function(conf){

  if (!conf) {
    conf = {};
  }

  this.pedisCache = conf.pedisCache;
  this.clear();

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  getRelationalOperator: function(){
    return this.relationalOperator || "=";
  },
  clear: function(){
    if (this.fireEvent("clearModel", null) === false) {
      return false;
    }
    this.initModel();
    this.fireEvent("modelCleared", null);
    return true;
  },
  getTableCount: function(){
    return this.tables.length;
  },
  getTable: function(index) {
    return this.tables[index];
  },
  removeTable: function(index){
    var relationshipsMap = {}, relationShipIndexes = [];
    //mark relationships where this was a left table
    this.eachTableRelationship(function(relationship, i){
      if (relationshipsMap[i]) {
        return true;
      }
      relationshipsMap[i] = true;
      relationShipIndexes.push(i);
    }, this, {
      leftTable: index
    });
    //mark relationships where this was a right table
    this.eachTableRelationship(function(relationship, i){
      if (relationshipsMap[i]) {
        return true;
      }
      relationshipsMap[i] = true;
      relationShipIndexes.push(i);
    }, this, {
      rightTable: index
    });
    relationShipIndexes.sort();
    var i, n = relationShipIndexes.length;
    for (i = n - 1; i >= 0; i--){
      this.relationships.splice(relationShipIndexes[i], 1);
    }
    //update remaining relationships to updated table index.
    this.eachTableRelationship(function(relationship, i){
      if (relationship.leftTable === index) {
        throw "Found unupdated relationship - this should have been removed";
      }
      if (relationship.leftTable > index) {
        relationship.leftTable--;
      }
      if (relationship.rightTable === index) {
        throw "Found unupdated relationship - this should have been removed";
      }
      if (relationship.rightTable > index) {
        relationship.rightTable--;
      }
    }, this);
    return this.tables.splice(index, 1);
  },
  getTableIndex: function(rec){
    var index = -1;
    this.eachTable(function(table, i){
      var metadata = table.metadata;
      if (
          (iDef(table.alias) && iDef(rec.alias) && (table.alias === rec.alias)) ||
          (rec.TABLE_NAME === metadata.TABLE_NAME &&
           rec.TABLE_SCHEM === metadata.TABLE_SCHEM)
      ){
        index = i;
        return false;
      }
    }, this);
    return  index;
  },
  eachTableRelationship: function(callback, scope, filter){
    var relationships = this.relationships, n = relationships.length, relationships;
    var key, value;
    outer: for (i = 0; i < n; i++) {
      relationship = relationships[i];
      if (filter) {
        for (key in filter) {
          if (filter[key] !== relationship[key]) {
            continue outer;
          }
        }
      }
      if (callback.call(scope || null, relationship, i) === false) {
        return false;
      }
    }
    return true;
  },
  removeTableRelationship: function(index, dontFireEvent){
    var relationships = this.relationships;
    if (index >= relationships.length) {
      throw "No such index";
    }
    if (dontFireEvent !== true) {
      this.fireEvent("removingTableRelationship", index);
    }
    relationships.splice(index, 1);
    if (dontFireEvent !== true) {
      this.fireEvent("tableRelationshipRemoved", index);
    }
  },
  getTableRelationship: function(index) {
    var relationships = this.relationships;
    return relationships[index];
  },
  indexOfTableRelationship: function(relationship) {
    var index = -1;
    this.eachTableRelationship(function(relationship, i){
      index = i;
      return false;
    }, this, relationship);
    return index;
  },
  addTableRelationship: function(relationship){
    var index = this.indexOfTableRelationship(relationship);
    if (index !== -1) {
      throw "Duplicate relationship!";
    }
    var reverseRelationship = {
      leftTable: relationship.rightIndex,
      leftColumn: relationship.rightColumn,
      rightTable: relationship.leftIndex,
      rightColumn: relationship.leftColumn
    };
    if (index !== -1) {
      throw "Duplicate relationship (reverse)!";
    }
    var relationships = this.relationships;
    var eventData = {
      relationship: relationship,
      index: relationships.length
    };
    this.fireEvent("addingTableRelationship", eventData);
    relationships.push(relationship);
    this.fireEvent("tableRelationshipAdded", eventData);
  },
  addTable: function(conf, callback, scope){
    var me = this;
    function action(){
      var tables = me.tables;
      tables.push(conf);
      var eventData = {
        table: conf,
        index: tables.length - 1
      };
      me.fireEvent("tableAdded", eventData);
      if (callback) {
        callback.call(scope || null, eventData);
      }
    }
    var metadata = conf.metadata;
    if (metadata.info) {
      action();
    }
    else {
      var connectionId = this.pedisCache.getConnection();
      this.pedisCache.getTableInfo(connectionId, metadata, function(tableInfo){
        action();
      });
    }
  },
  eachTable: function(callback, scope){
    var i, tables = this.tables, table, n = tables.length;
    for (i = 0; i < n; i++) {
      table = tables[i];
      if (callback.call(scope || this, table, i) === false) {
        return false;
      }
    }
    return true;
  },
  eachColumnOfTable: function(index, callback, scope){
    var table = this.getTable(index);
    var metadata = table.metadata;
    var info = metadata.info;
    var columns = info.columns;
    var i, n = columns.length, column;
    for (i = 0; i < n; i++) {
      column = columns[i];
      if (callback.call(scope || this, column, i) === false) {
        return false;
      }
    }
    return true;
  },
  eachTableColumn: function(callback, scope){
    return this.eachTable(function(table, tableIndex){
      if (this.eachColumnOfTable(tableIndex, function(column, columnIndex){
        return callback.call(scope || this, table, tableIndex, column, columnIndex);
      }) === false) {
        return false;
      }
    });
  },
  getTableAlias: function(index) {
    var table = this.getTable(index);
    if (table.alias) return table.alias;
    return "table" + (index + 1);
  },
  quoteIdentifier: function(identifier) {
    var connection = this.pedisCache.getConnection(this.pedisCache.getConnection());
    var quote = connection.identifierQuoteString;
    //todo: escape quote characters appearing in the name
    return quote + identifier + quote;
  },
  quoteIdentifierIfRequired: function(identifier) {
    if (!/^\w+$/.test(identifier)) {
      identifier = this.quoteIdentifier(identifier);
    }
    return identifier;
  },
  getFullyQualifiedTableName: function(index, quotes) {
    var quoter = quotes ? this.quoteIdentifier : this.quoteIdentifierIfRequired;
    var connection = this.pedisCache.getConnection(this.pedisCache.getConnection());
    var table = this.getTable(index);
    var metadata = table.metadata;
    var key = quoter.call(this, (metadata.TABLE_NAME || metadata.table_name));
    if (connection.schemaTerm && connection.schemaTerm.length && metadata.TABLE_SCHEM) {
      key = quoter.call(this, metadata.TABLE_SCHEM) + "." + key;
    }
    if (connection.catalogTerm && connection.catalogTerm.length && metadata.TABLE_CAT) {
      key = quoter.call(this, metadata.TABLE_CAT) + "." + key;
    }
    return key;
  }
};

adopt(DiagramModel, Observable);

})();