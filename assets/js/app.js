/* ============================================================
   CINESCOPE — SHARED CORE
   API access, constants, formatters, UI helpers, chart theming
   ============================================================ */

/* ---- CONSTANTS ---- */
const IMG = {
  poster: 'https://image.tmdb.org/t/p/w500',
  posterSm: 'https://image.tmdb.org/t/p/w342',
  backdrop: 'https://image.tmdb.org/t/p/w1280',
};

const TMDB_GENRES = {
  28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
  18:'Drama',14:'Fantasy',27:'Horror',9648:'Mystery',10749:'Romance',
  878:'Sci-Fi',53:'Thriller',37:'Western',99:'Documentary',10751:'Family',
  36:'History',10752:'War',10402:'Music',10770:'TV Movie'
};

const PALETTE = ['#ff4d6d','#22e3c4','#8b5cf6','#f5b733','#3b82f6','#ff8a5b','#41d98b','#e879f9','#38bdf8','#fb7185','#a3e635','#f97316'];

/* ---- FALLBACK GAME DATA (shown when RAWG_KEY is missing) ---- */
const MOCK_GAMES = [
  {name:"Elden Ring: Shadow of the Erdtree",rating:4.7,ratings_count:38420,metacritic:94,genres:[{name:'RPG'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}},{platform:{name:'Xbox Series S/X'}}],released:"2024-06-21",background_image:null,added:543000},
  {name:"Black Myth: Wukong",rating:4.5,ratings_count:43100,metacritic:81,genres:[{name:'Action'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}}],released:"2024-08-20",background_image:null,added:498000},
  {name:"Astro Bot",rating:4.6,ratings_count:22300,metacritic:94,genres:[{name:'Platformer'}],platforms:[{platform:{name:'PlayStation 5'}}],released:"2024-09-06",background_image:null,added:312000},
  {name:"Metaphor: ReFantazio",rating:4.65,ratings_count:11200,metacritic:94,genres:[{name:'RPG'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}},{platform:{name:'Xbox Series S/X'}}],released:"2024-10-11",background_image:null,added:290000},
  {name:"Helldivers 2",rating:4.35,ratings_count:55400,metacritic:82,genres:[{name:'Shooter'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}}],released:"2024-02-08",background_image:null,added:715000},
  {name:"Balatro",rating:4.6,ratings_count:12100,metacritic:90,genres:[{name:'Strategy'}],platforms:[{platform:{name:'PC'}},{platform:{name:'Nintendo Switch'}}],released:"2024-02-20",background_image:null,added:218000},
  {name:"Silent Hill 2",rating:4.4,ratings_count:16200,metacritic:86,genres:[{name:'Horror'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}}],released:"2024-10-08",background_image:null,added:267000},
  {name:"Dragon's Dogma 2",rating:4.25,ratings_count:18400,metacritic:86,genres:[{name:'RPG'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}},{platform:{name:'Xbox Series S/X'}}],released:"2024-03-22",background_image:null,added:321000},
  {name:"Indiana Jones and the Great Circle",rating:4.25,ratings_count:14100,metacritic:88,genres:[{name:'Adventure'}],platforms:[{platform:{name:'PC'}},{platform:{name:'Xbox Series S/X'}}],released:"2024-12-09",background_image:null,added:195000},
  {name:"EA Sports FC 25",rating:3.6,ratings_count:60200,metacritic:74,genres:[{name:'Sports'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}},{platform:{name:'Xbox Series S/X'}},{platform:{name:'Nintendo Switch'}}],released:"2024-09-27",background_image:null,added:890000},
  {name:"Call of Duty: Black Ops 6",rating:4.0,ratings_count:75100,metacritic:80,genres:[{name:'Shooter'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}},{platform:{name:'Xbox Series S/X'}}],released:"2024-10-25",background_image:null,added:1100000},
  {name:"Star Wars Outlaws",rating:3.9,ratings_count:21200,metacritic:76,genres:[{name:'Action'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}},{platform:{name:'Xbox Series S/X'}}],released:"2024-08-30",background_image:null,added:278000},
  {name:"Final Fantasy VII Rebirth",rating:4.5,ratings_count:19800,metacritic:92,genres:[{name:'RPG'}],platforms:[{platform:{name:'PlayStation 5'}}],released:"2024-02-29",background_image:null,added:305000},
  {name:"Stellar Blade",rating:4.2,ratings_count:13400,metacritic:81,genres:[{name:'Action'}],platforms:[{platform:{name:'PlayStation 5'}}],released:"2024-04-26",background_image:null,added:201000},
  {name:"Tekken 8",rating:4.3,ratings_count:17600,metacritic:90,genres:[{name:'Fighting'}],platforms:[{platform:{name:'PC'}},{platform:{name:'PlayStation 5'}},{platform:{name:'Xbox Series S/X'}}],released:"2024-01-26",background_image:null,added:189000},
];

