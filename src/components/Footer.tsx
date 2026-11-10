export function Footer({ tagline }: { tagline: string }) {
  return (
    <footer className="bg-[#07010f] px-4 pb-10 pt-2 text-center">
      <p className="text-[11px] font-semibold tracking-[0.28em] text-white/85 sm:text-xs">{tagline}</p>
      <p className="mt-4 text-[10px] tracking-wide text-white/35">
        <a href="/admin" className="hover:text-[#ff4fd8]">
          Host tools
        </a>
      </p>
    </footer>
  );
}
