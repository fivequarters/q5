import React from 'react';
import { FusebitError } from './ErrorBoundary';
import Superagent from 'superagent';
import { Catalog, parseCatalog } from '../lib/CatalogTypes';
import { useProfile } from './ProfileProvider';
import { userAgent } from '../lib/Fusebit';

type CatalogProvider =
  | {
      status: 'loading';
      formatError?: (e: any) => Error;
    }
  | {
      status: 'ready';
      existing: Catalog;
    }
  | {
      status: 'error';
      error: Error;
    };

type CatalogSetState = (state: CatalogProvider) => void;

type CatalogProviderProps = {
  children: React.ReactNode;
};

const CatalogStateContext = React.createContext<CatalogProvider | undefined>(undefined);

const CatalogSetStateContext = React.createContext<CatalogSetState | undefined>(undefined);

function CatalogProvider({ children }: CatalogProviderProps) {
  const { profile } = useProfile();
  const catalogPath = profile.catalog || '/catalog.json';

  const [data, setData] = React.useState<CatalogProvider>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === 'loading') {
      (async () => {
        try {
          let catalog;
          if (typeof catalogPath === 'object') {
            catalog = catalogPath;
          } else {
            const response = await Superagent.get(catalogPath).set('x-user-agent', userAgent);
            catalog = parseCatalog(response.body);
          }

          if (!cancelled) {
            setData({
              status: 'ready',
              existing: catalog,
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(`Error loading function template catalog`, {
                  details: e.message,
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
  }, [data, catalogPath]);

  return (
    <CatalogStateContext.Provider value={data}>
      <CatalogSetStateContext.Provider value={setData}>{children}</CatalogSetStateContext.Provider>
    </CatalogStateContext.Provider>
  );
}

function useCatalogState() {
  const context = React.useContext(CatalogStateContext);
  if (context === undefined) {
    throw new Error('useCatalogState must be used within a CatalogProvider');
  }
  return context;
}

function useCatalogSetState() {
  const context = React.useContext(CatalogSetStateContext);
  if (context === undefined) {
    throw new Error('useCatalogSetState must be used within a CatalogProvider');
  }
  return context;
}

function useCatalog(): [CatalogProvider, CatalogSetState] {
  return [useCatalogState(), useCatalogSetState()];
}

export { CatalogProvider, useCatalog };
