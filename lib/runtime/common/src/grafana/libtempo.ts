const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const grpc = require('@grpc/grpc-js');

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
  public attributes = { key: 'value' };
  public links = [];
  public events: { time: IHRTime; name: string }[] = [];
  public ended = true;
  public resource: { attributes: Record<string, string> } = { attributes: {} };
  public instrumentationLibrary = { name: 'opentel-fusebit', version: '1.0.0' };

  constructor(serviceName: string, traceId: string, spanId: string, parentSpanId: string) {
    this._traceId = traceId;
    this._spanId = spanId;
    this.parentSpanId = parentSpanId;

    this.resource = {
      attributes: {
        'service.name': serviceName,
        'telemetry.sdk.language': 'nodejs',
        'telemetry.sdk.name': 'opentelemetry',
        'telemetry.sdk.version': '1.0.0',
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
          url: 'grpc://localhost:4317',
          metadata,
        });
        await new Promise((resolve) => exporter.export([trace], resolve));
      })
    );
  } catch (err) {
    console.log(`TEMPO ERROR: `, err);
  }
};

export { Trace, publishTraces };
