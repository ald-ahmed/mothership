var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Robot schema used in the database
var RobotSchema   = new Schema({
  humanName: String,
  color: String,
  position: { x: Number, y: Number, z: Number},
  rating: Number
});

module.exports = mongoose.model('Robot', RobotSchema);
