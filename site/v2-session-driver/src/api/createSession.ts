import superagent from 'superagent';
import { getIntegrationBaseUrl, saveSession } from './LocalStorage';

export default async function createSession(accessToken: string, integrationId: string, tenantId: string) {
  // Create new session
  console.log('CREATING NEW SESSION...');
  const integrationBaseUrl = getIntegrationBaseUrl(integrationId);

  const response = await superagent
    .post(`${integrationBaseUrl}/session`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      redirectUrl: `${window.location.origin}/callback`,
      tags: {
        'fusebit.tenantId': tenantId,
      },
    });
  const sessionId = response.body.id;
  console.log('SESSION ID CREATED:', sessionId);

  // // Store local session context
  saveSession({ accessToken, integrationBaseUrl, tenantId, sessionId });
}
