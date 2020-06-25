import React from 'react';
import { getIssuer, normalizeIssuer, updateIssuer, newIssuer } from '../lib/Fusebit';
import { Issuer } from '../lib/FusebitTypes';
import { FusebitError } from './ErrorBoundary';
import { useProfile } from './ProfileProvider';

type IssuerState =
  | {
      status: 'loading';
      issuerId: string;
      formatError?: (e: any) => Error;
    }
  | {
      status: 'ready' | 'updating';
      issuerId: string;
      dirty: boolean;
      existing: Issuer;
      modified: Issuer;
      formatError?: (e: any) => Error;
      afterUpdate?: (e?: Error) => void;
    }
  | {
      status: 'error';
      issuerId: string;
      error: Error;
    };

type IssuerSetState = (state: IssuerState) => void;

type IssuerProviderProps = {
  children: React.ReactNode;
  issuerId: string;
};

const IssuerStateContext = React.createContext<IssuerState | undefined>(undefined);
const IssuerSetStateContext = React.createContext<IssuerSetState | undefined>(undefined);

const NewIssuerId = 'new';

const updateErrorStates = (issuer: Issuer) => {
  if (
    issuer.publicKeyAcquisition === 'jwks' &&
    (!issuer.jsonKeysUrl || !issuer.jsonKeysUrl.trim().match(/^https:\/\//i))
  ) {
    issuer.jsonKeysUrlError = 'Required. The JWKS endpoint must be a secure https:// URL';
  } else {
    delete issuer.jsonKeysUrlError;
  }
  return issuer;
};

function IssuerProvider({ children, issuerId }: IssuerProviderProps) {
  const { profile } = useProfile();
  const [data, setData] = React.useState<IssuerState>(
    issuerId === NewIssuerId
      ? {
          status: 'ready',
          issuerId,
          dirty: false,
          existing: { id: issuerId, publicKeyAcquisition: 'jwks' },
          modified: { id: issuerId, publicKeyAcquisition: 'jwks' },
        }
      : {
          status: 'loading',
          issuerId,
        }
  );

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (data.status === 'loading' || data.status === 'updating') {
      (async () => {
        let afterUpdate = (data.status === 'updating' && data.afterUpdate) || undefined;
        try {
          let issuer: Issuer;
          if (data.status === 'loading') {
            issuer = await getIssuer(profile, issuerId);
          } else if (data.issuerId === NewIssuerId) {
            issuer = await newIssuer(profile, normalizeIssuer(data.modified));
          } else {
            issuer = await updateIssuer(profile, normalizeIssuer(data.modified));
          }
          if (!cancelled) {
            setData({
              status: 'ready',
              issuerId: issuer.id,
              dirty: false,
              existing: issuer,
              modified: JSON.parse(JSON.stringify(issuer)),
            });
          } else {
            afterUpdate = undefined;
          }
        } catch (e) {
          if (!cancelled) {
            const error = data.formatError
              ? data.formatError(e)
              : new FusebitError(`Error ${data.status} issuer ${data.issuerId}`, {
                  details:
                    (e.status || e.statusCode) === 403
                      ? `You are not authorized to access the issuer information.`
                      : e.message || 'Unknown error.',
                });
            setData({
              status: 'error',
              issuerId: data.issuerId,
              error,
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
  }, [data, profile, issuerId]);

  return (
    <IssuerStateContext.Provider value={data}>
      <IssuerSetStateContext.Provider value={setData}>{children}</IssuerSetStateContext.Provider>
    </IssuerStateContext.Provider>
  );
}

IssuerProvider.NewAgentId = NewIssuerId;

function useIssuerState() {
  const context = React.useContext(IssuerStateContext);
  if (context === undefined) {
    throw new Error('useIssuerState must be used within a IssuerProvider');
  }
  return context;
}

function useIssuerSetState() {
  const context = React.useContext(IssuerSetStateContext);
  if (context === undefined) {
    throw new Error('useIssuerSetState must be used within a IssuerProvider');
  }
  return context;
}

function useIssuer(): [IssuerState, IssuerSetState] {
  return [useIssuerState(), useIssuerSetState()];
}

function reloadIssuer(state: IssuerState, setState: IssuerSetState) {
  setState({
    status: 'loading',
    issuerId: state.issuerId,
  });
}

function modifyIssuer(state: IssuerState, setState: IssuerSetState, newIssuer: Issuer) {
  if (state.status !== 'ready') {
    throw new Error(
      `The modifyIssuer can only be called when the issuer status is 'ready'. Current issuer status is '${state.status}'.`
    );
  }

  updateErrorStates(newIssuer);
  setState({
    ...state,
    dirty: JSON.stringify(normalizeIssuer(state.existing)) !== JSON.stringify(normalizeIssuer(newIssuer)),
    modified: newIssuer,
  });
}

function saveIssuer(
  state: IssuerState,
  setState: IssuerSetState,
  formatError?: (e: any) => Error,
  afterUpdate?: (e?: Error) => void
) {
  if (state.status !== 'ready') {
    throw new Error(
      `The saveIssuer can only be called when the issuer status is 'ready'. Current issuer status is '${state.status}'.`
    );
  }

  setState({ ...state, formatError, afterUpdate, status: 'updating' });
}

function formatIssuer(issuer: IssuerState) {
  if (issuer.status === 'updating' || issuer.status === 'ready') {
    let name = [];
    if (issuer.modified.displayName) name.push(issuer.modified.displayName);
    if (name.length > 0) {
      return name.join(' ');
    }
  }
  return issuer.issuerId === NewIssuerId ? undefined : issuer.issuerId;
}

export { IssuerProvider, NewIssuerId, useIssuer, modifyIssuer, saveIssuer, reloadIssuer, formatIssuer };
