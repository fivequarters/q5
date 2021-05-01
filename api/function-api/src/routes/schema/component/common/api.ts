import express from 'express';
import ConnectorHandler from '../../../handlers/connector';

const connectorApiRouter = express.Router({ mergeParams: true });

connectorApiRouter.get('/health', async (req, res) => {
  const healthResponse = ConnectorHandler.health(req.params.connectorId);
  res.json(healthResponse);
});

// Customer custom endpoints - is this still needed or are we locking it down?
connectorApiRouter.use(ConnectorHandler.dispatch);

export default connectorApiRouter;
