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
var TreeListener;

(function(){

(TreeListener = function(conf) {
  this.conf = conf;
  this.registerListeners();
}).prototype = {
  getContainer: function(){
    return getDom(this.conf.container);
  },
  registerListeners: function(){
    var container = this.getContainer();
    listen(container, ["click", "touchstart"], function(e){
      var target = e.getTarget();
      var treeNode = TreeNode.lookup(target);
      if (!treeNode) return;

      if (hCls(target, "toggle")) {
        if (this.fireEvent("beforeToggleNode", treeNode) === false) {
          return;
        }
        treeNode.toggle();
        this.fireEvent("afterToggleNode", treeNode);
      }
      else {
        this.fireEvent("nodeClicked", {
          treeNode: treeNode,
          event: e
        });
      }
    }, this);
  },

};

adopt(TreeListener, Observable);


})();
