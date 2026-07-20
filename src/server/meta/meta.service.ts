import { db } from '../db.js';
import { WhatsappService } from './whatsapp.service.js';
import { InstagramService } from './instagram.service.js';
import { MessengerService } from './messenger.service.js';

export class MetaService {
  /**
   * Automatically dispatch an outgoing reply to Meta's APIs.
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
      throw new Error('No Meta platform configurations found in settings.');
    }

    const platformConfigs = JSON.parse(row.value);
    const config = platformConfigs[platform];

    if (!config) {
      throw new Error(`Meta platform config for "${platform}" is missing.`);
    }

    // Remove any user prefix mentions in the reply text if present (e.g. "@John ")
    const cleanText = text.replace(/^@[^\s]+\s+/, '');

    switch (platform) {
      case 'whatsapp': {
        const phoneId = config.phone || '';
        const token = config.verifyToken || ''; // Or system access token
        
        if (!phoneId || !token) {
          throw new Error('WhatsApp Business Phone Number ID or Access Token is missing from configurations.');
        }

        console.log(`[Meta Service] Sending WhatsApp message via phoneId ${phoneId} to ${recipientId}`);
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
