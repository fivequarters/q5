import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import EmailIcon from "@material-ui/icons/Email";
import FingerprintIcon from "@material-ui/icons/Fingerprint";
import PersonIcon from "@material-ui/icons/Person";
import React from "react";
import { User } from "../lib/FusebitTypes";
import { modifyAgent, useAgent, AgentProvider } from "./AgentProvider";
import InputWithIcon from "./InputWithIcon";

function UserDetails() {
  const [user, setUser] = useAgent();

  const handleFirstNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (user.status === "ready") {
      (user.modified as User).firstName = event.target.value;
      modifyAgent(user, setUser, { ...user.modified });
    }
  };

  const handleLastNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (user.status === "ready") {
      (user.modified as User).lastName = event.target.value;
      modifyAgent(user, setUser, { ...user.modified });
    }
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (user.status === "ready") {
      (user.modified as User).primaryEmail = event.target.value;
      modifyAgent(user, setUser, { ...user.modified });
    }
  };

  if (user.status === "ready" || user.status === "updating") {
    return (
      <form noValidate autoComplete="off">
        {user.agentId !== AgentProvider.NewAgentId && (
          <InputWithIcon icon={<FingerprintIcon />}>
            <TextField
              id="userId"
              label="User ID"
              variant="outlined"
              disabled
              value={user.existing.id}
              fullWidth
            />
          </InputWithIcon>
        )}
        <InputWithIcon icon={<PersonIcon />}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                id="firstName"
                label="First Name"
                variant="outlined"
                value={(user.modified as User).firstName || ""}
                onChange={handleFirstNameChange}
                disabled={user.status !== "ready"}
                fullWidth
                autoFocus
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                id="lastName"
                label="Last Name"
                variant="outlined"
                value={(user.modified as User).lastName || ""}
                disabled={user.status !== "ready"}
                onChange={handleLastNameChange}
                fullWidth
                // autoFocus
              />
            </Grid>
          </Grid>
        </InputWithIcon>
        <InputWithIcon icon={<EmailIcon />}>
          <TextField
            id="primaryEmail"
            label="Email"
            variant="outlined"
            type="email"
            value={(user.modified as User).primaryEmail || ""}
            disabled={user.status !== "ready"}
            onChange={handleEmailChange}
            fullWidth
          />
        </InputWithIcon>
      </form>
    );
  }

  return null;
}

export default UserDetails;
