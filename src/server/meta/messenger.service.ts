import axios from 'axios';
import { StandardMessage } from './whatsapp.service.ts';

export class MessengerService {
  /**
   * Parse incoming Facebook Messenger webhook event.
   */
  public static parseWebhook(body: any): StandardMessage[] {
    const messages: StandardMessage[] = [];

    // Messenger platform webhook object is 'page'
    if (body.object !== 'page' || !body.entry) {
      return messages;
    }

    for (const entry of body.entry) {
      const entryId = entry.id || '';
      if (!entry.messaging) continue;

      for (const item of entry.messaging) {
        if (!item.message) continue;

        const senderId = item.sender?.id || '';
        const recipientId = item.recipient?.id || entryId;
        const messageId = item.message.mid || '';
        const timestamp = item.timestamp || (entry.time ? entry.time * 1000 : Date.now());

        let messageType: StandardMessage['messageType'] = 'text';
        let text = item.message.text || '';
        let mediaUrl: string | undefined;

        // Parse attachments
        if (item.message.attachments && item.message.attachments.length > 0) {
          const attachment = item.message.attachments[0];
          mediaUrl = attachment.payload?.url || undefined;
          
          if (attachment.type === 'image') {
            messageType = 'image';
            if (!text) text = '[Facebook Image attachment]';
          } else if (attachment.type === 'audio') {
            messageType = 'audio';
            if (!text) text = '[Facebook Audio message]';
          } else if (attachment.type === 'video') {
            messageType = 'video';
            if (!text) text = '[Facebook Video attachment]';
          } else {
            messageType = 'unsupported';
            if (!text) text = `[Unsupported attachment type: ${attachment.type}]`;
          }
        }

        messages.push({
          platform: 'facebook',
          senderId,
          senderName: `Facebook User (${senderId})`,
          recipientId,
          messageId,
          messageType,
          text,
          timestamp,
          rawPayload: item,
          mediaUrl
        });
      }
    }

    return messages;
  }

  /**
   * Send a reply using Facebook Messenger Send API.
   */
  public static async sendReply(
    recipientId: string,
    text: string,
    accessToken: string
  ): Promise<any> {
    if (!accessToken) {
      throw new Error('Facebook Page Access Token is not configured.');
    }

    const url = `https://graph.facebook.com/v18.0/me/messages`;
    const payload = {
      recipient: {
        id: recipientId
      },
      message: {
        text: text
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }
}
