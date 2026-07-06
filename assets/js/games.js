/* ============================================================
   GAMES PAGE
   ============================================================ */
let GAMES = [], filterGenre = 'All', sortBy = 'rating', searchQ = '';
let charts = {};

async function loadGames(){
  document.getElementById('gameGrid').innerHTML = skeletons(12);
  document.getElementById('newTrending').innerHTML = skeletons(8);
  try{
    // rolling window so the catalog stays current instead of a frozen 2023 start
    const iso = d => d.toISOString().slice(0,10);
    const from = new Date(); from.setFullYear(from.getFullYear() - 2);  // last 2 years
    const to   = new Date(); to.setMonth(to.getMonth() + 1);            // + imminent releases
    const data = await fetchRAWG(`/games?ordering=-added&page_size=40&dates=${iso(from)},${iso(to)}`);
    GAMES = data.results || [];
    if(!GAMES.length) throw new Error('empty response');
  }catch(e){
    showBanner('gameError', `Could not load games: ${e.message}. Showing demo data.`);
    GAMES = MOCK_GAMES;
  }
  buildHeaderBg();
  buildKPIs();
  buildNewTrending();
  buildChips();
  renderGrid();
  buildAnalytics();
}

/* ---- NEW & TRENDING (recent + upcoming releases, recency-weighted) ---- */
// RAWG has no trending endpoint, so we mimic its "New & Trending" homepage:
// a tight rolling window around today ranked by popularity that decays with age,
// so this week's fast-rising releases outrank older established hits.
function trendScore(g){
  const added = g.added || 0;
  if(!g.released) return added;
  const days = (Date.now() - new Date(g.released)) / 86400000;
  // future/just-released → full weight; ~halves each month of age
  const recency = 1 / (1 + Math.max(0, days) / 30);
  return added * recency;
}

async function buildNewTrending(){
  const el = document.getElementById('newTrending');
  const iso = d => d.toISOString().slice(0,10);
  const from = new Date(); from.setMonth(from.getMonth() - 4);   // last 4 months
  const to   = new Date(); to.setMonth(to.getMonth() + 1);       // + imminent releases
  let items = [];
  try{
    // wide fresh pull; ranked client-side so brand-new titles can surface
    const data = await fetchRAWG(`/games?dates=${iso(from)},${iso(to)}&ordering=-added&page_size=40`);
    items = data.results || [];
  }catch(e){ /* fall through to local pool */ }

  if(items.length < 6){
    // fallback (offline / sparse response): newest games from the loaded pool
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 18);
    let pool = GAMES.filter(g => g.released && new Date(g.released) >= cutoff);
    if(pool.length < 6) pool = [...GAMES];
    items = pool;
  }

  items = items.sort((a,b) => trendScore(b) - trendScore(a)).slice(0, 12);

  el.innerHTML =
    items.length ? items.map((g,i) => gameCard(g,i)).join('') : '<div class="empty">No new releases trending.</div>';
}

function buildHeaderBg(){
  const feat = GAMES.find(g=>g.background_image);
  if(feat) document.getElementById('headBg').style.backgroundImage = `url(${feat.background_image})`;
}

/* ---- KPIs ---- */
function buildKPIs(){
  const rated = GAMES.map(gameRating10).filter(Boolean);
  const avg = rated.reduce((a,b)=>a+b,0)/rated.length;
  const metas = GAMES.map(g=>g.metacritic).filter(Boolean);
  const metaAvg = metas.length ? metas.reduce((a,b)=>a+b,0)/metas.length : 0;
  const added = GAMES.reduce((s,g)=>s+(g.added||0),0);

  countUp(document.getElementById('kTitles'), GAMES.length);
  document.getElementById('kAvg').innerHTML = avg.toFixed(1)+'<small>/10</small>';
  document.getElementById('kMeta').textContent = metaAvg ? Math.round(metaAvg) : '—';
  document.getElementById('kAdded').textContent = fmt.compact(added);
  document.getElementById('kMetaSub').textContent = `${metas.length} of ${GAMES.length} scored`;
  document.getElementById('kAvgSub').textContent = `${rated.filter(r=>r>=8).length} rated 8.0+`;
}

