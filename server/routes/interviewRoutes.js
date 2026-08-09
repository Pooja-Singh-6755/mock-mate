// server/src/routes/interviewRoutes.js
// server/routes/interviewRoutes.js
import express from 'express';
import { getInterview } from '../controllers/interviewController.js';

const router = express.Router();

router.get('/:interviewId', getInterview);

export default router;