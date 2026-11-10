export function Footer({ tagline }: { tagline: string }) {
  return (
    <footer className="border-t border-pink-500/20 px-4 py-12 text-center">
      <p className="tracking-[0.22em] text-sm sm:text-base font-semibold">{tagline}</p>
      <p className="mt-4 text-[11px] text-violet-400">
        Host tools →{" "}
        <a href="/admin" className="text-neon-pink hover:underline">
          /admin
        </a>
      </p>
    </footer>
  );
}
