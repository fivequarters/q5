import React, { useState } from 'react';
import MonitorGraph from './MonitorGraph';
import HTTPActivityLog from './HTTPActivityLog';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { useProfile } from './ProfileProvider';
import DateTimeRangePicker from './DateTimeRangePicker';
import { getUISettings } from '../lib/Settings';

import { BucketWidths, IDateInterval } from '../lib/FusebitMonitor';

interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

interface IProps {
  params: IParams;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
}

interface ActiveGraph {
  query: string;
  label: string;
  multi?: boolean;
}

const availableGraphs: { [key: string]: ActiveGraph } = {
  activity: { query: 'codeactivityhg', label: 'HTTP Response Volume' },
  latency: { query: 'codelatencyhg', label: 'HTTP Latency' },
  activitylatency: { query: 'codeactivitylatencyhg', label: 'HTTP Response Volume and Latency', multi: true },
};

const MonitorPanel: React.FC<IProps> = props => {
  const { profile } = useProfile();

  const [interval, setInterval] = useState<IDateInterval>({
    from: new Date('2020-05-06T21:53:30.254Z'),
    to: new Date('2020-05-06T21:58:30.254Z'),
    width: BucketWidths.Minute,
  });
  const [eventRange, setEventRange] = useState<IDateInterval | null>(interval);
  const [activeCodeList, setActiveCodeList] = useState<any>(['2xx', '3xx', '4xx', '5xx']);
  const [activeCode, setActiveCode] = useState<string | number | null>('2xx');
  const [graphModes, setGraphModes] = useState<Array<string>>(['activity', 'latency']);

  // Create a common URL wart to pass to the sub-components
  const params = props.params;

  let warts = [
    params.accountId ? `account/${params.accountId}` : '',
    params.subscriptionId ? `subscription/${params.subscriptionId}` : '',
    params.boundaryId ? `boundary/${params.boundaryId}` : '',
    params.functionId ? `function/${params.functionId}` : '',
  ].filter(x => x);

  const urlWart = `${profile.baseUrl}/v1/` + warts.join('/');
  const activeGraph = availableGraphs[graphModes.sort().join('')];

  // Return the div.
  return (
    <div>
      {/* Select the active time. */}
      <DateTimeRangePicker
        from={interval.from.toISOString()}
        to={interval.to.toISOString()}
        utc={getUISettings().utcTime}
        onChange={(from: string, to?: string) => {
          // The DateTimePicker can feed out some bad dates, depending on the state of it's widgets.
          if (!isNaN(Date.parse(from)) && to && !isNaN(Date.parse(to))) {
            setInterval({ from: new Date(from), to: to ? new Date(to) : new Date(), width: interval.width });
          }
        }}
      />

      {/* Create the button group, one button for each of the different bucket sizes. */}
      <ToggleButtonGroup
        size="small"
        exclusive={true}
        onChange={(e, v) => setInterval({ ...interval, width: v })}
        value={interval.width}
      >
        {Object.keys(BucketWidths).map(width => {
          let tWidth: keyof typeof BucketWidths = width as keyof typeof BucketWidths;
          return (
            <ToggleButton key={width} value={BucketWidths[tWidth]}>
              {width}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      {/* Create the button group, one button for latency and one for activity*/}
      <ToggleButtonGroup
        size="small"
        exclusive={false}
        onChange={(e, v) => {
          if (v.length) {
            console.log('setting value to v', v);
            setGraphModes(v);
          }
        }}
        value={graphModes}
      >
        <ToggleButton key="activity" value="activity">
          Show HTTP Activity
        </ToggleButton>
        <ToggleButton key="latency" value="latency">
          Show HTTP Latency
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Show the various graphs available. */}
      <MonitorGraph
        profile={profile}
        query={activeGraph.query}
        multi={!!activeGraph.multi}
        codeGrouped={true}
        label={activeGraph.label}
        urlWart={urlWart}
        interval={interval}
        setEventRange={setEventRange}
        setActiveCodeList={setActiveCodeList}
      />

      {/* Show the boundary utilization graph as an example. */}
      <MonitorGraph
        profile={profile}
        query={'fielduniquehg'}
        multi={false}
        codeGrouped={true}
        label={'Active Boundaries'}
        urlWart={urlWart}
        interval={interval}
        chartType="bar"
        queryParams={{ field: 'boundaryid', code: '4xx' }}
        setEventRange={setEventRange}
        setActiveCodeList={setActiveCodeList}
      />

      {/* Display the events that occurred in the selected time period. */}
      <ToggleButtonGroup size="small" exclusive={true} onChange={(e, v) => setActiveCode(v)} value={activeCode}>
        {activeCodeList.map((code: string) => {
          return (
            <ToggleButton key={code} value={code}>
              {code}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      {/* Show the events themselves */}
      <HTTPActivityLog profile={profile} urlWart={urlWart} interval={eventRange} activeCode={activeCode} />
    </div>
  );
};
export { MonitorPanel };
