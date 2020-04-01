import React from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useProfile } from "./ProfileProvider";
// import { makeStyles } from "@material-ui/core/styles";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import Link from "@material-ui/core/Link";
import Typography from "@material-ui/core/Typography";
import { useSubscriptions } from "./SubscriptionsProvider";

// const useStyles = makeStyles((theme: any) => ({
//   root: {
//     display: "flex"
//   }
// }));

const tree = {
  paramName: "accountId",
  formatLink: (params: any) => `/accounts/${params.accountId}/subscriptions`,
  text: (params: any, profile: any) => profile.displayName,
  children: [
    {
      paramName: "subscriptionId",
      formatLink: (params: any, profile: any) =>
        `/accounts/${params.accountId}/subscriptions/${params.subscriptionId}/boundaries`,
      text: (params: any, profile: any, subscriptions: any) =>
        (subscriptions.status === "ready" &&
          subscriptions.existing.hash[params.subscriptionId] &&
          subscriptions.existing.hash[params.subscriptionId].displayName) ||
        params.subscriptionId,
      children: [
        {
          paramName: "boundaryId",
          formatLink: (params: any) =>
            `/accounts/${params.accountId}/subscriptions/${params.subscriptionId}/boundaries/${params.boundaryId}/functions`,
          text: (params: any, profile: any) => params.boundaryId,
          children: [
            {
              paramName: "functionId",
              text: (params: any, profile: any) => params.functionId,
              children: []
            },
            {
              paramName: "newBoundaryFunction",
              text: (params: any, profile: any) => "New Function",
              children: []
            }
          ]
        },
        {
          paramName: "newSubscriptionFunction",
          text: (params: any, profile: any) => "New Function",
          children: []
        }
      ]
    },
    {
      paramName: "issuerId",
      formatLink: (params: any) =>
        `/accounts/${params.accountId}/issuers/${params.issuerId}/properties`,
      text: (params: any, profile: any) => decodeURIComponent(params.issuerId),
      children: []
    },
    {
      paramName: "userId",
      formatLink: (params: any) =>
        `/accounts/${params.accountId}/users/${params.userId}/properties`,
      text: (params: any, profile: any) => params.userId,
      children: []
    },
    {
      paramName: "clientId",
      formatLink: (params: any) =>
        `/accounts/${params.accountId}/clients/${params.clientId}/properties`,
      text: (params: any, profile: any) => params.clientId,
      children: []
    },
    {
      paramName: "newUser",
      formatLink: (params: any) => `/accounts/${params.accountId}/users/new`,
      text: (params: any, profile: any) => "New User",
      children: []
    },
    {
      paramName: "newClient",
      formatLink: (params: any) => `/accounts/${params.accountId}/clients/new`,
      text: (params: any, profile: any) => "New Client",
      children: []
    }
  ]
};

function ProfileBreadcrumb({ children, settings }: any) {
  const params = { ...(useParams() as any), ...settings };
  const { profile } = useProfile();
  const [subscriptions] = useSubscriptions();
  // const classes = useStyles();

  function renderBreadcrumbNode(node: any): any {
    if (!node || !params[node.paramName]) {
      return undefined;
    }

    // Is there a subsequent node in the breadcrumb?
    const nextNode = node.children.reduce(
      (selected: any, current: any) =>
        selected || (params[current.paramName] && current),
      undefined
    );

    if (nextNode) {
      // This is not the last segment - render with link
      return [
        <Link
          key={params[node.paramName]}
          component={RouterLink}
          to={node.formatLink(params, profile, subscriptions)}
        >
          <Typography variant="h5">
            {node.text(params, profile, subscriptions)}
          </Typography>
        </Link>,
        renderBreadcrumbNode(nextNode)
      ];
    } else {
      // This is the last segment - render without link
      return (
        <Typography variant="h5" key={params[node.paramName]}>
          {node.text(params, profile, subscriptions)}
        </Typography>
      );
    }
  }

  return <Breadcrumbs>{renderBreadcrumbNode(tree)}</Breadcrumbs>;
}

export default ProfileBreadcrumb;
