import express from 'express';

const identityRootRouter = express.Router({ mergeParams: true });

// Create new identity
identityRootRouter.post('/', async (req, res, next) => {});

export default identityRootRouter;
