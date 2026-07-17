// scene-hooks.jsx — 9-event lifecycle, animated event flow

const HOOKS_DUR = 13;

const EVENTS = [
  { name:'OnPrompt',    handlers:['route','classify','enrich'],         color:'#FF6B47' },
  { name:'PreToolUse',  handlers:['validate','rate-limit'],             color:'#D4A574' },
  { name:'PostToolUse', handlers:['log','snapshot'],                    color:'#7FD4D4' },
  { name:'OnEdit',      handlers:['typecheck','format','review'],       color:'#FF6B47' },
  { name:'OnPlan',      handlers:['council','spec','estimate'],         color:'#D4A574' },
  { name:'OnCommit',    handlers:['audit','test','message'],            color:'#6BCF7F' },
  { name:'OnError',     handlers:['triage','retry'],                    color:'#E6C76B' },
  { name:'OnFinish',    handlers:['summary','digest'],                  color:'#7FD4D4' },
  { name:'OnIdle',      handlers:['housekeep','suggest'],               color:'#A8A8A0' },
];

const HooksScene = () => (
  <div style={{
    position:'absolute', inset:0,
    background:
      'radial-gradient(50% 50% at 80% 20%, rgba(255,107,71,.07), transparent 60%),'+
      'radial-gradient(40% 40% at 20% 80%, rgba(127,212,212,.05), transparent 65%),'+
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
      maskImage:'radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)',
      WebkitMaskImage:'radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%)',
    }} />

    <div style={{
      position:'absolute', left:48, top:40,
      display:'flex', alignItems:'center', gap:10,
      fontFamily:'"JetBrains Mono",monospace', fontSize:14, color:'#A8A8A0',
    }}>
      <div style={{ width:26, height:26, borderRadius:6, background:'#181818', border:'1px solid rgba(245,245,240,.14)', display:'grid', placeItems:'center', color:'#FF6B47' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l5 5-5 5M16 22h8"/></svg>
      </div>
      <span><b style={{color:'#F5F5F0',fontWeight:500}}>cc-commander</b> <span style={{color:'#6E6E68',margin:'0 6px'}}>·</span> 9 hooks × 24 handlers</span>
    </div>

    {/* INTRO */}
    <Sprite start={0.2} end={2.4}>
      {({ progress }) => (
        <div style={{
          position:'absolute', left:'50%', top:'46%', transform:'translate(-50%,-50%)',
          textAlign:'center',
          opacity: interpolate([0,0.18,0.85,1],[0,1,1,0])(progress),
        }}>
          <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:13, color:'#A8A8A0', letterSpacing:'.18em', textTransform:'uppercase', marginBottom:14 }}>— lifecycle —</div>
          <div style={{ fontSize:84, fontWeight:600, color:'#F5F5F0', letterSpacing:'-.025em', lineHeight:1.0 }}>
            Every move, <span style={{color:'#FF6B47'}}>hooked.</span>
          </div>
          <div style={{ marginTop:18, fontSize:24, color:'#A8A8A0' }}>
            9 events. 42 handlers. Zero noise.
          </div>
        </div>
      )}
    </Sprite>

    {/* HOOK ROWS */}
    <Sprite start={2.0} end={HOOKS_DUR} keepMounted>
      {({ progress, localTime }) => {
        const op = animate({from:0,to:1,start:0,end:0.06})(progress);
        const startY = 130;
        const rowH = 56;
        return (
          <div style={{ position:'absolute', inset:0, opacity:op }}>
            {/* spine */}
            <div style={{
              position:'absolute', left:380, top:startY+12, width:2, height: rowH * 9 - 12,
              background:'linear-gradient(180deg, rgba(255,107,71,.4), rgba(127,212,212,.2))',
            }}/>
            {EVENTS.map((ev, i) => {
              const y = startY + i * rowH;
              const start = 0.3 + i * 0.18;
              const lp = clamp((localTime - start) / 0.5, 0, 1);
              const pulseT = clamp((localTime - start - 0.4) % 4, 0, 4);
              const pulseOn = pulseT < 0.6;
              return (
                <div key={i} style={{
                  position:'absolute', left:120, top:y, right:120,
                  display:'grid', gridTemplateColumns:'200px 80px 1fr', alignItems:'center', gap:0,
                  opacity: lp, transform:`translateX(${(1-lp) * 14}px)`,
                }}>
                  {/* event name */}
                  <div style={{
                    fontFamily:'"JetBrains Mono",monospace', fontSize:18,
                    color:'#F5F5F0', textAlign:'right', paddingRight:24,
                  }}>
                    <span style={{color:ev.color}}>{ev.name}</span>
                  </div>
                  {/* node */}
                  <div style={{ position:'relative', height:rowH, display:'grid', placeItems:'center' }}>
                    <div style={{
                      width:14, height:14, borderRadius:'50%',
                      background:ev.color,
                      boxShadow: pulseOn ? `0 0 12px ${ev.color}, 0 0 4px ${ev.color}` : `0 0 6px ${ev.color}66`,
                      transform:`scale(${pulseOn ? 1.2 : 1})`,
                      transition:'transform .25s, box-shadow .25s',
                    }}/>
                    {/* trace line to handlers */}
                    <div style={{
                      position:'absolute', left:'50%', top:'50%',
                      width:60, height:1,
                      background:`linear-gradient(90deg, ${ev.color}, transparent)`,
                      transform:'translateY(-50%)',
                    }}/>
                  </div>
                  {/* handlers chips */}
                  <div style={{ display:'flex', gap:8, paddingLeft:50, flexWrap:'wrap' }}>
                    {ev.handlers.map((h, hi) => {
                      const hLp = clamp((localTime - start - 0.2 - hi * 0.08) / 0.4, 0, 1);
                      // periodic "fire" highlight
                      const fireBase = 1.6 + i * 0.22 + hi * 0.18;
                      const cycle = 4.2;
                      const inFire = ((localTime - fireBase) % cycle) < 0.55 && (localTime > fireBase);
                      return (
                        <span key={hi} style={{
                          padding:'5px 11px', borderRadius:8,
                          border: `1px solid ${inFire ? ev.color : 'rgba(245,245,240,.14)'}`,
                          background: inFire ? `${ev.color}22` : 'rgba(245,245,240,.025)',
                          fontFamily:'"JetBrains Mono",monospace', fontSize:13,
                          color: inFire ? '#F5F5F0' : '#A8A8A0',
                          opacity: hLp,
                          transform:`translateY(${(1-hLp) * 4}px) scale(${inFire ? 1.04 : 1})`,
                          transition:'background .25s, border-color .25s, transform .25s, color .25s',
                          letterSpacing:'-.005em',
                        }}>
                          {h}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* foot */}
            {localTime > 11.0 && (
              <div style={{
                position:'absolute', left:'50%', bottom:36,
                transform:'translateX(-50%)',
                opacity: animate({from:0,to:1,start:0,end:0.2})(clamp((localTime-11.0)/1.5,0,1)),
                fontFamily:'"JetBrains Mono",monospace', fontSize:14, color:'#6E6E68',
                display:'flex', gap:18, alignItems:'center',
              }}>
                <span><span style={{color:'#FF6B47'}}>9</span> events</span>
                <span style={{opacity:.4}}>×</span>
                <span><span style={{color:'#D4A574'}}>19</span> handlers</span>
                <span style={{opacity:.4}}>·</span>
                <span style={{color:'#A8A8A0'}}>full lifecycle, zero glue code</span>
              </div>
            )}
          </div>
        );
      }}
    </Sprite>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <Stage width={1280} height={720} duration={HOOKS_DUR} background="#000" persistKey="ccc-hooks">
    <HooksScene/>
  </Stage>
);
