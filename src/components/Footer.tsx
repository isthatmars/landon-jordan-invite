export function Footer({ tagline }: { tagline: string }) {
  return (
    <footer className="site-footer bg-[#07010f] px-4 text-center">
      <p className="site-footer-tagline">{tagline}</p>
      <p className="site-footer-host">
        <a href="/admin" className="host-tools-link" data-testid="host-tools-link">
          Host tools
        </a>
      </p>
    </footer>
  );
}