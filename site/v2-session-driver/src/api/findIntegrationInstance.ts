import superagent from 'superagent';
import { ILocalStorage } from './LocalStorage';

export default async function findIntegrationInstance(session: ILocalStorage) {
  // Search for an integration instance that is tagged with the specified tenantId
  console.log('CHECKING FOR AN EXISTING INTEGRATION INSTANCE...');
  const response = await superagent
    .get(`${session.integrationBaseUrl}/instance`)
    .set('Authorization', `Bearer ${session.accessToken}`)
    .query({
      tag: `fusebit.tenantId=${encodeURIComponent(session.tenantId)}`,
    });
  const instance = response.body && response.body.items && response.body.items[0];
  console.log('CHECK RESULT', JSON.stringify(instance, null, 2));

  return instance && instance.id;
}
