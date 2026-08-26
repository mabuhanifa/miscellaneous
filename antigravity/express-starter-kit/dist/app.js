"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = require("express-rate-limit");
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = __importDefault(require("./config"));
const error_middleware_1 = require("./middlewares/error.middleware");
const ApiError_1 = require("./utils/ApiError");
const v1_1 = __importDefault(require("./routes/v1"));
const app = (0, express_1.default)();
if (config_1.default.env !== 'test') {
    app.use((0, morgan_1.default)('combined'));
}
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
if (config_1.default.env === 'production') {
    const limiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: 15 * 60 * 1000,
        max: 20,
        skipSuccessfulRequests: true,
    });
    app.use('/api/v1/auth', limiter);
}
app.use('/api/v1', v1_1.default);
app.use((_req, _res, next) => {
    next(new ApiError_1.ApiError(404, 'Not found'));
});
app.use(error_middleware_1.errorConverter);
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map