const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const grpc = require('@grpc/grpc-js');
import * as Constants from '@5qtrs/constants';

type IHRTime = [number, number];

const toHrTime = (now: number): IHRTime => [Math.floor(now / 1000), (now % 1000) * 1000000];
const durationHrTime = (start: IHRTime, end: IHRTime): IHRTime => {
  const s = start[0] * 1000000000 + start[1];
  const e = end[0] * 1000000000 + end[1];
  const r = e - s;
  return [Math.floor(r / 1000000000), r % 1000000000];
};

class Trace {
  public name: string = 'fusebit';
  public kind: number = 0;
  /* tslint:disable-next-line variable-name */
  public _traceId: string;
  /* tslint:disable-next-line variable-name */
  public _spanId: string;
  public parentSpanId: string;

  public startTime!: IHRTime;
  public endTime!: IHRTime;
  public duration!: IHRTime;

  public spanContext() {
    return { traceId: this._traceId, spanId: this._spanId, droppedAttributesCount: 0 };
  }

  public status = { code: 0 };
  public attributes = {};
  public links = [];
  public events: { time: IHRTime; name: string }[] = [];
  public ended = true;
  public resource: { attributes: Record<string, string> } = { attributes: {} };
  public instrumentationLibrary = { name: 'fusebit', version: '1.0.0' };

  constructor(serviceName: string, traceId: string, spanId: string, parentSpanId: string) {
    this._traceId = traceId;
    this._spanId = spanId;
    this.parentSpanId = parentSpanId;

    this.resource = {
      attributes: {
        'service.name': serviceName,
      },
    };
  }

  public setStartTime(startMs: number) {
    this.startTime = toHrTime(startMs);
  }

  public setEndTime(endMs: number) {
    this.endTime = toHrTime(endMs);
    this.duration = durationHrTime(this.startTime, this.endTime);
  }

  public addEvent(time: string, name: string) {
    this.events.push({ time: toHrTime(new Date(time).getTime()), name });
    return this;
  }
}

const publishTraces = async (accountId: string, traces: Trace[]) => {
  try {
    await Promise.all(
      traces.map(async (trace) => {
        const metadata = new grpc.Metadata();

        metadata.set('X-Scope-OrgID', accountId);
        const exporter = new OTLPTraceExporter({
          url: Constants.TEMPO_GRPC_INGEST,
          metadata,
        });
        await new Promise((resolve) => exporter.export([trace], resolve));

        // Experimental: will this fix the memory leak? Firing async to not-block.
        (async () => {
          try {
            await exporter.shutdown();
          } catch (e) {
            console.log(`Error during Tempo Exporter shutdown: `, e);
          }
        })();
      })
    );
  } catch (err) {
    console.log(`TEMPO WARN: `, err);
  }
};

export { Trace, publishTraces };
