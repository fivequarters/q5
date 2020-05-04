import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import React from 'react';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { getLocalSettings, IFusebitSettings } from '../lib/Settings';
import AccountClients from './AccountClients';
import AccountIssuers from './AccountIssuers';
import AccountSettings from './AccountSettings';
import AccountSubscriptions from './AccountSubscriptions';
import AccountUsers from './AccountUsers';
import AgentDeleteFab from './AgentDeleteFab';
import AgentPermissions from './AgentPermissions';
import AgentProperties from './AgentProperties';
import { AgentProvider } from './AgentProvider';
import { AgentsProvider } from './AgentsProvider';
import { BoundariesProvider } from './BoundariesProvider';
import BoundaryFunctions from './BoundaryFunctions';
import { FusebitError } from './ErrorBoundary';
import FunctionActionFab from './FunctionActionFab';
import FunctionCode from './FunctionCode';
import FunctionOverview from './FunctionOverview';
import { FunctionProvider } from './FunctionProvider';
import IssuerProperties from './IssuerProperties';
import { IssuerProvider } from './IssuerProvider';
import { IssuersProvider } from './IssuersProvider';
import NewAgent from './NewAgent';
import NewFunction from './NewFunction';
import NewFunctionCreate from './NewFunctionCreate';
import NewFunctionFab from './NewFunctionFab';
import ProfileBreadcrumb from './ProfileBreadcrumb';
import { useProfile } from './ProfileProvider';
import ProfileSelectorWithDetails from './ProfileSelectorWithDetails';
import ResourceAccess from './ResourceAccess';
import SubscriptionBoundaries from './SubscriptionBoundaries';
import { MonitorPanel } from './Monitor';
import { SubscriptionsProvider } from './SubscriptionsProvider';
import Activity from './Activity';

const useStyles = makeStyles(theme => ({
  paper: {
    paddingTop: 14,
    paddingLeft: theme.spacing(2),
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    right: theme.spacing(16),
    bottom: -theme.spacing(3.5),
    zIndex: 9999,
  },
}));

const ExplorerTabs = {
  account: [
    {
      name: 'subscriptions',
    },
    {
      name: 'activity',
    },
    {
      name: 'users',
    },
    {
      name: 'clients',
    },
    {
      name: 'issuers',
    },
    {
      name: 'access',
    },
    {
      name: 'settings',
    },
    {
      name: 'monitor',
    },
  ],
  subscription: [
    {
      name: 'boundaries',
    },
    {
      name: 'activity',
    },
    {
      name: 'access',
    },
    {
      name: 'monitor',
    },
  ],
  boundary: [
    {
      name: 'functions',
    },
    {
      name: 'activity',
    },
    {
      name: 'access',
    },
    {
      name: 'monitor',
    },
  ],
  oneFunction: [
    {
      name: 'overview',
    },
    {
      name: 'activity',
    },
    {
      name: 'access',
    },
    {
      name: 'settings',
    },
  ],
  issuer: [
    {
      name: 'properties',
    },
    {
      name: 'activity',
    },
    {
      name: 'access',
    },
  ],
  user: [
    {
      name: 'properties',
    },
    {
      name: 'activity',
    },
    {
      name: 'permissions',
    },
    {
      name: 'access',
    },
  ],
  client: [
    {
      name: 'properties',
    },
    {
      name: 'activity',
    },
    {
      name: 'permissions',
    },
    {
      name: 'access',
    },
  ],
};

