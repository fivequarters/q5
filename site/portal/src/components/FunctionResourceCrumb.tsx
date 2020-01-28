import { makeStyles } from "@material-ui/core/styles";
import FilterNoneIcon from "@material-ui/icons/FilterNone";
import FlipIcon from "@material-ui/icons/Flip";
import GridOnIcon from "@material-ui/icons/GridOn";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import OndemandVideoIcon from "@material-ui/icons/OndemandVideo";
import React from "react";
import { useProfile } from "./ProfileProvider";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  firstIcon: {
    marginRight: theme.spacing(1)
  },
  middleIcon: {
    marginRight: theme.spacing(1),
    marginLeft: theme.spacing(1)
  }
}));

function FunctionResourceCrumb({ options, data, ...rest }: any) {
  const classes = useStyles();
  const { profile } = useProfile();

  const formatSubscription = () =>
    (data &&
      data.subscriptions &&
      data.subscriptions.dataHash &&
      data.subscriptions.dataHash[options.subscriptionId] &&
      data.subscriptions.dataHash[options.subscriptionId].displayName) ||
    options.subscriptionId;

  const formatAccount = () => profile.displayName || profile.account;

  return (
    <span className={classes.root} {...rest}>
      <GridOnIcon fontSize="inherit" className={classes.firstIcon} />{" "}
      {formatAccount()}
      {options && options.subscriptionId && options.subscriptionId !== "*" && (
        <React.Fragment>
          <NavigateNextIcon fontSize="inherit" className={classes.middleIcon} />
          <FilterNoneIcon fontSize="inherit" className={classes.firstIcon} />
          {formatSubscription()}
          {options.boundaryId && (
            <React.Fragment>
              <NavigateNextIcon
                fontSize="inherit"
                className={classes.middleIcon}
              />
              <FlipIcon fontSize="inherit" className={classes.firstIcon} />
              {options.boundaryId}
              {options.functionId && (
                <React.Fragment>
                  <NavigateNextIcon
                    fontSize="inherit"
                    className={classes.middleIcon}
                  />
                  <OndemandVideoIcon
                    fontSize="inherit"
                    className={classes.firstIcon}
                  />
                  {options.functionId}
                </React.Fragment>
              )}
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </span>
  );
}

export default FunctionResourceCrumb;
