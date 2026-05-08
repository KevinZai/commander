// scene-install.jsx — "Install in 30 seconds"
// 14s: open terminal → type plugin install → cascade of resolves/checkmarks → ready prompt with autocomplete

const INSTALL_DUR = 14;

const InstallScene = () => {
  const t = useTime();
  return (
    <div style={{
      position:'absolute', inset:0,
      background:
        'radial-gradient(50% 70% at 80% 20%, rgba(255,107,71,.08), transparent 60%),'+
        'radial-gradient(50% 50% at 10% 90%, rgba(212,165,116,.06), transparent 65%),'+
        '#0F0F0F',
      overflow:'hidden',
      fontFamily:'"Inter",system-ui,sans-serif',
    }}>
      {/* corner brand */}
      <div style={{
        position:'absolute', left:48, top:40,
        display:'flex', alignItems:'center', gap:10,
        fontFamily:'"JetBrains Mono",monospace', fontSize:14, color:'#A8A8A0',
      }}>
        <div style={{
          width:26, height:26, borderRadius:6, background:'#181818',
          border:'1px solid rgba(245,245,240,.14)', display:'grid', placeItems:'center', color:'#FF6B47',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l5 5-5 5M16 22h8"/></svg>
        </div>
        <span><b style={{color:'#F5F5F0',fontWeight:500}}>cc-commander</b> <span style={{color:'#6E6E68',margin:'0 6px'}}>·</span> install demo</span>
      </div>

      {/* title strip */}
      <Sprite start={0} end={INSTALL_DUR} keepMounted>
        {({ progress, localTime }) => (
          <div style={{
            position:'absolute', right:48, top:40,
            fontFamily:'"JetBrains Mono",monospace', fontSize:13, color:'#6E6E68',
            display:'flex', gap:14, alignItems:'center',
            opacity: animate({from:0,to:1,start:0,end:0.04})(progress),
          }}>
            <span>elapsed</span>
            <span style={{color:'#D4A574', minWidth:60, textAlign:'right'}}>
              {(Math.min(localTime, 13.4)).toFixed(1)}s
            </span>
            <span style={{opacity:.4}}>·</span>
            <span style={{color: localTime > 11 ? '#6BCF7F' : '#A8A8A0'}}>
              {localTime > 11 ? 'READY' : 'INSTALLING'}
            </span>
          </div>
        )}
      </Sprite>

      {/* intro overlay */}
      <Sprite start={0.2} end={2.0}>
        {({ progress }) => (
          <div style={{
            position:'absolute', left:'50%', top:'34%', transform:'translate(-50%,-50%)',
            textAlign:'center', width:'80%',
            opacity: interpolate([0,0.2,0.85,1],[0,1,1,0])(progress),
          }}>
            <div style={{
              fontFamily:'"JetBrains Mono",monospace', fontSize:13,
              color:'#A8A8A0', letterSpacing:'.18em', marginBottom:14, textTransform:'uppercase',
            }}>— one command —</div>
            <div style={{
              fontFamily:'"Inter",sans-serif', fontSize:64, fontWeight:600,
              color:'#F5F5F0', letterSpacing:'-.025em', lineHeight:1.05,
            }}>
              Install in <span style={{color:'#FF6B47'}}>30&nbsp;seconds.</span>
            </div>
            <div style={{ marginTop:16, fontSize:20, color:'#A8A8A0' }}>
              Zero config. Zero dependencies. Zero cost.
            </div>
          </div>
        )}
      </Sprite>

      {/* TERMINAL — appears at 1.6s, stays */}
      <Sprite start={1.6} end={INSTALL_DUR} keepMounted>
        {({ progress, localTime }) => {
          const op = animate({from:0,to:1,start:0,end:0.06,ease:Easing.easeOutCubic})(progress);
          const lift = animate({from:30,to:0,start:0,end:0.06,ease:Easing.easeOutCubic})(progress);

          // typing the command
          const cmd = '/plugin install commander';
          const typeStart = 0.4;
          const typeEnd = 1.8;
          const charProg = clamp((localTime - typeStart) / (typeEnd - typeStart), 0, 1);
          const visibleCmd = cmd.slice(0, Math.floor(charProg * cmd.length));

          // staged install lines
          const lines = [
            { at: 2.2, kind:'fetch', a:'fetching', b:'commander@4.1.0', c:'github.com/KevinZai/commander' },
            { at: 2.9, kind:'verify', a:'verified', b:'sha256', c:'88f4…b71c' },
            { at: 3.5, kind:'load', a:'loaded', b:'61 skills', c:'11 domains · 502+ sub-skills' },
            { at: 4.3, kind:'load', a:'loaded', b:'22 specialist agents', c:'with 22 portraits' },
            { at: 5.1, kind:'load', a:'loaded', b:'9 lifecycle hooks', c:'×24 handlers wired' },
            { at: 5.9, kind:'load', a:'loaded', b:'commands, prompts, templates', c:'· 142 files indexed' },
            { at: 6.7, kind:'wire', a:'wired', b:'.claude → commander/', c:'symlink ok' },
            { at: 7.5, kind:'check', a:'self-test', b:'4/4 passed', c:'plan · ship · review · audit' },
            { at: 8.2, kind:'time', a:'installed', b:'in 1.8s', c:'no postinstall scripts' },
          ];
          // success summary at 9.2
          const showSummary = localTime > 9.0;
          const showReady = localTime > 11.0;

          return (
            <div style={{
              position:'absolute', left:'50%', top:'52%',
              transform:`translate(-50%, calc(-50% + ${lift}px))`,
              opacity: op,
              width:920,
              border:'1px solid rgba(245,245,240,.14)', borderRadius:14,
              background:'linear-gradient(180deg,#0d0d0d,#0a0a0a)',
              boxShadow:'0 30px 70px -22px rgba(0,0,0,.8), 0 0 0 1px rgba(255,107,71,.06)',
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
                  <b style={{color:'#A8A8A0', fontWeight:500}}>~/your-app</b> — claude code · v0.42
                </span>
                <span style={{fontSize:11, color:'#6E6E68', letterSpacing:'.1em'}}>⌘ K</span>
              </div>
              <div style={{padding:'24px 28px', fontSize:15, lineHeight:1.85, color:'#F5F5F0', minHeight:480}}>
                <div style={{color:'#6E6E68', fontSize:12, marginBottom:8}}>
                  Welcome back, kevin. <span style={{color:'#A8A8A0'}}>Try /plugin to discover plugins.</span>
                </div>
                <div>
                  <span style={{color:'#FF6B47'}}>❯</span>&nbsp; {visibleCmd}
                  {charProg < 1 && <span style={{display:'inline-block',width:9,height:18,verticalAlign:-3,background:'#F5F5F0',marginLeft:2,animation:'caretBlink 1s steps(1) infinite'}}/>}
                </div>
                {/* lines cascade */}
                {lines.map((ln, i) => {
                  if (localTime < ln.at) return null;
                  const lp = clamp((localTime - ln.at) / 0.4, 0, 1);
                  const ic = ln.kind === 'check' ? '✓' : ln.kind === 'fetch' ? '↓' : ln.kind === 'verify' ? '⚿' : ln.kind === 'wire' ? '→' : ln.kind === 'time' ? '◆' : '✓';
                  const icColor = ln.kind === 'time' ? '#D4A574' : '#6BCF7F';
                  return (
                    <div key={i} style={{
                      opacity: lp,
                      transform:`translateX(${(1-lp) * 8}px)`,
                      marginTop: 4,
                      display:'flex', gap:10, alignItems:'baseline',
                    }}>
                      <span style={{color:icColor, width:14, display:'inline-block'}}>{ic}</span>
                      <span style={{color:'#A8A8A0'}}>{ln.a}</span>
                      <span style={{color:'#F5F5F0'}}>{ln.b}</span>
                      <span style={{color:'#6E6E68'}}>· {ln.c}</span>
                    </div>
                  );
                })}
                {showSummary && (
                  <div style={{
                    marginTop:16, padding:'12px 14px',
                    border:'1px dashed rgba(255,107,71,.35)', borderRadius:8,
                    background:'rgba(255,107,71,.05)',
                    opacity: animate({from:0,to:1,start:0,end:0.2})(clamp((localTime-9.0)/1.0,0,1)),
                    display:'flex', gap:24, flexWrap:'wrap',
                    fontSize:13,
                  }}>
                    <span><span style={{color:'#FF6B47'}}>commander@1.0.0</span> ready</span>
                    <span style={{color:'#6E6E68'}}>·</span>
                    <span><span style={{color:'#D4A574'}}>55</span> skills</span>
                    <span><span style={{color:'#D4A574'}}>17</span> agents</span>
                    <span><span style={{color:'#D4A574'}}>9</span> hooks</span>
                    <span style={{color:'#6E6E68'}}>·</span>
                    <span style={{color:'#6BCF7F'}}>+0 deps</span>
                    <span style={{color:'#6BCF7F'}}>0 telemetry</span>
                  </div>
                )}
                {showReady && (
                  <div style={{ marginTop:14, opacity: animate({from:0,to:1,start:0,end:0.2})(clamp((localTime-11.0)/1.0,0,1)) }}>
                    <div>
                      <span style={{color:'#FF6B47'}}>❯</span>&nbsp;
                      <span style={{color:'#7FD4D4'}}>/</span>
                      <span style={{display:'inline-block',width:9,height:18,verticalAlign:-3,background:'#F5F5F0',marginLeft:2,animation:'caretBlink 1s steps(1) infinite'}}/>
                    </div>
                    <div style={{
                      marginTop:6, marginLeft:24, padding:'8px 0',
                      borderLeft:'2px solid rgba(255,107,71,.4)', paddingLeft:14,
                      fontSize:13,
                    }}>
                      <div style={{color:'#FF6B47'}}>/plan <span style={{color:'#A8A8A0'}}>— scope a feature with a 22-agent council</span></div>
                      <div style={{color:'#A8A8A0'}}>/ship <span style={{color:'#6E6E68'}}>— build, review, test, commit</span></div>
                      <div style={{color:'#A8A8A0'}}>/audit <span style={{color:'#6E6E68'}}>— security · perf · a11y · types</span></div>
                      <div style={{color:'#A8A8A0'}}>/skills <span style={{color:'#6E6E68'}}>— browse 61 skills across 11 domains</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      </Sprite>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <Stage width={1280} height={720} duration={INSTALL_DUR} background="#000" persistKey="ccc-install">
    <InstallScene />
  </Stage>
);
