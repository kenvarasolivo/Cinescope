/* ============================================================
   MOVIES PAGE
   ============================================================ */
let MOVIES = [], filterGenre = 'All', sortBy = 'votes', searchQ = '';
let charts = {};

async function loadMovies(){
  document.getElementById('movieGrid').innerHTML = skeletons(12);
  document.getElementById('newTrending').innerHTML = skeletons(8);
  try{
    // two pages of weekly trending → ~40 films for richer stats
    MOVIES = await fetchTMDBPages('/trending/movie/week', 2);
    if(!MOVIES.length) throw new Error('empty response');
  }catch(e){
    showBanner('movieError', `Could not load movies: ${e.message}. Check Vercel environment variables.`);
    document.getElementById('movieGrid').innerHTML = '<div class="empty">No movie data available.</div>';
    return;
  }
  buildSpotlight();
  buildKPIs();
  buildNewTrending();
  buildChips();
  renderGrid();
  buildAnalytics();
}

/* ---- NEW & TRENDING (recent releases ranked by relevance) ---- */
function buildNewTrending(){
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 18);
  let pool = MOVIES.filter(m => m.release_date && new Date(m.release_date) >= cutoff);
  if(pool.length < 6) pool = [...MOVIES];
  pool.sort((a,b) => (b.popularity||0) - (a.popularity||0));
  const items = pool.slice(0, 12);
  document.getElementById('newTrending').innerHTML =
    items.length ? items.map((m,i) => movieCard(m,i)).join('') : '<div class="empty">No new releases trending.</div>';
}

/* ---- SPOTLIGHT (rotating hero) ---- */
function buildSpotlight(){
  const withArt = MOVIES.filter(m=>m.backdrop_path && m.poster_path);
  initSpotlight((withArt.length ? withArt : MOVIES).slice(0,7).map(movieSpot));
}

/* ---- KPIs ---- */
function buildKPIs(){
  const rated = MOVIES.map(m=>m.vote_average).filter(Boolean);
  const avg = rated.reduce((a,b)=>a+b,0)/rated.length;
  const peakPop = Math.max(...MOVIES.map(m=>m.popularity||0));
  const votes = MOVIES.reduce((s,m)=>s+(m.vote_count||0),0);
  const top = MOVIES.reduce((a,b)=>(b.vote_average>a.vote_average?b:a));

  countUp(document.getElementById('kTitles'), MOVIES.length);
  document.getElementById('kAvg').innerHTML = avg.toFixed(1)+'<small>/10</small>';
  document.getElementById('kPop').textContent = fmt.compact(peakPop);
  document.getElementById('kVotes').textContent = fmt.compact(votes);
  document.getElementById('kPopSub').textContent = `peak: ${(top.title||'').slice(0,22)}`;
  document.getElementById('kAvgSub').textContent = `${rated.filter(r=>r>=7).length} rated 7.0+`;
}

/* ---- CHIPS ---- */
function buildChips(){
  const genres = ['All', ...[...new Set(MOVIES.map(movieGenre))].sort()];
  document.getElementById('genreChips').innerHTML = genres.map((g,i)=>
    `<button class="chip ${i===0?'active m':''}" data-g="${g}">${g}</button>`).join('');
  $$('#genreChips .chip').forEach(c=>c.addEventListener('click',()=>{
    $$('#genreChips .chip').forEach(x=>x.classList.remove('active','m'));
    c.classList.add('active','m'); filterGenre = c.dataset.g; renderGrid();
  }));
  document.getElementById('sortSel').addEventListener('change',e=>{ sortBy=e.target.value; renderGrid(); });
  document.getElementById('searchInput').addEventListener('input', debounce(e=>{ searchQ=e.target.value.toLowerCase(); renderGrid(); }, 180));
}

/* ---- GRID ---- */
function sortMovies(arr){
  const c = [...arr];
  if(sortBy==='popularity') c.sort((a,b)=>(b.popularity||0)-(a.popularity||0));
  else if(sortBy==='rating') c.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
  else if(sortBy==='votes')  c.sort((a,b)=>(b.vote_count||0)-(a.vote_count||0));
  else if(sortBy==='release')c.sort((a,b)=>String(b.release_date||'').localeCompare(String(a.release_date||'')));
  return c;
}
function renderGrid(){
  let data = MOVIES;
  if(filterGenre!=='All') data = data.filter(m=>movieGenre(m)===filterGenre);
  if(searchQ) data = data.filter(m=>m.title.toLowerCase().includes(searchQ));
  data = sortMovies(data);
  document.getElementById('movieGrid').innerHTML =
    data.length ? data.map((m,i)=>movieCard(m,i)).join('') : '<div class="empty">No films match your filters.</div>';
}

/* ---- ANALYTICS ---- */
function buildAnalytics(){
  buildScatter();
  buildLeaderboard();
  buildGenreChart();
  buildRatingChart();
  buildYearChart();
  buildGenreRatingChart();
}

function buildScatter(){
  const pts = MOVIES.filter(m=>m.vote_average && m.popularity).map(m=>({
    x:m.popularity, y:m.vote_average, t:m.title
  }));
  charts.scatter?.destroy();
  charts.scatter = new Chart(document.getElementById('scatterChart'),{
    type:'scatter',
    data:{datasets:[{data:pts,backgroundColor:'rgba(255,77,109,.65)',
      borderColor:'#ff4d6d',borderWidth:1,pointRadius:6,pointHoverRadius:9}]},
    options:{
      plugins:{tooltip:{callbacks:{
        title:c=>c[0].raw.t,
        label:c=>`★ ${c.raw.y.toFixed(1)} · pop ${fmt.compact(c.raw.x)}`}}},
      scales:{
        x:{...axis({callback:v=>fmt.compact(v)}),title:{display:true,text:'Popularity',color:'#5e5e74'},type:'logarithmic'},
        y:{...axis(),title:{display:true,text:'Rating',color:'#5e5e74'},suggestedMin:4,suggestedMax:10}
      }
    }
  });
}

