var CubeDiagramModel;

(function(){

(CubeDiagramModel = function(conf){
  if (!conf){
    conf = {};
  }
  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  initModel: function(){
    this.sharedDimensions = [];
    this.cubeDimensions = [];
    this.measures = [];
    this.tables = [];
    this.columns = [];
    this.relationships = [];
  },
  eachSharedDimension: function(callback, scope) {
    var i, sharedDimensions = this.sharedDimensions, sharedDimension, n = sharedDimensions.length;
    for (i = 0; i < n; i++) {
      sharedDimension = sharedDimensions[i];
      if (callback.call(scope || this, sharedDimension, i) === false) {
        return false;
      }
    }
    return true;
  },
  eachCubeDimension: function(callback, scope) {
    var i, cubeDimensions = this.cubeDimensions, cubeDimension, n = cubeDimensions.length;
    for (i = 0; i < n; i++) {
      cubeDimension = cubeDimensions[i];
      if (callback.call(scope || this, cubeDimension, i) === false) {
        return false;
      }
    }
    return true;
  },
  eachDimensionUsage: function(callback, scope, sharedDimensionIndex) {
    var sharedDimension = null;
    if (typeof(sharedDimensionIndex) !== "undefined") {
      sharedDimension = this.getSharedDimension(sharedDimensionIndex);
      if (sharedDimension) {
        sharedDimension = sharedDimension.dimension.attributes.name;
      }
    }
    var ret = this.eachCubeDimension(function(cubeDimension, index){
      var dimension = cubeDimension.dimension;
      if (dimension.tagName !== "DimensionUsage") {
        //not a dimensionusage, bail.
        return true;
      }
      if (sharedDimension && dimension.attributes.source !== sharedDimension) {
        //dimensionusage, but not of requested shared dimension.
        return true;
      }
      return callback.call(scope || null, cubeDimension, index);
    });
    return ret;
  },
  eachMeasure: function(callback, scope) {
    var i, measures = this.measures, measure, n = measures.length;
    for (i = 0; i < n; i++) {
      measure = measures[i];
      if (callback.call(scope || this, measure, i) === false) {
        return false;
      }
    }
    return true;
  },
  addMeasure: function(measure){
    var measures = this.measures;
    measures.push(measure);
    var eventData = {
      measures: measures,
      index: measures.length - 1
    };
    this.fireEvent("measureAdded", eventData);
  },
  getMeasure: function(index){
    return this.measures[index];
  },
  addSharedDimension: function(sharedDimension){
    var sharedDimensions = this.sharedDimensions;
    sharedDimensions.push(sharedDimension);
    var eventData = {
      dimension: sharedDimension,
      index: sharedDimensions.length - 1
    };
    this.fireEvent("sharedDimensionAdded", eventData);
  },
  getSharedDimensionIndex: function(name){
    var index = -1;
    this.eachSharedDimension(function(sharedDimension, i){
      if (sharedDimension.dimension.attributes.name === name){
        index = i;
        return false;
      }
      return true;
    });
    return index;
  },
  getSharedDimension: function(index){
    return this.sharedDimensions[index];
  },
  addCubeDimension: function(cubeDimension){
    var cubeDimensions = this.cubeDimensions;
    cubeDimensions.push(cubeDimension);
    var eventData = {
      dimension: cubeDimension,
      index: cubeDimensions.length - 1
    };
    this.fireEvent("cubeDimensionAdded", eventData);
  },
  getPrivateDimensionIndex: function(name){
    var index = -1;
    this.eachCubeDimension(function(cubeDimension, i){
      var dimension = cubeDimension.dimension;
      if (dimension.tagName === "Dimension" && dimension.attributes.name === name){
        index = i;
        return false;
      }
      return true;
    });
    return index;
  },
  getDimensionUsageIndex: function(name){
    var index = -1;
    this.eachCubeDimension(function(cubeDimension, i){
      var dimension = cubeDimension.dimension;
      if (dimension.tagName === "DimensionUsage" && dimension.attributes.name === name){
        index = i;
        return false;
      }
      return true;
    });
    return index;
  },
  getCubeDimension: function(index){
    return this.cubeDimensions[index];
  }
};

adopt(CubeDiagramModel, DiagramModel);

})();