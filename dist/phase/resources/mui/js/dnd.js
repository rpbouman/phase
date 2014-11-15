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
var DDHandler;
(DDHandler = function (conf) {
    conf = merge(conf, {
        node: doc
    });
    this.id = conf.id ? conf.id : ++DDHandler.id;
    var me = this;
    me.listeners = [];
    me.endDragListeners = null;
    me.whileDragListeners = null;
    me.node = (node = gEl(conf.node));
    me.mousedown = false;
    me.initdrag = false;
    if (conf.dragProxy !== false) {
      if (!(me.dragProxy = gEl(conf.dragProxy))) {
        me.dragProxy = cEl("DIV", {
          "class": "dnd-drag-proxy",
          id: this.getId() + "-drag-proxy"
        }, null, node);
      }
    }
    if (conf.dropProxy !== false) {
      if (!(me.dropProxy = gEl(conf.dropProxy))) {
        me.dropProxy = cEl("DIV", {
          "class": "dnd-drop-proxy",
          id: this.getId() + "-drop-proxy"
        }, null, node);
      }
    }
    me.startDragEvent = null;

    listen(this.node, "touchstart", function(e){
        e.preventDefault();
        me.event = e;
        me.handleMouseDown(e);
        return false;
    }, this);
    listen(this.node, "mousedown", function(e){
        me.event = e;
        if (e.getButton()===0) {
            me.handleMouseDown(e);
        }
        return false;
    }, this);

    listen(this.node, "touchend", function(e){
        e.preventDefault();
        me.event = e;
        me.handleMouseUp(e);
        return false;
    }, this);
    listen(this.node, "mouseup", function(e){
        e.preventDefault();
        me.event = e;
        if (e.getButton()===0) {
            me.handleMouseUp(e);
        }
        return false;
    }, this);

    listen(this.node, ["mousemove", "touchmove"], function(e){
        e.preventDefault();
        me.event = e;
        me.handleMouseMove(e);
        return false;
    }, this);
}).prototype = {
  getId: function(){
    return DDHandler.prefix + this.id;
  },
  listen: function(listener){
    if (!listener.scope) {
        listener.scope = win;
    }
    this.listeners.push(listener);
  },
  handleMouseDown: function(e) {
    var me = this;
    me.mousedown = true;
    if (!me.initdrag) {
        me.initdrag = true;
        me.node.focus();
        me.startDrag(e);
    }
  },
  handleMouseUp: function(e){
    var me = this;
    if (me.mousedown) {
        if (me.initdrag) {
            me.initdrag = false;
            me.endDrag(e);
        }
        me.mousedown = false;
    }
  },
  handleMouseMove: function(e) {
    var me = this;
    if (me.mousedown) {
        if (!me.initdrag) {
            me.initdrag = true;
            me.startDrag(e);
        }
        else {
            me.whileDrag(e);
        }
    }
  },
  cancelDrag: function() {
    var me = this;
    me.endDragListeners = null;
    me.whileDragListeners = null;
    me.mouseMoveEvent = null;
    var ev = me.startDragEvent;
    if (ev) {
      ev.destroy();
      delete me.startDragEvent;
    }
  },
  startDrag: function(e) {
    var me = this, i,
        listeners = me.listeners,
        n = listeners.length,
        listener
    ;
    me.endDragListeners = [];
    me.whileDragListeners = [];
    me.startDragEvent = e.save();
    for (i = 0; i < n; i++) {
        listener = listeners[i];
        if (listener.startDrag.call(listener.scope, e, me) !== true) {
          continue;
        }
        if (iFun(listener.endDrag)) {
          me.endDragListeners.push(listener);
        }
        if (iFun(listener.whileDrag)) {
          me.whileDragListeners.push(listener);
        }
    }
    if (me.endDragListeners.length + me.whileDragListeners.length) {
      return;
    }
    me.cancelDrag();
  },
  endDrag: function(e) {
    var me = this, i, listeners, listener, n;
    if (!me.startDragEvent) return;
    listeners = me.endDragListeners;
    n = listeners.length;
    for (i = 0; i < n; i++) {
        listener = listeners[i];
        listener.endDrag.call(listener.scope, e, me)
    }
    me.cancelDrag();
    clearBrowserSelection();
  },
  whileDrag: function(e) {
    var me = this, i, n, listeners, listener;
    if (!me.startDragEvent) return;
    listeners = me.whileDragListeners;
    n = listeners.length;
    for (i = 0; i < n; i++) {
        listener = listeners[i];
        listener.whileDrag.call(listener.scope, e, me);
    }
    clearBrowserSelection();
  }
};

DDHandler.id = 0;
DDHandler.prefix = "dnd";

linkCss(muiCssDir + "dnd.css");
