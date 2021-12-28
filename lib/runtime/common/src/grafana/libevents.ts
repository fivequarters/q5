import { Trace, publishTraces } from './libtempo';

interface IEvent {
  fusebit: {
    accountId: string;
    subscriptionId: string;
  };
  timestamp: string;
  request: {
    method: string;
    url: string;
  };
  response: {
    statusCode: number;
  };
  metrics: {
    common: {
      duration: number;
    };
  };
  traceId: string;
  spanId: string;
  parentSpanId: string;
}

type ILogEvents = { time: string; msg: string }[];

export const publishEvent = async (event: IEvent, functionLogs: ILogEvents) => {
  const name = event.request.url
    .replace(new RegExp('/v1/(?!$)'), '')
    .replace(new RegExp('/v2/(?!$)'), '')
    .replace(new RegExp(`account/${event.fusebit.accountId}/(?!$)`), '')
    .replace(new RegExp(`subscription/${event.fusebit.subscriptionId}/(?!$)`), '')
    .replace(new RegExp(`boundary/(?!$)`), '')
    .replace(new RegExp(`function/(?!$)`), '')
    .replace(new RegExp(`integration/(?!$)`), '')
    .replace(new RegExp(`connector/(?!$)`), '');

  const startTime = new Date(event.timestamp).getTime();

  const trace = new Trace(`${event.request.method} ${name}`, event.traceId, event.spanId, event.parentSpanId);
  trace.resource.attributes.url = event.request.url;
  trace.resource.attributes.method = event.request.method;
  trace.resource.attributes.statusCode = `${event.response.statusCode}`;
  if (event.response.statusCode > 399) {
    trace.status.code = 2;
  }

  // Add log events
  functionLogs?.forEach((log) => {
    trace.addEvent(log.time, log.msg);
  });

  // Add startTime, endTime, and duration values
  trace.setStartTime(startTime);
  trace.setEndTime(startTime + event.metrics.common.duration);

  await publishTraces(event.fusebit.accountId, [trace]);
};
