import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import FingerprintIcon from "@material-ui/icons/Fingerprint";
import LabelIcon from "@material-ui/icons/Label";
import React from "react";
import { Client } from "../lib/FusebitTypes";
import { AgentProvider, modifyAgent, useAgent } from "./AgentProvider";
import InputWithIcon from "./InputWithIcon";

function ClientDetails() {
  const [client, setClient] = useAgent();

  const handleDisplayNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (client.status === "ready") {
      (client.modified as Client).displayName = event.target.value;
      modifyAgent(client, setClient, { ...client.modified });
    }
  };

  if (client.status === "ready" || client.status === "updating") {
    return (
      <form noValidate autoComplete="off">
        {client.agentId !== AgentProvider.NewAgentId && (
          <InputWithIcon icon={<FingerprintIcon />}>
            <TextField
              id="clientId"
              label="Client ID"
              variant="outlined"
              disabled
              value={client.existing.id}
              fullWidth
            />
          </InputWithIcon>
        )}
        <InputWithIcon icon={<LabelIcon />}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                id="displayName"
                label="Display Name"
                variant="outlined"
                value={(client.modified as Client).displayName || ""}
                onChange={handleDisplayNameChange}
                disabled={client.status !== "ready"}
                fullWidth
                autoFocus
              />
            </Grid>
          </Grid>
        </InputWithIcon>
      </form>
    );
  }

  return null;
}

export default ClientDetails;
