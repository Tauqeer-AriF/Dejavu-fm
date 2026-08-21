import { db } from './db.ts';

export interface ReactionResult {
  action: 'added' | 'removed';
  reactions: Record<string, string[]>;
  emoji: string;
  user: string;
  messageId: string;
}

/**
 * Get all reactions for a single message, mapped by emoji -> string[] of usernames.
 */
export function getReactionsForMessage(messageId: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!messageId || !db.open) return result;

  try {
    const rows = db.prepare(
      "SELECT emoji, username FROM message_reactions WHERE message_id = ? ORDER BY id ASC"
    ).all(messageId) as Array<{ emoji: string; username: string }>;

    for (const row of rows) {
      if (!result[row.emoji]) {
        result[row.emoji] = [];
      }
      result[row.emoji].push(row.username);
    }
  } catch (err) {
    console.error(`[Reactions] Error fetching reactions for message ${messageId}:`, err);
  }

  return result;
}

/**
 * Bulk fetch reactions for a list of message IDs.
 */
export function getReactionsForMessagesBulk(messageIds: string[]): Map<string, Record<string, string[]>> {
  const map = new Map<string, Record<string, string[]>>();
  if (!messageIds || messageIds.length === 0 || !db.open) return map;

  try {
    const uniqueIds = Array.from(new Set(messageIds.filter(Boolean)));
    const chunkSize = 400;

    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = db.prepare(
        `SELECT message_id, emoji, username FROM message_reactions WHERE message_id IN (${placeholders}) ORDER BY id ASC`
      ).all(...chunk) as Array<{ message_id: string; emoji: string; username: string }>;

      for (const row of rows) {
        if (!map.has(row.message_id)) {
          map.set(row.message_id, {});
        }
        const msgReactions = map.get(row.message_id)!;
        if (!msgReactions[row.emoji]) {
          msgReactions[row.emoji] = [];
        }
        msgReactions[row.emoji].push(row.username);
      }
    }
  } catch (err) {
    console.error("[Reactions] Error bulk fetching reactions:", err);
  }

  return map;
}

/**
 * Toggle a reaction on a message for a user.
 * If user already reacted with this emoji -> remove it.
 * If not -> add it.
 */
export function toggleMessageReaction(messageId: string, emoji: string, username: string): ReactionResult {
  const cleanMessageId = String(messageId || '').trim();
  // Sanitize emoji (limit to 32 characters to prevent long text abuse)
  const cleanEmoji = String(emoji || '').trim().slice(0, 32);
  const cleanUser = String(username || 'Anonymous').trim() || 'Anonymous';

  if (!cleanMessageId || !cleanEmoji || !db.open) {
    return {
      action: 'removed',
      reactions: {},
      emoji: cleanEmoji,
      user: cleanUser,
      messageId: cleanMessageId
    };
  }

  let action: 'added' | 'removed' = 'added';

  try {
    const existing = db.prepare(
      "SELECT id FROM message_reactions WHERE message_id = ? AND emoji = ? AND LOWER(username) = LOWER(?)"
    ).get(cleanMessageId, cleanEmoji, cleanUser.toLowerCase()) as { id: number } | undefined;

    if (existing) {
      db.prepare("DELETE FROM message_reactions WHERE id = ?").run(existing.id);
      action = 'removed';
    } else {
      db.prepare(
        "INSERT INTO message_reactions (message_id, emoji, username) VALUES (?, ?, ?)"
      ).run(cleanMessageId, cleanEmoji, cleanUser);
      action = 'added';
    }
  } catch (err) {
    console.error(`[Reactions] Error toggling reaction for ${cleanMessageId}:`, err);
  }

  const reactions = getReactionsForMessage(cleanMessageId);

  return {
    action,
    reactions,
    emoji: cleanEmoji,
    user: cleanUser,
    messageId: cleanMessageId
  };
}

/**
 * Delete all reactions for a specific message.
 */
export function deleteMessageReactions(messageId: string): void {
  if (!messageId || !db.open) return;
  try {
    db.prepare("DELETE FROM message_reactions WHERE message_id = ?").run(messageId);
  } catch (err) {
    console.error(`[Reactions] Error deleting reactions for message ${messageId}:`, err);
  }
}

/**
 * Clear all reactions in the database.
 */
export function clearAllMessageReactions(): void {
  if (!db.open) return;
  try {
    db.prepare("DELETE FROM message_reactions").run();
  } catch (err) {
    console.error("[Reactions] Error clearing all message reactions:", err);
  }
}
