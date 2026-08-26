"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.createUser = void 0;
const zod_1 = require("zod");
exports.createUser = {
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8),
        name: zod_1.z.string(),
        role: zod_1.z.enum(['user', 'admin']).optional(),
    }),
};
exports.login = {
    body: zod_1.z.object({
        email: zod_1.z.string(),
        password: zod_1.z.string(),
    }),
};
//# sourceMappingURL=user.validation.js.map