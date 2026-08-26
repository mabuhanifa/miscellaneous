"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const envVarsSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['production', 'development', 'test']).default('development'),
    PORT: zod_1.z.string().default('3000').transform((val) => parseInt(val, 10)),
    MONGODB_URL: zod_1.z.string().url().describe('Mongo DB url'),
    JWT_SECRET: zod_1.z.string().describe('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: zod_1.z.string().default('30').transform((val) => parseInt(val, 10)).describe('minutes after which access tokens expire'),
});
const envVars = envVarsSchema.parse(process.env);
exports.default = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    mongoose: {
        url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    },
};
//# sourceMappingURL=index.js.map