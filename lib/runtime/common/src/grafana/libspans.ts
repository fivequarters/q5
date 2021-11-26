import { Trace, publishTraces } from './libtempo';
import { makeTraceSpanId } from '@5qtrs/constants';

interface ISpan {
  method: string;
  url: string;
  statusCode: number;
  error: any;
  startTime: number;
  endTime: number;
}

interface IParams {
  fusebit: {
    accountId: string;
  };
  traceId: string;
  spanId: string;
}

export const publishSpans = async (params: IParams, spans?: ISpan[]) => {
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
