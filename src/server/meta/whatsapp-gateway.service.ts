import axios from 'axios';

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
}

export class WhatsappGatewayService {
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
    if (clean.includes('@c.us') || clean.includes('@s.whatsapp.net')) {
      return clean;
    }
    // Extract numbers from strings like "John (+44 7123 456789)" or "+447123456789"
    const digits = clean.replace(/\D/g, '');
    if (!digits) return clean;
    return `${digits}@c.us`;
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
              status: isWorking ? 'CONNECTED' : (rawStatus === 'SCAN_QR_CODE' ? 'SCAN_QR_CODE' : 'STARTING'),
              connected: isWorking,
              sessionName: match.name || sessionName,
              raw: match
            };
          }
        }
      } catch (fallbackErr) {
        // Fallback failed as well
      }

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
   * Returns a base64 data URI (image/png) or raw QR string.
   */
  public static async getQrCode(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<{ qr: string | null; type: 'image' | 'raw'; error?: string }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) return { qr: null, type: 'raw', error: 'Gateway URL is missing' };

    const headers = this.getHeaders(apiKey);

    // Endpoints in order of standard WAHA / Evolution API support:
    const endpoints = [
      `${base}/api/${encodeURIComponent(sessionName)}/auth/qr`,
      `${base}/api/sessions/${encodeURIComponent(sessionName)}/auth/qr`,
      `${base}/api/default/auth/qr`,
      `${base}/instance/connect/${encodeURIComponent(sessionName)}`
    ];

    for (const ep of endpoints) {
      try {
        const res = await axios.get(ep, {
          headers,
          responseType: 'arraybuffer',
          timeout: 8000
        });

        const contentType = String(res.headers['content-type'] || '');

        // If returned image (PNG/JPEG)
        if (contentType.includes('image/') || Buffer.isBuffer(res.data)) {
          const b64 = Buffer.from(res.data).toString('base64');
          // If response is actually JSON formatted in buffer
          try {
            const parsed = JSON.parse(Buffer.from(res.data).toString('utf8'));
            if (parsed.data || parsed.qr || parsed.code) {
              const rawCode = parsed.data || parsed.qr || parsed.code;
              if (typeof rawCode === 'string' && rawCode.startsWith('data:image')) {
                return { qr: rawCode, type: 'image' };
              }
              return { qr: rawCode, type: 'raw' };
            }
          } catch (notJson) {
            // It's binary image
            return { qr: `data:image/png;base64,${b64}`, type: 'image' };
          }
        }

        // If returned string or JSON
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
      } catch (err: any) {
        // Try next endpoint
      }
    }

    return {
      qr: null,
      type: 'raw',
      error: 'Unable to retrieve QR code. Make sure the session has been started.'
    };
  }

  /**
   * Start or initialize a session on the gateway.
   */
  public static async startSession(
    serverUrl: string,
    apiKey?: string,
    sessionName: string = 'default'
  ): Promise<{ success: boolean; message: string }> {
    const base = this.normalizeUrl(serverUrl);
    if (!base) throw new Error('Gateway URL is required.');

    const headers = this.getHeaders(apiKey);

    try {
      // 1. Try POST /api/sessions/{session}/start
      await axios.post(
        `${base}/api/sessions/${encodeURIComponent(sessionName)}/start`,
        {},
        { headers, timeout: 10000 }
      );
      return { success: true, message: `Session "${sessionName}" started.` };
    } catch (err: any) {
      // 2. Try POST /api/sessions/start with body { name: sessionName }
      try {
        await axios.post(
          `${base}/api/sessions/start`,
          { name: sessionName },
          { headers, timeout: 10000 }
        );
        return { success: true, message: `Session "${sessionName}" started.` };
      } catch (err2: any) {
        // 3. Try POST /api/sessions (create session)
        try {
          await axios.post(
            `${base}/api/sessions`,
            { name: sessionName },
            { headers, timeout: 10000 }
          );
          return { success: true, message: `Session "${sessionName}" created and started.` };
        } catch (err3: any) {
          throw new Error(err3.response?.data?.message || err.message || 'Failed to start session on gateway.');
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
    if (!base) throw new Error('Gateway URL is missing.');

    const headers = this.getHeaders(apiKey);
    const chatId = this.formatChatId(to);

    if (!chatId) throw new Error('Invalid WhatsApp recipient phone number or Chat ID.');

    // Method 1: WAHA standard POST /api/sendText
    try {
      const response = await axios.post(
        `${base}/api/sendText`,
        {
          session: sessionName,
          chatId,
          text
        },
        { headers, timeout: 12000 }
      );
      return response.data;
    } catch (err: any) {
      console.warn('[WhatsApp Gateway] /api/sendText failed, attempting alternate route:', err.message);

      // Method 2: WAHA session scoped POST /api/{session}/send/text
      try {
        const response2 = await axios.post(
          `${base}/api/${encodeURIComponent(sessionName)}/send/text`,
          {
            chatId,
            text
          },
          { headers, timeout: 12000 }
        );
        return response2.data;
      } catch (err2: any) {
        // Method 3: Evolution API POST /message/sendText/{instance}
        try {
          const response3 = await axios.post(
            `${base}/message/sendText/${encodeURIComponent(sessionName)}`,
            {
              number: chatId.replace('@c.us', '').replace('@s.whatsapp.net', ''),
              text
            },
            { headers, timeout: 12000 }
          );
          return response3.data;
        } catch (err3: any) {
          throw new Error(
            err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            'Failed to dispatch WhatsApp message via Gateway.'
          );
        }
      }
    }
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
      const cleanPhone = rawFrom.replace(/@.+/, '');
      const notifyName = p._data?.notifyName || p.notifyName || p.pushName || '';
      const senderName = notifyName ? `${notifyName} (+${cleanPhone})` : `+${cleanPhone}`;

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
          senderId: cleanPhone || rawFrom,
          senderName,
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
      const cleanPhone = remoteJid.replace(/@.+/, '');
      const pushName = data.pushName || '';
      const senderName = pushName ? `${pushName} (+${cleanPhone})` : `+${cleanPhone}`;

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
          senderId: cleanPhone || remoteJid,
          senderName,
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
      const cleanPhone = String(body.from).replace(/@.+/, '');
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
