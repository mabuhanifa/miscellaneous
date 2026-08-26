import express from 'express';
import auth from '../../middlewares/auth.middleware';
import * as userController from './user.controller';

const router = express.Router();

router.get('/:userId', auth(), userController.getUser);

export default router;
