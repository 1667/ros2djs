/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A map that listens to a given occupancy grid topic.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 */
ROS2D.OccupancyGridClient = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var topic = options.topic || '/map';
  this.continuous = options.continuous;
  this.rootObject = options.rootObject || new createjs.Container();

  // current grid that is displayed
  // create an empty shape to start with, so that the order remains correct.
  this.currentGrid = new createjs.Shape();
  this.rootObject.addChild(this.currentGrid);
  // work-around for a bug in easeljs -- needs a second object to render correctly
  this.rootObject.addChild(new ROS2D.Grid({size:1}));
  this.panviewer = new ROS2D.PanView({
    rootObject: this.rootObject
  });
  this.zoomviewer = new ROS2D.ZoomView({
    rootObject:this.rootObject
  });
  this.startx = 0;
  this.starty = 0;
  this.zoomx = 0;
  this.zoomy = 0;
  this.onmove = false;
  this.rootObject.addEventListener('stagemousedown', function(event) {
    that.panviewer.startPan(0,0);
    that.startx = event.stageX;
    that.starty = event.stageY;
    that.onmove = true;

  });
  this.rootObject.addEventListener('stagemousemove', function(event) {
    if(that.onmove)
    {

      that.panviewer.pan(event.stageX-that.startx,event.stageY-that.starty);
    }
    that.zoomx = event.stageX;
    that.zoomy = event.stageY;

  });

  this.rootObject.addEventListener('stagemouseup', function(event) {
    that.onmove = false;
  });
  this.zoomviewin = 1;
  this.rootObject.getStage().canvas.addEventListener('mousewheel',function(event){
    that.zoomviewer.startZoom(that.zoomx,that.zoomy);
    if(event.deltaY > 0)
    {
      that.zoomviewin = 1;
      that.zoomviewin += 0.1;
    }
    else{
      that.zoomviewin = 1;
      that.zoomviewin -= 0.1;
    }
    that.zoomviewer.zoom(that.zoomviewin);
    

    console.log(event);
  });
  
  // subscribe to the topic
  var rosTopic = new ROSLIB.Topic({
    ros : ros,
    name : topic,
    messageType : 'nav_msgs/OccupancyGrid',
    compression : 'png'
  });

  rosTopic.subscribe(function(message) {
    // check for an old map
    var index = null;
    if (that.currentGrid) {
      index = that.rootObject.getChildIndex(that.currentGrid);
      that.rootObject.removeChild(that.currentGrid);
    }

    that.currentGrid = new ROS2D.OccupancyGrid({
      message : message
    });
    if (index !== null) {
      that.rootObject.addChildAt(that.currentGrid, index);
    }
    else {
      that.rootObject.addChild(that.currentGrid);
    }

    that.emit('change');

    // check if we should unsubscribe
    if (!that.continuous) {
      rosTopic.unsubscribe();
    }
  });
};
ROS2D.OccupancyGridClient.prototype.__proto__ = EventEmitter2.prototype;
