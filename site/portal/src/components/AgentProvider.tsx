import React from "react";
import {
  getClient,
  getUser,
  newClient,
  newUser,
  normalizeAgent,
  updateClient,
  updateUser
} from "../lib/Fusebit";
import { Client, User } from "../lib/FusebitTypes";
import { FusebitError } from "./ErrorBoundary";
import { useProfile } from "./ProfileProvider";

type AgentState =
  | {
      status: "loading";
      isUser: boolean;
      agentId: string;
      formatError?: (e: any) => Error;
    }
  | {
      status: "ready" | "updating";
      isUser: boolean;
      agentId: string;
      dirty: boolean;
      existing: Client;
      modified: Client;
      formatError?: (e: any) => Error;
      afterUpdate?: (e?: Error) => void;
    }
  | {
      status: "ready" | "updating";
      isUser: boolean;
      agentId: string;
      dirty: boolean;
      existing: User;
      modified: User;
      formatError?: (e: any) => Error;
      afterUpdate?: (e?: Error) => void;
    }
  | {
      status: "error";
      isUser: boolean;
      agentId: string;
      error: Error;
    };

type AgentSetState = (state: AgentState) => void;

type AgentProviderProps = {
  children: React.ReactNode;
  agentId: string;
  isUser: boolean;
};

const AgentStateContext = React.createContext<AgentState | undefined>(
  undefined
);
const AgentSetStateContext = React.createContext<AgentSetState | undefined>(
  undefined
);

const NewAgentId = "new";

function AgentProvider({ children, agentId, isUser }: AgentProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<AgentState>(
    agentId === NewAgentId
      ? {
          status: "ready",
          isUser,
          agentId,
          dirty: false,
          existing: { id: agentId },
          modified: { id: agentId }
        }
      : {
          status: "loading",
          isUser,
          agentId
        }
  );

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === "loading" || data.status === "updating") {
      (async () => {
        let afterUpdate =
          (data.status === "updating" && data.afterUpdate) || undefined;
        try {
          let agent: Client | User;
          if (data.status === "loading") {
            agent = isUser
              ? await getUser(profile, agentId)
              : await getClient(profile, agentId);
          } else if (data.agentId === NewAgentId) {
            agent = isUser
              ? await newUser(profile, normalizeAgent(data.modified))
              : await newClient(profile, normalizeAgent(data.modified));
          } else {
            agent = isUser
              ? await updateUser(profile, normalizeAgent(data.modified))
              : await updateClient(profile, normalizeAgent(data.modified));
          }
          if (!cancelled) {
            setData({
              status: "ready",
              isUser,
              agentId: agent.id,
              dirty: false,
              existing: agent,
              modified: JSON.parse(JSON.stringify(agent))
            });
          } else {
            afterUpdate = undefined;
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(
                  `Error ${data.status} ${isUser ? "user" : "client"} ${
                    data.agentId
                  }`,
                  {
                    details:
                      (e.status || e.statusCode) === 403
                        ? `You are not authorized to access the ${
                            isUser ? "user" : "client"
                          } information.`
                        : e.message || "Unknown error."
                  }
                );
            setData({
              status: "error",
              isUser,
              agentId: data.agentId,
              error
            });
            afterUpdate && afterUpdate(error);
            return;
          }
        }
        afterUpdate && afterUpdate();
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, profile, agentId, isUser]);

  return (
    <AgentStateContext.Provider value={data}>
      <AgentSetStateContext.Provider value={setData}>
        {children}
      </AgentSetStateContext.Provider>
    </AgentStateContext.Provider>
  );
}

AgentProvider.NewAgentId = NewAgentId;

function useAgentState() {
  const context = React.useContext(AgentStateContext);
  if (context === undefined) {
    throw new Error("useAgentState must be used within a AgentProvider");
  }
  return context;
}

function useAgentSetState() {
  const context = React.useContext(AgentSetStateContext);
  if (context === undefined) {
    throw new Error("useAgentSetState must be used within a AgentProvider");
  }
  return context;
}

function useAgent(): [AgentState, AgentSetState] {
  return [useAgentState(), useAgentSetState()];
}

function reloadAgent(state: AgentState, setState: AgentSetState) {
  setState({
    status: "loading",
    agentId: state.agentId,
    isUser: state.isUser
  });
}

function modifyAgent(
  state: AgentState,
  setState: AgentSetState,
  newAgent: Client | User
) {
  if (state.status !== "ready") {
    throw new Error(
      `The modifyAgent can only be called when the agent status is 'ready'. Current agent status is '${state.status}'.`
    );
  }

  setState({
    ...state,
    dirty:
      JSON.stringify(normalizeAgent(state.existing)) !==
      JSON.stringify(normalizeAgent(newAgent)),
    modified: newAgent
  });
}

function saveAgent(
  state: AgentState,
  setState: AgentSetState,
  formatError?: (e: any) => Error,
  afterUpdate?: (e?: Error) => void
) {
  if (state.status !== "ready") {
    throw new Error(
      `The saveAgent can only be called when the agent status is 'ready'. Current agent status is '${state.status}'.`
    );
  }

  setState({ ...state, formatError, afterUpdate, status: "updating" });
}

function formatAgent(agent: AgentState) {
  if (agent.status === "updating" || agent.status === "ready") {
    let name = [];
    if ((agent.modified as User).firstName)
      name.push((agent.modified as User).firstName);
    if ((agent.modified as User).lastName)
      name.push((agent.modified as User).lastName);
    if ((agent.modified as Client).displayName)
      name.push((agent.modified as Client).displayName);
    if (name.length > 0) {
      return name.join(" ");
    }
  }
  return agent.agentId === NewAgentId ? undefined : agent.agentId;
}

export {
  AgentProvider,
  useAgent,
  modifyAgent,
  saveAgent,
  reloadAgent,
  formatAgent
};
