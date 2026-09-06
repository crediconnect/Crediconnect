
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const menu=$('.menu'), links=$('.nav-links');
if(menu)menu.onclick=()=>{links.classList.toggle('open');menu.setAttribute('aria-expanded',links.classList.contains('open'))};
$$('.nav-links a').forEach(a=>a.onclick=()=>links?.classList.remove('open'));
const observer=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('show')),{threshold:.12});$$('.reveal').forEach(x=>observer.observe(x));
// Tabs
$$('.tabs').forEach(tabs=>{const buttons=$$('.tab',tabs), panels=$$('.tab-panel',tabs.parentElement);const activate=k=>{buttons.forEach(b=>b.classList.toggle('active',b.dataset.tab===k));panels.forEach(p=>p.hidden=p.dataset.panel!==k)};buttons.forEach(b=>b.onclick=()=>activate(b.dataset.tab));if(buttons[0])activate(buttons[0].dataset.tab)});
// Call flow
const steps=$$('.step'), next=$('#nextStep'), progress=$('#stepProgress');let current=0;function flow(i){if(!steps.length)return;current=(i+steps.length)%steps.length;steps.forEach((s,j)=>s.classList.toggle('active',j===current));if(progress)progress.textContent=`Step ${current+1} of ${steps.length}`}steps.forEach((s,i)=>s.onclick=()=>flow(i));if(next)next.onclick=()=>flow(current+1);flow(0);
// KPI bars
function animateKpiBars(){const kpi=$('.kpi-bars');if(!kpi)return;new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){$$('[data-width]',kpi).forEach(b=>b.style.width=b.dataset.width+'%')}}),{threshold:.25}).observe(kpi)}
animateKpiBars();
// Comparison
const cmp=$('#compareSelect');if(cmp){const data={traditional:['General agents','Transaction-focused','Standard support','Script-heavy','Basic training'],bpo:['Broad service agents','Mixed-domain support','General privacy controls','Process-driven assistance','Role-specific training']};const render=()=>$$('tbody tr', $('#compareTable')).forEach((r,i)=>r.cells[1].textContent=data[cmp.value][i]);cmp.onchange=render;render()}
// Accordion
$$('.acc button').forEach(b=>b.onclick=()=>b.closest('.acc').classList.toggle('open'));
// Fires a free instant notification to Telegram via notify-telegram.js.
// Fire-and-forget: if Telegram isn't configured (missing bot token/chat ID)
// or the request fails, we silently ignore it — the form submission itself
// already succeeded, so a missing alert should never surface as an error.
function notifyTelegram(data){
  try{fetch('/.netlify/functions/notify-telegram',{method:'POST',body:JSON.stringify(data)}).catch(()=>{})}catch{}
}
// Contact validation
const form=$('#contactForm');if(form){
  const msg=$('#formMessage');
  const fields=$$('input,textarea',form).filter(f=>f.name!=='bot-field'&&f.name!=='form-name');
  const valid=f=>{const ok=f.checkValidity();f.closest('.field').classList.toggle('valid',ok);f.closest('.field').classList.toggle('invalid',!ok);return ok};
  fields.forEach(f=>['input','blur'].forEach(ev=>f.addEventListener(ev,()=>valid(f))));
  const submitBtn=$('button[type=submit]',form);
  let submitting=false; // guards against double-submits from a fast double-click, independent of button disabled state
  form.onsubmit=e=>{
    e.preventDefault();
    if(submitting)return;
    const ok=fields.every(valid);
    if(!ok){msg.textContent='Please check the highlighted fields.';msg.className='status error';return}
    submitting=true;
    if(submitBtn)submitBtn.disabled=true;
    msg.textContent='Sending...';msg.className='status';msg.setAttribute('aria-live','polite');
    const fd=new FormData(form);
    const smsPayload={type:'contact',name:fd.get('name'),email:fd.get('email'),company:fd.get('company')};
    fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fd).toString()})
      .then(res=>{
        // Netlify Forms returns a redirect/200 on success; anything else (4xx/5xx)
        // means the submission was rejected, so don't tell the visitor it worked.
        if(!res.ok)throw new Error('submission rejected');
        msg.textContent='Thank you. Your inquiry has been sent to the CrediConnect team.';
        msg.className='status success';
        notifyTelegram(smsPayload);
        form.reset();
        fields.forEach(f=>f.closest('.field').classList.remove('valid','invalid'));
      })
      .catch(()=>{
        msg.textContent='Something went wrong sending your message. Please try again or email us directly.';
        msg.className='status error';
      })
      .finally(()=>{submitting=false;if(submitBtn)submitBtn.disabled=false});
  };
}

