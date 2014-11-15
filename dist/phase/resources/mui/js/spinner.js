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
var Spinner;
(function(){

(Spinner = function(conf){
  conf = this.conf = conf || {};
  this.id = conf.id ? conf.id : ++Spinner.id;
  Spinner.instances[this.getId()] = this;
}).prototype = {
  getId: function(){
    return Spinner.prefix + this.id;
  },
  getContainer: function(){
    return gEl(this.conf.container) || body;
  },
  createDom: function(){
    var conf = this.conf;
    var classes = confCls(
      Spinner.prefix,
      conf
    );
    container = this.getContainer();
    var dom = cEl("div", {
      "class": classes,
      "id": this.getId()
    }, null, container);
    this.hide();
    return dom;
  },
  getDom: function() {
    var el = gEl(this.getId());
    if (!el) {
      el = this.createDom();
    }
    return el;
  }
};
Spinner.id = 0;
Spinner.prefix = "spinner";
Spinner.instances = {};
Spinner.getInstance = function(id){
    if (iInt(id)) id = Spinner.prefix + id;
    return Spinner.instances[id];
};
Spinner.lookup = function(el){
  var re = new RegExp("^" + Spinner.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
      if ((el = el.parentNode) === doc) return null;
  }
  return Spinner.getInstance(el.id);
};

adopt(Spinner, Displayed);

linkCss(muiCssDir + "spinner.css");

})();
