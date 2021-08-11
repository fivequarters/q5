async function startSession(integrationBaseUrl: string, sessionId: string) {
  // Start the configuration flow
  const configureUrl = `${integrationBaseUrl}/session/${sessionId}/start`;
  console.log('STARTING THE CONFIGURATION FLOW AT:', configureUrl);
  window.location.href = configureUrl;
}
