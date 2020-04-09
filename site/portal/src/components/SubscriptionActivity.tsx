import React, { useState, useEffect } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import LinearProgress from "@material-ui/core/LinearProgress";
import Superagent from "superagent";
import { useProfile } from "./ProfileProvider";
import { IFusebitProfile } from "../lib/Settings";
import { ensureAccessToken, createHttpException } from "../lib/Fusebit";

interface IProps {
  account?: string;
  subscription?: string;
  boundary?: string;
  func?: string;
};

const getData = async (props: IProps, profile: IFusebitProfile, setData: any): Promise<void> => {
  try {
    let auth = await ensureAccessToken(profile);
    let warts = [
      props.account ? `account/${props.account}` : '',
      props.subscription ? `subscription/${props.subscription}` : '',
      props.boundary ? `boundary/${props.boundary}` : '',
      props.func? `function/${props.func}` : '',
    ].filter(x => x);

    // Default to 1 weeks worth of data for now.
    let timeStart = new Date();
    timeStart.setDate(timeStart.getDate() - 7);

    let result: any = await Superagent.get(
      `${profile.baseUrl}/v1/` + warts.join('/') + `/statistics/codeactivityhg/${timeStart.toISOString()}`
    ).set("Authorization", `Bearer ${auth.access_token}`);

    if (result.body.data.length == 0) {
      result.body.data = [{key: timeStart}, {key: new Date().toISOString()}];
    }
    setData(result.body);

  } catch (e) {
    throw createHttpException(e);
  }
}

const codeColorMap = {
  200: "#ffb997",
  404: "#843b62",
  501: "#0b032d",
};

const SubscriptionActivity: React.FC<IProps> = (props) => {
  const { profile } = useProfile();
  const [ data, setData ] = useState({codes: [], data: []});

  // Run once on page load.
  useEffect(() => {
    getData(props, profile, setData);
  }, [profile, props]);

  if (data.data.length == 0) {
    return <LinearProgress />;
  }

  return (
    <div>
      <button onClick={() => getData(props, profile, setData)}>Refresh</button>
      <LineChart width={900} height={500} data={data.data}>
        <CartesianGrid stroke="#ccc" />
        <Legend verticalAlign="top" height={36}/>
        <XAxis dataKey="key" label={{value:"HTTP Error Code Responses", position: "insideBottom"}} />
        <YAxis />
        {
          data.codes.map((id) => {
            return (<Line key={id} dataKey={id} dot={false} stroke={codeColorMap[id]} />);
          })
        }
      </LineChart>
    </div>
  );
}

export default SubscriptionActivity;
