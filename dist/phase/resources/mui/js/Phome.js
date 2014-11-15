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
    This is phome4js - a stand-alone, cross-browser javascript library
    for working with Pentaho Metadata.
    Phome, pronounced as "foam" is an acronym for PentHO MEtadata.
    Pentaho is a leading open source business intelligence platform.
    Pentaho metadata is a data access abstraction layer.
    phome4js makes enables web applications to access the pentaho metadata layer

    This file contains human-readable javascript source along with the YUI Doc compatible annotations.
    Include this in your web-pages for debug and development purposes only.
    For production purposes, consider using the minified/obfuscated versions in the /js directory.

*/

var Phome;

(function(){

function _isUnd(arg){
    return typeof(arg)==="undefined";
}
function _isArr(arg){
    return arg && arg.constructor === Array;
}
function _isStr(arg) {
    return typeof(arg)==="string";
}

function _applyProps(object, properties, overwrite){
    if (properties && (!object)) {
        object = {};
    }
    for (var property in properties){
        if (properties.hasOwnProperty(property)){
            if (overwrite || _isUnd(object[property])) {
                object[property] = properties[property];
            }
        }
    }
    return object;
}

function _ajax(options){
    var xhr = XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP.3.0"),
        args, url = options.url
    ;
    if (options.params) {
        var name;
        for (name in options.params) {
            url += (url.indexOf("?") === -1 ? "?" : "&") +
                    name + "=" + encodeURIComponent(options.params[name])
            ;
        }
    }
    args = ["GET", url, options.async];
    if (options.username && options.password) {
        args.push(options.username, options.password);
    }
    xhr.open.apply(xhr, args);
    xhr.onreadystatechange = function(){
        switch (this.readyState) {
            case 0:
                options.aborted(options, this);
                break;
            case 4:
                if (xhr.status===200){
                    options.success(options, this);
                }
                else {
                    options.failure(options, this);
                }
                break;
        }
    };
    xhr.setRequestHeader("Accept", "text/xml, application/xml, application/soap+xml");
    xhr.send(null);
    return xhr;
}

function _getElementText(el){
    //on first call, we examine the properies of the argument element
    //to try and find a native (and presumably optimized) method to grab
    //the text value of the element.
    //We then overwrite the original _getElementText
    //to use the optimized one in any subsequent calls
    var func;
    if (!_isUnd(el.innerText)) {         //ie
        func = function(el){
            return el.innerText;
        };
    }
    else
    if (!_isUnd(el.textContent)) {       //ff, chrome
        func = function(el){
            return el.textContent;
        };
    }
    else
    if (!_isUnd(el.nodeTypedValue)) {    //ie8
        func = function(el){
            return el.nodeTypedValue;
        };
    }
    else
    if (el.normalize){
        func = function(el) {
            el.normalize();
            if (el.firstChild){
                return el.firstChild.data;
            }
            else {
                return null;
            }
        }
    }
    else {                      //generic
        func = function(el) {
            var text = [], childNode,
                childNodes = el.childNodes, i,
                numChildNodes = childNodes.length
            ;
            for (i=0; i<numChildNodes; i += 1){
                childNode = childNodes.item(i);
                if (childNode.data!==null) {
                    text.push(childNode.data);
                }
            }
            return text.length ? text.join("") : null;
        }
    }
    _getElementText = func;
    return func(el);
};

function _parseXml(el) {
    var obj,
        nodeIndex,
        nodes = el.childNodes,
        numNodes = nodes.length,
        node, tagName, member
    ;
    for(nodeIndex=0; nodeIndex<numNodes; nodeIndex++){
        node = nodes.item(nodeIndex);
        switch (node.nodeType) {
            case 1:
                if (!obj) {
                    obj = {};
                }
                break;
            case 3:
                if (!obj) {
                    obj = "";
                }
                if (!_isStr(obj)) continue;
                if (/\s+/g.test(node.data)) continue;
                obj += node.data;
                break;
            default:
                continue;
        }
        tagName = node.tagName;
        if (obj.hasOwnProperty(tagName)) {
            member = obj[tagName];
            if (!_isArr(member)) {
                member = obj[tagName] = [member];
            }
            member.push(_parseXml(node));
        }
        else {
            obj[tagName] = _parseXml(node);
        }
    }
    return obj;
}

/**
*   <p>
*   The Phome class provides a javascript API to access the Pentaho metadata layer.
*   To fully understand the scope and purpose of this utility, it is highly recommended
*   to <a href="http://wiki.pentaho.com/display/ServerDoc2x/Pentaho+Metadata+Editor">read about the metadata layer</a> in the <a href="http://wiki.pentaho.com">Pentaho wiki</a>.
*   </p>
*   @class Phome
*   @param options Object standard options
*   @constructor
*/
Phome = function(options){
    this.options = _applyProps(
        _applyProps(
            {},
            Phome.defaultOptions,
            true
        ),
        options,
        true
    );

};

Phome.SERVICE_MODEL_LIST = "listBusinessModels";
Phome.SERVICE_MODEL_DETAIL = "loadModel";

Phome.defaultOptions = {
    requestTimeout: 30000,      //by default, we bail out after 30 seconds
    async: false,               //by default, we do a synchronous request
    metadataService: "/pentaho/content/ws-run/metadataService/"
};


Phome.prototype = {
/**
*    This method can be used to set a number of default options for the Phome instance.
*    This is especially useful if you don't want to pass each and every option to each method call all the time.
*    Where appropriate, information that is missing from the parameter objects passed to the methods of the Phome object
*    may be augmented with the values set through this method.
*    @method setOptions
*    @param Object options
*/
    setOptions: function(options){
        _applyProps(
            this.options,
            options,
            true
        );
    },
    _getMetadata: function(options, parser) {
        var oldScope = options.scope ? options.scope : window,
            oldSuccess = options.success,
            oldFailure = options.failure,
            oldAborted = options.aborted
        ;
        options.scope = this;
        options.success = function(options, xhr) {
            if (oldSuccess) {
                var data = parser.call(this, xhr.responseXML);
                oldSuccess.call(options, data["return"]);
            }
        };
        options.failure = function(options, xhr) {
            if (oldFailure) {
                oldFailure.call(options, {
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };
        options.aborted = function(options, xhr) {
            if (oldAborted) {
                oldAborted.call(oldScope, options, xhr);
            }
        };
        _ajax(options);
    },
    _parseModels: function(responseXml){
        var models = _parseXml(responseXml.documentElement);
        return models;
    },
    getModels: function(options){
        options.url = this.options.metadataService + Phome.SERVICE_MODEL_LIST;
        this._getMetadata(options, this._parseModels);
    },
    _parseModel: function(responseXml){
        var model = _parseXml(responseXml.documentElement);
        return model;
    },
    getModel: function(options){
        options.url = this.options.metadataService + Phome.SERVICE_MODEL_DETAIL;
        this._getMetadata(options, this._parseModel);
    }
};

linkCss(muiCssDir + "metadata.css");

})();
