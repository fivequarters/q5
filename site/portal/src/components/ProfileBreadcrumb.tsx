import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useProfile } from './ProfileProvider';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import { useSubscriptions } from './SubscriptionsProvider';
import { useAgentMaybe, formatAgent, AgentState } from './AgentProvider';
import { Grid, makeStyles } from '@material-ui/core';
import clsx from 'clsx';

const useStyles = makeStyles((theme) => ({
  grid: {
    justifyContent: 'flex-end',
    flexDirection: 'column',
  },
  item: {
    lineHeight: 1.1,
  },
}));

const tree = {
  paramName: 'accountId',
  formatLink: (params: any) => `/accounts/${params.accountId}/subscriptions`,
  text: (params: any, profile: any) => profile.displayName,
  children: [
    {
      paramName: 'subscriptionId',
      formatLink: (params: any, profile: any) =>
        `/accounts/${params.accountId}/subscriptions/${params.subscriptionId}/boundaries`,
      text: (params: any, profile: any, options: any) =>
        (options.subscriptions.status === 'ready' &&
          options.subscriptions.existing.hash[params.subscriptionId] &&
          options.subscriptions.existing.hash[params.subscriptionId].displayName) ||
        params.subscriptionId,
      children: [
        {
          paramName: 'boundaryId',
          formatLink: (params: any) =>
            `/accounts/${params.accountId}/subscriptions/${params.subscriptionId}/boundaries/${params.boundaryId}/functions`,
          text: (params: any, profile: any) => params.boundaryId,
          children: [
            {
              paramName: 'functionId',
              text: (params: any, profile: any) => params.functionId,
              children: [],
            },
            {
              paramName: 'newBoundaryFunction',
              text: (params: any, profile: any) => 'New Function',
              children: [],
            },
          ],
        },
        {
          paramName: 'newSubscriptionFunction',
          text: (params: any, profile: any) => 'New Function',
          children: [],
        },
      ],
    },
    {
      paramName: 'issuerId',
      formatLink: (params: any) => `/accounts/${params.accountId}/issuers/${params.issuerId}/properties`,
      text: (params: any, profile: any) => decodeURIComponent(params.issuerId),
      children: [],
    },
    {
      paramName: 'userId',
      formatLink: (params: any) => `/accounts/${params.accountId}/users/${params.userId}/properties`,
      text: (params: any, profile: any, options: any) =>
        options.agent ? formatAgent(options.agent as AgentState) : params.userId,
      children: [],
    },
    {
      paramName: 'clientId',
      formatLink: (params: any) => `/accounts/${params.accountId}/clients/${params.clientId}/properties`,
      text: (params: any, profile: any, options: any) =>
        options.agent ? formatAgent(options.agent as AgentState) : params.clientId,
      children: [],
    },
    {
      paramName: 'newUser',
      formatLink: (params: any) => `/accounts/${params.accountId}/users/new`,
      text: (params: any, profile: any) => 'New User',
      children: [],
    },
    {
      paramName: 'newClient',
      formatLink: (params: any) => `/accounts/${params.accountId}/clients/new`,
      text: (params: any, profile: any) => 'New Client',
      children: [],
    },
  ],
};

function ProfileBreadcrumb({ children, settings, className, ...rest }: any) {
  const params = { ...(useParams() as any), ...settings };
  const { profile } = useProfile();
  const [subscriptions] = useSubscriptions();
  const [agent] = useAgentMaybe();
  const classes = useStyles();

  function renderHierarchy(node: any): any {
    var result: any = [];
    var nextNode;

    // Is there a subsequent node in the breadcrumb?
    while (
      (nextNode = node.children.reduce(
        (selected: any, current: any) => selected || (params[current.paramName] && current),
        undefined
      ))
    ) {
      // This is not the last segment - render with link
      result.push(
        <Link
          key={params[node.paramName]}
          component={RouterLink}
          to={node.formatLink(params, profile, { subscriptions, agent })}
        >
          <Typography variant="body2" className={classes.item}>
            {node.text(params, profile, { subscriptions, agent })}
          </Typography>
        </Link>
      );

      node = nextNode;
    }

    // This is the last segment - render without link
    result.push(
      <Typography variant="h5" key={params[node.paramName]}>
        {node.text(params, profile, { subscriptions, agent })}
      </Typography>
    );

    return result;
  }

  var hierarchy = renderHierarchy(tree);

  if (hierarchy.length === 1) {
    // We are at the top level, just return heading with no breadcrumb
    return (
      <Grid container className={clsx(classes.grid, className)} {...rest}>
        {hierarchy}
      </Grid>
    );
  } else {
    // We are nested, return breadcrumb and heading underneath
    return (
      <Grid container className={clsx(classes.grid, className)} {...rest}>
        <Breadcrumbs classes={{ separator: classes.item }}>{hierarchy.slice(0, hierarchy.length - 1)}</Breadcrumbs>
        {hierarchy[hierarchy.length - 1]}
      </Grid>
    );
  }
}

export default ProfileBreadcrumb;
