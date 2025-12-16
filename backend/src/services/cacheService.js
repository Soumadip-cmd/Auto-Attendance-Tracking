const Redis = require('ioredis');
const logger = require('../config/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.client = new Redis(process.env.REDIS_URL, {
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3
        });

        this.client.on('connect', () => {
          logger. info('Redis connected successfully');
          this.isConnected = true;
        });

        this.client.on('error', (error) => {
          logger.error('Redis connection error:', error);
          this.isConnected = false;
        });

        this.client.on('close', () => {
          logger. warn('Redis connection closed');
          this.isConnected = false;
        });
      } else {
        logger.warn('REDIS_URL not configured.  Caching disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Set value in cache without expiration
   */
  async setPermanent(key, value) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.set(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache setPermanent error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache deletePattern error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key, amount = 1) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key, ttlSeconds) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get time to live for key
   */
  async ttl(key) {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Cache ttl error:', error);
      return -1;
    }
  }

  /**
   * Store hash map
   */
  async hset(key, field, value) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache hset error:', error);
      return false;
    }
  }

  /**
   * Get hash map field
   */
  async hget(key, field) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.client.hget(key, field);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  }

  /**
   * Get all fields in hash map
   */
  async hgetall(key) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const hash = await this.client.hgetall(key);
      const result = {};
      for (const [field, value] of Object. entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error('Cache hgetall error:', error);
      return null;
    }
  }

  /**
   * Delete field from hash map
   */
  async hdel(key, field) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error('Cache hdel error:', error);
      return false;
    }
  }

  /**
   * Add to set
   */
  async sadd(key, ... members) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.sadd(key, ...members);
      return true;
    } catch (error) {
      logger.error('Cache sadd error:', error);
      return false;
    }
  }

  /**
   * Get all members of set
   */
  async smembers(key) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Cache smembers error:', error);
      return [];
    }
  }

  /**
   * Check if member exists in set
   */
  async sismember(key, member) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error('Cache sismember error:', error);
      return false;
    }
  }

  /**
   * Remove member from set
   */
  async srem(key, member) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.srem(key, member);
      return true;
    } catch (error) {
      logger.error('Cache srem error:', error);
      return false;
    }
  }

  /**
   * Cache user data
   */
  async cacheUser(userId, userData, ttl = 3600) {
    return this.set(`user:${userId}`, userData, ttl);
  }

  /**
   * Get cached user data
   */
  async getCachedUser(userId) {
    return this.get(`user:${userId}`);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId) {
    return this.delete(`user:${userId}`);
  }

  /**
   * Cache attendance summary
   */
  async cacheAttendanceSummary(userId, startDate, endDate, summary, ttl = 1800) {
    const key = `attendance:summary:${userId}:${startDate}:${endDate}`;
    return this.set(key, summary, ttl);
  }

  /**
   * Get cached attendance summary
   */
  async getCachedAttendanceSummary(userId, startDate, endDate) {
    const key = `attendance:summary:${userId}: ${startDate}:${endDate}`;
    return this.get(key);
  }

  /**
   * Cache location statistics
   */
  async cacheLocationStats(userId, startDate, endDate, stats, ttl = 1800) {
    const key = `location:stats:${userId}:${startDate}:${endDate}`;
    return this.set(key, stats, ttl);
  }

  /**
   * Get cached location statistics
   */
  async getCachedLocationStats(userId, startDate, endDate) {
    const key = `location:stats:${userId}:${startDate}:${endDate}`;
    return this.get(key);
  }

  /**
   * Cache dashboard data
   */
  async cacheDashboard(userId, role, data, ttl = 300) {
    const key = `dashboard:${role}:${userId}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get cached dashboard data
   */
  async getCachedDashboard(userId, role) {
    const key = `dashboard:${role}:${userId}`;
    return this.get(key);
  }

  /**
   * Invalidate all dashboard caches
   */
  async invalidateAllDashboards() {
    return this.deletePattern('dashboard:*');
  }

  /**
   * Store rate limit data
   */
  async incrementRateLimit(identifier, windowSeconds) {
    if (!this.isAvailable()) {
      return { count: 0, ttl: 0 };
    }

    try {
      const key = `ratelimit:${identifier}`;
      const count = await this.client.incr(key);
      
      if (count === 1) {
        await this.client.expire(key, windowSeconds);
      }

      const ttl = await this.client.ttl(key);

      return { count, ttl };
    } catch (error) {
      logger.error('Rate limit error:', error);
      return { count: 0, ttl: 0 };
    }
  }

  /**
   * Clear all cache
   */
  async flushAll() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this. client.flushall();
      logger.info('All cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this. client.quit();
      logger.info('Redis connection closed');
    }
  }
}

module.exports = new CacheService();