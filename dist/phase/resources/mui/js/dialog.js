var Dialog;
(function(){

(Dialog = function(conf){
  this.conf = conf;
  this.createDom();
}).prototype = {
  yesLabel: "Yes",
  noLabel: "No",
  cancelLabel: "Cancel",
  createDom: function(){
    this.yesButton = cEl("button", {
      "class": Dialog.prefix + "-button-yes"
    });
    listen(this.yesButton, "click", this.yesHandler, this);

    this.noButton = cEl("button", {
      "class": Dialog.prefix + "-button-no"
    });
    listen(this.noButton, "click", this.noHandler, this);

    this.cancelButton = cEl("button", {
      "class": Dialog.prefix + "-button-cancel"
    });
    listen(this.cancelButton, "click", this.cancelHandler, this);

    this.title = cEl("div", {
      "class": Dialog.prefix + "-title"
    });
    this.body = cEl("div", {
      "class": Dialog.prefix + "-body"
    });

    this.dom = cEl("div", {
      "class": Dialog.prefix
    }, [
      this.title,
      this.body,
      cEl("div", {
        "class": Dialog.prefix + "-buttons"
      }, [this.yesButton, this.noButton, this.cancelButton])
    ], body);
    this.hide();
  },
  getDom: function(){
    if (!this.dom) {
      this.createDom();
    }
    return this.dom;
  },
  yesHandler: function(){
    if (this._conf.yes && this._conf.yes.handler) {
      this._conf.yes.handler.call(this._conf.scope);
    }
    this.hide();
  },
  noHandler: function(){
    if (this._conf.no && this._conf.no.handler) {
      this._conf.no.handler.call(this._conf.scope);
    }
    this.hide();
  },
  cancelHandler: function(){
    if (this._conf.cancel && this._conf.cancel.handler) {
      this._conf.cancel.handler.call(this._conf.scope);
    }
    this.hide();
  },
  show: function(conf){
    if (!conf) {
      conf = this.conf;
    }
    var dom = this.getDom();

    this._conf = conf;
    if (conf.yes) {
      this.yesButton.innerHTML = conf.yes.label || this.yesLabel;
    }
    Displayed.setDisplayed(this.yesButton, Boolean(conf.yes));

    if (conf.no) {
      this.noButton.innerHTML = conf.no.label || this.noLabel;
    }
    Displayed.setDisplayed(this.noButton, Boolean(conf.no));

    if (conf.cancel) {
      this.cancelButton.innerHTML = conf.cancel.label || this.cancelLabel;
    }
    Displayed.setDisplayed(this.cancelButton, Boolean(conf.cancel));

    this.title.innerHTML = conf.title;
    this.body.innerHTML = conf.message;
    Dialog._super.prototype.show.call(this, conf);

    var innerWidth = window.innerWidth || doc.clientWidth;
    var left = parseInt((innerWidth - dom.clientWidth)/2, 10);
    dom.style.left = left + "px";

    var innerHeight = window.innerHeight || doc.clientHeight;
    var top = parseInt((window.innerHeight - dom.clientHeight)/2, 10);
    dom.style.top = top + "px";
  }
};

adopt(Dialog, Displayed);
Dialog.prefix = "dialog";

linkCss(muiCssDir + "dialog.css");

})();