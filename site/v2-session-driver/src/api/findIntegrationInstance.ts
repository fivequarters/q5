import superagent from 'superagent';

export default async function findIntegrationInstance(
  accessToken: string,
  integrationBaseUrl: string,
  tenantId: string
) {
  // Search for an integration instance that is tagged with the specified tenantId
  console.log('CHECKING FOR AN EXISTING INTEGRATION INSTANCE...');
  const response = await superagent
    .get(`${integrationBaseUrl}/instance`)
    .set('Authorization', `Bearer ${accessToken}`)
    .query({
      tag: `fusebit.tenantId=${encodeURIComponent(tenantId)}`,
    });
  const instance = response.body && response.body.items && response.body.items[0];
  console.log('CHECK RESULT', JSON.stringify(instance, null, 2));

  return instance && instance.id;
}
