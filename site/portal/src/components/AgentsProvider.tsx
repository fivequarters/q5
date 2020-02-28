import React from "react";
import { getUsers, getClients } from "../lib/Fusebit";
import { User, Client } from "../lib/FusebitTypes";
import { FusebitError } from "./ErrorBoundary";
import { useProfile } from "./ProfileProvider";

type AgentsState =
  | {
      status: "loading";
      agentType: "client" | "user" | "both";
      formatError?: (e: any) => Error;
    }
  | {
      status: "ready";
      agentType: "user";
      existing: User[];
    }
  | {
      status: "ready";
      agentType: "client";
      existing: Client[];
    }
  | {
      status: "ready";
      agentType: "both";
      existing: (User | Client)[];
    }
  | {
      status: "error";
      agentType: "client" | "user" | "both";
      error: Error;
    };

type AgentsSetState = (state: AgentsState) => void;

type AgentsProviderProps = {
  children: React.ReactNode;
  agentType: "client" | "user" | "both";
};

const AgentsStateContext = React.createContext<AgentsState | undefined>(
  undefined
);

const AgentsSetStateContext = React.createContext<AgentsSetState | undefined>(
  undefined
);

function AgentsProvider({ agentType, children }: AgentsProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<AgentsState>({
    status: "loading",
    agentType
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === "loading") {
      (async () => {
        try {
          let agents: any[] = [];
          if (data.agentType === "user" || data.agentType === "both") {
            agents.push.apply(agents, await getUsers(profile));
          }
          if (
            !cancelled &&
            (data.agentType === "client" || data.agentType === "both")
          ) {
            agents.push.apply(agents, await getClients(profile));
          }
          if (!cancelled) {
            setData({
              status: "ready",
              agentType: data.agentType,
              existing: agents
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(
                  `Error loading ${
                    data.agentType === "both" ? "agents" : data.agentType + "s"
                  }`,
                  {
                    details:
                      (e.status || e.statusCode) === 403
                        ? `You are not authorized to access the agent information.`
                        : e.message || "Unknown error."
                  }
                );
            setData({
              status: "error",
              agentType: data.agentType,
              error
            });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, profile]);

  return (
    <AgentsStateContext.Provider value={data}>
      <AgentsSetStateContext.Provider value={setData}>
        {children}
      </AgentsSetStateContext.Provider>
    </AgentsStateContext.Provider>
  );
}

function useAgentsState() {
  const context = React.useContext(AgentsStateContext);
  if (context === undefined) {
    throw new Error("useAgentsState must be used within a AgentsProvider");
  }
  return context;
}

function useAgentsSetState() {
  const context = React.useContext(AgentsSetStateContext);
  if (context === undefined) {
    throw new Error("useAgentsSetState must be used within a AgentsProvider");
  }
  return context;
}

function useAgents(): [AgentsState, AgentsSetState] {
  return [useAgentsState(), useAgentsSetState()];
}

function reloadAgents(state: AgentsState, setState: AgentsSetState) {
  setState({
    status: "loading",
    agentType: state.agentType
  });
}

function removeAgents(
  state: AgentsState,
  setState: AgentsSetState,
  agentIds: string[]
) {
  if (state.status !== "ready") {
    throw new Error(
      `The removeAgent can only be called when the agents status is 'ready'. Current agent status is '${state.status}'.`
    );
  }

  let newAgents: User[] | Client[] = [];
  state.existing.forEach((a: User | Client) => {
    if (agentIds.indexOf(a.id) === -1) {
      newAgents.push(a);
    }
  });

  setState({
    ...state,
    existing: newAgents
  });
}

export { AgentsProvider, useAgents, reloadAgents, removeAgents };
