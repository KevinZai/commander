// scene-hero.jsx — "Master Claude Code instantly"
// 12s hero spot: empty terminal → ASCII banner ignites → wordmark → tagline → install line + GH count

const HERO_DUR = 12;

const HeroScene = () => {
  const t = useTime();

  return (
    <div style={{
      position:'absolute', inset:0,
      background:
        'radial-gradient(60% 50% at 18% 12%, rgba(255,107,71,.12), transparent 60%),'+
        'radial-gradient(50% 40% at 88% 80%, rgba(212,165,116,.08), transparent 65%),'+
        '#0F0F0F',
      overflow:'hidden',
      fontFamily:'"Inter",system-ui,sans-serif',
    }}>
      {/* grid */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:
          'linear-gradient(to right, rgba(245,245,240,.04) 1px, transparent 1px),'+
          'linear-gradient(to bottom, rgba(245,245,240,.04) 1px, transparent 1px)',
        backgroundSize:'56px 56px',
        maskImage:'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)',
        WebkitMaskImage:'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)',
        opacity: interpolate([0,0.5,12], [0,1,0.6], Easing.easeOutCubic)(t),
      }} />

      {/* corner brand */}
      <Sprite start={0.2} end={HERO_DUR} keepMounted>
        {({ progress }) => (
          <div style={{
            position:'absolute', left:48, top:40,
            display:'flex', alignItems:'center', gap:10,
            opacity: animate({from:0, to:1, start:0, end:0.06, ease:Easing.easeOutCubic})(progress),
            fontFamily:'"JetBrains Mono",monospace', fontSize:14, color:'#A8A8A0', letterSpacing:'.04em',
          }}>
            <div style={{
              width:26, height:26, borderRadius:6,
              background:'#181818', border:'1px solid rgba(245,245,240,.14)',
              display:'grid', placeItems:'center', color:'#FF6B47',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l5 5-5 5M16 22h8"/></svg>
            </div>
            <span><b style={{color:'#F5F5F0',fontWeight:500}}>cc-commander</b> <span style={{color:'#6E6E68',margin:'0 6px'}}>·</span> open-source ai pm for claude code</span>
          </div>
        )}
      </Sprite>

      {/* corner version pill */}
      <Sprite start={0.4} end={HERO_DUR} keepMounted>
        {({ progress }) => (
          <div style={{
            position:'absolute', right:48, top:40,
            display:'flex', alignItems:'center', gap:10,
            fontFamily:'"JetBrains Mono",monospace', fontSize:12,
            opacity: animate({from:0, to:1, start:0, end:0.05})(progress),
          }}>
            <span style={{
              padding:'5px 11px', borderRadius:999,
              border:'1px solid rgba(107,207,127,.25)',
              background:'rgba(107,207,127,.05)',
              color:'#6BCF7F', letterSpacing:'.08em',
            }}>● MIT · v1.0</span>
          </div>
        )}
      </Sprite>

      {/* ASCII spark/banner reveal — 0.6s..4.2s
          Bulletproof block "CCC" lettering, every row exactly 31 chars wide.
          Single `█` glyph + space only — guaranteed monospace alignment. */}
      <Sprite start={0.6} end={4.2}>
        {({ progress }) => {
          const reveal = Easing.easeOutCubic(progress);
          const lines = [
            "███████   ███████   ███████   ",
            "██        ██        ██        ",
            "██        ██        ██        ",
            "██        ██        ██        ",
            "███████   ███████   ███████   ",
          ];
          const totalChars = lines[0].length * lines.length;
          const visibleChars = Math.floor(reveal * totalChars * 1.2);
          let consumed = 0;
          const sliced = lines.map((l) => {
            const left = visibleChars - consumed;
            consumed += l.length;
            if (left <= 0) return ' '.repeat(l.length);
            if (left >= l.length) return l;
            // pad sliced portion with spaces to preserve column width
            return l.slice(0, left) + ' '.repeat(l.length - left);
          });
          const subline = "C O M M A N D E R";
          return (
            <div style={{
              position:'absolute', left:'50%', top:'50%',
              transform:'translate(-50%, -56%)',
              textAlign:'center',
              fontFamily:'"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              fontVariantLigatures:'none',
              fontFeatureSettings:'"liga" 0, "calt" 0',
              fontWeight:700,
              fontSize:46, lineHeight:1,
              letterSpacing:0,
              whiteSpace:'pre',
              background:'linear-gradient(180deg,#FF8B5C 0%,#FF6B47 45%,#C24E32 100%)',
              WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
              filter:'drop-shadow(0 0 28px rgba(255,107,71,.32))',
            }}>
              {sliced.join('\n')}
              <div style={{
                marginTop:24, fontSize:34, letterSpacing:'.32em',
                fontFamily:'"JetBrains Mono", ui-monospace, monospace',
                background:'linear-gradient(180deg,#D4A574,#8C6E48)',
                WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
                opacity: animate({from:0,to:1,start:0.55,end:0.85})(progress),
              }}>
                {subline}
              </div>
            </div>
          );
        }}
      </Sprite>

      {/* TAGLINE phase: 4s..8s — wordmark stays small at top, tagline drops */}
      <Sprite start={4.0} end={8.6}>
        {({ progress }) => {
          const t = progress;
          return (
            <>
              <div style={{
                position:'absolute', left:'50%', top: interpolate([0,0.5],[ '50%','22%'], Easing.easeOutCubic)(t),
                transform:'translate(-50%,-50%)',
                opacity: animate({from:0.001,to:1,start:0,end:0.3})(t),
                textAlign:'center',
                fontFamily:'"JetBrains Mono",monospace', fontWeight:700,
                background:'linear-gradient(180deg,#FF8B5C,#C24E32)',
                WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
                fontSize: interpolate([0,0.5],[ 96,40 ], Easing.easeOutCubic)(t),
                letterSpacing:'.18em',
                filter:'drop-shadow(0 0 18px rgba(255,107,71,.25))',
              }}>
                CC COMMANDER
              </div>
              <div style={{
                position:'absolute', left:'50%', top:'48%',
                transform:'translate(-50%,-50%)',
                width:'min(960px, 80%)',
                textAlign:'center',
                opacity: animate({from:0,to:1,start:0.32,end:0.55,ease:Easing.easeOutCubic})(t),
              }}>
                <div style={{
                  fontFamily:'"Inter",sans-serif',
                  fontSize:64, fontWeight:600, lineHeight:1.05, letterSpacing:'-.025em',
                  color:'#F5F5F0',
                }}>
                  Master <span style={{color:'#FF6B47'}}>Claude&nbsp;Code</span> instantly.
                </div>
                <div style={{
                  marginTop:18,
                  fontFamily:'"Inter",sans-serif',
                  fontSize:22, color:'#A8A8A0', lineHeight:1.5,
                  opacity: animate({from:0,to:1,start:0.5,end:0.75})(t),
                }}>
                  80 plugin skills. 22 specialist agents. 9 lifecycle hooks. <br/>
                  One install. Zero config. <span style={{color:'#D4A574'}}>Free for now.</span>
                </div>
              </div>
            </>
          );
        }}
      </Sprite>

      {/* INSTALL phase: 8.4s..end */}
      <Sprite start={8.2} end={HERO_DUR}>
        {({ progress, localTime }) => {
          // fade up
          const op = animate({from:0,to:1,start:0,end:0.15})(progress);
          // typing the command
          const cmd = '/plugin install commander';
          const charProg = clamp((localTime - 0.2) / 1.4, 0, 1);
          const visible = cmd.slice(0, Math.floor(charProg * cmd.length));
          // success line appears at localTime ~ 1.8
          const showOk = localTime > 2.0;
          const showStars = localTime > 2.4;
          return (
            <>
              {/* small wordmark stays */}
              <div style={{
                position:'absolute', left:'50%', top:'18%',
                transform:'translate(-50%,-50%)',
                opacity: op,
                fontFamily:'"JetBrains Mono",monospace', fontWeight:700,
                background:'linear-gradient(180deg,#FF8B5C,#C24E32)',
                WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
                fontSize: 40, letterSpacing:'.18em',
              }}>
                CC COMMANDER
              </div>

              <div style={{
                position:'absolute', left:'50%', top:'52%',
                transform:'translate(-50%,-50%)',
                width:760, opacity:op,
                border:'1px solid rgba(245,245,240,.14)', borderRadius:14,
                background:'linear-gradient(180deg,#0d0d0d,#0a0a0a)',
                boxShadow:'0 30px 60px -22px rgba(0,0,0,.7)',
                fontFamily:'"JetBrains Mono",monospace',
                overflow:'hidden',
              }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'11px 14px', borderBottom:'1px solid rgba(245,245,240,.08)',
                  background:'rgba(255,255,255,.013)',
                }}>
                  <span style={{display:'flex',gap:7}}>
                    <i style={{display:'inline-block',width:11,height:11,borderRadius:'50%',background:'#ff5f57'}}/>
                    <i style={{display:'inline-block',width:11,height:11,borderRadius:'50%',background:'#febc2e'}}/>
                    <i style={{display:'inline-block',width:11,height:11,borderRadius:'50%',background:'#28c840'}}/>
                  </span>
                  <span style={{flex:1, textAlign:'center', fontSize:12, color:'#6E6E68'}}>
                    <b style={{color:'#A8A8A0', fontWeight:500}}>~/your-app</b> — claude code
                  </span>
                </div>
                <div style={{padding:'24px 28px', fontSize:18, lineHeight:1.85, color:'#F5F5F0'}}>
                  <div><span style={{color:'#FF6B47'}}>❯</span>&nbsp; {visible}{charProg < 1 && <span style={{display:'inline-block',width:9,height:18,verticalAlign:-3,background:'#F5F5F0',marginLeft:2,animation:'caretBlink 1s steps(1) infinite'}}/>}</div>
                  {showOk && (
                    <div style={{marginTop:14, opacity: animate({from:0,to:1,start:0,end:0.12})(clamp((localTime-2.0)/1.5,0,1))}}>
                      <div><span style={{color:'#6BCF7F'}}>✓</span> <span style={{color:'#A8A8A0'}}>resolving</span> commander@4.1.0 <span style={{color:'#6E6E68'}}>· 61 skills · 22 agents · 9 hooks</span></div>
                      <div><span style={{color:'#6BCF7F'}}>✓</span> <span style={{color:'#A8A8A0'}}>installed</span> in <span style={{color:'#D4A574'}}>1.8s</span></div>
                      <div style={{marginTop:6}}><span style={{color:'#FF6B47'}}>›</span> <span style={{color:'#7FD4D4'}}>ready</span>. type <span style={{color:'#FF6B47'}}>/plan</span> to begin.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* foot row */}
              {showStars && (
                <div style={{
                  position:'absolute', left:'50%', bottom:'10%',
                  transform:'translateX(-50%)',
                  display:'flex', gap:18, alignItems:'center',
                  opacity: animate({from:0,to:1,start:0,end:0.15})(clamp((localTime-2.4)/1.4,0,1)),
                  fontFamily:'"JetBrains Mono",monospace', fontSize:14, color:'#6E6E68',
                  letterSpacing:'.04em',
                }}>
                  <span><span style={{color:'#FF6B47'}}>★</span> open source</span>
                  <span style={{opacity:.4}}>·</span>
                  <span>commanderplugin.com</span>
                  <span style={{opacity:.4}}>·</span>
                  <span style={{color:'#A8A8A0'}}>by Kevin Z</span>
                </div>
              )}
            </>
          );
        }}
      </Sprite>
    </div>
  );
};

const HeroApp = () => (
  <Stage width={1280} height={720} duration={HERO_DUR} background="#000" persistKey="ccc-hero">
    <HeroScene />
  </Stage>
);

ReactDOM.createRoot(document.getElementById('root')).render(<HeroApp/>);
