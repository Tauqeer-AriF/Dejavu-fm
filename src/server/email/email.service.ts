import nodemailer from 'nodemailer';
import { db } from '../db.ts';
import crypto from 'crypto';
import dns from 'dns';

// Force IPv4 DNS resolution globally in Node runtime to prevent IPv6 socket hangs on Docker/Railway
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignored on older Node versions
}

/**
 * Custom DNS lookup that strictly enforces IPv4 (family: 4) resolution.
 * Prevents ENETUNREACH errors on cloud host containers without IPv6 interfaces (like Railway, Cloud Run).
 */
function ipv4Lookup(hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = { family: 4 };
  } else if (typeof options === 'number') {
    options = { family: 4 };
  } else {
    options = { ...options, family: 4 };
  }
  return dns.lookup(hostname, options, callback);
}

/**
 * Formats raw Nodemailer and socket errors into detailed diagnostic strings
 * without masking or stripping underlying error properties.
 */
export function formatRawSmtpError(err: any): string {
  if (!err) return 'Unknown SMTP Error';
  
  const parts: string[] = [];
  
  if (err.message) {
    parts.push(err.message);
  }
  
  if (err.code) {
    parts.push(`Code: ${err.code}`);
  }
  
  if (err.command) {
    parts.push(`Command: ${err.command}`);
  }
  
  if (err.responseCode) {
    parts.push(`Response Code: ${err.responseCode}`);
  }
  
  if (err.response) {
    parts.push(`Response: ${err.response}`);
  }
  
  if (err.syscall) {
    parts.push(`Syscall: ${err.syscall}`);
  }
  
  if (err.address && err.port) {
    parts.push(`Target: ${err.address}:${err.port}`);
  }

  return parts.length > 0 ? parts.join(' | ') : String(err);
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth_user: string;
  auth_pass: string;
  sender_name: string;
  sender_email: string;
  is_enabled: boolean;
}

/**
 * Retrieves the stored SMTP configuration from the database.
 */
export function getSmtpConfig(): SmtpConfig {
  const row = db.prepare("SELECT * FROM email_smtp_settings WHERE id = 1").get() as any;
  if (!row) {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth_user: '',
      auth_pass: '',
      sender_name: 'dejavufm Radio Studio',
      sender_email: '',
      is_enabled: true
    };
  }

  return {
    host: row.host || 'smtp.gmail.com',
    port: Number(row.port) || 587,
    secure: Boolean(row.secure),
    auth_user: row.auth_user || '',
    auth_pass: row.auth_pass || '',
    sender_name: row.sender_name || 'dejavufm Radio Studio',
    sender_email: row.sender_email || row.auth_user || '',
    is_enabled: Boolean(row.is_enabled)
  };
}

/**
 * Creates a standard Node.js nodemailer SMTP transporter instance.
 * Completely native Node TLS/TCP socket based - zero third-party SaaS dependency required.
 */
export function createTransporter(configOverride?: SmtpConfig) {
  const config = configOverride || getSmtpConfig();

  if (!config.auth_user || !config.auth_pass) {
    throw new Error('SMTP user and password/app-password are not configured yet.');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for 587/STARTTLS
    auth: {
      user: config.auth_user,
      pass: config.auth_pass
    },
    tls: {
      rejectUnauthorized: false // Helps avoid SSL handshake failures on custom webmail / self-hosted servers
    },
    lookup: ipv4Lookup,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    // Force IPv4 DNS lookup to prevent Docker/Railway container IPv6 socket hangs
    family: 4
  } as any);
}

/**
 * Verifies SMTP connection and optionally sends a test email to a recipient.
 */
