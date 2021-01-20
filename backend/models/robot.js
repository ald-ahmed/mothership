const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Robot schema used in the database
const RobotSchema = new Schema({
  humanName: String,
  color: String,
  position: { x: Number, y: Number, z: Number },
  rating: Number,
});

module.exports = mongoose.model("Robot", RobotSchema);
