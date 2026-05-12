import {
  SiLinear,
  SiGithub,
  SiGmail,
  SiGoogledrive,
  SiGooglecalendar,
} from "@icons-pack/react-simple-icons";

type Partner =
  | { name: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
  | { name: string; src: string };

const PARTNERS: Partner[] = [
  { name: "Linear", Icon: SiLinear },
  { name: "GitHub", Icon: SiGithub },
  { name: "Slack", src: "/partners/slack.svg" },
  { name: "Gmail", Icon: SiGmail },
  { name: "Google Drive", Icon: SiGoogledrive },
  { name: "Calendar", Icon: SiGooglecalendar },
  { name: "Tavily", src: "/partners/tavily.ico" },
  { name: "Context7", src: "/partners/context7.png" },
];

export function SocialProof() {
  return (
    <section className="py-20 px-4 border-t border-zinc-900 bg-zinc-950/40">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs font-mono uppercase tracking-widest text-zinc-500 mb-8">
          Pre-wired to talk to
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-6">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
              title={p.name}
            >
              {"Icon" in p ? (
                <p.Icon size={24} color="currentColor" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.src}
                  alt={p.name}
                  width={24}
                  height={24}
                  className="w-6 h-6 opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all"
                />
              )}
              <span className="text-sm font-medium">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
