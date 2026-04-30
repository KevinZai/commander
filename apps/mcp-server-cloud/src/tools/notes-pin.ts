import { db } from "../db/client.js";
import type { AuthContext } from "../middleware/auth.js";
import { invalidParam, internalError } from "../lib/errors.js";
import { crypto } from "../lib/trace.js";

export type PinNoteArgs = { note: string };

export async function pinNote(args: PinNoteArgs, auth: AuthContext) {
  if (!args.note || typeof args.note !== "string" || args.note.trim().length === 0) {
    return invalidParam("note", "must be a non-empty string (max 2000 chars)");
  }

  const { error } = await db.from("feedback").insert({
    user_id: auth.userId,
    category: "note",
    content: args.note.slice(0, 2000),
    sentiment: "neutral",
  });

  if (error) {
    return internalError(crypto.randomUUID(), "Failed to pin note to knowledge store.");
  }

  return {
    pinned: true,
    note: args.note.slice(0, 100) + (args.note.length > 100 ? "…" : ""),
    message: "Note pinned to your Commander knowledge store.",
  };
}
