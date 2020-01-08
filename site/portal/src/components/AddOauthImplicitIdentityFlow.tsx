import Button from "@material-ui/core/Button";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import { makeStyles } from "@material-ui/core/styles";
import { getInitToken } from "../lib/Fusebit";
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

function AddOAuthImplicitIdentityFlow({ agentId }: any) {
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
            token: await getInitToken(profile, agentId, "oauth", true)
          };
        } catch (e) {
          data = {
            error: new FusebitError("Error generating invitation link", {
              details:
                (e.status || e.statusCode) === 403
                  ? "You are not authorized to generate invitation links to the portal"
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && setInitToken({ ...data });
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [generate, initToken, profile, agentId]);

  if (initToken) {
    if (initToken.error) {
      return (
        <DialogContent>
          <PortalError error={initToken.error} />
        </DialogContent>
      );
    }
    const inviteLink = `${window.location.protocol}//${window.location.host}/join#${initToken.token}`;
    return (
      <DialogContent>
        <DialogContentText>
          Ask the user to navigate to the invitation link below to gain access
          to the system. The invitation link will expire in eight hours.
        </DialogContentText>
        <TextField
          margin="dense"
          variant="filled"
          value={inviteLink}
          fullWidth
          disabled={true}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
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
          Generate invitation link
        </Button>
      </div>
      <DialogContentText>
        The Fusebit invitation link enables the user to bootstrap access to the
        system by authenticating themselves through the OAuth identity provider
        configured for the portal. The invitation link contains a one-time
        initialization token that remains valid for eight hours. Generating a
        new invitation link will invalidate previously generated invitation
        links.
      </DialogContentText>
    </DialogContent>
  );
}

export default AddOAuthImplicitIdentityFlow;
