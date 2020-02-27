import React from "react";
import { getUsers, getClients } from "../lib/Fusebit";
import { User, Client } from "../lib/FusebitTypes";
import { FusebitError } from "./ErrorBoundary";
import { useProfile } from "./ProfileProvider";

type AgentsState =
  | {
      status: "loading";
      isUser: boolean | undefined;
      formatError?: (e: any) => Error;
    }
  | {
      status: "ready";
      isUser: true;
      existing: User[];
    }
  | {
      status: "ready";
      isUser: false | undefined;
      existing: Client[];
    }
  | {
      status: "error";
      isUser: boolean | undefined;
      error: Error;
    };

type AgentsSetState = (state: AgentsState) => void;

type AgentsProviderProps = {
  children: React.ReactNode;
  isUser?: boolean;
};

const AgentsStateContext = React.createContext<AgentsState | undefined>(
  undefined
);

const AgentsSetStateContext = React.createContext<AgentsSetState | undefined>(
  undefined
);

function AgentsProvider({ isUser, children }: AgentsProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<AgentsState>({
    status: "loading",
    isUser
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === "loading") {
      (async () => {
        try {
          let agents = data.isUser
            ? await getUsers(profile)
            : await getClients(profile);
          if (!cancelled) {
            setData({
              status: "ready",
              isUser: data.isUser,
              existing: agents
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(
                  `Error loading ${data.isUser ? "users" : "clients"}`,
                  {
                    details:
                      (e.status || e.statusCode) === 403
                        ? `You are not authorized to access the ${
                            data.isUser ? "user" : "client"
                          } information.`
                        : e.message || "Unknown error."
                  }
                );
            setData({
              status: "error",
              isUser: data.isUser,
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
    isUser: state.isUser
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
