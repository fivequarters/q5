import LinearProgress from "@material-ui/core/LinearProgress";
import Link from "@material-ui/core/Link";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { getAgent } from "../lib/Fusebit";
import { AgentState, formatAgent } from "./AgentProvider";
import { useProfile } from "./ProfileProvider";

export type IssuerSubjectAgent = {
  [key: string]: {
    [key: string]: AgentState;
  };
};

type AgentTooltipProps = {
  issuerId: string;
  subject: string;
  agents: IssuerSubjectAgent;
  onSetAgent: (issuerId: string, subject: string, agent: AgentState) => void;
  children: any;
};

function AgentTooltip({
  issuerId,
  subject,
  agents,
  onSetAgent,
  children,
}: AgentTooltipProps) {
  const { profile } = useProfile();
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (loading) {
      (async () => {
        try {
          const [agent, isUser] = await getAgent(profile, issuerId, subject);
          if (!cancelled) {
            setLoading(false);
            onSetAgent(issuerId, subject, {
              status: "ready",
              isUser,
              agentId: agent.id,
              existing: agent,
              modified: agent,
              dirty: false,
            });
          }
        } catch (e) {
          if (!cancelled) {
            const status = e.status || e.statusCode;
            const message =
              status === 404
                ? "No existing user or client are associated with this identity."
                : `Error finding matching user or client: ${e.message}`;
            setLoading(false);
            onSetAgent(issuerId, subject, {
              status: "error",
              isUser: true,
              agentId: `${issuerId}::${subject}`,
              error: new Error(message),
            });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [loading, profile, issuerId, subject, onSetAgent]);

  if (!agents[issuerId] || !agents[issuerId][subject]) {
    return (
      <Tooltip
        open={open || loading}
        onOpen={() => {
          setLoading(true);
          setOpen(true);
        }}
        onClose={() => setOpen(false)}
        title={
          <React.Fragment>
            <Typography variant="body2">Resolving identity...</Typography>
            <LinearProgress />
          </React.Fragment>
        }
        placement="top"
        interactive
      >
        {children}
      </Tooltip>
    );
  }

  const agent = agents[issuerId][subject];

  if (agent.status === "error") {
    return (
      <Tooltip
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        title={<Typography variant="body2">{agent.error.message}</Typography>}
        placement="top"
        interactive
      >
        {children}
      </Tooltip>
    );
  }

  if (agent.status === "ready") {
    return (
      <Tooltip
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        title={
          <Link
            color="inherit"
            component={RouterLink}
            to={`/accounts/${profile.account}/${
              agent.isUser ? "users" : "clients"
            }/${agent.agentId}/properties`}
          >
            <Typography variant="body2" color="inherit">
              {agent.isUser ? "User" : "Client"}: {formatAgent(agent)}
            </Typography>
          </Link>
        }
        placement="top"
        interactive
      >
        {children}
      </Tooltip>
    );
  }

  return null; // never reached
}

export default AgentTooltip;
