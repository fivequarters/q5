const { ZmqLogger } = require('@5qtrs/zmq-logger');

const zmqPublishUrl = process.env.ZMQ_XSUB || '';
const zmqPublishLevel = process.env.ZMQ_PUBLISH_LEVEL || 'info';

module.exports = ZmqLogger.create({ zmqPublishUrl, zmqPublishLevel, name: 'flexd-functions' });
