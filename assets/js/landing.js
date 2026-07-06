/* ============================================================
   LANDING PAGE
   ============================================================ */
let L_MOVIES = [], L_GAMES = [];

async function loadLanding(){
  document.getElementById('trendStrip').innerHTML = skeletons(8);

  const iso = d => d.toISOString().slice(0,10);
  const gFrom = new Date(); gFrom.setMonth(gFrom.getMonth() - 6);  // rolling: recent releases only
  const gTo   = new Date(); gTo.setMonth(gTo.getMonth() + 1);      // + imminent releases
  const [movies, games] = await Promise.all([
    fetchTMDB('/trending/movie/week').then(d=>d.results||[]).catch(()=>[]),
    fetchRAWG(`/games?ordering=-added&page_size=20&dates=${iso(gFrom)},${iso(gTo)}`).then(d=>d.results||[]).catch(()=>[]),
  ]);

  L_MOVIES = movies;
  L_GAMES  = games.length ? games : MOCK_GAMES;
  if(!movies.length && !games.length)
    showBanner('landingError', 'Live data unavailable — check Vercel environment variables. Showing demo data.');

  buildHero();
  buildGateways();
  buildSnapshot();
  buildTrendStrip();
}

/* ---- HERO ---- */
function buildHero(){
  const m = L_MOVIES;
  // backdrop
  const feat = m.find(x=>x.backdrop_path) || m[0];
  if(feat && feat.backdrop_path){
    const bg = document.getElementById('heroBg');
    const img = new Image();
    img.onload = ()=>{ bg.style.backgroundImage = `url(${IMG.backdrop}${feat.backdrop_path})`; bg.style.opacity = '1'; };
    img.src = `${IMG.backdrop}${feat.backdrop_path}`;
    document.getElementById('heroFeatured').innerHTML =
      `🔥 Trending #1 · <b>${feat.title}</b> &nbsp;★ ${fmt.rating(feat.vote_average)}`;
  }
  // poster row (7 posters)
  const picks = m.filter(x=>x.poster_path).slice(0,7);
  document.getElementById('collage').innerHTML = picks.map(p =>
    `<div class="pc"><img src="${IMG.poster}${p.poster_path}" alt="${p.title}" loading="lazy"></div>`
  ).join('');

  // stats
  const mRat = m.map(x=>x.vote_average).filter(Boolean);
  const gRat = L_GAMES.map(gameRating10).filter(Boolean);
  const mAvg = mRat.length ? mRat.reduce((a,b)=>a+b,0)/mRat.length : 0;
  const gAvg = gRat.length ? gRat.reduce((a,b)=>a+b,0)/gRat.length : 0;
  const genres = new Set([...m.map(movieGenre), ...L_GAMES.map(gameGenre)]);

  countUp(document.getElementById('hsTitles'), m.length + L_GAMES.length);
  countUp(document.getElementById('hsMovieAvg'), mAvg, {dec:1});
  countUp(document.getElementById('hsGameAvg'), gAvg, {dec:1});
  countUp(document.getElementById('hsGenres'), genres.size);
}

/* ---- GATEWAYS ---- */
function buildGateways(){
  const m = L_MOVIES, g = L_GAMES;
  const mRat = m.map(x=>x.vote_average).filter(Boolean);
  const gRat = g.map(gameRating10).filter(Boolean);
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };

  set('gwMovieCount', m.length || '—');
  set('gwMovieAvg', mRat.length ? (mRat.reduce((a,b)=>a+b,0)/mRat.length).toFixed(1) : '—');
  set('gwMovieTop', mRat.length ? Math.max(...mRat).toFixed(1) : '—');
  set('gwGameCount', g.length || '—');
  set('gwGameAvg', gRat.length ? (gRat.reduce((a,b)=>a+b,0)/gRat.length).toFixed(1) : '—');
  set('gwGameTop', gRat.length ? Math.max(...gRat).toFixed(1) : '—');

  document.getElementById('gwMoviePosters').innerHTML = m.filter(x=>x.poster_path).slice(0,5)
    .map(x=>`<img src="${IMG.posterSm}${x.poster_path}" alt="${x.title}" loading="lazy">`).join('');
  document.getElementById('gwGamePosters').innerHTML = g.slice(0,5)
    .map(x=> x.background_image
      ? `<img src="${x.background_image}" alt="${x.name}" loading="lazy">`
      : `<div class="pf">🎮</div>`).join('');
}

