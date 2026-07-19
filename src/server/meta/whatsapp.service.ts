import axios from 'axios';

export interface StandardMessage {
  platform: 'whatsapp' | 'instagram' | 'facebook';
  senderId: string;
  senderName?: string;
  recipientId: string;
  messageId: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'unsupported';
  text: string;
  timestamp: number;
  rawPayload: any;
  mediaUrl?: string;
}

export class WhatsappService {
  /**
   * Parse incoming WhatsApp Business webhook event.
   */
  public static parseWebhook(body: any): StandardMessage[] {
    const messages: StandardMessage[] = [];

    if (body.object !== 'whatsapp_business_account' || !body.entry) {
      return messages;
    }

    for (const entry of body.entry) {
      if (!entry.changes) continue;
      for (const change of entry.changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        const metadata = value.metadata || {};
        const recipientId = metadata.phone_number_id || '';
        
        // Find sender contact profile name if available
        const contacts = value.contacts || [];
        const contactMap = new Map<string, string>();
        for (const contact of contacts) {
          if (contact.wa_id && contact.profile?.name) {
            contactMap.set(contact.wa_id, contact.profile.name);
          }
        }

        for (const msg of value.messages) {
          const senderId = msg.from || '';
          const senderName = contactMap.get(senderId) || `WhatsApp User (${senderId})`;
          const messageId = msg.id || '';
          const timestamp = msg.timestamp ? parseInt(msg.timestamp, 10) * 1000 : Date.now();
          
          let messageType: StandardMessage['messageType'] = 'unsupported';
          let text = '';
          let mediaUrl: string | undefined;

          if (msg.type === 'text' && msg.text) {
            messageType = 'text';
            text = msg.text.body || '';
          } else if (msg.type === 'image' && msg.image) {
            messageType = 'image';
            text = msg.image.caption || '[Image attachment]';
            mediaUrl = msg.image.id ? `whatsapp://media/${msg.image.id}` : undefined;
          } else if (msg.type === 'audio' && msg.audio) {
            messageType = 'audio';
            text = '[Audio clip]';
            mediaUrl = msg.audio.id ? `whatsapp://media/${msg.audio.id}` : undefined;
          } else if (msg.type === 'video' && msg.video) {
            messageType = 'video';
            text = msg.video.caption || '[Video clip]';
            mediaUrl = msg.video.id ? `whatsapp://media/${msg.video.id}` : undefined;
          } else {
            text = `[Unsupported WhatsApp message type: ${msg.type}]`;
          }

          messages.push({
            platform: 'whatsapp',
            senderId,
            senderName,
            recipientId,
            messageId,
            messageType,
            text,
            timestamp,
            rawPayload: msg,
            mediaUrl
          });
        }
      }
    }

    return messages;
  }

  /**
   * Send a reply using WhatsApp Business Cloud API.
   */
  public static async sendReply(
    phoneNumberId: string,
    recipientPhone: string,
    text: string,
    accessToken: string
  ): Promise<any> {
    if (!accessToken) {
      throw new Error('WhatsApp access token is not configured.');
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: text
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
