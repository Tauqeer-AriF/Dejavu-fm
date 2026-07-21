import WebSocket from 'ws';
import crypto from 'crypto';
import { db } from './db.js';

export class TwitchService {
  private static ws: WebSocket | null = null;
  private static io: any = null;
  private static isConnected = false;
  private static channelName = "";
  private static oauthToken = "";
  private static reconnectTimeout: NodeJS.Timeout | null = null;
  private static pingInterval: NodeJS.Timeout | null = null;

  // Exponential backoff configuration
  private static retryCount = 0;
  private static readonly BASE_RECONNECT_DELAY_MS = 1000; // start at 1 second
  private static readonly MAX_RECONNECT_DELAY_MS = 30000; // max 30 seconds
  private static readonly BACKOFF_FACTOR = 2; // multiply by 2 each time
  private static readonly JITTER_RANGE_MS = 1500; // random jitter up to 1.5s

  /**
   * Initializes the Twitch Service and starts the Twitch IRC connection if enabled.
   */
  public static async initialize(io: any): Promise<void> {
    this.io = io;
    console.log("[Twitch Service] Initializing Twitch Chat IRC Integration...");

    // Start checking connection status periodically or connect if enabled
    this.startConnectionWatcher();
  }

  /**
   * Periodically checks settings to ensure our connection matches the desired state.
   */
  private static startConnectionWatcher(): void {
    const checkAndConnect = () => {
      try {
        if (!db.open) return;

        // Retrieve connected platforms and configs
        const connectedPlatformsRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_connected_platforms') as any;
        const platformConfigsRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_platform_configs') as any;

        let isTwitchEnabled = false;
        let channel = "";
        let oauth = "";

        if (connectedPlatformsRow && connectedPlatformsRow.value) {
          const connected = JSON.parse(connectedPlatformsRow.value);
          isTwitchEnabled = !!connected.twitch;
        }

        if (platformConfigsRow && platformConfigsRow.value) {
          const configs = JSON.parse(platformConfigsRow.value);
          if (configs.twitch) {
            channel = (configs.twitch.channel || "").trim().toLowerCase();
            oauth = (configs.twitch.oauthToken || "").trim();
          }
        }

        // Handle connection state changes
        if (isTwitchEnabled && channel && oauth) {
          if (!this.ws || this.channelName !== channel || this.oauthToken !== oauth) {
            console.log(`[Twitch Service] Connection parameter or status change detected. Connecting to Twitch channel: #${channel}...`);
            // Reset retry count on manual setting changes / initial connections
            this.retryCount = 0;
            this.connect(channel, oauth, false);
          }
        } else {
          if (this.ws || this.isConnected) {
            console.log("[Twitch Service] Twitch Integration disabled or unconfigured in Settings. Disconnecting...");
            this.disconnect();
          }
        }
      } catch (err: any) {
        console.error("[Twitch Service] Error in connection watcher:", err.message);
      }
    };

    // Check immediately, then every 10 seconds
    checkAndConnect();
    setInterval(checkAndConnect, 10000);
  }

  /**
   * Disconnects the active WebSocket.
   */
  public static disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      try {
        // Remove listeners to prevent memory leaks and unexpected close events
        this.ws.removeAllListeners();
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.channelName = "";
    this.oauthToken = "";
    console.log("[Twitch Service] Twitch IRC WebSocket disconnected.");
  }

