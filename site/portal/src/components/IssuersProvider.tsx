import React from 'react';
import { getIssuers } from '../lib/Fusebit';
import { Issuer } from '../lib/FusebitTypes';
import { FusebitError } from './ErrorBoundary';
import { useProfile } from './ProfileProvider';

type IssuersState =
  | {
      status: 'loading';
      formatError?: (e: any) => Error;
    }
  | {
      status: 'ready';
      existing: Issuer[];
    }
  | {
      status: 'error';
      error: Error;
    };

type IssuersSetState = (state: IssuersState) => void;

type IssuersProviderProps = {
  children: React.ReactNode;
};

const IssuersStateContext = React.createContext<IssuersState | undefined>(undefined);

const IssuersSetStateContext = React.createContext<IssuersSetState | undefined>(undefined);

function IssuersProvider({ children }: IssuersProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<IssuersState>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === 'loading') {
      (async () => {
        try {
          let issuers = await getIssuers(profile);
          if (!cancelled) {
            setData({
              status: 'ready',
              existing: issuers,
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(`Error loading issuers`, {
                  details:
                    (e.status || e.statusCode) === 403
                      ? `You are not authorized to access the issuer information`
                      : e.message || 'Unknown error.',
                });
            setData({
              status: 'error',
              error,
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
    <IssuersStateContext.Provider value={data}>
      <IssuersSetStateContext.Provider value={setData}>{children}</IssuersSetStateContext.Provider>
    </IssuersStateContext.Provider>
  );
}

function useIssuersState() {
  const context = React.useContext(IssuersStateContext);
  if (context === undefined) {
    throw new Error('useIssuersState must be used within a IssuersProvider');
  }
  return context;
}

function useIssuersSetState() {
  const context = React.useContext(IssuersSetStateContext);
  if (context === undefined) {
    throw new Error('useIssuersSetState must be used within a IssuersProvider');
  }
  return context;
}

function useIssuers(): [IssuersState, IssuersSetState] {
  return [useIssuersState(), useIssuersSetState()];
}

function reloadIssuers(state: IssuersState, setState: IssuersSetState) {
  setState({
    status: 'loading',
  });
}

function removeIssuers(state: IssuersState, setState: IssuersSetState, issuerIds: string[]) {
  if (state.status !== 'ready') {
    throw new Error(
      `The removeIssuers can only be called when the issuers status is 'ready'. Current issuers status is '${state.status}'.`
    );
  }

  let newIssuers: Issuer[] = [];
  state.existing.forEach((a: Issuer) => {
    if (issuerIds.indexOf(a.id) === -1) {
      newIssuers.push(a);
    }
  });

  setState({
    ...state,
    existing: newIssuers,
  });
}

export { IssuersProvider, useIssuers, reloadIssuers, removeIssuers };
