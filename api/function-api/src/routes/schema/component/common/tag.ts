import ConnectorHandler from '../../../handlers/connector';
import express from 'express';

const connectorTagRouter = express.Router({ mergeParams: true });

connectorTagRouter.get('/', async (req, res, next) => {
  const connector = ConnectorHandler.getInstanceTags(req.params.connectorId);
  res.json(connector);
});

connectorTagRouter
  .route('/:key')
  .get(async (req, res, next) => {
    const tags = ConnectorHandler.getInstanceTagValues(req.params.connectorId, req.params.key);
    res.json(tags);
  })
  .delete(async (req, res, next) => {
    const connector = ConnectorHandler.removeTagFromInstance(req.params.connectorId, req.params.key);
    res.json(connector);
  });

connectorTagRouter.put('/:key/:value', async (req, res, next) => {
  const connector = ConnectorHandler.applyTagToInstance(req.params.connectorId, req.params.key, req.params.value);
  res.json(connector);
});

export default connectorTagRouter;
