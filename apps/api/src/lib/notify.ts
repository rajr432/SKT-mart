import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";
import nodemailer, { type Transporter } from "nodemailer";

// Email transporter — configured via SMTP_* env vars. If not configured,
// emails are logged (dev mode) instead of sent, so notify() never throws.
let cachedTransporter: Transporter | null = null;
let transporterReady = false;

function getTransporter(): Transporter | null {
  if (transporterReady) return cachedTransporter;
  transporterReady = true;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    // eslint-disable-next-line no-console
    console.log("[notify] SMTP not configured — emails will be logged only");
    cachedTransporter = null;
    return null;
  }
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  // eslint-disable-next-line no-console
  console.log(`[notify] SMTP ready: ${host}:${port}`);
  return cachedTransporter;
}

async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) {
    // eslint-disable-next-line no-console
    console.log(`[email:DRY] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? `"SKT Mart" <no-reply@sktmart.online>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[email] send failed:", (e as Error).message);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail(title: string, body: string, link?: string) {
  const web = process.env.WEB_URL ?? "https://sktmart.online";
  // Only allow http(s) schemes and same-origin-ish paths in the CTA href;
  // escape attribute so attacker-controlled link can't break out of the href.
  const safeHref = link && /^\/[A-Za-z0-9_\-/?=&.#%]*$/.test(link) ? `${web}${link}` : web;
  const cta = link
    ? `<a href="${escapeHtml(safeHref)}" style="display:inline-block;margin-top:16px;padding:12px 22px;background:linear-gradient(90deg,#2874f0,#7b4bff);color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View details →</a>`
    : "";
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fb;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(90deg,#2874f0,#7b4bff);padding:16px 20px;color:#fff">
      <strong style="font-size:18px">SKT Mart</strong>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#111">${escapeHtml(title)}</h2>
      <p style="color:#444;line-height:1.55;margin:8px 0 0;font-size:14px">${escapeHtml(body)}</p>
      ${cta}
    </div>
    <div style="padding:12px 20px;border-top:1px solid #eee;color:#888;font-size:12px">
      You received this because you have an account on <a href="${web}" style="color:#2874f0">SKT Mart</a>.
    </div>
  </div>
</body></html>`;
}

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
) {
  // eslint-disable-next-line no-console
  console.log(`[NOTIFY:${type}] -> ${userId}: ${title}`);
  const [record, user] = await Promise.all([
    prisma.notification.create({ data: { userId, type, title, body, link } }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);
  if (user?.email) {
    void sendEmail(user.email, title, renderEmail(title, body, link));
  }
  return record;
}
