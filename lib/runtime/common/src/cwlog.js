const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const cwl = new AWS.CloudWatchLogs({ apiVersion: '2014-03-28' });

const logGroupName = 'api-lambda-event';

const MAX_BATCH_SZ = 750 * 1024; // Technical limit is 1mb, allow for buffer.
const MIN_EVENT_AGE = 500; // ms
const MAX_BUFFER_DEPTH = 300; // Should be around 600kb worth of events.
const MIN_AVAILABLE_STREAMS = 10;

var numTotalStreams = 0;

class AWSEventStream {
  nextSequenceToken = undefined;

  constructor(logGroup) {
    this._logStreamName = uuidv4();
    this.logGroup = logGroup;
  }

  get logStreamName() {
    return this._logStreamName;
  }

  initialize() {
    // Don't accept a ResourceAlreadyExistsException here.
    cwl
      .createLogStream({
        logGroupName: this.logGroup.logGroupName,
        logStreamName: this.logStreamName,
      })
      .send((err, data) => {
        if (err != null) {
          throw err;
        }

        numTotalStreams++;
        console.log(`LogStream ${numTotalStreams}: ${this.logGroup.logGroupName}/${this.logStreamName} created`);
        this.logGroup.recycle(this);
      });
  }

  write(logEvents) {
    // Warning: very low TPS limit (per stream), institute buffering before going to production.

    let eventLen = logEvents.length;
    let cwlEvents;

    do {
      cwlEvents = logEvents.slice(0, eventLen).map(e => {
        return { timestamp: Number(e.timestamp), message: JSON.stringify(e) };
      });

      if (JSON.stringify(cwlEvents) > MAX_BATCH_SZ) {
        eventLen = Math.ceil(eventLen / 2);
      } else {
        break;
      }
    } while (true);

    // Make sure that the events are in increasing chronological sequence, as required by putLogEvents
    cwlEvents.sort((a, b) => {
      return a.timestamp - b.timestamp;
    });

    let events = {
      logEvents: cwlEvents,
      logGroupName: this.logGroup.logGroupName,
      logStreamName: this.logStreamName,
      sequenceToken: this.nextSequenceToken,
    };

    cwl.putLogEvents(events, (err, data) => {
      if (data != null) {
        this.nextSequenceToken = data.nextSequenceToken;
        this.logGroup.recycle(this);
        return;
      }

      console.log('Failed to write logEvents: ', err);
      console.log('\n\n' + JSON.stringify(cwlEvents) + '\n\n');
    });
    return logEvents.splice(eventLen, logEvents.length);
  }
}

class AWSEventLog {
  logStreams = { available: [] };
  buffer = [];
  bufferAge = 0;

  constructor() {}

  get logGroupName() {
    return 'api-lambda-event';
  }

  initialize() {
    // Accept a ResourceAlreadyExistsException, but fail on others.
    cwl.createLogGroup({ logGroupName: this.logGroupName }).send((err, data) => {
      if (err != null && err.code != 'ResourceAlreadyExistsException') {
        throw err;
      }
      console.log('LogGroup Successfully Created');
      for (let n = 0; n < MIN_AVAILABLE_STREAMS; n++) {
        let stream = new AWSEventStream(this);
        stream.initialize();
      }
    });

    return this;
  }

  writeToLogStream(logEvents) {
    let stream;

    logEvents = Array.isArray(logEvents) ? logEvents : [logEvents];

    this.buffer.push(...logEvents);

    // Force some aging to encourage larger batches..
    if (Date.now() - this.bufferAge < MIN_EVENT_AGE && this.buffer.length < MAX_BUFFER_DEPTH) {
      return;
    }

    // Make sure logStream objects are not co-used, which causes incorrect nextSequenceTokens
    if (this.logStreams.available.length < MIN_AVAILABLE_STREAMS) {
      new AWSEventStream(this).initialize();
    }

    // Get an available stream
    stream = this.logStreams.available.pop();

    // No logstreams available, hopefully some are being created!
    if (!stream) {
      return;
    }
    // Not an asynchronous call.
    this.buffer = stream.write(this.buffer);
    this.bufferAge = Date.now();
  }

  recycle(logStream) {
    // Make this logStream available for the next call.
    this.logStreams.available.push(logStream);
  }
}

exports.EventLog = new AWSEventLog().initialize();
