import { getSession, ILocalStorage } from './LocalStorage';
import superagent from 'superagent';

export async function getInstance(sessionId: string) {
  const session = getSession(sessionId);
  // Instance creation completed, get the instance
  console.log('GETTING INSTANCE...');
  const result = await superagent
    .get(`${session.integrationBaseUrl}/session/${session.sessionId}/result`)
    .set('Authorization', `Bearer ${session.accessToken}`);
  const instance = result.body;
  console.log('INTEGRATION INSTANCE CREATED', JSON.stringify(instance, null, 2));

  const instanceId = instance.output.entityId;
  return instanceId;
}
