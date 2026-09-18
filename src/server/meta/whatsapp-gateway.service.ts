import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { db, getUploadsDir } from '../db.ts';

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
   * Helper to detect if a given string is or contains raw base64 image data
   */
  public static isBase64Image(str?: string | null): boolean {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.startsWith('data:image/')) return true;
    if (trimmed.startsWith('/9j/')) return true; // JPEG magic
    if (trimmed.startsWith('iVBORw0KGgo')) return true; // PNG magic
    if (trimmed.startsWith('R0lGOD')) return true; // GIF magic
    if (trimmed.startsWith('UklGR')) return true; // WEBP magic
    if (trimmed.length > 200 && !trimmed.includes(' ') && !trimmed.includes('\n') && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
      return true;
    }
    return false;
  }

  /**
   * Helper to detect if a given string is or contains raw base64 audio data
   */
  public static isBase64Audio(str?: string | null): boolean {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.startsWith('data:audio/')) return true;
    if (trimmed.startsWith('T2dnUw')) return true; // OggS magic
    if (trimmed.startsWith('SUQz')) return true;   // ID3 (mp3) magic
    if (trimmed.startsWith('RIFF')) return true;   // RIFF (wav) magic
    if (trimmed.startsWith('GkXfo')) return true;  // WebM magic
    if (trimmed.length > 200 && !trimmed.includes(' ') && !trimmed.includes('\n') && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
      return true;
    }
    return false;
  }

  /**
   * Retrieve active WhatsApp gateway configuration from database settings.
   */
  public static getGatewayConfig(): { serverUrl?: string; apiKey?: string; sessionName?: string; provider?: string } {
    try {
      if (!db.open) return {};
      const configRow = db.prepare("SELECT value FROM settings WHERE key = 'studio_platform_configs'").get() as any;
      if (!configRow || !configRow.value) return {};
      const parsed = JSON.parse(configRow.value);
      const wa = parsed.whatsapp || {};
      return {
        serverUrl: wa.serverUrl,
        apiKey: wa.apiKey,
        sessionName: wa.sessionName || 'default',
        provider: wa.provider || 'waha'
      };
    } catch {
      return {};
    }
  }

  /**
   * Synchronously decode and save a base64 image string into the /uploads folder.
   */
  public static saveBase64ImageLocally(base64Data: string, messageId: string = 'msg'): string | null {
    try {
      if (!base64Data) return null;
      let clean = base64Data.trim();
      let ext = 'jpeg';
      if (clean.startsWith('data:')) {
        const match = clean.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
        if (match) {
          ext = match[1] === 'jpeg' ? 'jpeg' : (match[1] === 'png' ? 'png' : match[1]);
          clean = clean.slice(match[0].length);
        }
      } else if (clean.startsWith('iVBORw0KGgo')) {
        ext = 'png';
      }

      const buf = Buffer.from(clean, 'base64');
      if (!buf || buf.length === 0) return null;

      const uploadsDir = getUploadsDir();
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
      const filename = `waha-img-${Date.now()}-${safeId}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buf);
      return `/uploads/${filename}`;
    } catch (err) {
      console.error('[WhatsApp Media] Failed to write base64 image locally:', err);
      return null;
    }
  }

  /**
   * Synchronously decode and save a base64 audio string into the /uploads folder.
   */
  public static saveBase64AudioLocally(base64Data: string, messageId: string = 'audio'): string | null {
    try {
      if (!base64Data) return null;
      let clean = base64Data.trim();
      let ext = 'ogg';
      if (clean.startsWith('data:')) {
        const match = clean.match(/^data:audio\/([a-zA-Z0-9+.-]+);base64,/);
        if (match) {
          const rawExt = match[1].toLowerCase();
          if (rawExt.includes('mp4') || rawExt.includes('m4a')) ext = 'm4a';
          else if (rawExt.includes('mpeg') || rawExt.includes('mp3')) ext = 'mp3';
          else if (rawExt.includes('wav')) ext = 'wav';
          else if (rawExt.includes('webm')) ext = 'webm';
          else if (rawExt.includes('aac')) ext = 'aac';
          else ext = 'ogg';
          clean = clean.slice(match[0].length);
        }
      }

      const buf = Buffer.from(clean, 'base64');
      if (!buf || buf.length === 0) return null;

      const uploadsDir = getUploadsDir();
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
      const filename = `waha-audio-${Date.now()}-${safeId}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buf);
      return `/uploads/${filename}`;
    } catch (err) {
      console.error('[WhatsApp Media] Failed to write base64 audio locally:', err);
      return null;
    }
  }

  /**
   * Download and save remote media from WAHA into local uploads directory.
   */
  public static async saveRemoteMediaLocally(
    mediaUrl: string,
    serverUrl?: string,
    apiKey?: string,
    fallbackBase64?: string,
    messageId: string = 'msg',
    mimetype?: string
  ): Promise<string | null> {
    const uploadsDir = getUploadsDir();
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 1. If fallback base64 or mediaUrl itself is base64, save immediately
    if (this.isBase64Image(mediaUrl)) {
      const local = this.saveBase64ImageLocally(mediaUrl, messageId);
      if (local) return local;
    }
    if (fallbackBase64 && this.isBase64Image(fallbackBase64)) {
      const local = this.saveBase64ImageLocally(fallbackBase64, messageId);
      if (local) return local;
    }

    if (!mediaUrl) return null;

    // 2. Rewrite WAHA internal container URL to accessible serverUrl
    let fetchUrl = mediaUrl;
    if (serverUrl && (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1') || mediaUrl.startsWith('/api/files/'))) {
      const cleanServer = serverUrl.replace(/\/+$/, '');
      const pathPart = mediaUrl.replace(/^https?:\/\/[^/]+/, '');
      fetchUrl = `${cleanServer}${pathPart.startsWith('/') ? '' : '/'}${pathPart}`;
    }

    // 3. Download high-res binary
    try {
      const res = await axios.get(fetchUrl, {
        headers: this.getHeaders(apiKey),
        responseType: 'arraybuffer',
        timeout: 10000
      });

      let ext = 'jpeg';
      const cType = String(res.headers['content-type'] || mimetype || '').toLowerCase();
      if (cType.includes('png')) ext = 'png';
      else if (cType.includes('webp')) ext = 'webp';
      else if (cType.includes('gif')) ext = 'gif';
      else if (cType.includes('ogg') || cType.includes('opus') || cType.includes('oga')) ext = 'ogg';
      else if (cType.includes('mpeg') || cType.includes('mp3')) ext = 'mp3';
      else if (cType.includes('mp4')) ext = 'mp4';
      else if (cType.includes('wav')) ext = 'wav';
      else if (cType.includes('audio')) ext = 'ogg';
      else if (fetchUrl.includes('.oga') || fetchUrl.includes('.ogg')) ext = 'ogg';
      else if (fetchUrl.includes('.mp3')) ext = 'mp3';
      else if (fetchUrl.includes('.jpeg') || fetchUrl.includes('.jpg')) ext = 'jpeg';
      else if (fetchUrl.includes('.png')) ext = 'png';

      const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
      const filename = `waha-file-${Date.now()}-${safeId}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, Buffer.from(res.data));
      return `/uploads/${filename}`;
    } catch (err: any) {
      if (fallbackBase64 && this.isBase64Image(fallbackBase64)) {
        return this.saveBase64ImageLocally(fallbackBase64, messageId);
      }
      return null;
    }
  }

  /**
   * Reconcile any WhatsApp voice messages that lack a valid local audio file.
   */
  public static async reconcileMissingAudio(serverUrl?: string, apiKey?: string): Promise<void> {
    try {
      if (!db.open) return;
      const rows = db.prepare(`
        SELECT id, sender, text, audioUrl, audioName 
        FROM private_messages 
        WHERE platform = 'whatsapp' 
          AND (audioUrl IS NULL OR audioUrl = '' OR audioUrl = 'placeholder') 
          AND (text = 'Voice Message' OR text = 'Voice note' OR audioName IS NOT NULL)
      `).all() as any[];

      if (!rows || rows.length === 0) return;

      const config = this.getGatewayConfig();
      const sUrl = serverUrl || config.serverUrl;
      const key = apiKey || config.apiKey;
      if (!sUrl) return;

      const cleanServer = sUrl.replace(/\/+$/, '');

      for (const row of rows) {
        for (const ext of ['oga', 'ogg', 'mp3']) {
          const testUrl = `${cleanServer}/api/files/default/${row.id}.${ext}`;
          try {
            const res = await axios.get(testUrl, {
              headers: this.getHeaders(key),
              responseType: 'arraybuffer',
              timeout: 4000
            });
            if (res.data && res.data.length > 0) {
              const uploadsDir = getUploadsDir();
              const safeId = row.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
              const filename = `waha-audio-${Date.now()}-${safeId}.${ext === 'mp3' ? 'mp3' : 'ogg'}`;
              fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(res.data));
              const localUrl = `/uploads/${filename}`;
              db.prepare("UPDATE private_messages SET audioUrl = ?, audioName = 'Voice Note' WHERE id = ?").run(localUrl, row.id);
              console.log(`[WhatsApp Media Reconcile] Successfully recovered voice note for message ${row.id} -> ${localUrl}`);
              break;
            }
          } catch {}
        }
      }
    } catch {}
  }

  /**
   * Migrate any legacy messages that had raw base64 or media attachment fallbacks stored as text.
   */
  public static cleanupLegacyBase64Messages(): void {
    try {
      if (!db.open) return;
      const uploadsDir = getUploadsDir();

      // 1. Base64 strings
      const base64Rows = db.prepare("SELECT id, text, imageUrl FROM private_messages WHERE text LIKE '%/9j/%' OR text LIKE 'data:image%'").all() as any[];
      if (base64Rows && base64Rows.length > 0) {
        for (const r of base64Rows) {
          const local = this.saveBase64ImageLocally(r.text, r.id);
          if (local) {
            db.prepare("UPDATE private_messages SET imageUrl = ?, text = 'Shared an image' WHERE id = ?").run(local, r.id);
          }
        }
      }

      // 2. Media attachment and link fallbacks
      const mediaAttachmentRows = db.prepare(`
        SELECT id, text, imageUrl, audioUrl, videoUrl 
        FROM private_messages 
        WHERE text LIKE '%[Media attachment:%' 
           OR text LIKE '%Attachment from DejavuFM Studio%' 
           OR text LIKE '%Photo from DejavuFM Studio%'
           OR (text LIKE '%/uploads/%' AND imageUrl IS NULL AND audioUrl IS NULL AND videoUrl IS NULL)
      `).all() as any[];

      if (mediaAttachmentRows && mediaAttachmentRows.length > 0) {
        for (const r of mediaAttachmentRows) {
          const text = r.text || '';
          let matchedUrl: string | null = null;
          let matchedType: 'image' | 'audio' | 'video' = 'image';

          const match = text.match(/\[Media attachment:\s*([^\]]+)\]/i);
          if (match) {
            const rawName = match[1].trim();
            const cleanName = path.basename(rawName);
            const baseNoExt = path.parse(cleanName).name;
            let finalName = cleanName;
            try {
              const files = fs.readdirSync(uploadsDir);
              const found = files.find(f => f.startsWith(baseNoExt));
              if (found) finalName = found;
            } catch {}
            matchedUrl = `/uploads/${finalName}`;
            if (finalName.endsWith('.ogg') || finalName.endsWith('.oga') || finalName.endsWith('.mp3')) {
              matchedType = 'audio';
            }
          } else {
            const urlMatch = text.match(/(?:https?:\/\/[^\s]+)?(\/uploads\/[^\s)]+)/i);
            if (urlMatch) {
              matchedUrl = urlMatch[1];
              if (matchedUrl.endsWith('.ogg') || matchedUrl.endsWith('.oga') || matchedUrl.endsWith('.mp3')) {
                matchedType = 'audio';
              }
            }
          }

          if (matchedUrl) {
            if (matchedType === 'image') {
              db.prepare("UPDATE private_messages SET imageUrl = ?, imageName = 'Attachment', text = NULL WHERE id = ?").run(matchedUrl, r.id);
            } else if (matchedType === 'audio') {
              db.prepare("UPDATE private_messages SET audioUrl = ?, audioName = 'Voice Note', text = 'Voice Note' WHERE id = ?").run(matchedUrl, r.id);
            }
          }
        }
      }

      this.reconcileMissingAudio().catch(() => {});
    } catch (err) {
      console.error('[WhatsApp Media Reconcile Error]', err);
    }
  }

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
    this.cleanupLegacyBase64Messages();

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
            if ((parsed.messageType === 'image' || parsed.messageType === 'audio' || parsed.messageType === 'video') && parsed.mediaUrl && !parsed.mediaUrl.startsWith('/uploads/')) {
              try {
                const fallback = m._data?.body || m.body || m.media?.data;
                const local = await this.saveRemoteMediaLocally(parsed.mediaUrl, serverUrl, apiKey, fallback, parsed.messageId, m.media?.mimetype || m.mimetype);
                if (local) {
                  parsed.mediaUrl = local;
                }
              } catch {}
            }
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

    const rawTimestamp = m.timestamp || m.t || m._data?.t || Date.now();
    const timestamp = typeof rawTimestamp === 'number'
      ? (rawTimestamp > 1e11 ? rawTimestamp : rawTimestamp * 1000)
      : Date.now();

    const rawId = m.id?._serialized || m.id?.id || (typeof m.id === 'string' ? m.id : null);
    const messageId = rawId || `waha-sync-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

    const bodyIsBase64 = this.isBase64Image(m.body);
    const dataBodyIsBase64 = this.isBase64Image(m._data?.body);
    const bodyIsBase64Audio = this.isBase64Audio(m.body);
    const dataBodyIsBase64Audio = this.isBase64Audio(m._data?.body);
    const mime = (m.media?.mimetype || m.mimetype || m._data?.mimetype || m.type || '').toLowerCase();

    const isImage = (m.type === 'image') || 
                    mime.startsWith('image') ||
                    bodyIsBase64 || dataBodyIsBase64;
    const isAudio = (m.type === 'audio' || m.type === 'ptt') ||
                    mime.startsWith('audio') ||
                    bodyIsBase64Audio || dataBodyIsBase64Audio;
    const isVideo = (m.type === 'video') ||
                    mime.startsWith('video');

    let text = '';
    let messageType: GatewayParsedMessage['messageType'] = 'text';
    let mediaUrl: string | undefined;

    if (isImage) {
      messageType = 'image';
      const caption = m.caption || m._data?.caption || '';
      text = caption || (!bodyIsBase64 && m.body ? m.body : '') || 'Shared an image';

      const base64Candidate = dataBodyIsBase64 ? m._data?.body : (bodyIsBase64 ? m.body : (m.media?.data || undefined));
      const rawMediaUrl = m.media?.url || m.url || undefined;

      // Save base64 locally if available
      if (base64Candidate) {
        const local = this.saveBase64ImageLocally(base64Candidate, messageId);
        if (local) mediaUrl = local;
      }

      if (!mediaUrl && rawMediaUrl) {
        mediaUrl = rawMediaUrl;
      }
    } else if (isAudio) {
      messageType = 'audio';
      text = m.caption || 'Voice Message';
      
      const audioBase64 = dataBodyIsBase64Audio
        ? m._data?.body
        : (bodyIsBase64Audio ? m.body : (m.media?.data || m._data?.body || undefined));
      const rawMediaUrl = m.media?.url || m.url || undefined;

      if (audioBase64) {
        const local = this.saveBase64AudioLocally(audioBase64, messageId);
        if (local) mediaUrl = local;
      }

      if (!mediaUrl && rawMediaUrl) {
        mediaUrl = rawMediaUrl;
      }
    } else if (isVideo) {
      messageType = 'video';
      text = m.caption || 'Video';
      mediaUrl = m.media?.url || m.url || undefined;
    } else {
      text = m.body || m.text || '';
    }

    if (!text && !mediaUrl) return null;

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
      // If 404 / Session not found, the gateway server is ONLINE, but the session is not created/started yet
      if (
        err.response?.status === 404 ||
        err.response?.data?.message === 'Session not found' ||
        (typeof err.response?.data?.error === 'string' && err.response?.data?.error?.includes('does not exist'))
      ) {
        return {
          status: 'STOPPED',
          connected: false,
          sessionName,
          error: `Session "${sessionName}" is not started yet. Click "Pair Phone / QR" to initialize it.`
        };
      }

      // 2. Fallback: try GET /api/sessions?all=true (list all sessions including stopped ones)
      try {
        const listRes = await axios.get(`${base}/api/sessions?all=true`, {
          headers,
          timeout: 6000
        });

        if (Array.isArray(listRes.data)) {
          const match = listRes.data.find((s: any) => s.name === sessionName);
          if (match) {
            const rawStatus = (match.status || '').toUpperCase();
            const isWorking = rawStatus === 'WORKING' || rawStatus === 'CONNECTED';
            return {
              status: isWorking ? 'CONNECTED' : (rawStatus === 'SCAN_QR_CODE' ? 'SCAN_QR_CODE' : (rawStatus === 'FAILED' ? 'FAILED' : (rawStatus === 'STARTING' ? 'STARTING' : 'STOPPED'))),
              connected: isWorking,
              sessionName: match.name || sessionName,
              raw: match
            };
          }
          // Server responded with sessions list, so server is online, session just doesn't exist yet
          return {
            status: 'STOPPED',
            connected: false,
            sessionName,
            error: `Session "${sessionName}" does not exist yet. Click "Pair Phone / QR" to create it.`
          };
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
   * Automatically creates, starts or waits for the session until QR is ready.
   */
  public static async getQrCode(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<{ qr: string | null; type: 'image' | 'raw'; error?: string; status?: string }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) return { qr: null, type: 'raw', error: 'Gateway URL is missing.' };

    const headers = this.getHeaders(apiKey);

    // Step 1: Check session status first
    let currentStatus = 'STOPPED';
    try {
      const statusCheck = await this.checkStatus(serverUrl, apiKey, sessionName);
      if (statusCheck.connected) {
        return {
          qr: null,
          type: 'raw',
          error: 'WhatsApp is already connected and linked! No QR pairing required.',
          status: 'CONNECTED'
        };
      }
      currentStatus = statusCheck.status;
    } catch (checkErr) {
      console.warn('[WhatsApp Gateway] Status pre-check error:', checkErr);
    }

    // Step 2: If session is stopped, uninitialized, or needs recovery, start it
    if (currentStatus === 'STOPPED' || currentStatus === 'FAILED' || currentStatus === 'OFFLINE') {
      try {
        console.log(`[WhatsApp Gateway] Initializing session "${sessionName}" (current state: ${currentStatus})...`);
        await this.startSession(serverUrl, apiKey, sessionName);
        currentStatus = 'STARTING';
      } catch (startErr: any) {
        console.warn('[WhatsApp Gateway] Session startup notice:', startErr.message);
      }
    }

    // Step 3: If session is STARTING, wait/poll until it reaches SCAN_QR_CODE or CONNECTED
    // WAHA launches Chromium browser in the container; this can take 5-20 seconds.
    if (currentStatus === 'STARTING') {
      console.log(`[WhatsApp Gateway] Session "${sessionName}" is STARTING. Polling until SCAN_QR_CODE is ready...`);
      const maxWaitSec = 25;
      for (let s = 1; s <= maxWaitSec; s++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const sCheck = await this.checkStatus(serverUrl, apiKey, sessionName);
          if (sCheck.connected) {
            return {
              qr: null,
              type: 'raw',
              error: 'WhatsApp is already connected and linked! No QR pairing required.',
              status: 'CONNECTED'
            };
          }
          if (sCheck.status === 'SCAN_QR_CODE') {
            currentStatus = 'SCAN_QR_CODE';
            break;
          }
        } catch {}
      }
    }

    // Step 4: Now fetch the QR code directly
    // Endpoints in order of speed and reliability:
    // 1. WAHA direct image endpoint: /api/{session}/auth/qr?format=image (fastest PNG direct stream)
    // 2. WAHA direct raw endpoint: /api/{session}/auth/qr?format=raw
    // 3. WAHA generic /api/{session}/auth/qr
    // 4. Evolution API: /instance/connect/{session}
    const endpoints = [
      `${base}/api/${encodeURIComponent(sessionName)}/auth/qr?format=image`,
      `${base}/api/${encodeURIComponent(sessionName)}/auth/qr?format=raw`,
      `${base}/api/${encodeURIComponent(sessionName)}/auth/qr`,
      `${base}/instance/connect/${encodeURIComponent(sessionName)}`
    ];

    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      for (const ep of endpoints) {
        try {
          const res = await axios.get(ep, {
            headers: {
              ...headers,
              Accept: 'image/png, image/*, application/json, text/plain, */*'
            },
            responseType: 'arraybuffer',
            timeout: 8000
          });

          const contentType = String(res.headers['content-type'] || '').toLowerCase();

          // If binary image (e.g. PNG from format=image)
          if (contentType.includes('image/') || Buffer.isBuffer(res.data)) {
            // Guard: check if it's actually an error JSON encoded in the buffer
            try {
              const text = Buffer.from(res.data).toString('utf8');
              const parsed = JSON.parse(text);
              const qrVal = parsed.value || parsed.data || parsed.qr || parsed.code || parsed.base64;
              if (qrVal) {
                if (typeof qrVal === 'string' && qrVal.startsWith('data:image')) {
                  return { qr: qrVal, type: 'image', status: 'SCAN_QR_CODE' };
                }
                return { qr: qrVal, type: 'raw', status: 'SCAN_QR_CODE' };
              }
            } catch {
              // Not JSON -> verified valid PNG image binary
              const b64 = Buffer.from(res.data).toString('base64');
              const mime = contentType.includes('image/') ? contentType.split(';')[0].trim() : 'image/png';
              return { qr: `data:${mime};base64,${b64}`, type: 'image', status: 'SCAN_QR_CODE' };
            }
          }

          const text = Buffer.from(res.data).toString('utf8');
          try {
            const parsed = JSON.parse(text);
            const qrVal = parsed.value || parsed.data || parsed.qr || parsed.code || parsed.base64;
            if (qrVal) {
              if (typeof qrVal === 'string' && qrVal.startsWith('data:image')) {
                return { qr: qrVal, type: 'image', status: 'SCAN_QR_CODE' };
              }
              return { qr: qrVal, type: 'raw', status: 'SCAN_QR_CODE' };
            }
          } catch {
            if (text && text.length > 10 && !text.includes('error') && !text.includes('Session')) {
              return { qr: text, type: 'raw', status: 'SCAN_QR_CODE' };
            }
          }
        } catch (reqErr: any) {
          // Keep polling; do not send restart commands during startup
        }
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    return {
      qr: null,
      type: 'raw',
      error: 'WhatsApp session is still initializing on the gateway. Please click "Pair Phone / QR" again in a few moments.',
      status: 'STARTING'
    };
  }

  /**
   * Start or restart a session on the gateway.
   */
  public static async startSession(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<{ success: boolean; message: string; status?: string }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) throw new Error('Gateway URL is required.');

    const headers = this.getHeaders(apiKey);

    // Step 1: Check if session exists in WAHA: GET /api/sessions/{session}
    let sessionExists = false;
    let currentStatus = 'STOPPED';
    try {
      const checkRes = await axios.get(`${base}/api/sessions/${encodeURIComponent(sessionName)}`, { headers, timeout: 6000 });
      sessionExists = true;
      currentStatus = (checkRes.data?.status || 'STOPPED').toUpperCase();
    } catch (checkErr: any) {
      if (checkErr.response?.status === 404 || checkErr.response?.data?.message === 'Session not found') {
        sessionExists = false;
      }
    }

    // Step 2: If session does not exist on WAHA, create it via POST /api/sessions
    if (!sessionExists) {
      try {
        await axios.post(
          `${base}/api/sessions`,
          { name: sessionName },
          { headers, timeout: 10000 }
        );
        sessionExists = true;
      } catch (createErr: any) {
        // If already created concurrently, continue
      }
    }

    // Step 3: Check if already connected or ready
    if (currentStatus === 'WORKING' || currentStatus === 'CONNECTED') {
      return { success: true, message: `Session "${sessionName}" is already connected.`, status: 'CONNECTED' };
    }
    if (currentStatus === 'SCAN_QR_CODE') {
      return { success: true, message: `Session "${sessionName}" is waiting for QR code scan.`, status: 'SCAN_QR_CODE' };
    }

    // Step 4: If session state requires recovery, trigger restart or clean reset
    if (currentStatus === 'FAILED') {
      try {
        const restartRes = await axios.post(
          `${base}/api/sessions/${encodeURIComponent(sessionName)}/restart`,
          {},
          { headers, timeout: 12000 }
        );
        return { success: true, message: `Session "${sessionName}" restarted.`, status: restartRes.data?.status || 'STARTING' };
      } catch (restartErr: any) {
        // Fallback: clean stop followed by start
        try {
          await axios.post(`${base}/api/sessions/${encodeURIComponent(sessionName)}/stop`, {}, { headers, timeout: 8000 }).catch(() => {});
          const startRes = await axios.post(`${base}/api/sessions/${encodeURIComponent(sessionName)}/start`, {}, { headers, timeout: 12000 });
          return { success: true, message: `Session "${sessionName}" recovered.`, status: startRes.data?.status || 'STARTING' };
        } catch (recoverErr: any) {
          try {
            await axios.delete(`${base}/api/sessions/${encodeURIComponent(sessionName)}`, { headers, timeout: 8000 }).catch(() => {});
            await axios.post(`${base}/api/sessions`, { name: sessionName }, { headers, timeout: 8000 });
            const freshStart = await axios.post(`${base}/api/sessions/${encodeURIComponent(sessionName)}/start`, {}, { headers, timeout: 12000 });
            return { success: true, message: `Session "${sessionName}" cleanly recreated.`, status: freshStart.data?.status || 'STARTING' };
          } catch (freshErr) {}
        }
      }
    }

    // Step 5: Start the session: POST /api/sessions/{session}/start
    try {
      const startRes = await axios.post(
        `${base}/api/sessions/${encodeURIComponent(sessionName)}/start`,
        {},
        { headers, timeout: 12000 }
      );
      return { success: true, message: `Session "${sessionName}" started.`, status: startRes.data?.status || 'STARTING' };
    } catch (startErr: any) {
      // Fallback: Evolution API or generic start
      try {
        await axios.post(`${base}/instance/create`, { instanceName: sessionName }, { headers, timeout: 10000 });
        return { success: true, message: `Instance "${sessionName}" initialized.`, status: 'STARTING' };
      } catch {}

      throw new Error(startErr.response?.data?.message || startErr.message || 'Failed to start session on gateway.');
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

    const config = this.getGatewayConfig();
    const isEvolution = config.provider === 'evolution';

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

    // Method 2: Evolution API POST /message/sendText/{instance} (Only if configured for Evolution)
    if (isEvolution) {
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
   * Helper to derive the full accessible public media URL for an attachment.
   */
  public static getPublicMediaUrl(media: { filename?: string; dataUrl?: string; remoteUrl?: string; mediaType?: string }): string {
    const rawFilename = media.filename || '';
    const cleanFilename = path.basename(rawFilename.split('?')[0]);
    const uploadsDir = getUploadsDir();

    let actualFile = cleanFilename;
    if (cleanFilename) {
      if (!fs.existsSync(path.join(uploadsDir, cleanFilename))) {
        const baseNameNoExt = path.parse(cleanFilename).name;
        try {
          const files = fs.readdirSync(uploadsDir);
          const match = files.find(f => f.startsWith(baseNameNoExt));
          if (match) {
            actualFile = match;
          }
        } catch {}
      }
    }

    const appUrl = (process.env.APP_URL || process.env.PUBLIC_URL || '').replace(/\/+$/, '');
    if (appUrl && actualFile) {
      return `${appUrl}/uploads/${actualFile}`;
    }
    return `/uploads/${actualFile}`;
  }

  /**
   * Send a media reply (image, audio, video, document) from the studio DJ to the listener.
   */
  public static async sendMediaMessage(
    serverUrl: string,
    apiKey: string | undefined,
    sessionName: string = 'default',
    to: string,
    media: {
      dataUrl: string;
      base64: string;
      mimeType: string;
      filename: string;
      mediaType: 'image' | 'audio' | 'video' | 'file';
      remoteUrl?: string;
    },
    caption?: string
  ): Promise<any> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) throw new Error('WhatsApp Gateway Server URL is missing.');

    const headers = this.getHeaders(apiKey);
    const resolvedChatId = await this.resolveRecipientChatId(serverUrl, apiKey, sessionName, to);

    if (!resolvedChatId) {
      throw new Error(`Invalid WhatsApp recipient: "${to}". Could not determine a valid phone number or WhatsApp ID.`);
    }

    const config = this.getGatewayConfig();
    const isEvolution = config.provider === 'evolution';

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

    // Build standard WAHA file payload without data: URI in 'url'
    const filePayload: any = {
      mimetype: media.mimeType,
      filename: media.filename
    };
    if (media.base64) {
      filePayload.data = media.base64;
    } else if (media.dataUrl && !media.dataUrl.startsWith('data:')) {
      filePayload.url = media.dataUrl;
    }

    // Method 1: WAHA specific endpoints (/api/sendImage, /api/sendVoice, /api/sendVideo) or generic /api/sendFile
    for (const targetJid of candidates) {
      const endpoints: string[] = [];
      if (media.mediaType === 'image') {
        endpoints.push(`${base}/api/sendImage`, `${base}/api/sendFile`);
      } else if (media.mediaType === 'audio') {
        endpoints.push(`${base}/api/sendVoice`, `${base}/api/sendFile`);
      } else if (media.mediaType === 'video') {
        endpoints.push(`${base}/api/sendVideo`, `${base}/api/sendFile`);
      } else {
        endpoints.push(`${base}/api/sendFile`);
      }

      for (const endpoint of endpoints) {
        try {
          const payload: any = {
            session: sessionName,
            chatId: targetJid,
            file: filePayload
          };
          if (caption && !endpoint.endsWith('/sendVoice')) {
            payload.caption = caption;
          }

          const response = await axios.post(endpoint, payload, { headers, timeout: 30000 });
          return response.data;
        } catch (err: any) {
          lastError = err;
          const errData = err.response?.data;
          const errMsg = errData?.exception?.message || errData?.message || errData?.error || err.message;
          if (typeof errMsg === 'string' && (errMsg.includes('No LID') || errMsg.includes('not found') || errMsg.includes('invalid jid'))) {
            break;
          }
        }
      }
    }

    // Method 2: Evolution API POST /message/sendMedia/{instance} (Only if configured for Evolution)
    if (isEvolution) {
      for (const targetJid of candidates) {
        try {
          const cleanNumber = targetJid.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@lid', '');
          const evoMediaType = media.mediaType === 'audio' ? 'audio' : media.mediaType === 'video' ? 'video' : 'image';
          const response2 = await axios.post(
            `${base}/message/sendMedia/${encodeURIComponent(sessionName)}`,
            {
              number: cleanNumber,
              mediatype: evoMediaType,
              mimetype: media.mimeType,
              caption: caption || undefined,
              media: media.base64,
              fileName: media.filename
            },
            { headers, timeout: 30000 }
          );
          return response2.data;
        } catch (err2: any) {
          lastError = err2;
        }
      }
    }

    // Method 3: Direct Public Media URL Fallback for WAHA if media getter throws on @lid
    if (!isEvolution) {
      for (const targetJid of candidates) {
        try {
          const publicUrl = this.getPublicMediaUrl(media);
          let mediaLabel = '📸 Photo';
          if (media.mediaType === 'audio') mediaLabel = '🎙️ Voice Note';
          else if (media.mediaType === 'video') mediaLabel = '🎬 Video';
          else if (media.mediaType === 'file') mediaLabel = '📁 File';

          const fallbackText = caption
            ? `${caption}\n\n${mediaLabel} from DejavuFM Studio:\n${publicUrl}`
            : `${mediaLabel} from DejavuFM Studio:\n${publicUrl}`;
          const textResult = await this.sendTextMessage(serverUrl, apiKey, sessionName, targetJid, fallbackText);
          console.log(`[WhatsApp Gateway Media Fallback] Delivered media notification via public link to ${targetJid}: ${publicUrl}`);
          return textResult;
        } catch {}
      }
    }

    const lastErrData = lastError?.response?.data;
    const lastErrMsg = lastErrData?.exception?.message || lastErrData?.message || lastErrData?.error || lastError?.message;

    console.error(`[WhatsApp Gateway Media Error] Failed to send media: ${lastErrMsg}`);
    throw new Error(
      lastErrMsg ||
      'Failed to dispatch WhatsApp media message via Gateway.'
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

      const bodyIsBase64 = this.isBase64Image(p.body);
      const dataBodyIsBase64 = this.isBase64Image(p._data?.body);
      const mime = (p.media?.mimetype || p.mimetype || p._data?.mimetype || p.type || '').toLowerCase();

      const isImage = (p.type === 'image') || 
                      mime.startsWith('image') ||
                      bodyIsBase64 || dataBodyIsBase64;
      const isAudio = (p.type === 'audio' || p.type === 'ptt') ||
                      mime.startsWith('audio');
      const isVideo = (p.type === 'video') ||
                      mime.startsWith('video');

      let messageType: GatewayParsedMessage['messageType'] = 'text';
      let text = '';
      let mediaUrl: string | undefined;

      const messageId = p.id?._serialized || p.id || `waha-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      if (isImage) {
        messageType = 'image';
        const caption = p.caption || p._data?.caption || '';
        text = caption || (!bodyIsBase64 && p.body ? p.body : '') || 'Shared an image';

        const base64Candidate = dataBodyIsBase64 ? p._data?.body : (bodyIsBase64 ? p.body : (p.media?.data || undefined));
        const rawMediaUrl = p.media?.url || p.url || undefined;

        if (base64Candidate) {
          const local = this.saveBase64ImageLocally(base64Candidate, messageId);
          if (local) mediaUrl = local;
        }

        if (!mediaUrl && rawMediaUrl) {
          mediaUrl = rawMediaUrl;
        }
      } else if (isAudio) {
        messageType = 'audio';
        text = p.caption || 'Voice Message';
        
        const audioBase64 = this.isBase64Audio(p._data?.body)
          ? p._data?.body
          : (this.isBase64Audio(p.body) ? p.body : (p.media?.data || undefined));
        const rawMediaUrl = p.media?.url || p.url || undefined;

        if (audioBase64) {
          const local = this.saveBase64AudioLocally(audioBase64, messageId);
          if (local) mediaUrl = local;
        }

        if (!mediaUrl && rawMediaUrl) {
          mediaUrl = rawMediaUrl;
        }
      } else if (isVideo) {
        messageType = 'video';
        text = p.caption || 'Video';
        mediaUrl = p.media?.url || p.url || undefined;
      } else {
        text = p.body || '';
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
          messageId,
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
