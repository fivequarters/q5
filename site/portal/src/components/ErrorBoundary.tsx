import React from "react";
import { getLocalSettings, IFusebitSettings } from "../lib/Settings";
import ProfileSelectorWithDetails from "./ProfileSelectorWithDetails";
import Grid from "@material-ui/core/Grid";
import { withStyles } from "@material-ui/core/styles";
import PortalError from "./PortalError";

const styles = (theme: any) => ({
  gridContainer: {
    marginTop: 12,
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2)
  },
  gridLine: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  }
});

interface IFusebitErrorAction {
  text: string;
  url?: string;
  func?: () => void;
}

interface IFusebitErrorOptions {
  details: string;
  actions?: IFusebitErrorAction[];
  source?: string;
}

class FusebitError extends Error {
  public fusebit: IFusebitErrorOptions;
  constructor(message: string, options: IFusebitErrorOptions) {
    super(message);
    this.fusebit = options;
  }
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { error: undefined, drawerOpen: false };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log the error to an error reporting service
  }

  render() {
    if (this.state.error) {
      return this.renderError(this.state.error);
    } else {
      return this.props.children;
    }
  }

  renderError(error: any) {
    const settings = getLocalSettings() as IFusebitSettings;
    const { classes } = this.props;

    return (
      <ProfileSelectorWithDetails settings={settings}>
        <Grid container className={classes.gridContainer}>
          <Grid item xs={12} className={classes.gridLine}>
            <PortalError error={error} />
          </Grid>
        </Grid>
      </ProfileSelectorWithDetails>
    );
  }
}

export { FusebitError };
export default withStyles(styles)(ErrorBoundary);
