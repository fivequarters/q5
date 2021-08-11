import { ILocalStorage } from './LocalStorage';
import superagent from 'superagent';

export async function pollSessionStatus(session: ILocalStorage) {
  // Wait up to 10s for the creation of the integration instance to complete
  const operationUrl = `${session.integrationBaseUrl.substr(
    0,
    session.integrationBaseUrl.indexOf('/integration/')
  )}/operation/${session.operationId}`;

  let success = false;
  for (let n = 0; n < 10; n++) {
    const result = await superagent.get(operationUrl).set('Authorization', `Bearer ${session.accessToken}`);
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
}
