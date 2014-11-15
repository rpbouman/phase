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
var Dialog;

(function(){
Dialog = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++Toolbar.id;
  Dialog.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return Dialog.prefix + this.id;
  },
  getHeaderId: function(){
    return this.getId() + "-header";
  },
  getBodyId: function(){
    return this.getId() + "-body";
  },
  getFooterId: function(){
    return this.getId() + "-footer";
  },
  createDom: function(){
    var conf = this.conf;
    var el = cEl("div", {
      id: this.getId(),
      "class": confCls(
        Dialog.prefix,
        "pentaho-dialog"
        conf
      ),
    }, [
      cEl("div", {
        id: this.getHeaderId(),
        "class": Dialog.prefix + "-header"
      }, conf.title || "Dialog"),
      cEl("div", {
        id: this.getBodyId(),
        "class": Dialog.prefix + "-body"
      }, conf.body),
      cEl("div", {
        id: this.getFooterId(),
        "class": Dialog.prefix + "-footer"
      }, buttons)
    ], gEl(conf.container) || body);
  },
  show: function(options){

  }
}

Dialog.id = 0;
Dialog.prefix = "dialog";
Dialog.instances = {};
Dialog.getInstance = function(id){
    if (iInt(id)) id = Dialog.prefix + id;
    return Dialog.instances[id];
};
Dialog.lookup = function(el){
  var re = new RegExp("^" + Dialog.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return Dialog.getInstance(el.id);
};

Dialog.buttons = {
  ok: "OK",
  cancel: "Cancel"
}

adopt(Dialog, Observable, Displayed);

})();
