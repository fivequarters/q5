import Button from "@material-ui/core/Button";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import { makeStyles } from "@material-ui/core/styles";
import { getPKIInitToken } from "../lib/Fusebit";
import React from "react";
import { useProfile } from "./ProfileProvider";
import LinearProgress from "@material-ui/core/LinearProgress";
import TextField from "@material-ui/core/TextField";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import FileCopyIcon from "@material-ui/icons/FileCopy";

const useStyles = makeStyles((theme: any) => ({
  generateButtonContainer: {
    width: "100%",
    display: "flex"
  },
  generateButton: {
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4)
  }
}));

function AddPkiIdentityFlow({ options, agentId, isUser }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const [generate, setGenerate] = React.useState(false);
  const [initToken, setInitToken] = React.useState();

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (generate && !initToken) {
      (async () => {
        let data: any;
        try {
          data = {
            token: await getPKIInitToken(profile, agentId, isUser, options)
          };
        } catch (e) {
          data = {
            error: new FusebitError(
              "Error generating CLI initialization command",
              {
                details:
                  (e.status || e.statusCode) === 403
                    ? "You are not authorized to generate CLI initialization commands"
                    : e.message || "Unknown error."
              }
            )
          };
        }
        !cancelled && setInitToken({ ...data });
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [generate, initToken, profile]);

  if (initToken) {
    if (initToken.error) {
      return (
        <DialogContent>
          <PortalError error={initToken.error} />
        </DialogContent>
      );
    }
    const cliInitCommand = `fuse init ${initToken.token}`;
    return (
      <DialogContent>
        <DialogContentText>
          Ask the user to execute the command below to establish their identity
          and gain access to the system through the CLI. The command contains a
          one-time initialization token that will expire in eight hours.
        </DialogContentText>
        <TextField
          margin="dense"
          variant="filled"
          value={cliInitCommand}
          fullWidth
          disabled={true}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => navigator.clipboard.writeText(cliInitCommand)}
                  color="primary"
                >
                  <FileCopyIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </DialogContent>
    );
  }

  if (generate) {
    return (
      <DialogContent>
        <LinearProgress />
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <div className={classes.generateButtonContainer}>
        <Button
          onClick={() => setGenerate(true)}
          color="primary"
          variant="contained"
          className={classes.generateButton}
        >
          Generate CLI initialization command
        </Button>
      </div>
      <DialogContentText>
        The Fusebit CLI initialization command enables the{" "}
        {isUser ? "user" : "client"} to bootstrap access to the system using a
        public/private key pair identity. The command contains a one-time
        initialization token that remains valid for eight hours. Generating a
        new initialization command will invalidate previous initialization
        commands for the {isUser ? "user" : "client"}.
      </DialogContentText>
    </DialogContent>
  );
}

export default AddPkiIdentityFlow;
