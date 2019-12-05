import React from "react";
import { withStyles } from "@material-ui/core/styles";
import ProfileSelector from "./ProfileSelector";
import {
  getLocalSettings,
  setLocalSettings,
  IFusebitSettings
} from "../lib/Settings";

const styles = (theme: any) => ({
  root: {
    display: "flex"
  }
});

interface IFusebitErrorAction {
  text: string;
  url: string;
}

interface IFusebitErrorOptions {
  details: string;
  actions?: IFusebitErrorAction[];
  showProfileSelector?: boolean;
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
    console.log("IN RENDER ERROR", error);
    const { classes } = this.props;
    const settings = getLocalSettings() as IFusebitSettings;

    const handleSelectProfile = (id: string) => {
      settings.currentProfile = id;
      setLocalSettings(settings);
      window.location.href = "/";
    };

    return (
      <div className={classes.root}>
        <ProfileSelector
          settings={settings}
          open={this.state.drawerOpen}
          onSetDrawerOpen={(open: boolean) =>
            this.setState({ drawerOpen: open })
          }
          onSelectProfile={handleSelectProfile}
        />
        <div>{this.renderErrorDetails(error)}</div>
      </div>
    );
  }

  renderErrorDetails(error: any) {
    if (this.state.error.fusebit) {
      const fusebitError = this.state.error as FusebitError;
      return (
        <div>
          <h1>{fusebitError.message}</h1>
          <p>{fusebitError.fusebit.details}</p>
          {fusebitError.fusebit.actions &&
            fusebitError.fusebit.actions.map(action => (
              <a href={action.url}>{action.text}</a>
            ))}
        </div>
      );
    } else {
      return (
        <div>
          <h1>Something went wrong</h1>
          <p>{this.state.error.message}</p>
        </div>
      );
    }
  }
}

export { FusebitError };
export default withStyles(styles)(ErrorBoundary);
