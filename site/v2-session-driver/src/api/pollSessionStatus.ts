import { getAccount, getSession, ISession, saveInstall } from './LocalStorage';
import superagent from 'superagent';
import { fetchInstall } from './fetchInstall';

export async function pollSessionStatus(sessionId: string) {
  // Wait up to 10s for the creation of the integration install to complete

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
    throw new Error('Timed out waiting 10s for the integration install to be initialized.');
  }

  const installId = result?.body.items[0].id;
  const install = await fetchInstall(installId, session.integrationBaseUrl);
  const localInstall = {
    integrationBaseUrl: session.integrationBaseUrl,
    installId,
    'fusebit.tenantId': install.tags['fusebit.tenantId'],
  };
  saveInstall(localInstall);

  return localInstall;
}
