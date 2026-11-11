const CREATOR_URL = "https://www.australianbleu.com";
const INSTAGRAM_URL = "https://www.instagram.com/Australian.Bleu/";

export function Footer({ tagline }: { tagline: string }) {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer-inner">
        <p className="site-footer-tagline">{tagline}</p>

        <p className="site-footer-host">
          <a href="/admin" className="host-tools-link" data-testid="host-tools-link">
            Host tools
          </a>
        </p>

        <div className="site-footer-credits">
          <div className="site-footer-credit-row">
            <p className="site-footer-credit">
              <span className="site-footer-label">Created by</span>{" "}
              <a
                href={CREATOR_URL}
                className="site-footer-link site-footer-link--brand"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="creator-link"
              >
                Australian Bleu
              </a>
            </p>

            <span className="site-footer-sep" aria-hidden="true">
              ·
            </span>

            <a
              href={CREATOR_URL}
              className="site-footer-url"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.Australianbleu.com
            </a>

            <span className="site-footer-sep" aria-hidden="true">
              ·
            </span>

            <p className="site-footer-social">
              <span className="site-footer-label">Instagram</span>{" "}
              <a
                href={INSTAGRAM_URL}
                className="site-footer-link site-footer-link--social"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="instagram-link"
              >
                @Australian.Bleu
              </a>
            </p>
          </div>

          <p className="site-footer-copy">
            Copyright © 2026 Australian Bleu Media Group. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
