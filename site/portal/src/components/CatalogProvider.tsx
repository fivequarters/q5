import React from "react";
import { FusebitError } from "./ErrorBoundary";
import Superagent from "superagent";
import { Catalog, parseCatalog } from "../lib/CatalogTypes";

type CatalogProvider =
  | {
      status: "loading";
      formatError?: (e: any) => Error;
    }
  | {
      status: "ready";
      existing: Catalog;
    }
  | {
      status: "error";
      error: Error;
    };

type CatalogSetState = (state: CatalogProvider) => void;

type CatalogProviderProps = {
  children: React.ReactNode;
};

const CatalogStateContext = React.createContext<CatalogProvider | undefined>(
  undefined
);

const CatalogSetStateContext = React.createContext<CatalogSetState | undefined>(
  undefined
);

function CatalogProvider({ children }: CatalogProviderProps) {
  const [data, setData] = React.useState<CatalogProvider>({
    status: "loading"
  });

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === "loading") {
      (async () => {
        try {
          const response = await Superagent.get(`/catalog.json`);
          const catalog = parseCatalog(response.body);
          if (!cancelled) {
            setData({
              status: "ready",
              existing: catalog
            });
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(`Error loading function template catalog`, {
                  details: e.message
                });
            setData({
              status: "error",
              error
            });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [data]);

  return (
    <CatalogStateContext.Provider value={data}>
      <CatalogSetStateContext.Provider value={setData}>
        {children}
      </CatalogSetStateContext.Provider>
    </CatalogStateContext.Provider>
  );
}

function useCatalogState() {
  const context = React.useContext(CatalogStateContext);
  if (context === undefined) {
    throw new Error("useCatalogState must be used within a CatalogProvider");
  }
  return context;
}

function useCatalogSetState() {
  const context = React.useContext(CatalogSetStateContext);
  if (context === undefined) {
    throw new Error("useCatalogSetState must be used within a CatalogProvider");
  }
  return context;
}

function useCatalog(): [CatalogProvider, CatalogSetState] {
  return [useCatalogState(), useCatalogSetState()];
}

export { CatalogProvider, useCatalog };
