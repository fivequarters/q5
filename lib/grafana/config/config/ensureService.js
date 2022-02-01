const fs = require('fs');
const AWS = require('aws-sdk');

(async () => {
  const serviceId = process.env.SERVICE_ID;
  const stackId = process.env.STACK_ID;
  const discoverySdk = new AWS.ServiceDiscovery({ region: process.env.REGION });
  const instances = await discoverySdk.listInstances({ ServiceId: serviceId }).promise();
  for (const instance of instances.Instances) {
    if (instance.Attributes.STACK !== stackId) {
      continue;
    }
    await discoverySdk.deregisterInstance({ ServiceId: serviceId, InstanceId: instance.Id }).promise();
  }
  const ip = fs.readFileSync('/tmp/ip', 'utf-8');
  const instanceId = fs.readFileSync('/tmp/instance-id', 'utf-8');
  await discoverySdk
    .registerInstance({
      ServiceId: serviceId,
      InstanceId: instanceId,
      Attributes: { AWS_INSTANCE_IPV4: ip, STACK: stackId },
    })
    .promise();
})();
