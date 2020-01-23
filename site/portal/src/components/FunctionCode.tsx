import React from "react";
import { useHistory } from "react-router-dom";
import FusebitEditor from "./FusebitEditor";
import { makeStyles } from "@material-ui/core/styles";
import { useProfile } from "./ProfileProvider";
import { tryGetFunction } from "../lib/Fusebit";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import LinearProgress from "@material-ui/core/LinearProgress";
import CloseIcon from "@material-ui/icons/Close";
import Slide from "@material-ui/core/Slide";
import { TransitionProps } from "@material-ui/core/transitions";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";

const useStyles = makeStyles(theme => ({
  gridItem: {
    position: "relative",
    height: "calc(100vh - 63px)"
  },
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0
  },
  appBar: {
    position: "relative"
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1
  }
}));

const Transition = React.forwardRef<unknown, TransitionProps>(
  function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

function FunctionCode({ data, match }: any) {
  const history = useHistory();
  const classes = useStyles();
  const { profile } = useProfile();
  const [functionSpec, setFunctionSpec] = React.useState<any>(undefined);
  const { params } = match;
  const { accountId, subscriptionId, boundaryId, functionId } = params;

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (functionSpec === undefined) {
      (async () => {
        let existingFunction: any;
        try {
          existingFunction = await tryGetFunction(
            profile,
            subscriptionId as string,
            boundaryId as string,
            functionId as string
          );
        } catch (e) {
          existingFunction = {
            error: new FusebitError("Error checking if function exists", {
              details:
                (e.status || e.statusCode) === 403
                  ? "You are not authorized to access the function."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && setFunctionSpec(existingFunction);
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [functionSpec, profile, subscriptionId, boundaryId, functionId]);

  const handleClose = () => {
    history.replace("overview");
  };

  const template = functionSpec || {};
  const editor = (functionSpec &&
    functionSpec.metadata &&
    functionSpec.metadata.fusebit &&
    functionSpec.metadata.fusebit.editor) || {
    ensureFunctionExists: true,
    theme: "light"
  };

  function CodeDialog({ children }: any) {
    return (
      <Dialog
        fullScreen
        open={true}
        onClose={handleClose}
        TransitionComponent={
          functionSpec === undefined ? Transition : undefined
        }
      >
        <AppBar className={classes.appBar} color="inherit">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {`${boundaryId} / ${functionId}`}
            </Typography>
            <Button color="primary" onClick={handleClose}>
              Close
            </Button>
          </Toolbar>
        </AppBar>
        <Grid container>
          <Grid item xs={12} className={classes.gridItem}>
            {children}
          </Grid>
        </Grid>
      </Dialog>
    );
  }

  if (functionSpec === undefined) {
    return (
      <CodeDialog>
        <LinearProgress />
      </CodeDialog>
    );
  }

  if (functionSpec === null || !functionSpec.error) {
    return (
      <CodeDialog>
        <div className={classes.container}>
          <FusebitEditor
            version="1"
            boundaryId={boundaryId}
            functionId={functionId}
            account={{
              accountId: accountId,
              subscriptionId: subscriptionId,
              baseUrl: profile.baseUrl,
              accessToken: profile.auth && profile.auth.access_token
            }}
            options={{ template, editor }}
            onLoaded={(editorContext: any) => {}}
            onError={(e: any) => {
              throw e;
            }}
          />
        </div>
      </CodeDialog>
    );
  }

  return (
    <CodeDialog>
      <PortalError error={functionSpec.error} />
    </CodeDialog>
  );
}

export default FunctionCode;
