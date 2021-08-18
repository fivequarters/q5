import superagent from 'superagent';
import { getAccount, getIntegrationBaseUrl, saveSession } from './LocalStorage';

export default async function createSession(integrationId: string, tenantId: string) {
  const account = getAccount();
  // Create new session
  console.log('CREATING NEW SESSION...');
  const integrationBaseUrl = getIntegrationBaseUrl(integrationId);

  const response = await superagent
    .post(`${integrationBaseUrl}/session`)
    .set('Authorization', `Bearer ${account.accessToken}`)
    .send({
      redirectUrl: `${window.location.origin}/callback`,
      tags: {
        'fusebit.tenant': tenantId,
      },
    });
  const sessionId = response.body.id;
  console.log('SESSION ID CREATED:', sessionId);

  // // Store local session context
  const session = { integrationBaseUrl, tenantId, sessionId };
  saveSession(session);
  return session;
}
