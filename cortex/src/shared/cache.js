import { config } from "./config.js";

// Redis 可选：配置 REDIS_URL 时走 ioredis（docker-compose 内自带 redis 服务），
// 未配置或连接失败时自动落到进程内 TTL 缓存，保证零配置也能运行。
const memory = new Map();
let clientPromise = null;

async function redisClient() {
  if (!config.redis.url) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const mod = await import("ioredis");
        const Redis = mod.default ?? mod.Redis ?? mod;
        const client = new Redis(config.redis.url, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 1500,
        });
        await client.connect();
        return client;
      } catch {
        return null;
      }
    })();
  }
  return clientPromise;
}

function memoryGet(key) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function memorySet(key, value, ttlSeconds) {
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  if (memory.size > 500) {
    const now = Date.now();
    for (const [k, v] of memory) {
      if (v.expiresAt <= now) memory.delete(k);
    }
  }
}

export async function cacheGet(key) {
  const client = await redisClient();
  if (client) {
    try {
      const raw = await client.get(key);
      if (raw) return JSON.parse(raw);
      return null;
    } catch {
      // Redis 抖动时降级读内存，不让缓存故障放大成接口故障
    }
  }
  return memoryGet(key);
}

export async function cacheSet(key, value, ttlSeconds = config.redis.ttlSeconds) {
  const client = await redisClient();
  if (client) {
    try {
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch {
      // 同上，写失败落内存
    }
  }
  memorySet(key, value, ttlSeconds);
}

export async function cacheBackend() {
  return (await redisClient()) ? "redis" : "memory";
}
