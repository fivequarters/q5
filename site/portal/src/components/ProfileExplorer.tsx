import React from "react";
import { Switch, Route, Redirect, useHistory } from "react-router-dom";
import { getLocalSettings, IFusebitSettings } from "../lib/Settings";
import { makeStyles } from "@material-ui/core/styles";
import { useProfile } from "./ProfileProvider";
import ProfileSelectorWithDetails from "./ProfileSelectorWithDetails";
import ProfileBreadcrumb from "./ProfileBreadcrumb";
import Grid from "@material-ui/core/Grid";
import { FusebitError } from "./ErrorBoundary";
import { getUser, normalizeUser, updateUser } from "../lib/Fusebit";

import AccountOverview from "./AccountOverview";
import AccountSubscriptions from "./AccountSubscriptions";
import AccountUsers from "./AccountUsers";
import AccountClients from "./AccountClients";
import AccountIssuers from "./AccountIssuers";
import SubscriptionOverview from "./SubscriptionOverview";
import SubscriptionBoundaries from "./SubscriptionBoundaries";
import BoundaryOverview from "./BoundaryOverview";
import BoundaryFunctions from "./BoundaryFunctions";
import FunctionOverview from "./FunctionOverview";
import FunctionCode from "./FunctionCode";
import IssuerOverview from "./IssuerOverview";
import UserOverview from "./UserOverview";
import AgentIdentities from "./AgentIdentities";

import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

const useStyles = makeStyles(theme => ({
  paper: {
    paddingTop: 14,
    paddingLeft: theme.spacing(2)
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
      name: "overview"
    },
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
      name: "overview"
    },
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
      name: "overview"
    },
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
      name: "overview"
    },
    {
      name: "activity"
    }
  ],
  user: [
    {
      name: "overview"
    },
    {
      name: "access"
    },
    {
      name: "identities"
    },
    {
      name: "activity"
    }
  ]
};

function ProfileExplorer({ ...rest }) {
  const history = useHistory();
  const { profile } = useProfile();
  const classes = useStyles();
  const settings = getLocalSettings() as IFusebitSettings;
  const [data, setData] = React.useState({});

  function ExplorerView({ children, tabs, match, detailsFullView }: any) {
    const { path } = match;
    // Last segment of the URL indicates the selected tab
    const selectedTab = path.split("/").pop();
    return (
      <ProfileSelectorWithDetails settings={settings}>
        <Grid container>
          <Grid item xs={12}>
            <Paper elevation={1} square={true} className={classes.paper}>
              <ProfileBreadcrumb />
              <Tabs
                value={selectedTab}
                indicatorColor="primary"
                textColor="primary"
                onChange={(event, newTab) => history.push(newTab)}
              >
                {tabs.map((tab: any) => (
                  <Tab key={tab.name} label={tab.name} value={tab.name} />
                ))}
              </Tabs>
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
    // return `/accounts/${profile.account}/overview`;
    return profile.subscription
      ? `/accounts/${profile.account}/subscriptions/${profile.subscription}/overview`
      : `/accounts/${profile.account}/overview`;
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
              ? "Go back to subscription overview"
              : "Go back to account overview",
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
        path="/accounts/:accountId/overview"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountOverview
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
          </ExplorerView>
        )}
      />
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
        path="/accounts/:accountId/users/:userId/overview"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.user} {...rest}>
            <UserOverview data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/users/:userId/identities"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.user} {...rest}>
            <AgentIdentities
              data={data}
              onNewData={handleOnNewData}
              getAgent={getUser}
              updateAgent={updateUser}
              normalizeAgent={normalizeUser}
              isUser={true}
              {...rest}
            />
          </ExplorerView>
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
        path="/accounts/:accountId/issuers"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountIssuers data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/issuers/:issuerId/overview"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.issuer} {...rest}>
            <IssuerOverview data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/subscriptions/:subscriptionId/overview"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.subscription} {...rest}>
            <SubscriptionOverview
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
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
        path="/accounts/:accountId/subscriptions/:subscriptionId/boundaries/:boundaryId/overview"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.boundary} {...rest}>
            <BoundaryOverview
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
      <Redirect from="/" exact={true} to={getDefaultUrl()} />
      <Route component={(NotFound as unknown) as React.FunctionComponent} />
    </Switch>
  );
}

export default ProfileExplorer;
