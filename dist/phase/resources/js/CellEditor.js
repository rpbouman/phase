/***************************************************************
*
*   CellEditor
*
***************************************************************/
var CellEditor;

(function() {

(CellEditor = function(conf){
  var me = this;
  conf = conf || {};
  me.conf = conf;
  me.id = conf.id ? conf.id : ++CellEditor.id;
  if (conf.listeners) {
    this.listen(conf.listeners);
  }
  if (!conf.input) {
    conf.input = {
      tagName: "input",
      attributes: {
        type: "text"
      },
      childNodes: null
    };
  }
  CellEditor.instances[me.getId()] = me;
}).prototype = {
  getId: function() {
    return CellEditor.prefix + this.id;
  },
  getContainer: function() {
    return gEl(this.conf.containerId);
  },
  getDom: function() {
    var dom = gEl(this.getId());
    if (!dom) dom = this.createDom();
    return dom;
  },
  createDom: function() {
    var conf = this.conf;
    var input = conf.input;
    var attributes = merge({
      "class": CellEditor.prefix,
      id: this.getId()
    }, input.attributes || {});
    var childNodes = input.childNodes || null;
    if (!childNodes && input.tagName.toLowerCase() === "select" && input.options){
      childNodes = [];
      var i, n = input.options.length, option;
      for (i = 0; i < n; i++) {
        option = input.options[i];
        childNodes.push(cEl("option", {
          value: option,
          label: option
        }, option));
      }
    }
    var dom = cEl(input.tagName, attributes, childNodes);
    //dom.onchange = this.changeHandler;
    dom.onblur = this.changeHandler;
    return dom;
  },
  changeHandler: function() {
    if (this.handlingChange) {
      return;
    }
    this.handlingChange = true;
    var cellEditor = CellEditor.lookup(this);
    cellEditor.handleChange();
    this.handlingChange = false;
  },
  handleChange:  function() {
    var me = this, dom = me.getDom();
    if (!dom.parentNode) return;
    if (dom.value === me.oldValue) {
      me.stopEditing();
      return;
    }
    var oldValue = this.oldValue;
    if (me.doCallback("beforeCellChange", {
      oldValue: oldValue,
      newValue: dom.value,
    }) === false) return;
    if (me.doCallback("cellChanged", {
      oldValue: oldValue,
      newValue: dom.value,
    }) !== false) {
      //this.oldValue = dom.value;
      me.stopEditing();
    }
  },
  doCallback: function(eventType, eventData) {
    if (!this.callback) return;
    return this.callback.call(this.scope || this, this, eventType, eventData);
  },
  setInputValue: function(value){
    var dom = this.getDom();
    switch (dom.tagName.toLowerCase()) {
      case "input":
        dom.value = value;
        break;
      case "select":
        var i, n = dom.options.length, option;
        for (i = 0 ; i < n; i++) {
          option = dom.options[i];
          if (option.value !== value) {
            continue;
          }
          break;
        }
        dom.selectedIndex = i;
        break;
    }
  },
  getInputValue: function(){
    var dom = this.getDom();
    var value;
    switch (dom.tagName.toLowerCase()) {
      case "input":
        value = dom.value;
        break;
      case "select":
        var i, n = dom.options.length, option;
        for (i = 0 ; i < n; i++) {
          option = dom.options[i];
          if (!option.selected) continue;
          value = option.value;
          break;
        }
        break;
    }
    return value;
  },
  stopEditing: function() {
    var me = this;
    var dom = me.getDom();
    var container = dom.parentNode;
    if (!container) return;

    var value = this.getInputValue();
    if (this.fireEvent("stopEditing", {
      container: container,
      oldValue: this.oldValue,
      newValue: value
    })===false) {
      return false;
    }
    if (this.doCallback("stopEditing", null) === false) {
      return false;
    }
    this.callback = null;
    dom.disabled = true;
    try {
      container.removeChild(dom);
      container.innerHTML = value;
    }
    catch (e) {
      debugger;
    }
    this.fireEvent("editingStopped", {
      container: container,
      oldValue: this.oldValue,
      newValue: value
    });
  },
  startEditing: function(container, callback, scope) {
    var me = this;
    if (me.stopEditing() === false) {
      return false;
    }
    var dom = me.getDom();
    this.oldValue = container.innerText || container.textContent;
    if (this.fireEvent("startEditing", {
      container: container,
      oldValue: this.oldValue
    }) === false) {
      return false;
    }
    this.callback = callback;
    this.scope = scope;
    dom.disabled = false;
    dom.style.width = container.clientWidth + "px";
    container.innerHTML = "";
    container.appendChild(dom);
    this.setInputValue(this.oldValue);
    dom.focus();
    if (dom.select) {
      dom.select();
    }
    this.fireEvent("editingStarted", {
      container: container,
      oldValue: this.oldValue
    });
    return true;
  }
};
CellEditor.id = 0;
CellEditor.prefix = "celleditor";
CellEditor.instances = {};
CellEditor.getInstance = function(id){
  if (iInt(id)) id = CellEditor.prefix + id;
  return CellEditor.instances[id];
};
CellEditor.lookup = function(el){
  var re = new RegExp("^" + CellEditor.prefix + "\\d+$", "g");
  while (el && !re.test(el.id)) {
    if ((el = el.parentNode) === doc) return null;
  }
  return CellEditor.getInstance(el.id);
};

adopt(CellEditor, Observable);

})();