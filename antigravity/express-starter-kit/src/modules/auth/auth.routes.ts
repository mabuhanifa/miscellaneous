import express from 'express';
import validate from '../../middlewares/validate.middleware';
import * as authValidation from '../../modules/user/user.validation'; // Reusing user validation for now or create auth validation
import * as authController from './auth.controller';

const router = express.Router();

router.post('/register', validate(authValidation.createUser), authController.register);
router.post('/login', validate(authValidation.login), authController.login);

export default router;
