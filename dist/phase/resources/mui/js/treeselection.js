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
var TreeSelection;

(function() {

(TreeSelection = function(conf) {
  this.conf = conf;
  this.treeListener = conf.treeListener || new TreeListener(conf);
  this.treeListener.listen("nodeClicked", this.clickHandler, this);
  if (conf.listeners) {
    this.listen(conf.listeners);
  }
  this.selection = [];
  this.multiple = Boolean(conf.multiple) || false;
}).prototype = {
  clickHandler: function(treeListener, type, data){
    var newSelection = [];
    var treeNode = data.treeNode;
    var event = data.event;
    if (this.multiple) {
    }
    else {
      newSelection[0] = treeNode;
    }
    this.setSelection(newSelection);
  },
  isNodeSelected: function(treeNode) {
    return hCls(getDom(treeNode), "selected");
  },
  updateSelection: function(selection, selected) {
    if (!selection) return;
    var i, n = selection.length, node;
    for (i = 0; i < n; i++){
      node = selection[0];
      nodeDom = getDom(node);
      if (selected && !this.isNodeSelected(node)) {
        aCls(nodeDom, "selected")
      }
      else
      if (!selected && this.isNodeSelected(node)) {
        rCls(nodeDom, "selected")
      }
    }
  },
  setSelection: function(selection) {
    var oldSelection = this.selection;
    var newSelection = selection;
    if (this.fireEvent("beforeChangeSelection", {
      oldSelection: oldSelection,
      newSelection: newSelection
    }) === false) return;
    this.updateSelection(oldSelection, false);
    this.updateSelection(newSelection, true);
    this.selection = newSelection;
    this.fireEvent("selectionChanged", {
      oldSelection: oldSelection,
      newSelection: newSelection
    });
  },
  getSelection: function(){
    return this.selection;
  }
};

adopt(TreeSelection, Observable);

})();
