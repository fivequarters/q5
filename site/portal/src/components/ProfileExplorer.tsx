import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import React from "react";
import { Redirect, Route, Switch, useHistory } from "react-router-dom";
import { getLocalSettings, IFusebitSettings } from "../lib/Settings";
import AccountClients from "./AccountClients";
import AccountIssuers from "./AccountIssuers";
import AccountSubscriptions from "./AccountSubscriptions";
import AccountUsers from "./AccountUsers";
import AgentAccess from "./AgentAccess";
import AgentProperties from "./AgentProperties";
import { AgentProvider } from "./AgentProvider";
import BoundaryFunctions from "./BoundaryFunctions";
import ClientActionFab from "./ClientActionFab";
import { FusebitError } from "./ErrorBoundary";
import FunctionCode from "./FunctionCode";
import FunctionOverview from "./FunctionOverview";
import IssuerOverview from "./IssuerOverview";
import NewAgent from "./NewAgent";
import ProfileBreadcrumb from "./ProfileBreadcrumb";
import { useProfile } from "./ProfileProvider";
import ProfileSelectorWithDetails from "./ProfileSelectorWithDetails";
import SubscriptionBoundaries from "./SubscriptionBoundaries";
import UserActionFab from "./UserActionFab";

const useStyles = makeStyles(theme => ({
  paper: {
    paddingTop: 14,
    paddingLeft: theme.spacing(2),
    position: "relative"
  },
  fab: {
    position: "absolute",
    right: theme.spacing(16),
    bottom: -theme.spacing(3.5)
  },
  regularMargin: {
    marginTop: theme.spacing(2)
  },
  slimMargin: {
    marginTop: 2
  }
}));

const ExplorerTabs = {
  account: [
    {
      name: "subscriptions"
    },
    {
      name: "activity"
    },
    {
      name: "users"
    },
    {
      name: "clients"
    },
    {
      name: "issuers"
    },
    {
      name: "settings"
    }
  ],
  subscription: [
    {
      name: "boundaries"
    },
    {
      name: "activity"
    },
    {
      name: "access"
    },
    {
      name: "settings"
    }
  ],
  boundary: [
    {
      name: "functions"
    },
    {
      name: "activity"
    },
    {
      name: "access"
    },
    {
      name: "settings"
    }
  ],
  oneFunction: [
    {
      name: "overview"
    },
    {
      name: "activity"
    },
    {
      name: "access"
    },
    {
      name: "settings"
    }
  ],
  issuer: [
    {
      name: "properties"
    },
    {
      name: "activity"
    }
  ],
  user: [
    {
      name: "properties"
    },
    {
      name: "access"
    },
    {
      name: "activity"
    }
  ],
  client: [
    {
      name: "properties"
    },
    {
      name: "access"
    },
    {
      name: "activity"
    }
  ]
};

