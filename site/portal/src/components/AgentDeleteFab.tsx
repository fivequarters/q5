import DialogContentText from "@material-ui/core/DialogContentText";
import Fab from "@material-ui/core/Fab";
import Typography from "@material-ui/core/Typography";
import DeleteIcon from "@material-ui/icons/Delete";
import React from "react";
import { useHistory } from "react-router-dom";
import { deleteUsers, deleteClients } from "../lib/Fusebit";
import { useAgent } from "./AgentProvider";
import ConfirmationDialog from "./ConfirmationDialog";
import { FusebitError } from "./ErrorBoundary";
import { useProfile } from "./ProfileProvider";

function AgentDeleteFab({ data, onNewData }: any) {
  const history = useHistory();
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const [agent] = useAgent();
  const property = agent.isUser ? "users" : "clients";
  const noun = agent.isUser ? "user" : "client";
  const { profile } = useProfile();

  const handleDeleteDialogClose = async (confirmed: boolean) => {
    setConfirmationOpen(false);
    if (confirmed) {
      let newAgents: any = undefined;
      try {
        agent.isUser
          ? await deleteUsers(profile, [agent.agentId])
          : await deleteClients(profile, [agent.agentId]);
        if (data[property] && data[property].viewData) {
          newAgents = { viewData: [] };
          data[property].viewData.forEach((row: any) => {
            if (row.id !== agent.agentId) {
              newAgents.viewData.push(row);
            }
          });
        }
      } catch (e) {
        newAgents = {
          error: new FusebitError(`Error deleting ${noun}`, {
            details:
              (e.status || e.statusCode) === 403
                ? `You are not authorized to delete ${noun}s in this account.`
                : e.message || "Unknown error.",
            actions: [
              {
                text: `Back to ${noun}s`,
                func: () =>
                  onNewData &&
                  onNewData(
                    agent.isUser
                      ? { ...data, users: undefined }
                      : { ...data, clients: undefined }
                  )
              }
            ]
          })
        };
      }
      if (agent.isUser) {
        onNewData && onNewData({ ...data, users: newAgents });
        history.push("../../users");
      } else {
        onNewData && onNewData({ ...data, clients: newAgents });
        history.push("../../clients");
      }
    }
  };

  return (
    <React.Fragment>
      <Fab color="default" onClick={() => setConfirmationOpen(true)}>
        <DeleteIcon />
      </Fab>
      {confirmationOpen && (
        <ConfirmationDialog
          open={true}
          title={`Delete ${noun}?`}
          content={
            <div>
              <DialogContentText>
                Deleting a {noun} cannot be undone.
              </DialogContentText>
              {profile.me && profile.me.id === agent.agentId && (
                <React.Fragment>
                  <Typography color="primary">WARNING</Typography>
                  <DialogContentText>
                    The user you are about to delete is you. If you continue,
                    you will loose access to the system.
                  </DialogContentText>
                </React.Fragment>
              )}
            </div>
          }
          onDone={handleDeleteDialogClose}
          confirmText="Delete"
        />
      )}
    </React.Fragment>
  );
}

export default AgentDeleteFab;
