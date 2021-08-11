// import superagent from 'superagent';
//
// async function completeSession(sessionId: string) {
//   // Rehydrate local session
//   console.log('REHYDRATING SESSION', sessionId);
//   let localSession;
//   try {
//     localSession = JSON.parse(window.localStorage.getItem(sessionId));
//   } catch (e) {
//     throw new Error(`Session ${sessionId} not found`);
//   }
//   const { accessToken, integrationBaseUrl, tenantId } = localSession;
//   console.log('REHYDRATED SESSION', { accessToken, integrationBaseUrl, tenantId, sessionId });
//
//   // Finalize creation of the integration instance
//   console.log('CREATING INTEGRATION INSTANCE...');
//   let result = await superagent
//     .post(`${integrationBaseUrl}/session/${sessionId}`)
//     .set('Authorization', `Bearer ${accessToken}`)
//     .send();
//   const { operationId } = result.body;
//   console.log('STARTED ASYNC OPERATION', operationId);
//
//   // Wait up to 10s for the creation of the integration instance to complete
//   const operationUrl = `${integrationBaseUrl.substr(
//     0,
//     integrationBaseUrl.indexOf('/integration/')
//   )}/operation/${operationId}`;
//   for (let n = 0; n < 10; n++) {
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     result = await superagent.get(operationUrl).set('Authorization', `Bearer ${accessToken}`);
//     console.log('OPERATION GET', n, result.statusCode, result.body);
//     if (result.statusCode === 200) {
//       break;
//     }
//   }
//   if (result.statusCode !== 200) {
//     throw new Error('Timed out waiting 10s for the integration instance to be initialized.');
//   }
//
//   // Instance creation completed, get the instance
//   console.log('GETTING INSTANCE...');
//   result = await superagent
//     .get(`${integrationBaseUrl}/session/${sessionId}/result`)
//     .set('Authorization', `Bearer ${accessToken}`);
//   const instance = result.body;
//   console.log('INTEGRATION INSTANCE CREATED', JSON.stringify(instance, null, 2));
//
//   return { instanceId: instance.output.entityId, accessToken, integrationBaseUrl, tenantId };
// }
