import React, { useState } from 'react';
import MonitorGraph from './MonitorGraph';
import HTTPActivityLog from './HTTPActivityLog';
import { useProfile } from './ProfileProvider';

import { IDateInterval } from '../lib/FusebitMonitor';

interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

interface IActivityProps {
  params: IParams;
  interval: IDateInterval;
  activeCodes: Array<string | number | null>;
}

const AnalyticsActivity: React.FC<IActivityProps> = props => {
  const { profile } = useProfile();

  // Display event details within this interval and this code list.
  const [eventDetailInterval, setEventDetailInterval] = useState<IDateInterval | null>(props.interval);
  const [eventDetailCodes, setEventDetailCodes] = useState<any>(props.activeCodes);

  // Create a common URL wart to pass to the sub-components
  const params = props.params;

  let warts = [
    params.accountId ? `account/${params.accountId}` : '',
    params.subscriptionId ? `subscription/${params.subscriptionId}` : '',
    params.boundaryId ? `boundary/${params.boundaryId}` : '',
    params.functionId ? `function/${params.functionId}` : '',
  ].filter(x => x);

  const urlWart = `${profile.baseUrl}/v1/` + warts.join('/');

  // Return the div.
  return (
    <div>
      <MonitorGraph
        profile={profile}
        query="codeactivitylatencyhg"
        multi={true}
        codeGrouped={true}
        label="HTTP Activity And Latency"
        urlWart={urlWart}
        interval={props.interval}
        setEventRange={setEventDetailInterval}
        setActiveCodeList={setEventDetailCodes}
      />

      {/* Show the events themselves */}
      <HTTPActivityLog
        profile={profile}
        urlWart={urlWart}
        interval={eventDetailInterval}
        activeCode={eventDetailCodes}
      />
    </div>
  );
};
export type IAnalyticsActivityProps = IActivityProps;
export { AnalyticsActivity };
