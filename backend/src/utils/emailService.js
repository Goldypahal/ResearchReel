const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Email delivery, in order of preference:
 *   1. Resend over HTTPS: RESEND_API_KEY (works on hosts that block SMTP ports)
 *   2. Any SMTP provider: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   3. Legacy Gmail: EMAIL_USER / EMAIL_PASS
 * EMAIL_FROM sets the sender, e.g. "ResearchReel <no-reply@yourdomain.com>". With Resend the
 * domain must be verified there; until then only Resend's test sender works, and it can only
 * deliver to the email address of the Resend account itself.
 */
const RESEND_TEST_SENDER = 'ResearchReel <onboarding@resend.dev>';
const useResend = () => Boolean(process.env.RESEND_API_KEY);
let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
  return transporter;
};

const isEmailConfigured = () => Boolean(useResend() || process.env.SMTP_HOST || (process.env.EMAIL_USER && process.env.EMAIL_PASS));

const fromAddress = () => process.env.EMAIL_FROM
  || (useResend() ? RESEND_TEST_SENDER : `"ResearchReel" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@researchreel.app'}>`);

/** Sends through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email). */
const sendWithResend = async ({ to, subject, html, text, headers }) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, html, text, headers }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    let detail = '';
    try { const body = await res.json(); detail = body.message || body.name || ''; } catch (e) { /* not JSON */ }
    throw new Error(`Resend ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return true;
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const layout = (body) => `
  <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 12px;">
    <h2 style="color: #4f46e5; text-align: center; margin-top: 0;">ResearchReel</h2>
    ${body}
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="text-align: center; color: #9ca3af; font-size: 12px;">You received this email because of activity on your ResearchReel account.</p>
  </div>`;

/** In tests, emails are collected here instead of being sent. */
const outbox = [];
exports.outbox = outbox;

const deliver = async ({ to, subject, html, text, headers, devLog }) => {
  if (process.env.NODE_ENV === 'test') {
    outbox.push({ to, subject, html, text, headers: headers || {} });
    return true;
  }
  if (useResend()) {
    try {
      return await sendWithResend({ to, subject, html, text, headers });
    } catch (error) {
      logger.error(`[email] Failed to send "${subject}" to ${to}: ${error.message}`);
      return false;
    }
  }
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n========== [DEV EMAIL] to ${to} ==========\n${devLog}\n===========================================\n`);
    } else {
      logger.warn(`[email] SMTP is not configured; could not send "${subject}" to ${to}. Set RESEND_API_KEY (or SMTP_HOST/SMTP_USER/SMTP_PASS), or REQUIRE_EMAIL_VERIFICATION=false.`);
    }
    return false;
  }
  try {
    await t.sendMail({ from: fromAddress(), to, subject, html, text, headers });
    return true;
  } catch (error) {
    logger.error(`[email] Failed to send "${subject}" to ${to}: ${error.message}`);
    return false;
  }
};

exports.isEmailConfigured = isEmailConfigured;

exports.sendOTP = async (email, otp) => deliver({
  to: email,
  subject: 'Your ResearchReel verification code',
  devLog: `Verification code: ${otp}`,
  html: layout(`
    <p>Use this code to verify your email address:</p>
    <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; border-radius: 8px;">${escapeHtml(otp)}</div>
    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`)
});

exports.sendPasswordReset = async (email, token) => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const link = `${base}/auth/forget-password?token=${encodeURIComponent(token)}`;
  return deliver({
    to: email,
    subject: 'Reset your ResearchReel password',
    devLog: `Password reset link: ${link}`,
    html: layout(`
      <p>We received a request to reset your password. This link is valid for 1 hour.</p>
      <p style="text-align:center;margin:28px 0;"><a href="${escapeHtml(link)}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset password</a></p>
      <p style="color:#6b7280;font-size:14px;">If you didn't request this, you can ignore this email — your password won't change.</p>`)
  });
};

/**
 * Notification email (comments, follows, lecture reminders…). `unsubscribeUrl` is the footer
 * link; `oneClickUrl` feeds the RFC 8058 List-Unsubscribe headers mail apps use.
 */
exports.sendNotificationEmail = ({ to, subject, heading, body, quote, ctaLabel, ctaUrl, reason, unsubscribeUrl, oneClickUrl }) => {
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:28px;color:#111827;">
    <p style="color:#4f46e5;font-weight:700;margin:0 0 18px;">ResearchReel</p>
    <p style="font-size:17px;font-weight:600;margin:0 0 10px;">${escapeHtml(heading)}</p>
    ${body ? `<p style="color:#374151;margin:0 0 16px;line-height:1.5;">${escapeHtml(body)}</p>` : ''}
    ${quote ? `<blockquote style="margin:0 0 18px;padding:10px 14px;border-left:3px solid #c7d2fe;background:#f5f5ff;color:#374151;border-radius:4px;">${escapeHtml(quote)}</blockquote>` : ''}
    ${ctaUrl ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">${escapeHtml(ctaLabel || 'Open ResearchReel')}</a>` : ''}
    <p style="margin-top:28px;color:#6b7280;font-size:12px;line-height:1.5;">
      ${escapeHtml(reason || 'You received this because of your notification settings.')}
      ${unsubscribeUrl ? `<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe from these emails</a>` : ''}
    </p>
  </div>`;
  const text = [heading, body, quote && `"${quote}"`, ctaUrl && `${ctaLabel || 'Open'}: ${ctaUrl}`, '', reason, unsubscribeUrl && `Unsubscribe: ${unsubscribeUrl}`]
    .filter((x) => x !== null && x !== undefined && x !== false).join('\n');
  const headers = oneClickUrl ? { 'List-Unsubscribe': `<${oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
  return deliver({ to, subject, html, text, headers, devLog: `${subject}\n${text}` });
};
