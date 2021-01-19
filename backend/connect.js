const mongoose = require('mongoose');

// on mac only (and change the hosts file)
// const uri = 'mongodb://localhost:27017,localhost:27018,localhost:27019/'
const uri = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/'

console.log("attempting to connect to ", uri)
mongoose.connect(uri, {
  useNewUrlParser : true,
  useFindAndModify: false, // optional
  useCreateIndex  : true,
  useUnifiedTopology: true,
  replicaSet      : 'rs0', // We use this from the entrypoint in the docker-compose file
})

// Handle the connection event
const db = mongoose.connection;

function connect(){

  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function() { console.log("DB connection alive");});

}

module.exports = { connect }
