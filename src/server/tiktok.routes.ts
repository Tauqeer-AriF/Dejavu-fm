import { Router } from 'express';
import { TikTokService } from './tiktok.service.ts';

export const tiktokRouter = Router();

// Retrieve live status & telemetry
tiktokRouter.get('/status', (req, res) => {
  try {
    const status = TikTokService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Connect to TikTok Live Stream
tiktokRouter.post('/connect', async (req, res) => {
  try {
    const { username, sessionToken } = req.body;
    if (!username) {
      return res.status(400).json({ error: "TikTok username is required (e.g. @dejavufm_official)" });
    }
    const result = await TikTokService.connect(username, sessionToken || "");
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect from TikTok Live Stream
tiktokRouter.post('/disconnect', (req, res) => {
  try {
    TikTokService.disconnect();
    res.json({ success: true, message: "TikTok connection stopped." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook for receiving live comments from external bot or relay
tiktokRouter.post('/webhook', (req, res) => {
  try {
    const { user, username, text, comment, message, avatarUrl, avatar, isGift } = req.body;
    const author = user || username;
    const content = text || comment || message;

    if (!author || !content) {
      return res.status(400).json({ error: "Missing 'user'/'username' or 'text'/'comment' in payload" });
    }

    TikTokService.handleIncomingComment({
      user: author,
      text: content,
      avatarUrl: avatarUrl || avatar,
      isGift: !!isGift
    });

    res.json({ success: true, message: "TikTok comment ingested successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Simulate an incoming live comment/gift for instant testing
tiktokRouter.post('/simulate', (req, res) => {
  try {
    const sampleUsers = [
      "@tiktok_dance_fm",
      "@shoutout_queen",
      "@basso_drop",
      "@remix_king_official",
      "@london_raver_2026",
      "@garage_vibes_uk"
    ];
    const sampleTexts = [
      "Track ID on this tune please DJ?! Absolute heat! 🔥🎧",
      "Big up Wayne and the whole Deja team from East London! 📻🙌",
      "Locking in for the 2-hour set! Audio sounds crisp 🔊",
      "Can we get a birthday shoutout for Sarah in the chat? 🎂",
      "Best radio stream on TikTok live right now hands down! ❤️"
    ];

    const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
    const randomText = req.body.text || sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    const isGift = !!req.body.isGift;

    TikTokService.handleIncomingComment({
      user: req.body.user || randomUser,
      text: isGift ? "🎁 Sent 5x Roses! Keep the bangers coming!" : randomText,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(randomUser)}`,
      isGift: isGift
    });

    res.json({ success: true, message: "Simulated TikTok live comment pushed to Studio Inbox" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
