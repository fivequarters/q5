import { getAccount, getSession, ISession, getInstall } from './LocalStorage';
import superagent from 'superagent';

export async function fetchInstall(installId: string, integrationBaseUrl: string) {
  const account = getAccount();
  // Creation completed, get the install
  console.log('GETTING INSTALL...');
  const result = await superagent
    .get(`${integrationBaseUrl}/install/${installId}`)
    .set('Authorization', `Bearer ${account.accessToken}`);
  const install = result.body;
  console.log('INTEGRATION INSTALL CREATED', JSON.stringify(install, null, 2));

  return install;
}
