import axios from 'axios';
import { db } from '../db.ts';

export interface GatewaySessionStatus {
  status: 'CONNECTED' | 'SCAN_QR_CODE' | 'STARTING' | 'STOPPED' | 'FAILED' | 'OFFLINE';
  connected: boolean;
  sessionName: string;
  phone?: string;
  raw?: any;
  error?: string;
}

export interface GatewayParsedMessage {
  platform: 'whatsapp';
  senderId: string;
  senderName: string;
  text: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'unsupported';
  mediaUrl?: string;
  timestamp: number;
  messageId: string;
  fromMe: boolean;
  recipient?: string;
}

export class WhatsappGatewayService {
  private static pollTimer: NodeJS.Timeout | null = null;
  private static isSyncing = false;
  private static cachedIo: any = null;

  /**
   * Initialize background WhatsApp sync worker.
   */
  public static initialize(io: any): void {
    this.cachedIo = io;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    console.log('[WhatsApp Gateway] Initializing continuous WhatsApp message sync...');

    // Run first sync immediately after 2 seconds
    setTimeout(() => {
      this.syncAll(io).catch(() => {});
    }, 2000);

    // Continuous background sync polling every 4 seconds
    this.pollTimer = setInterval(() => {
      this.syncAll(io).catch(() => {});
    }, 4000);
  }

