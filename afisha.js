const AFISHA_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-afisha-api';
const SUPABASE_REST='https://nmeoakrpafxhpdrplsuo.supabase.co/rest/v1';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_44_6dVen8Hq25CDywZKLwA_8PWV4-24';
const PENDING_AFISHA_KEY='vmeste_pending_afisha_action_v1';
const AFISHA_ONBOARDING_DISMISSED_KEY='lya_afisha_onboarding_dismissed_v1';
let afishaEvents=[];
let afishaLiked=new Set();
let afishaCompared=new Set();
let afishaProfile=null;
let afishaFilter='for-me';
let afishaDateFilter=null;
let afishaCity='Ростов-на-Дону';
const afishaActionLocks=new Set();

const AFISHA_CATEGORIES={cinema:'Кино',music:'Музыка',theatre:'Театр',humor:'Юмор',exhibition:'Выставки',fair:'Ярмарки',kids:'С детьми',walks:'Прогулки',food:'Еда',sport:'Спорт'};
const AFISHA_TIMES={weekdays:'Будни',weekends:'Выходные',day:'Днём',evening:'Вечером'};
function afEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]))}
function afDate(v){return new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}
function afDay(v){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}
function afMonth(v){return new Intl.DateTimeFormat('ru-RU',{month:'short',timeZone:'Europe/Moscow'}).format(new Date(v)).replace('.','').toUpperCase()}
function afDateKey(v){const p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(new Date(v));const g=t=>p.find(x=>x.type===t)?.value;return `${g('year')}-${g('month')}-${g('day')}`}
function afTodayKey(){return afDateKey(new Date())}
function afEndOfWeek(){const d=new Date();d.setDate(d.getDate()+7);return d}
function afNextDateKey(key){const [y,m,d]=String(key).split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d+1,12));return x.getUTCFullYear()+'-'+String(x.getUTCMonth()+1).padStart(2,'0')+'-'+String(x.getUTCDate()).padStart(2,'0')}
function afDateTitleFromKey(key){try{return new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(key+'T12:00:00Z')).replace(/^./,c=>c.toUpperCase())}catch{return key}}
function afToast(text){const old=document.querySelector('.afishaToast');if(old)old.remove();const el=document.createElement('div');el.className='afishaToast';el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),2200)}
function afTimeout(ms=6500){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('Сервис Афиши отвечает слишком долго')),ms))}

async function afRaw(action,payload={},needsAuth=false,retry=true){
  const headers={'Content-Type':'application/json'};
  if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
  const r=await Promise.race([
    fetch(AFISHA_API,{method:'POST',headers,body:JSON.stringify({action,...payload})}),
    afTimeout()
  ]);
  let data={};try{data=await r.json()}catch{data={error:'Некорректный ответ сервера'}}
  if(r.status===401&&needsAuth&&retry&&await refreshSession())return afRaw(action,payload,needsAuth,false);
  if(!r.ok)throw new Error(data.error||'Ошибка запроса');
  return data;
}

