export function Footer() {
  return (
    <footer className="border-t border-zinc-900 py-16 px-4 bg-zinc-950/40">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a href="/#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/changelog" className="hover:text-white transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a href="/#install" className="hover:text-white transition-colors">
                  Install
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a
                  href="https://github.com/KevinZai/commander"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/kzic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Twitter / X
                </a>
              </li>
              <li>
                <a
                  href="https://kevinz.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  kevinz.ai
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-white transition-colors">
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/KevinZai/commander/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  MIT License
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a
                  href="mailto:hello@cc-commander.com"
                  className="hover:text-white transition-colors"
                >
                  hello@cc-commander.com
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@cc-commander.com?subject=CCC%20Team%20inquiry"
                  className="hover:text-white transition-colors"
                >
                  Team inquiries
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 inline-block" />
            <span>
              © {new Date().getFullYear()} CCC — built by{" "}
              <a
                href="https://kevinz.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Kevin Z
              </a>{" "}
              · Axiom Marketing Inc.
            </span>
          </div>
          <p className="text-zinc-600">
            100% local · no telemetry · MIT licensed core
          </p>
        </div>
      </div>
    </footer>
  );
}
