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
            console.log(`[Twitch Service] Connection parameter change detected. Connecting to Twitch channel: #${channel}...`);
            this.connect(channel, oauth);
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
  private static connect(channel: string, oauth: string): void {
    this.disconnect();

    this.channelName = channel;
    this.oauthToken = oauth;

    const wsUrl = "wss://irc-ws.chat.twitch.tv:443";
    console.log(`[Twitch Service] Connecting to Twitch WebSocket: ${wsUrl}`);

    const socket = new WebSocket(wsUrl);
    this.ws = socket;

    socket.on('open', () => {
      console.log(`[Twitch Service] WebSocket connection opened. authenticating for channel: #${channel}`);
      this.isConnected = true;

      // Request tags and commands capability for richer chat metadata (names, colors, etc.)
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      socket.send(`PASS ${oauth}`);
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
      console.warn(`[Twitch Service] Connection closed (code: ${code}, reason: ${reason}). Attempting reconnection in 5 seconds...`);
      this.isConnected = false;
      this.scheduleReconnection(channel, oauth);
    });

    socket.on('error', (err) => {
      console.error("[Twitch Service] WebSocket error:", err.message);
    });
  }

  /**
   * Send a PING message to the server periodically to ensure connection doesn't idle.
   */
  private static startKeepAlive(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.send("PING :tmi.twitch.tv");
      }
    }, 60000); // Send PING every minute
  }

  /**
   * Reconnects to Twitch IRC if connection dropped.
   */
  private static scheduleReconnection(channel: string, oauth: string): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      // Verify we still have the same desired channel/credentials before reconnecting
      this.connect(channel, oauth);
    }, 5000);
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
        if (this.ws) {
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
    if (!this.ws || !this.isConnected || !this.channelName) {
      throw new Error("Twitch Chat IRC client is not currently connected.");
    }

    try {
      // Remove any recipient tags at the start of text if Dejavu panel added them automatically (e.g., "@chatter hello")
      // Twitch IRC expects standard text; we can keep the @mention since it targets the user in twitch chat!
      const rawIrcCommand = `PRIVMSG #${this.channelName} :${text}`;
      this.ws.send(rawIrcCommand);
      console.log(`[Twitch Service] Chat message dispatched to Twitch channel #${this.channelName}: "${text}"`);
    } catch (err: any) {
      console.error("[Twitch Service] Failed to send Twitch message:", err.message);
      throw err;
    }
  }
}
