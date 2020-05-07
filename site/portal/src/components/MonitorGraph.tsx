import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import LinearProgress from '@material-ui/core/LinearProgress';
import { IFusebitProfile } from '../lib/Settings';
import { formatByBucketWidth, IDateInterval, getStatisticalMonitorData } from '../lib/FusebitMonitor';
import { getUISettings } from '../lib/Settings';

import ms from 'ms';

import { httpCodeColorMap } from '@5qtrs/fusebit-color';

interface IProps {
  code: string;
  label: string;
  multi: boolean;
  codeGrouped: boolean;
  urlWart: string;
  profile: IFusebitProfile;
  interval: IDateInterval;
  setEventRange: (newInterval: IDateInterval) => void;
  setActiveCodeList: (newCodeList: number[]) => void;
}

const MonitorGraph: React.FC<IProps> = props => {
  // Payload received from the server
  const [data, setData] = useState({ codes: [], items: [] });

  // Run once on page load, but first unpack props:
  const { profile, code, label, multi, codeGrouped, urlWart, interval, setEventRange, setActiveCodeList } = props;

  useEffect(() => {
    getStatisticalMonitorData(profile, code, urlWart, codeGrouped, interval, setData, setActiveCodeList);
  }, [profile, code, urlWart, codeGrouped, interval, setData, setActiveCodeList]);
  // ^^^ Note to self: don't put props in the deps, it's not a stable referant.

  const dateTickFormatter = (msTime: any): string => {
    if (typeof msTime != 'number') {
      return '';
    }

    return formatByBucketWidth(new Date(msTime), interval.width, getUISettings().utcTime);
  };

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

  const lines = data.codes.map(id => {
    if (multi) {
      return [
        <Line
          yAxisId="right"
          type="linear"
          key={id + ' latency'}
          dataKey={id + '[0]'}
          name={id + ' latency'}
          dot={false}
          activeDot={{ r: 4 }}
          stroke={httpCodeColorMap(id)}
          strokeDasharray="3 3"
        />,
        <Line
          yAxisId="left"
          type="linear"
          key={id}
          dataKey={id + '[1]'}
          name={id + ' results'}
          dot={false}
          activeDot={{ r: 4 }}
          stroke={httpCodeColorMap(id)}
        />,
      ];
    } else {
      return (
        <Line
          yAxisId="left"
          type="linear"
          key={id}
          dataKey={id}
          dot={false}
          activeDot={{ r: 4 }}
          stroke={httpCodeColorMap(id)}
        />
      );
    }
  });

  // Quick hack, let's turn the key into an integer.
  return (
    <div>
      <InProgressBar />
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            width={900}
            height={500}
            data={data.items}
            onClick={(e, v) => e && setHTTPEventRange(e.activeLabel)}
          >
            <CartesianGrid stroke="#ccc" />
            <Tooltip content={CustomTooltip} />
            <Legend height={36} />
            <XAxis
              type="number"
              domain={[interval.from.getTime(), interval.to.getTime()]}
              dataKey="key"
              label={{ value: label, position: 'insideBottom' }}
              tickFormatter={dateTickFormatter}
            />
            <YAxis yAxisId="left" name="Activity" />
            <YAxis yAxisId="right" unit="ms" orientation="right" name="Latency (ms)" />
            {lines}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonitorGraph;
