import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { WhatsappService, StandardMessage } from './whatsapp.service.ts';
import { WhatsappGatewayService } from './whatsapp-gateway.service.ts';
import { InstagramService } from './instagram.service.ts';
import { MessengerService } from './messenger.service.ts';

export class WebhookController {
  /**
   * GET /webhook
   * Verification challenge handler for Meta webhooks
   */
  public static verifyWebhook(req: Request, res: Response): void {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Retrieve verification token from environment variable or database setting
      const envToken = process.env.VERIFY_TOKEN;
      let dbToken = 'dejavu_verify_token';
      
      try {
        if (db.open) {
          const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('meta_verify_token') as any;
          if (row && row.value) {
            dbToken = row.value;
          } else {
            // Check studio_platform_configs -> whatsapp -> verifyToken
            const configRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_platform_configs') as any;
            if (configRow && configRow.value) {
              const platformConfigs = JSON.parse(configRow.value);
              if (platformConfigs?.whatsapp?.verifyToken) {
                dbToken = platformConfigs.whatsapp.verifyToken;
              }
            }
          }
        }
      } catch (err) {
        console.error('[Meta Webhook Verification] Error loading token from db settings:', err);
      }

      const expectedTokens = [envToken, dbToken, 'dejavu_whatsapp_secret_key', 'dejavu_verify_token'].filter(Boolean);

      console.log('[Meta Webhook Verification] Incoming request', { mode, token, challenge });

      if (mode && token) {
        if (mode === 'subscribe' && expectedTokens.includes(token as string)) {
          console.log('[Meta Webhook Verification] Successfully verified webhook.');
          res.status(200).send(challenge);
          return;
        } else {
          console.warn('[Meta Webhook Verification] Failed verification. Token did not match expected tokens.', { received: token, expected: expectedTokens });
          res.sendStatus(403);
          return;
        }
      }
      
      res.sendStatus(400);
    } catch (error) {
      console.error('[Meta Webhook Verification] Critical verification error:', error);
      res.sendStatus(500);
    }
  }

  /**
   * POST /webhook
   * Event ingestion handler for Meta webhooks
   */
  public static processWebhook(req: Request, res: Response): void {
    const payload = req.body;

    // Log the incoming payload
    console.log('[Meta Webhook POST] Received payload:', JSON.stringify(payload, null, 2));

    // Return HTTP 200 immediately to meet Meta's responsiveness SLA (under 3 seconds)
    res.status(200).send('EVENT_RECEIVED');

    // Run processing asynchronously in setImmediate to not block Express
    setImmediate(async () => {
      try {
        let platform: 'whatsapp' | 'instagram' | 'facebook' | null = null;
        let messages: StandardMessage[] = [];

        // Detect source platform
        if (payload.object === 'whatsapp_business_account') {
          platform = 'whatsapp';
          messages = WhatsappService.parseWebhook(payload);
        } else if (payload.object === 'instagram') {
          platform = 'instagram';
          messages = InstagramService.parseWebhook(payload);
        } else if (payload.object === 'page') {
          platform = 'facebook';
          messages = MessengerService.parseWebhook(payload);
        } else if (payload.event || payload.session || payload.from || payload.data?.key) {
          // Self-hosted WhatsApp Gateway (WAHA / Evolution API)
          platform = 'whatsapp';
          const gatewayMsgs = WhatsappGatewayService.parseWebhookPayload(payload);
          messages = gatewayMsgs.map(gm => ({
            platform: 'whatsapp',
            senderId: gm.senderId,
            senderName: gm.senderName,
            recipientId: 'DejavuFM Studio',
            messageId: gm.messageId,
            messageType: gm.messageType,
            text: gm.text,
            timestamp: gm.timestamp,
            rawPayload: payload,
            mediaUrl: gm.mediaUrl
          }));
        } else {
          console.warn('[Meta Webhook POST] Unhandled webhook object type:', payload.object || payload.event);
          return;
        }

        if (messages.length === 0) {
          console.log('[Meta Webhook POST] No actionable user messages extracted from payload.');
          return;
        }

        console.log(`[Meta Webhook POST] Extracted ${messages.length} messages for platform: ${platform}`);

        // Check if webhook processing is enabled globally and for this platform
        let isWebhookProcessingEnabled = true;
        try {
          if (db.open) {
            const globalRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('meta_webhook_processing_enabled') as any;
            if (globalRow && globalRow.value) {
              isWebhookProcessingEnabled = globalRow.value === 'true';
            }

            if (isWebhookProcessingEnabled) {
              const platformRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('meta_webhook_processing_platforms') as any;
              if (platformRow && platformRow.value) {
                const platformsConfig = JSON.parse(platformRow.value);
                if (platformsConfig && typeof platformsConfig === 'object' && platformsConfig[platform] === false) {
                  isWebhookProcessingEnabled = false;
                }
              }
            }
          }
        } catch (dbErr) {
          console.error('[Meta Webhook POST] Failed to check webhook processing state:', dbErr);
        }

        if (!isWebhookProcessingEnabled) {
          console.log(`[Meta Webhook POST] Webhook processing is disabled globally or specifically for ${platform}. Ignoring webhook.`);
          return;
        }

        // Fetch connected platforms configuration from the database
        let isPlatformConnected = true;
        try {
          if (db.open) {
            const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_connected_platforms') as any;
            if (row && row.value) {
              const connectedPlatforms = JSON.parse(row.value);
              isPlatformConnected = !!connectedPlatforms[platform];
            }
          }
        } catch (dbErr) {
          console.error('[Meta Webhook POST] Failed to fetch connected platforms from SQLite settings:', dbErr);
        }

        // Even if not marked as connected, let's log the messages. 
        // We will receive and display them in the studio if platform is enabled.
        if (!isPlatformConnected) {
          console.log(`[Meta Webhook POST] Platform ${platform} is currently disabled in Studio Settings. Messages will still be recorded but flagged.`);
        }

        const gatewayConfig = platform === 'whatsapp' ? WhatsappGatewayService.getGatewayConfig() : undefined;
        for (const msg of messages) {
          if (msg.mediaUrl && !msg.mediaUrl.startsWith('/uploads/') && gatewayConfig?.serverUrl) {
            try {
              const local = await WhatsappGatewayService.saveRemoteMediaLocally(
                msg.mediaUrl,
                gatewayConfig.serverUrl,
                gatewayConfig.apiKey,
                undefined,
                msg.messageId,
                msg.messageType === 'audio' ? 'audio/ogg' : undefined
              );
              if (local) {
                msg.mediaUrl = local;
              }
            } catch {}
          }
        }

        const io = req.app.get('io');

        for (const msg of messages) {
          const messageId = msg.messageId || `meta-${crypto.randomUUID()}`;
          const senderId = msg.senderId;
          const senderName = msg.senderName || senderId;

          // Check if message ID was deleted
          try {
            if (db.open) {
              const isTombstoned = db.prepare("SELECT 1 FROM deleted_message_tombstones WHERE id = ?").get(messageId);
              if (isTombstoned) {
                continue;
              }

              const candKeys = [
                senderName?.toLowerCase().trim(),
                senderId?.toLowerCase().trim(),
                (senderId || '').replace(/\D/g, '')
              ].filter(Boolean);

              if (candKeys.length > 0) {
                const placeholders = candKeys.map(() => '?').join(',');
                const threadTombstone = db.prepare(`
                  SELECT MAX(deleted_at) as max_deleted_at 
                  FROM deleted_threads_tombstones 
                  WHERE LOWER(target_id) IN (${placeholders})
                `).get(...candKeys) as any;

                if (threadTombstone?.max_deleted_at && (msg.timestamp || Date.now()) <= threadTombstone.max_deleted_at) {
                  continue;
                }
              }
            }
          } catch (tombErr) {}
          
          // Auto-extract media URL from text if messageType wasn't explicitly parsed
          let detectedImageUrl = msg.messageType === 'image' && msg.mediaUrl && msg.mediaUrl !== 'placeholder' ? msg.mediaUrl : null;
          let detectedAudioUrl = msg.messageType === 'audio' && msg.mediaUrl && msg.mediaUrl !== 'placeholder' ? msg.mediaUrl : null;
          let detectedVideoUrl = msg.messageType === 'video' && msg.mediaUrl && msg.mediaUrl !== 'placeholder' ? msg.mediaUrl : null;
          let cleanDbText = msg.text || null;

          if (!detectedImageUrl && !detectedAudioUrl && !detectedVideoUrl && typeof msg.text === 'string') {
            const mediaAttachmentMatch = msg.text.match(/\[Media attachment:\s*([^\]]+)\]/i);
            if (mediaAttachmentMatch) {
              const filename = mediaAttachmentMatch[1].trim();
              detectedImageUrl = filename.startsWith('/uploads/') ? filename : `/uploads/${filename}`;
            } else {
              const imgMatch = msg.text.match(/(https?:\/\/[^\s)]+)?(\/uploads\/[^\s)]+\.(jpg|jpeg|png|webp|gif|svg|bmp))/i);
              if (imgMatch) {
                detectedImageUrl = imgMatch[2] || imgMatch[0];
              }
              const audioMatch = msg.text.match(/(https?:\/\/[^\s)]+)?(\/uploads\/[^\s)]+\.(ogg|oga|mp3|wav|m4a|aac))/i);
              if (audioMatch) {
                detectedAudioUrl = audioMatch[2] || audioMatch[0];
              }
            }
          }

          // Construct the enriched message for the SQLite database
          const dbMsg = {
            id: messageId,
            sender: senderName, // Map name or ID to display in thread
            recipient: 'DejavuFM Studio',
            text: cleanDbText,
            imageUrl: detectedImageUrl,
            imageName: detectedImageUrl ? 'Attachment' : null,
            audioUrl: detectedAudioUrl,
            audioName: detectedAudioUrl ? 'Voice Note' : null,
            videoUrl: detectedVideoUrl,
            videoName: detectedVideoUrl ? 'Video Message' : null,
            timestamp: msg.timestamp || Date.now(),
            platform: msg.platform
          };

          // Persist the message to SQLite database
          try {
            if (db.open) {
              db.prepare(`
                INSERT INTO private_messages (id, sender, recipient, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp, platform)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                dbMsg.id,
                dbMsg.sender,
                dbMsg.recipient,
                dbMsg.text,
                dbMsg.imageUrl,
                dbMsg.imageName,
                dbMsg.audioUrl,
                dbMsg.audioName,
                dbMsg.videoUrl,
                dbMsg.videoName,
                dbMsg.timestamp,
                dbMsg.platform
              );
              console.log(`[Meta Webhook POST] Successfully persisted message ${messageId} in database.`);
            }
          } catch (insertErr) {
            console.error('[Meta Webhook POST] Failed to save message into private_messages SQLite table:', insertErr);
          }

          // Emit the message via Socket.IO to notify connected admin clients in real time
          if (io) {
            const socketMsg = {
              id: dbMsg.id,
              user: dbMsg.sender,
              recipient: dbMsg.recipient,
              text: dbMsg.text,
              imageUrl: dbMsg.imageUrl,
              audioUrl: dbMsg.audioUrl,
              videoUrl: dbMsg.videoUrl,
              timestamp: dbMsg.timestamp,
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(dbMsg.sender)}`,
              platform: dbMsg.platform
            };
            io.emit('privateMessage', socketMsg);
            
            // Also notify room counts updated to refresh the badges
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
            
            console.log(`[Meta Webhook POST] Broadcasted real-time socket message to Studio UI for: ${dbMsg.sender}`);
          }
        }
      } catch (processingErr) {
        console.error('[Meta Webhook POST] Error processing asynchronous webhook event:', processingErr);
      }
    });
  }

  /**
   * POST /api/webhooks/whatsapp-gateway (and /webhook/waha)
   * Dedicated endpoint for self-hosted WhatsApp Web Gateway (WAHA / Evolution API)
   */
  public static processGatewayWebhook(req: Request, res: Response): void {
    const payload = req.body;
    console.log('[WhatsApp Gateway Webhook] Received event:', payload?.event || 'direct', typeof payload === 'object' ? Object.keys(payload) : '');

    // Acknowledge immediately to prevent gateway timeout
    res.status(200).json({ status: 'success', received: true });

    setImmediate(async () => {
      try {
        const messages = WhatsappGatewayService.parseWebhookPayload(payload);
        if (messages.length === 0) {
          return;
        }

        const config = WhatsappGatewayService.getGatewayConfig();
        for (const msg of messages) {
          if (msg.mediaUrl && !msg.mediaUrl.startsWith('/uploads/') && (msg.messageType === 'image' || msg.messageType === 'audio' || msg.messageType === 'video')) {
            try {
              const local = await WhatsappGatewayService.saveRemoteMediaLocally(msg.mediaUrl, config.serverUrl, config.apiKey, undefined, msg.messageId);
              if (local) {
                msg.mediaUrl = local;
              }
            } catch {}
          }
        }

        const io = req.app.get('io');
        const inserted = WhatsappGatewayService.ingestParsedMessages(messages, io);
        console.log(`[WhatsApp Gateway Webhook] Processed ${messages.length} messages (${inserted} newly inserted).`);
      } catch (err) {
        console.error('[WhatsApp Gateway Webhook] Error processing message:', err);
      }
    });
  }
}
