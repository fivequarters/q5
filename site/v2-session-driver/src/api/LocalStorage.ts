export interface ISession {
  integrationBaseUrl: string;
  tenantId: string;
  sessionId: string;
  target?: string;
  instanceId?: string;
  completed?: boolean;
}

export interface IAccount {
  endpoint: string;
  accountId: string;
  subscriptionId: string;
  accessToken: string;
}

export interface IInstance {
  instanceId: string;
  tenantId: string;
  integrationBaseUrl: string;
}

export interface IIntegration {
  integrationId: string;
}

enum LocalStorageKeys {
  sessions = 'sessions',
  account = 'account',
  instance = 'instances',
  integration = 'integration',
}

export function getSession(sessionId: string): ISession {
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

export function saveSession(session: ISession) {
  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageKeys.sessions) || '{}');
  localSessions[session.sessionId] = session;
  const sessionsString = JSON.stringify(localSessions);
  window.localStorage.setItem(LocalStorageKeys.sessions, sessionsString);
}

export function markSessionComplete(sessionId: string) {
  const localSessions = JSON.parse(window.localStorage.getItem(LocalStorageKeys.sessions) || '{}');
  localSessions[sessionId].completed = true;
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
  return {
    endpoint: 'https://stage.us-west-2.fusebit.io',
    ...JSON.parse(window.localStorage.getItem(LocalStorageKeys.account) || '{}'),
  };
}

export function getIntegrationBaseUrl(integration: string): string {
  const account = getAccount();
  return `${account.endpoint}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/integration/${integration}`;
}

export function saveInstance(instance: IInstance) {
  const localInstances = JSON.parse(window.localStorage.getItem(LocalStorageKeys.instance) || '{}');
  localInstances[instance.tenantId] = instance;
  const instanceString = JSON.stringify(localInstances);
  window.localStorage.setItem(LocalStorageKeys.instance, instanceString);
}

export function getInstance(tenantId: string): IInstance {
  const localInstances = JSON.parse(window.localStorage.getItem(LocalStorageKeys.instance) || '{}');
  const instance = localInstances[tenantId];
  return instance;
}

export function listIntegrations(): IIntegration[] {
  const localIntegrations = JSON.parse(window.localStorage.getItem(LocalStorageKeys.integration) || '[]');
  return localIntegrations;
}

export function getIntegration(integrationId: string): IIntegration {
  const localIntegrations = JSON.parse(window.localStorage.getItem(LocalStorageKeys.integration) || '[]');
  const integration = localIntegrations.find(
    (integration: IIntegration) => integration.integrationId === integrationId
  );
  return integration;
}

export function saveIntegration(integrationId: string): void {
  const localIntegrations = JSON.parse(window.localStorage.getItem(LocalStorageKeys.integration) || '[]');
  localIntegrations.push({ integrationId });
  const localIntegrationsString = JSON.stringify(localIntegrations);
  window.localStorage.setItem(LocalStorageKeys.integration, localIntegrationsString);
}

export function removeIntegration(integrationId: string): void {
  const integration = getIntegration(integrationId);
  if (integration) {
    const integrations = listIntegrations();
    const integrationIndex = integrations.findIndex((integration) => integration.integrationId == integrationId);
    if (integrationIndex !== -1) {
      integrations.splice(integrationIndex, 1);
      const localIntegrationsString = JSON.stringify(integrations);
      window.localStorage.setItem(LocalStorageKeys.integration, localIntegrationsString);
    }
  }
}
