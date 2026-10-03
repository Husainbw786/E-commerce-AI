import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[720px] px-6 pb-14 pt-10">
      <h1 className="mb-2 text-4xl font-extrabold tracking-[-0.02em]">Not found</h1>
      <p className="text-muted">That listing doesn&apos;t exist or was deleted.</p>
      <Link href="/library" className="font-extrabold">
        Go to Library
      </Link>
    </main>
  );
}
