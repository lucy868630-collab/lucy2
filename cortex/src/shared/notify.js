import { config } from "./config.js";

/** 事务性确认邮件文案。不发营销内容，不承诺名额时间，移除渠道用真实联系邮箱。 */
const COPY = {
  zh: {
    subject: "Relaywork — 已收到你的候补名单申请",
    text: (email, contact) => [
      "你好，",
      "",
      `我们已收到 ${email} 提交的 Relaywork 候补名单申请。这是一封确认邮件，不是营销邮件。`,
      "名额开放时我们会用这个邮箱联系你；在此之前不会发送推广内容，也不会出售或共享你的信息。",
      `如果这不是你提交的，或希望从名单中移除，直接回复本邮件，或发到 ${contact}。`,
      "",
      "Relaywork",
    ].join("\n"),
  },
  en: {
    subject: "Relaywork — you're on the waitlist",
    text: (email, contact) => [
      "Hi,",
      "",
      `We received a Relaywork waitlist signup from ${email}. This is a confirmation, not a marketing email.`,
      "We will use this address to contact you when a spot opens. Until then we will not send promotional content, and we do not sell or share your details.",
      `If this was not you, or you would like to be removed from the list, reply to this email or write to ${contact}.`,
      "",
      "Relaywork",
    ].join("\n"),
  },
};

/** 邮件通道状态：全部可选，缺失时降级而不是阻断主流程。 */
export function mailStatus() {
  return {
    configured: config.mail.configured,
    provider: config.mail.configured ? "resend" : "none",
    confirmation_enabled: config.mail.enabled,
  };
}

/**
 * 发送 waitlist 确认邮件。
 * 约定：永不抛异常、永不记录完整邮箱，任何失败只返回状态字符串，
 * 保证邮件通道故障不会影响名单入库。
 */
export async function sendWaitlistConfirmation({ email, lang = "zh", log }) {
  if (!config.mail.enabled || !config.mail.configured) return "skipped";
  const copy = COPY[lang === "en" ? "en" : "zh"];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.mail.resendKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.mail.from,
        to: [email],
        ...(config.mail.replyTo ? { reply_to: config.mail.replyTo } : {}),
        subject: copy.subject,
        text: copy.text(email, config.site.contactEmail),
      }),
      signal: AbortSignal.timeout(config.mail.timeoutMs),
    });
    if (!res.ok) {
      log?.info?.("waitlist.mail_failed", { status: res.status });
      return "failed";
    }
    log?.info?.("waitlist.mail_sent", { lang });
    return "sent";
  } catch (err) {
    log?.info?.("waitlist.mail_error", { message: String(err?.message) });
    return "failed";
  }
}