function ProfileExplorer({ ...rest }: any) {
  const history = useHistory();
  const { profile } = useProfile();
  const classes = useStyles();
  const settings = getLocalSettings() as IFusebitSettings;

  function ExplorerView({ breadcrumbSettings, children, tabs, match, fab }: any) {
    const { path } = match;
    // Last segment of the URL indicates the selected tab
    const selectedTab = path.split('/').pop();
    return (
      <ProfileSelectorWithDetails settings={settings}>
        <Grid container>
          <Grid item xs={12}>
            <Paper elevation={1} square={true} className={classes.paper}>
              <ProfileBreadcrumb settings={breadcrumbSettings} />
              <Tabs
                value={tabs ? selectedTab : undefined}
                indicatorColor="primary"
                textColor="primary"
                onChange={(event, newTab) => history.push(newTab)}
              >
                {(tabs || []).map((tab: any) => (
                  <Tab key={tab.name} label={tab.name} value={tab.name} />
                ))}
              </Tabs>
              {fab && <div className={classes.fab}>{fab}</div>}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            {children}
          </Grid>
        </Grid>
      </ProfileSelectorWithDetails>
    );
  }

  function getDefaultUrl() {
    return profile.subscription
      ? `/accounts/${profile.account}/subscriptions/${profile.subscription}/boundaries`
      : `/accounts/${profile.account}/subscriptions`;
  }

  function NotFound() {
    throw new FusebitError("Oops! Can't find the resource you are trying to access.", {
      details: [
        `If you navigated to a URL that was given to you, please check it is valid. `,
        `Otherwise, use the link below to go back to a safe place. `,
      ].join(''),
      actions: [
        {
          text: profile.subscription ? 'Go back to subscription' : 'Go back to account',
          url: getDefaultUrl(),
        },
      ],
    });
  }

  return (
    <SubscriptionsProvider>
      <Switch>
        <Route
          path="/accounts/:accountId/subscriptions"
          exact={true}
          render={({ ...rest }) => (
            <ExplorerView tabs={ExplorerTabs.account} {...rest}>
              <AccountSubscriptions />
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/activity"
          exact={true}
          render={({ match }) => (
            <ExplorerView tabs={ExplorerTabs.account} match={match}>
              <Activity
                filter={{
                  resource: `/account/${profile.account}/`,
                }}
              />
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/users"
          exact={true}
          render={({ ...rest }) => (
            <ExplorerView tabs={ExplorerTabs.account} {...rest}>
              <AgentsProvider agentType="user">
                <AccountUsers />
              </AgentsProvider>
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/settings"
          exact={true}
          render={({ ...rest }) => (
            <ExplorerView tabs={ExplorerTabs.account} {...rest}>
              <AccountSettings />
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/access"
          exact={true}
          render={({ match, ...rest }) => (
            <ExplorerView tabs={ExplorerTabs.account} match={match} {...rest}>
              <AgentsProvider agentType="both">
                <ResourceAccess
                  actionPrefixFilter={['client', 'user', 'issuer']}
                  resourceFilter={{
                    accountId: match.params.accountId,
                  }}
                />
              </AgentsProvider>
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/users/new"
          exact={true}
          render={({ ...rest }) => (
            <ExplorerView breadcrumbSettings={{ newUser: true }} {...rest}>
              <NewAgent isUser />
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/users/:userId"
          render={({ match }) => (
            <AgentsProvider agentType="user">
              <AgentProvider agentId={match.params.userId} isUser>
                <Switch>
                  <Route
                    path={`${match.path}/properties`}
                    exact={true}
                    render={({ ...rest }) => (
                      <ExplorerView tabs={ExplorerTabs.user} fab={<AgentDeleteFab />} {...rest}>
                        <AgentProperties />
                      </ExplorerView>
                    )}
                  />
                  <Route
                    path={`${match.path}/activity`}
                    exact={true}
                    render={({ match }) => (
                      <ExplorerView tabs={ExplorerTabs.user} match={match}>
                        <Activity
                          filter={{
                            resource: `/account/${profile.account}/user/${match.params.userId}/`,
                          }}
                          actionFilter={['user']}
                        />
                      </ExplorerView>
                    )}
                  />
                  <Route
                    path={`${match.path}/permissions`}
                    exact={true}
                    render={({ ...rest }) => (
                      <ExplorerView tabs={ExplorerTabs.user} {...rest}>
                        <AgentPermissions />
                      </ExplorerView>
                    )}
                  />
                  <Route
                    path={`${match.path}/access`}
                    exact={true}
                    render={({ match, ...rest }) => (
                      <ExplorerView tabs={ExplorerTabs.user} match={match} {...rest}>
                        <AgentsProvider agentType="both">
                          <ResourceAccess
                            actionPrefixFilter={['user']}
                            resourceFilter={{
                              accountId: match.params.accountId,
                              userId: match.params.userId,
                            }}
                          />
                        </AgentsProvider>
                      </ExplorerView>
                    )}
                  />
                  <Route component={(NotFound as unknown) as React.FunctionComponent} />
                </Switch>
              </AgentProvider>
            </AgentsProvider>
          )}
        />

        <Route
          path="/accounts/:accountId/clients"
          exact={true}
          render={({ ...rest }) => (
            <ExplorerView tabs={ExplorerTabs.account} {...rest}>
              <AgentsProvider agentType="client">
                <AccountClients />
              </AgentsProvider>
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/clients/new"
          exact={true}
          render={({ ...rest }) => (
            <ExplorerView breadcrumbSettings={{ newClient: true }} {...rest}>
              <NewAgent isUser={false} />
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/clients/:clientId"
          render={({ match }) => (
            <AgentsProvider agentType="client">
              <AgentProvider agentId={match.params.clientId} isUser={false}>
                <Switch>
                  <Route
                    path={`${match.path}/properties`}
                    exact={true}
                    render={({ ...rest }) => (
                      <ExplorerView tabs={ExplorerTabs.client} fab={<AgentDeleteFab />} {...rest}>
                        <AgentProperties />
                      </ExplorerView>
                    )}
                  />
                  <Route
                    path={`${match.path}/activity`}
                    exact={true}
                    render={({ match }) => (
                      <ExplorerView tabs={ExplorerTabs.client} match={match}>
                        <Activity
                          filter={{
                            resource: `/account/${profile.account}/client/${match.params.clientId}/`,
                          }}
                          actionFilter={['client']}
                        />
                      </ExplorerView>
                    )}
                  />
                  <Route
                    path={`${match.path}/overview`}
                    exact={true}
                    render={({ ...rest }) => (
                      <ExplorerView tabs={ExplorerTabs.client} fab={<AgentDeleteFab />} {...rest}>
                        [TODO: Client Overview]
                      </ExplorerView>
                    )}
                  />
                  <Route
                    path={`${match.path}/permissions`}
                    exact={true}
                    render={({ ...rest }) => (
                      <ExplorerView tabs={ExplorerTabs.client} {...rest}>
                        <AgentPermissions />
                      </ExplorerView>
                    )}
                  />
                  <Route
                    path={`${match.path}/access`}
                    exact={true}
                    render={({ match, ...rest }) => (
                      <ExplorerView tabs={ExplorerTabs.client} match={match} {...rest}>
                        <AgentsProvider agentType="both">
                          <ResourceAccess
                            actionPrefixFilter={['client']}
                            resourceFilter={{
                              accountId: match.params.accountId,
                              clientId: match.params.clientId,
                            }}
                          />
                        </AgentsProvider>
                      </ExplorerView>
                    )}
                  />
                  <Route component={(NotFound as unknown) as React.FunctionComponent} />
                </Switch>
              </AgentProvider>
            </AgentsProvider>
          )}
        />

        <Route
          path="/accounts/:accountId/issuers"
          exact={true}
          render={({ ...rest }) => (
            <ExplorerView tabs={ExplorerTabs.account} {...rest}>
              <IssuersProvider>
                <AccountIssuers />
              </IssuersProvider>
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/issuers/:issuerId"
          render={({ match }) => (
            <IssuerProvider issuerId={decodeURIComponent(match.params.issuerId)}>
              <Switch>
                <Route
                  path={`${match.path}/properties`}
                  exact={true}
                  render={({ ...rest }) => (
                    <ExplorerView tabs={ExplorerTabs.issuer} {...rest}>
                      <IssuerProperties />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/activity`}
                  exact={true}
                  render={({ match }) => (
                    <ExplorerView tabs={ExplorerTabs.issuer} match={match}>
                      <Activity
                        filter={{
                          resource: `/account/${profile.account}/issuer/${match.params.issuerId}/`,
                        }}
                        actionFilter={['issuer']}
                      />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/access`}
                  exact={true}
                  render={({ match, ...rest }) => (
                    <ExplorerView tabs={ExplorerTabs.issuer} match={match} {...rest}>
                      <AgentsProvider agentType="both">
                        <ResourceAccess
                          actionPrefixFilter={['issuer']}
                          resourceFilter={{
                            accountId: match.params.accountId,
                            issuerId: match.params.issuerId,
                          }}
                        />
                      </AgentsProvider>
                    </ExplorerView>
                  )}
                />
                <Route component={(NotFound as unknown) as React.FunctionComponent} />
              </Switch>
            </IssuerProvider>
          )}
        />

        <Route
          path="/accounts/:accountId/subscriptions/:subscriptionId/boundaries/:boundaryId/functions/:functionId/code"
          exact={true}
          render={({ ...rest }) => <FunctionCode {...rest} />}
        />

        <Route
          path="/accounts/:accountId/subscriptions/:subscriptionId/access"
          exact={true}
          render={({ match, ...rest }) => (
            <ExplorerView tabs={ExplorerTabs.subscription} match={match} fab={<NewFunctionFab />} {...rest}>
              <AgentsProvider agentType="both">
                <ResourceAccess
                  actionPrefixFilter={['function', 'subscription', 'audit']}
                  resourceFilter={{
                    accountId: match.params.accountId,
                    subscriptionId: match.params.subscriptionId,
                  }}
                />
              </AgentsProvider>
            </ExplorerView>
          )}
        />

        <Route
          path="/accounts/:accountId/subscriptions/:subscriptionId"
          render={({ match }) => (
            <BoundariesProvider subscriptionId={match.params.subscriptionId}>
              <Switch>
                <Route
                  path={`${match.path}/activity`}
                  exact={true}
                  render={({ match }) => (
                    <ExplorerView tabs={ExplorerTabs.subscription} match={match}>
                      <Activity
                        filter={{
                          resource: `/account/${profile.account}/subscription/${match.params.subscriptionId}/`,
                        }}
                        actionFilter={['function']}
                      />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/boundaries/:boundaryId/functions/:functionId`}
                  render={({ match }) => (
                    <FunctionProvider
                      subscriptionId={match.params.subscriptionId}
                      boundaryId={match.params.boundaryId}
                      functionId={match.params.functionId}
                    >
                      <Switch>
                        <Route
                          path={`${match.path}/activity`}
                          exact={true}
                          render={({ match }) => (
                            <ExplorerView tabs={ExplorerTabs.oneFunction} match={match}>
                              <Activity
                                filter={{
                                  resource: `/account/${profile.account}/subscription/${match.params.subscriptionId}/boundary/${match.params.boundaryId}/function/${match.params.functionId}/`,
                                }}
                                actionFilter={['function']}
                              />
                            </ExplorerView>
                          )}
                        />
                        <Route
                          path={`${match.path}/overview`}
                          exact={true}
                          render={({ match, ...rest }) => (
                            <ExplorerView
                              tabs={ExplorerTabs.oneFunction}
                              match={match}
                              fab={<FunctionActionFab />}
                              {...rest}
                            >
                              <FunctionOverview />
                            </ExplorerView>
                          )}
                        />
                        <Route
                          path={`${match.path}/access`}
                          exact={true}
                          render={({ match, ...rest }) => (
                            <ExplorerView
                              tabs={ExplorerTabs.oneFunction}
                              match={match}
                              fab={<FunctionActionFab />}
                              {...rest}
                            >
                              <AgentsProvider agentType="both">
                                <ResourceAccess
                                  actionPrefixFilter={['function', 'audit']}
                                  resourceFilter={{
                                    accountId: match.params.accountId,
                                    subscriptionId: match.params.subscriptionId,
                                    boundaryId: match.params.boundaryId,
                                    functionId: match.params.functionId,
                                  }}
                                />
                              </AgentsProvider>
                            </ExplorerView>
                          )}
                        />
                        <Route
                          path={`${match.path}/monitor`}
                          exact={true}
                          render={({ match }) => (
                            <ExplorerView tabs={ExplorerTabs.subscription} match={match} fab={<NewFunctionFab />}>
                              <MonitorPanel params={match.params} />
                            </ExplorerView>
                          )}
                        />
                      </Switch>
                    </FunctionProvider>
                  )}
                />
                <Route
                  path={`${match.path}/boundaries`}
                  exact={true}
                  render={({ match }) => (
                    <ExplorerView tabs={ExplorerTabs.subscription} match={match} fab={<NewFunctionFab />}>
                      <SubscriptionBoundaries />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/monitor`}
                  exact={true}
                  render={({ match }) => (
                    <ExplorerView tabs={ExplorerTabs.subscription} match={match} fab={<NewFunctionFab />}>
                      <MonitorPanel params={match.params} />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/new-function/:templateId`}
                  exact={true}
                  render={({ match }) => (
                    <NewFunctionCreate
                      subscriptionId={match.params.subscriptionId}
                      templateId={match.params.templateId}
                    />
                  )}
                />
                <Route
                  path={`${match.path}/new-function`}
                  exact={true}
                  render={({ match, ...rest }) => (
                    <ExplorerView breadcrumbSettings={{ newSubscriptionFunction: true }} match={match} {...rest}>
                      <NewFunction subscriptionId={match.params.subscriptionId} />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/boundaries/:boundaryId/new-function/:templateId`}
                  exact={true}
                  render={({ match }) => (
                    <NewFunctionCreate
                      subscriptionId={match.params.subscriptionId}
                      boundaryId={match.params.boundaryId}
                      templateId={match.params.templateId}
                    />
                  )}
                />
                <Route
                  path={`${match.path}/boundaries/:boundaryId/new-function`}
                  exact={true}
                  render={({ match, ...rest }) => (
                    <ExplorerView breadcrumbSettings={{ newBoundaryFunction: true }} match={match} {...rest}>
                      <NewFunction subscriptionId={match.params.subscriptionId} boundaryId={match.params.boundaryId} />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/boundaries/:boundaryId/functions`}
                  exact={true}
                  render={({ match }) => (
                    <ExplorerView tabs={ExplorerTabs.boundary} match={match} fab={<NewFunctionFab />}>
                      <BoundaryFunctions
                        subscriptionId={match.params.subscriptionId}
                        boundaryId={match.params.boundaryId}
                      />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/boundaries/:boundaryId/activity`}
                  exact={true}
                  render={({ match }) => (
                    <ExplorerView tabs={ExplorerTabs.boundary} match={match}>
                      <Activity
                        filter={{
                          resource: `/account/${profile.account}/subscription/${match.params.subscriptionId}/boundary/${match.params.boundaryId}/`,
                        }}
                        actionFilter={['function']}
                      />
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/boundaries/:boundaryId/access`}
                  exact={true}
                  render={({ match, ...rest }) => (
                    <ExplorerView tabs={ExplorerTabs.boundary} match={match} fab={<NewFunctionFab />} {...rest}>
                      <AgentsProvider agentType="both">
                        <ResourceAccess
                          actionPrefixFilter={['function', 'audit']}
                          resourceFilter={{
                            accountId: match.params.accountId,
                            subscriptionId: match.params.subscriptionId,
                            boundaryId: match.params.boundaryId,
                          }}
                        />
                      </AgentsProvider>
                    </ExplorerView>
                  )}
                />
                <Route
                  path={`${match.path}/boundaries/:boundaryId/monitor`}
                  exact={true}
                  render={({ match }) => (
                    <ExplorerView tabs={ExplorerTabs.subscription} match={match} fab={<NewFunctionFab />}>
                      <MonitorPanel params={match.params} />
                    </ExplorerView>
                  )}
                />
                <Route component={(NotFound as unknown) as React.FunctionComponent} />
              </Switch>
            </BoundariesProvider>
          )}
        />

        <Redirect from="/joining" exact={true} to={getDefaultUrl()} />
        <Redirect from="/" exact={true} to={getDefaultUrl()} />
        <Route component={(NotFound as unknown) as React.FunctionComponent} />
      </Switch>
    </SubscriptionsProvider>
  );
}

export default ProfileExplorer;
