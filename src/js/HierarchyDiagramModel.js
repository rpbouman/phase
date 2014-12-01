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
var HierarchyDiagramModel;

(function(){

(HierarchyDiagramModel = function(conf){
  if (!conf) {
    conf = {};
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  initModel: function(){
    this.clearPrimaryKey();
    this.tables = [];
    this.levels = [];
    this.relationships = [];
  },
  comparePrimaryKey: function(table, column) {
    return  (this.primaryKey.table === table) &&
            (this.primaryKey.column === column)
    ;
  },
  setPrimaryKey: function(table, column){
    var oldKey = this.primaryKey;
    if (oldKey) {
      if (oldKey.table === table && oldKey.column === column) {
        table = null;
        column = null;
      }
    }
    var primaryKey = primaryKey = {
      table: table,
      column: column
    };
    if (this.fireEvent("changePrimaryKey", {
      oldKey: oldKey,
      newKey: primaryKey
    }) === false) {
      return false;
    }
    this.primaryKey = primaryKey;
    this.fireEvent("primaryKeyChanged", {
      oldKey: oldKey,
      newKey: primaryKey
    });
    return true;
  },
  clearPrimaryKey: function(){
    this.setPrimaryKey(null, null);
  },
  addLevel: function(rec){
    var levels = this.levels, index = levels.length;
    var eventData = {
      index: index,
      level: rec
    };
    if (this.fireEvent("addLevel", eventData) === false) {
      return -1;
    }
    levels.push(rec);
    this.fireEvent("levelAdded", eventData);
    return true;
  },
  getLevelCount: function(){
    return this.levels.length;
  },
  getLevel: function(index){
    return this.levels[index];
  },
  eachLevel: function(callback, scope){
    var level, i, levels = this.levels, n = levels.length;
    for (i = 0; i < n; i++){
      level = levels[i];
      if (callback.call(scope || null, level, i) === false) {
        return false;
      }
    }
    return true;
  },
};

adopt(HierarchyDiagramModel, DiagramModel);

})();