/* ---- CHIPS ---- */
function buildChips(){
  const genres = ['All', ...[...new Set(GAMES.map(gameGenre))].sort()];
  document.getElementById('genreChips').innerHTML = genres.map((g,i)=>
    `<button class="chip ${i===0?'active g':''}" data-g="${g}">${g}</button>`).join('');
  $$('#genreChips .chip').forEach(c=>c.addEventListener('click',()=>{
    $$('#genreChips .chip').forEach(x=>x.classList.remove('active','g'));
    c.classList.add('active','g'); filterGenre=c.dataset.g; renderGrid();
  }));
  document.getElementById('sortSel').addEventListener('change',e=>{ sortBy=e.target.value; renderGrid(); });
  document.getElementById('searchInput').addEventListener('input', debounce(e=>{ searchQ=e.target.value.toLowerCase(); renderGrid(); }, 180));
}

/* ---- GRID ---- */
function sortGames(arr){
  const c=[...arr];
  if(sortBy==='added') c.sort((a,b)=>(b.added||0)-(a.added||0));
  else if(sortBy==='rating') c.sort((a,b)=>(b.rating||0)-(a.rating||0));
  else if(sortBy==='metacritic') c.sort((a,b)=>(b.metacritic||0)-(a.metacritic||0));
  else if(sortBy==='release') c.sort((a,b)=>String(b.released||'').localeCompare(String(a.released||'')));
  return c;
}
function renderGrid(){
  let data=GAMES;
  if(filterGenre!=='All') data=data.filter(g=>gameGenre(g)===filterGenre);
  if(searchQ) data=data.filter(g=>g.name.toLowerCase().includes(searchQ));
  data=sortGames(data);
  document.getElementById('gameGrid').innerHTML =
    data.length ? data.map((g,i)=>gameCard(g,i)).join('') : '<div class="empty">No games match your filters.</div>';
}

/* ---- ANALYTICS ---- */
function buildAnalytics(){
  buildPlatformChart();
  buildLeaderboard();
  buildGenreChart();
  buildRatingChart();
  buildYearChart();
  buildMetaChart();
}

function buildPlatformChart(){
  const freq={};
  GAMES.forEach(g=>(g.platforms||[]).forEach(p=>{
    const n=p.platform?.name||'Other';
    // group platform families
    const fam = n.startsWith('PlayStation')?'PlayStation':n.startsWith('Xbox')?'Xbox':
      n.includes('Nintendo')?'Nintendo':n==='PC'?'PC':n.includes('iOS')||n.includes('Android')?'Mobile':n.includes('macOS')||n.includes('Linux')?'PC':'Other';
    freq[fam]=(freq[fam]||0)+1;
  }));
  const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
  charts.platform?.destroy();
  charts.platform = new Chart(document.getElementById('platformChart'),{
    type:'bar',
    data:{labels:sorted.map(x=>x[0]),datasets:[{data:sorted.map(x=>x[1]),
      backgroundColor:sorted.map((_,i)=>PALETTE[i%PALETTE.length]),borderRadius:8,borderSkipped:false,maxBarThickness:46}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>`${c.parsed.y} of ${GAMES.length} titles`}}},
      scales:{x:axisCat(),y:{...axis(),beginAtZero:true,grace:'12%',ticks:{stepSize:1,color:'rgba(255,255,255,.62)'}}}}
  });
}

function buildLeaderboard(){
  const items=[...GAMES].sort((a,b)=>(b.added||0)-(a.added||0)).slice(0,7);
  const max=Math.max(...items.map(g=>g.added||0),1);
  const medal=['g1','g2','g3'];
  document.getElementById('gameLeaderboard').innerHTML = items.map((g,i)=>`
    <div class="lb-item">
      <div class="lb-rank ${medal[i]||''}">${i+1}</div>
      <div class="lb-thumb">${g.background_image?`<img src="${g.background_image}" alt="${g.name}" loading="lazy">`:'🎮'}</div>
      <div class="lb-info"><div class="lb-title">${g.name}</div>
        <div class="lb-tags">${gameGenre(g)} · ★ ${fmt.rating(gameRating10(g))}</div></div>
      <div class="lb-metric"><div class="lb-num" style="color:var(--game)">${fmt.compact(g.added||0)}</div>
        <div class="lb-bar"><div class="lb-fill" style="width:${(g.added||0)/max*100}%;background:var(--game)"></div></div></div>
    </div>`).join('');
}