export async function testSmtpConnection(testRecipientEmail?: string, configOverride?: SmtpConfig) {
  const config = configOverride || getSmtpConfig();

  try {
    const transporter = createTransporter(config);
    
    // Step 1: Verify SMTP Handshake
    await transporter.verify();

    let testSent = false;
    let testMessageId = '';

    // Step 2: Send test message if test recipient address provided
    if (testRecipientEmail && testRecipientEmail.trim()) {
      const fromAddress = config.sender_email
        ? `"${config.sender_name}" <${config.sender_email}>`
        : `"${config.sender_name}" <${config.auth_user}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: testRecipientEmail.trim(),
        subject: `✅ SMTP Email Test - ${config.sender_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0A0C16; color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #00F0FF;">
            <h2 style="color: #00F0FF; margin-top: 0;">SMTP Test Successful! 🎉</h2>
            <p style="color: #CBD5E1; font-size: 14px; line-height: 1.5;">
              This is a test email sent from your application's built-in Email Engine.
            </p>
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace; color: #A855F7; margin: 15px 0;">
              <div><strong>SMTP Host:</strong> ${config.host}:${config.port}</div>
              <div><strong>Sender:</strong> ${fromAddress}</div>
              <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
            </div>
            <p style="color: #64748B; font-size: 12px; margin-bottom: 0;">
              Your email management suite is fully configured and ready to dispatch notifications!
            </p>
          </div>
        `,
        text: `SMTP Test Successful! Sent from ${config.host}:${config.port}`
      });

      testSent = true;
      testMessageId = info.messageId || '';

      // Log test message in dispatch history
      logEmailDispatch({
        recipient_email: testRecipientEmail.trim(),
        template_slug: 'smtp_test',
        subject: `✅ SMTP Email Test - ${config.sender_name}`,
        status: 'sent',
        metadata: { messageId: testMessageId, test: true }
      });
    }

    // Update status in DB
    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE email_smtp_settings
      SET status = 'connected', last_error = '', last_tested_at = ?, updated_at = ?
      WHERE id = 1
    `).run(nowStr, nowStr);

    return {
      success: true,
      message: 'SMTP Connection verified successfully!',
      testSent,
      testMessageId
    };
  } catch (err: any) {
    const errorMsg = formatRawSmtpError(err);
    
    // Update error status in DB
    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE email_smtp_settings
      SET status = 'error', last_error = ?, last_tested_at = ?, updated_at = ?
      WHERE id = 1
    `).run(errorMsg, nowStr, nowStr);

    if (testRecipientEmail) {
      logEmailDispatch({
        recipient_email: testRecipientEmail.trim(),
        template_slug: 'smtp_test',
        subject: `❌ SMTP Email Test Failed`,
        status: 'failed',
        error_message: errorMsg,
        metadata: { test: true }
      });
    }

    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Replaces {{placeholder}} tokens in string content safely with variable data map.
 */
export function renderTemplateString(templateStr: string, variables: Record<string, any>): string {
  if (!templateStr) return '';
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, tokenKey) => {
    if (tokenKey in variables && variables[tokenKey] !== undefined && variables[tokenKey] !== null) {
      return String(variables[tokenKey]);
    }
    return match; // Keep placeholder intact if variable not provided
  });
}

export interface SendEmailOptions {
  to: string;
  recipientName?: string;
  subject: string;
  html: string;
  text?: string;
  templateSlug?: string;
  metadata?: Record<string, any>;
}

/**
 * Dispatches a single email using stored SMTP configuration and records execution log.
 */
export async function sendEmail(options: SendEmailOptions) {
  const config = getSmtpConfig();

  if (!config.is_enabled) {
    const err = 'Email engine is currently disabled in settings.';
    logEmailDispatch({
      recipient_email: options.to,
      recipient_name: options.recipientName,
      template_slug: options.templateSlug || 'custom',
      subject: options.subject,
      status: 'failed',
      error_message: err,
      metadata: options.metadata
    });
    return { success: false, error: err };
  }

  try {
    const transporter = createTransporter(config);
    const fromAddress = config.sender_email
      ? `"${config.sender_name}" <${config.sender_email}>`
      : `"${config.sender_name}" <${config.auth_user}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.recipientName ? `"${options.recipientName}" <${options.to}>` : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject
    });

    logEmailDispatch({
      recipient_email: options.to,
      recipient_name: options.recipientName,
      template_slug: options.templateSlug || 'custom',
      subject: options.subject,
      status: 'sent',
      metadata: { ...(options.metadata || {}), messageId: info.messageId }
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    const errorMsg = formatRawSmtpError(err);
    logEmailDispatch({
      recipient_email: options.to,
      recipient_name: options.recipientName,
      template_slug: options.templateSlug || 'custom',
      subject: options.subject,
      status: 'failed',
      error_message: errorMsg,
      metadata: options.metadata
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * Dispatches a system transactional email based on an event key (e.g. 'user_registration', 'password_reset').
 */
export async function sendTriggeredEmail(
  eventKey: string,
  recipientEmail: string,
  recipientName: string = '',
  customVars: Record<string, any> = {}
) {
  try {
    // 1. Check if trigger exists and is enabled
    const trigger = db.prepare("SELECT * FROM email_triggers WHERE event_key = ?").get(eventKey) as any;
    if (!trigger || !trigger.is_enabled) {
      console.log(`[Email Service] Event trigger '${eventKey}' is disabled or not found. Skipping email.`);
      return { success: false, skipped: true, reason: 'Trigger disabled or not found' };
    }

    // 2. Load mapped template
    const template = db.prepare("SELECT * FROM email_templates WHERE slug = ?").get(trigger.template_slug) as any;
    if (!template) {
      console.warn(`[Email Service] Template '${trigger.template_slug}' for event '${eventKey}' not found.`);
      return { success: false, reason: 'Template not found' };
    }

    // 3. Get site default variables
    let siteName = 'dejavufm';
    let siteUrl = 'https://dejavufm.com';
    try {
      const rowName = db.prepare("SELECT value FROM settings WHERE key = 'app_name' OR key = 'app_title'").get() as any;
      if (rowName?.value) siteName = rowName.value;
    } catch (e) {}

    const fullVars: Record<string, any> = {
      site_name: siteName,
      site_url: siteUrl,
      user_name: recipientName || recipientEmail.split('@')[0],
      user_email: recipientEmail,
      date: new Date().toLocaleDateString(),
      ...customVars
    };

    // 4. Render subject and HTML
    const renderedSubject = renderTemplateString(template.subject, fullVars);
    const renderedHtml = renderTemplateString(template.body_html, fullVars);
    const renderedText = renderTemplateString(template.body_text || '', fullVars);

    // 5. Send Email
    return await sendEmail({
      to: recipientEmail,
      recipientName,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
      templateSlug: template.slug,
      metadata: { eventKey, triggerId: trigger.id }
    });
  } catch (err: any) {
    console.error(`[Email Service] Error sending triggered email for '${eventKey}':`, err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Dispatches a newsletter/broadcast campaign to a recipient list in rate-limited batches.
 */
export async function sendBroadcastCampaign(options: {
  templateSlug?: string;
  customSubject?: string;
  customHtml?: string;
  targetAudience?: 'all_users' | 'newsletter_subscribers' | 'custom_list';
  customEmails?: string[]; // Array of email strings if custom_list
  variables?: Record<string, any>;
}) {
  let recipients: Array<{ email: string; name: string }> = [];

  if (options.targetAudience === 'custom_list' && options.customEmails && options.customEmails.length > 0) {
    recipients = options.customEmails.map(e => ({ email: e.trim(), name: e.split('@')[0] })).filter(e => e.email.includes('@'));
  } else {
    // Query users from local SQLite database
    try {
      const users = db.prepare("SELECT email, username FROM users WHERE email IS NOT NULL AND email != ''").all() as any[];
      recipients = users.map(u => ({ email: u.email, name: u.username || u.email.split('@')[0] }));
    } catch (e) {
      console.error('[Email Service] Failed to query users for broadcast:', e);
    }
  }

  if (recipients.length === 0) {
    return { success: false, error: 'No recipients found to send broadcast campaign.' };
  }

  // Load template if slug provided
  let subject = options.customSubject || 'Broadcast Update';
  let htmlBody = options.customHtml || '<p>Hello from studio!</p>';

  if (options.templateSlug) {
    const template = db.prepare("SELECT * FROM email_templates WHERE slug = ?").get(options.templateSlug) as any;
    if (template) {
      subject = options.customSubject || template.subject;
      htmlBody = template.body_html;
    }
  }

  let siteName = 'dejavufm';
  try {
    const rowName = db.prepare("SELECT value FROM settings WHERE key = 'app_name'").get() as any;
    if (rowName?.value) siteName = rowName.value;
  } catch (e) {}

  let sentCount = 0;
  let failCount = 0;

  // Process in small controlled sequential batches to respect SMTP connection limits
  for (const rcpt of recipients) {
    const recipientVars = {
      site_name: siteName,
      user_name: rcpt.name,
      user_email: rcpt.email,
      date: new Date().toLocaleDateString(),
      ...(options.variables || {})
    };

    const finalSubject = renderTemplateString(subject, recipientVars);
    const finalHtml = renderTemplateString(htmlBody, recipientVars);

    const result = await sendEmail({
      to: rcpt.email,
      recipientName: rcpt.name,
      subject: finalSubject,
      html: finalHtml,
      templateSlug: options.templateSlug || 'broadcast',
      metadata: { campaign: true }
    });

    if (result.success) {
      sentCount++;
    } else {
      failCount++;
    }

    // Slight delay (100ms) between outbound emails to prevent port exhaustion / spam flagging
    await new Promise(res => setTimeout(res, 100));
  }

  return {
    success: true,
    totalRecipients: recipients.length,
    sentCount,
    failCount
  };
}

function logEmailDispatch(log: {
  recipient_email: string;
  recipient_name?: string;
  template_slug: string;
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  error_message?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const id = 'log_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO email_logs (id, recipient_email, recipient_name, template_slug, subject, status, error_message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      log.recipient_email,
      log.recipient_name || '',
      log.template_slug || 'custom',
      log.subject,
      log.status,
      log.error_message || '',
      JSON.stringify(log.metadata || {})
    );
  } catch (err) {
    console.error('[Email Log] Failed to write email dispatch log:', err);
  }
}
