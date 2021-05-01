import express from 'express';

const connectorSessionRouter = express.Router({ mergeParams: true });

// Create new session
connectorSessionRouter.post('/', async (req, res, next) => {});

// Get value of session
connectorSessionRouter.get('/:sessionId', async (req, res, next) => {});

export default connectorSessionRouter;
