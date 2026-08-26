import { describe, expect, it } from 'vitest';
import app from './src/app';

describe('App', () => {
  it('should return 200 OK on /health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
  });

  it('should return 404 on unknown route', async () => {
    const res = await app.request('/unknown');
    expect(res.status).toBe(404);
  });
});
