import superagent from 'superagent';

const fromEventTime = (timeStr: string) => new Date(timeStr).getTime() * 1000000;

interface IParams {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  traceId: string;
}

interface IEntry {
  time: string;
  msg: string;
}

interface ILokiPayload {
  streams: {
    stream: Record<string, string>;
    values: [number, string][];
  }[];
}

const publishLogs = async (params: IParams, logEntries: IEntry[]) => {
  if (!logEntries || logEntries.length === 0) {
    return;
  }
  const payload: ILokiPayload = {
    streams: [
      {
        stream: {
          label: 'benntest',
          accountId: params.accountId,
          subscriptionId: params.subscriptionId,
          boundaryId: params.boundaryId,
          functionId: params.functionId,
        },
        values: [],
      },
    ],
  };

  logEntries.forEach((event) =>
    payload.streams[0].values.push([fromEventTime(event.time), `traceID=${params.traceId} ${event.msg}`])
  );

  const response = await superagent
    .post('http://localhost:3100/loki/api/v1/push')
    .set('Content-Type', 'application/json')
    .set('X-Scope-OrgID', params.accountId)
    .send(payload);

  console.log(`Log Publish: ${response.status} ${response.body}`);
};

export { publishLogs };
