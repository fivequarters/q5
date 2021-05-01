import express from 'express';
import component from './component';

const router = express.Router();

router.use(component());

export default router;
