import { CacheService } from './cache.service';

/**
 * Caching must be a pure optimization: when Redis is not configured/reachable,
 * every method degrades to a no-op / cache-miss and the app keeps working.
 * These tests pin that contract using the no-URL path (client stays null).
 */
describe('CacheService (graceful degradation, no Redis)', () => {
  let cache: CacheService;
  const original = process.env.REDIS_URL;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    cache = new CacheService();
  });

  afterAll(() => {
    if (original !== undefined) process.env.REDIS_URL = original;
  });

  it('get() returns null when cache is unavailable', async () => {
    await expect(cache.get('any-key')).resolves.toBeNull();
  });

  it('set() and invalidate() are no-ops (never throw)', async () => {
    await expect(cache.set('k', { a: 1 }, 60)).resolves.toBeUndefined();
    await expect(cache.invalidate('k:*')).resolves.toBeUndefined();
  });

  it('wrap() runs the producer and returns its value on a miss', async () => {
    const fn = jest.fn().mockResolvedValue({ v: 42 });
    await expect(cache.wrap('k', 60, fn)).resolves.toEqual({ v: 42 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wrap() calls the producer every time when cache is unavailable', async () => {
    const fn = jest.fn().mockResolvedValue('x');
    await cache.wrap('k', 60, fn);
    await cache.wrap('k', 60, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
