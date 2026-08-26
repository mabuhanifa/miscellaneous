"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.errorConverter = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../config/logger"));
const ApiError_1 = require("../utils/ApiError");
const errorConverter = (err, _req, _res, next) => {
    let error = err;
    if (!(error instanceof ApiError_1.ApiError)) {
        const statusCode = error.statusCode || error instanceof mongoose_1.default.Error ? 400 : 500;
        const message = error.message || String(error);
        error = new ApiError_1.ApiError(statusCode, message, false, err.stack);
    }
    next(error);
};
exports.errorConverter = errorConverter;
const errorHandler = (err, _req, res, _next) => {
    let { statusCode, message } = err;
    if (config_1.default.env === 'production' && !err.isOperational) {
        statusCode = 500;
        message = 'Internal Server Error';
    }
    res.locals.errorMessage = err.message;
    const response = {
        code: statusCode,
        message,
        ...(config_1.default.env === 'development' && { stack: err.stack }),
    };
    if (config_1.default.env === 'development') {
        logger_1.default.error(err);
    }
    res.status(statusCode).send(response);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map