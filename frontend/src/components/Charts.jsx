function ChartGrid({ max, step, left, right, top, plotHeight, width }) {
  const ticks = [];
  for (let value = 0; value <= max; value += step) {
    const y = top + plotHeight - (value / (max || 1)) * plotHeight;
    ticks.push(<g key={value}><line x1={left} y1={y} x2={width - right} y2={y} className="chart-grid" /><text x={left - 12} y={y + 4} className="chart-y-label" textAnchor="end">{value}</text></g>);
  }
  return ticks;
}
function niceStep(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  return Math.max(1, (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power);
}
function SpeedChart({ tests }) {
  const points = [...tests].reverse().map((test, i) => ({ ...test, xIndex: i, wpm: Number(test.wpm) })).filter((test) => Number.isFinite(test.wpm));
  if (!points.length) return <p className="chart-caption">Complete a test to see your speed history.</p>;
  const W = 720, H = 280, left = 58, right = 18, top = 22, bottom = 42, plotH = H - top - bottom;
  const low = Math.min(...points.map((point) => point.wpm)), high = Math.max(...points.map((point) => point.wpm));
  const step = niceStep((high - low) / 4 || Math.max(1, high * 0.1));
  const min = Math.max(0, Math.floor(low / step) * step - (high === low ? step : 0));
  const max = Math.ceil(high / step) * step + (high === low ? step : 0);
  const coords = points.map((point, i) => ({ ...point, x: points.length === 1 ? left + (W-left-right)/2 : left + i/(points.length-1)*(W-left-right), y: top + plotH - ((point.wpm-min)/(max-min))*plotH }));
  const yTicks=[];
  for(let value=min;value<=max;value+=step){const y=top+plotH-((value-min)/(max-min))*plotH;yTicks.push(<g key={value}><line x1={left} y1={y} x2={W-right} y2={y} className="chart-grid"/><text x={left-12} y={y+4} className="chart-y-label" textAnchor="end">{value}</text></g>);}
  return <svg className="wpm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Words per minute over all your recent typing tests">
    {yTicks}
    <polyline points={coords.map((p) => `${p.x},${top + plotH - ((p.wpm-min)/(max-min))*plotH}`).join(" ")} className="chart-line" />
    {coords.map((p, i) => <g key={`${p.id}-${i}`}><text x={p.x} y={H-12} className="chart-x-label" textAnchor="middle">{i+1}</text><circle cx={p.x} cy={p.y} r="4.5" className="chart-point"><title>{`Test ${i+1}: ${p.wpm} WPM`}</title></circle></g>)}
  </svg>;
}
function DistributionChart({ tests }) {
  const speeds = tests.map((test) => Number(test.wpm)).filter((wpm) => Number.isFinite(wpm) && wpm >= 0);
  if (!speeds.length) return <p className="chart-caption">Complete a test to see your WPM ranges.</p>;
  const W = 720, H = 280, left = 58, right = 18, top = 22, bottom = 48, plotW = W-left-right, plotH = H-top-bottom;
  const finalBucket = Math.floor(Math.max(...speeds) / 10);
  const capped = finalBucket > 30;
  const allBuckets = Array.from({ length: Math.min(finalBucket + 1, 31) }, (_, index) => ({ start: index*10, count: 0 }));
  for (const wpm of speeds) allBuckets[Math.min(Math.floor(wpm/10), allBuckets.length-1)].count++;
  const buckets = allBuckets.filter(({ count }) => count > 0);
  const peak = Math.max(...buckets.map((bucket) => bucket.count));
  const step = niceStep(peak/4 || 1), max = Math.ceil(peak/step)*step || 1, slot = plotW/buckets.length, barW = Math.min(44, slot*.62);
  return <svg className="wpm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Number of tests in each ten WPM range">
    <ChartGrid max={max} step={step} left={left} right={right} top={top} plotHeight={plotH} width={W} />
    {buckets.map(({ start, count }, i) => { const barH=count/max*plotH, x=left+slot*i+(slot-barW)/2, label=capped&&i===buckets.length-1?"300+":`${start}-${start+9}`; return <g key={start}><rect x={x} y={top+plotH-barH} width={barW} height={barH} rx="3" className="chart-bar"><title>{`${label} WPM: ${count} tests`}</title></rect><text x={left+slot*(i+.5)} y={H-12} className="chart-x-label" textAnchor="middle">{label}</text></g>; })}
  </svg>;
}


export { SpeedChart, DistributionChart };
