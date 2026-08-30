import Database from '../sqlite.ts';

export function initEmailDb(db: any) {
  try {
    // 1. SMTP Settings Table (Zero third-party SaaS dependency, standard Node SMTP)
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_smtp_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
        port INTEGER NOT NULL DEFAULT 587,
        secure INTEGER NOT NULL DEFAULT 0, -- 0 for STARTTLS (587), 1 for TLS/SSL (465)
        auth_user TEXT DEFAULT '',
        auth_pass TEXT DEFAULT '',
        sender_name TEXT DEFAULT 'dejavufm Radio Studio',
        sender_email TEXT DEFAULT '',
        is_enabled INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'not_configured', -- 'not_configured', 'connected', 'error'
        last_error TEXT DEFAULT '',
        last_tested_at TEXT DEFAULT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default row if not exists
    const existingSettings = db.prepare("SELECT id FROM email_smtp_settings WHERE id = 1").get();
    if (!existingSettings) {
      db.prepare(`
        INSERT INTO email_smtp_settings (id, host, port, secure, auth_user, auth_pass, sender_name, sender_email, is_enabled, status)
        VALUES (1, 'smtp.gmail.com', 587, 0, '', '', 'dejavufm Radio Studio', '', 1, 'not_configured')
      `).run();
    }

    // 2. Email Templates Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'transactional', -- 'transactional', 'newsletter', 'system'
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT DEFAULT '',
        variables TEXT DEFAULT '[]', -- JSON array of variable placeholder names e.g. ["user_name", "site_name"]
        is_system INTEGER NOT NULL DEFAULT 0, -- 1 for core templates, 0 for custom
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Email Event Triggers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_triggers (
        id TEXT PRIMARY KEY,
        event_key TEXT UNIQUE NOT NULL, -- e.g. 'welcome_user', 'show_reminder', 'password_reset'
        event_name TEXT NOT NULL,
        description TEXT DEFAULT '',
        template_slug TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Outbound Email Dispatch Log Vault Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id TEXT PRIMARY KEY,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT DEFAULT '',
        template_slug TEXT DEFAULT 'custom',
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'queued'
        error_message TEXT DEFAULT '',
        metadata TEXT DEFAULT '{}',
        sent_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default system templates if empty
    seedDefaultTemplatesAndTriggers(db);

    console.log('[Email DB] Initialized email configuration and template schemas successfully.');
  } catch (err) {
    console.error('[Email DB] Error initializing email tables:', err);
  }
}

function seedDefaultTemplatesAndTriggers(db: any) {
  const templateCount = db.prepare("SELECT COUNT(*) as count FROM email_templates").get() as { count: number };
  
  if (templateCount.count === 0) {
    const defaultTemplates = [
      {
        id: 'tpl_welcome',
        slug: 'welcome_user',
        name: 'Welcome New Listener',
        category: 'transactional',
        subject: 'Welcome to {{site_name}}, {{user_name}}! 🎧',
        body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0C16; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #00F0FF; font-size: 28px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">{{site_name}}</h1>
    <p style="color: #94A3B8; font-size: 14px; margin-top: 5px;">Direct from the Heart of the Capital</p>
  </div>
  <div style="background-color: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px;">
    <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Welcome to the Family, {{user_name}}! 🎉</h2>
    <p style="color: #CBD5E1; line-height: 1.6; font-size: 15px;">
      Thank you for creating an account with <strong>{{site_name}}</strong>. You now have full access to live radio streams, exclusive archives, studio chats, and live DJ shoutouts!
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{site_url}}" style="background: linear-gradient(135deg, #A855F7, #00F0FF); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 15px;">
        Tune In Live Now
      </a>
    </div>
  </div>
  <div style="text-align: center; color: #64748B; font-size: 12px; border-t: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
    Sent with ❤️ from {{site_name}} Radio Studio • You received this because you signed up on {{site_url}}.
  </div>
</div>
        `.trim(),
        body_text: 'Welcome to {{site_name}}, {{user_name}}! Thank you for registering. Tune in live at {{site_url}}',
        variables: JSON.stringify(['user_name', 'site_name', 'site_url']),
        is_system: 1
      },
      {
        id: 'tpl_show_reminder',
        slug: 'show_reminder',
        name: 'Live Show Broadcast Alert',
        category: 'alert',
        subject: '🔴 {{show_title}} with {{dj_name}} is LIVE NOW on {{site_name}}!',
        body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0C16; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
  <div style="background-color: #EF4444; color: #ffffff; text-align: center; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; margin-bottom: 20px; text-transform: uppercase;">
    LIVE BROADCAST ALERT
  </div>
  <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 10px 0;">{{show_title}}</h1>
  <p style="color: #00F0FF; font-size: 16px; font-weight: bold; margin-top: 0;">Resident Host: {{dj_name}}</p>
  
  <p style="color: #CBD5E1; line-height: 1.6; font-size: 15px; margin: 20px 0;">
    Hey {{user_name}}, your favorite broadcast session is going live right now in the studio! Don't miss out on track drops, live studio chat, and listener shoutouts.
  </p>

  <div style="background-color: rgba(0,240,255,0.05); border-left: 4px solid #00F0FF; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
    <p style="margin: 0; color: #94A3B8; font-size: 13px;">Slot Time: <strong style="color: #ffffff;">{{show_time}}</strong></p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{watch_url}}" style="background-color: #A855F7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 15px;">
      Watch & Listen Live
    </a>
  </div>

  <div style="text-align: center; color: #64748B; font-size: 12px; border-t: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
    {{site_name}} Broadcast Schedule • Managed via Admin Email Engine
  </div>
</div>
        `.trim(),
        body_text: '{{show_title}} with {{dj_name}} is LIVE NOW on {{site_name}}! Watch live at {{watch_url}}',
        variables: JSON.stringify(['show_title', 'dj_name', 'user_name', 'show_time', 'watch_url', 'site_name']),
        is_system: 1
      },
      {
        id: 'tpl_password_reset',
        slug: 'password_reset',
        name: 'Password Reset Code',
        category: 'system',
        subject: '🔒 Reset Your Account Password - {{site_name}}',
        body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0C16; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
  <h2 style="color: #00F0FF; margin-top: 0;">Password Reset Request</h2>
  <p style="color: #CBD5E1; line-height: 1.6; font-size: 15px;">
    Hello {{user_name}}, we received a request to reset your password for your <strong>{{site_name}}</strong> account.
  </p>
  <div style="background-color: rgba(255,255,255,0.05); text-align: center; padding: 20px; border-radius: 12px; margin: 25px 0;">
    <p style="color: #94A3B8; font-size: 13px; margin: 0 0 10px 0;">YOUR SECURITY CODE</p>
    <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #A855F7; letter-spacing: 4px;">{{reset_code}}</span>
  </div>
  <p style="color: #94A3B8; font-size: 13px; line-height: 1.5;">
    If you did not request a password reset, please ignore this email. Your account remains completely secure.
  </p>
  <div style="text-align: center; color: #64748B; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
    {{site_name}} Security System
  </div>
</div>
        `.trim(),
        body_text: 'Hello {{user_name}}, your {{site_name}} password reset code is: {{reset_code}}',
        variables: JSON.stringify(['user_name', 'site_name', 'reset_code']),
        is_system: 1
      },
      {
        id: 'tpl_newsletter_digest',
        slug: 'weekly_newsletter',
        name: 'Weekly Station Newsletter',
        category: 'newsletter',
        subject: '📻 {{newsletter_title}} - This Week on {{site_name}}',
        body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0C16; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #A855F7; font-size: 26px; margin: 0;">{{site_name}} WEEKLY DIGEST</h1>
    <p style="color: #94A3B8; font-size: 14px;">The underground sound highlights & upcoming shows</p>
  </div>

  <div style="background-color: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
    <h3 style="color: #00F0FF; margin-top: 0;">{{headline}}</h3>
    <p style="color: #CBD5E1; line-height: 1.6; font-size: 15px;">
      {{content_body}}
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{site_url}}" style="background: linear-gradient(135deg, #00F0FF, #A855F7); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; display: inline-block;">
      Explore Full Schedule & Catchups
    </a>
  </div>

  <div style="text-align: center; color: #64748B; font-size: 12px; border-t: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
    You are receiving this newsletter as a registered listener on {{site_name}}.
  </div>
</div>
        `.trim(),
        body_text: '{{newsletter_title}} - {{headline}}\n\n{{content_body}}\n\nVisit {{site_url}}',
        variables: JSON.stringify(['newsletter_title', 'headline', 'content_body', 'site_name', 'site_url']),
        is_system: 0
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO email_templates (id, slug, name, category, subject, body_html, body_text, variables, is_system)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tpl of defaultTemplates) {
      insertStmt.run(tpl.id, tpl.slug, tpl.name, tpl.category, tpl.subject, tpl.body_html, tpl.body_text, tpl.variables, tpl.is_system);
    }
  }

  // Seed default triggers if empty
  const triggerCount = db.prepare("SELECT COUNT(*) as count FROM email_triggers").get() as { count: number };
  if (triggerCount.count === 0) {
    const defaultTriggers = [
      {
        id: 'trig_welcome',
        event_key: 'user_registration',
        event_name: 'New User Account Registration',
        description: 'Sends a welcome email whenever a new listener creates an account',
        template_slug: 'welcome_user',
        is_enabled: 1
      },
      {
        id: 'trig_show',
        event_key: 'live_show_start',
        event_name: 'Live Broadcast Show Starting',
        description: 'Sends show start alerts to listeners who opted into show notifications',
        template_slug: 'show_reminder',
        is_enabled: 1
      },
      {
        id: 'trig_reset',
        event_key: 'password_reset',
        event_name: 'User Password Reset Code',
        description: 'Sends security verification codes for password resets',
        template_slug: 'password_reset',
        is_enabled: 1
      }
    ];

    const insertTrigStmt = db.prepare(`
      INSERT INTO email_triggers (id, event_key, event_name, description, template_slug, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const trig of defaultTriggers) {
      insertTrigStmt.run(trig.id, trig.event_key, trig.event_name, trig.description, trig.template_slug, trig.is_enabled);
    }
  }
}