// Careers apply buttons — prefill role and scroll to form
function wireApplyButtons(){
  $$('.apply-btn').forEach(btn=>btn.onclick=()=>{
    const sel=$('#positionSelect');
    if(sel)sel.value=btn.dataset.role;
    $('#apply')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>$('#careersForm input[name=name]')?.focus(),400);
  });
}
wireApplyButtons();
// Careers application form (file upload uses multipart FormData, not urlencoded)
const careersForm=$('#careersForm');
if(careersForm){
  const cMsg=$('#careersFormMessage');
  const cFields=$$('input,textarea,select',careersForm).filter(f=>f.name!=='bot-field'&&f.name!=='form-name');
  const cValid=f=>{const ok=f.checkValidity();f.closest('.field').classList.toggle('valid',ok);f.closest('.field').classList.toggle('invalid',!ok);return ok};
  cFields.forEach(f=>['input','blur','change'].forEach(ev=>f.addEventListener(ev,()=>cValid(f))));
  const cSubmitBtn=$('button[type=submit]',careersForm);
  let cSubmitting=false;
  careersForm.onsubmit=e=>{
    e.preventDefault();
    if(cSubmitting)return;
    const ok=cFields.every(cValid);
    if(!ok){cMsg.textContent='Please check the highlighted fields.';cMsg.className='status error';return}
    cSubmitting=true;
    if(cSubmitBtn)cSubmitBtn.disabled=true;
    cMsg.textContent='Submitting...';cMsg.className='status';cMsg.setAttribute('aria-live','polite');
    const cfd=new FormData(careersForm);
    const smsPayload={type:'careers',name:cfd.get('name'),email:cfd.get('email'),position:cfd.get('position')};
    fetch('/',{method:'POST',body:cfd})
      .then(res=>{
        if(!res.ok)throw new Error('submission rejected');
        cMsg.textContent='Thank you. Your application has been sent to the CrediConnect HR team.';
        cMsg.className='status success';
        notifyTelegram(smsPayload);
        careersForm.reset();
        cFields.forEach(f=>f.closest('.field').classList.remove('valid','invalid'));
      })
      .catch(()=>{
        cMsg.textContent='Something went wrong submitting your application. Please try again or email us directly.';
        cMsg.className='status error';
      })
      .finally(()=>{cSubmitting=false;if(cSubmitBtn)cSubmitBtn.disabled=false});
  };
}

// Leadership directory
function wireLeaderCards(){
  const leaderCards=$$('.leader-card'), teamDetail=$('#teamDetail');
  if(!teamDetail||!leaderCards.length)return;
  const selectLeader=card=>{
    leaderCards.forEach(c=>c.classList.remove('active'));
    card.classList.add('active');
    teamDetail.innerHTML=`<strong>${card.dataset.name}</strong><small>${card.dataset.role}</small><p>${card.dataset.short}</p>`;
  };
  leaderCards.forEach(card=>{card.addEventListener('click',()=>selectLeader(card));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectLeader(card)}})});
}
wireLeaderCards();