/* ---- API (via Vercel serverless proxies) ---- */
async function fetchTMDB(path){
  const r = await fetch(`/api/tmdb?path=${encodeURIComponent(path)}`);
  if(!r.ok) throw new Error(`TMDB ${r.status}`);
  const data = await r.json();
  if(data && data.success === false) throw new Error(data.status_message || 'TMDB error');
  return data;
}
async function fetchRAWG(path){
  const r = await fetch(`/api/rawg?path=${encodeURIComponent(path)}`);
  if(!r.ok) throw new Error(`RAWG ${r.status}`);
  const data = await r.json();
  if(data && data.error) throw new Error(data.error);
  return data;
}

/* fetch several TMDB pages and flatten (dedup by id) */
async function fetchTMDBPages(base, pages=2){
  const reqs = [];
  for(let p=1;p<=pages;p++){
    const sep = base.includes('?') ? '&' : '?';
    reqs.push(fetchTMDB(`${base}${sep}page=${p}`).then(d=>d.results||[]).catch(()=>[]));
  }
  const all = (await Promise.all(reqs)).flat();
  const seen = new Set();
  return all.filter(m=>{ if(seen.has(m.id)) return false; seen.add(m.id); return true; });
}

/* ---- FORMATTERS ---- */
const fmt = {
  compact(n){
    n = +n || 0;
    if(n >= 1e9) return (n/1e9).toFixed(1).replace(/\.0$/,'')+'B';
    if(n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M';
    if(n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K';
    return Math.round(n).toString();
  },
  year(d){ return d ? String(d).slice(0,4) : '—'; },
  rating(r){ return r ? (+r).toFixed(1) : '—'; },
};

const movieGenre = m => (m.genre_ids && m.genre_ids.length) ? (TMDB_GENRES[m.genre_ids[0]] || 'Other') : 'Other';
const gameGenre  = g => (g.genres && g.genres.length) ? g.genres[0].name : 'Other';
/* RAWG ratings are 0–5; normalize to 0–10 for cross-comparison */
const gameRating10 = g => (g.rating ? g.rating * 2 : 0);

/* ---- DOM HELPERS ---- */
const $  = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

function skeletons(n){
  return Array.from({length:n}, () =>
    `<div class="skel"><div class="skel-img"></div><div class="skel-body"><div class="skel-line"></div><div class="skel-line short"></div></div></div>`
  ).join('');
}
function showBanner(id, msg){
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
}
function debounce(fn, ms=200){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
}
function countUp(el, target, opts={}){
  if(!el) return;
  const dur = opts.dur || 900, dec = opts.dec || 0, suffix = opts.suffix || '';
  const start = performance.now();
  function step(now){
    const p = Math.min((now-start)/dur, 1);
    const eased = 1 - Math.pow(1-p, 3);
    el.textContent = (target*eased).toFixed(dec) + suffix;
    if(p<1) requestAnimationFrame(step);
    else el.textContent = (+target).toFixed(dec) + suffix;
  }
  requestAnimationFrame(step);
}

/* ---- MEDIA CARDS ---- */
function movieCard(m, idx){
  const poster = m.poster_path
    ? `<img src="${IMG.poster}${m.poster_path}" alt="${m.title}" loading="lazy">`
    : `<div class="poster-fallback">🎬</div>`;
  return `
  <article class="card m" data-genre="${movieGenre(m)}">
    <div class="card-poster">
      ${poster}<div class="card-grad"></div>
      <div class="card-rank">${idx+1}</div>
      ${idx<3 ? '<div class="card-hot">Hot</div>' : ''}
      <div class="card-score">★ ${fmt.rating(m.vote_average)}</div>
    </div>
    <div class="card-body">
      <div class="card-title">${m.title}</div>
      <div class="card-meta">
        <span class="pill pill-m">${movieGenre(m)}</span>
        <span>${fmt.year(m.release_date)}</span>
      </div>
    </div>
  </article>`;
}
function gameCard(g, idx){
  const poster = g.background_image
    ? `<img src="${g.background_image}" alt="${g.name}" loading="lazy">`
    : `<div class="poster-fallback">🎮</div>`;
  return `
  <article class="card g" data-genre="${gameGenre(g)}">
    <div class="card-poster">
      ${poster}<div class="card-grad"></div>
      <div class="card-rank">${idx+1}</div>
      ${idx<3 ? '<div class="card-hot">Hot</div>' : ''}
      <div class="card-score">★ ${fmt.rating(gameRating10(g))}</div>
    </div>
    <div class="card-body">
      <div class="card-title">${g.name}</div>
      <div class="card-meta">
        <span class="pill pill-g">${gameGenre(g)}</span>
        <span>${fmt.year(g.released)}</span>
      </div>
    </div>
  </article>`;
}

/* ---- CHART.JS GLOBAL THEME ---- */
function initChartTheme(){
  if(typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'Inter',sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#a4a4bd';
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(12,12,21,.97)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.12)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#f5f5fc';
  Chart.defaults.plugins.tooltip.titleFont = {weight:'600',size:12.5};
  Chart.defaults.plugins.tooltip.bodyColor = '#a4a4bd';
  Chart.defaults.plugins.tooltip.bodyFont = {size:12};
  Chart.defaults.plugins.tooltip.padding = 13;
  Chart.defaults.plugins.tooltip.cornerRadius = 11;
  Chart.defaults.plugins.tooltip.displayColors = false;
  Chart.defaults.maintainAspectRatio = false;
  Chart.register(barValueLabel);
}

/* draws the value of each bar directly on it — easier to read at a glance.
   opt-out per chart with options.plugins.barValueLabel = false;
   format with options.plugins.barValueLabel = { fmt: v => ... } */
const barValueLabel = {
  id:'barValueLabel',
  afterDatasetsDraw(chart, _args, opts){
    if(opts === false) return;
    const fmtFn = (opts && opts.fmt) || (v => v);
    const horizontal = chart.options.indexAxis === 'y';
    const {ctx} = chart;
    chart.data.datasets.forEach((ds, di)=>{
      const meta = chart.getDatasetMeta(di);
      if(meta.type !== 'bar' || meta.hidden) return;
      meta.data.forEach((bar, i)=>{
        const v = ds.data[i];
        if(v == null || v === 0) return;
        ctx.save();
        ctx.fillStyle = '#f5f5fc';
        ctx.font = "600 11px 'Inter',sans-serif";
        if(horizontal){
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(fmtFn(v), bar.x + 8, bar.y);
        } else {
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(fmtFn(v), bar.x, bar.y - 6);
        }
        ctx.restore();
      });
    });
  }
};

const GRID = 'rgba(255,255,255,.045)';
/* clean axis: horizontal gridlines only, brighter ticks, no axis border */
const axis = (extra={}) => ({
  grid:{color:GRID,drawBorder:false},
  border:{display:false},
  ticks:{color:'rgba(255,255,255,.62)',...extra}
});
/* category axis with no gridlines — for the bar baseline side */
const axisCat = (extra={}) => ({
  grid:{display:false,drawBorder:false},
  border:{display:false},
  ticks:{color:'rgba(255,255,255,.62)',...extra}
});
/* gradient fill helper for a canvas ctx */
function vGradient(ctx, area, hex, a1=.45, a2=0){
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, hexA(hex,a1));
  g.addColorStop(1, hexA(hex,a2));
  return g;
}
function hexA(hex, a){
  const n = parseInt(hex.slice(1),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

/* ---- NAV (scroll state + mobile toggle + active link) ---- */
function initNav(){
  const nav = document.getElementById('nav');
  if(!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  const toggle = nav.querySelector('.menu-toggle');
  if(toggle) toggle.addEventListener('click', () => nav.classList.toggle('open'));

  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a', nav).forEach(a=>{
    const href = a.getAttribute('href');
    if(href === here || (here === '' && href === 'index.html')) a.classList.add('active');
  });
}

/* ---- SCROLL REVEAL ---- */
function initReveal(){
  const els = $$('.reveal');
  if(!els.length || !('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:.12});
  els.forEach(e=>io.observe(e));
}

document.addEventListener('DOMContentLoaded', ()=>{ initNav(); initReveal(); initChartTheme(); });
