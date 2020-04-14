import React from "react";
import { getAudit } from "../lib/Fusebit";
import { AuditTrail, AuditFilter } from "../lib/FusebitTypes";
import { FusebitError } from "./ErrorBoundary";
import { useProfile } from "./ProfileProvider";

export type AuditState =
  | {
      status: "loading";
      filter: AuditFilter;
      formatError?: (e: any) => Error;
    }
  | {
      status: "ready" | "updating";
      filter: AuditFilter;
      data: AuditTrail;
      formatError?: (e: any) => Error;
    }
  | {
      status: "error";
      filter: AuditFilter;
      error: Error;
    };

type AuditSetState = (state: AuditState) => void;

type AuditProviderProps = {
  children: React.ReactNode;
  filter: AuditFilter;
};

const AuditStateContext = React.createContext<AuditState | undefined>(
  undefined
);
const AuditSetStateContext = React.createContext<AuditSetState | undefined>(
  undefined
);

function AuditProvider({ children, filter }: AuditProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<AuditState>({
    status: "loading",
    filter,
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === "loading" || data.status === "updating") {
      (async () => {
        try {
          const audit = await getAudit(profile, data.filter);
          if (!cancelled) {
            setData({
              status: "ready",
              filter: data.filter,
              data: audit,
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(`Error loading audit data`, {
                  details:
                    (e.status || e.statusCode) === 403
                      ? `You are not authorized to access the audit information.`
                      : e.message || "Unknown error.",
                });
            setData({
              status: "error",
              filter: data.filter,
              error,
            });
            return;
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data, profile]);

  return (
    <AuditStateContext.Provider value={data}>
      <AuditSetStateContext.Provider value={setData}>
        {children}
      </AuditSetStateContext.Provider>
    </AuditStateContext.Provider>
  );
}

function useAuditState() {
  const context = React.useContext(AuditStateContext);
  if (context === undefined) {
    throw new Error("useAuditState must be used within a AuditProvider");
  }
  return context;
}

function useAuditSetState() {
  const context = React.useContext(AuditSetStateContext);
  if (context === undefined) {
    throw new Error("useAuditSetState must be used within a AuditProvider");
  }
  return context;
}

function useAudit(): [AuditState, AuditSetState] {
  return [useAuditState(), useAuditSetState()];
}

function reloadAudit(state: AuditState, setState: AuditSetState) {
  setState({
    ...state,
    status: "loading",
  });
}

function updateAuditFilter(
  state: AuditState,
  setState: AuditSetState,
  newFilter: AuditFilter
) {
  if (state.status !== "ready") {
    throw new Error(
      `The updateAuditFilter can only be called when the audit status is 'ready'. Current audit status is '${state.status}'.`
    );
  }

  setState({
    ...state,
    filter: newFilter,
    status: "updating",
  });
}

export { AuditProvider, useAudit, updateAuditFilter, reloadAudit };
