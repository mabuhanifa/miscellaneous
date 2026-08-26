"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = __importDefault(require("http-status"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const user_service_1 = require("../modules/user/user.service");
const ApiError_1 = require("../utils/ApiError");
const auth = () => async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError_1.ApiError(http_status_1.default.UNAUTHORIZED, 'Please authenticate');
        }
        const token = authHeader.split(' ')[1];
        const payload = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        const user = await (0, user_service_1.getUserById)(payload.sub);
        if (!user) {
            throw new ApiError_1.ApiError(http_status_1.default.UNAUTHORIZED, 'User not found');
        }
        req.user = user;
        next();
    }
    catch (error) {
        next(new ApiError_1.ApiError(http_status_1.default.UNAUTHORIZED, 'Please authenticate'));
    }
};
exports.default = auth;
//# sourceMappingURL=auth.middleware.js.map