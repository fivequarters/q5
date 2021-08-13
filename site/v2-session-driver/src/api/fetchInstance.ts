import { getAccount, getSession, ISession, getInstance } from './LocalStorage';
import superagent from 'superagent';

export async function fetchInstance(instanceId: string, integrationBaseUrl: string) {
  const account = getAccount();
  // Instance creation completed, get the instance
  console.log('GETTING INSTANCE...');
  const result = await superagent
    .get(`${integrationBaseUrl}/instance/${instanceId}`)
    .set('Authorization', `Bearer ${account.accessToken}`);
  const instance = result.body;
  console.log('INTEGRATION INSTANCE CREATED', JSON.stringify(instance, null, 2));

  return instance;
}
