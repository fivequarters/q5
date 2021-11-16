import { getAccount, getSession, ISession, saveSession } from './LocalStorage';
import superagent from 'superagent';

export async function completeSession(sessionId: string): Promise<number> {
  const session = getSession(sessionId);
  const account = getAccount();
  // Finalize creation of the integration install
  console.log('CREATING INTEGRATION INSTALL...');
  let result = await superagent
    .post(`${session.integrationBaseUrl}/session/${session.sessionId}/commit`)
    .set('Authorization', `Bearer ${account.accessToken}`)
    .send();
  console.log('STARTED COMMIT');
  session.target = result.body.target;
  saveSession(session);
  return result.status;
}
