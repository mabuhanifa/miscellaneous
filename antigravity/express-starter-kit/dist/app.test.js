"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("./app"));
describe('GET /api/v1/health', () => {
    it('should return 404 because health route is not defined yet', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/health');
        expect(res.statusCode).toEqual(404);
    });
});
//# sourceMappingURL=app.test.js.map