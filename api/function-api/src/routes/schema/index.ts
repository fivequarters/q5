import express from 'express';
import component from './component';

const router = express.Router({ mergeParams: true });

router.use(component());

export default router;
