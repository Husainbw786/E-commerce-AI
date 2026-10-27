"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeListing } from "@/lib/client/api";
import { useToast } from "./toast";
import { Icon } from "./ui";

/** Library row action: deletes the listing, its photos, generated images and details. */
export function DeleteListingButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function destroy() {
    if (!confirm(`Delete “${title}” with all its photos, images and details? This can't be undone.`)) return;
    setBusy(true);
    try {
      await removeListing(id);
      toast("Listing deleted");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't delete");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={destroy}
      disabled={busy}
      aria-label={`Delete ${title}`}
      title="Delete listing"
      className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[13px] font-extrabold text-accent-strong hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon name="trash" size={13} /> {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
