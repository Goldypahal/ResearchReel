const nodemailer = require('nodemailer');
const { AppError } = require('./errors');

/**
 * SMTP transport. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS for any provider
 * (SES, Postmark, Mailgun…); EMAIL_USER/EMAIL_PASS alone still means Gmail.
 */
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const isConfigured = Boolean(smtpUser && smtpPass);

const transporter = isConfigured
  ? nodemailer.createTransport(
      process.env.SMTP_HOST
        ? {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: { user: smtpUser, pass: smtpPass },
          }
        : { service: 'gmail', auth: { user: smtpUser, pass: smtpPass } }
    )
  : null;

const FROM = process.env.EMAIL_FROM || `"ResearchReel" <${smtpUser || 'no-reply@researchreel.app'}>`;

const codeEmail = (heading, intro, code) => `
  <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px;">
    <h2 style="color: #4f46e5; margin: 0 0 16px;">ResearchReel</h2>
    <p style="color:#111827; font-weight:600; margin:0 0 8px;">${heading}</p>
    <p style="color:#374151; margin:0 0 20px;">${intro}</p>
    <div style="background:#f3f4f6; padding:18px; text-align:center; font-size:30px; font-weight:700; letter-spacing:6px; color:#111827; border-radius:8px;">${code}</div>
    <p style="margin-top:20px; color:#6b7280; font-size:13px;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  </div>`;

/**
 * Sends an email. In production a missing SMTP config is an error (the user
 * would otherwise wait for a code that never arrives); in development the
 * code is printed to the server log instead.
 */
/** Messages "sent" while NODE_ENV=test, so integration tests can read codes and links. */
const outbox = [];
exports.outbox = outbox;

const send = async ({ to, subject, html, text, headers, devNote }) => {
  if (process.env.NODE_ENV === 'test') {
    outbox.push({ to, subject, html, text, headers: headers || {}, devNote });
    return;
  }
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Email delivery is not configured on this server.', 503, 'EMAIL_NOT_CONFIGURED');
    }
    console.log(`\n[dev email] to=${to} subject="${subject}"${devNote ? `\n  ${devNote}` : ''}\n`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, text, headers });
  } catch (error) {
    console.error('[email] delivery failed:', error.message);
    throw new AppError('We could not send the email. Please try again in a minute.', 502, 'EMAIL_DELIVERY_FAILED');
  }
};

exports.isConfigured = isConfigured;

exports.sendOTP = (email, otp) =>
  send({
    to: email,
    subject: 'Your ResearchReel verification code',
    html: codeEmail('Confirm your email', 'Use this code to finish creating your ResearchReel account:', otp),
    devNote: `verification code: ${otp}`,
  });

exports.sendStudentCode = (email, code) =>
  send({
    to: email,
    subject: 'Verify your student status on ResearchReel',
    html: codeEmail('Confirm your university email', 'Enter this code on ResearchReel to get the verified student badge:', code),
    devNote: `student verification code: ${code}`,
  });

exports.sendPasswordReset = (email, code) =>
  send({
    to: email,
    subject: 'Reset your ResearchReel password',
    html: codeEmail('Reset your password', 'Enter this code on ResearchReel to choose a new password:', code).replace('expires in 10 minutes', 'expires in 15 minutes'),
    devNote: `password reset code: ${code}`,
  });

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Activity email (comments, follows, lecture reminders...). `unsubscribeUrl`
 * is used for the footer link and RFC 8058 one-click List-Unsubscribe headers.
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
  return send({ to, subject, html, text, headers, devNote: `${subject} -> ${ctaUrl || ''}` });
};
