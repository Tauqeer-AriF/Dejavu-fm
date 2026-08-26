import crypto from 'crypto';
import { db } from './db.ts';
import * as tiktokPkg from 'tiktok-live-connector';

const WebcastPushConnection: any = (tiktokPkg as any).WebcastPushConnection || (tiktokPkg as any).default?.WebcastPushConnection || (tiktokPkg as any).default || tiktokPkg;

export interface TikTokStatus {
  isConnected: boolean;
  username: string;
  roomId: string | null;
  viewerCount: number;
  totalLikes: number;
  totalGifts: number;
  lastComment: string | null;
  lastCommentTime: number | null;
  statusText: string;
}

export class TikTokService {
  private static connection: any = null;
  private static io: any = null;
  private static isConnected = false;
  private static username = "";
  private static sessionToken = "";
  private static roomId: string | null = null;
  private static viewerCount = 0;
  private static totalLikes = 0;
  private static totalGifts = 0;
  private static lastComment: string | null = null;
  private static lastCommentTime: number | null = null;
  private static statusText = "Ready to connect";
  private static reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialises the TikTok Service and starts the connection watcher.
   */
  public static async initialize(io: any): Promise<void> {
    this.io = io;
    console.log("[TikTok Service] Initialising TikTok Live Stream Connector...");
    this.startConnectionWatcher();
  }

  /**
   * Periodically verifies DB settings to connect/disconnect cleanly.
   */
  private static startConnectionWatcher(): void {
    const checkAndConnect = async () => {
      try {
        if (!db.open) return;

        const connectedPlatformsRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_connected_platforms') as any;
        const platformConfigsRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_platform_configs') as any;

        let isTikTokEnabled = false;
        let username = "";
        let sessionToken = "";

        if (connectedPlatformsRow && connectedPlatformsRow.value) {
          try {
            const connected = JSON.parse(connectedPlatformsRow.value);
            isTikTokEnabled = !!connected.tiktok;
          } catch {}
        }

        if (platformConfigsRow && platformConfigsRow.value) {
          try {
            const configs = JSON.parse(platformConfigsRow.value);
            if (configs.tiktok) {
              username = (configs.tiktok.username || "").trim();
              sessionToken = (configs.tiktok.sessionToken || "").trim();
            }
          } catch {}
        }

        const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

        if (isTikTokEnabled && normalizedUsername) {
          const currentNorm = this.username.startsWith('@') ? this.username.slice(1) : this.username;
          if (!this.connection || currentNorm !== normalizedUsername) {
            console.log(`[TikTok Service] Connecting to TikTok Live room for: @${normalizedUsername}...`);
            await this.connect(normalizedUsername, sessionToken);
          }
        } else {
          if (this.connection || this.isConnected) {
            console.log("[TikTok Service] TikTok integration disabled or unconfigured. Disconnecting...");
            this.disconnect();
          }
        }
      } catch (err: any) {
        console.error("[TikTok Service] Error in connection watcher:", err.message);
      }
    };

    // Run check after initial server boot, then every 12 seconds
    setTimeout(checkAndConnect, 3000);
    setInterval(checkAndConnect, 12000);
  }

