"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.getUserByEmail = exports.createUser = void 0;
const ApiError_1 = require("../../utils/ApiError");
const user_model_1 = __importDefault(require("./user.model"));
const createUser = async (userBody) => {
    if (await user_model_1.default.isEmailTaken(userBody.email)) {
        throw new ApiError_1.ApiError(400, 'Email already taken');
    }
    return user_model_1.default.create(userBody);
};
exports.createUser = createUser;
const getUserByEmail = async (email) => {
    return user_model_1.default.findOne({ email });
};
exports.getUserByEmail = getUserByEmail;
const getUserById = async (id) => {
    return user_model_1.default.findById(id);
};
exports.getUserById = getUserById;
//# sourceMappingURL=user.service.js.map