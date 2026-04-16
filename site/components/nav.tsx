export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 inline-block" />
          CCC
        </a>
        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <a
            href="/#features"
            className="hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="/#pricing"
            className="hover:text-white transition-colors"
          >
            Pricing
          </a>
          <a
            href="/changelog"
            className="hover:text-white transition-colors"
          >
            Changelog
          </a>
          <a
            href="https://github.com/KevinZai/commander"
            className="hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
        <a
          href="/#install"
          className="px-4 py-1.5 bg-white text-black rounded-md hover:bg-zinc-200 transition-colors font-semibold text-sm"
        >
          Install Free
        </a>
      </div>
    </nav>
  );
}
