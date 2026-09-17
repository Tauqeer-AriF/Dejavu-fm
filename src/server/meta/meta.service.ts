import { db } from '../db.ts';
import { WhatsappService } from './whatsapp.service.ts';
import { WhatsappGatewayService } from './whatsapp-gateway.service.ts';
import { InstagramService } from './instagram.service.ts';
import { MessengerService } from './messenger.service.ts';

export class MetaService {
  /**
   * Automatically dispatch an outgoing reply to WhatsApp, Instagram, or Facebook.
   */
  public static async sendPlatformReply(
    platform: 'whatsapp' | 'instagram' | 'facebook',
    recipientId: string,
    text: string
  ): Promise<any> {
    console.log(`[Meta Service] Attempting to send reply on platform ${platform} to ${recipientId}: "${text}"`);

    if (!db.open) {
      throw new Error('Database is not open.');
    }

    // Load configs from the SQLite database
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('studio_platform_configs') as any;
    if (!row || !row.value) {
      throw new Error('No platform configurations found in settings.');
    }

    const platformConfigs = JSON.parse(row.value);
    const config = platformConfigs[platform];

    if (!config) {
      throw new Error(`Platform config for "${platform}" is missing.`);
    }

    // Remove any user prefix mentions in the reply text if present (e.g. "@John ")
    const cleanText = text.replace(/^@[^\s]+\s+/, '');

    switch (platform) {
      case 'whatsapp': {
        const isGateway = config.provider === 'waha' || (!config.provider && Boolean(config.serverUrl));

        if (isGateway) {
          const serverUrl = config.serverUrl;
          if (!serverUrl) {
            throw new Error('WhatsApp Gateway Server URL is missing. Please enter your Railway or server URL in Meta & Messaging Integrations.');
          }

          console.log(`[Meta Service] Sending WhatsApp message via Self-Hosted Gateway (${serverUrl}) to ${recipientId}`);
          return await WhatsappGatewayService.sendTextMessage(
            serverUrl,
            config.apiKey,
            config.sessionName || 'default',
            recipientId,
            cleanText
          );
        }

        // Official Meta Cloud API
        const phoneId = config.phoneId || config.phone || '';
        const token = config.accessToken || config.verifyToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
        
        if (!phoneId) {
          throw new Error('WhatsApp Business Phone Number ID is missing. Please configure it in the Admin Dashboard under Meta Integrations.');
        }

        if (!token || token === 'dejavu_whatsapp_secret_key') {
          throw new Error('WhatsApp Cloud API Access Token is missing or invalid. Please configure your Permanent System User Access Token in the Admin Dashboard under Meta Integrations.');
        }

        console.log(`[Meta Service] Sending WhatsApp message via Meta Cloud API phoneId ${phoneId} to ${recipientId}`);
        return await WhatsappService.sendReply(phoneId, recipientId, cleanText, token);
      }

      case 'instagram': {
        const accountId = config.accountId || '';
        const token = config.accessToken || '';

        if (!token) {
          throw new Error('Instagram Graph Access Token is missing from configurations.');
        }

        console.log(`[Meta Service] Sending Instagram DM to IG User ID ${recipientId}`);
        return await InstagramService.sendReply(recipientId, cleanText, token);
      }

      case 'facebook': {
        const pageId = config.pageId || '';
        const token = config.pageAccessToken || '';

        if (!token) {
          throw new Error('Facebook Page Access Token is missing from configurations.');
        }

        console.log(`[Meta Service] Sending Facebook Messenger DM to recipient ${recipientId}`);
        return await MessengerService.sendReply(recipientId, cleanText, token);
      }

      default:
        throw new Error(`Unsupported Meta platform: ${platform}`);
    }
  }
}
