import React, { useState, useEffect } from "react";
import LinearProgress from "@material-ui/core/LinearProgress";
import { IFusebitProfile } from "../lib/Settings";
import Superagent from "superagent";
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
  profile: IFusebitProfile;
  urlWart: string;
  interval: IDateInterval | null;
  activeCode: number | null;
}

const getData = async (
  profile: IFusebitProfile,
  urlWart: string,
  interval: IDateInterval,
  activeCode: number,
  setData: any
): Promise<void> => {
  try {
    const auth = await ensureAccessToken(profile);

    let result: any = await Superagent.get(
      `${urlWart}/statistics/itemizedbulk/` +
        `${interval.timeStart.toISOString()}/${interval.timeEnd.toISOString()}/${activeCode}`
    ).set("Authorization", `Bearer ${auth.access_token}`);

    // Make sure there's always a 0-value begin and end entry to track 'loading' state easily.
    if (result.body.data.length === 0) {
      result.body.data = [{ key: interval.timeStart }, { key: interval.timeEnd }];
    }

    console.log(result.body);

    setData(result.body);
  } catch (e) {
    throw createHttpException(e);
  }
};

const HTTPActivityLog: React.FC<IProps> = ({ profile, urlWart, interval, activeCode }) => {
  const [data, setData] = useState({ codes: [], data: [] });

  useEffect(() => {
    if (activeCode && interval) {
      console.log("Loading activities", activeCode, interval);
      getData(profile, urlWart, interval, activeCode, setData);
    }
  }, [profile, urlWart, interval, activeCode, setData]);

  if (activeCode && interval) {
    if (data.data.length === 0) {
      return <LinearProgress />;
    }
  } else {
    return <div />;
  }

  return <LinearProgress />;
};

export default HTTPActivityLog;