function buildGenreChart(){
  const freq={};
  GAMES.forEach(g=>{const n=gameGenre(g);freq[n]=(freq[n]||0)+1;});
  const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,9);
  const gTotal=sorted.reduce((a,b)=>a+b[1],0)||1;
  charts.genre?.destroy();
  charts.genre = new Chart(document.getElementById('genreChart'),{
    type:'doughnut',
    data:{labels:sorted.map(x=>x[0]),datasets:[{data:sorted.map(x=>x[1]),
      backgroundColor:PALETTE,borderColor:'#0c0c15',borderWidth:2,hoverOffset:6}]},
    options:{cutout:'62%',plugins:{
      legend:{display:true,position:'right',labels:{color:'#a4a4bd',usePointStyle:true,pointStyle:'circle',padding:11,font:{size:11},boxWidth:8}},
      tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed} games · ${Math.round(c.parsed/gTotal*100)}%`}}}}
  });
}

function buildRatingChart(){
  const bands=['<5','5–6','6–7','7–8','8–8.5','8.5–9','9+'];
  const counts=Array(bands.length).fill(0);
  GAMES.forEach(g=>{const r=gameRating10(g);if(!r)return;
    counts[r<5?0:r<6?1:r<7?2:r<8?3:r<8.5?4:r<9?5:6]++;});
  charts.rating?.destroy();
  charts.rating = new Chart(document.getElementById('ratingChart'),{
    type:'bar',
    data:{labels:bands,datasets:[{data:counts,
      backgroundColor:bands.map((_,i)=>hexA('#22e3c4',.4+i*0.09)),borderRadius:6,borderSkipped:false}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>`${c.parsed.y} games`}}},
      scales:{x:axisCat({font:{size:11}}),y:{...axis(),beginAtZero:true,grace:'12%',ticks:{stepSize:1,color:'rgba(255,255,255,.62)'}}}}
  });
}

function buildYearChart(){
  const freq={};
  GAMES.forEach(g=>{const y=fmt.year(g.released);if(y!=='—')freq[y]=(freq[y]||0)+1;});
  const years=Object.keys(freq).sort();
  charts.year?.destroy();
  charts.year = new Chart(document.getElementById('yearChart'),{
    type:'bar',
    data:{labels:years,datasets:[{data:years.map(y=>freq[y]),backgroundColor:'#3b82f6',borderRadius:6,borderSkipped:false,maxBarThickness:30}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>`${c.parsed.y} games`}}},
      scales:{x:axisCat({font:{size:11}}),y:{...axis(),beginAtZero:true,grace:'12%',ticks:{stepSize:1,color:'rgba(255,255,255,.62)'}}}}
  });
}

function buildMetaChart(){
  const pts=GAMES.filter(g=>g.metacritic && g.rating).map(g=>({
    x:g.metacritic, y:gameRating10(g), t:g.name}));
  charts.meta?.destroy();
  if(!pts.length){
    document.getElementById('metaChart').closest('.panel').style.display='none';
    return;
  }
  charts.meta = new Chart(document.getElementById('metaChart'),{
    type:'scatter',
    data:{datasets:[{data:pts,backgroundColor:'rgba(34,227,196,.6)',borderColor:'#22e3c4',borderWidth:1,pointRadius:6,pointHoverRadius:9}]},
    options:{
      plugins:{tooltip:{callbacks:{title:c=>c[0].raw.t,
        label:c=>`Critics ${c.raw.x} · Players ${c.raw.y.toFixed(1)}`}}},
      scales:{
        x:{...axis(),title:{display:true,text:'Metacritic (critics)',color:'#5e5e74'},suggestedMin:50,suggestedMax:100},
        y:{...axis(),title:{display:true,text:'Player rating',color:'#5e5e74'},suggestedMin:4,suggestedMax:10}
      }
    }
  });
}

loadGames();
