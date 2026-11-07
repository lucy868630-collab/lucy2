import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 是否已完成 Supabase 配置（未配置时网站进入"演示模式"） */
export const supabaseConfigured =
  Boolean(url && anonKey) && !String(url).includes("请替换");

export const supabase = createClient(
  supabaseConfigured ? url : "https://placeholder.supabase.co",
  supabaseConfigured ? anonKey : "placeholder-anon-key"
);
