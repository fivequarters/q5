import { ILocalStorage } from './LocalStorage';

async function startSession(session: ILocalStorage) {
  // Start the configuration flow
  const configureUrl = `${session.integrationBaseUrl}/session/${session.sessionId}/start`;
  console.log('STARTING THE CONFIGURATION FLOW AT:', configureUrl);
  window.location.href = configureUrl;
}
