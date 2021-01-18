var express = require('express');
var router = express.Router();

// Robot models lives here
const Robot = require('../models/robot');

// middleware to use for all requests
router.use(function(req, res, next) {
  // do logging
  console.log('API is getting called');
  next();
});

// test route to make sure everything is working
router.get('/', function(req, res) {
  res.json({ message: 'hi you\'ve reached the robot control center' });
});


// on routes that end in /configs
// ----------------------------------------------------
router.route('/configs')

  // create a config
  .post(function(req, res) {

    console.log("creating a new robot", req.body)

    let newRobot = new Robot(req.body);		// create a new instance of the Robot model

    newRobot.save(function(err) {
      if (err)
        res.send(err);

      res.json(newRobot);
    });


  })

  // get all the configs
  .get(function(req, res) {
    Robot.find(function(err, docs) {
      if (err)
        res.send(err);

      res.json(docs);
    });
  });


// on routes that end in /configs/:config_id
// ----------------------------------------------------
router.route('/configs/:config_id')

  // get the config with that id
  .get(function(req, res) {
    Robot.findById(req.params.config_id, function(err, config) {
      if (err)
        res.send(err);
      res.json(config);
    });
  })

  // update the config with this id
  .put(function(req, res) {
    Robot.findOneAndUpdate({_id: req.params.config_id}, {$set:req.body}, {new: true}, (err, config) => {

      if (err) {
        console.log('UPDATE Error: ' + err);
        res.status(400).send(err);
      }
      else {
        res.status(200).json(config);
      }
    });
  })

  // delete the config with this id
  .delete(function(req, res) {

    Robot.findByIdAndRemove(req.params.config_id, function(err, config) {

      if (err) {
        console.log('Delete Error: ' + err);
        res.status(500).send('Error');
      } else if (config) {
        config.remove( () => {
          res.status(200).json(config);
        });
      } else {
        res.status(404).send('Not found');
      }

    });

  });


module.exports = router;


















