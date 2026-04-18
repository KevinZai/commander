import { db } from "../db/client.js";
import type { AuthContext } from "../middleware/auth.js";

export type PinNoteArgs = { note: string };

export async function pinNote(args: PinNoteArgs, auth: AuthContext) {
  const { error } = await db.from("feedback").insert({
    user_id: auth.userId,
    category: "note",
    content: args.note.slice(0, 2000),
    sentiment: "neutral",
  });

  if (error) {
    return { error: "Failed to pin note. Try again later." };
  }

  return {
    pinned: true,
    note: args.note.slice(0, 100) + (args.note.length > 100 ? "…" : ""),
    message: "Note pinned to your Commander knowledge store.",
  };
}
