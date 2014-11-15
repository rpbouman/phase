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
var Observable;
(Observable = function() {
}).prototype = {
  unlisten: function(type, method, scope, context){
    if (arguments.length === 0) {
      this.listeners = null;
      return;
    }
    var listeners = this.listeners;
    if (!listeners) {
      return;
    }
    if (arguments.length === 1) {
      this.listeners[type] = null;
      return;
    }
    if (iArr(type)) {
      var i, n = type.length;
      for (i = 0; i < n; i++) {
        if (arguments.length === 1) {
          var o = type[i], args = [];
          if (iUnd(o.type)) {
            continue;
          }
          args.push(o.type);
          if (iUnd(o.method)) {
            continue;
          }
          args.push(o.method);
          if (iDef(o.scope)) {
            args.push(o.scope);
          }
          if (iDef(o.context)) {
            args.push(o.context);
          }
          this.unlisten.apply(this, args);
        }
        else {
          this.unlisten(type[i], method, scope, context);
        }
      }
      return;
    }
    else
    if (iObj(type)) {
      if (type.method) {
        this.unlisten(type.type, type.method, type.scope, type.context);
      }
      else {
        var p, v, scope = type.scope;
        for (p in type) {
          if (p === "scope") {
            continue;
          }
          v = type[p];
          if (iFun(v)) {
            this.unlisten(p, v, scope);
          }
          else
          if (iObj(v)) {
            this.unlisten(p, v.method, v.scope || scope, v.context)
          }
        }
      }
      return;
    }
    var handlers = listeners[p];
    if (!handlers) return;
    var i, n = handlers.length, handler;
    for (i = 0; i < n; i++) {
      handler = handlers[i];
      if (handler.method === method && handler.scope === (scope || win) && handler.context === (context || null)) {
        handlers.splice(i, 1);
      }
    }
  },
  listen: function(type, method, scope, context) {
    if (iArr(type)) {
      var i, n = type.length;
      for (i = 0; i < n; i++) {
        if (arguments.length === 1) {
          var o = type[i], args = [];
          if (iUnd(o.type)) {
            continue;
          }
          args.push(o.type);
          if (iUnd(o.method)) {
            continue;
          }
          args.push(o.method);
          if (iDef(o.scope)) {
            args.push(o.scope);
          }
          if (iDef(o.context)) {
            args.push(o.context);
          }
          this.listen.apply(this, args);
        }
        else {
          this.listen(type[i], method, scope, context);
        }
      }
      return;
    }
    else
    if (iObj(type)) {
      if (type.method) {
        this.listen(type.type, type.method, type.scope, type.context);
      }
      else {
        var p, v, scope = type.scope;
        for (p in type) {
          if (p === "scope") {
            continue;
          }
          v = type[p];
          if (iFun(v)) {
            this.listen(p, v, scope);
          }
          else
          if (iObj(v)) {
            this.listen(p, v.method, v.scope || scope, v.context)
          }
        }
      }
      return;
    }
    var listeners, handlers, scope;
    if (!(listeners = this.listeners)) {
      listeners = this.listeners = {};
    }
    if (!(handlers = listeners[type])) {
      handlers = listeners[type] = [];
    }
    if (!scope) {
      scope = win;
    }
    if (!context) {
      context = null;
    }
    handlers.push({
      method: method,
      scope: scope,
      context: context
    });
  },
  fireEvent: function(type, data, context) {
    var listeners, handlers, i, n, handler, scope;
    if (!(listeners = this.listeners)) {
      return;
    }
    if (!(handlers = listeners[type])) {
      return;
    }
    for (i = 0, n = handlers.length; i < n; i++){
      handler = handlers[i];
      if (!iUnd(context) && context !== handler.context) {
        continue;
      }
      if (handler.method.call(handler.scope, this, type, data) === false) {
        return false;
      }
    }
    return true;
  }
};
