import React from 'react';
import { Api } from '../api';

// ------------------
// Exported Constants
// ------------------

export const ApiContext = React.createContext(new Api());

// --------------
// Exported Types
// --------------

export type ApiProviderProps = {
  api: Api;
} & React.BaseHTMLAttributes<HTMLElement>;

// -------------------
// Exported Components
// -------------------

export function ApiProvider({ api, children }: ApiProviderProps) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
