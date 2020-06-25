import React, { useState, useEffect } from 'react';
import ms from 'ms';

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
import Typography from '@material-ui/core/Typography';

import { httpCodeColorMap } from '@5qtrs/fusebit-color';

import { IFusebitProfile } from '../lib/Settings';
import { formatByBucketWidth, IDateInterval, getStatisticalMonitorData } from '../lib/FusebitMonitor';
import { getUISettings } from '../lib/Settings';

type ActiveCodeList = Array<number | string>;

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
  setActiveCodeList: (newCodeList: ActiveCodeList) => void;
}

const MonitorGraph: React.FC<IProps> = (props) => {
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
                  {line.name}: {+line.value.toFixed(2)} {line.unit}
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
    const onDotClick = (e: any, p: any) => {
      setActiveCodeList(e.dataKey.substring(0, 3)); // Get the leading three digits, sans array offset.
      setHTTPEventRange(e.payload.key);
    };

    elements = data.codes.map((id) => {
      return [
        <ChartElement
          yAxisId="right"
          {...compParams}
          key={id + ' latency'}
          dataKey={id + '[0]'}
          name={id + ' latency'}
          strokeDasharray="3 3"
          stroke={httpCodeColorMap(id)}
          fill={httpCodeColorMap(id)}
          activeDot={{ onClick: onDotClick }}
          unit="ms"
        />,
        <ChartElement
          yAxisId="left"
          {...compParams}
          key={id}
          dataKey={id + '[1]'}
          name={id + ' results'}
          stroke={httpCodeColorMap(id)}
          fill={httpCodeColorMap(id)}
          activeDot={{ onClick: onDotClick }}
          unit="hits"
        />,
      ];
    });
  } else {
    const onBarClick = (e: any, p: any) => {
      setActiveCodeList(e.dataKey); // Should be just the basic HTTP code value.
      setHTTPEventRange(e.payload.key);
    };
    elements = data.codes.map((id) => {
      return (
        <ChartElement
          yAxisId="left"
          {...compParams}
          key={id}
          dataKey={id}
          name={id}
          stroke={httpCodeColorMap(id)}
          fill={httpCodeColorMap(id)}
          onClick={onBarClick}
          units="uniques"
        />
      );
    });
  }

  return (
    <div>
      <InProgressBar />
      <Typography variant="h6" id="tableTitle">
        {label}
      </Typography>
      <div style={{ width: '100%', height: 500 }}>
        <ResponsiveContainer>
          <ReChart width={900} height={200} data={data.items} {...chartParams}>
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
            {multi && <YAxis yAxisId="right" unit="ms" orientation="right" name="Latency (ms)" />}
            {elements}
          </ReChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonitorGraph;
