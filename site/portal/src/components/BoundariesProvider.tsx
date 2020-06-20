import React from 'react';
import { getFunctions } from '../lib/Fusebit';
import { BoundaryHash } from '../lib/FusebitTypes';
import { FusebitError } from './ErrorBoundary';
import { useProfile } from './ProfileProvider';

type BoundariesState =
  | {
      status: 'loading';
      subscriptionId?: string;
      formatError?: (e: any) => Error;
    }
  | {
      status: 'ready';
      subscriptionId?: string;
      existing: BoundaryHash;
      formatError?: (e: any) => Error;
    }
  | {
      status: 'error';
      subscriptionId?: string;
      error: Error;
      formatError?: (e: any) => Error;
    };

type BoundariesSetState = (state: BoundariesState) => void;

type BoundariesProviderProps = {
  children: React.ReactNode;
  subscriptionId?: string;
};

const BoundariesStateContext = React.createContext<BoundariesState | undefined>(undefined);

const BoundariesSetStateContext = React.createContext<BoundariesSetState | undefined>(undefined);

function BoundariesProvider({ subscriptionId, children }: BoundariesProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<BoundariesState>({
    status: 'loading',
    subscriptionId,
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === 'loading' || data.subscriptionId !== subscriptionId) {
      if (subscriptionId) {
        (async () => {
          try {
            let boundaries = await getFunctions(profile, subscriptionId);
            if (!cancelled) {
              setData({
                status: 'ready',
                subscriptionId,
                existing: boundaries,
              });
            }
          } catch (e) {
            if (!cancelled) {
              const error = data.formatError
                ? data.formatError(e)
                : new FusebitError(`Error loading functions`, {
                    details:
                      (e.status || e.statusCode) === 403
                        ? `You are not authorized to access the function information.`
                        : e.message || 'Unknown error.',
                  });
              setData({
                status: 'error',
                subscriptionId,
                error,
              });
            }
          }
        })();
        return () => {
          cancelled = true;
        };
      }
      setData({
        status: 'ready',
        subscriptionId,
        existing: {},
      });
    }
  }, [data, profile, subscriptionId]);

  return (
    <BoundariesStateContext.Provider value={data}>
      <BoundariesSetStateContext.Provider value={setData}>{children}</BoundariesSetStateContext.Provider>
    </BoundariesStateContext.Provider>
  );
}

function useBoundariesState() {
  const context = React.useContext(BoundariesStateContext);
  if (context === undefined) {
    throw new Error('useBoundariesState must be used within a BoundariesProvider');
  }
  return context;
}

function useBoundariesSetState() {
  const context = React.useContext(BoundariesSetStateContext);
  if (context === undefined) {
    throw new Error('useBoundariesSetState must be used within a BoundariesProvider');
  }
  return context;
}

function useBoundaries(): [BoundariesState, BoundariesSetState] {
  return [useBoundariesState(), useBoundariesSetState()];
}

function reloadBoundaries(state: BoundariesState, setState: BoundariesSetState) {
  setState({
    status: 'loading',
  });
}

export { BoundariesProvider, useBoundaries, reloadBoundaries };
