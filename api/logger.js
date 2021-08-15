const winston = require('winston');
const path = require('path');
const mongodb = require('mongodb');
const mongoConfig = require('./DB');
// var stackify = require('stackify-logger');

// logger.error is console.error until the winston logger is created
var logger = {error: console.error};

// TODO: I'm not sure if this line should be included
process.on('uncaughtException', (err) => {
  // logger.error({ title: "UNCAUGHT EXCEPTION", error: err } );
  console.dir(err);
});


const timeFormat = 'DD-MM-YYYY HH:mm:ss';

const errorFile = path.join(__dirname, 'logs/error.log');
const combinedFile = path.join(__dirname, 'logs/combined.log');

const enumerateErrorFormat = winston.format((info) => {
  if (info.message instanceof Error) {
    info.message = Object.assign({
      message: info.message.message,
      stack: info.message.stack,
    }, info.message);
  }
  if (info instanceof Error) {
    return Object.assign({
      message: info.message,
      stack: info.stack,
    }, info);
  }
  return info;
});

const consoleFormat = winston.format.printf(
    ({level, message, timestamp, ...metadata}) => {
      // TODO log the rest parameters in metadata
      const stringMessage = JSON.stringify(message);
      let msg = `${timestamp} [${level}] : ${stringMessage}`;
      return msg;
    });

// Create our logger object
logger = winston.createLogger({
  transports: [
    // This transport lets us log to the console
    new winston.transports.Console({
      format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({
            format: timeFormat,
          }),
          winston.format.errors({stack: true}),
          consoleFormat,
      ),
      handleExceptions: true,
    }),
    // This transport logs to the error file
    new winston.transports.File({
      format: winston.format.combine(
          winston.format.timestamp({
            format: timeFormat,
          }),
          winston.format.errors({stack: true}),
          winston.format.json(),
          // enumerateErrorFormat()
      ),
      filename: errorFile,
      handleExceptions: true,
      level: 'error',
      timesamp: true,
    }),
    // This transport should be were everything gets sent
    new winston.transports.File({
      format: winston.format.combine(
          winston.format.timestamp({
            format: timeFormat,
          }),
          winston.format.errors({stack: true}),
          winston.format.json(),
      ),
      timestamp: true,
      filename: combinedFile,
    }),
  ],
  levels: {
    emerg: 0,
    alert: 1,
    crit: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7,
  },
});

require('winston-mongodb');

// use the URL for the test DB if it has been set, otherwise use the normal DB.
const dbURL =
  process.env.TEST_MONGO_URL ||
  ( mongoConfig.DB_AUTH_DETAILS +
    mongoConfig.DB_URL_PREFIX +
    mongoConfig.DB_NAME );

let preconnectedDB = null;
mongodb.MongoClient.connect(dbURL,
    {useUnifiedTopology: true, useNewUrlParser: true})
    .then((db) => {
      logger.info('Winston has connected to MongoDB');
      preconnectedDB = db;
      const mongoTransport = new winston.transports.MongoDB({
        level: 'info', // info is the default
        db: preconnectedDB, // user: logger, pwd: logger, db: logger
        collection: 'log', // default is 'log'
        options: { // modified version of default
          poolSize: 2, // default
          useNewUrlParser: true, // default
          useUnifiedTopology: true, // not default
        },
      });
      logger.info('Adding MongoDB transport to logger');
      logger.add(mongoTransport);
    })
    .catch((err) => {
      logger.error(
          'FAILED TO CONNECT TO MONGODB. MONGODB TRANSPORT WILL NOT BE ADDED.',
          err.message);
    });


// This should be deleted before merging the PR
logger.emerg('this is just a test');
logger.alert('this is just a test');
logger.crit('this is just a test');
logger.error('this is just a test');
logger.warning('this is just a test');
logger.notice('this is just a test');
logger.info('this is just a test');
logger.debug('this is just a test');
throw new Error('test error');

module.exports = logger;
