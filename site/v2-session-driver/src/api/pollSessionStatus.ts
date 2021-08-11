import { getSession, ILocalStorage } from './LocalStorage';
import superagent from 'superagent';

export async function pollSessionStatus(sessionId: string) {
  // Wait up to 10s for the creation of the integration instance to complete

  const session = getSession(sessionId);
  let success = false;
  for (let n = 0; n < 10; n++) {
    const result = await superagent
      .get(`${session.integrationBaseUrl}/session/${session.sessionId}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
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
  return true;
}
