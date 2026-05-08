// scene-agents.jsx — "22 specialist agents"
// 12s: empty grid → roster of 22 agents pop in with portraits → highlight a few → council formation

const AGENTS_DUR = 12;

const AGENTS = [
  ['planner','Strategy','#FF6B47','#1F1208'],
  ['scaffold','Setup','#D4A574','#1A1308'],
  ['architect','Systems','#7FD4D4','#0a1c1c'],
  ['ui-smith','Frontend','#FF6B47','#1F1208'],
  ['data-mage','Backend','#6BCF7F','#0d1d12'],
  ['api-weaver','API','#7FD4D4','#0a1c1c'],
  ['type-knight','Types','#D4A574','#1A1308'],
  ['test-warden','QA','#6BCF7F','#0d1d12'],
  ['perf-tracker','Speed','#FF6B47','#1F1208'],
  ['a11y-keeper','A11y','#7FD4D4','#0a1c1c'],
  ['sec-sentry','Security','#E6C76B','#1F1907'],
  ['db-master','Schema','#D4A574','#1A1308'],
  ['ci-mason','CI/CD','#6BCF7F','#0d1d12'],
  ['doc-scribe','Docs','#A8A8A0','#1a1a1a'],
  ['ship-captain','Release','#FF6B47','#1F1208'],
  ['copy-poet','Copy','#D4A574','#1A1308'],
  ['design-eye','Design','#7FD4D4','#0a1c1c'],
];

const AgentPortrait = ({ accent, bg, glyph, idx }) => {
  // simple programmatic SVG portrait
  const seed = (idx * 37) % 360;
  return (
    <svg viewBox="0 0 64 64" style={{ width:'100%', height:'100%' }}>
      <defs>
        <linearGradient id={`bg${idx}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={bg} stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#bg${idx})`}/>
      <circle cx="32" cy="26" r="11" fill={accent} opacity="0.9"/>
      <circle cx="32" cy="26" r="11" fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="0.5"/>
      <path d={`M12 60 Q32 ${42 + (seed%4)} 52 60 Z`} fill={accent} opacity="0.85"/>
      <text x="32" y="58" textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#0F0F0F" fontWeight="700">
        {String(idx+1).padStart(2,'0')}
      </text>
    </svg>
  );
};

