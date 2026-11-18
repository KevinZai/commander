import { db } from "../db/client.js";
import type { AuthContext } from "../middleware/auth.js";
import { invalidParam, internalError } from "../lib/errors.js";
import { crypto } from "../lib/trace.js";

// PRIVACY (Codex audit #15): this is the one hosted tool that STORES user
// input. Every other tool processes arguments transiently. A pinned note's
// text (up to NOTE_MAX_CHARS) is written with the caller's user id to the
// Supabase `feedback` table (category "note") and kept for at most
// NOTE_RETENTION_DAYS. Expired notes for the caller are purged on every pin or
// delete call; a scheduled purge for inactive users is an operator task:
//   delete from public.feedback
//    where category = 'note' and created_at < now() - interval '90 days';
// Callers can delete their notes at any time with { action: "delete" }.

export const NOTE_MAX_CHARS = 2000;
export const NOTE_RETENTION_DAYS = 90;

export const NOTES_STORAGE_DISCLOSURE =
  `Stored server-side: the note text (max ${NOTE_MAX_CHARS} chars) and your account id are saved in ` +
  `CC Commander's hosted database and kept for up to ${NOTE_RETENTION_DAYS} days. ` +
  `Delete them any time with commander_notes_pin { "action": "delete" } (all notes) or ` +
  `{ "action": "delete", "note_id": "<id>" } (one note). Do not pin secrets or personal data.`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PinNoteArgs = { note?: string; action?: "pin" | "delete"; note_id?: string };

function retentionCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - NOTE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Removes the caller's notes older than the retention window. Best effort. */
async function purgeExpired(userId: string): Promise<void> {
  try {
    await db
      .from("feedback")
      .delete()
      .eq("user_id", userId)
      .eq("category", "note")
      .lt("created_at", retentionCutoff());
  } catch {
    // Retention is also enforced by the operator purge; never fail the call here.
  }
}

async function deleteNotes(args: PinNoteArgs, auth: AuthContext) {
  if (args.note_id !== undefined && (typeof args.note_id !== "string" || !UUID_RE.test(args.note_id))) {
    return invalidParam("note_id", "must be a note id returned by a previous pin");
  }
  let query = db.from("feedback").delete({ count: "exact" }).eq("user_id", auth.userId).eq("category", "note");
  if (args.note_id) query = query.eq("id", args.note_id);
  const { error, count } = await query;
  if (error) {
    return internalError(crypto.randomUUID(), "Failed to delete pinned notes.");
  }
  return {
    deleted: count ?? 0,
    scope: args.note_id ? "one" : "all",
    message: args.note_id
      ? "The pinned note was deleted from the hosted store."
      : "All of your pinned notes were deleted from the hosted store.",
  };
}

export async function pinNote(args: PinNoteArgs, auth: AuthContext) {
  const action = args.action ?? "pin";
  if (action !== "pin" && action !== "delete") {
    return invalidParam("action", "must be 'pin' or 'delete'");
  }
  if (action === "delete") {
    const result = await deleteNotes(args, auth);
    await purgeExpired(auth.userId);
    return result;
  }

  if (!args.note || typeof args.note !== "string" || args.note.trim().length === 0) {
    return invalidParam("note", `must be a non-empty string (max ${NOTE_MAX_CHARS} chars)`);
  }

  await purgeExpired(auth.userId);

  const { data, error } = await db
    .from("feedback")
    .insert({
      user_id: auth.userId,
      category: "note",
      content: args.note.slice(0, NOTE_MAX_CHARS),
      sentiment: "neutral",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return internalError(crypto.randomUUID(), "Failed to pin note to knowledge store.");
  }

  return {
    pinned: true,
    note_id: (data as { id?: string } | null)?.id ?? null,
    note: args.note.slice(0, 100) + (args.note.length > 100 ? "…" : ""),
    truncated: args.note.length > NOTE_MAX_CHARS,
    retention_days: NOTE_RETENTION_DAYS,
    storage: NOTES_STORAGE_DISCLOSURE,
    message: "Note pinned to your Commander knowledge store (stored server-side; see `storage`).",
  };
}
