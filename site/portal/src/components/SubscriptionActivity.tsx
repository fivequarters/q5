import React, { useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import Superagent from "superagent";
import { useProfile } from "./ProfileProvider";
import { IFusebitProfile } from "../lib/Settings";
import { ensureAccessToken, createHttpException } from "../lib/Fusebit";

interface IProps {
  account?: string;
  subscription?: string;
  boundary?: number;
};

const getData = async (props: IProps, profile: IFusebitProfile, setData: any): Promise<void> => {
  try {
    let auth = await ensureAccessToken(profile);
    let warts = [
      props.account ? `account/${props.account}` : '',
      props.subscription ? `subscription/${props.subscription}` : '',
      props.boundary ? `boundary/${props.boundary}` : '',
    ].filter(x => x);

    let result: any = await Superagent.get(
      `${profile.baseUrl}/v1/` + warts.join('/') + `/statistics/query`
    ).set("Authorization", `Bearer ${auth.access_token}`);

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

  console.log('YYY SubscriptionActivity', props);

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
