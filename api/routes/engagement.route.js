const express = require('express');
const app = express();
const engagementRoutes = express.Router();
const MongoClient = require('mongodb').MongoClient;
const multer = require('multer');
const { Readable } = require('stream');
const mongodb = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
const logger = require('../logger')

let Event = require('../models/event');
let User = require('../models/user');


engagementRoutes.route('/addEventForUser/:id').post((req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err) {
      const stackTrace = {};
      Error.captureStackTrace(stackTrace);
      logger.error({
        'endpoint': '/engagement/addEventForUser/:id',
        'error.message': err.message,
        'stackTrace': stackTrace,
      });
      return res.json(err);
    }
    if (user) {
      if (req.body.event) {
        const event = new Event();
        event.type = req.body.event.type;
        event.storyData = req.body.event.storyData; // may be null
        event.userId = user._id;
        event.date = new Date();
        event.save().then(() => {
          return res.status(200).json('Event added succesfully');
        });
      } else {
        return res.status(400)
            .json('Bad request, must include event object in request body');
      }
    } else {
      res.status(404).json('User does not exist');
    }
  });
});

engagementRoutes.route('/addAnalysisEvent').post((req, res) => {
  let event = new Event();
  event.type = req.body.event.type;
  event.statsData = req.body.event.statsData;
  event.userId = req.body.event.userId;
  event.date = new Date();
  console.log(event);
  
  event.save().then(event => {
    res.status(200).json({'event': 'event added successfully', 'id': event._id});
  })
    .catch(err => {
      console.log(err);
      res.status(400).send("unable to save event to DB");
    });

});

engagementRoutes.route('/getPreviousAnalysisData/:type').get((req, res) => {
    Event.find({'type':req.params.type}, (err, events) => {
        if(err) {
            res.json(err);
        }
        if(events) {
            res.status(200).json(events);
        } else {
            res.status(404).json("DB does not have any event stats data.");
        }
    });
});

engagementRoutes.route('/eventsForUser/:id').get((req, res) => {
    Event.find({'userId':req.params.id}, (err, events) => {
        if(err) {
            res.json(err);
        }
        if(events) {
            res.status(200).json(events);
        } else {
            res.status(404).json("User does not have any events.");
        }
    });
});

engagementRoutes.route('/eventsForStory/:id').get((req, res) => {
    Event.find({"storyData._id" : req.params.id}, (err, events) => {
        if(err) {
            res.json(err);
        }
        if(events) {
            res.status(200).json(events);
        } else {
            res.status(404).json("User does not have any events.");
        }
    });
});

module.exports = engagementRoutes;
