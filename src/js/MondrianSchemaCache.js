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
var MondrianSchemaCache;
(function(){
(MondrianSchemaCache = function(conf) {
  this.pham = conf.pham;
  if (conf.listeners) {
    this.listen(conf.listeners);
  }
  this.models = {};
  this.modelListeners = {
    documentSet: this.handleModelEvent,
    modelDirty: this.handleModelEvent,
    modelElementAttributeSet: this.handleModelEvent,
    modelElementCreated: this.handleModelEvent,
    modelElementMoved: this.handleModelEvent,
    modelElementRemoved: this.handleModelEvent,
    modelElementRenamed: this.handleModelElementRenamed,
    modelElementRepositioned: this.handleModelEvent,
    renameModelElement: this.handleRenameModelElement,
    setModelElementAttribute: this.handleModelEvent,
    scope: this
  };
}).prototype = {
  newSchemaName: function(name, num){
    if (!name) name = "New Schema";
    if (!num) num = 1;
    var n = name + num;
    if (this.models[n]) {
      return this.newSchemaName(name, ++num);
    }
    return n;
  },
  purge: function(modelNames){
    var modelName;
    //if no models argument was passed, it means we want to purge all models.
    if (!modelNames) {
      //load all cached models into an array so we can purge them.
      modelNames = [];
      for (modelName in this.models){
        modelNames.push(modelName);
      }
    }
    if (iStr(modelNames)) {
      modelNames = [modelNames];
    }
    this.fireEvent("purgingModels", modelNames);
    var i, n = modelNames.length, model, eventData;
    for (i = 0; i < n; i++){
      modelName = modelNames[i];
      if (!this.hasModel(modelName)) {
        continue;
      }
      eventData = {
        modelName: modelName,
        model: model
      };
      this.fireEvent("purgingModel", eventData);
      model = this.getModel(modelName);
      model.unlisten(this.modelListeners);
      delete this.models[modelName];
      this.fireEvent("modelPurged", eventData);
    }
    this.fireEvent("modelsPurged", modelNames);
  },
  getModel: function(modelName){
    return this.models[modelName];
  },
  hasModel: function(modelName){
    return Boolean(this.getModel(modelName));
  },
  addModel: function(model){
    this.models[model.getSchemaName()] = model;
    model.listen(this.modelListeners);
  },
  handleRenameModelElement: function(model, event, data) {
    var modelElementPath = data.modelElementPath;
    switch (modelElementPath.type) {
      case "Schema":
        return this.fireEvent("renameModel", {
          model: model,
          newName: data.newValue,
          oldName: data.oldValue
        });
        break;
    }
    return this.fireEvent("renameModelElement", {
      modelEvent: event,
      model: model,
      eventData: data
    });
  },
  handleModelElementRenamed: function(model, event, data) {
    var modelElementPath = data.modelElementPath;
    switch (modelElementPath.type) {
      case "Schema":
        this.purge(data.oldValue);
        this.addModel(model);
        break;
    }
    return this.fireEvent("modelElementRenamed", {
      modelEvent: event,
      model: model,
      eventData: data
    });
  },
  handleModelEvent: function(model, event, data){
    this.fireEvent("modelEvent", {
      modelEvent: event,
      model: model,
      eventData: data
    });
  },
  loadModel: function (modelName, callback, errorCallback){
    var me = this;
    this.fireEvent("loadingModel", modelName);
    this.pham.getModel({
      modelName: modelName,
      success: function(model) {
        me.pham.getDataSourceInfo({
          modelName: modelName,
          success: function(datasourceInfo){
            try {
              model.setDataSourceInfo(datasourceInfo);
              me.addModel(model);
              if (iFun(callback)) {
                try {
                  callback(model);
                }
                catch (e) {
                  console.log(e);
                }
              }
              me.fireEvent("modelLoaded", modelName);
            }
            catch (e){
              me.fireEvent("modelLoadError", e);
            }
          },
          failure: function(me, options, status, errorText){
            me.fireEvent("modelLoadError", errorText);
          }
        });
      },
      error: function(xhr, options, exception){
        if (iFun(errorCallback)) {
          try {
            errorCallback(model);
          }
          catch (e) {
            console.log(e);
          }
        }
        me.fireEvent("modelLoadError", exception);
      }
    })
  }
};
adopt(MondrianSchemaCache, Observable);
})();