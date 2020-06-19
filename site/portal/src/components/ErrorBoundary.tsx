import React from 'react';
import ProfileSelectorWithDetails from './ProfileSelectorWithDetails';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import PortalError from './PortalError';
import { withRouter } from 'react-router-dom';
import { useConfig } from './ConfigProvider';
import { getLocalSettings } from '../lib/Settings';

const styles = (theme: any) => ({
  gridContainer: {
    marginTop: 12,
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  gridLine: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
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
    const { history } = this.props;
    this.state = { error: undefined, drawerOpen: false };
    history.listen(() => {
      if (this.state.error) {
        this.setState({
          error: undefined,
          drawerOpen: false,
        });
      }
    });
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
    const { classes } = this.props;

    function RenderErrorImpl() {
      let config: any = undefined;
      try {
        const [tmp]: [any] = useConfig();
        config = tmp;
      } catch (_) {}
      const settings = getLocalSettings();

      if (config) {
        if (settings) {
          config.currentProfile = settings.currentProfile;
        }
        return (
          <ProfileSelectorWithDetails settings={config}>
            <Grid container className={classes.gridContainer}>
              <Grid item xs={12} className={classes.gridLine}>
                <PortalError error={error} />
              </Grid>
            </Grid>
          </ProfileSelectorWithDetails>
        );
      } else {
        return (
          <Grid container className={classes.gridContainer}>
            <Grid item xs={12} className={classes.gridLine}>
              <PortalError error={error} />
            </Grid>
          </Grid>
        );
      }
    }

    return <RenderErrorImpl />;
  }
}

export { FusebitError };
export default withStyles(styles)(withRouter(ErrorBoundary));
