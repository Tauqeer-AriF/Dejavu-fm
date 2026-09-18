import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import { db, getUploadsDir } from '../db.ts';
import { WhatsappService } from './whatsapp.service.ts';
import { WhatsappGatewayService } from './whatsapp-gateway.service.ts';
import { InstagramService } from './instagram.service.ts';
import { MessengerService } from './messenger.service.ts';

export interface SendPlatformReplyOptions {
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
}

export interface ResolvedMediaPayload {
  buffer: Buffer;
  dataUrl: string;
  base64: string;
  mimeType: string;
  filename: string;
  mediaType: 'image' | 'audio' | 'video';
  remoteUrl?: string;
}

export class MetaService {
  /**
   * Helper to resolve local uploads, data URIs, or remote URLs to a usable media payload.
   */
  public static async resolveMedia(
    rawUrl?: string | null,
    inferredType: 'image' | 'audio' | 'video' = 'image'
  ): Promise<ResolvedMediaPayload | null> {
    if (!rawUrl || typeof rawUrl !== 'string') return null;

    try {
      // 1. Data URI
      if (rawUrl.startsWith('data:')) {
        const match = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64 = match[2];
          const buffer = Buffer.from(base64, 'base64');
          const ext = mimeType.split('/')[1] || (inferredType === 'audio' ? 'mp3' : inferredType === 'video' ? 'mp4' : 'jpg');
          return {
            buffer,
            dataUrl: rawUrl,
            base64,
            mimeType,
            filename: `media_${Date.now()}.${ext}`,
            mediaType: inferredType
          };
        }
      }

      // 2. Check local filesystem paths
      const cleanFilename = path.basename(rawUrl.split('?')[0]);
      const possibleDirs = [
        getUploadsDir(),
        path.join(process.cwd(), 'public', 'uploads'),
        path.join(process.cwd(), 'uploads'),
        '/data/uploads',
        '/tmp/uploads'
      ];

      for (const dir of possibleDirs) {
        const filePath = path.join(dir, cleanFilename);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const ext = path.extname(cleanFilename).toLowerCase();
          let mimeType = inferredType === 'audio' ? 'audio/mpeg' : inferredType === 'video' ? 'video/mp4' : 'image/jpeg';
          if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
          else if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.webp') mimeType = 'image/webp';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.svg') mimeType = 'image/svg+xml';
          else if (['.mp3', '.m4a', '.wav', '.ogg'].includes(ext)) mimeType = 'audio/mpeg';
          else if (ext === '.webm') mimeType = 'audio/webm';
          else if (['.mp4', '.mov'].includes(ext)) mimeType = 'video/mp4';

          let finalBuffer = buffer;
          let finalMimeType = mimeType;
          let finalFilename = cleanFilename;

          // If image is webp, convert to jpeg for maximum WhatsApp compatibility
          if (inferredType === 'image' && ext === '.webp') {
            try {
              finalBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
              finalMimeType = 'image/jpeg';
              finalFilename = cleanFilename.replace(/\.webp$/i, '.jpg');
            } catch (convErr: any) {
              console.warn('[Meta Service] WebP to JPEG conversion failed, using original:', convErr.message);
            }
          }

          const base64 = finalBuffer.toString('base64');
          const dataUrl = `data:${finalMimeType};base64,${base64}`;

          return {
            buffer: finalBuffer,
            dataUrl,
            base64,
            mimeType: finalMimeType,
            filename: finalFilename,
            mediaType: inferredType,
            remoteUrl: rawUrl
          };
        }
      }

      // 3. Remote HTTP/HTTPS URL
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        const resp = await axios.get(rawUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(resp.data);
        const rawHeader = resp.headers['content-type'];
        const headerMime = Array.isArray(rawHeader) ? rawHeader[0] : (typeof rawHeader === 'string' ? rawHeader : '');
        let mimeType = headerMime.split(';')[0].trim();
        if (!mimeType || mimeType === 'application/octet-stream') {
          mimeType = inferredType === 'audio' ? 'audio/mpeg' : inferredType === 'video' ? 'video/mp4' : 'image/jpeg';
        }
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        return {
          buffer,
          dataUrl,
          base64,
          mimeType,
          filename: cleanFilename || `media_${Date.now()}`,
          mediaType: inferredType,
          remoteUrl: rawUrl
        };
      }
    } catch (err: any) {
      console.error(`[Meta Service] Error resolving media (${rawUrl}):`, err.message);
    }

    return null;
  }

  /**
   * Automatically dispatch an outgoing reply to WhatsApp, Instagram, or Facebook,
   * with full support for image, audio, or video attachments.
   */
  public static async sendPlatformReply(
    platform: 'whatsapp' | 'instagram' | 'facebook',
    recipientId: string,
    text: string,
    mediaOptions?: SendPlatformReplyOptions
  ): Promise<any> {
    console.log(`[Meta Service] Attempting to send reply on platform ${platform} to ${recipientId}: "${text}" (media: ${mediaOptions?.imageUrl || mediaOptions?.audioUrl || mediaOptions?.videoUrl || 'none'})`);

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
    const cleanText = (text || '').replace(/^@[^\s]+\s+/, '').trim();

    // Check if any media attachment is included
    const rawMediaUrl = mediaOptions?.imageUrl || mediaOptions?.audioUrl || mediaOptions?.videoUrl;
    const inferredType: 'image' | 'audio' | 'video' = mediaOptions?.audioUrl
      ? 'audio'
      : mediaOptions?.videoUrl
      ? 'video'
      : 'image';

    const resolvedMedia = rawMediaUrl ? await this.resolveMedia(rawMediaUrl, inferredType) : null;

    switch (platform) {
      case 'whatsapp': {
        const isGateway = config.provider === 'waha' || (!config.provider && Boolean(config.serverUrl));

        if (isGateway) {
          const serverUrl = config.serverUrl;
          if (!serverUrl) {
            throw new Error('WhatsApp Gateway Server URL is missing. Please enter your Railway or server URL in Meta & Messaging Integrations.');
          }

          if (resolvedMedia) {
            console.log(`[Meta Service] Sending WhatsApp Media (${resolvedMedia.mediaType}, ${resolvedMedia.mimeType}) via Self-Hosted Gateway (${serverUrl}) to ${recipientId}`);
            return await WhatsappGatewayService.sendMediaMessage(
              serverUrl,
              config.apiKey,
              config.sessionName || 'default',
              recipientId,
              resolvedMedia,
              cleanText || undefined
            );
          }

          console.log(`[Meta Service] Sending WhatsApp text via Self-Hosted Gateway (${serverUrl}) to ${recipientId}`);
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

        if (resolvedMedia) {
          console.log(`[Meta Service] Sending WhatsApp Media via Meta Cloud API phoneId ${phoneId} to ${recipientId}`);
          return await WhatsappService.sendMediaReply(phoneId, recipientId, resolvedMedia, cleanText, token);
        }

        console.log(`[Meta Service] Sending WhatsApp text via Meta Cloud API phoneId ${phoneId} to ${recipientId}`);
        return await WhatsappService.sendReply(phoneId, recipientId, cleanText, token);
      }

      case 'instagram': {
        const accountId = config.accountId || '';
        const token = config.accessToken || '';

        if (!token) {
          throw new Error('Instagram Graph Access Token is missing from configurations.');
        }

        if (rawMediaUrl) {
          console.log(`[Meta Service] Sending Instagram Media to IG User ID ${recipientId}`);
          await InstagramService.sendMediaReply(recipientId, rawMediaUrl, inferredType, token);
          if (cleanText) {
            return await InstagramService.sendReply(recipientId, cleanText, token);
          }
          return { success: true };
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

        if (rawMediaUrl) {
          console.log(`[Meta Service] Sending Facebook Messenger Media to recipient ${recipientId}`);
          await MessengerService.sendMediaReply(recipientId, rawMediaUrl, inferredType, token);
          if (cleanText) {
            return await MessengerService.sendReply(recipientId, cleanText, token);
          }
          return { success: true };
        }

        console.log(`[Meta Service] Sending Facebook Messenger DM to recipient ${recipientId}`);
        return await MessengerService.sendReply(recipientId, cleanText, token);
      }

      default:
        throw new Error(`Unsupported Meta platform: ${platform}`);
    }
  }
}