async function loadPublicAfishaFeed(city,dateFilter=null){
  const select='id,city,title,description,category,starts_at,ends_at,timezone,venue,source_name,source_url,cover_url,price_text,is_free';
  const start=dateFilter?new Date(dateFilter+'T00:00:00+03:00').toISOString():new Date().toISOString();
  const qs=new URLSearchParams({select,city:`eq.${city}`,published:'eq.true',starts_at:`gte.${start}`,order:'starts_at.asc',limit:dateFilter?'120':'60'});
  if(dateFilter)qs.set('starts_at',`gte.${start}`),qs.append('starts_at',`lt.${new Date(afNextDateKey(dateFilter)+'T00:00:00+03:00').toISOString()}`);
  const response=await Promise.race([
    fetch(`${SUPABASE_REST}/afisha_events?${qs.toString()}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}}),
    afTimeout(6500)
  ]);
  if(!response.ok)throw new Error('Не удалось загрузить Афишу');
  const events=await response.json();
  return {city,events:Array.isArray(events)?events:[],profile:account?{city,interests:[],preferred_times:[]}:null,liked:[],compared:[]};
}

function filteredAfisha(){
  let items=[...afishaEvents];
  if(afishaDateFilter)items=items.filter(e=>afDateKey(e.starts_at)===afishaDateFilter);
  if(afishaFilter==='today')items=items.filter(e=>afDateKey(e.starts_at)===afTodayKey());
  if(afishaFilter==='week'){const end=afEndOfWeek();items=items.filter(e=>new Date(e.starts_at)<=end)}
  if(afishaFilter==='free')items=items.filter(e=>e.is_free);
  return items;
}

function onboardingHtml(){
  if(!account||afishaProfile?.city||localStorage.getItem(AFISHA_ONBOARDING_DISMISSED_KEY)==='1')return '';
  const interests=afishaProfile?.interests||[];const times=afishaProfile?.preferred_times||[];
  return `<section class="onboardingCard" id="afisha-onboarding"><button class="onboardingClose" id="close-afisha-onboarding" type="button" aria-label="Закрыть">×</button><span class="ey">НАСТРОИМ ЛЕНТУ</span><h2>Что вам интересно?</h2><p>Три коротких выбора — и «ЛЯ» начнёт поднимать подходящие события выше. В тестовой версии Афиша работает для Ростова-на-Дону.</p><div class="onboardingGroup"><small>ГОРОД</small><select class="onboardingCity" id="afisha-city"><option value="Ростов-на-Дону">Ростов-на-Дону</option></select></div><div class="onboardingGroup"><small>ИНТЕРЕСЫ</small><div class="onboardingChips" id="interest-chips">${Object.entries(AFISHA_CATEGORIES).map(([k,v])=>`<button type="button" data-value="${k}" class="${interests.includes(k)?'active':''}">${v}</button>`).join('')}</div></div><div class="onboardingGroup"><small>КОГДА УДОБНО</small><div class="onboardingChips" id="time-chips">${Object.entries(AFISHA_TIMES).map(([k,v])=>`<button type="button" data-value="${k}" class="${times.includes(k)?'active':''}">${v}</button>`).join('')}</div></div><button class="primary onboardingSave" id="save-afisha-prefs">Показать мои события</button></section>`;
}

function afishaCard(e){
  const cover=e.cover_url?afEsc(e.cover_url):'';
  const coverStyle=cover?` style="background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.48)),url('${cover}')"`:'';
  if(e.source_type==='lya'){
    const mine=e.is_mine?'<span class="afishaLyaMine">МОЁ</span>':'';
    const desc=e.description?`<p>${afEsc(e.description)}</p>`:`<p>Организатор · ${afEsc(e.creator_name||'Участник ЛЯ')}</p>`;
    return `<article class="afishaCard afishaLyaCard" data-lya-event-id="${afEsc(e.event_id||e.id)}"><div class="afishaVisual lya${cover?' hasCover':''}"${coverStyle} data-lya-cover-key="${afEsc(e.event_id||e.id)}" data-lya-cover-title="${afEsc(e.title)}"><span class="afishaCategory">СОБЫТИЕ ЛЯ</span>${mine}<div class="afishaDateArt">${afDay(e.starts_at)}<span>${afMonth(e.starts_at)} · ${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(e.starts_at))}</span></div></div><div class="afishaBody"><h2>${afEsc(e.title)}</h2>${desc}<div class="afishaFacts"><span>${afEsc(e.venue||'Место уточняется')}</span><span>${afEsc(e.is_free?'Бесплатно':e.price_text||'Цена у организатора')}</span></div><div class="afishaActions afishaLyaActions"><button class="openLyaEvent" data-id="${afEsc(e.event_id||e.id)}">${e.is_mine?'Открыть моё событие':'Посмотреть событие'}</button></div><div class="afishaSource afishaLyaSource">Организатор: ${afEsc(e.creator_name||'Участник ЛЯ')}</div></div></article>`;
  }
  const liked=afishaLiked.has(e.id),compared=afishaCompared.has(e.id);const category=AFISHA_CATEGORIES[e.category]||'Событие';
  return `<article class="afishaCard" data-afisha-id="${afEsc(e.id)}"><div class="afishaVisual ${afEsc(e.category)}${cover?' hasCover':''}"${coverStyle}><span class="afishaCategory">${afEsc(category)}</span><div class="afishaDateArt">${afDay(e.starts_at)}<span>${afMonth(e.starts_at)} · ${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(e.starts_at))}</span></div></div><div class="afishaBody"><h2>${afEsc(e.title)}</h2>${e.description?`<p>${afEsc(e.description)}</p>`:''}<div class="afishaFacts"><span>${afEsc(e.venue||'Место уточняется')}</span><span>${afEsc(e.is_free?'Бесплатно':e.price_text||'Цена у организатора')}</span></div><div class="afishaActions"><button class="af-like ${liked?'active':''}" data-id="${afEsc(e.id)}">${liked?'♥':'♡'} Нравится</button><button class="af-compare ${compared?'active':''}" data-id="${afEsc(e.id)}">⇄ ${compared?'Выбрано':'Сравнить'}</button><button class="collectCompany" data-id="${afEsc(e.id)}">Позвать своих</button></div><a class="afishaSource" href="${afEsc(e.source_url)}" target="_blank" rel="noopener">Источник: ${afEsc(e.source_name)} ↗</a></div></article>`;
}

function decorateLyaAfishaCovers(root=document){
  if(!window.LyaDefaultCovers||!window.LyaDefaultCovers.ready())return;
  root.querySelectorAll('.afishaLyaCard .afishaVisual[data-lya-cover-key]:not(.hasCover)').forEach(el=>{
    const key=el.dataset.lyaCoverKey||'',title=el.dataset.lyaCoverTitle||'';
    const style=window.LyaDefaultCovers.event(key,title);
    if(window.LyaDefaultCovers.apply(el,style))el.classList.add('hasDefaultCover');
  });
}
function renderAfisha(){
  const root=document.querySelector('#afisha-root');if(!root)return;
  const items=filteredAfisha();
  const dateContext=afishaDateFilter?`<section class="afishaDateContext"><div><span class="ey">ИЗ КАЛЕНДАРЯ</span><h2>${afEsc(afDateTitleFromKey(afishaDateFilter))}</h2><p>Что можно сделать вместе в этот день.</p></div><div class="afishaDateContextActions"><button type="button" data-af-date-back>← К календарю</button><button type="button" data-af-date-clear>Все поводы</button></div></section>`:'';
  const empty=!afishaEvents.length
    ?'<div class="afishaEmpty afishaEmptyFeed"><strong>На эту дату пока ничего не нашли</strong><span>Можно выбрать место и создать встречу самим.</span></div>'
    :'<div class="afishaEmpty"><strong>По этому фильтру пока ничего нет</strong><span>Попробуйте другой вариант.</span></div>';
  root.innerHTML=`${dateContext}${onboardingHtml()}<div class="afishaFeed">${items.length?items.map(afishaCard).join(''):empty}</div>`;
  document.querySelector('#afisha-city-label')?.replaceChildren(document.createTextNode(afishaCity));
  bindAfishaActions();renderAfishaCompareBar();decorateLyaAfishaCovers(root);
}

function bindAfishaActions(){
  document.querySelectorAll('#interest-chips button,#time-chips button').forEach(b=>b.onclick=()=>b.classList.toggle('active'));
  document.querySelector('[data-af-date-back]')?.addEventListener('click',()=>{if(typeof openView==='function')openView('calendar')});
  document.querySelector('[data-af-date-clear]')?.addEventListener('click',async()=>{afishaDateFilter=null;afishaFilter='for-me';document.querySelectorAll('[data-af-filter]').forEach(x=>x.classList.toggle('active',x.dataset.afFilter==='for-me'));document.dispatchEvent(new CustomEvent('lya:calendar-date-afisha-clear'));await loadAfisha({date:null})});
  const closeOnboarding=document.querySelector('#close-afisha-onboarding');if(closeOnboarding)closeOnboarding.onclick=()=>{localStorage.setItem(AFISHA_ONBOARDING_DISMISSED_KEY,'1');document.querySelector('#afisha-onboarding')?.remove()};
  const save=document.querySelector('#save-afisha-prefs');if(save)save.onclick=saveAfishaPreferences;
  document.querySelectorAll('.af-like').forEach(b=>b.onclick=()=>toggleAfisha('like',b.dataset.id));
  document.querySelectorAll('.af-compare').forEach(b=>b.onclick=()=>toggleAfisha('compare',b.dataset.id));
  document.querySelectorAll('.collectCompany').forEach(b=>b.onclick=()=>collectCompany(b.dataset.id));
  document.querySelectorAll('.openLyaEvent').forEach(b=>b.onclick=()=>{if(typeof openEventView==='function')openEventView(b.dataset.id,'home')});
}

async function saveAfishaPreferences(){
  const interests=[...document.querySelectorAll('#interest-chips button.active')].map(b=>b.dataset.value);
  const times=[...document.querySelectorAll('#time-chips button.active')].map(b=>b.dataset.value);
  const btn=document.querySelector('#save-afisha-prefs');btn.disabled=true;btn.textContent='Сохраняю…';
  try{const data=await afRaw('save_preferences',{city:document.querySelector('#afisha-city').value,interests,preferred_times:times},true);afishaProfile=data.profile;afishaCity=data.profile.city;localStorage.setItem(AFISHA_ONBOARDING_DISMISSED_KEY,'1');afToast('Лента настроена');await loadAfisha()}catch(err){afToast(err.message);btn.disabled=false;btn.textContent='Показать мои события'}
}

function requireAfishaLogin(action,id){
  sessionStorage.setItem(PENDING_AFISHA_KEY,JSON.stringify({action,id}));openView('login');
}

async function ensureAfishaAccount(){
  try{if(typeof account!=='undefined'&&account)return true}catch(e){}
  if(typeof window.lyaEnsureAccount==='function')return await window.lyaEnsureAccount();
  try{return !!(session&&session.access_token)}catch(e){return false}
}
async function toggleAfisha(kind,id,forcedActive){
  if(!(await ensureAfishaAccount())){requireAfishaLogin(kind,id);return}
  const key=kind+':'+id;
  if(afishaActionLocks.has(key))return;
  afishaActionLocks.add(key);
  const set=kind==='like'?afishaLiked:afishaCompared;
  const desired=typeof forcedActive==='boolean'?forcedActive:!set.has(id);
  try{
    const action=kind==='like'?'toggle_like':'toggle_compare';
    const data=await afRaw(action,{afisha_event_id:id,active:desired},true);
    if(data.active)set.add(id);else set.delete(id);
    renderAfisha();
    if(kind==='like')afToast(data.active?'Добавлено в понравившиеся':'Убрано из понравившихся');
  }catch(err){afToast(err.message)}
  finally{setTimeout(()=>afishaActionLocks.delete(key),700)}
}
async function collectCompany(id){
  if(!(await ensureAfishaAccount())){requireAfishaLogin('collect',id);return}
  const button=document.querySelector(`.collectCompany[data-id="${CSS.escape(id)}"]`);
  if(button){button.disabled=true;button.textContent='Выберите своих…'}
  try{
    let targets={user_ids:[],community_ids:[]};
    if(typeof window.pickInviteTargets==='function'){
      targets=await window.pickInviteTargets();
    }else if(typeof window.pickCirclePeople==='function'){
      targets.user_ids=await window.pickCirclePeople();
    }
    if(!(targets.user_ids||[]).length&&!(targets.community_ids||[]).length){if(button){button.disabled=false;button.textContent='Позвать своих'}return}
    if(button)button.textContent='Создаю планы…';
    const data=await afRaw('collect_company',{afisha_event_id:id},true);
    let inviteResult={invited_ids:[]};
    if(typeof window.inviteTargetsToEvent==='function')inviteResult=await window.inviteTargetsToEvent(data.event.id,targets);
    else if((targets.user_ids||[]).length&&typeof window.inviteCircleToEvent==='function')inviteResult=await window.inviteCircleToEvent(data.event.id,targets.user_ids);
    await loadEvents();
    afToast('Приглашения отправлены · '+(inviteResult.invited_ids||[]).length);
    openEventView(data.event.id,'home');
  }catch(err){afToast(err.message);if(button){button.disabled=false;button.textContent='Позвать своих'}}
}

function renderAfishaCompareBar(){
  const bar=document.querySelector('#afisha-compare-bar');if(!bar)return;const n=afishaCompared.size;bar.hidden=n<2;if(n>=2)bar.innerHTML=`<span>Выбрано для сравнения · ${n}</span><button id="open-afisha-compare">Сравнить</button>`;
  const btn=document.querySelector('#open-afisha-compare');if(btn)btn.onclick=openAfishaComparison;
}
async function openAfishaComparison(){
  if(!(await ensureAfishaAccount()))return;
  const modal=document.querySelector('#afisha-compare-modal');const body=document.querySelector('#afisha-compare-body');modal.hidden=false;body.innerHTML='<p class="muted">Собираю сравнение…</p>';
  try{const data=await afRaw('compare',{},true);body.innerHTML=`<div class="compareGrid">${(data.events||[]).map(e=>`<article class="compareItem"><span class="ey">${afEsc(AFISHA_CATEGORIES[e.category]||'СОБЫТИЕ')}</span><h3>${afEsc(e.title)}</h3><dl><div><dt>КОГДА</dt><dd>${afEsc(afDate(e.starts_at))}</dd></div><div><dt>ГДЕ</dt><dd>${afEsc(e.venue||'Не указано')}</dd></div><div><dt>СТОИМОСТЬ</dt><dd>${afEsc(e.price_text||'У организатора')}</dd></div></dl><a href="${afEsc(e.source_url)}" target="_blank" rel="noopener">Источник ↗</a><button class="primary compareCollect" data-id="${afEsc(e.id)}" style="margin-top:10px">Позвать своих</button></article>`).join('')}</div>`;document.querySelectorAll('.compareCollect').forEach(b=>b.onclick=()=>{modal.hidden=true;collectCompany(b.dataset.id)})}catch(err){body.innerHTML=`<div class="status error">${afEsc(err.message)}</div>`}
}

async function loadAfisha(opts={}){
  const root=document.querySelector('#afisha-root');if(!root)return;
  const requestedDate=Object.prototype.hasOwnProperty.call(opts,'date')?opts.date:afishaDateFilter;
  root.innerHTML='<div class="afishaLoading">Загружаю настоящую афишу…</div>';
  try{
    let data;
    if(account){
      try{
        data=await afRaw('feed',{city:afishaCity,date:requestedDate||null},false);
      }catch(personalError){
        console.warn('Personal Afisha feed unavailable, using public fallback',personalError);
        data=await loadPublicAfishaFeed(afishaCity,requestedDate||null);
      }
    }else{
      try{ data=await afRaw('feed',{city:afishaCity,date:requestedDate||null},false); }
      catch(publicApiError){ console.warn('Afisha API unavailable, using REST fallback',publicApiError); data=await loadPublicAfishaFeed(afishaCity,requestedDate||null); }
    }
    afishaEvents=data.events||[];
    afishaProfile=data.profile||null;
    if(afishaProfile?.city)afishaCity=afishaProfile.city;
    afishaLiked=new Set(data.liked||[]);
    afishaCompared=new Set(data.compared||[]);
    renderAfisha();
  }catch(err){
    root.innerHTML=`<div class="status error">${afEsc(err.message||'Не удалось загрузить Афишу')}</div><button class="primary" id="afisha-retry" style="margin-top:12px">Попробовать ещё раз</button>`;
    document.querySelector('#afisha-retry')?.addEventListener('click',loadAfisha);
  }
}

window.openAfishaForDate=async function(dateKey){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey||'')))return;
  afishaDateFilter=String(dateKey);
  afishaFilter='for-me';
  document.querySelectorAll('[data-af-filter]').forEach(x=>x.classList.toggle('active',x.dataset.afFilter==='for-me'));
  document.dispatchEvent(new CustomEvent('lya:calendar-date-afisha',{detail:{date:afishaDateFilter}}));
  if(typeof openView==='function')openView('home');
  await loadAfisha({date:afishaDateFilter});
};

window.collectAfishaCompany=collectCompany;

async function processPendingAfishaAction(){
  if(!account)return;let pending=null;try{pending=JSON.parse(sessionStorage.getItem(PENDING_AFISHA_KEY)||'null')}catch{}if(!pending)return;sessionStorage.removeItem(PENDING_AFISHA_KEY);await loadAfisha();if(pending.action==='collect')return collectCompany(pending.id);if(pending.action==='like'||pending.action==='compare')return toggleAfisha(pending.action,pending.id);
}

document.querySelectorAll('[data-af-filter]').forEach(b=>b.onclick=()=>{afishaFilter=b.dataset.afFilter;document.querySelectorAll('[data-af-filter]').forEach(x=>x.classList.toggle('active',x===b));renderAfisha()});
document.querySelector('.nav[data-go="home"]')?.addEventListener('click',()=>{if(!afishaDateFilter)return;afishaDateFilter=null;afishaFilter='for-me';document.dispatchEvent(new CustomEvent('lya:calendar-date-afisha-clear'))});
document.querySelector('#close-afisha-compare')?.addEventListener('click',()=>document.querySelector('#afisha-compare-modal').hidden=true);
document.querySelector('#afisha-compare-modal')?.addEventListener('click',e=>{if(e.target.id==='afisha-compare-modal')e.currentTarget.hidden=true});

const afishaBaseOpenView=openView;
openView=function(name){afishaBaseOpenView(name);if(name==='home')loadAfisha();if(account&&sessionStorage.getItem(PENDING_AFISHA_KEY)&&name!=='login')setTimeout(processPendingAfishaAction,0)};

loadAfisha();setTimeout(()=>{if(account)loadAfisha()},700);
document.addEventListener('vmeste-auth-changed',()=>loadAfisha());

window.addEventListener('lya:default-covers-ready',()=>decorateLyaAfishaCovers(document));
