import AWS from 'aws-sdk';
import http from 'http';
export { getBuffer } from './getBuffer';

interface IEvent {
  STACK_ID: string;
}

export const handler = async (event: IEvent) => {
  const { MON_DEPLOYMENT_NAME, DISCOVERY_PREFIX, DISCOVERY_SUFFIX } = process.env;

  const { STACK_ID } = event;

  const CloudMapSdk = new AWS.ServiceDiscovery();

  const instances = await CloudMapSdk.discoverInstances({
    NamespaceName: DISCOVERY_SUFFIX as string,
    ServiceName: `${DISCOVERY_PREFIX}${MON_DEPLOYMENT_NAME}`,
  }).promise();

  const ip = instances.Instances?.filter((instance) => instance.Attributes?.STACK === STACK_ID).map(
    (instance) => instance.Attributes?.AWS_INSTANCE_IPV4
  );

  if (!ip || !ip[0]) {
    throw Error('Instance was not able to be discovered.');
  }

  const result = await new Promise((res) => {
    const resp = http.request(`http://${ip[0]}:9999/healthz`, (response) => {
      res(response.statusCode);
    });
    resp.end();
  });

  return {
    StatusCode: result === 200 ? 200 : 500,
  };
};
