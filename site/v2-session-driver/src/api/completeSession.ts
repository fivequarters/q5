import { getSession, ILocalStorage, saveSession } from './LocalStorage';
import superagent from 'superagent';

export async function completeSession(sessionId: string): Promise<number> {
  const session = getSession(sessionId);
  // Finalize creation of the integration instance
  console.log('CREATING INTEGRATION INSTANCE...');
  let result = await superagent
    .post(`${session.integrationBaseUrl}/session/${session.sessionId}/commit`)
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send();
  console.log('STARTED COMMIT');
  return result.status;
}
