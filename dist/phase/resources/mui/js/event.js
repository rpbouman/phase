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
var _Event;
(_Event = function(e) {
    if (!e) {
        e = win.event;
    }
    this.browserEvent = e;
    return this;
}).prototype = {
    getType: function(){
      return this.browserEvent.type;
    },
    getTarget: function(){
        if (this.target) return this.target;
        var browserEvent = this.browserEvent;
        if (browserEvent.target) {
            target = browserEvent.target;
        }
        else
        if (browserEvent.srcElement) {
            target = browserEvent.srcElement
        }
        else {
            target = null;
            return target;
        }
        if (target.nodeType === 3) {
          target = target.parentNode;
        }
        return target;
    },
    getButton: function(){
        if (doc.addEventListener) {
            return this.browserEvent.button;
        }
        else
        if (doc.attachEvent) {
            switch (this.browserEvent.button) {
                case 1:
                    return 0;
                case 2:
                    return 2;
                case 4:
                    return 1;
            }
        }
        return null;
    },
    getKeyCode: function(){
        return this.browserEvent.keyCode;
    },
    getShiftKey: function(){
        return this.browserEvent.shiftKey;
    },
    getCtrlKey: function(){
        return this.browserEvent.ctrlKey;
    },
    getXY: function(){
        //var p = pos(this.getTarget());
      var touches = this.browserEvent.touches;
      if (touches && touches.length) {
        return {
            x: touches[0].clientX,
            y: touches[0].clientY
        }
      }
      else {
        return {
            x: this.browserEvent.clientX,
            y: this.browserEvent.clientY
        }
      }
    },
    preventDefault: function() {
      if (this.browserEvent.preventDefault) {
        this.browserEvent.preventDefault();
      }
      else {
        this.browserEvent.returnValue = false;
      }
    },
    save: function(){
        var proto = _Event.prototype, savedEvent = new _Event.Saved(), property;
        for (property in proto) {
            if (property.indexOf("get")===0 && iFun(proto[property])) {
                savedEvent[
                    property.substr(3,1).toLowerCase() + property.substr(4)
                ] = this[property]();
            }
        }
        return savedEvent;
    }
};

(_Event.Saved = function() {
}).prototype = {
    destroy: function(){
        for (var p in this) {
            if (this.hasOwnProperty(p)){
                delete this.p;
            }
        }
    }
};

for (property in _Event.prototype) {
    if (property.indexOf("get")===0 && iFun(_Event.prototype[property])) {
        _Event.Saved.prototype[property] = new Function(
            "return this." + property.substr(3,1).toLowerCase() + property.substr(4) + ";"
        )
    }
}

var GlobalEvent = new _Event(null);

_Event.get = function(e) {
    if (!e) e = win.event;
    GlobalEvent.browserEvent = e;
    return GlobalEvent;
};

function listen(node, type, listener, scope) {
  var i, n;
  if (iArr(node)) {
    n = node.length;
    for (i = 0; i < n; i++){
      listen(node[i], type, listener, scope);
    }
    return;
  }
  else
  if (iArr(type)) {
    n = type.length;
    for (i = 0; i < n; i++){
      listen(node, type[i], listener, scope);
    }
    return;
  }
  else
  if (iArr(listener)) {
    n = listener.length;
    for (i = 0; i < n; i++){
      listen(node, type, listener[i], scope);
    }
    return;
  }
  else {
    if (!scope) scope = win;
    if (listener && (node === win || (node = gEl(node)))) {
      if (node.addEventListener) {
          node.addEventListener(type, function(e){
              listener.call(scope, _Event.get(e));
          }, false);
      }
      else
      if (node.attachEvent){
          node.attachEvent("on" + type, function(){
              listener.call(scope, _Event.get(win.event));
          });
      }
    }
    else {
      throw "Couldn't listen to this object";
    }
  }
}

function unlisten(node, type, listener) {
  var method;
  if (iFun(node.removeEventListener)) method = node.removeEventListener;
  else
  if (iFun(node.detachEvent)) method = node.detachEvent;
  if (method) method.call(node, type, listener);
}
