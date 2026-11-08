import { config } from "../config.js";

// MongoDB 是可选的事件/非结构化存储：未配置 MONGODB_URI 时全部操作安全降级，
// 权威业务数据仍在 PostgreSQL(Supabase) 中。
let collectionPromise = null;

async function collection() {
  if (!config.mongo.uri) return null;
  if (!collectionPromise) {
    collectionPromise = (async () => {
      try {
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(config.mongo.uri, { serverSelectionTimeoutMS: 1500 });
        await client.connect();
        return client.db(config.mongo.database).collection(config.mongo.collection);
      } catch {
        return null;
      }
    })();
  }
  return collectionPromise;
}

export async function mongoStatus() {
  if (!config.mongo.uri) return { status: "unconfigured", detail: "可选事件存储" };
  const col = await collection();
  return col
    ? { status: "ok", database: config.mongo.database, collection: config.mongo.collection }
    : { status: "unavailable", detail: "连接失败，已降级" };
}

export async function appendEvent(event) {
  const col = await collection();
  if (!col) return { stored: false, reason: "mongodb not configured or unavailable" };
  await col.insertOne({ ...event, created_at: new Date() });
  return { stored: true };
}

export async function listEvents(limit = 20) {
  const col = await collection();
  if (!col) return [];
  return col.find({}).sort({ created_at: -1 }).limit(Math.min(limit, 100)).toArray();
}
