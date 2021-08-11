import superagent from 'superagent';

export default async function createSession(accessToken: string, integrationBaseUrl: string, tenantId: string) {
  // Create new session
  console.log('CREATING NEW SESSION...');
  const response = await superagent
    .post(`${integrationBaseUrl}/session`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      redirectUrl: `${window.location.origin}${window.location.pathname}`,
      tags: {
        'fusebit.tenantId': tenantId,
      },
    });
  const sessionId = response.body.id;
  console.log('SESSION ID CREATED:', sessionId);

  return sessionId;
  //
  // // Store local session context
  // window.localStorage.setItem(sessionId, JSON.stringify({ accessToken, integrationBaseUrl, tenantId }));

  // Start the configuration flow
  const configureUrl = `${integrationBaseUrl}/session/${sessionId}/start`;
  console.log('STARTING THE CONFIGURATION FLOW AT:', configureUrl);
  window.location.href = configureUrl;
}
