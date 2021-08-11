export interface ILocalStorage {
  accessToken: string;
  integrationBaseUrl: string;
  tenantId: string;
  sessionId: string;
  target?: string;
  instanceId?: string;
}

export interface IAccount {
  accountId: string;
  subscriptionId: string;
}

enum LocalStorageKeys {
  sessions = 'sessions',
  account = 'account',
}

export function getSession(sessionId: string): ILocalStorage {
  // Rehydrate local session
  console.log('REHYDRATING SESSION', sessionId);

  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageKeys.sessions) || '{}');
  if (!localSessions) {
    throw new Error(`No sessions found`);
  }
  const session = localSessions[sessionId];
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  console.log('REHYDRATED SESSION', session);
  return session;
}

export function saveSession(session: ILocalStorage) {
  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageKeys.sessions) || '{}');
  localSessions[session.sessionId] = session;
  const sessionsString = JSON.stringify(localSessions);
  window.localStorage.setItem(LocalStorageKeys.sessions, sessionsString);
}

export function listSessions() {
  return Object.values(JSON.parse(window.localStorage.getItem(LocalStorageKeys.sessions) || '{}'));
}

export function deleteSession(sessionId: number) {
  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageKeys.sessions) || '{}');
  delete localSessions[sessionId];
  const sessionsString = JSON.stringify(localSessions);
  window.localStorage.setItem(LocalStorageKeys.sessions, sessionsString);
}

export function clearSessions() {
  window.localStorage.removeItem(LocalStorageKeys.sessions);
}

export function setAccount(account: IAccount) {
  window.localStorage.setItem(LocalStorageKeys.account, JSON.stringify(account));
}

export function getAccount() {
  return JSON.parse(window.localStorage.getItem(LocalStorageKeys.account) || '{}');
}

export function getIntegrationBaseUrl(integration: string): string {
  const account = getAccount();
  return `http://localhost:3001/v2/account/${account.accountId}/subscription/${account.subscriptionId}/integration/${integration}`;
}
