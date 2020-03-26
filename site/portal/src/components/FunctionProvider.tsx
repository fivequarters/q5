import React from "react";
import { getFunction, createFunction } from "../lib/Fusebit";
import { ExistingFunctionSpecification } from "../lib/FusebitTypes";
import { FusebitError } from "./ErrorBoundary";
import { useProfile } from "./ProfileProvider";

type FunctionState =
  | {
      status: "loading";
      subscriptionId: string;
      boundaryId: string;
      functionId: string;
      formatError?: (e: any) => Error;
    }
  | {
      status: "ready" | "updating";
      subscriptionId: string;
      boundaryId: string;
      functionId: string;
      // dirty: boolean;
      existing: ExistingFunctionSpecification;
      modified: ExistingFunctionSpecification;
      formatError?: (e: any) => Error;
      afterUpdate?: (e?: Error) => void;
    }
  | {
      status: "error";
      subscriptionId: string;
      boundaryId: string;
      functionId: string;
      error: Error;
    };

type FunctionSetState = (state: FunctionState) => void;

type FunctionProviderProps = {
  children: React.ReactNode;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
};

const FunctionStateContext = React.createContext<FunctionState | undefined>(
  undefined
);
const FunctionSetStateContext = React.createContext<
  FunctionSetState | undefined
>(undefined);

function FunctionProvider({
  children,
  subscriptionId,
  boundaryId,
  functionId
}: FunctionProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<FunctionState>({
    status: "loading",
    subscriptionId,
    boundaryId,
    functionId
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === "loading" || data.status === "updating") {
      (async () => {
        let afterUpdate =
          (data.status === "updating" && data.afterUpdate) || undefined;
        try {
          let func: ExistingFunctionSpecification;
          if (data.status === "loading") {
            func = await getFunction(
              profile,
              subscriptionId,
              boundaryId,
              functionId
            );
          } else {
            func = {
              ...data.modified,
              subscriptionId,
              boundaryId,
              id: functionId
            };
            await createFunction(
              profile,
              subscriptionId,
              boundaryId,
              functionId,
              func
            );
          }
          if (!cancelled) {
            setData({
              status: "ready",
              subscriptionId,
              boundaryId,
              functionId,
              existing: func,
              modified: JSON.parse(JSON.stringify(func))
            });
          } else {
            afterUpdate = undefined;
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(
                  `Error ${data.status} function '${functionId}' in boundary '${boundaryId}' from subscription '${subscriptionId}'`,
                  {
                    details:
                      (e.status || e.statusCode) === 403
                        ? `You are not authorized to access the function information.`
                        : e.message || "Unknown error."
                  }
                );
            setData({
              status: "error",
              subscriptionId,
              boundaryId,
              functionId,
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
  }, [data, profile, subscriptionId, boundaryId, functionId]);

  return (
    <FunctionStateContext.Provider value={data}>
      <FunctionSetStateContext.Provider value={setData}>
        {children}
      </FunctionSetStateContext.Provider>
    </FunctionStateContext.Provider>
  );
}

function useFunctionState() {
  const context = React.useContext(FunctionStateContext);
  if (context === undefined) {
    throw new Error("useFunctionState must be used within a FunctionProvider");
  }
  return context;
}

function useFunctionSetState() {
  const context = React.useContext(FunctionSetStateContext);
  if (context === undefined) {
    throw new Error(
      "useFunctionSetState must be used within a FunctionProvider"
    );
  }
  return context;
}

function useFunction(): [FunctionState, FunctionSetState] {
  return [useFunctionState(), useFunctionSetState()];
}

function reloadFunction(state: FunctionState, setState: FunctionSetState) {
  setState({
    status: "loading",
    subscriptionId: state.subscriptionId,
    boundaryId: state.boundaryId,
    functionId: state.functionId
  });
}

function modifyFunction(
  state: FunctionState,
  setState: FunctionSetState,
  newFunction: ExistingFunctionSpecification
) {
  if (state.status !== "ready") {
    throw new Error(
      `The modifyFunction can only be called when the issuer status is 'ready'. Current fucntion status is '${state.status}'.`
    );
  }

  setState({
    ...state,
    modified: newFunction
  });
}

function saveFunction(
  state: FunctionState,
  setState: FunctionSetState,
  formatError?: (e: any) => Error,
  afterUpdate?: (e?: Error) => void
) {
  if (state.status !== "ready") {
    throw new Error(
      `The saveFunction can only be called when the function status is 'ready'. Current function status is '${state.status}'.`
    );
  }

  setState({ ...state, formatError, afterUpdate, status: "updating" });
}

export {
  FunctionProvider,
  useFunction,
  modifyFunction,
  saveFunction,
  reloadFunction
};
