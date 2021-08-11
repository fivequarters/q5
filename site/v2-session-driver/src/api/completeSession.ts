import { ILocalStorage } from './LocalStorage';
import superagent from 'superagent';

export async function completeSession(session: ILocalStorage): Promise<number> {
  // Finalize creation of the integration instance
  console.log('CREATING INTEGRATION INSTANCE...');
  let result = await superagent
    .post(`${session.integrationBaseUrl}/session/${session.sessionId}/commit`)
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send();
  const { operationId } = result.body;
  console.log('STARTED ASYNC OPERATION', operationId);
  return result.status;
}