// ---- Dynamic content from the CrediConnect backend (Netlify Functions + Blobs) ----
// Every fetch below is optional progressive enhancement: if it fails (e.g. running
// the raw HTML files locally without Netlify, or the function isn't deployed yet),
// the static content already in the HTML stays exactly as-is.
const api=p=>`/.netlify/functions/${p}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Leadership roster (about.html)
const leadershipGrid=$('#leadershipGrid');
if(leadershipGrid){
  fetch(api('leadership')).then(r=>r.ok?r.json():Promise.reject()).then(list=>{
    if(!Array.isArray(list)||!list.length)return;
    leadershipGrid.innerHTML=list.map(l=>`<button class="leader-card" type="button" data-name="${esc(l.name)}" data-role="${esc(l.role)}" data-short="${esc(l.short)}"><span class="leader-initial">${esc(l.initials)}</span><span class="leader-name">${esc(l.name)}</span><span class="leader-role">${esc(l.role)}</span></button>`).join('');
    wireLeaderCards();
  }).catch(()=>{});
}

// KPI dashboard (about.html)
const kpiStats=$('#kpiStats'), kpiBarsWrap=$('#kpiBars');
if(kpiBarsWrap){
  fetch(api('kpis')).then(r=>r.ok?r.json():Promise.reject()).then(list=>{
    if(!Array.isArray(list)||!list.length)return;
    const stats=list.filter(k=>k.kind==='stat'), bars=list.filter(k=>k.kind!=='stat');
    if(kpiStats&&stats.length)kpiStats.innerHTML=stats.map(s=>`<div class="stat reveal show"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('');
    kpiBarsWrap.innerHTML=bars.map((b,i)=>`<div class="card"${i?' style="margin-top:12px"':''}><div style="display:flex;justify-content:space-between"><b>${esc(b.label)}</b><b>${esc(b.value)}</b></div><div style="height:8px;background:var(--mist);border-radius:99px;margin-top:12px;overflow:hidden"><div data-width="${esc(b.width)}" style="height:100%;background:var(--blue);width:0;transition:1.2s"></div></div></div>`).join('')+'<p class="note">Latest month vs. target, tracked across a 12-month rolling window.</p>';
    animateKpiBars();
  }).catch(()=>{});
}

// Open roles (careers.html)
const jobsGrid=$('.jobs');
if(jobsGrid){
  fetch(api('jobs')).then(r=>r.ok?r.json():Promise.reject()).then(list=>{
    if(!Array.isArray(list)||!list.length)return;
    jobsGrid.innerHTML=list.map(j=>`<div class="job"><h3>${esc(j.title)}</h3><p>${esc(j.description)}</p><button type="button" class="btn apply-btn" style="background:#fff;color:var(--navy)" data-role="${esc(j.title)}">Apply now</button></div>`).join('');
    wireApplyButtons();
    const sel=$('#positionSelect');
    if(sel)sel.innerHTML='<option value="" disabled selected>Select a role</option>'+list.map(j=>`<option>${esc(j.title)}</option>`).join('')+'<option>Other</option>';
  }).catch(()=>{});
}

// ---- Monthly KPI trend charts (about.html) ----
// Lightweight inline SVG charts — no external chart library needed for
// three small trend visuals fed by kpi-monthly.js / the admin panel.
const CHART_COLORS=['#2451d1','#dca34a','#17233a','#5ba3d0','#8a7fd6','#4caf7d'];

