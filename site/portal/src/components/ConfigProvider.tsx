import React from 'react';
import { getFusebitConfig, IFusebitTenant } from '../lib/Settings';
import { FusebitError } from './ErrorBoundary';

type ConfigState =
  | {
      status: 'loading';
    }
  | {
      status: 'ready';
      existing: IFusebitTenant;
    }
  | {
      status: 'error';
      error: Error;
    };

type ConfigProviderProps = {
  children: React.ReactNode;
};

const ConfigStateContext = React.createContext<IFusebitTenant | undefined>(undefined);

function ConfigProvider({ children }: ConfigProviderProps) {
  const [configState, setConfigState] = React.useState<ConfigState>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (configState.status === 'loading') {
      (async () => {
        try {
          let config = await getFusebitConfig();
          if (!cancelled) {
            setConfigState({
              status: 'ready',
              existing: config,
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = new FusebitError(`Error loading Fusebit Portal configuration`, {
              details: e.message || 'Unknown error.',
            });
            setConfigState({
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
  }, [configState]);

  if (configState.status === 'error') {
    throw configState.error;
  }
  if (configState.status === 'loading') {
    return null;
  }
  return <ConfigStateContext.Provider value={configState.existing}>{children}</ConfigStateContext.Provider>;
}

function useConfigState() {
  const context = React.useContext(ConfigStateContext);
  if (context === undefined) {
    throw new Error('useConfigState must be used within a ConfigProvider');
  }
  return context;
}

function useConfig(): [IFusebitTenant] {
  return [useConfigState()];
}

export { ConfigProvider, useConfig };
