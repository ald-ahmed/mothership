const mongoose = require('mongoose');

// on linux servers such as docker containers
let uri = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/'

// on mac only, edit /etc/hosts and include:
// 127.0.0.1  mongo1
// 127.0.0.1  mongo2
// 127.0.0.1  mongo3
if (process.platform === "darwin"){
  uri = 'mongodb://localhost:27017,localhost:27018,localhost:27019/'
}

// connect to the mongo replica set
console.log("attempting to connect to ", uri)
mongoose.connect(uri, {
  useNewUrlParser : true,
  useFindAndModify: false, // optional
  useCreateIndex  : true,
  useUnifiedTopology: true,
  replicaSet      : 'rs0', // we use this from the entrypoint in the docker-compose file
})

// handle the connection event
const db = mongoose.connection;

// module entry point
function connect(){
  db.on('error', console.error.bind(console, 'Connection error:'));
  db.once('open', function() { console.log("DB connection alive");});
}

module.exports = { connect }
