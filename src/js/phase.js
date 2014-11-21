(function(){

var confirmDialog = new Dialog();

function showAlert(title, text){
  var parent = win.top;
  if (parent && iFun(parent.mantle_showAlert)) {
    parent.mantle_showAlert(title, text);
  }
  else {
    alert(title + "\n\n" + text);
  }
}

function showLoadingIndicator(){
  if (win.top.showLoadingIndicator) {
    win.top.showLoadingIndicator();
  }
}

function hideLoadingIndicator(){
  if (win.top.hideLoadingIndicator) {
    win.top.hideLoadingIndicator();
  }
}

var pham = new Pham();
var mondrianSchemaCache = new MondrianSchemaCache({
  pham: pham,
  listeners: {
    loadingModel: function(mondrianSchemaCache, event, data){
      showLoadingIndicator();
    },
    modelLoaded: function(mondrianSchemaCache, event, data){
      hideLoadingIndicator();
    },
    modelLoadError: function(mondrianSchemaCache, event, data){
      hideLoadingIndicator();
    },
    renameModel: function(mondrianSchemaCache, event, data){
      return renameModel(data.model, data.oldName, data.newName);
    },
    modelEvent: function(mondrianSchemaCache, event, data) {
      var model = data.model;
      var modelEvent = data.modelEvent;
      var eventData  = data.eventData;
      var modelElementPath = eventData.modelElementPath;
      switch (modelEvent) {
        case "documentSet":
          var oldSchemaName = modelElementPath.Schema;
          mondrianSchemaTreeView.removeModelTreeNode(oldSchemaName);
          mondrianSchemaCache.purge(oldSchemaName);
          mondrianSchemaCache.addModel(model);
          var treeNode = mondrianSchemaTreeView.renderModelTreeNode(model.getSchemaName());
          mondrianSchemaTreeView.setSelectedTreeNode(treeNode);
          break;
      }
    }
  }
});

var pedis = new Pedis();
var pedisCache = new PedisCache({
  pedis: pedis,
  listeners: {
    loading: function(pedisCache, event, data){
      showLoadingIndicator();
    },
    loadSuccess: function(pedisCache, event, data){
      hideLoadingIndicator();
    },
    loadFailure: function(pedisCache, event, data){
      hideLoadingIndicator();
    }
  }
});

var mainToolbar = new Toolbar({
  container: body
});
mainToolbar.addButton([
  {"class": "refresh", tooltip: "Refresh"},
  {"class": "save", tooltip: "Save Schema"},
  {"class": "new", tooltip: "New Schema"},
  {"class": "separator"},
  {"class": "delete", tooltip: "Remove current object"}
]);
mainToolbar.listen({
  "buttonPressed": function(toolbar, event, button){
    var conf = button.conf;
    var className = conf["class"];
    switch (className) {
      case "refresh":
        getModels();
        break;
      case "new":
        newModel();
        break;
      case "save":
        saveModel();
        break;
      case "delete":
        deleteCurrentObjects();
        break;
      default:
        throw "Not implemented";
    }
  }
});

function newModel(){
  var model = new MondrianModel();
  var schemaName = mondrianSchemaCache.newSchemaName();
  model.setSchemaName(schemaName);
  var treeNode = mondrianSchemaTreeView.renderModelTreeNode(schemaName);
  mondrianSchemaCache.addModel(model);
  mondrianSchemaTreeView.setSelectedTreeNode(treeNode);
}

function saveModel(){
  if (!mondrianSchemaCache.hasModel(selectedModel)) {
    showAlert("No Model", "The model " + selectedModel + " was not found in the cache.");
    selectedModel = null;
    return;
  }
  if (currentEditor) {
    if (!currentEditor.saveFieldValues()) {
      return;
    }
  }
  var model = mondrianSchemaCache.getModel(selectedModel);
  var overwrite;
  var modelName = model.getName();
  var schemaName = model.getSchemaName();

  if (schemaName === null || schemaName === "") {
    showAlert("Name is mandatory", "Please supply a name for this model.");
    return;
  }

  if (modelName === schemaName) {
    //save changes to existing model
    doSaveModel(model, true, false);
  }
  else
  if (iUnd(modelName) || (modelName === null) || (modelName === "")) {
    //save a new model
    doSaveModel(model, false, false);
  }
  else {
    //save a renamed model
    overwrite = false;
    var removeOld;
    confirmDialog.show({
      message:  "Your changed the name of the schema. " +
                "Do you want to make a copy of \"" + modelName + "\" " +
                "as a new schema \"" + schemaName + "\" " +
                "or do you want to rename to \"" + schemaName + "\" " +
                "and remove the old schema \"" + modelName + "\"?",
      title:    "Rename or Copy?",
      yes: {
        handler:  function(){
                    removeOld = true;
                    doSaveModel(model, overwrite, removeOld);
                  },
        label: "Rename"
      },
      no: {
        handler:  function(){
                    removeOld = false;
                    doSaveModel(model, overwrite, removeOld);
                  },
        label: "Copy"
      }
    });
  }
}

function doSaveModel(model, overwrite, removeOld) {
  pham.postModel({
    model: model,
    overwrite: overwrite,
    success: function(xhr, options, message){
      model.setName(model.getSchemaName());
      model.setNotDirty();
      var modelName = model.getName();
      var schemaName = model.getSchemaName();

      var treeNode = mondrianSchemaTreeView.getModelTreeNode(schemaName)
      mondrianSchemaTreeView.setSelectedTreeNode(treeNode);

      if (removeOld) {
        var modelName = model.getName();
        deleteModel(modelName);
      }
    },
    failure: function(xhr, options, status, message){
      switch (message) {
        case "PUBLISH_XMLA_CATALOG_EXISTS":
        case "PUBLISH_SCHEMA_EXISTS_ERROR":
        case "PUBLISH_CONTENT_EXISTS_ERROR":
          var modelName = model.getName();
          var schemaName = model.getSchemaName();
          if ((modelName !== schemaName) && (overwrite === false)) {
            confirmDialog.show({
              message: "You're trying to copy the existing schema \"" + modelName + "\" " +
                        "to new schema called \"" + schemaName +
                        "\", but a schema with that name already exists on the server. " +
                        "Do you want to overwrite the existing \"" + schemaName +
                        "\" schema with the \"" + modelName + "\" schema?",
              title:    "Overwrite existing schema?",
              yes: {
                handler: function(){
                  overwrite = true;
                  doSaveModel(model, overwrite, removeOld);
                },
                label: "Yes"
              },
              no: {
                label: "No"
              }
            });
          }
          break;
      }
    },
  });
}

function deleteModel(modelName, callback, scope){
  var model = mondrianSchemaCache.getModel(modelName);
  var action = function(){
    if (selectedModel === modelName) {
      selectedModel = null;
    }
    mondrianSchemaCache.purge(modelName);
    mondrianSchemaTreeView.removeModelTreeNode(modelName);
    pedisCache.setConnection(null);
    if (callback) {
      callback.call(scope);
    }
  }
  //3 possibilities:
  //- model not in the cache. Model exists on the server but wasn't cached yet.
  //- model in the cache and has a name: Model exists on the server and was cached
  //- model in the cache, but does not have a name: model created locally but not saved to the server.
  if (!model || model.getName()) {
    pham.deleteModel({
      modelName: modelName,
      success: function() {
        action();
      },
      failure: function() {
        showAlert(
          "Error removing model",
          "An error occurred while removing the model \"" + modelName + "\"."
        );
      }
    });
  }
  else {
    action();
  }
}

function renameModel(model, oldName, newName){
  var modelTreeNode = mondrianSchemaTreeView.getModelTreeNode(newName);
  if (modelTreeNode) {
    confirmDialog.show({
      message:  "You are about to rename the schema " +
                "\"" + oldName + "\" to \"" + newName + "\". " +
                "However, such a schema already exists. " +
                "Please choose another name, or remove the existing schema first.",
      title:    "Can't rename to existing schema"
    });
    return false;
  }
  else {
    if (selectedModel === oldName) {
      selectedModel = newName;
    }
    return true;
  }
}

function deleteModelElement(path){
  var model = mondrianSchemaCache.getModel(path.Schema);
  if (!model) {
    throw "No such model " + path.Schema
  }
  model.removeModelElement(path);
}

function deleteObject(path) {
  switch (path.type) {
    case "Schema":
      deleteModel(path.Schema);
      break;
    default:
      deleteModelElement(path);
      return;
  }
}

function deleteCurrentObjects() {
  confirmDialog.show({
    message: "You are about to delete the current selection. This cannot be undone. Are you sure?",
    title: "Warning: confirm delete",
    yes: {
      handler: function(){
        var selection = mondrianSchemaTreeView.getSelection();
        if (selection) {
          var i, n = selection.length, treeNode, path;
          for (i = 0; i < n; i++) {
            treeNode = selection[i];
            path = mondrianSchemaTreeView.parseModelElementPath(treeNode.conf.id);
            deleteObject(path);
          }
        }
      }
    },
    no: {
    }
  });
}

var selectedModel = null;
function setSelectedModel(model){
  selectedModel = model.getSchemaName();
  var dataSourceName = model.getDataSourceName();
  if (dataSourceName !== pedisCache.getConnection()) {
    pedisCache.setConnection(dataSourceName);
  }
}

function modelSelected(modelName, callback) {
  var action = function(model){
    setSelectedModel(model);
    callback(model);
  };
  if (mondrianSchemaCache.hasModel(modelName)) {
    var model = mondrianSchemaCache.getModel(modelName);
    action(model);
  }
  else {
    mondrianSchemaCache.loadModel(modelName, function(model){
      action(model);
    });
  }
}

var dnd = new DDHandler({
  node: body
});
SplitPane.listenToDnd(dnd);

var mondrianSchemaTreeView = new MondrianSchemaTreeView({
  pham: pham,
  dnd: dnd,
  mondrianSchemaCache: mondrianSchemaCache,
  listeners: {
    selectionChanged: function(mondrianSchemaTreeView, event, selectedTreeNode){
      if (selectedTreeNode) {
        var modelElementPath = mondrianSchemaTreeView.parseModelElementPath(selectedTreeNode.id);
        var modelName = modelElementPath.Schema;
        if (modelName !== selectedModel) {
          modelSelected(modelName, function(model){
            updateEditor(model, modelElementPath);
          });
        }
        else {
          updateEditor(
            mondrianSchemaCache.getModel(modelName),
            modelElementPath
          );
        }
      }
      else
      if (currentEditor) {
        unselectCurrentEditor();
      }
    },
    treeNodeCreatedForModelElementPath: function(mondrianSchemaTreeView, event, treeNode){
      if (currentEditor && currentEditor.diagramActivated()) {
        return;
      }
      treeNode.expandAncestors();
      mondrianSchemaTreeView.setSelectedTreeNode(treeNode);
    }
  }
});
var connectionTreeView = new ConnectionTreeView({
  pedis: pedis,
  pedisCache: pedisCache,
  dnd: dnd
});

var sidebarSplitPane = new SplitPane({
  firstComponent: mondrianSchemaTreeView,
  secondComponent: connectionTreeView,
  orientation: SplitPane.orientations.horizontal
})

var workArea = new ContentPane({});
var mainSplitPane = new SplitPane({
  container: body,
  classes: ["mainsplitpane"],
  firstComponent: sidebarSplitPane,
  secondComponent: workArea,
  orientation: SplitPane.orientations.vertical
});
mainSplitPane.getDom();
var splitterResizedTimer = new Timer({delay: 100});
splitterResizedTimer.listen("expired", function(){
  if (!currentEditor) return;
  if (!currentEditor.refreshCodeMirror) return;
  currentEditor.refreshCodeMirror();
});
mainSplitPane.listen("splitterPositionChanged", function(){
  splitterResizedTimer.start();
});

//handle window resize.
var windowResizedTimer = new Timer({delay: 100});
var sidebarSplitRatio, mainSplitRatio;
windowResizedTimer.listen("expired", function(){
  mainSplitPane.setSplitterPosition(mainSplitPane.getSize() * mainSplitRatio);
  sidebarSplitPane.setSplitterPosition(sidebarSplitPane.getSize() * sidebarSplitRatio);
  refreshCodeMirrors();
});
listen(window, "resize", function(){
  mainSplitRatio = mainSplitPane.getSplitterRatio();
  sidebarSplitRatio = sidebarSplitPane.getSplitterRatio();
  windowResizedTimer.start();
});

//get an editor for a particular type of mondrian model element.
var currentEditor = null;
var currentConnection = null;
var editors = {};
function getEditorForSelection(selection){
  var type = selection.type;
  var editor = editors[type];
  if (editor) {
    return editor;
  }

  var editorConstructorName, editor, cons, css, container = workArea.getDom().id, conf = {
    container: container,
    mondrianSchemaCache: mondrianSchemaCache,
    pedisCache: pedisCache,
    dnd: dnd,
    dialog: confirmDialog,
    listeners: {
      editDiagramElement: function(editor, event, data){
        var model = editor.getModel();
        var modelElementPath = editor.getModelElementPath();
        var treeNode = mondrianSchemaTreeView.getTreeNodeForPath(modelElementPath);
        var object = data.object;
        var item;
        switch (data.objectType){
          case "shareddimension":
            delete modelElementPath.Cube;
            modelElementPath.type = "SharedDimension";
            item = "dimension";
            break;
          case "dimensionusage":
            modelElementPath.type = "DimensionUsage";
            item = "dimension";
            break;
          case "privatedimension":
            modelElementPath.type = "PrivateDimension";
            item = "dimension";
            break;
          case "measure":
            modelElementPath.type = "Measure";
            item = "measure";
            break;
          case "level":
            modelElementPath.type = "Level";
            item = "level";
            break;
          default:
            return;
        }
        modelElementPath[modelElementPath.type] = object[item].attributes.name;
        if (treeNode){
          treeNode.loadChildren(null, function(){
            treeNode = mondrianSchemaTreeView.getTreeNodeForPath(modelElementPath);
            if (!treeNode) {
              return;
            }
            treeNode.expandAncestors();
            mondrianSchemaTreeView.setSelectedTreeNode(treeNode);
          })
        }
      }
    }
  };
  editorConstructorName = type + "Editor";
  cons = win[editorConstructorName];
  if (!iFun(cons)) {
    throw "No such editor " + editorConstructorName;
  }
  editor = new cons(conf);
  editors[type] = editor;
  return editor;
}
function refreshCodeMirrors(){
  var editorType, editor;
  for (editorType in editors) {
    editor = editors[editorType];
    if (!iFun(editor.refreshCodeMirror)) {
      continue;
    }
    editor.refreshCodeMirror();
  }
}

function unselectCurrentEditor(){
  if (!currentEditor) return;
  currentEditor.hide();
  currentEditor = null;
}

function updateEditor(model, selection){
  //save the state of the editor.
  if (currentEditor) {
    //saving the state may alter the selection (in case of a name change)
    //so get the treenode to calculate the selection again after save.
    var treeNode = mondrianSchemaTreeView.getTreeNodeForPath(selection);
    currentEditor.saveFieldValues();
    selection = mondrianSchemaTreeView.parseModelElementPath(treeNode);
  }

  var editor = getEditorForSelection(selection);
  if (currentEditor !== editor) {
    unselectCurrentEditor();
    currentEditor = editor;
    currentEditor.show();
  }

  currentEditor.setData(model, selection);
}

function getModels(){
  pham.getModels({
    success: function(modelNames){
      //empty entire cache
      mondrianSchemaCache.purge();
      mondrianSchemaTreeView.renderModelTreeNodes(modelNames);
    },
    error: function(){
      showAlert("Error loading models", "Error loading models");
    }
  });
}

setTimeout(function(){
  mainSplitPane.setSplitterPosition("300px");
  sidebarSplitPane.setSplitterPosition("200px");
  getModels();
}, 200);
linkCss("../css/phase.css");
})();