/* ---- SNAPSHOT (comparison chart + top movers) ---- */
function buildSnapshot(){
  const bands = ['<5','5–6','6–7','7–8','8–9','9+'];
  const bandIdx = r => r<5?0 : r<6?1 : r<7?2 : r<8?3 : r<9?4 : 5;
  const mCounts = Array(6).fill(0), gCounts = Array(6).fill(0);
  L_MOVIES.forEach(m=>{ if(m.vote_average) mCounts[bandIdx(m.vote_average)]++; });
  L_GAMES.forEach(g=>{ const r=gameRating10(g); if(r) gCounts[bandIdx(r)]++; });
  // to percentage share
  const mTot = mCounts.reduce((a,b)=>a+b,0)||1, gTot = gCounts.reduce((a,b)=>a+b,0)||1;
  const mPct = mCounts.map(c=>+(c/mTot*100).toFixed(1));
  const gPct = gCounts.map(c=>+(c/gTot*100).toFixed(1));

  new Chart(document.getElementById('cmpChart'), {
    type:'bar',
    data:{labels:bands, datasets:[
      {label:'Movies', data:mPct, backgroundColor:'#ff4d6d', borderRadius:6, borderSkipped:false, maxBarThickness:26},
      {label:'Games',  data:gPct, backgroundColor:'#22e3c4', borderRadius:6, borderSkipped:false, maxBarThickness:26},
    ]},
    options:{
      plugins:{
        barValueLabel:false,
        legend:{display:true,position:'top',align:'end',labels:{color:'#a4a4bd',usePointStyle:true,pointStyle:'circle',padding:16,boxWidth:8}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y}% of titles`}}
      },
      scales:{x:axisCat(),y:{...axis({callback:v=>v+'%'}),beginAtZero:true,grace:'6%'}}
    }
  });

  // top movers — combined score
  const movers = [
    ...L_MOVIES.map(m=>({title:m.title,type:'Movie',cls:'m',score:Math.round(m.vote_average*10),
      img:m.poster_path?IMG.posterSm+m.poster_path:null,emoji:'🎬'})),
    ...L_GAMES.map(g=>({title:g.name,type:'Game',cls:'g',score:Math.round(gameRating10(g)*10),
      img:g.background_image||null,emoji:'🎮'})),
  ].sort((a,b)=>b.score-a.score).slice(0,6);
  const max = Math.max(...movers.map(m=>m.score),1);
  const medal = ['g1','g2','g3'];
  document.getElementById('topMovers').innerHTML = movers.map((it,i)=>`
    <div class="lb-item">
      <div class="lb-rank ${medal[i]||''}">${i+1}</div>
      <div class="lb-thumb">${it.img?`<img src="${it.img}" alt="${it.title}" loading="lazy">`:it.emoji}</div>
      <div class="lb-info"><div class="lb-title">${it.title}</div>
        <div class="lb-tags"><span class="pill pill-${it.cls}">${it.type}</span></div></div>
      <div class="lb-metric"><div class="lb-num">${it.score}</div>
        <div class="lb-bar"><div class="lb-fill" style="width:${it.score/max*100}%;background:${it.cls==='m'?'var(--movie)':'var(--game)'}"></div></div></div>
    </div>`).join('');
}

/* ---- TRENDING STRIP (mix) ---- */
function buildTrendStrip(){
  const cards = [];
  const max = Math.max(L_MOVIES.length, L_GAMES.length);
  let mi=0, gi=0;
  for(let i=0;i<max && cards.length<14;i++){
    if(L_MOVIES[mi]) cards.push(movieCard(L_MOVIES[mi], mi++));
    if(L_GAMES[gi])  cards.push(gameCard(L_GAMES[gi], gi++));
  }
  document.getElementById('trendStrip').innerHTML = cards.join('') || '<div class="empty">No trending data available.</div>';
}

loadLanding();
