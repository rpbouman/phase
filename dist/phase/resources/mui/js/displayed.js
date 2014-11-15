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
var Displayed;

(function() {
(Displayed = function(){
}).prototype = {
  isHidden: function() {
    return Displayed.isHidden(this.getDom());
  },
  isVisible: function() {
    return !this.isHidden();
  },
  beforeSetDisplayed: function(displayed){
    //Noop. override
  },
  setDisplayed: function(displayed) {
    this.beforeSetDisplayed(displayed);
    Displayed.setDisplayed(this.getDom(), displayed);
    this.afterSetDisplayed(displayed);
  },
  afterSetDisplayed: function(displayed){
    //Noop. override
  },
  show: function() {
    this.setDisplayed(true);
  },
  hide: function() {
    this.setDisplayed(false);
  }
};

Displayed.isHidden = function(dom) {
  dom = gEl(dom);
  return (!dom) || (dom.style.display === "none");
};

Displayed.isVisible = function(dom) {
  return Displayed.isHidden(dom);
};

Displayed.setDisplayed = function(dom, displayed) {
  dom = gEl(dom);
  if (!dom) return;
  dom.style.display = displayed ? "" : "none";
};

Displayed.show = function(dom) {
  Displayed.setDisplayed(dom, true);
};

Displayed.hide = function(dom) {
  Displayed.setDisplayed(dom, false);
};

})();