function svgLineChart(width,height,seriesList,labels,opts={}){
  const pad={l:38,r:12,t:14,b:22};
  const w=width-pad.l-pad.r, h=height-pad.t-pad.b;
  const allVals=seriesList.flatMap(s=>s.values);
  const min=opts.min??Math.min(...allVals), max=opts.max??Math.max(...allVals);
  const range=(max-min)||1;
  const x=i=>pad.l+(labels.length>1?(i/(labels.length-1))*w:w/2);
  const y=v=>pad.t+h-((v-min)/range)*h;
  const gridLines=[0,.25,.5,.75,1].map(t=>{
    const yy=pad.t+h-t*h, val=min+t*range;
    return `<line x1="${pad.l}" x2="${width-pad.r}" y1="${yy}" y2="${yy}" stroke="#e3e9f2" stroke-width="1"/><text x="${pad.l-6}" y="${yy+3}" font-size="9" fill="#8592a8" text-anchor="end">${opts.yFormat?opts.yFormat(val):Math.round(val)}</text>`;
  }).join('');
  const xLabels=labels.map((l,i)=>`<text x="${x(i)}" y="${height-4}" font-size="9" fill="#8592a8" text-anchor="middle">${esc(String(l)).slice(0,3)}</text>`).join('');
  const lines=seriesList.map(s=>{
    const pts=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" role="img" aria-label="Line chart">${gridLines}${lines}${xLabels}</svg>`;
}

function svgBarChart(width,height,values,labels,opts={}){
  const pad={l:32,r:10,t:14,b:22};
  const w=width-pad.l-pad.r, h=height-pad.t-pad.b;
  const max=opts.max??Math.max(...values), min=opts.min??0;
  const range=(max-min)||1;
  const gap=w/values.length, bw=gap*0.6;
  const bars=values.map((v,i)=>{
    const bh=((v-min)/range)*h;
    const bx=pad.l+i*gap+(gap-bw)/2;
    const by=pad.t+h-bh;
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${Math.max(bh,0)}" rx="2" fill="${opts.color||'#2451d1'}"/>`;
  }).join('');
  const xLabels=labels.map((l,i)=>`<text x="${pad.l+i*gap+gap/2}" y="${height-4}" font-size="9" fill="#8592a8" text-anchor="middle">${esc(String(l)).slice(0,3)}</text>`).join('');
  const gridBase=`<line x1="${pad.l}" x2="${width-pad.r}" y1="${pad.t+h}" y2="${pad.t+h}" stroke="#e3e9f2" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" role="img" aria-label="Bar chart">${gridBase}${bars}${xLabels}</svg>`;
}

function renderKpiTrendCharts(list){
  const labels=list.map(m=>m.month);
  const pctMetrics=[
    {key:'csat',label:'CSAT',color:CHART_COLORS[0]},
    {key:'fcr',label:'FCR',color:CHART_COLORS[1]},
    {key:'attendance',label:'Attendance',color:CHART_COLORS[2]},
    {key:'qa',label:'QA Score',color:CHART_COLORS[3]},
    {key:'callRes',label:'Call Resolution',color:CHART_COLORS[4]},
    {key:'productivity',label:'Productivity',color:CHART_COLORS[5]},
  ];
  const pctSeries=pctMetrics.map(m=>({...m,values:list.map(row=>Number(row[m.key])||0)}));
  const legend=pctMetrics.map(m=>`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:12px;color:var(--muted)"><span style="width:10px;height:10px;border-radius:3px;background:${m.color};display:inline-block"></span>${esc(m.label)}</span>`).join('');
  const pctChart=$('#kpiPctChart'), pctLegend=$('#kpiPctLegend'), ahtChart=$('#kpiAhtChart'), npsChart=$('#kpiNpsChart');
  if(pctChart)pctChart.innerHTML=svgLineChart(760,220,pctSeries,labels,{min:60,max:100,yFormat:v=>Math.round(v)+'%'});
  if(pctLegend)pctLegend.innerHTML=legend;
  if(ahtChart)ahtChart.innerHTML=svgLineChart(760,150,[{values:list.map(row=>Number(row.aht)||0),color:CHART_COLORS[0]}],labels,{yFormat:v=>v+'m'});
  if(npsChart)npsChart.innerHTML=svgBarChart(760,150,list.map(row=>Number(row.nps)||0),labels,{max:100,color:CHART_COLORS[1]});
}

const kpiTrendWrap=$('#kpiTrendCharts');
if(kpiTrendWrap){
  fetch(api('kpi-monthly')).then(r=>r.ok?r.json():Promise.reject()).then(list=>{
    if(!Array.isArray(list)||!list.length)return;
    renderKpiTrendCharts(list);
  }).catch(()=>{});
}
