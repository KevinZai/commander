// scene-compare.jsx — Stock Claude Code vs CC Commander
// 12s: split-screen showing diff bars filling — Commander wins across categories

const COMPARE_DUR = 12;

const ROWS = [
  ['Time to first ship',     '47 min',  '6 min',   8],
  ['Plan quality',           'flat',    'reviewed', 6],
  ['Code review coverage',   '0%',     '100%',    9],
  ['Spec → ship handoffs',   'manual', 'automatic', 7],
  ['Specialist coverage',    '1 agent','22 agents', 9],
  ['Lifecycle hooks',        '0',     '9 × 24 handlers', 8],
  ['Skill library',          'ad-hoc', '74 curated', 8],
  ['Audit on commit',        '—',     'always',   7],
];

const CompareScene = () => {
  return (
    <div style={{
      position:'absolute', inset:0,
      background:'#0F0F0F',
      overflow:'hidden',
      fontFamily:'"Inter",system-ui,sans-serif',
    }}>
      {/* split fade */}
      <div style={{
        position:'absolute', inset:0,
        background:
          'radial-gradient(40% 70% at 22% 50%, rgba(168,168,160,.06), transparent 60%),'+
          'radial-gradient(40% 70% at 78% 50%, rgba(255,107,71,.10), transparent 60%)',
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
        <span><b style={{color:'#F5F5F0',fontWeight:500}}>cc-commander</b> <span style={{color:'#6E6E68',margin:'0 6px'}}>·</span> stock vs commander</span>
      </div>

      {/* INTRO 0–2.4 */}
      <Sprite start={0.2} end={2.4}>
        {({ progress }) => (
          <div style={{
            position:'absolute', left:'50%', top:'48%', transform:'translate(-50%,-50%)',
            textAlign:'center',
            opacity: interpolate([0,0.18,0.85,1],[0,1,1,0])(progress),
          }}>
            <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:13, color:'#A8A8A0', letterSpacing:'.18em', textTransform:'uppercase', marginBottom:14 }}>— side by side —</div>
            <div style={{ fontSize:84, fontWeight:600, color:'#F5F5F0', letterSpacing:'-.025em', lineHeight:1.0 }}>
              <span style={{color:'#A8A8A0'}}>Stock</span> &nbsp;<span style={{color:'#6E6E68'}}>vs</span>&nbsp; <span style={{color:'#FF6B47'}}>Commander.</span>
            </div>
            <div style={{ marginTop:18, fontSize:24, color:'#A8A8A0' }}>
              Same model. Different ceiling.
            </div>
          </div>
        )}
      </Sprite>

      {/* COMPARE TABLE 2.2–end */}
      <Sprite start={2.2} end={COMPARE_DUR} keepMounted>
        {({ progress, localTime }) => {
          const op = animate({from:0,to:1,start:0,end:0.06})(progress);
          return (
            <div style={{
              position:'absolute', left:'50%', top:'52%',
              transform:'translate(-50%,-50%)',
              width: 1100,
              opacity: op,
              fontFamily:'"Inter",sans-serif',
            }}>
              {/* header */}
              <div style={{
                display:'grid', gridTemplateColumns:'280px 1fr 1fr', gap:0,
                padding:'14px 22px', borderTop:'1px solid rgba(245,245,240,.14)', borderBottom:'1px solid rgba(245,245,240,.14)',
                fontFamily:'"JetBrains Mono",monospace', fontSize:12, color:'#6E6E68',
                letterSpacing:'.14em', textTransform:'uppercase',
              }}>
                <span>capability</span>
                <span style={{ textAlign:'left', paddingLeft:18 }}><span style={{color:'#A8A8A0'}}>● stock</span></span>
                <span style={{ textAlign:'left', paddingLeft:18 }}><span style={{color:'#FF6B47'}}>● commander</span></span>
              </div>
              {/* rows */}
              {ROWS.map((row, i) => {
                const [label, stockVal, ccVal, score] = row;
                const start = i * 0.28;
                const lp = clamp((localTime - start) / 0.6, 0, 1);
                const easedRow = Easing.easeOutCubic(lp);
                const stockBar = 100 * (4 / 9);
                const ccBar = 100 * (score / 9);
                return (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'280px 1fr 1fr', gap:0,
                    padding:'18px 22px',
                    borderBottom:'1px solid rgba(245,245,240,.06)',
                    alignItems:'center',
                    opacity: lp, transform:`translateY(${(1-lp) * 8}px)`,
                  }}>
                    <div style={{ fontSize:16, color:'#F5F5F0', fontWeight:500 }}>{label}</div>
                    <div style={{ paddingLeft:18, paddingRight:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontFamily:'"JetBrains Mono",monospace', fontSize:13, color:'#A8A8A0' }}>
                        <span>{stockVal}</span>
                      </div>
                      <div style={{ position:'relative', height:6, borderRadius:3, background:'rgba(245,245,240,.06)', overflow:'hidden' }}>
                        <div style={{
                          position:'absolute', left:0, top:0, bottom:0,
                          width: `${stockBar * easedRow}%`,
                          background:'linear-gradient(90deg, #6E6E68, #A8A8A0)',
                          borderRadius:3,
                        }}/>
                      </div>
                    </div>
                    <div style={{ paddingLeft:18, paddingRight:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontFamily:'"JetBrains Mono",monospace', fontSize:13, color:'#FF6B47' }}>
                        <span>{ccVal}</span>
                      </div>
                      <div style={{ position:'relative', height:6, borderRadius:3, background:'rgba(255,107,71,.08)', overflow:'hidden' }}>
                        <div style={{
                          position:'absolute', left:0, top:0, bottom:0,
                          width: `${ccBar * easedRow}%`,
                          background:'linear-gradient(90deg, #FF6B47, #D4A574)',
                          borderRadius:3,
                          boxShadow:'0 0 8px rgba(255,107,71,.45)',
                        }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* footer summary */}
              {localTime > 9.4 && (
                <div style={{
                  marginTop:18, padding:'14px 22px',
                  border:'1px dashed rgba(255,107,71,.35)',
                  borderRadius:10, background:'rgba(255,107,71,.05)',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  fontFamily:'"JetBrains Mono",monospace', fontSize:14,
                  opacity: animate({from:0,to:1,start:0,end:0.2})(clamp((localTime-9.4)/1.0,0,1)),
                }}>
                  <span style={{color:'#A8A8A0'}}>same Claude. same code. same keys.</span>
                  <span style={{color:'#FF6B47'}}>+ <b style={{color:'#F5F5F0', fontWeight:600}}>commander</b> &nbsp;= ship faster.</span>
                </div>
              )}
            </div>
          );
        }}
      </Sprite>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <Stage width={1280} height={720} duration={COMPARE_DUR} background="#000" persistKey="ccc-compare">
    <CompareScene />
  </Stage>
);
