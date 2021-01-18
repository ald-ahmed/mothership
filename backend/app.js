const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const configRouter = require('./routes/robots');
const db = require('./connect');
const app = express();
const http = require('http')
const server = http.createServer(app);
const mongoose = require('mongoose');
const cors = require("cors");

const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.of('/api/socket').on("connection", (socket) => {
  console.log("socket.io: User connected: ", socket.id);

  socket.on("disconnect", () => {
    console.log("socket.io: User disconnected: ", socket.id);
  });
});

db.connect();

const connection = mongoose.connection;

connection.once("open", () => {

  const robotChangeStream = connection.collection("robots").watch();
  console.log("Now listening for DB changes");

  robotChangeStream.on("change", (change) => {

    const realtimeUpdate = {
      type: change.operationType,
      id: change.documentKey._id,
      document: null,
      updatedFields: null,
    }


    switch (change.operationType) {

      case "update":
        realtimeUpdate.updatedFields = change.updateDescription.updatedFields
        io.of("/api/socket").emit("modifiedRobot", realtimeUpdate);
        console.log("modifiedRobot", realtimeUpdate);
        break;
      case "insert":
        realtimeUpdate.document = change.fullDocument
        io.of("/api/socket").emit("newRobot", realtimeUpdate);
        console.log("newRobot", realtimeUpdate);
        break;

      case "delete":
        io.of("/api/socket").emit("deletedRobot", realtimeUpdate);
        console.log("deletedRobot", realtimeUpdate);
        break;
    }

  });

});


app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', configRouter);

server.listen(1818);

module.exports = app;

