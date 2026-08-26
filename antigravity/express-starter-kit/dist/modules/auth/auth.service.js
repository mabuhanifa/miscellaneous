"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = exports.loginUserWithEmailAndPassword = void 0;
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = require("../../utils/ApiError");
const tokenService = __importStar(require("../token/token.service"));
const userService = __importStar(require("../user/user.service"));
const loginUserWithEmailAndPassword = async (email, password) => {
    const user = await userService.getUserByEmail(email);
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError_1.ApiError(http_status_1.default.UNAUTHORIZED, 'Incorrect email or password');
    }
    return user;
};
exports.loginUserWithEmailAndPassword = loginUserWithEmailAndPassword;
const register = async (userBody) => {
    const user = await userService.createUser(userBody);
    const tokens = await tokenService.generateAuthTokens(user);
    return { user, tokens };
};
exports.register = register;
const login = async (email, password) => {
    const user = await (0, exports.loginUserWithEmailAndPassword)(email, password);
    const tokens = await tokenService.generateAuthTokens(user);
    return { user, tokens };
};
exports.login = login;
//# sourceMappingURL=auth.service.js.map