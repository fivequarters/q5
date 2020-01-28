import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import LinearProgress from "@material-ui/core/LinearProgress";
import TextField from "@material-ui/core/TextField";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import React from "react";
import { getInitToken } from "../lib/Fusebit";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";
import { useAgent } from "./AgentProvider";

function AddOAuthImplicitIdentityFlow({ options }: any) {
  const { profile } = useProfile();
  const [agent] = useAgent();
  const [initToken, setInitToken] = React.useState();

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (!initToken) {
      (async () => {
        let data: any;
        const augmentedProfile = {
          ...profile,
          subscription:
            options.subscriptionId && options.subscriptionId !== "*"
              ? options.subscriptionId
              : profile.subscription || undefined,
          boundary: options.boundaryId || profile.boundary || undefined,
          function: options.functionId || profile.function || undefined
        };
        try {
          data = {
            token: await getInitToken(
              augmentedProfile,
              agent.agentId,
              "oauth",
              true
            )
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
  }, [initToken, profile, agent.agentId, options]);

  if (!initToken) {
    return (
      <DialogContent>
        <LinearProgress />
      </DialogContent>
    );
  } else if (initToken.error) {
    return (
      <DialogContent>
        <PortalError error={initToken.error} />
      </DialogContent>
    );
  } else {
    const inviteLink = `${window.location.protocol}//${window.location.host}/join#${initToken.token}`;
    return (
      <DialogContent>
        <DialogContentText>
          Share the following invitation link with the user over a secure
          channel. The one-time initialization token contained in the link is
          valid for eight hours.
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
                  color="inherit"
                >
                  <FileCopyIcon fontSize="inherit" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </DialogContent>
    );
  }
}

export default AddOAuthImplicitIdentityFlow;
