# PubSub message bus

This is a general purpose, ZeroMQ-based pub/sub message bus for internal use in Q5. The service runs an xpub/xsub ZeroMQ broker. Publishers connect to the xsub endpoint to publish messages. Subscribers connect to the xpub endpoint to subscribe to them. Messages have topics (strings) and body. A subscriber can specify the prefix of the topic of the messages they are interested in receiving.

Currently this is a single-node service that listens on two TCP ports (xsub and xpub). Going forward we can put it in a cluster behind a load balancer and scale out by adding discovery of nodes and cross-node subscriptions and publications. This should be abstracted away from applications acting as subscribers or publishers - those should be configured with two zeromq endpoints to connect to (which in time can point to the LB).

### Run service

```bash
yarn build pubsub
yarn start pubsub
```

By default xsub listens on _tcp://127.0.0.1:5000_, and xpub on _tcp://127.0.0.1:5001_. This can be changed with `XSUBPORT` and `XPUBPORT` environment variables, respectively.

### Publish messages

```typescript
import Zmq from 'zeromq';

let topic = 'boundary:contoso:function:foo:';
let message = JSON.stringify({ some: 'structured message' });
let xsub = 'tcp://127.0.0.1:5000';

let psock = Zmq.socket('pub');
psock.monitor(); // enables the connect event
psock.connect(xsub);
psock.on('connect', () => {
  psock.send(`${topic} ${message}`); // separating topic and message with space is just a convention
  psock.close();
});
```

**NOTE** The structure and hierarchy of the topic string should be carefully designed to satisfy the scoping requirements of subscriptions.

### Subscribe to messages

```typescript
import Zmq from 'zeromq';

let topicPrefix = 'boundary:contoso:';
let xpub = 'tcp://127.0.0.1:5001';

let ssock = Zmq.socket('sub');
ssock.connect(xpub);
ssock.subscribe(topicPrefix);
ssock.on('message', data => {
  // data.toString() would contain 'boundary:contoso:function:foo: {"some":"structured message"}'
  // if the publisher above was used
  assert.ok(data.toString().match(/^boundary:contoso:/));
});
```
