import express from 'express';
import component from './component';
import operation from './operation';

const router = express.Router({ mergeParams: true });

router.use(component());
router.use('/operation', operation);

export default router;
