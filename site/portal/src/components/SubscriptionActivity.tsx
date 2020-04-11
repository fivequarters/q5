import React, { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import LinearProgress from "@material-ui/core/LinearProgress";
import Superagent from "superagent";
import { useProfile } from "./ProfileProvider";
import { IFusebitProfile } from "../lib/Settings";
import { ensureAccessToken, createHttpException } from "../lib/Fusebit";

enum BucketWidths {
  Minute = "1m",
  Hour = "1h",
  Day = "1d",
  Week = "1w",
  Month = "1M",
  Quarter = "1q",
  Year = "1y",
};

interface IDateInterval {
  width: BucketWidths;
  timeStart: Date;
  timeEnd: Date;
};

interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
};

interface IProps {
  code: string;
  label: string;
  params: IParams;
  interval: IDateInterval;
  setEventRange: (newInterval: IDateInterval) => void;
  setActiveCodeList: (newCodeList: number[]) => void;
};

// Quick convienent map so everything isn't the same color.
const codeColorMap = {
  200: "#ffb997",
  404: "#843b62",
  501: "#0b032d",
};

const getData = async (props: IProps, profile: IFusebitProfile, range: IDateInterval, setData: any): Promise<void> => {
  try {
    let auth = await ensureAccessToken(profile);
    let warts = [
      props.params.accountId ? `account/${props.params.accountId}` : '',
      props.params.subscriptionId ? `subscription/${props.params.subscriptionId}` : '',
      props.params.boundaryId ? `boundary/${props.params.boundaryId}` : '',
      props.params.functionId ? `function/${props.params.functionId}` : '',
    ].filter(x => x);

    let result: any = await Superagent.get(
      `${profile.baseUrl}/v1/` + warts.join('/') +
      `/statistics/${props.code}/` +
      `${range.timeStart.toISOString()}/${range.timeEnd.toISOString()}/${range.width}`
    ).set("Authorization", `Bearer ${auth.access_token}`);

    // Make sure there's always a 0-value begin and end entry to track 'loading' state easily.
    if (result.body.data.length === 0) {
      result.body.data = [{key: range.timeStart}, {key: range.timeEnd}];
    }
    setData(result.body);

  } catch (e) {
    throw createHttpException(e);
  }
}

const SubscriptionActivity: React.FC<IProps> = (props) => {
  const { profile } = useProfile();
  const [ data, setData ] = useState({codes: [], data: []});

  // Run once on page load.
  useEffect(() => {
    getData(props, profile, props.interval, setData);
  }, [profile, props]);

  if (data.data.length === 0) {
    return <LinearProgress />;
  }

  const dateTickFormatter = (msTime: number): string => {
    return new Date(msTime).toISOString();
  }

	const CustomTooltip = ({ active, payload, label}:any) => {
		if (active) {
			return (
				<div className="custom-tooltip">
					<p className="label">{`${dateTickFormatter(label)}`}</p>
					{
				    payload.map((line:any) => {
              return (<p key={line.name} className="desc">{line.name}: {line.value}</p>);
            })
          }
				</div>
			);
		}

		return null;
	};

  props.setActiveCodeList(data.codes);

  // Quick hack, let's turn the key into an integer.
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
      
        <LineChart width={900} height={500} data={data.data} onClick={ (e, v) => props.setEventRange(e.activeLabel) }>
          <CartesianGrid stroke="#ccc" />
          <Tooltip content={CustomTooltip} />
          <Legend verticalAlign="top" height={36}/>
          <XAxis type="number" domain={[props.interval.timeStart.getTime(), props.interval.timeEnd.getTime()]} dataKey="key" label={{value:props.label, position: "insideBottom"}} tickFormatter={dateTickFormatter}/>
          <YAxis />
          {
            data.codes.map((id) => {
              return (<Line type="monotone" key={id} dataKey={id} dot={false} activeDot={{r:4}} stroke={codeColorMap[id]} />);
            })
          }
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SubscriptionActivity;
