import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  Line as RechartLine,
  BarChart as RechartBarChart,
  Bar as RechartBar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import LinearProgress from '@material-ui/core/LinearProgress';
import { IFusebitProfile } from '../lib/Settings';
import { formatByBucketWidth, IDateInterval, getStatisticalMonitorData } from '../lib/FusebitMonitor';
import { getUISettings } from '../lib/Settings';

import ms from 'ms';

import { httpCodeColorMap } from '@5qtrs/fusebit-color';

interface IProps {
  query: string;
  label: string;
  multi: boolean;
  codeGrouped: boolean;
  urlWart: string;
  profile: IFusebitProfile;
  interval: IDateInterval;
  chartType?: string;
  queryParams?: any;
  setEventRange: (newInterval: IDateInterval) => void;
  setActiveCodeList: (newCodeList: number[]) => void;
}

const MonitorGraph: React.FC<IProps> = props => {
  // Payload received from the server
  const [data, setData] = useState({ codes: [], items: [] });

  // Run once on page load, but first unpack props:
  const {
    profile,
    query,
    label,
    multi,
    codeGrouped,
    urlWart,
    interval,
    queryParams,
    setEventRange,
    setActiveCodeList,
  } = props;

  let field: string | undefined;
  let code: number | string | undefined;

  if (queryParams) {
    field = queryParams.field;
    code = queryParams.code;
  } else {
    field = undefined;
  }

  useEffect(() => {
    getStatisticalMonitorData(
      profile,
      query,
      urlWart,
      codeGrouped,
      interval,
      { field, code },
      setData,
      setActiveCodeList
    );
  }, [profile, query, urlWart, codeGrouped, interval, setData, field, code, setActiveCodeList]);
  // ^^^ Note to self: don't put objects in the deps, it's not a stable referant - hence 'field' instead of
  // 'queryParams.

  const dateTickFormatter = (msTime: any): string => {
    if (typeof msTime != 'number') {
      return '';
    }

    return formatByBucketWidth(new Date(msTime), interval.width, getUISettings().utcTime);
  };

  // Choose the chart to display.
  let compParams: object;
  let chartParams: object;

  let ReChart: any;
  let ChartElement: any;

  if (props.chartType === 'bar') {
    chartParams = {};
    compParams = {};
    ReChart = RechartBarChart;
    ChartElement = RechartBar;
  } else {
    chartParams = {};
    compParams = { type: 'linear', dot: false, activeDot: { r: 4 } };
    ReChart = RechartLineChart;
    ChartElement = RechartLine;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${dateTickFormatter(label)}`}</p>
          {payload &&
            payload.map((line: any) => {
              return (
                <p key={line.name} className="desc">
                  {line.name}: {line.value}
                </p>
              );
            })}
        </div>
      );
    }

    return null;
  };

  // Convienence wrapper around setEventRange to give it a properly formated interval object
  const setHTTPEventRange = (msTime: number): void => {
    setEventRange({
      width: interval.width,
      from: new Date(msTime),
      to: new Date(msTime + ms(interval.width)),
    });
  };

  const InProgressBar = () => {
    if (data.items.length === 0) {
      return <LinearProgress />;
    }

    // Switch to a fixed value non-animating progress bar
    return <LinearProgress value={0} variant="determinate" style={{ visibility: 'hidden' }} />;
  };

  let elements: any;
  if (multi) {
    elements = data.codes.map(id => {
      return [
        <ChartElement
          yAxisId="right"
          {...compParams}
          key={id + ' latency'}
          dataKey={id + '[0]'}
          name={id + ' latency'}
          stroke={httpCodeColorMap(id)}
          strokeDasharray="3 3"
          fill={httpCodeColorMap(id)}
        />,
        <ChartElement
          yAxisId="left"
          {...compParams}
          key={id}
          dataKey={id + '[1]'}
          name={id + ' results'}
          stroke={httpCodeColorMap(id)}
          fill={httpCodeColorMap(id)}
        />,
      ];
    });
  } else {
    elements = data.codes.map(id => {
      return (
        <ChartElement
          yAxisId="left"
          stroke={httpCodeColorMap(id)}
          {...compParams}
          key={id}
          dataKey={id}
          fill={httpCodeColorMap(id)}
        />
      );
    });
  }

  // Quick hack, let's turn the key into an integer.
  return (
    <div>
      <InProgressBar />
      <div style={{ width: '100%', height: 300 }}>
        {label}
        <ResponsiveContainer>
          <ReChart
            width={900}
            height={500}
            data={data.items}
            onClick={(e: any, v: any) => e && setHTTPEventRange(e.activeLabel)}
            {...chartParams}
          >
            <CartesianGrid stroke="#ccc" />
            <Tooltip content={CustomTooltip} />
            <Legend height={36} />
            <XAxis
              type="number"
              domain={[interval.from.getTime(), interval.to.getTime()]}
              dataKey="key"
              tickFormatter={dateTickFormatter}
            />
            <YAxis yAxisId="left" name="Activity" />
            <YAxis yAxisId="right" unit="ms" orientation="right" name="Latency (ms)" />
            {elements}
          </ReChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonitorGraph;
