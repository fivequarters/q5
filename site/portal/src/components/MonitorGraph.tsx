import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import LinearProgress from '@material-ui/core/LinearProgress';
import Superagent from 'superagent';
import { IFusebitProfile } from '../lib/Settings';
import { ensureAccessToken, createHttpException } from '../lib/Fusebit';
import { BucketWidthsDateFormat, IDateInterval } from './MonitorTypes';

import ms from 'ms';

interface IProps {
  code: string;
  label: string;
  urlWart: string;
  profile: IFusebitProfile;
  interval: IDateInterval;
  setEventRange: (newInterval: IDateInterval) => void;
  setActiveCodeList: (newCodeList: number[]) => void;
}

// Quick convienent map so everything isn't the same color.
const codeColorMap = {
  200: '#ffb997',
  404: '#843b62',
  501: '#0b032d',
};

const getData = async (
  profile: IFusebitProfile,
  queryType: string,
  urlWart: string,
  interval: IDateInterval,
  setData: any,
  setActiveCodeList: any
): Promise<void> => {
  try {
    const auth = await ensureAccessToken(profile);

    let result: any = await Superagent.get(`${urlWart}/statistics/${queryType}`)
      .query({
        from: interval.from.toISOString(),
        to: interval.to.toISOString(),
        width: interval.width,
      })
      .set('Authorization', `Bearer ${auth.access_token}`);

    // Make sure there's always a 0-value begin and end entry to track 'loading' state easily.
    if (result.body.items.length === 0) {
      result.body.items = [{ key: interval.from }, { key: interval.to }];
    }

    // Convert the ISO8601 strings into ms time, which the graphing libraries deal with better.
    setData({
      codes: result.body.codes,
      items: result.body.items.map((e: any) => {
        return { ...e, key: Date.parse(e.key) };
      }),
    });
    setActiveCodeList(result.body.codes);
  } catch (e) {
    throw createHttpException(e);
  }
};

const MonitorGraph: React.FC<IProps> = props => {
  // Payload received from the server
  const [data, setData] = useState({ codes: [], items: [] });

  // Run once on page load, but first unpack props:
  const { profile, code, label, urlWart, interval, setEventRange, setActiveCodeList } = props;

  useEffect(() => {
    getData(profile, code, urlWart, interval, setData, setActiveCodeList);
  }, [profile, code, urlWart, interval, setData, setActiveCodeList]);
  // ^^^ Note to self: don't put props in the deps, it's not a stable referant.

  const dateTickFormatter = (msTime: any): string => {
    if (typeof msTime != 'number') {
      return '';
    }
    return BucketWidthsDateFormat[interval.width].format(new Date(msTime));
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

  // Quick hack, let's turn the key into an integer.
  return (
    <div>
      <InProgressBar />
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart width={900} height={500} data={data.items} onClick={(e, v) => setHTTPEventRange(e.activeLabel)}>
            <CartesianGrid stroke="#ccc" />
            <Tooltip content={CustomTooltip} />
            <Legend verticalAlign="top" height={36} />
            <XAxis
              type="number"
              domain={[interval.from.getTime(), interval.to.getTime()]}
              dataKey="key"
              label={{ value: label, position: 'insideBottom' }}
              tickFormatter={dateTickFormatter}
            />
            <YAxis />
            {data.codes.map(id => {
              return (
                <Line
                  type="monotone"
                  key={id}
                  dataKey={id}
                  dot={false}
                  activeDot={{ r: 4 }}
                  stroke={codeColorMap[id]}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonitorGraph;
