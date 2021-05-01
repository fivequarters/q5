import express from 'express';

const identityApiRouter = express.Router({ mergeParams: true });

identityApiRouter.get('/health', async (req, res, next) => {});
identityApiRouter.get('/credentials', async (req, res, next) => {});

export default identityApiRouter;
