import axios from 'axios';
import { StandardMessage } from './whatsapp.service.ts';

export class InstagramService {
  /**
   * Parse incoming Instagram Messaging webhook event.
   */
  public static parseWebhook(body: any): StandardMessage[] {
    const messages: StandardMessage[] = [];

    if (body.object !== 'instagram' || !body.entry) {
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
            if (!text) text = '[Instagram Image attachment]';
          } else if (attachment.type === 'audio') {
            messageType = 'audio';
            if (!text) text = '[Instagram Audio message]';
          } else if (attachment.type === 'video') {
            messageType = 'video';
            if (!text) text = '[Instagram Video attachment]';
          } else {
            messageType = 'unsupported';
            if (!text) text = `[Unsupported attachment type: ${attachment.type}]`;
          }
        }

        messages.push({
          platform: 'instagram',
          senderId,
          senderName: `Instagram User (${senderId})`,
          recipientId,
          messageId,
          messageType,
          text,
          timestamp,
          rawPayload: item
        });
      }
    }

    return messages;
  }

  /**
   * Send a reply using Instagram Direct Message API.
   */
  public static async sendReply(
    recipientId: string,
    text: string,
    accessToken: string
  ): Promise<any> {
    if (!accessToken) {
      throw new Error('Instagram Graph token is not configured.');
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