const AgentsScene = () => {
  return (
    <div style={{
      position:'absolute', inset:0,
      background:
        'radial-gradient(60% 50% at 80% 18%, rgba(255,107,71,.08), transparent 60%),'+
        'radial-gradient(50% 50% at 18% 88%, rgba(127,212,212,.05), transparent 65%),'+
        '#0F0F0F',
      overflow:'hidden',
      fontFamily:'"Inter",system-ui,sans-serif',
    }}>
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:
          'linear-gradient(to right, rgba(245,245,240,.025) 1px, transparent 1px),'+
          'linear-gradient(to bottom, rgba(245,245,240,.025) 1px, transparent 1px)',
        backgroundSize:'56px 56px',
      }} />

      {/* corner brand */}
      <div style={{
        position:'absolute', left:48, top:40,
        display:'flex', alignItems:'center', gap:10,
        fontFamily:'"JetBrains Mono",monospace', fontSize:14, color:'#A8A8A0',
      }}>
        <div style={{ width:26, height:26, borderRadius:6, background:'#181818', border:'1px solid rgba(245,245,240,.14)', display:'grid', placeItems:'center', color:'#FF6B47' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l5 5-5 5M16 22h8"/></svg>
        </div>
        <span><b style={{color:'#F5F5F0',fontWeight:500}}>cc-commander</b> <span style={{color:'#6E6E68',margin:'0 6px'}}>·</span> 22 specialist agents</span>
      </div>

      {/* INTRO 0–2.4s */}
      <Sprite start={0.2} end={2.6}>
        {({ progress }) => (
          <div style={{
            position:'absolute', left:'50%', top:'46%',
            transform:'translate(-50%,-50%)',
            textAlign:'center',
            opacity: interpolate([0,0.18,0.85,1],[0,1,1,0])(progress),
          }}>
            <div style={{
              fontFamily:'"JetBrains Mono",monospace', fontSize:13,
              color:'#A8A8A0', letterSpacing:'.18em', textTransform:'uppercase', marginBottom:14,
            }}>— meet the council —</div>
            <div style={{
              fontFamily:'"Inter",sans-serif', fontSize:88, fontWeight:600,
              color:'#F5F5F0', letterSpacing:'-.025em', lineHeight:1.0,
            }}>
              <span style={{color:'#FF6B47'}}>17</span> specialists.
            </div>
            <div style={{
              fontFamily:'"Inter",sans-serif', fontSize:30, fontWeight:500,
              color:'#A8A8A0', marginTop:6, letterSpacing:'-.01em',
            }}>
              One council. One commander.
            </div>
          </div>
        )}
      </Sprite>

      {/* GRID 2.2–9.0s */}
      <Sprite start={2.2} end={9.6} keepMounted>
        {({ progress, localTime }) => {
          const op = animate({from:0,to:1,start:0,end:0.08})(progress);
          // 6 cols × 3 rows (17 cells, 1 placeholder for council badge in last)
          const cellsPerRow = 6;
          const cellW = 168, cellH = 116, gap = 14;
          const totalW = cellsPerRow*cellW + (cellsPerRow-1)*gap;
          const startX = (1280 - totalW) / 2;
          const startY = 200;

          return (
            <div style={{ position:'absolute', inset:0, opacity:op }}>
              {/* header strip */}
              <div style={{
                position:'absolute', left:'50%', top:140,
                transform:'translateX(-50%)',
                fontFamily:'"JetBrains Mono",monospace', fontSize:13, color:'#6E6E68',
                letterSpacing:'.12em', textTransform:'uppercase',
                display:'flex', gap:18,
              }}>
                <span><span style={{color:'#FF6B47'}}>●</span> 22 agents</span>
                <span style={{color:'#6E6E68'}}>·</span>
                <span>spawnable on demand</span>
                <span style={{color:'#6E6E68'}}>·</span>
                <span>composable into councils</span>
              </div>

              {AGENTS.map((agent, i) => {
                const [name, role, accent, bg] = agent;
                const row = Math.floor(i / cellsPerRow);
                const col = i % cellsPerRow;
                const x = startX + col * (cellW + gap);
                const y = startY + row * (cellH + gap);
                // staggered reveal
                const reveal = clamp((localTime - 0.2 - i * 0.12), 0, 1);
                const re = Easing.easeOutBack(clamp(reveal / 0.5, 0, 1));
                // highlight sweep at localTime 5.0–6.5
                const sweep = clamp((localTime - 5.0 - i * 0.04) / 0.3, 0, 1);
                const sweepOff = clamp((localTime - 6.5 - i * 0.04) / 0.4, 0, 1);
                const isHot = sweep > 0 && sweepOff < 1;
                return (
                  <div key={i} style={{
                    position:'absolute', left:x, top:y, width:cellW, height:cellH,
                    border:`1px solid ${isHot ? 'rgba(255,107,71,.55)' : 'rgba(245,245,240,.10)'}`,
                    borderRadius:10,
                    background: isHot ? '#181818' : '#141414',
                    overflow:'hidden',
                    opacity: reveal,
                    transform: `translateY(${(1-re) * 14}px) scale(${0.92 + 0.08 * re})`,
                    transition: 'border-color .25s, background .25s',
                    boxShadow: isHot ? `0 8px 24px -10px ${accent}66` : 'none',
                    padding:'14px 14px 12px 76px',
                    display:'flex', flexDirection:'column', justifyContent:'center',
                  }}>
                    <div style={{ position:'absolute', left:14, top:14, width:48, height:48, borderRadius:'50%', overflow:'hidden', border:'1px solid rgba(245,245,240,.14)' }}>
                      <AgentPortrait accent={accent} bg={bg} idx={i}/>
                    </div>
                    <div style={{ position:'absolute', left:50, top:46, width:10, height:10, borderRadius:'50%', background:'#6BCF7F', border:'2px solid #141414', boxShadow:'0 0 5px #6BCF7F' }}/>
                    <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:13, color:'#F5F5F0' }}>
                      {name.split('-').map((p,j) => j===0 ? <span key={j} style={{color:accent}}>{p}</span> : <span key={j}>-{p}</span>)}
                    </div>
                    <div style={{ fontSize:12, color:'#A8A8A0', marginTop:2 }}>{role}</div>
                    <div style={{ position:'absolute', right:10, top:10, fontFamily:'"JetBrains Mono",monospace', fontSize:10, color:'#6E6E68', letterSpacing:'.06em' }}>
                      {String(i+1).padStart(2,'0')}/17
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }}
      </Sprite>

      {/* COUNCIL CALLOUT 9.4–end */}
      <Sprite start={9.4} end={AGENTS_DUR}>
        {({ progress }) => {
          const op = animate({from:0,to:1,start:0,end:0.18,ease:Easing.easeOutCubic})(progress);
          return (
            <div style={{
              position:'absolute', inset:0,
              background: `rgba(15,15,15,${0.55 * op})`,
            }}>
              <div style={{
                position:'absolute', left:'50%', top:'48%',
                transform:'translate(-50%,-50%)',
                width:760, padding:'40px 48px',
                border:'1px solid rgba(255,107,71,.4)',
                borderRadius:14,
                background:'linear-gradient(180deg, rgba(20,20,20,0.95), rgba(15,15,15,0.95))',
                boxShadow:'0 30px 80px -20px rgba(0,0,0,.7), 0 0 0 1px rgba(255,107,71,.06)',
                opacity: op,
                transform: `translate(-50%, -50%) scale(${0.95 + 0.05 * op})`,
                textAlign:'center',
                fontFamily:'"Inter",sans-serif',
              }}>
                <div style={{
                  fontFamily:'"JetBrains Mono",monospace', fontSize:12,
                  color:'#FF6B47', letterSpacing:'.18em', textTransform:'uppercase', marginBottom:18,
                }}>/plan auth</div>
                <div style={{ fontSize:46, fontWeight:600, color:'#F5F5F0', letterSpacing:'-.02em', lineHeight:1.1 }}>
                  4 agents convene.<br/>
                  <span style={{color:'#A8A8A0'}}>1 plan ships.</span>
                </div>
                <div style={{
                  marginTop:24, display:'flex', gap:8, justifyContent:'center',
                  fontFamily:'"JetBrains Mono",monospace', fontSize:13,
                }}>
                  {['planner','sec-sentry','db-master','test-warden'].map((n, i) => (
                    <span key={n} style={{
                      padding:'7px 14px', borderRadius:999,
                      border:'1px solid rgba(255,107,71,.35)',
                      background:'rgba(255,107,71,.08)',
                      color:'#F5F5F0',
                    }}>
                      <span style={{color:'#FF6B47'}}>●</span> {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        }}
      </Sprite>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <Stage width={1280} height={720} duration={AGENTS_DUR} background="#000" persistKey="ccc-agents">
    <AgentsScene />
  </Stage>
);
