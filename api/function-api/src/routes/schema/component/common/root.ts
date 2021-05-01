import express from 'express';
import * as common from '../../../middleware/common';
import ConnectorHandler from '../../../handlers/connector';

const connectorRouter = express.Router({ mergeParams: true });

connectorRouter.use(common.cors());

connectorRouter
  .route('/')
  .get(async (req, res, next) => {
    if (typeof req.query.tag === 'string' && req.query.tag.length) {
      const [tagKey, tagValue] = req.query.tag.split('=');
      const connectors = ConnectorHandler.searchByTag(tagKey, tagValue);
      res.json(connectors);
    } else {
      const connectors = ConnectorHandler.getAll();
      res.json(connectors);
    }
  })
  .post(async (req, res, next) => {
    const connector = ConnectorHandler.createNew(req.body.data);
    res.json(connector);
  });

export default connectorRouter;
