
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
const form=$('#contactForm');if(form){const msg=$('#formMessage');const fields=$$('input,textarea',form).filter(f=>f.name!=='bot-field'&&f.name!=='form-name');const valid=f=>{const ok=f.checkValidity();f.closest('.field').classList.toggle('valid',ok);f.closest('.field').classList.toggle('invalid',!ok);return ok};fields.forEach(f=>['input','blur'].forEach(ev=>f.addEventListener(ev,()=>valid(f))));const submitBtn=$('button[type=submit]',form);form.onsubmit=e=>{e.preventDefault();const ok=fields.every(valid);if(!ok){msg.textContent='Please check the highlighted fields.';msg.className='status error';return}if(submitBtn)submitBtn.disabled=true;msg.textContent='Sending...';msg.className='status';const fd=new FormData(form);const smsPayload={type:'contact',name:fd.get('name'),email:fd.get('email'),company:fd.get('company')};fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fd).toString()}).then(()=>{msg.textContent='Thank you. Your inquiry has been sent to the CrediConnect team.';msg.className='status success';notifyTelegram(smsPayload);form.reset();fields.forEach(f=>f.closest('.field').classList.remove('valid','invalid'))}).catch(()=>{msg.textContent='Something went wrong sending your message. Please try again or email us directly.';msg.className='status error'}).finally(()=>{if(submitBtn)submitBtn.disabled=false})}}

// ---- Email OTP verification gate (contact + careers forms) ----
// Each form gets: a "Verify email" button that emails a 6-digit code, a code
// field to confirm it, and the submit button stays disabled until that
// succeeds. If email sending isn't configured on this deploy (no
// RESEND_API_KEY/RESEND_FROM set in Netlify), the gate quietly steps aside
// and the form behaves as it did before — this is progressive enhancement,
// not a hard requirement to submit.
function setupOtpGate(prefix, purpose, formId){
  const form=$('#'+formId);
  if(!form)return;
  const emailInput=$('#'+prefix+'Email');
  const gate=$('#'+prefix+'OtpGate');
  const sendBtn=$('#'+prefix+'SendOtp');
  const codeRow=$('#'+prefix+'OtpCodeRow');
  const codeInput=$('#'+prefix+'OtpCode');
  const confirmBtn=$('#'+prefix+'ConfirmOtp');
  const msg=$('#'+prefix+'OtpMsg');
  const tokenField=$('#'+prefix+'VerifiedToken');
  const submitBtn=$('button[type=submit]',form);
  if(!emailInput||!sendBtn||!confirmBtn||!submitBtn)return;

  let verifiedEmail='';
  submitBtn.disabled=true;
  submitBtn.title='Verify your email above before submitting.';

  function lockSubmit(){
    submitBtn.disabled=true;
    submitBtn.title='Verify your email above before submitting.';
    tokenField.value='';
  }
  function unlockSubmit(){
    submitBtn.disabled=false;
    submitBtn.title='';
  }
  function skipGate(){
    // Email verification isn't configured on this deploy — don't block the form.
    gate.style.display='none';
    codeRow.hidden=true;
    unlockSubmit();
  }

  emailInput.addEventListener('input',()=>{
    if(emailInput.value.trim().toLowerCase()!==verifiedEmail)lockSubmit();
  });

  sendBtn.onclick=async()=>{
    const email=emailInput.value.trim();
    if(!email||!emailInput.checkValidity()){
      emailInput.reportValidity?.();
      return;
    }
    sendBtn.disabled=true;
    const original=sendBtn.textContent;
    sendBtn.textContent='Sending...';
    try{
      const res=await fetch(api('send-otp'),{method:'POST',body:JSON.stringify({purpose,email})});
      const data=await res.json().catch(()=>({}));
      if(res.status===500||res.status===502){
        // Not configured on this deploy, or the email provider is unreachable —
        // fail open so a class-project deploy without an email service still works.
        skipGate();
        return;
      }
      if(!res.ok){
        msg.textContent=data.error||'Could not send the code.';
        msg.className='otp-hint';
        return;
      }
      codeRow.hidden=false;
      codeInput.value='';
      codeInput.focus();
      msg.textContent=`Code sent to ${data.sentTo||'your email'}.`;
      msg.className='otp-hint';
    }catch{
      skipGate();
    }finally{
      sendBtn.disabled=false;
      sendBtn.textContent=original;
    }
  };

  confirmBtn.onclick=async()=>{
    const email=emailInput.value.trim();
    const code=codeInput.value.trim();
    if(!/^\d{6}$/.test(code)){
      msg.textContent='Enter the 6-digit code.';
      msg.className='otp-hint error';
      return;
    }
    confirmBtn.disabled=true;
    try{
      const res=await fetch(api('verify-otp'),{method:'POST',body:JSON.stringify({purpose,email,code})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){
        msg.textContent=data.error||'That code is incorrect or has expired.';
        msg.className='otp-hint error';
        return;
      }
      verifiedEmail=email.toLowerCase();
      tokenField.value=data.token||'';
      codeRow.hidden=true;
      gate.innerHTML='<span class="otp-verified">✓ Email verified</span>';
      unlockSubmit();
    }catch{
      msg.textContent='Could not reach the server.';
      msg.className='otp-hint error';
    }finally{
      confirmBtn.disabled=false;
    }
  };

  codeInput?.addEventListener('keydown',e=>{if(e.key==='Enter')confirmBtn.click()});
}
setupOtpGate('contact','contact','contactForm');
setupOtpGate('careers','careers','careersForm');

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
  careersForm.onsubmit=e=>{
    e.preventDefault();
    const ok=cFields.every(cValid);
    if(!ok){cMsg.textContent='Please check the highlighted fields.';cMsg.className='status error';return}
    if(cSubmitBtn)cSubmitBtn.disabled=true;
    cMsg.textContent='Submitting...';cMsg.className='status';
    const cfd=new FormData(careersForm);
    const smsPayload={type:'careers',name:cfd.get('name'),email:cfd.get('email'),position:cfd.get('position')};
    fetch('/',{method:'POST',body:cfd})
      .then(()=>{
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
      .finally(()=>{if(cSubmitBtn)cSubmitBtn.disabled=false});
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
