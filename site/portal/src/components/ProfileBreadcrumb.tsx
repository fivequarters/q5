import React from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useProfile } from "./ProfileProvider";
// import { makeStyles } from "@material-ui/core/styles";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import Link from "@material-ui/core/Link";
import Typography from "@material-ui/core/Typography";

// const useStyles = makeStyles((theme: any) => ({
//   root: {
//     display: "flex"
//   }
// }));

const tree = {
  paramName: "accountId",
  formatLink: (params: any) => `/accounts/${params.accountId}/overview`,
  text: (params: any, profile: any) => profile.displayName,
  children: [
    {
      paramName: "subscriptionId",
      formatLink: (params: any) =>
        `/accounts/${params.accountId}/subscriptions/${params.subscriptionId}/overview`,
      text: (params: any, profile: any) => params.subscriptionId,
      children: [
        {
          paramName: "boundaryId",
          formatLink: (params: any) =>
            `/accounts/${params.accountId}/subscriptions/${params.subscriptionId}/boundaries/${params.boundaryId}/overview`,
          text: (params: any, profile: any) => params.boundaryId,
          children: [
            {
              paramName: "functionId",
              text: (params: any, profile: any) => params.functionId,
              children: []
            }
          ]
        }
      ]
    },
    {
      paramName: "issuerId",
      formatLink: (params: any) =>
        `/accounts/${params.accountId}/issuers/${params.issuerId}/overview`,
      text: (params: any, profile: any) => params.issuerId,
      children: []
    }
  ]
};

function ProfileBreadcrumb({ children, settings }: any) {
  const params = useParams() as any;
  const { profile } = useProfile();
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
          to={node.formatLink(params)}
        >
          <Typography variant="h5">{node.text(params, profile)}</Typography>
        </Link>,
        renderBreadcrumbNode(nextNode)
      ];
    } else {
      // This is the last segment - render without link
      return (
        <Typography variant="h5" key={params[node.paramName]}>
          {node.text(params, profile)}
        </Typography>
      );
    }
  }

  return <Breadcrumbs>{renderBreadcrumbNode(tree)}</Breadcrumbs>;
}

export default ProfileBreadcrumb;
