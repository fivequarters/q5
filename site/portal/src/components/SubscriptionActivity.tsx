import React, { useState, useEffect } from "react";
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import LinearProgress from "@material-ui/core/LinearProgress";
import Superagent from "superagent";
import { useProfile } from "./ProfileProvider";
import { IFusebitProfile } from "../lib/Settings";
import { ensureAccessToken, createHttpException } from "../lib/Fusebit";
import ms from "ms";

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
};

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
  console.log(props);
  const { profile } = useProfile();
  const [ data, setData ] = useState({codes: [], data: []});
  const [ interval, setInterval ] = useState<IDateInterval>({timeStart: new Date(Date.now() - ms('7d')), timeEnd: new Date(), width: BucketWidths.Day});

  // Run once on page load.
  useEffect(() => {
    getData(props, profile, interval, setData);
  }, [profile, props, interval]);

  if (data.data.length === 0) {
    return <LinearProgress />;
  }

  return (
    <div>
      <ToggleButtonGroup size="small" exclusive={true} onChange={(e, v) => setInterval({...interval, width: v})} value={interval.width}>
        {
          Object.keys(BucketWidths).map((width) => {
            let tWidth: keyof typeof BucketWidths = width as keyof typeof BucketWidths;
            return (<ToggleButton key={width} value={BucketWidths[tWidth]}>{width}</ToggleButton>);
          })
        }
      </ToggleButtonGroup>
      <LineChart width={900} height={500} data={data.data}>
        <CartesianGrid stroke="#ccc" />
        <Legend verticalAlign="top" height={36}/>
        <XAxis dataKey="key" label={{value:props.label, position: "insideBottom"}} />
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
