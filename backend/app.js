const robotsRouter = require("./routes/robots");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const express = require("express");
const socket = require("./socket");
const logger = require("morgan");
const db = require("./connect");
const path = require("path");
const cors = require("cors");
const app = express();

// establish db connection
db.connect();
const connection = mongoose.connection;

// once connection open start listening to changes
connection.once("open", () => {
  // establish change stream with db
  const robotChangeStream = connection.collection("robots").watch();
  console.log("Now listening for DB changes");

  // this change will be triggered every time something
  // happens inside collection 'robots'
  robotChangeStream.on("change", (change) => {
    // mini class for what the sent object will look like
    const realtimeUpdate = {
      type: change.operationType, // update, delete, or insert
      id: change.documentKey._id, // id of the object in the database
      document: null, // if operation is insert, the actual data object that was inserted
      updatedFields: null, // if operation is update, the updated data fields
    };

    // based on operation, emit different messages
    switch (change.operationType) {
        // a robot was modified
      case "update":
        realtimeUpdate.updatedFields = change.updateDescription.updatedFields;
        //  have the web socket emit an updated object message
        socket.io.of("/api/socket").emit("modifiedRobot", realtimeUpdate);
        console.log("modifiedRobot", realtimeUpdate);
        break;

        // a robot was created
      case "insert":
        realtimeUpdate.document = change.fullDocument;
        //  have the web socket emit a new object message
        socket.io.of("/api/socket").emit("newRobot", realtimeUpdate);
        console.log("newRobot", realtimeUpdate);
        break;

        // a robot was deleted
      case "delete":
        //  have the web socket emit an object deleted message
        socket.io.of("/api/socket").emit("deletedRobot", realtimeUpdate);
        console.log("deletedRobot", realtimeUpdate);
        break;
    }
  });
});

// express api config
app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// serve the built react app living in /client/build/ folder
app.use(express.static(path.join(__dirname, "../client/build")));

// use the / route for the api endpoints
app.use("/", robotsRouter);

module.exports = { app, socket };