function ProfileExplorer({ ...rest }: any) {
  const history = useHistory();
  const { profile } = useProfile();
  const classes = useStyles();
  const settings = getLocalSettings() as IFusebitSettings;
  const [data, setData] = React.useState({});

  function ExplorerView({
    breadcrumbSettings,
    children,
    tabs,
    match,
    detailsFullView,
    fab
  }: any) {
    const { path } = match;
    // Last segment of the URL indicates the selected tab
    const selectedTab = path.split("/").pop();
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
          <Grid
            item
            xs={12}
            className={
              detailsFullView ? classes.slimMargin : classes.regularMargin
            }
          >
            {children}
          </Grid>
        </Grid>
      </ProfileSelectorWithDetails>
    );
  }

  function getDefaultUrl() {
    // return `/accounts/${profile.account}/subscriptions`;
    return profile.subscription
      ? `/accounts/${profile.account}/subscriptions/${profile.subscription}/boundaries`
      : `/accounts/${profile.account}/subscriptions`;
  }

  function NotFound() {
    throw new FusebitError(
      "Oops! Can't find the resource you are trying to access.",
      {
        details: [
          `If you navigated to a URL that was given to you, please check it is valid. `,
          `Otherwise, use the link below to go back to a safe place. `
        ].join(""),
        actions: [
          {
            text: profile.subscription
              ? "Go back to subscription"
              : "Go back to account",
            url: getDefaultUrl()
          }
        ]
      }
    );
  }

  const handleOnNewData = (data: any) => setData(data);

  return (
    <Switch>
      <Route
        path="/accounts/:accountId/subscriptions"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountSubscriptions
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/users"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountUsers data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />

      <Route
        path="/accounts/:accountId/users/new"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView breadcrumbSettings={{ newUser: true }} {...rest}>
            <NewAgent data={data} onNewData={handleOnNewData} isUser />
          </ExplorerView>
        )}
      />

      <Route
        path="/accounts/:accountId/users/:userId"
        render={({ match }) => (
          <AgentProvider agentId={match.params.userId} isUser>
            <Switch>
              <Route
                path={`${match.path}/properties`}
                exact={true}
                render={({ ...rest }) => (
                  <ExplorerView
                    tabs={ExplorerTabs.user}
                    fab={<UserActionFab />}
                    {...rest}
                  >
                    <AgentProperties
                      data={data}
                      onNewData={handleOnNewData}
                      {...rest}
                    />
                  </ExplorerView>
                )}
              />
              <Route
                path={`${match.path}/access`}
                exact={true}
                render={({ ...rest }) => (
                  <ExplorerView
                    tabs={ExplorerTabs.user}
                    fab={<UserActionFab />}
                    {...rest}
                  >
                    <AgentAccess />
                  </ExplorerView>
                )}
              />
            </Switch>
          </AgentProvider>
        )}
      />

      <Route
        path="/accounts/:accountId/clients"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountClients data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />

      <Route
        path="/accounts/:accountId/clients/new"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView breadcrumbSettings={{ newClient: true }} {...rest}>
            <NewAgent data={data} onNewData={handleOnNewData} isUser={false} />
          </ExplorerView>
        )}
      />

      <Route
        path="/accounts/:accountId/clients/:clientId"
        render={({ match }) => (
          <AgentProvider agentId={match.params.clientId} isUser={false}>
            <Switch>
              <Route
                path={`${match.path}/properties`}
                exact={true}
                render={({ ...rest }) => (
                  <ExplorerView
                    tabs={ExplorerTabs.client}
                    fab={<ClientActionFab />}
                    {...rest}
                  >
                    <AgentProperties
                      data={data}
                      onNewData={handleOnNewData}
                      {...rest}
                    />
                  </ExplorerView>
                )}
              />
              <Route
                path={`${match.path}/overview`}
                exact={true}
                render={({ ...rest }) => (
                  <ExplorerView
                    tabs={ExplorerTabs.client}
                    fab={<ClientActionFab />}
                    {...rest}
                  >
                    [TODO: Client Overview]
                  </ExplorerView>
                )}
              />
              <Route
                path={`${match.path}/access`}
                exact={true}
                render={({ ...rest }) => (
                  <ExplorerView
                    tabs={ExplorerTabs.client}
                    fab={<ClientActionFab />}
                    {...rest}
                  >
                    <AgentAccess />
                  </ExplorerView>
                )}
              />
            </Switch>
          </AgentProvider>
        )}
      />

      <Route
        path="/accounts/:accountId/clients/new"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView breadcrumbSettings={{ newClient: true }} {...rest}>
            <NewAgent data={data} onNewData={handleOnNewData} isUser={false} />
          </ExplorerView>
        )}
      />

      <Route
        path="/accounts/:accountId/clients/:clientId"
        render={({ match }) => (
          <AgentProvider agentId={match.params.clientId} isUser={false}>
            <Switch>
              <Route
                path={`${match.path}/properties`}
                exact={true}
                render={({ ...rest }) => (
                  <ExplorerView
                    tabs={ExplorerTabs.client}
                    fab={<ClientActionFab />}
                    {...rest}
                  >
                    <AgentProperties
                      data={data}
                      onNewData={handleOnNewData}
                      {...rest}
                    />
                  </ExplorerView>
                )}
              />
              <Route
                path={`${match.path}/access`}
                exact={true}
                render={({ ...rest }) => (
                  <ExplorerView
                    tabs={ExplorerTabs.client}
                    fab={<ClientActionFab />}
                    {...rest}
                  >
                    <AgentAccess />
                  </ExplorerView>
                )}
              />
            </Switch>
          </AgentProvider>
        )}
      />

      <Route
        path="/accounts/:accountId/issuers"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountIssuers data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/issuers/:issuerId/properties"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.issuer} {...rest}>
            <IssuerOverview data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/subscriptions/:subscriptionId/boundaries"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.subscription} {...rest}>
            <SubscriptionBoundaries
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/subscriptions/:subscriptionId/boundaries/:boundaryId/functions"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.boundary} {...rest}>
            <BoundaryFunctions
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/subscriptions/:subscriptionId/boundaries/:boundaryId/functions/:functionId/overview"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.oneFunction} {...rest}>
            <FunctionOverview
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/subscriptions/:subscriptionId/boundaries/:boundaryId/functions/:functionId/code"
        exact={true}
        render={({ ...rest }) => (
          <FunctionCode data={data} onNewData={handleOnNewData} {...rest} />
        )}
      />
      <Redirect from="/joining" exact={true} to={getDefaultUrl()} />
      <Redirect from="/" exact={true} to={getDefaultUrl()} />
      <Route component={(NotFound as unknown) as React.FunctionComponent} />
    </Switch>
  );
}

export default ProfileExplorer;
