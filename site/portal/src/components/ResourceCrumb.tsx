import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import FilterNoneIcon from "@material-ui/icons/FilterNone";
import FlipIcon from "@material-ui/icons/Flip";
import GridOnIcon from "@material-ui/icons/GridOn";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import OndemandVideoIcon from "@material-ui/icons/OndemandVideo";
import React from "react";
import { useProfile } from "./ProfileProvider";
import { useSubscriptions } from "./SubscriptionsProvider";
import { tryTokenizeResource } from "../lib/Actions";
import PersonIcon from "@material-ui/icons/Person";
import { useAgentMaybe, formatAgent as formatAgentImpl } from "./AgentProvider";
import AccountBalanceIcon from "@material-ui/icons/AccountBalance";
import DvrIcon from "@material-ui/icons/Dvr";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    // overflow: "hidden",
    // textOverflow: "ellipsis",
    // whiteSpace: "nowrap",
  },
  noWrap: {
    whiteSpace: "nowrap",
  },
  firstIcon: {
    marginRight: theme.spacing(1),
  },
  middleIcon: {
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
}));

function ResourceCrumb({ resource, ...rest }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const [subscriptions] = useSubscriptions();
  const [agent] = useAgentMaybe();
  const options = tryTokenizeResource(resource);

  if (!options) {
    return <Typography variant="inherit">{resource}</Typography>;
  }

  const formatSubscription = () =>
    (subscriptions.status === "ready" &&
      options &&
      options.subscriptionId &&
      subscriptions.existing.hash[options.subscriptionId] &&
      subscriptions.existing.hash[options.subscriptionId].displayName) ||
    options.subscriptionId;

  const formatAccount = () => profile.displayName || profile.account;

  const formatFunction = () => (
    <React.Fragment>
      <span className={classes.noWrap}>
        <NavigateNextIcon fontSize="inherit" className={classes.middleIcon} />
        <FilterNoneIcon fontSize="inherit" className={classes.firstIcon} />
        <Typography variant="inherit" className={classes.noWrap}>
          {formatSubscription()}
        </Typography>
      </span>
      {options.boundaryId && (
        <React.Fragment>
          <span className={classes.noWrap}>
            <NavigateNextIcon
              fontSize="inherit"
              className={classes.middleIcon}
            />
            <FlipIcon fontSize="inherit" className={classes.firstIcon} />
            <Typography variant="inherit" className={classes.noWrap}>
              {options.boundaryId}
            </Typography>
          </span>
          {options.functionId && (
            <React.Fragment>
              <span className={classes.noWrap}>
                <NavigateNextIcon
                  fontSize="inherit"
                  className={classes.middleIcon}
                />
                <OndemandVideoIcon
                  fontSize="inherit"
                  className={classes.firstIcon}
                />
                <Typography variant="inherit" className={classes.noWrap}>
                  {options.functionId}
                </Typography>
              </span>
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );

  const formatAgent = () => (
    <React.Fragment>
      <span className={classes.noWrap}>
        <NavigateNextIcon fontSize="inherit" className={classes.middleIcon} />
        {options.userId ? (
          <PersonIcon fontSize="inherit" className={classes.firstIcon} />
        ) : (
          <DvrIcon fontSize="inherit" className={classes.firstIcon} />
        )}
        <Typography variant="inherit" className={classes.noWrap}>
          {agent ? formatAgentImpl(agent) : options.userId || options.clientId}
        </Typography>
      </span>
    </React.Fragment>
  );

  const formatIssuer = () => (
    <React.Fragment>
      <span className={classes.noWrap}>
        <NavigateNextIcon fontSize="inherit" className={classes.middleIcon} />
        <AccountBalanceIcon fontSize="inherit" className={classes.firstIcon} />
        <Typography variant="inherit" className={classes.noWrap}>
          {options.issuerId}
        </Typography>
      </span>
    </React.Fragment>
  );

  return (
    <span className={classes.root} {...rest}>
      <span className={classes.noWrap}>
        <GridOnIcon fontSize="inherit" className={classes.firstIcon} />
        <Typography variant="inherit" className={classes.noWrap}>
          {formatAccount()}
        </Typography>
      </span>
      {options.subscriptionId &&
        options.subscriptionId !== "*" &&
        formatFunction()}
      {(options.userId || options.clientId) && formatAgent()}
      {options.issuerId && formatIssuer()}
    </span>
  );
}

export default ResourceCrumb;
