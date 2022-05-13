import superagent from 'superagent';
import * as Constants from '@5qtrs/constants';
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

const publishLogs = async (params: IParams, attributes: any[], logEntries: IEntry[]) => {
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
      JSON.stringify({ traceID: params.traceId, spanID: params.spanId, msg: event.msg, reference: attributes }),
    ])
  );

  try {
    await superagent
      .post(`${Constants.LOKI_ENDPOINT}/loki/api/v1/push`)
      .set('Content-Type', 'application/json')
      .set('X-Scope-OrgID', params.accountId)
      .send(payload);
  } catch (err) {
    console.log(`LOKI ERROR: ${err} ${err.response?.text}`); // , JSON.stringify(payload, null, 2));
  }
};

export { publishLogs };
