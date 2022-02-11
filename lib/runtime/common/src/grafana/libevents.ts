import { Trace, publishTraces } from './libtempo';

interface IEvent {
  fusebit: {
    accountId: string;
    subscriptionId: string;
    boundaryId: string;
    functionId: string;
    identityId?: string;
    installId?: string;
    sessionId?: string;
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

export interface ILogEvent {
  time: string;
  msg: string;
  level: number;
  method: string;
}

export const publishEvent = async (event: IEvent, functionLogs: ILogEvent[]) => {
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

  trace.attributes = {
    accountId: event.fusebit.accountId,
    subscriptionId: event.fusebit.subscriptionId,
    boundaryId: event.fusebit.boundaryId,
    functionId: event.fusebit.functionId,
    ...(event.fusebit.identityId ? { identityId: event.fusebit.identityId } : {}),
    ...(event.fusebit.installId ? { installId: event.fusebit.installId } : {}),
    ...(event.fusebit.sessionId ? { sessionId: event.fusebit.sessionId } : {}),
  };
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
