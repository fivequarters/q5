import React from 'react';

import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Toolbar from '@material-ui/core/Toolbar';

import { useHashHistory } from './HashHistory';

import { AnalyticsActivity } from './AnalyticsActivity';
import { AnalyticsAudit, IAnalyticsAuditProps } from './AnalyticsAudit';

import { BucketWidths, IDateInterval } from '../lib/FusebitMonitor';

/*
 * Current Status:
 *   * Implement the time filter component into a taskbar for Activity only.
 *   * Improve the onClick for the graph to better select specific lines and codes.
 */
interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

interface IAnalyticsProps {
  params: IParams;
  audit: IAnalyticsAuditProps;
}

interface AnalyticsEnvironment {
  props: IAnalyticsProps;
  interval: IDateInterval;
  activeCodes: Array<number | string>;
}

interface AnalyticsOptions {
  useWidth?: boolean; // Graph needs options to specify the width of the result
  filterCodes?: boolean; // Graph exposes the ability to filter for specific codes
}

interface AnalyticsEntry {
  c: (props: any) => any;
  t: string;
  o?: AnalyticsOptions;
}

/* XXX temporary values until the date/time selector is configured */
let defaultInterval: IDateInterval = {
  from: new Date('2020-05-06T21:53:30.254Z'),
  to: new Date('2020-05-06T21:58:30.254Z'),
  width: BucketWidths.Minute,
};

let defaultActiveCodes: string[] = ['2xx', '3xx', '4xx', '5xx'];

// Declare the various types of panels available here
function AnalyticsActivityPanel(env: AnalyticsEnvironment) {
  let props = {
    params: env.props.params,
    interval: env.interval,
    activeCodes: env.activeCodes,
    graph: {
      query: 'codeactivitylatencyhg',
      multi: true,
      codeGrouped: true,
      label: 'HTTP Activity and Latency',
      chartType: 'line',
      queryParams: {},
    },
  };
  return <AnalyticsActivity {...props} />;
}

// Declare the various types of panels available here
function AnalyticsUsagePanel(env: AnalyticsEnvironment) {
  let props = {
    params: env.props.params,
    interval: env.interval,
    activeCodes: env.activeCodes,
    graph: {
      query: 'fielduniquehg',
      multi: false,
      codeGrouped: false,
      label: 'Unique Boundary Activity',
      chartType: 'bar',
      queryParams: { field: 'boundaryid', code: env.activeCodes },
    },
  };
  return <AnalyticsActivity {...props} />;
}

// Declare the various types of panels available here
function AnalyticsAuditPanel(env: AnalyticsEnvironment) {
  let props = { filter: env.props.audit.filter };
  return <AnalyticsAudit {...props} />;
}

// Lookup table to convert into a particular analytics view
const analyticsTable: { [key: string]: AnalyticsEntry } = {
  activity: { c: AnalyticsActivityPanel, t: 'Activity', o: { useWidth: true, filterCodes: true } },
  audit: { c: AnalyticsAuditPanel, t: 'Audit' },
  usage: { c: AnalyticsUsagePanel, t: 'Usage' },
};

// Convert some strings into the appropriate objects.
const freshenHistory = (history: any) => {
  let fresh = { ...history };
  fresh.interval.from = new Date(fresh.interval.from);
  fresh.interval.to = new Date(fresh.interval.to);
  return fresh;
};

const Analytics: React.FC<IAnalyticsProps> = props => {
  const [history, setHistory] = useHashHistory('analytics', {
    topic: 'activity',
    interval: defaultInterval,
    activeCodes: defaultActiveCodes,
  });
  let { topic, interval } = freshenHistory(history);

  const onTopicSelect = (event: React.ChangeEvent<{ value: unknown }>) => {
    topic = event.target.value as string;
    setHistory({ topic, interval });
  };

  const ShowAnalytics = () => {
    return analyticsTable[topic].c({ props, ...history });
  };

  return (
    <div>
      {/* Show the combo box to select the desired analytics display. */}
      <Toolbar>
        <Select value={topic} onChange={onTopicSelect}>
          {Object.keys(analyticsTable).map(k => {
            return (
              <MenuItem key={k} value={k}>
                {analyticsTable[k].t}
              </MenuItem>
            );
          })}
        </Select>
      </Toolbar>

      {/* Show the selected item. */}
      <ShowAnalytics />
    </div>
  );
};

export { Analytics };