function buildLeaderboard(){
  const items = [...MOVIES].filter(m=>m.vote_count>50)
    .sort((a,b)=>b.vote_average-a.vote_average).slice(0,7);
  const medal=['g1','g2','g3'];
  document.getElementById('movieLeaderboard').innerHTML = items.map((m,i)=>`
    <div class="lb-item">
      <div class="lb-rank ${medal[i]||''}">${i+1}</div>
      <div class="lb-thumb">${m.poster_path?`<img src="${IMG.posterSm}${m.poster_path}" alt="${esc(m.title)}" loading="lazy">`:'🎬'}</div>
      <div class="lb-info"><div class="lb-title">${esc(m.title)}</div>
        <div class="lb-tags">${movieGenre(m)} · ${fmt.compact(m.vote_count)} votes</div></div>
      <div class="lb-metric"><div class="lb-num" style="color:var(--gold)">${m.vote_average.toFixed(1)}</div>
        <div class="lb-bar"><div class="lb-fill" style="width:${m.vote_average*10}%;background:var(--gold)"></div></div></div>
    </div>`).join('');
}

function buildGenreChart(){
  const freq={};
  MOVIES.forEach(m=>{ const g=movieGenre(m); freq[g]=(freq[g]||0)+1; });
  const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
  const labels=sorted.map(x=>x[0]), vals=sorted.map(x=>x[1]);
  charts.genre?.destroy();
  charts.genre = new Chart(document.getElementById('genreChart'),{
    type:'doughnut',
    data:{labels,datasets:[{data:vals,backgroundColor:PALETTE,borderColor:'#0b0b14',borderWidth:2,hoverOffset:6}]},
    options:{cutout:'62%',plugins:{
      legend:{display:true,position:'right',labels:{color:'#a4a4bd',usePointStyle:true,pointStyle:'circle',padding:11,font:{size:11},boxWidth:8}},
      tooltip:{callbacks:{label:c=>{const t=vals.reduce((a,b)=>a+b,0)||1;return `${c.label}: ${c.parsed} films · ${Math.round(c.parsed/t*100)}%`;}}}}}
  });
}

function buildRatingChart(){
  const bands=['<5','5–6','6–7','7–7.5','7.5–8','8–8.5','8.5+'];
  const counts=Array(bands.length).fill(0);
  MOVIES.forEach(m=>{const r=m.vote_average||0;
    counts[r<5?0:r<6?1:r<7?2:r<7.5?3:r<8?4:r<8.5?5:6]++;});
  charts.rating?.destroy();
  charts.rating = new Chart(document.getElementById('ratingChart'),{
    type:'bar',
    data:{labels:bands,datasets:[{data:counts,
      backgroundColor:bands.map((_,i)=>hexA('#ff4d6d',.4+i*0.09)),borderRadius:6,borderSkipped:false}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>`${c.parsed.y} films`}}},
      scales:{x:axisCat({font:{size:11}}),y:{...axis(),beginAtZero:true,grace:'12%',ticks:{stepSize:1,color:'rgba(255,255,255,.62)'}}}}
  });
}

function buildYearChart(){
  const freq={};
  MOVIES.forEach(m=>{const y=fmt.year(m.release_date); if(y!=='—') freq[y]=(freq[y]||0)+1;});
  const years=Object.keys(freq).sort();
  const vals=years.map(y=>freq[y]);
  charts.year?.destroy();
  charts.year = new Chart(document.getElementById('yearChart'),{
    type:'bar',
    data:{labels:years,datasets:[{data:vals,backgroundColor:'#8b5cf6',borderRadius:6,borderSkipped:false,maxBarThickness:30}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>`${c.parsed.y} films`}}},
      scales:{x:axisCat({font:{size:11}}),y:{...axis(),beginAtZero:true,grace:'12%',ticks:{stepSize:1,color:'rgba(255,255,255,.62)'}}}}
  });
}

function buildGenreRatingChart(){
  const agg={};
  MOVIES.forEach(m=>{ if(!m.vote_average) return; const g=movieGenre(m);
    (agg[g]=agg[g]||[]).push(m.vote_average); });
  const rows=Object.entries(agg).map(([g,a])=>({g,avg:a.reduce((x,y)=>x+y,0)/a.length,n:a.length}))
    .filter(r=>r.n>=1).sort((a,b)=>b.avg-a.avg);
  charts.genreRating?.destroy();
  charts.genreRating = new Chart(document.getElementById('genreRatingChart'),{
    type:'bar',
    data:{labels:rows.map(r=>r.g),datasets:[{data:rows.map(r=>+r.avg.toFixed(2)),
      backgroundColor:(ctx)=>{const{chart}=ctx;const{ctx:c,chartArea}=chart;
        if(!chartArea) return '#ff4d6d'; const g=c.createLinearGradient(chartArea.left,0,chartArea.right,0);
        g.addColorStop(0,'#8b5cf6');g.addColorStop(1,'#ff4d6d');return g;},
      borderRadius:6,borderSkipped:false,maxBarThickness:22}]},
    options:{indexAxis:'y',
      plugins:{
        barValueLabel:{fmt:v=>'★ '+v.toFixed(1)},
        tooltip:{callbacks:{label:c=>`★ ${c.parsed.x} avg · ${rows[c.dataIndex].n} films`}}},
      scales:{x:{...axis(),beginAtZero:true,suggestedMax:10,grace:'4%'},y:axisCat()}}
  });
}

loadMovies();
