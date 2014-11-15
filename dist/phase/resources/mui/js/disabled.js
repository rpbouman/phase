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
var Disabled;

(function() {
(Disabled = function(){
}).prototype = {
  isDisabled: function(){
    var dom = this.getDom();
    return Disabled.isDisabled(dom);
  },
  isEnabled: function(){
    return !this.isDisabled();
  },
  setEnabled: function(enabled) {
    var dom = this.getDom();
    if (enabled) {
      rCls(dom, "disabled", "");
    }
    else {
      aCls(dom, "disabled");
    }
  },
  enable: function(){
    Disabled.enable(this.getDom());
  },
  disable: function(){
    Disabled.disable(this.getDom());
  }
};

Disabled.isDisabled = function(dom) {
  dom = gEl(dom);
  return dom && hCls(dom, "disabled");
};

Disabled.isEnabled = function(dom) {
  dom = gEl(dom);
  return dom && !hCls(dom, "disabled");
};

Disabled.setDisabled = function(dom, disabled) {
  dom = gEl(dom);
  if (!dom) return;
  if (disabled) aCls(dom, "disabled");
  else rCls(dom, "disabled", "");
};

Disabled.disable = function(dom) {
  Disabled.setDisabled(dom, true);
};

Disabled.enable = function(dom) {
  Disabled.setDisabled(dom, false);
};


})();