  /**
   * Trigger on-demand or periodic synchronization across all active chats.
   */
  public static async syncAll(io?: any): Promise<{ syncedCount: number; chatsCount: number }> {
    if (this.isSyncing) return { syncedCount: 0, chatsCount: 0 };
    if (!db.open) return { syncedCount: 0, chatsCount: 0 };

    const activeIo = io || this.cachedIo;

    try {
      this.isSyncing = true;
      const configRow = db.prepare("SELECT value FROM settings WHERE key = 'studio_platform_configs'").get() as any;
      if (!configRow || !configRow.value) {
        return { syncedCount: 0, chatsCount: 0 };
      }

      let config: any = {};
      try {
        const parsed = JSON.parse(configRow.value);
        config = parsed.whatsapp || {};
      } catch {
        return { syncedCount: 0, chatsCount: 0 };
      }

      const serverUrl = config.serverUrl;
      if (!serverUrl) {
        return { syncedCount: 0, chatsCount: 0 };
      }

      const apiKey = config.apiKey;
      const sessionName = config.sessionName || 'default';

      const result = await this.syncRecentMessages(serverUrl, apiKey, sessionName, activeIo);
      return result;
    } catch (err: any) {
      return { syncedCount: 0, chatsCount: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronize recent chats & messages from WAHA / Evolution API instance.
   */
  public static async syncRecentMessages(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default',
    io?: any
  ): Promise<{ syncedCount: number; chatsCount: number }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) return { syncedCount: 0, chatsCount: 0 };

    const headers = this.getHeaders(apiKey);
    let totalNewMessages = 0;

    try {
      // 1. Fetch chats overview from WAHA
      let chats: any[] = [];
      try {
        const res = await axios.get(`${base}/api/${encodeURIComponent(sessionName)}/chats/overview`, {
          params: { limit: 25 },
          headers,
          timeout: 8000
        });
        if (Array.isArray(res.data)) chats = res.data;
      } catch {
        try {
          const res2 = await axios.get(`${base}/api/chats/overview`, {
            params: { session: sessionName, limit: 25 },
            headers,
            timeout: 8000
          });
          if (Array.isArray(res2.data)) chats = res2.data;
        } catch {
          try {
            const res3 = await axios.get(`${base}/api/chats`, {
              params: { session: sessionName, limit: 25 },
              headers,
              timeout: 8000
            });
            if (Array.isArray(res3.data)) chats = res3.data;
          } catch (e: any) {
            // Cannot reach chats endpoint
          }
        }
      }

      if (!Array.isArray(chats) || chats.length === 0) {
        return { syncedCount: 0, chatsCount: 0 };
      }

      // 2. Fetch contacts map if available to get display names
      const contactNameMap = new Map<string, string>();
      try {
        const contactsRes = await axios.get(`${base}/api/contacts/all`, {
          params: { session: sessionName },
          headers,
          timeout: 6000
        });
        if (Array.isArray(contactsRes.data)) {
          for (const c of contactsRes.data) {
            const cid = typeof c.id === 'object' ? c.id?._serialized || c.id?.user : c.id;
            const cName = c.name || c.pushname || c.verifiedName || '';
            if (cid && cName) {
              contactNameMap.set(cid, cName);
              contactNameMap.set(String(cid).replace(/@.+/, ''), cName);
            }
          }
        }
      } catch {
        // Non-blocking
      }

      const messagesToIngest: GatewayParsedMessage[] = [];

      // 3. For each chat, fetch recent messages and merge lastMessage
      for (const chat of chats) {
        const rawChatId = typeof chat.id === 'object' ? chat.id?._serialized || chat.id?.user : chat.id;
        if (!rawChatId) continue;

        const chatName = chat.name || contactNameMap.get(rawChatId) || contactNameMap.get(String(rawChatId).replace(/@.+/, '')) || '';

        const messagesToProcess: any[] = [];
        if (chat.lastMessage) {
          messagesToProcess.push(chat.lastMessage);
        }

        // Fetch recent messages for this chat
        try {
          let msgRes;
          try {
            msgRes = await axios.get(`${base}/api/${encodeURIComponent(sessionName)}/chats/${encodeURIComponent(rawChatId)}/messages`, {
              params: { limit: 8 },
              headers,
              timeout: 6000
            });
          } catch {
            msgRes = await axios.get(`${base}/api/chats/${encodeURIComponent(rawChatId)}/messages`, {
              params: { session: sessionName, limit: 8 },
              headers,
              timeout: 6000
            });
          }

          if (Array.isArray(msgRes?.data)) {
            for (const m of msgRes.data) {
              const mId = typeof m.id === 'object' ? m.id?._serialized || m.id?.id : m.id;
              if (!messagesToProcess.some(existing => (typeof existing.id === 'object' ? existing.id?._serialized || existing.id?.id : existing.id) === mId)) {
                messagesToProcess.push(m);
              }
            }
          }
        } catch {}

        for (const m of messagesToProcess) {
          const parsed = this.parseSingleMessage(m, chatName, rawChatId, contactNameMap);
          if (parsed) {
            messagesToIngest.push(parsed);
          }
        }
      }

      if (messagesToIngest.length > 0) {
        totalNewMessages = this.ingestParsedMessages(messagesToIngest, io);
      }

      return { syncedCount: totalNewMessages, chatsCount: chats.length };
    } catch (err: any) {
      console.error('[WhatsApp Gateway Sync Error]', err.message);
      return { syncedCount: 0, chatsCount: 0 };
    }
  }

  /**
   * Convert an individual message object from WAHA/Evolution API into normalized GatewayParsedMessage.
   */
  public static parseSingleMessage(
    m: any,
    chatName: string,
    rawChatId: string,
    contactNameMap?: Map<string, string>
  ): GatewayParsedMessage | null {
    if (!m) return null;

    const fromMe = m.fromMe === true || m._data?.id?.fromMe === true;
    const rawFrom = m.from || m._data?.from?._serialized || m._data?.from?.user || rawChatId;
    const rawTo = m.to || m._data?.to?._serialized || m._data?.to?.user || '';

    const cleanPhone = String(rawFrom).replace(/@.+/, '').replace(/\D/g, '');
    const toPhone = String(rawTo).replace(/@.+/, '').replace(/\D/g, '');

    const pushName = m._data?.notifyName || m.notifyName || m.pushName || m._data?.pushName || '';
    const resolvedName = chatName || pushName || (contactNameMap ? contactNameMap.get(rawFrom) : '') || '';

    let senderName: string;
    let senderId: string;
    const isLid = String(rawFrom).includes('@lid') || String(rawChatId).includes('@lid');

    if (fromMe) {
      senderName = 'DejavuFM Studio';
      senderId = 'studio';
    } else {
      senderId = String(rawFrom || rawChatId);
      if (resolvedName && !isLid && cleanPhone && !resolvedName.includes(cleanPhone)) {
        senderName = `${resolvedName} (+${cleanPhone})`;
      } else if (resolvedName) {
        senderName = resolvedName;
      } else if (!isLid && cleanPhone) {
        senderName = `+${cleanPhone}`;
      } else {
        senderName = resolvedName || String(rawFrom);
      }
    }

    let text = m.body || m.text || m._data?.body || '';
    let messageType: GatewayParsedMessage['messageType'] = 'text';
    let mediaUrl: string | undefined;

    if (m.hasMedia || m.media || m._data?.hasMedia) {
      const media = m.media || m._data?.media || {};
      mediaUrl = media.url || undefined;
      const mime = (media.mimetype || m.mimetype || m.type || '').toLowerCase();

      if (mime.startsWith('image') || m.type === 'image') {
        messageType = 'image';
        text = text || '[WhatsApp Image]';
      } else if (mime.startsWith('audio') || m.type === 'audio' || m.type === 'ptt') {
        messageType = 'audio';
        text = text || '[WhatsApp Voice Note]';
      } else if (mime.startsWith('video') || m.type === 'video') {
        messageType = 'video';
        text = text || '[WhatsApp Video]';
      }
    }

    if (!text && !mediaUrl) return null;

    const rawTimestamp = m.timestamp || m.t || m._data?.t || Date.now();
    const timestamp = typeof rawTimestamp === 'number'
      ? (rawTimestamp > 1e11 ? rawTimestamp : rawTimestamp * 1000)
      : Date.now();

    const rawId = m.id?._serialized || m.id?.id || (typeof m.id === 'string' ? m.id : null);
    const messageId = rawId || `waha-sync-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

    return {
      platform: 'whatsapp',
      senderId,
      senderName,
      text,
      messageType,
      mediaUrl,
      timestamp,
      messageId,
      fromMe,
      recipient: fromMe ? (chatName || (toPhone ? `+${toPhone}` : rawTo)) : 'DejavuFM Studio'
    };
  }

  /**
   * Ingest an array of parsed messages into SQLite private_messages and broadcast to active UI clients.
   */
  public static ingestParsedMessages(messages: GatewayParsedMessage[], io?: any): number {
    if (!db.open || !messages || messages.length === 0) return 0;

    let insertedCount = 0;

    for (const msg of messages) {
      const messageId = msg.messageId;
      const recipient = msg.fromMe ? (msg as any).recipient || 'WhatsApp User' : 'DejavuFM Studio';
      const sender = msg.fromMe ? 'DejavuFM Studio' : (msg.senderName || `+${msg.senderId}`);

      try {
        // 1. Check if message ID was deleted (tombstoned)
        const isMsgTombstoned = db.prepare("SELECT 1 FROM deleted_message_tombstones WHERE id = ?").get(messageId);
        if (isMsgTombstoned) {
          continue;
        }

        // 2. Check if this user thread was deleted prior to or at this message's timestamp
        const contactIdentifiers: string[] = [];
        if (msg.senderName) contactIdentifiers.push(msg.senderName.toLowerCase().trim());
        if (msg.senderId) contactIdentifiers.push(msg.senderId.toLowerCase().trim());
        if (msg.recipient && msg.recipient !== 'DejavuFM Studio') contactIdentifiers.push(msg.recipient.toLowerCase().trim());
        if (sender && sender !== 'DejavuFM Studio') contactIdentifiers.push(sender.toLowerCase().trim());
        if (recipient && recipient !== 'DejavuFM Studio') contactIdentifiers.push(recipient.toLowerCase().trim());

        const rawString = `${msg.senderId || ''} ${msg.senderName || ''} ${msg.recipient || ''} ${sender} ${recipient}`;
        const digits = rawString.replace(/\D/g, '');
        if (digits.length >= 8) {
          contactIdentifiers.push(digits);
          contactIdentifiers.push(`+${digits}`);
          contactIdentifiers.push(`${digits}@c.us`);
          contactIdentifiers.push(`${digits}@lid`);
          contactIdentifiers.push(`${digits}@s.whatsapp.net`);
        }

        const uniqueCandidateKeys = Array.from(new Set(contactIdentifiers.filter(Boolean)));
        if (uniqueCandidateKeys.length > 0) {
          const placeholders = uniqueCandidateKeys.map(() => '?').join(',');
          const threadTombstone = db.prepare(`
            SELECT MAX(deleted_at) as max_deleted_at 
            FROM deleted_threads_tombstones 
            WHERE LOWER(target_id) IN (${placeholders})
          `).get(...uniqueCandidateKeys) as any;

          if (threadTombstone && threadTombstone.max_deleted_at && msg.timestamp <= threadTombstone.max_deleted_at) {
            // Message was sent before or at the time the thread was deleted. Do not re-ingest!
            continue;
          }
        }

        // Check if message ID already exists
        const existing = db.prepare("SELECT id FROM private_messages WHERE id = ?").get(messageId) as any;
        if (existing) {
          continue;
        }

        // Check for duplicate within small timestamp window
        const duplicate = db.prepare(`
          SELECT id FROM private_messages 
          WHERE sender = ? AND recipient = ? AND text = ? AND ABS(timestamp - ?) < 3000
        `).get(sender, recipient, msg.text, msg.timestamp) as any;
        if (duplicate) {
          continue;
        }

        db.prepare(`
          INSERT INTO private_messages (id, sender, recipient, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp, platform)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          messageId,
          sender,
          recipient,
          msg.text || null,
          msg.messageType === 'image' ? msg.mediaUrl || null : null,
          msg.messageType === 'image' ? 'WhatsApp Image' : null,
          msg.messageType === 'audio' ? msg.mediaUrl || null : null,
          msg.messageType === 'audio' ? 'Voice Message' : null,
          msg.messageType === 'video' ? msg.mediaUrl || null : null,
          msg.messageType === 'video' ? 'Video' : null,
          msg.timestamp,
          'whatsapp'
        );

        insertedCount++;

        // Broadcast to Studio Inbox via Socket.IO
        if (io) {
          const socketMsg = {
            id: messageId,
            user: sender,
            recipient: recipient,
            text: msg.text,
            imageUrl: msg.messageType === 'image' ? msg.mediaUrl || null : null,
            audioUrl: msg.messageType === 'audio' ? msg.mediaUrl || null : null,
            videoUrl: msg.messageType === 'video' ? msg.mediaUrl || null : null,
            timestamp: msg.timestamp,
            avatar_url: (msg.fromMe || sender === 'DejavuFM Studio') ? '/icon.svg' : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sender)}`,
            platform: 'whatsapp'
          };

          io.emit('privateMessage', socketMsg);
        }
      } catch (dbErr) {
        console.error('[WhatsApp Ingest Error]', dbErr);
      }
    }

    if (insertedCount > 0 && io) {
      try {
        const privateCountRow = db.prepare("SELECT COUNT(*) as count FROM private_messages").get() as any;
        const publicCountRow = db.prepare("SELECT COUNT(*) as count FROM public_messages").get() as any;
        const shoutoutCountRow = db.prepare("SELECT COUNT(*) as count FROM shoutouts").get() as any;

        io.emit('chatCountsUpdated', {
          publicMessages: publicCountRow?.count || 0,
          privateMessages: privateCountRow?.count || 0,
          shoutoutCount: shoutoutCountRow?.count || 0
        });
      } catch {}
    }

    return insertedCount;
  }

  /**
   * Normalize gateway server URL by trimming whitespace and trailing slashes.
   */
  public static normalizeUrl(url?: string): string {
    if (!url) return '';
    let cleaned = url.trim();
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `https://${cleaned}`;
    }
    return cleaned.replace(/\/+$/, '');
  }

  /**
   * Clean recipient phone number / chatId into standard WhatsApp format (digits only or JID).
   */
  public static formatChatId(recipient: string): string {
    if (!recipient) return '';
    const clean = recipient.trim();
    if (clean.includes('@c.us') || clean.includes('@s.whatsapp.net') || clean.includes('@lid') || clean.includes('@g.us')) {
      return clean;
    }
    // Extract numbers from strings like "John (+44 7123 456789)" or "+447123456789"
    const digits = clean.replace(/\D/g, '');
    if (!digits) return clean;
    // 14+ digits with no standard country code pattern is usually a WhatsApp LID
    if (digits.length >= 14) {
      return `${digits}@lid`;
    }
    return `${digits}@c.us`;
  }

  /**
   * Intelligently resolve the recipient Chat ID from a username, display name, or phone string.
   */
  public static async resolveRecipientChatId(
    serverUrl: string,
    apiKey: string | undefined,
    sessionName: string,
    recipient: string
  ): Promise<string> {
    if (!recipient) return '';
    const clean = recipient.trim();

    // 1. Direct JID format
    if (clean.includes('@c.us') || clean.includes('@s.whatsapp.net') || clean.includes('@lid') || clean.includes('@g.us')) {
      return clean;
    }

    // 2. Database lookup in meta_studio_messages or private_messages FIRST (preserves original JID/LID)
    if (db.open) {
      try {
        const metaRow = db.prepare(`
          SELECT sender_id, sender_name FROM meta_studio_messages 
          WHERE platform = 'whatsapp' AND (
            LOWER(sender_name) = ? 
            OR LOWER(sender_id) = ? 
            OR LOWER(sender_name) LIKE ?
            OR LOWER(sender_id) LIKE ?
          )
          ORDER BY timestamp DESC LIMIT 1
        `).get(clean.toLowerCase(), clean.toLowerCase(), `%${clean.toLowerCase()}%`, `%${clean.toLowerCase()}%`) as any;

        if (metaRow?.sender_id) {
          const sId = String(metaRow.sender_id).trim();
          if (sId.includes('@') || /^\d{7,}$/.test(sId)) {
            return this.formatChatId(sId);
          }
        }
      } catch {}

      try {
        const pmRow = db.prepare(`
          SELECT sender, recipient FROM private_messages 
          WHERE platform = 'whatsapp' AND (
            LOWER(sender) LIKE ? 
            OR LOWER(recipient) LIKE ?
          )
          ORDER BY timestamp DESC LIMIT 1
        `).get(`%${clean.toLowerCase()}%`, `%${clean.toLowerCase()}%`) as any;

        if (pmRow?.sender) {
          const s = String(pmRow.sender).trim();
          if (s.includes('@') || /^\d{7,}$/.test(s)) {
            return this.formatChatId(s);
          }
        }
      } catch {}
    }

    // 3. Query WAHA active chats list for name, LID or phone match
    try {
      const base = this.normalizeUrl(serverUrl);
      const headers = this.getHeaders(apiKey);
      const chatsRes = await axios.get(`${base}/api/default/chats`, {
        headers,
        timeout: 4000
      });
      if (Array.isArray(chatsRes.data)) {
        const targetLower = clean.toLowerCase();
        const rawDigits = clean.replace(/\D/g, '');
        const match = chatsRes.data.find((c: any) => {
          const cName = (c.name || '').toLowerCase();
          const cid = typeof c.id === 'object' ? c.id?._serialized || c.id?.user : c.id;
          const cidStr = String(cid || '');
          return (
            (cName && (cName === targetLower || targetLower.includes(cName) || cName.includes(targetLower))) ||
            (rawDigits && rawDigits.length >= 7 && cidStr.includes(rawDigits)) ||
            (cidStr === clean)
          );
        });
        if (match?.id) {
          const matchId = typeof match.id === 'object' ? match.id?._serialized || match.id?.user : match.id;
          if (matchId) return String(matchId);
        }
      }
    } catch {}

    // 4. Query WAHA contacts list for display name match
    try {
      const base = this.normalizeUrl(serverUrl);
      const headers = this.getHeaders(apiKey);
      const contactsRes = await axios.get(`${base}/api/contacts/all`, {
        params: { session: sessionName },
        headers,
        timeout: 4000
      });
      if (Array.isArray(contactsRes.data)) {
        const targetLower = clean.toLowerCase();
        const rawDigits = clean.replace(/\D/g, '');
        const match = contactsRes.data.find((c: any) =>
          (c.name && c.name.toLowerCase() === targetLower) ||
          (c.pushname && c.pushname.toLowerCase() === targetLower) ||
          (c.verifiedName && c.verifiedName.toLowerCase() === targetLower) ||
          (c.shortName && c.shortName.toLowerCase() === targetLower) ||
          (rawDigits && rawDigits.length >= 7 && String(c.id).includes(rawDigits))
        );
        if (match?.id) {
          const matchId = typeof match.id === 'object' ? match.id?._serialized || match.id?.user : match.id;
          if (matchId) return String(matchId);
        }
      }
    } catch {}

    // 5. Fallback to formatChatId from extracted digits
    return this.formatChatId(clean);
  }

  /**
   * Get headers for gateway requests including optional API key.
   */
  private static getHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, image/*, */*'
    };
    if (apiKey && apiKey.trim()) {
      headers['X-Api-Key'] = apiKey.trim();
      headers['apikey'] = apiKey.trim();
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    return headers;
  }

  /**
   * Check connection status of a session in WAHA or Evolution API.
   */
  public static async checkStatus(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<GatewaySessionStatus> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) {
      return {
        status: 'OFFLINE',
        connected: false,
        sessionName,
        error: 'Gateway Server URL is empty.'
      };
    }

    const headers = this.getHeaders(apiKey);

    try {
      // 1. Try WAHA specific session endpoint: GET /api/sessions/{session}
      const res = await axios.get(`${base}/api/sessions/${encodeURIComponent(sessionName)}`, {
        headers,
        timeout: 8000
      });

      const data = res.data;
      const rawStatus = (data?.status || '').toUpperCase();

      if (rawStatus === 'WORKING' || rawStatus === 'CONNECTED') {
        const phone = data?.me?.id || data?.engine?.phone || data?.phone || '';
        return {
          status: 'CONNECTED',
          connected: true,
          sessionName,
          phone: phone ? phone.replace(/@.+/, '') : undefined,
          raw: data
        };
      }

      if (rawStatus === 'SCAN_QR_CODE' || rawStatus === 'SCAN_QR') {
        return {
          status: 'SCAN_QR_CODE',
          connected: false,
          sessionName,
          raw: data
        };
      }

      if (rawStatus === 'STARTING') {
        return {
          status: 'STARTING',
          connected: false,
          sessionName,
          raw: data
        };
      }

      if (rawStatus === 'STOPPED' || rawStatus === 'FAILED') {
        return {
          status: rawStatus === 'FAILED' ? 'FAILED' : 'STOPPED',
          connected: false,
          sessionName,
          raw: data
        };
      }

      return {
        status: 'STARTING',
        connected: false,
        sessionName,
        raw: data
      };
    } catch (err: any) {
      // 2. Fallback: try GET /api/sessions (list all sessions)
      try {
        const listRes = await axios.get(`${base}/api/sessions`, {
          headers,
          timeout: 6000
        });

        if (Array.isArray(listRes.data)) {
          const match = listRes.data.find((s: any) => s.name === sessionName) || listRes.data[0];
          if (match) {
            const rawStatus = (match.status || '').toUpperCase();
            const isWorking = rawStatus === 'WORKING' || rawStatus === 'CONNECTED';
            return {
              status: isWorking ? 'CONNECTED' : (rawStatus === 'SCAN_QR_CODE' ? 'SCAN_QR_CODE' : (rawStatus === 'FAILED' ? 'FAILED' : 'STARTING')),
              connected: isWorking,
              sessionName: match.name || sessionName,
              raw: match
            };
          }
        }
      } catch (fallbackErr) {}

      // 3. Fallback: Evolution API check (GET /instance/connectionState/{instance})
      try {
        const evoRes = await axios.get(`${base}/instance/connectionState/${encodeURIComponent(sessionName)}`, {
          headers,
          timeout: 6000
        });
        const state = evoRes.data?.instance?.state || evoRes.data?.state;
        if (state === 'open') {
          return {
            status: 'CONNECTED',
            connected: true,
            sessionName,
            raw: evoRes.data
          };
        }
        if (state === 'connecting' || state === 'close') {
          return {
            status: 'SCAN_QR_CODE',
            connected: false,
            sessionName,
            raw: evoRes.data
          };
        }
      } catch (evoErr) {}

      return {
        status: 'OFFLINE',
        connected: false,
        sessionName,
        error: err.response?.data?.message || err.message || 'Unable to reach WhatsApp gateway server.'
      };
    }
  }

  /**
   * Fetch QR code for authentication.
   * Automatically starts or restarts the session if stopped/failed and polls until QR is ready.
   */
  public static async getQrCode(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<{ qr: string | null; type: 'image' | 'raw'; error?: string }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) return { qr: null, type: 'raw', error: 'Gateway URL is missing.' };

    const headers = this.getHeaders(apiKey);

    // Step 1: Check session status first
    try {
      const statusCheck = await this.checkStatus(serverUrl, apiKey, sessionName);
      if (statusCheck.connected) {
        return {
          qr: null,
          type: 'raw',
          error: 'WhatsApp is already connected and linked! No QR pairing required.'
        };
      }

      // If session is failed or stopped, initiate a fresh start/restart
      if (statusCheck.status === 'FAILED' || statusCheck.status === 'STOPPED') {
        try {
          await this.startSession(serverUrl, apiKey, sessionName);
        } catch (startErr) {
          console.warn('[WhatsApp Gateway] Auto-start session notice:', startErr);
        }
      }
    } catch (checkErr) {
      console.warn('[WhatsApp Gateway] Status pre-check error:', checkErr);
    }

    const endpoints = [
      `${base}/api/${encodeURIComponent(sessionName)}/auth/qr`,
      `${base}/api/default/auth/qr`,
      `${base}/api/sessions/${encodeURIComponent(sessionName)}/auth/qr`,
      `${base}/instance/connect/${encodeURIComponent(sessionName)}`
    ];

    // Step 2: Poll for QR code with retry loop (giving WAHA time to start browser & generate QR)
    const maxRetries = 6;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      for (const ep of endpoints) {
        try {
          const res = await axios.get(ep, {
            headers: {
              ...headers,
              Accept: 'image/png, image/*, application/json, text/plain, */*'
            },
            responseType: 'arraybuffer',
            timeout: 7000
          });

          const contentType = String(res.headers['content-type'] || '').toLowerCase();

          // If binary image
          if (contentType.includes('image/') || Buffer.isBuffer(res.data)) {
            const b64 = Buffer.from(res.data).toString('base64');
            try {
              const text = Buffer.from(res.data).toString('utf8');
              const parsed = JSON.parse(text);
              if (parsed.data || parsed.qr || parsed.code || parsed.base64) {
                const rawCode = parsed.data || parsed.qr || parsed.code || parsed.base64;
                if (typeof rawCode === 'string' && rawCode.startsWith('data:image')) {
                  return { qr: rawCode, type: 'image' };
                }
                return { qr: rawCode, type: 'raw' };
              }
            } catch {
              // It is indeed raw image binary bytes
              return { qr: `data:${contentType || 'image/png'};base64,${b64}`, type: 'image' };
            }
          }

          const text = Buffer.from(res.data).toString('utf8');
          try {
            const parsed = JSON.parse(text);
            const qrVal = parsed.data || parsed.qr || parsed.code || parsed.base64;
            if (qrVal) {
              if (typeof qrVal === 'string' && qrVal.startsWith('data:image')) {
                return { qr: qrVal, type: 'image' };
              }
              return { qr: qrVal, type: 'raw' };
            }
          } catch {
            if (text && text.length > 10) {
              return { qr: text, type: 'raw' };
            }
          }
        } catch (reqErr: any) {
          const status = reqErr.response?.status;
          // If 422 / 400 (Session status is not as expected / FAILED), try triggering a restart on first failure
          if (status === 422 && attempt === 1) {
            try {
              await axios.post(`${base}/api/sessions/${encodeURIComponent(sessionName)}/restart`, {}, { headers, timeout: 6000 }).catch(() => {});
            } catch {}
          }
        }
      }

      // If not last attempt, wait 1.2 seconds before polling next iteration
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    return {
      qr: null,
      type: 'raw',
      error: 'WhatsApp session is initializing or generating QR code. Please click "Pair Phone / QR" again in a few seconds.'
    };
  }

  /**
   * Start or restart a session on the gateway.
   */
  public static async startSession(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<{ success: boolean; message: string }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) throw new Error('Gateway URL is required.');

    const headers = this.getHeaders(apiKey);

    // Try 1: WAHA Restart session
    try {
      const res = await axios.post(
        `${base}/api/sessions/${encodeURIComponent(sessionName)}/restart`,
        {},
        { headers, timeout: 10000 }
      );
      return { success: true, message: `Session "${sessionName}" restarted.` };
    } catch (err: any) {
      // Try 2: WAHA Start session
      try {
        await axios.post(
          `${base}/api/sessions/${encodeURIComponent(sessionName)}/start`,
          {},
          { headers, timeout: 10000 }
        );
        return { success: true, message: `Session "${sessionName}" started.` };
      } catch (err2: any) {
        // Try 3: WAHA generic start
        try {
          await axios.post(
            `${base}/api/sessions/start`,
            { name: sessionName },
            { headers, timeout: 10000 }
          );
          return { success: true, message: `Session "${sessionName}" started.` };
        } catch (err3: any) {
          // Try 4: WAHA create session
          try {
            await axios.post(
              `${base}/api/sessions`,
              { name: sessionName },
              { headers, timeout: 10000 }
            );
            return { success: true, message: `Session "${sessionName}" created and started.` };
          } catch (err4: any) {
            throw new Error(err4.response?.data?.message || err4.message || 'Failed to start session on gateway.');
          }
        }
      }
    }
  }

  /**
   * Logout / unlink a WhatsApp session.
   */
  public static async logoutSession(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<{ success: boolean; message: string }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) throw new Error('Gateway URL is required.');

    const headers = this.getHeaders(apiKey);

    try {
      await axios.post(
        `${base}/api/sessions/${encodeURIComponent(sessionName)}/logout`,
        {},
        { headers, timeout: 10000 }
      );
      return { success: true, message: 'Session logged out successfully.' };
    } catch (err: any) {
      try {
        await axios.post(
          `${base}/api/sessions/${encodeURIComponent(sessionName)}/stop`,
          {},
          { headers, timeout: 10000 }
        );
        return { success: true, message: 'Session stopped.' };
      } catch (err2: any) {
        throw new Error(err.response?.data?.message || err.message || 'Failed to log out session.');
      }
    }
  }

  /**
   * Send a text reply from the studio DJ back to the listener.
   */
  public static async sendTextMessage(
    serverUrl: string,
    apiKey: string | undefined,
    sessionName: string = 'default',
    to: string,
    text: string
  ): Promise<any> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) throw new Error('WhatsApp Gateway Server URL is missing.');

    const headers = this.getHeaders(apiKey);
    const resolvedChatId = await this.resolveRecipientChatId(serverUrl, apiKey, sessionName, to);

    if (!resolvedChatId) {
      throw new Error(`Invalid WhatsApp recipient: "${to}". Could not determine a valid phone number or WhatsApp ID.`);
    }

    // Build candidates for auto-fallback (e.g. try @lid if @c.us returns No LID, and vice versa)
    const candidates: string[] = [];
    if (resolvedChatId.includes('@')) {
      candidates.push(resolvedChatId);
      if (resolvedChatId.endsWith('@c.us')) {
        candidates.push(resolvedChatId.replace('@c.us', '@lid'));
      } else if (resolvedChatId.endsWith('@lid')) {
        candidates.push(resolvedChatId.replace('@lid', '@c.us'));
      }
    } else {
      const digits = resolvedChatId.replace(/\D/g, '');
      if (digits.length >= 14) {
        candidates.push(`${digits}@lid`, `${digits}@c.us`);
      } else {
        candidates.push(`${digits}@c.us`, `${digits}@lid`);
      }
    }

    let lastError: any = null;

    // Method 1: WAHA standard POST /api/sendText with candidate fallback
    for (const targetJid of candidates) {
      try {
        const response = await axios.post(
          `${base}/api/sendText`,
          {
            session: sessionName,
            chatId: targetJid,
            text
          },
          { headers, timeout: 15000 }
        );
        return response.data;
      } catch (err: any) {
        lastError = err;
        const errData = err.response?.data;
        const errMsg = errData?.exception?.message || errData?.message || errData?.error || err.message;
        
        // If this candidate failed due to LID mismatch or not found, try the next candidate
        if (typeof errMsg === 'string' && (errMsg.includes('No LID') || errMsg.includes('not found') || errMsg.includes('invalid jid') || err.response?.status === 500)) {
          continue;
        }
      }
    }

    // Method 2: Evolution API POST /message/sendText/{instance}
    for (const targetJid of candidates) {
      try {
        const cleanNumber = targetJid.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@lid', '');
        const response2 = await axios.post(
          `${base}/message/sendText/${encodeURIComponent(sessionName)}`,
          {
            number: cleanNumber,
            text
          },
          { headers, timeout: 15000 }
        );
        return response2.data;
      } catch (err2: any) {
        lastError = err2;
      }
    }

    const lastErrData = lastError?.response?.data;
    const lastErrMsg = lastErrData?.exception?.message || lastErrData?.message || lastErrData?.error || lastError?.message;

    if (typeof lastErrMsg === 'string' && (lastErrMsg.includes('No LID') || lastErrMsg.includes('not found') || lastErrMsg.includes('invalid jid'))) {
      throw new Error(`Recipient (${to}) could not be contacted on WhatsApp. Ensure this account/number is registered and reachable.`);
    }

    throw new Error(
      lastErrMsg ||
      'Failed to dispatch WhatsApp message via Gateway.'
    );
  }

  /**
   * Parse incoming webhook event payload from WAHA or Evolution API.
   */
  public static parseWebhookPayload(body: any): GatewayParsedMessage[] {
    const messages: GatewayParsedMessage[] = [];
    if (!body) return messages;

    // 1. WAHA format: { event: "message" | "message.any", payload: { ... } }
    if (body.event && (body.event.startsWith('message') || body.event === 'message.create')) {
      const p = body.payload || body.data || body;
      if (!p) return messages;

      // Skip messages sent from the radio station itself (fromMe)
      if (p.fromMe === true || p.id?.fromMe === true) {
        return messages;
      }

      const rawFrom = p.from || p.author || p.participant || '';
      const isLid = String(rawFrom).includes('@lid');
      const cleanPhone = String(rawFrom).replace(/@.+/, '').replace(/\D/g, '');
      const notifyName = p._data?.notifyName || p.notifyName || p.pushName || '';
      const senderName = notifyName 
        ? (isLid ? notifyName : `${notifyName} (+${cleanPhone})`)
        : (isLid ? 'WhatsApp Listener' : `+${cleanPhone}`);

      let messageType: GatewayParsedMessage['messageType'] = 'text';
      let text = p.body || '';
      let mediaUrl: string | undefined;

      if (p.hasMedia || p.media) {
        const media = p.media || {};
        mediaUrl = media.url || undefined;
        const mime = (media.mimetype || '').toLowerCase();

        if (mime.startsWith('image/')) {
          messageType = 'image';
          text = text || '[WhatsApp Image]';
        } else if (mime.startsWith('audio/')) {
          messageType = 'audio';
          text = text || '[WhatsApp Audio Message]';
        } else if (mime.startsWith('video/')) {
          messageType = 'video';
          text = text || '[WhatsApp Video]';
        }
      }

      if (text || mediaUrl) {
        messages.push({
          platform: 'whatsapp',
          senderId: String(rawFrom),
          senderName: senderName || rawFrom,
          text: text || 'Voice/Media message',
          messageType,
          mediaUrl,
          timestamp: p.timestamp ? (p.timestamp > 1e11 ? p.timestamp : p.timestamp * 1000) : Date.now(),
          messageId: p.id?._serialized || p.id || `waha-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fromMe: false
        });
      }

      return messages;
    }

    // 2. Evolution API format: { event: "messages.upsert", data: { ... } }
    if (body.event === 'messages.upsert' && body.data) {
      const data = body.data;
      const key = data.key || {};
      if (key.fromMe) return messages;

      const remoteJid = key.remoteJid || '';
      const isLid = String(remoteJid).includes('@lid');
      const cleanPhone = String(remoteJid).replace(/@.+/, '').replace(/\D/g, '');
      const pushName = data.pushName || '';
      const senderName = pushName 
        ? (isLid ? pushName : `${pushName} (+${cleanPhone})`)
        : (isLid ? 'WhatsApp Listener' : `+${cleanPhone}`);

      const msgObj = data.message || {};
      let text = msgObj.conversation || msgObj.extendedTextMessage?.text || '';
      let messageType: GatewayParsedMessage['messageType'] = 'text';
      let mediaUrl: string | undefined;

      if (msgObj.imageMessage) {
        messageType = 'image';
        text = msgObj.imageMessage.caption || '[WhatsApp Image]';
        mediaUrl = msgObj.imageMessage.url;
      } else if (msgObj.audioMessage) {
        messageType = 'audio';
        text = '[WhatsApp Voice Note]';
        mediaUrl = msgObj.audioMessage.url;
      } else if (msgObj.videoMessage) {
        messageType = 'video';
        text = msgObj.videoMessage.caption || '[WhatsApp Video]';
        mediaUrl = msgObj.videoMessage.url;
      }

      if (text || mediaUrl) {
        messages.push({
          platform: 'whatsapp',
          senderId: String(remoteJid),
          senderName: senderName || remoteJid,
          text: text || 'Media message',
          messageType,
          mediaUrl,
          timestamp: data.messageTimestamp ? data.messageTimestamp * 1000 : Date.now(),
          messageId: key.id || `evo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fromMe: false
        });
      }

      return messages;
    }

    // 3. Fallback: direct message object { from: "...", body: "..." }
    if (body.from && (body.body || body.text)) {
      if (body.fromMe === true) return messages;
      const cleanPhone = String(body.from).replace(/@.+/, '').replace(/\D/g, '');
      messages.push({
        platform: 'whatsapp',
        senderId: cleanPhone,
        senderName: body.name ? `${body.name} (+${cleanPhone})` : `+${cleanPhone}`,
        text: body.body || body.text || '',
        messageType: 'text',
        timestamp: Date.now(),
        messageId: body.id || `waha-${Date.now()}`,
        fromMe: false
      });
    }

    return messages;
  }
}
