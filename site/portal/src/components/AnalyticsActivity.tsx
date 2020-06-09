import React, { useState } from 'react';
import MonitorGraph from './MonitorGraph';
import HTTPActivityLog from './HTTPActivityLog';
import { useProfile } from './ProfileProvider';

import { IDateInterval } from '../lib/FusebitMonitor';
import { Grid, makeStyles } from '@material-ui/core';

interface IParams {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

interface IGraphProps {
  query: string;
  multi: boolean;
  codeGrouped: boolean;
  label: string;
  chartType: string;
  queryParams: any;
}

interface IActivityProps {
  params: IParams;
  interval: IDateInterval;
  activeCodes: Array<string | number | null>;
  graph: IGraphProps;
}

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(3),
    marginTop: theme.spacing(2),
  },
  gridTable: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
}));

const AnalyticsActivity: React.FC<IActivityProps> = props => {
  const classes = useStyles();
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
    <>
      <Grid item xs={12} className={classes.gridContainer}>
        <MonitorGraph
          profile={profile}
          query={props.graph.query}
          multi={props.graph.multi}
          codeGrouped={props.graph.codeGrouped}
          label={props.graph.label}
          urlWart={urlWart}
          interval={props.interval}
          setEventRange={setEventDetailInterval}
          setActiveCodeList={setEventDetailCodes}
          chartType={props.graph.chartType}
          queryParams={props.graph.queryParams}
        />
      </Grid>
      <Grid item xs={12} className={classes.gridTable}>
        {/* Show the events themselves */}
        <HTTPActivityLog
          profile={profile}
          urlWart={urlWart}
          interval={eventDetailInterval}
          activeCode={eventDetailCodes}
        />
      </Grid>
    </>
  );
};
export type IAnalyticsActivityProps = IActivityProps;
export { AnalyticsActivity };