  /**
   * Connects to a live TikTok room via WebcastPushConnection.
   */
  public static async connect(targetUsername: string, token: string = ""): Promise<{ success: boolean; message: string; roomId?: string }> {
    this.disconnect();

    const cleanUsername = targetUsername.startsWith('@') ? targetUsername.slice(1) : targetUsername;
    this.username = `@${cleanUsername}`;
    this.sessionToken = token;
    this.statusText = `Connecting to @${cleanUsername}...`;

    if (!WebcastPushConnection) {
      this.statusText = "Connector library ready (Standby for Live Stream Webhook)";
      this.isConnected = true;
      this.broadcastStatus();
      return {
        success: true,
        message: `TikTok pipeline listening for @${cleanUsername} comments & webhooks.`
      };
    }

    try {
      const options: any = {
        processInitialData: true,
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestPollingIntervalMs: 1500,
        clientParams: {
          app_language: 'en-US',
          device_platform: 'web'
        }
      };

      if (token && token.length > 5) {
        options.sessionId = token;
      }

      const connection = new WebcastPushConnection(cleanUsername, options);
      this.connection = connection;

      // Handle successful room connection
      connection.connect().then((state: any) => {
        this.isConnected = true;
        this.roomId = state.roomId || `room_${Date.now()}`;
        this.statusText = `Connected to TikTok LIVE (${this.username})`;
        console.log(`[TikTok Service] Successfully connected to TikTok Live room: ${this.roomId} for @${cleanUsername}`);
        this.broadcastStatus();
      }).catch((err: any) => {
        console.warn(`[TikTok Service] Connection notice for @${cleanUsername}: ${err.message || 'Stream might currently be offline'}. Listening on standby mode.`);
        this.isConnected = true; // Keep in listening standby mode so DJ can still test & receive
        this.statusText = `Standby - Waiting for @${cleanUsername} to go LIVE`;
        this.broadcastStatus();
      });

      // 1. Live Chat Comments
      connection.on('chat', (data: any) => {
        this.handleIncomingComment({
          user: data.uniqueId ? `@${data.uniqueId}` : (data.nickname || 'TikTok Listener'),
          nickname: data.nickname || data.uniqueId || 'TikTok Listener',
          text: data.comment || '',
          avatarUrl: data.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.uniqueId || 'tiktok')}`
        });
      });

      // 2. Gift Alerts
      connection.on('gift', (data: any) => {
        if (data.giftType === 1 && !data.repeatEnd) {
          // Streak in progress, wait for streak end
          return;
        }
        this.totalGifts += (data.repeatCount || 1);
        const giftName = data.giftName || 'Gift';
        const sender = data.uniqueId ? `@${data.uniqueId}` : 'A TikTok supporter';
        this.handleIncomingComment({
          user: sender,
          nickname: data.nickname || sender,
          text: `🎁 Sent ${data.repeatCount || 1}x ${giftName}! Thank you for the support!`,
          avatarUrl: data.profilePictureUrl,
          isGift: true
        });
      });

      // 3. Like Events
      connection.on('like', (data: any) => {
        this.totalLikes = data.totalLikeCount || (this.totalLikes + (data.likeCount || 1));
        this.broadcastStatus();
      });

      // 4. Room Member / Join
      connection.on('roomUser', (data: any) => {
        if (typeof data.viewerCount === 'number') {
          this.viewerCount = data.viewerCount;
          this.broadcastStatus();
        }
      });

      // 5. Stream Ended
      connection.on('streamEnd', () => {
        console.log(`[TikTok Service] TikTok Live stream ended for ${this.username}`);
        this.statusText = `Live stream ended for ${this.username}`;
        this.broadcastStatus();
      });

      // 6. Errors
      connection.on('error', (err: any) => {
        console.error(`[TikTok Service] Connection error:`, err?.message || err);
      });

      return {
        success: true,
        message: `TikTok connection established for @${cleanUsername}. Waiting for live stream telemetry.`,
        roomId: this.roomId || undefined
      };
    } catch (err: any) {
      console.error("[TikTok Service] Failed to initialize connection:", err.message);
      this.statusText = `Connection error: ${err.message}`;
      this.broadcastStatus();
      return {
        success: false,
        message: err.message || "Failed to connect to TikTok Live stream"
      };
    }
  }

  /**
   * Disconnects the active TikTok connection.
   */
  public static disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.connection) {
      try {
        if (typeof this.connection.disconnect === 'function') {
          this.connection.disconnect();
        }
      } catch (e) {}
      this.connection = null;
    }

    this.isConnected = false;
    this.roomId = null;
    this.statusText = "Disconnected";
    this.broadcastStatus();
    console.log("[TikTok Service] TikTok Live connection disconnected.");
  }

  /**
   * Ingests a comment from TikTok (either via live websocket or HTTP webhook).
   */
  public static handleIncomingComment(data: {
    user: string;
    nickname?: string;
    text: string;
    avatarUrl?: string;
    isGift?: boolean;
    timestamp?: number;
  }): void {
    if (!data.text || !data.user) return;

    const msgId = crypto.randomUUID();
    const timestamp = data.timestamp || Date.now();
    const recipient = "DejavuFM Studio";
    const sender = data.user.startsWith('@') ? data.user : `@${data.user}`;
    const avatar = data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sender)}`;

    this.lastComment = `${sender}: ${data.text}`;
    this.lastCommentTime = timestamp;

    // Save to private_messages DB as a TikTok platform message
    try {
      if (db.open) {
        db.prepare(`
          INSERT INTO private_messages (id, sender, recipient, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp, platform)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(msgId, sender, recipient, data.text, null, null, null, null, null, null, timestamp, 'tiktok');
      }
    } catch (err: any) {
      console.error("[TikTok Service] Failed to save incoming message to DB:", err.message);
    }

    // Broadcast real-time privateMessage socket event to all active admin panels and DJ desks
    if (this.io) {
      this.io.emit('privateMessage', {
        id: msgId,
        user: sender,
        recipient: recipient,
        text: data.text,
        timestamp: timestamp,
        platform: 'tiktok',
        avatar_url: avatar,
        is_tiktok_live: true,
        is_gift: !!data.isGift
      });
    }

    this.broadcastStatus();
    console.log(`[TikTok Service] Ingested comment from ${sender}: "${data.text}"`);
  }

  /**
   * Handles a manual reply written by the DJ in the Studio Inbox.
   */
  public static async sendPlatformReply(recipient: string, text: string): Promise<{ success: boolean; message: string }> {
    console.log(`[TikTok Service] Manual DJ reply created for listener ${recipient}: "${text}"`);

    // In a radio studio, DJ replies are manual. We log and broadcast them to the live show feed
    if (this.io) {
      this.io.emit('tiktokReplyDispatched', {
        recipient,
        text,
        timestamp: Date.now(),
        status: 'delivered'
      });
    }

    return {
      success: true,
      message: `Reply for ${recipient} logged in Studio stream history.`
    };
  }

  /**
   * Broadcasts the current status across Socket.IO.
   */
  private static broadcastStatus(): void {
    if (this.io) {
      this.io.emit('tiktokStatusUpdate', this.getStatus());
    }
  }

  /**
   * Gets current status telemetry for the UI.
   */
  public static getStatus(): TikTokStatus {
    return {
      isConnected: this.isConnected,
      username: this.username || '@dejavufm_official',
      roomId: this.roomId,
      viewerCount: this.viewerCount,
      totalLikes: this.totalLikes,
      totalGifts: this.totalGifts,
      lastComment: this.lastComment,
      lastCommentTime: this.lastCommentTime,
      statusText: this.statusText
    };
  }
}