  /**
   * Connects to Twitch IRC over WebSockets.
   */
  private static connect(channel: string, oauth: string, isReconnect = false): void {
    // If we're performing a fresh connect (not a reconnect backoff attempt), disconnect first & reset retryCount
    if (!isReconnect) {
      this.disconnect();
      this.retryCount = 0;
    } else if (this.ws) {
      // In a reconnect flow, if there's an existing socket, clean it up gracefully first
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.channelName = channel;
    this.oauthToken = oauth;

    const wsUrl = "wss://irc-ws.chat.twitch.tv:443";
    console.log(`[Twitch Service] Connecting to Twitch WebSocket (Attempt #${this.retryCount + 1}): ${wsUrl}`);

    const socket = new WebSocket(wsUrl);
    this.ws = socket;

    socket.on('open', () => {
      console.log(`[Twitch Service] WebSocket connection opened. Authenticating for channel: #${channel}`);
      this.isConnected = true;
      // Reset retry count on successful connection establishment
      this.retryCount = 0;

      // Request tags and commands capability for richer chat metadata (names, colors, etc.)
      const formattedPass = oauth.startsWith("oauth:") ? oauth : `oauth:${oauth}`;
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      socket.send(`PASS ${formattedPass}`);
      socket.send(`NICK ${channel}`);
      socket.send(`JOIN #${channel}`);

      // Start keepalive ping to keep the connection open
      this.startKeepAlive();
    });

    socket.on('message', (data: WebSocket.Data) => {
      const rawPayload = data.toString();
      this.handleIncomingRawMessage(rawPayload);
    });

    socket.on('close', (code, reason) => {
      console.warn(`[Twitch Service] Connection closed (code: ${code}, reason: ${reason}).`);
      this.isConnected = false;
      this.scheduleReconnection(channel, oauth);
    });

    socket.on('error', (err) => {
      console.error("[Twitch Service] WebSocket error:", err.message);
      this.isConnected = false;
      this.scheduleReconnection(channel, oauth);
    });
  }

  /**
   * Send a PING message to the server periodically to ensure connection doesn't idle.
   */
  private static startKeepAlive(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("PING :tmi.twitch.tv");
      }
    }, 60000); // Send PING every minute
  }

  /**
   * Reconnects to Twitch IRC if connection dropped using exponential backoff with jitter.
   */
  private static scheduleReconnection(channel: string, oauth: string): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    // Calculate backoff: delay = min(BASE * FACTOR ^ retryCount, MAX) + jitter
    const delay = Math.min(
      this.BASE_RECONNECT_DELAY_MS * Math.pow(this.BACKOFF_FACTOR, this.retryCount),
      this.MAX_RECONNECT_DELAY_MS
    ) + Math.floor(Math.random() * this.JITTER_RANGE_MS);

    console.log(`[Twitch Service] Scheduling reconnection attempt #${this.retryCount + 1} in ${(delay / 1000).toFixed(2)} seconds...`);
    this.retryCount++;

    this.reconnectTimeout = setTimeout(() => {
      try {
        if (!db.open) return;

        // Double check if Twitch is still enabled and parameters haven't changed
        const connectedPlatformsRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_connected_platforms') as any;
        const platformConfigsRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_platform_configs') as any;

        let isTwitchEnabled = false;
        let currentChannel = "";
        let currentOauth = "";

        if (connectedPlatformsRow && connectedPlatformsRow.value) {
          const connected = JSON.parse(connectedPlatformsRow.value);
          isTwitchEnabled = !!connected.twitch;
        }

        if (platformConfigsRow && platformConfigsRow.value) {
          const configs = JSON.parse(platformConfigsRow.value);
          if (configs.twitch) {
            currentChannel = (configs.twitch.channel || "").trim().toLowerCase();
            currentOauth = (configs.twitch.oauthToken || "").trim();
          }
        }

        if (isTwitchEnabled && currentChannel === channel && currentOauth === oauth) {
          this.connect(channel, oauth, true);
        } else {
          console.log("[Twitch Service] Reconnection canceled: Twitch integration was disabled or settings changed during backoff.");
          this.disconnect();
        }
      } catch (err: any) {
        console.error("[Twitch Service] Error during scheduled reconnection check:", err.message);
      }
    }, delay);
  }

  /**
   * Parses the raw Twitch IRC stream and handles PRIVMSGs.
   */
  private static handleIncomingRawMessage(rawPayload: string): void {
    const lines = rawPayload.split(/\r?\n/);
    for (const line of lines) {
      if (!line) continue;

      // Handle PING from Twitch (keepalive)
      if (line.startsWith("PING")) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send("PONG :tmi.twitch.tv");
        }
        continue;
      }

      // Handle PRIVMSG messages
      if (line.includes("PRIVMSG")) {
        this.parseAndBroadcastPrivmsg(line);
      }
    }
  }

  /**
   * Parses a single PRIVMSG line and broadcasts it to the Studio UI.
   */
  private static parseAndBroadcastPrivmsg(line: string): void {
    try {
      // Regex pattern to extract optional tags, prefix, channel, and message text
      // Example: @badge-info=;badges=... :user!user@user.tmi.twitch.tv PRIVMSG #channel :Hello world!
      const privmsgRegex = /^(?:@([^\s]+)\s+)?([^ ]+)\s+PRIVMSG\s+#([^\s]+)\s+:(.*)$/;
      const match = line.match(privmsgRegex);
      if (!match) return;

      const tagsRaw = match[1];
      const prefix = match[2];
      const channel = match[3];
      const text = match[4];

      // Extract username from prefix (e.g. :username!username@username.tmi.twitch.tv)
      const userMatch = prefix.match(/:([^!]+)!/);
      const username = userMatch ? userMatch[1] : "TwitchUser";

      // Ignore messages from self to prevent infinite echoing loops
      if (username.toLowerCase() === this.channelName.toLowerCase()) {
        return;
      }

      // Parse tags for display-name and color
      let displayName = username;
      let userColor = "#a855f7"; // purple

      if (tagsRaw) {
        const tags = tagsRaw.split(';');
        for (const tag of tags) {
          const [key, value] = tag.split('=');
          if (key === 'display-name' && value) {
            displayName = value;
          } else if (key === 'color' && value) {
            userColor = value;
          }
        }
      }

      const msgId = crypto.randomUUID();
      const timestamp = Date.now();
      const recipient = "DejavuFM Studio";

      // Save to private_messages DB as a Twitch platform DM so it is retained
      if (db.open) {
        db.prepare(`
          INSERT INTO private_messages (id, sender, recipient, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp, platform)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(msgId, displayName, recipient, text, null, null, null, null, null, null, timestamp, 'twitch');
      }

      // Broadcast the real-time privateMessage socket event to all active admin panels
      if (this.io) {
        this.io.emit('privateMessage', {
          id: msgId,
          user: displayName,
          recipient: recipient,
          text: text,
          timestamp: timestamp,
          platform: 'twitch',
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`
        });
      }

      console.log(`[Twitch Service] Chat message received and routed from ${displayName}: "${text}"`);
    } catch (err: any) {
      console.error("[Twitch Service] Error parsing PRIVMSG:", err.message);
    }
  }

  /**
   * Sends a message to the currently active Twitch Channel.
   */
  public static async sendChatMessage(text: string): Promise<void> {
    if (!this.ws || !this.isConnected || !this.channelName || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Twitch Chat IRC client is not currently connected or ready.");
    }

    try {
      const rawIrcCommand = `PRIVMSG #${this.channelName} :${text}`;
      this.ws.send(rawIrcCommand);
      console.log(`[Twitch Service] Chat message dispatched to Twitch channel #${this.channelName}: "${text}"`);
    } catch (err: any) {
      console.error("[Twitch Service] Failed to send Twitch message:", err.message);
      throw err;
    }
  }
}
