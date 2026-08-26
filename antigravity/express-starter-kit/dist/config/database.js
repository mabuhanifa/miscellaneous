"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
const logger_1 = __importDefault(require("./logger"));
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(index_1.default.mongoose.url);
        logger_1.default.info('Connected to MongoDB');
    }
    catch (error) {
        logger_1.default.error('Could not connect to MongoDB', error);
        process.exit(1);
    }
};
exports.default = connectDB;
//# sourceMappingURL=database.js.map