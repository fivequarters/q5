import ConnectorHandler from '../../../handlers/connector';
import ConnectorTagRouter from './tag';
import ConnectorApiRouter from './api';
import express from 'express';

const connectorInstanceRouter = express.Router({ mergeParams: true });

connectorInstanceRouter
  .route('/')
  .get(async (req, res, next) => {
    try {
      const connector = await ConnectorHandler.getInstance(req.params.connectorId);
      res.json(connector);
    } catch (e) {
      res.json(error);
    }
  })
  .put(async (req, res, next) => {
    const connector = ConnectorHandler.updateInstance(req.params.connectorId, req.body.data);
    res.json(connector);
  })
  .delete(async (req, res, next) => {
    const connector = ConnectorHandler.deleteInstance(req.params.connectorId);
    res.json(connector);
  });

export default connectorInstanceRouter;
