import request from 'supertest';
import app from './app';

describe('GET /api/v1/health', () => {
  it('should return 404 because health route is not defined yet', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toEqual(404);
  });
});
