(function(window) {

var _createXhr;
if (window.XMLHttpRequest) _createXhr = function(){
    return new window.XMLHttpRequest();
}
else
if (window.ActiveXObject) _createXhr = function(){
    return new window.ActiveXObject("MSXML2.XMLHTTP.3.0");
}

var Pham;

Pham = function(options) {
  this.options = options || {
    url: "../../../../plugin/data-access/api/datasource/analysis/catalog"
  };
};

Pham.prototype = {
  request: function(options) {
    var me = this,
        xhr = _createXhr(),
        url = options.url
    ;
    var method = options.method || "GET";
    xhr.open(method, url, true);
    if (options.headers) {
      var header;
      for (header in options.headers){
        xhr.setRequestHeader(header, options.headers[header]);
      }
    }
    xhr.onreadystatechange = function() {
      var scope = options.scope ? options.scope : window;
      switch (xhr.readyState) {
        case 0:
          if (typeof(options.aborted) === "function") {
            options.aborted.call(scope, me, options);
          }
          break;
        case 4:
          var errorText = null;
          switch (xhr.status) {
            case 200:
              if (typeof(options.success) === "function") {
                var data;
                try {
                  switch (xhr.getResponseHeader("Content-Type")) {
                    case "application/xml":
                    case "text/xml":
                      data = parseXmlText(xhr.responseText);
                      break
                    case "application/json":
                      data = JSON.parse(xhr.responseText);
                      break
                    default:
                      data = xhr.responseText;
                  }
                  options.success.call(scope, me, options, data);
                  break;
                }
                catch (e) {
                  errorText = e.toString();
                }
              }
            default:
              if (typeof(options.failure) === "function") {
                options.failure.call(
                  scope, me, options, status,
                  errorText ? errorText : xhr.statusText
                );
              }
              break;
          }
          break;
      }
    };
    xhr.send(options.data ? options.data : null);
  },
  getDataSourceInfo: function(options){
    var oldSuccess = options.success;
    var scope = options.scope || null;
    options.method = "GET";
    options.headers = {
      "Accept": "text/plain"
    };
    options.success = function(xhr, options, data){
      var doc = {};
      var i, items = data.split(";"), n = items.length, item, value;
      for (i = 0; i < n; i++) {
        item = items[i];
        item = item.split("=");
        value = item[1];
        if (value.length >= 2 &&
          (value.charAt(0) === "\"" && value.charAt(value.length-1) === "\"")
        ||(value.charAt(0) === "'" && value.charAt(value.length-1) === "'")
        ) {
          value = value.substr(1, value.length-2);
        }
        doc[item[0]] = value;
      }
      if (oldSuccess) {
        oldSuccess.call(scope, doc);
      }
    }
    var path = this.options.url.split("/");
    path.pop();
    path.pop();
    options.url = path.join("/") + "/" + options.modelName + "/getAnalysisDatasourceInfo";
    this.request(options);
  },
  getModels: function(options){
    var oldSuccess = options.success;
    var scope = options.scope || null;
    options.method = "GET";
    options.headers = {
      "Accept": "application/xml"
    };
    options.success = function(xhr, options, doc){
      var models = [], items = doc.childNodes[1].childNodes, n = items.length, i, item;
      for (i = 0; i < n; i++){
        item = items[i];
        models[i] = item.childNodes[0].data;
      }
      if (oldSuccess) oldSuccess.call(scope, models);
    }
    options.url = this.options.url;
    this.request(options);
  },
  getModel: function(options){
    var oldSuccess = options.success;
    var scope = options.scope || null;
    options.method = "GET";
    options.headers = {
      "Accept": "application/xml"
    };
    options.success = function(xhr, options, doc){
      model = new MondrianModel(doc);
      model.setName(options.modelName);
      if (oldSuccess) oldSuccess.call(scope, model);
    }
    options.url = this.options.url + "/" + options.modelName;
    this.request(options);
  },
  deleteModel: function(options){
    var scope = options.scope || null;
    options.method = "DELETE";
    options.url = this.options.url + "/" + options.modelName;
    this.request(options);
  },
  postModel: function(options){
    var scope = options.scope || null;
    options.method = "POST";

    options.headers = {
      "Accept": "text/plain"
    };

    var url = this.options.url.split("/");
    url.pop();
    url.pop();
    url.pop();
    url.push("mondrian");
    url.push("postAnalysis");
    options.url = url.join("/");

    var xml = "", model = options.model;
    if (model instanceof MondrianModel) {
      xml = model.toXml();
      xml = xml.substr(xml.indexOf("?>") + 2);
      if (!options.datasource) {
        options.datasource = model.getDataSourceName();
      }
      if (!options.EnableXmla){
        options.EnableXmla = String(model.getXmlaEnabled());
      }
    }
    else
    if (typeof(model) === "string") {
      xml = model;
    }

    var boundary = '---------------------------';
    boundary += Math.floor(Math.random()*32768);
    boundary += Math.floor(Math.random()*32768);
    boundary += Math.floor(Math.random()*32768);

    options.headers = {
      "Content-Type": "multipart/form-data; boundary=" + boundary
    };
    var msg = "--" + boundary +
              "\r\nContent-Disposition: form-data; name=\"uploadAnalysis\"; filename=\"file.xml\"" +
              "\r\nContent-Type: text/xml" +
              "\r\n\r\n" + xml +
              "\r\n--" + boundary +
              "\r\nContent-Disposition: form-data; name=\"parameters\"" +
              "\r\n\r\nDataSource="       + options.datasource +
                      ";overwrite="       + String(iDef(options.overwrite) ?  options.overwrite : false) +
                      ";EnableXmla=" + String(iDef(options.EnableXmla) ?  options.EnableXmla : false) +
              "\r\n--" + boundary + "--";

    options.data = msg;
    var oldSuccess = options.success;
    options.success = function(xhr, options, data){
      if (data === "3") {
        oldSuccess.call(scope, xhr, options, "Success");
      }
      else {
        //check org.pentaho.platform.plugin.services.importer.PlatformImportException
        var error = "";
        switch (data) {
          case "1":   //PUBLISH_TO_SERVER_FAILED
            error = "PUBLISH_TO_SERVER_FAILED";
            break;
          case "2":   //PUBLISH_GENERAL_ERROR
            error = "PUBLISH_GENERAL_ERROR";
            break;
          case "6":   //PUBLISH_DATASOURCE_ERROR
            error = "PUBLISH_DATASOURCE_ERROR";
            break;
          case "5":   //PUBLISH_USERNAME_PASSWORD_FAIL
            error = "PUBLISH_USERNAME_PASSWORD_FAIL";
            break;
          case "7":   //PUBLISH_XMLA_CATALOG_EXISTS
            error = "PUBLISH_XMLA_CATALOG_EXISTS";
            break;
          case "8":   //PUBLISH_SCHEMA_EXISTS_ERROR
            error = "PUBLISH_SCHEMA_EXISTS_ERROR";
            break;
          case "9":   //PUBLISH_CONTENT_EXISTS_ERROR
            error = "PUBLISH_CONTENT_EXISTS_ERROR";
            break;
          case "10":  //PUBLISH_PROHIBITED_SYMBOLS_ERROR;
            error = "PUBLISH_PROHIBITED_SYMBOLS_ERROR";
            break;
        }
        if (options.failure) {
          options.failure.call(scope, xhr, options, 200, error);
        }
      }
    }
    this.request(options);
  },
};

if (typeof(define)==="function" && define.amd) {
  define(function (){
      return Pham;
  });
}
else window.Pham = Pham;

return Pham;
})(typeof exports === "undefined" ? window : exports);
