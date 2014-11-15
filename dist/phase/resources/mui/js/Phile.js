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
/*
    This is phile4js - a stand-alone, cross-browser javascript library
    for working with Pentaho repository files.
    Phile, pronounced as "file" is an acronym for PentHO fILEs.
    Pentaho is a leading open source business intelligence platform.
    Pentaho has a repository for storing content.
    The repository is organized resembling a directory/file system.
    phile4js enables web applications to access files in the pentaho repository/

    This file contains human-readable javascript source along with the YUI Doc compatible annotations.
    Include this in your web-pages for debug and development purposes only.
    For production purposes, consider using the minified/obfuscated versions in the /js directory.
*/

var Phile;

(function(){

function escapePath(path){
  return path.replace(/\//g, ":");
}

Phile = function(options) {
  this.options = merge({}, options, Phile.defaultOptions);
}

Phile.prototype = {
  request: function(conf){
    var scope = conf.scope || window;
    var success = conf.success;
    var failure = conf.failure;
    var url = this.options.service;
    var path = conf.path;
    if (path) {
      path = iArr(path) ? path.join(":") : escapePath(path);
      url += path;
    }
    conf.url = url;
    if (conf.action) url += "/" + conf.action;
    if (!conf.headers) conf.headers = {};
    if (!conf.headers.Accept) conf.headers.Accept = "application/json";
    ajax(conf);
  },
  getChildren: function(conf) {
    if (!conf.params) conf.params = {};
    conf.params.depth = 1;
    conf.action = "children";
    conf.method = "GET";
    this.request(conf);
  },
  getTree: function(conf) {
    if (!conf.params) conf.params = {};
    conf.params.depth = 0;
    conf.action = "children";
    conf.method = "GET";
    this.request(conf);
  },
  getContents: function(conf) {
    conf.action = null;
    conf.method = "GET";
    this.request(conf);
  },
  getProperties: function(conf) {
    conf.action = "properties";
    conf.method = "GET";
    this.request(conf);
  },
  save: function(conf) {
    conf.method = "PUT";
    var _success, _scope;
    if (conf.success) {
      _success = conf.success;
      _scope = conf.scope || null;
    }
    var success = function(options, xhr, data){
      var mantle_fireEvent = window.top.mantle_fireEvent;
      if (iFun(mantle_fireEvent)) {
        mantle_fireEvent.call(window.top, "GenericEvent", {"eventSubType": "RefreshBrowsePerspectiveEvent"});
        mantle_fireEvent.call(window.top, "GenericEvent", {"eventSubType": "RefreshCurrentFolderEvent"});
      }
      if (iFun(_success)) {
        _success.call(_scope, options, xhr, data);
      }
    }
    conf.success = success;
    this.request(conf);
  }
}

Phile.defaultOptions = {
    requestTimeout: 30000,      //by default, we bail out after 30 seconds
    async: true,               //by default, we do a synchronous request
    service: "/pentaho/api/repo/files/"
};

})();
