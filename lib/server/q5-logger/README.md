# Q5 Logger

This is a server side logging library based on Bunyan. In addition to the default Bunyan behavoior, it allows for sending log entires to the internal ZeroMQ based pubsub service.

### Usage

In the client code:

```typescript
import Q5Logger from '@qtrs/logger';

let logger = new Q5Logger({
  name: 'my_component',
  // zmqPublishUrl: 'tcp://127.0.0.1:5001', // ZMQ_PUBLISH_URL env variable used if not specified
  // zmqPublishLevel: 'info' // ZMQ_PUBLISH_LEVEL env variable used or 'info' if not specified
});
```

**NOTE** If neither _options.zmqPublishUrl_ or the _ZMQ_PUBLISH_URL_ environment variable is specified, logging to ZMQ is disabled.

### Choosing topics to log to

Specific ZMQ topics to log to are selected on a per-entry basis using the _topics_ property, which can be either a string or an array of strings denoting the ZMQ topics to publish the log entry to, e.g.

```typescript
let logger = new Q5Logger({ name: 'q5-functions' });

logger.info({ topic: 'logs:boundary:foo:function:baz', data: {} }, 'function execution');
logger.info({ topic: ['logs:boundary:foo:function:baz', 'system'] }, 'function execution error');
```

Alternatively, a child Bunyan logger can be created pinning the value of the _topic_ property:

```typescript
let newLogger = logger.child({ topic: 'logs:boundary:foo:function:baz' });
newLogger.info('function execution');
```
