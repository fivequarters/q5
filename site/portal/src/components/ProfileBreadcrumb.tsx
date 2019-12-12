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

const structure = [
  {
    paramName: "accountId",
    formatLink: (params: any) => `/account/${params.accountId}/subscription`,
    text: (params: any, profile: any) => profile.displayName
  },
  {
    paramName: "subscriptionId",
    formatLink: (params: any) =>
      `/account/${params.accountId}/subscription/${
        params.subscriptionId
      }/boundary`,
    text: (params: any, profile: any) => params.subscriptionId
  },
  {
    paramName: "boundaryId",
    formatLink: (params: any) =>
      `/account/${params.accountId}/subscription/${
        params.subscriptionId
      }/boundary/${params.boundaryId}/function`,
    text: (params: any, profile: any) => params.boundaryId
  },
  {
    paramName: "functionId",
    text: (params: any, profile: any) => params.functionId
  }
];

function ProfileBreadcrumb({ children, settings }: any) {
  const params = useParams() as any;
  const { profile } = useProfile();
  // const classes = useStyles();

  function renderBreadcrumbSegment(segment: any, index: number) {
    if (!params[segment.paramName]) {
      return undefined;
    }

    if (!structure[index + 1] || !params[structure[index + 1].paramName]) {
      // Last segment - no link
      return (
        <Typography key={index}>{segment.text(params, profile)}</Typography>
      );
    } else {
      // Prior to last segment - with link
      return (
        <Link
          key={index}
          component={RouterLink}
          to={segment.formatLink(params)}
        >
          <Typography>{segment.text(params, profile)}</Typography>
        </Link>
      );
    }
  }

  return <Breadcrumbs>{structure.map(renderBreadcrumbSegment)}</Breadcrumbs>;
}

export default ProfileBreadcrumb;
