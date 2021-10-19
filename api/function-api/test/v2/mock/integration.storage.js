/**
 * Mocked integration used to interact with Storage SDK.
 */
const { Integration } = require('@fusebit-int/framework');
const packageFile = require('@fusebit-int/framework/package.json');

const integration = new Integration();
const router = integration.router;

// Create a new Bucket with items
router.post('/api/storage/:bucketName', async (ctx) => {
  const { version } = ctx.query;
  const bucketItems = ctx.req.body;
  for await (const bucketItem of bucketItems) {
    await integration.storage.setData(ctx, `${ctx.params.bucketName}/${bucketItem.bucket}`, bucketItem.data, version);
  }
  ctx.body = bucketItems;
});

// Get Bucket item
router.get('/api/storage/:bucketName/:bucketItem', async (ctx) => {
  const storageResult = await integration.storage.getData(ctx, `${ctx.params.bucketName}/${ctx.params.bucketItem}`);
  ctx.body = storageResult;
});

// Get Bucket items (with pagination support)
router.get('/api/storage/:bucketName', async (ctx) => {
  const { count, next } = ctx.request.query;
  const storageResult = await integration.storage.listData(ctx, ctx.params.bucketName, { count, next });
  ctx.body = storageResult;
});

router.put('/api/storage/:bucketName/:bucketItem', async (ctx) => {
  const { replace, version } = ctx.query;
  let setDataResponse;
  const currentData = await integration.storage.getData(ctx, `${ctx.params.bucketName}/${ctx.params.bucketItem}`);
  if (!replace) {
    const newData = [...currentData.data, ...ctx.req.body];
    setDataResponse = await integration.storage.setData(
      ctx,
      `${ctx.params.bucketName}/${ctx.params.bucketItem}`,
      newData,
      version || currentData.version
    );
  } else {
    setDataResponse = await integration.storage.setData(
      ctx,
      `${ctx.params.bucketName}/${ctx.params.bucketItem}`,
      ctx.req.body,
      version || currentData.version
    );
  }
  ctx.body = setDataResponse;
});

// Delete specific bucket item
router.delete('/api/storage/:bucketName/:bucketItem', async (ctx) => {
  const { version } = ctx.query;
  const deleteDataResponse = await integration.storage.deleteData(
    ctx,
    `${ctx.params.bucketName}/${ctx.params.bucketItem}`,
    version
  );
  ctx.body = deleteDataResponse;
});

// Delete entire Bucket
router.delete('/api/storage/:bucketName', async (ctx) => {
  const deleteDataResponse = await integration.storage.deletePrefixedData(ctx, ctx.params.bucketName);
  ctx.body = deleteDataResponse;
});

// Log framework version
router.get('/api/framework-version', async (ctx) => {
  ctx.body = packageFile.version;
});

module.exports = integration;
