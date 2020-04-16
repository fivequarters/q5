import React, { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from "recharts";
import LinearProgress from "@material-ui/core/LinearProgress";
import Superagent from "superagent";
import { IFusebitProfile } from "../lib/Settings";
import { ensureAccessToken, createHttpException } from "../lib/Fusebit";

enum BucketWidths {
  Minute = "1m",
  Hour = "1h",
  Day = "1d",
  Week = "1w",
  Month = "1M",
  Quarter = "1q",
  Year = "1y"
}

interface IDateInterval {
  width: BucketWidths;
  timeStart: Date;
  timeEnd: Date;
}

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
  200: "#ffb997",
  404: "#843b62",
  501: "#0b032d"
};

const getData = async (
  profile: IFusebitProfile,
  code: string,
  urlWart: string,
  interval: IDateInterval,
  setData: any,
  setActiveCodeList: any
): Promise<void> => {
  try {
    const auth = await ensureAccessToken(profile);

    let result: any = await Superagent.get(
      `${urlWart}/statistics/${code}/` +
        `${interval.timeStart.toISOString()}/${interval.timeEnd.toISOString()}/${interval.width}`
    ).set("Authorization", `Bearer ${auth.access_token}`);

    // Make sure there's always a 0-value begin and end entry to track 'loading' state easily.
    if (result.body.data.length === 0) {
      result.body.data = [{ key: interval.timeStart }, { key: interval.timeEnd }];
    }
    setData(result.body);
    setActiveCodeList(result.body.codes);
  } catch (e) {
    throw createHttpException(e);
  }
};

const MonitorGraph: React.FC<IProps> = props => {
  const [data, setData] = useState({ codes: [], data: [] });

  // Run once on page load, but first unpack props:
  const { profile, code, label, urlWart, interval, setEventRange, setActiveCodeList } = props;

  useEffect(() => {
    getData(profile, code, urlWart, interval, setData, setActiveCodeList);
  }, [profile, code, urlWart, interval, setData, setActiveCodeList]);
  // ^^^ Note to self: don't put props in the deps, it's not a stable referant.

  if (data.data.length === 0) {
    return <LinearProgress />;
  }

  const dateTickFormatter = (msTime: number): string => {
    return new Date(msTime).toISOString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${dateTickFormatter(label)}`}</p>
          {payload.map((line: any) => {
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

  // Quick hack, let's turn the key into an integer.
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart width={900} height={500} data={data.data} onClick={(e, v) => setEventRange(e.activeLabel)}>
          <CartesianGrid stroke="#ccc" />
          <Tooltip content={CustomTooltip} />
          <Legend verticalAlign="top" height={36} />
          <XAxis
            type="number"
            domain={[interval.timeStart.getTime(), interval.timeEnd.getTime()]}
            dataKey="key"
            label={{ value: label, position: "insideBottom" }}
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
  );
};

export default MonitorGraph;
