import { Router } from 'express';
import { WebhookController } from './webhook.controller.ts';

const router = Router();

// GET: Meta webhook verification
router.get('/', WebhookController.verifyWebhook);

// POST: Meta webhook message ingestion
router.post('/', WebhookController.processWebhook);

// Dedicated endpoints for self-hosted WhatsApp Gateway (WAHA / Evolution API)
router.get('/waha', (req, res) => res.json({ status: 'online', service: 'WAHA Webhook Gateway' }));
router.post('/waha', WebhookController.processGatewayWebhook);

router.get('/whatsapp-gateway', (req, res) => res.json({ status: 'online', service: 'WhatsApp Gateway' }));
router.post('/whatsapp-gateway', WebhookController.processGatewayWebhook);

export { router as webhookRouter };
