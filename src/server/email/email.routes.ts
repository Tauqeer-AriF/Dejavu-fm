import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import {
  getSmtpConfig,
  testSmtpConnection,
  sendEmail,
  sendBroadcastCampaign,
  sendTriggeredEmail,
  renderTemplateString
} from './email.service.ts';
import crypto from 'crypto';

export const emailRouter = Router();

// Middleware helper to check admin auth
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  next();
};

// 1. Get SMTP Configuration (Masks password)
emailRouter.get('/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const config = getSmtpConfig();
    res.json({
      ...config,
      auth_pass: config.auth_pass ? '••••••••' : '' // Mask password for UI
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 2. Update SMTP Configuration
emailRouter.post('/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const { host, port, secure, auth_user, auth_pass, sender_name, sender_email, is_enabled } = req.body;

    // Load current config to handle unchanged masked password
    const currentConfig = getSmtpConfig();
    const finalPass = (auth_pass && auth_pass !== '••••••••') ? auth_pass : currentConfig.auth_pass;

    const nowStr = new Date().toISOString();

    db.prepare(`
      UPDATE email_smtp_settings
      SET host = ?, port = ?, secure = ?, auth_user = ?, auth_pass = ?, sender_name = ?, sender_email = ?, is_enabled = ?, updated_at = ?
      WHERE id = 1
    `).run(
      host || 'smtp.gmail.com',
      Number(port) || 587,
      secure ? 1 : 0,
      (auth_user || '').trim(),
      finalPass,
      (sender_name || 'dejavufm Radio Studio').trim(),
      (sender_email || '').trim(),
      is_enabled ? 1 : 0,
      nowStr
    );

    res.json({ success: true, message: 'SMTP settings updated successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 3. Live Test SMTP Connection & Send Test Email
emailRouter.post('/test-connection', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { test_email, host, port, secure, auth_user, auth_pass, sender_name, sender_email } = req.body;

    const currentConfig = getSmtpConfig();
    const finalPass = (auth_pass && auth_pass !== '••••••••') ? auth_pass : currentConfig.auth_pass;

    const testConfig = {
      host: host || currentConfig.host,
      port: Number(port) || currentConfig.port,
      secure: Boolean(secure),
      auth_user: (auth_user !== undefined ? auth_user : currentConfig.auth_user).trim(),
      auth_pass: finalPass,
      sender_name: (sender_name || currentConfig.sender_name).trim(),
      sender_email: (sender_email || currentConfig.sender_email).trim(),
      is_enabled: true
    };

    const result = await testSmtpConnection(test_email, testConfig);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// 4. Get All Templates
emailRouter.get('/templates', requireAdmin, (req: Request, res: Response) => {
  try {
    const templates = db.prepare("SELECT * FROM email_templates ORDER BY is_system DESC, name ASC").all() as any[];
    const parsed = templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables || '[]')
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 5. Create or Update Template
emailRouter.post('/templates', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id, slug, name, category, subject, body_html, body_text, variables } = req.body;

    if (!name || !subject || !body_html) {
      return res.status(400).json({ error: 'Name, Subject, and HTML Body are required.' });
    }

    const templateSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const varArray = Array.isArray(variables) ? variables : [];
    const varJson = JSON.stringify(varArray);
    const nowStr = new Date().toISOString();

    if (id) {
      // Update
      db.prepare(`
        UPDATE email_templates
        SET name = ?, category = ?, subject = ?, body_html = ?, body_text = ?, variables = ?, updated_at = ?
        WHERE id = ?
      `).run(name, category || 'transactional', subject, body_html, body_text || '', varJson, nowStr, id);

      res.json({ success: true, message: 'Template updated successfully!', id });
    } else {
      // Create
      const newId = 'tpl_' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO email_templates (id, slug, name, category, subject, body_html, body_text, variables, is_system, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(newId, templateSlug, name, category || 'transactional', subject, body_html, body_text || '', varJson, nowStr);

      res.json({ success: true, message: 'Template created successfully!', id: newId });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 6. Delete Custom Template
emailRouter.delete('/templates/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const tpl = db.prepare("SELECT is_system FROM email_templates WHERE id = ?").get(id) as any;

    if (!tpl) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (tpl.is_system) {
      return res.status(400).json({ error: 'Core system templates cannot be deleted.' });
    }

    db.prepare("DELETE FROM email_templates WHERE id = ?").run(id);
    res.json({ success: true, message: 'Template deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 7. Get Event Triggers
emailRouter.get('/triggers', requireAdmin, (req: Request, res: Response) => {
  try {
    const triggers = db.prepare("SELECT * FROM email_triggers ORDER BY event_name ASC").all();
    res.json(triggers);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 8. Update Event Trigger Mapping / Toggle
emailRouter.put('/triggers/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { template_slug, is_enabled } = req.body;

    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE email_triggers
      SET template_slug = ?, is_enabled = ?, updated_at = ?
      WHERE id = ?
    `).run(template_slug, is_enabled ? 1 : 0, nowStr, id);

    res.json({ success: true, message: 'Trigger configuration updated.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 9. Preview or Send Direct Test Template Email
emailRouter.post('/send-test-template', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { recipient_email, template_id, custom_vars } = req.body;

    if (!recipient_email || !template_id) {
      return res.status(400).json({ error: 'Recipient email and Template ID required.' });
    }

    const tpl = db.prepare("SELECT * FROM email_templates WHERE id = ?").get(template_id) as any;
    if (!tpl) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let siteName = 'dejavufm';
    try {
      const rowName = db.prepare("SELECT value FROM settings WHERE key = 'app_name'").get() as any;
      if (rowName?.value) siteName = rowName.value;
    } catch (e) {}

    const sampleVars = {
      site_name: siteName,
      site_url: 'https://dejavufm.com',
      user_name: 'Test Listener',
      show_title: 'The Underground Drive Show',
      dj_name: 'DJ Waynee',
      show_time: '7:00 PM GMT',
      watch_url: 'https://dejavufm.com/watch',
      reset_code: '894201',
      newsletter_title: 'Weekly Studio Highlights',
      headline: 'Sub-bass frequencies take over Friday night',
      content_body: 'Check out our new catch-up archives and live show line-up for this weekend!',
      ...(custom_vars || {})
    };

    const renderedSubject = renderTemplateString(tpl.subject, sampleVars);
    const renderedHtml = renderTemplateString(tpl.body_html, sampleVars);

    const result = await sendEmail({
      to: recipient_email,
      recipientName: 'Test Listener',
      subject: `[PREVIEW] ${renderedSubject}`,
      html: renderedHtml,
      templateSlug: tpl.slug,
      metadata: { testPreview: true }
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 10. Dispatch Broadcast Campaign
emailRouter.post('/broadcast', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { template_slug, custom_subject, custom_html, target_audience, custom_emails } = req.body;

    const result = await sendBroadcastCampaign({
      templateSlug: template_slug,
      customSubject: custom_subject,
      customHtml: custom_html,
      targetAudience: target_audience || 'all_users',
      customEmails: custom_emails || []
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 11. Get Email Dispatch History Vault
emailRouter.get('/logs', requireAdmin, (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '20')));
    const offset = (page - 1) * limit;

    let countSql = "SELECT COUNT(*) as total FROM email_logs";
    let querySql = "SELECT * FROM email_logs";
    const params: any[] = [];

    if (status && status !== 'ALL') {
      countSql += " WHERE status = ?";
      querySql += " WHERE status = ?";
      params.push(status);
    }

    querySql += " ORDER BY sent_at DESC LIMIT ? OFFSET ?";

    const totalRow = db.prepare(countSql).get(...(status && status !== 'ALL' ? [status] : [])) as { total: number };
    const logs = db.prepare(querySql).all(...params, limit, offset);

    res.json({
      logs: logs.map((l: any) => ({
        ...l,
        metadata: JSON.parse(l.metadata || '{}')
      })),
      pagination: {
        total: totalRow.total,
        page,
        limit,
        totalPages: Math.ceil(totalRow.total / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 12. Clear Email Logs
emailRouter.post('/logs/clear', requireAdmin, (req: Request, res: Response) => {
  try {
    db.prepare("DELETE FROM email_logs").run();
    res.json({ success: true, message: 'Email dispatch logs cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// 13. Get Email Engine Analytics & KPI Summary
emailRouter.get('/stats', requireAdmin, (req: Request, res: Response) => {
  try {
    const config = getSmtpConfig();
    const settingsRow = db.prepare("SELECT status FROM email_smtp_settings WHERE id = 1").get() as any;
    const totalSent = (db.prepare("SELECT COUNT(*) as count FROM email_logs WHERE status = 'sent'").get() as any)?.count || 0;
    const totalFailed = (db.prepare("SELECT COUNT(*) as count FROM email_logs WHERE status = 'failed'").get() as any)?.count || 0;
    const activeTriggers = (db.prepare("SELECT COUNT(*) as count FROM email_triggers WHERE is_enabled = 1").get() as any)?.count || 0;
    const totalTemplates = (db.prepare("SELECT COUNT(*) as count FROM email_templates").get() as any)?.count || 0;
    const lastSentRow = db.prepare("SELECT sent_at FROM email_logs WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 1").get() as any;

    res.json({
      status: settingsRow?.status || 'disconnected',
      isEnabled: config.is_enabled,
      host: config.host,
      sender: config.sender_email || config.auth_user,
      totalSent,
      totalFailed,
      activeTriggers,
      totalTemplates,
      lastSentAt: lastSentRow?.sent_at || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});
