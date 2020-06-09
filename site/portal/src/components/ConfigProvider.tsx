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
  const [data, setData] = React.useState<ConfigState>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === 'loading') {
      (async () => {
        try {
          let config = await getFusebitConfig();
          if (!cancelled) {
            setData({
              status: 'ready',
              existing: config,
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = new FusebitError(`Error loading Fusebit Portal configuration`, {
              details: e.message || 'Unknown error.',
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
  }, [data]);

  if (data.status === 'error') {
    throw data.error;
  }
  if (data.status === 'loading') {
    return null;
  }
  return <ConfigStateContext.Provider value={data.existing}>{children}</ConfigStateContext.Provider>;
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

function useConfigMaybe(): [IFusebitTenant | undefined] {
  return [React.useContext(ConfigStateContext)];
}

export { ConfigProvider, useConfig, useConfigMaybe };
