const mongoose = require('mongoose');


mongoose.connect('mongodb://localhost:27017,localhost:27018,localhost:27019/', {
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
