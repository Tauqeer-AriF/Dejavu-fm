import { Router } from 'express';
import { WebhookController } from './webhook.controller.ts';

const router = Router();

// GET: Meta webhook verification
router.get('/', WebhookController.verifyWebhook);

// POST: Meta webhook message ingestion
router.post('/', WebhookController.processWebhook);

export { router as webhookRouter };
