import { getAccount, getSession, ISession, saveInstance } from './LocalStorage';
import superagent from 'superagent';
import { fetchInstance } from './fetchInstance';

export async function pollSessionStatus(sessionId: string) {
  // Wait up to 10s for the creation of the integration instance to complete

  const session = getSession(sessionId);
  const account = getAccount();
  let result;
  let success;
  if (!session.target) {
    throw new Error('Target not found');
  }
  for (let n = 0; n < 10; n++) {
    result = await superagent.get(session.target).set('Authorization', `Bearer ${account.accessToken}`);
    console.log('OPERATION GET', n, result.status, result.body);
    if (result.status === 200) {
      success = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!success) {
    throw new Error('Timed out waiting 10s for the integration instance to be initialized.');
  }

  const instanceId = result?.body.items[0].id;
  const instance = await fetchInstance(instanceId, session.integrationBaseUrl);
  const localInstance = {
    integrationBaseUrl: session.integrationBaseUrl,
    instanceId,
    tenantId: instance.tags['tenantId'],
  };
  console.log('saving instance');
  console.log(localInstance);
  saveInstance(localInstance);

  return localInstance;
}
