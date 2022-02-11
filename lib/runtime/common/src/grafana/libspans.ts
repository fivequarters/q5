import { Trace, publishTraces } from './libtempo';
import { makeTraceSpanId } from '@5qtrs/constants';

export interface ISpanEvent {
  method: string;
  url: string;
  statusCode: number;
  startTime: number;
  endTime: number;
  error?: {
    code: number;
    status: number;
    statusCode: number;
    message: string;
    properties: { errorMessage: string; errorType: string; stackTrace: string[] };
  };
}

interface IParams {
  fusebit: {
    accountId: string;
  };
  traceId: string;
  spanId: string;
}

export const publishSpans = async (params: IParams, spans?: ISpanEvent[]) => {
  if (!spans) {
    return;
  }

  const traces = await Promise.all(
    spans.map(async (span) => {
      const trace = new Trace(`${span.method} ${span.url}`, params.traceId, makeTraceSpanId(), params.spanId);
      trace.resource.attributes.url = span.url;
      trace.resource.attributes.method = span.method;
      trace.resource.attributes.statusCode = `${span.statusCode}`;
      if (span.statusCode > 399 || span.error) {
        trace.status.code = 2;
      }

      trace.setStartTime(span.startTime);
      trace.setEndTime(span.endTime);

      return trace;
    })
  );

  await publishTraces(params.fusebit.accountId, traces);
};
