export interface ILocalStorage {
  accessToken: string;
  integrationBaseUrl: string;
  tenantId: string;
  sessionId: string;
  operationId?: string;
}
const LocalStorageSessionKey = 'sessions';

export function getSession(sessionId: string): ILocalStorage {
  // Rehydrate local session
  console.log('REHYDRATING SESSION', sessionId);

  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageSessionKey) || '');
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
  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageSessionKey) || '');
  localSessions[session.sessionId] = session;
  const sessionsString = JSON.stringify(localSessions);
  window.localStorage.setItem(LocalStorageSessionKey, sessionsString);
}

export function listSessions() {
  return Object.values(JSON.parse(window.localStorage.getItem(LocalStorageSessionKey) || ''));
}

export function deleteSession(sessionId: number) {
  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageSessionKey) || '');
  delete localSessions[sessionId];
  const sessionsString = JSON.stringify(localSessions);
  window.localStorage.setItem(LocalStorageSessionKey, sessionsString);
}

export function clearSessions() {
  window.localStorage.removeItem(LocalStorageSessionKey);
}
