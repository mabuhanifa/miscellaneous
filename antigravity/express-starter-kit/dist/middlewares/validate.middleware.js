"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ApiError_1 = require("../utils/ApiError");
const validate = (schema) => (req, _res, next) => {
    try {
        zod_1.z.object(schema).parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            const issues = error.errors || error.issues;
            const errorMessage = issues.map((details) => details.message).join(', ');
            return next(new ApiError_1.ApiError(400, errorMessage));
        }
        next(error);
    }
};
exports.default = validate;
//# sourceMappingURL=validate.middleware.js.map