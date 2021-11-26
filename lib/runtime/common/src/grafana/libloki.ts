import superagent from 'superagent';

const fromEventTime = (timeStr: string) => new Date(timeStr).getTime() * 1000000;

interface IParams {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  traceId: string;
  spanId: string;
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
    payload.streams[0].values.push([
      fromEventTime(event.time),
      JSON.stringify({ traceID: params.traceId, spanID: params.spanId, msg: event.msg }),
    ])
  );

  try {
    await superagent
      .post('http://loki:3100/loki/api/v1/push')
      .set('Content-Type', 'application/json')
      .set('X-Scope-OrgID', params.accountId)
      .send(payload);
  } catch (err) {
    console.log(`LOKI ERROR: ${err} ${err.response?.text}`); // , JSON.stringify(payload, null, 2));
  }
};

export { publishLogs };
