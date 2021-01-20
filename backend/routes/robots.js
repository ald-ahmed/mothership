// Robot model lives here
const Robot = require("../models/robot");
const express = require("express");
const router = express.Router();

// middleware to use for all requests
router.use(function (req, res, next) {
    // do some logging
    console.log("API is getting called");
    next();
});

// test route to make sure everything is working
router.get("/", function (req, res) {
    res.json({ message: "hi you've reached the robot control center" });
});

// on routes that end in /configs
// ----------------------------------------------------
router
    .route("/configs")

    // POST = create a new config
    .post(function (req, res) {
        // create a new instance of the Robot model
        // do some validation here on the body if needed
        let newRobot = new Robot(req.body);

        // save to db (note: this will trigger a change stream event, see app.js)
        newRobot.save(function (err) {
            if (err) {    console.log("error creating", err);res.status(400).send(err);}
            res.json(newRobot);
        });
    })

    // GET = return all the robot configs from db
    .get(function (req, res) {
        Robot.find(function (err, docs) {
            if (err) res.status(400).send(err);
            res.json(docs);
        });
    });

// on routes that end in /configs/:config_id
// ----------------------------------------------------
router
    .route("/configs/:config_id")

    // GET = return the robot config with id <config_id>
    .get(function (req, res) {
        Robot.findById(req.params.config_id, function (err, config) {
            if (err) res.status(400).send(err);
            res.json(config);
        });
    })

    // PUT = update the robot config with id <config_id>
    .put(function (req, res) {
        Robot.findOneAndUpdate(
            { _id: req.params.config_id }, // get the record with this id
            { $set: req.body }, // update that records body
            { new: true }, // return the new updated version
            (err, config) => {
                if (err) res.status(400).send(err);
                res.status(200).json(config);
            }
        );
    })

    // DELETE = delete the robot config with id <config_id>
    .delete(function (req, res) {
        Robot.findByIdAndRemove(req.params.config_id, function (err, config) {
            if (err) {
                res.status(500).send("Error");
            } else if (config) {
                config.remove(() => {
                    res.status(200).json(config);
                });
            } else {
                res.status(404).send("Not found");
            }
        });
    });

module.exports = router;
