import React from 'react';

import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Toolbar from '@material-ui/core/Toolbar';

import { useHashHistory } from './HashHistory';

import { AnalyticsActivity } from './AnalyticsActivity';
import { AnalyticsAudit, IAnalyticsAuditProps } from './AnalyticsAudit';

import { BucketWidths, IDateInterval } from '../lib/FusebitMonitor';
import { Typography, makeStyles, Grid } from '@material-ui/core';

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(3),
    marginTop: theme.spacing(2),
  },
}));

interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

interface IAnalyticsProps {
  params: IParams;
  enabledPanels?: string[];
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
  n: number; // Order of presentation
  c: (props: any) => any;
  t: string;
  o?: AnalyticsOptions;
}

/* XXX temporary values until the date/time selector is configured */
let defaultInterval: IDateInterval = {
  from: new Date(Date.now() - 60 * 60 * 1000),
  to: new Date(),
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
      label: 'HTTP Response Volume and Latency',
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
      label: 'Active Boundaries',
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
  activity: { n: 1, c: AnalyticsActivityPanel, t: 'Monitoring', o: { useWidth: true, filterCodes: true } },
  usage: { n: 2, c: AnalyticsUsagePanel, t: 'Usage' },
  audit: { n: 3, c: AnalyticsAuditPanel, t: 'Audit' },
};

// Convert some strings into the appropriate objects.
const freshenHistory = (history: any) => {
  let fresh = { ...history };
  fresh.interval.from = new Date(fresh.interval.from);
  fresh.interval.to = new Date(fresh.interval.to);
  return fresh;
};

const Analytics: React.FC<IAnalyticsProps> = props => {
  const classes = useStyles();
  const enabledPanels = props.enabledPanels || Object.keys(analyticsTable);
  const [history, setHistory] = useHashHistory('analytics', {
    topic: enabledPanels[0],
    interval: defaultInterval,
    activeCodes: defaultActiveCodes,
  });
  let { topic, interval } = freshenHistory(history);

  const onTopicSelect = (event: React.ChangeEvent<{ value: unknown }>) => {
    topic = event.target.value as string;
    setHistory({ topic, interval });
  };

  const ShowAnalytics = () => {
    return analyticsTable[topic].c({ props, ...history, interval, ...analyticsTable[topic].o });
  };

  return (
    <Grid container>
      <Grid item xs={12} className={classes.gridContainer}>
        {/* Show just the title if there is only one section, or show drop-down otherwise */}
        {enabledPanels.length === 1 ? (
          <Typography variant="h6">{analyticsTable[enabledPanels[0]].t}</Typography>
        ) : (
          <Toolbar disableGutters={true}>
            <Select value={topic} onChange={onTopicSelect}>
              {enabledPanels
                .sort((a, b) => analyticsTable[a].n - analyticsTable[b].n)
                .map(k => {
                  return (
                    <MenuItem key={k} value={k}>
                      <Typography variant="h6">{analyticsTable[k].t}</Typography>
                    </MenuItem>
                  );
                })}
            </Select>
          </Toolbar>
        )}
        {/* Show the selected item. */}
      </Grid>
      <ShowAnalytics />
    </Grid>
  );
};

export { Analytics };
