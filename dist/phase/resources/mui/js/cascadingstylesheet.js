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
var CascadingStyleSheet;
(function() {

(CascadingStyleSheet = function(config){
  this.config = config = merge(config, {
    enabled: true,
    rules: {}
  });
  if (config.id){
    this.style = gEl(config.id);
    if (this.style!==null) {
        //todo: load the rules
    }
  }
}).prototype = {
  getDom: function(){
    var dom = gEl(this.config.id);
    if (!dom) {
      dom = this.createDom();
    }
    return dom;
  },
  createDom: function(){
    var config = this.config;

    this.style = cEl("STYLE", {
      type: "text/css",
      id: config.id
    }, null, head);

    if (config.rules) {
      this.addRules(config.rules);
    }

    return this.style;
  },
  enable: function(enabled){
    this.config.enabled = enabled;
    if (this.style) {
      this.style.disabled = !enabled;
    }
  },
  getRule: function(selector){
    var ruleset = this.getRuleSet(),
        i, n = ruleset.length, r
    ;
    selector = selector.toUpperCase();
    for (i = 0; i < n; i++){
      r = ruleset[i];
      if (r.selectorText.toUpperCase()===selector) {
        return r;
      }
    }
    return null;
  },
  getStyle: function(selector) {
    var rule;
    if (rule = this.getRule(selector)) {
      return rule.style;
    }
    return null;
  },
  unApplyStyle: function(selector, style){
    var s = this.getStyle(selector);
    if (s === null) {
      return;
    }
    merge(s, style, merge.DELETE);
  },
  applyStyle: function(selector, style, create){
    var r = this.getRule(selector);
    if (r === null) {
      if (create !== false) {
        this.addRule(selector, style);
      }
      return;
    }
    merge(r.style, style, merge.OVERWRITE);
  },
  getCssText: function(properties) {
    var property, value, cssText = "";
    for (property in properties){
      if (properties.hasOwnProperty(property)) {
        value = properties[property];
        if (value === null) {
          continue;
        }
        if (cssText !== "") {
          cssText += ";";
        }
        cssText += "\n" + property + ": " + value;
      }
    }
    return cssText;
  },
  addRule: function(selector, properties){
    var stylesheet, styles, property, value, index;
    if (arguments.length === 1) {
      properties = selector.properties;
      selector = selector.selector;
    }
    if (iStr(properties)) {
      styles = properties;
    }
    else
    if (iObj(properties)) {
      styles = this.getCssText(properties);
    }

    if (stylesheet = this.style.styleSheet) {   //IE
      index = stylesheet.addRule.call(stylesheet, selector, styles);
    }
    else
    if (stylesheet = this.style.sheet) {
      if (stylesheet.addRule) {               //chrome
        index = stylesheet.addRule.call(stylesheet, selector, styles);
      }
      else
      if (stylesheet.insertRule) {            //opera, firefox
        index = stylesheet.insertRule.call(
          stylesheet,
          selector + "{" + styles + "}",
          stylesheet.cssRules.length
        );
      }
    }
    else {
      throw "No stylesheet";
    }
  },
  addRules: function(rules){
    if (iObj(rules)){
      if (iArr(rules)){
        var i, n = rules.length, rule;
        for (i = 0; i < n; i++){
          rule = rules[i];
          this.addRule(rule.selector, rule.styles);
        }
      }
      else {
        for (selector in rules) {
          if (rules.hasOwnProperty(selector)) {
            this.addRule(selector, rules[selector]);
          }
        }
      }
    }
    return true;
  },
  getRuleSet: function(){
    if (!this.style) {
      return null;
    }
    var sheet = this.style.sheet || this.style.styleSheet;
    return sheet.rules || sheet.cssRules;
  },
  getRules: function(selector){
    var r = {};
    if (iStr(selector)) {
      selector = [selector];
    }
    else
    if (iArr(selector)){
      //TODO ?
    }
    else
    if (iObj(selector)){
      //TODO ?
    }
    return r;
  }
};

})();
