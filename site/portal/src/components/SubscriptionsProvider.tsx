import React from 'react';
import { getSubscriptions } from '../lib/Fusebit';
import { Subscriptions, Subscription } from '../lib/FusebitTypes';
import { FusebitError } from './ErrorBoundary';
import { useProfile } from './ProfileProvider';

type SubscriptionsState =
  | {
      status: 'loading';
      formatError?: (e: any) => Error;
    }
  | {
      status: 'ready';
      existing: Subscriptions;
    }
  | {
      status: 'error';
      error: Error;
    };

type SubscriptionsSetState = (state: SubscriptionsState) => void;

type SubscriptionsProviderProps = {
  children: React.ReactNode;
};

const SubscriptionsStateContext = React.createContext<SubscriptionsState | undefined>(undefined);

const SubscriptionsSetStateContext = React.createContext<SubscriptionsSetState | undefined>(undefined);

function SubscriptionsProvider({ children }: SubscriptionsProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<SubscriptionsState>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === 'loading') {
      (async () => {
        try {
          let subscriptions: Subscriptions = {
            list: await getSubscriptions(profile),
            hash: {},
          };
          if (!cancelled) {
            subscriptions.hash = subscriptions.list.reduce<{
              [key: string]: Subscription;
            }>((current, value) => {
              current[value.id] = value;
              return current;
            }, {});
            setData({
              status: 'ready',
              existing: subscriptions,
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(`Error loading subscriptions`, {
                  details:
                    (e.status || e.statusCode) === 403
                      ? `You are not authorized to access the subscription information.`
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
    <SubscriptionsStateContext.Provider value={data}>
      <SubscriptionsSetStateContext.Provider value={setData}>{children}</SubscriptionsSetStateContext.Provider>
    </SubscriptionsStateContext.Provider>
  );
}

function useSubscriptionsState() {
  const context = React.useContext(SubscriptionsStateContext);
  if (context === undefined) {
    throw new Error('useSubscriptionsState must be used within a SubscriptionsProvider');
  }
  return context;
}

function useSubscriptionsSetState() {
  const context = React.useContext(SubscriptionsSetStateContext);
  if (context === undefined) {
    throw new Error('useSubscriptionsSetState must be used within a SubscriptionsProvider');
  }
  return context;
}

function useSubscriptions(): [SubscriptionsState, SubscriptionsSetState] {
  return [useSubscriptionsState(), useSubscriptionsSetState()];
}

function reloadSubscriptions(state: SubscriptionsState, setState: SubscriptionsSetState) {
  setState({
    status: 'loading',
  });
}

export { SubscriptionsProvider, useSubscriptions, reloadSubscriptions };
