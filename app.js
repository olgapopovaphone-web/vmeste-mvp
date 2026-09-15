const API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-api';
const STORAGE_KEY='vmeste_session_v1';
const PENDING_INVITE_KEY='vmeste_pending_invite_v1';
const TZ='Europe/Moscow';
let session=loadSession();
let account=null;
let authMode='signup';
let calendarEvents=[];
let calendarMode='month';
let selectedDateKey=todayKey();
let [calendarYear,calendarMonth]=selectedDateKey.split('-').map(Number);
calendarMonth-=1;
let pendingInviteToken=new URLSearchParams(location.search).get('invite')||localStorage.getItem(PENDING_INVITE_KEY)||'';
if(pendingInviteToken)localStorage.setItem(PENDING_INVITE_KEY,pendingInviteToken);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));

function loadSession(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}}
function saveSession(value){session=value;if(value)localStorage.setItem(STORAGE_KEY,JSON.stringify(value));else localStorage.removeItem(STORAGE_KEY)}
function clearSession(){saveSession(null);account=null;updateAvatars()}
function pad(n){return String(n).padStart(2,'0')}
function keyFromUTCDate(d){return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}
function utcDateFromKey(key){const [y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12))}
function addDaysKey(key,days){const d=utcDateFromKey(key);d.setUTCDate(d.getUTCDate()+days);return keyFromUTCDate(d)}
function dateKey(value){const d=value instanceof Date?value:new Date(value);const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const get=t=>parts.find(p=>p.type===t)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`}
function todayKey(){return dateKey(new Date())}
function daysInMonth(y,m){return new Date(Date.UTC(y,m+1,0)).getUTCDate()}
function weekdayIndex(key){return (utcDateFromKey(key).getUTCDay()+6)%7}
function monthLabel(y,m){const text=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m,1)));return text.charAt(0).toUpperCase()+text.slice(1).replace(' г.','')}
function fullDateLabel(key){const text=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(utcDateFromKey(key));return text.charAt(0).toUpperCase()+text.slice(1)}
function shortDateLabel(key){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'}).format(utcDateFromKey(key))}
function eventTime(value){return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(new Date(value))}
function formatEventDate(value){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(new Date(value))}
function eventPrice(ev){return ev.price_minor?Math.round(ev.price_minor/100)+' ₽':'Бесплатно'}

function captureAuthHash(){
  if(!location.hash)return;
  const params=new URLSearchParams(location.hash.slice(1));
  const access_token=params.get('access_token');
  const refresh_token=params.get('refresh_token');
  if(access_token&&refresh_token){
    saveSession({access_token,refresh_token,expires_at:Number(params.get('expires_at')||0),token_type:'bearer'});
    history.replaceState(null,'',location.pathname+location.search);
  }
}
captureAuthHash();

async function raw(action,payload={},token=''){
  const headers={'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...payload})});
  let data={};
  try{data=await response.json()}catch{data={error:'Некорректный ответ сервера'}}
  return {ok:response.ok,status:response.status,data};
}
async function refreshSession(){
  if(!session?.refresh_token)return false;
  const result=await raw('refresh',{refresh_token:session.refresh_token});
  if(!result.ok||!result.data.session){clearSession();return false}
  saveSession(result.data.session);return true;
}
async function api(action,payload={},needsAuth=true,retry=true){
  const result=await raw(action,payload,needsAuth?session?.access_token||'':'');
  if(result.status===401&&needsAuth&&retry&&await refreshSession())return api(action,payload,true,false);
  if(!result.ok)throw new Error(result.data.error||'Ошибка запроса');
  return result.data;
}

function openView(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
  $$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.go===name));
  const bottom=$('#bottom-nav');
  bottom.style.display=(name==='profile'||name==='login')?'none':'grid';
  if(name==='profile')renderProfile();
  if(name==='calendar')loadEvents();
  window.scrollTo(0,0);
}
$$('.nav').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.go)));
$$('.js-profile').forEach(b=>b.addEventListener('click',()=>openView('profile')));
$$('.js-home').forEach(b=>b.addEventListener('click',()=>openView('home')));
$$('.repeat').forEach(b=>b.addEventListener('click',()=>alert('«Повторить» подключим после основного календаря')));

function updateAvatars(){const letter=(account?.profile?.display_name||account?.user?.email||'В').trim().slice(0,1).toUpperCase()||'В';$$('.avatar').forEach(a=>a.textContent=letter)}
async function loadAccount(){
  if(!session?.access_token){account=null;updateAvatars();renderProfile();return false}
  try{account=await api('me');updateAvatars();renderProfile();return true}catch(e){clearSession();renderProfile();return false}
}
function renderProfile(){
  const root=$('#profile-root');if(!root)return;
  if(!account){root.innerHTML='<div class="mark">В</div><span class="ey">ПРОФИЛЬ</span><h1>Вы пока гость</h1><p class="muted">Главную можно смотреть без входа. Для приглашений и собственных событий нужен аккаунт.</p><div class="panel"><button class="primary" id="enter-account">Войти или зарегистрироваться</button></div>';$('#enter-account').onclick=()=>openView('login');return}
  const p=account.profile||{};const name=p.display_name||'Участник';
  root.innerHTML=`<div class="mark">${escapeHtml(name.slice(0,1).toUpperCase())}</div><span class="ey">ПРОФИЛЬ</span><h1>${escapeHtml(name)}</h1><p class="muted">${escapeHtml(account.user?.email||'')}</p><form class="panel" id="profile-form"><label>Имя<input id="profile-name" value="${escapeHtml(name)}" required></label><label>Дата рождения<input id="profile-birth" type="date" value="${escapeHtml(p.birth_date||'')}"></label><p class="muted">Тип аккаунта: ${p.account_type==='business'?'бизнес':'личный'}${p.business_verified?' · подтверждён':''}</p><div id="profile-status" class="status" hidden></div><button class="primary">Сохранить</button></form><button class="repeat" id="signout" style="margin-top:18px">Выйти</button>`;
  $('#profile-form').onsubmit=saveProfile;$('#signout').onclick=signOut;
}
async function saveProfile(e){
  e.preventDefault();const status=$('#profile-status');status.hidden=false;status.className='status';status.textContent='Сохраняю…';
  try{const data=await api('update_profile',{display_name:$('#profile-name').value.trim(),birth_date:$('#profile-birth').value||null});account.profile=data.profile;updateAvatars();status.textContent='Сохранено'}catch(err){status.className='status error';status.textContent=err.message}
}
async function signOut(){try{if(session?.access_token)await api('logout')}catch{}clearSession();openView('home')}

function setAuthMode(mode){authMode=mode;$('#signup-tab').classList.toggle('active',mode==='signup');$('#login-tab').classList.toggle('active',mode==='login');$('#name-field').style.display=mode==='signup'?'grid':'none';$('#auth-name').required=mode==='signup';$('#auth-submit').textContent=mode==='signup'?'Создать аккаунт':'Войти';$('#auth-status').hidden=true}
$('#signup-tab').onclick=()=>setAuthMode('signup');$('#login-tab').onclick=()=>setAuthMode('login');
$('#auth-form').onsubmit=async e=>{
  e.preventDefault();const status=$('#auth-status');status.hidden=false;status.className='status';status.textContent=authMode==='signup'?'Создаю аккаунт…':'Вхожу…';const email=$('#auth-email').value.trim();const password=$('#auth-password').value;
  try{
    if(authMode==='signup'){
      const data=await api('signup',{email,password,display_name:$('#auth-name').value.trim(),invite_token:pendingInviteToken||null},false);
      if(data.session){saveSession(data.session);await loadAccount();if(pendingInviteToken)await showPendingInvite();else openView('profile')}
      else{setAuthMode('login');status.hidden=false;status.className='status';status.textContent='Аккаунт создан. Подтвердите email по ссылке из письма — приглашение сохранится.'}
    }else{
      const data=await api('login',{email,password},false);saveSession(data.session);await loadAccount();if(pendingInviteToken)await showPendingInvite();else openView('profile')
    }
  }catch(err){status.hidden=false;status.className='status error';status.textContent=err.message}
};

$('#private-choice').onclick=()=>{if(!account){openView('login');return}const form=$('#event-form');form.hidden=false;form.scrollIntoView({behavior:'smooth'})};
$('#event-form').onsubmit=async e=>{
  e.preventDefault();if(!account){openView('login');return}const status=$('#event-status');status.hidden=false;status.className='status';status.textContent='Сохраняю в базе…';const date=$('#event-date').value;const time=$('#event-time').value;const starts=new Date(`${date}T${time}:00+03:00`);const ends=new Date(starts.getTime()+2*60*60*1000);
  try{const data=await api('create_event',{title:$('#event-title').value.trim(),starts_at:starts.toISOString(),ends_at:ends.toISOString(),location_name:$('#event-place').value.trim()||null,price_minor:Math.round((Number($('#event-price').value)||0)*100)});status.textContent='Событие сохранено';e.target.reset();$('#event-price').value=0;selectedDateKey=dateKey(data.event.starts_at);calendarYear=Number(selectedDateKey.slice(0,4));calendarMonth=Number(selectedDateKey.slice(5,7))-1;await loadEvents()}catch(err){status.className='status error';status.textContent=err.message}
};

function allEventsFromResponse(data){
  const created=(data.events||[]).map(ev=>({...ev,calendar_kind:'created'}));
  const invited=(data.invited_events||[]).map(ev=>({...ev,calendar_kind:'invited'}));
  return [...created,...invited].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
}
function eventsForDate(key){return calendarEvents.filter(ev=>dateKey(ev.starts_at)===key)}
function eventBadge(ev){if(ev.calendar_kind==='created')return ev.status==='draft'?'Черновик':'Моё';return ev.invitation_status==='pending'?'Приглашение':'Иду'}
function dayEventHtml(ev){
  const own=ev.calendar_kind==='created';const pending=ev.calendar_kind==='invited'&&ev.invitation_status==='pending';
  return `<article class="calendarEvent"><div class="eventKind">${own?'МОЁ СОБЫТИЕ':pending?'МЕНЯ ПРИГЛАСИЛИ':'Я УЧАСТВУЮ'}</div><div class="calendarEventTop"><div><h3>${escapeHtml(ev.title)}</h3><p class="muted">${eventTime(ev.starts_at)}${ev.location_name?' · '+escapeHtml(ev.location_name):''} · ${eventPrice(ev)}</p></div><span class="tag">${eventBadge(ev)}</span></div><div class="calendarEventActions">${own?`<button class="repeat invite-link-button" data-event-id="${escapeHtml(ev.id)}" data-event-title="${escapeHtml(ev.title)}">Ссылка-приглашение</button>`:''}${pending?`<button class="smallPrimary invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="accepted">Принять</button><button class="repeat invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="declined">Отклонить</button>`:''}</div><div class="invite-area" id="invite-${escapeHtml(ev.id)}"></div></article>`;
}
function renderDayEvents(){
  const root=$('#day-events');if(!root)return;$('#selected-date-title').textContent=fullDateLabel(selectedDateKey);const events=eventsForDate(selectedDateKey);root.innerHTML=events.length?events.map(dayEventHtml).join(''):'<div class="emptyDay">На этот день событий пока нет.</div>';bindCalendarActions();
}
function renderMonth(){
  const firstKey=`${calendarYear}-${pad(calendarMonth+1)}-01`;const firstOffset=weekdayIndex(firstKey);const currentDays=daysInMonth(calendarYear,calendarMonth);const prevMonth=calendarMonth===0?11:calendarMonth-1;const prevYear=calendarMonth===0?calendarYear-1:calendarYear;const prevDays=daysInMonth(prevYear,prevMonth);const cells=[];
  for(let i=0;i<42;i++){
    let y=calendarYear,m=calendarMonth,day=i-firstOffset+1,outside=false;
    if(day<1){outside=true;m=prevMonth;y=prevYear;day=prevDays+day}else if(day>currentDays){outside=true;m=calendarMonth===11?0:calendarMonth+1;y=calendarMonth===11?calendarYear+1:calendarYear;day-=currentDays}
    const key=`${y}-${pad(m+1)}-${pad(day)}`;const count=eventsForDate(key).length;const dots='<div class="monthDayDots">'+Array.from({length:Math.min(3,count)},()=>'<i></i>').join('')+'</div>';
    cells.push(`<button class="monthDay${outside?' outside':''}${key===selectedDateKey?' selected':''}${key===todayKey()?' today':''}" data-date="${key}"><b>${day}</b>${count?dots:''}</button>`);
  }
  $('#calendar-grid').innerHTML=`<div class="monthWeekdays"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span></div><div class="monthCells">${cells.join('')}</div>`;
}
function renderWeek(){
  const start=addDaysKey(selectedDateKey,-weekdayIndex(selectedDateKey));const days=[];
  for(let i=0;i<7;i++){const key=addDaysKey(start,i);const d=utcDateFromKey(key);const events=eventsForDate(key);days.push(`<button class="weekDay${key===selectedDateKey?' selected':''}" data-date="${key}"><small>${['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'][i]}</small><b>${d.getUTCDate()}</b>${events.slice(0,2).map(ev=>`<div class="weekMiniEvent">${eventTime(ev.starts_at)} · ${escapeHtml(ev.title)}</div>`).join('')}${events.length>2?`<div class="weekMiniEvent">+${events.length-2}</div>`:''}</button>`)}
  $('#calendar-grid').innerHTML=`<div class="weekGrid">${days.join('')}</div>`;
}
function renderDayMode(){const d=utcDateFromKey(selectedDateKey);$('#calendar-grid').innerHTML=`<div class="dayModeCard"><span>${new Intl.DateTimeFormat('ru-RU',{weekday:'long',timeZone:'UTC'}).format(d).toUpperCase()}</span><b>${d.getUTCDate()}</b><span>${new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(d)}</span></div>`}
function calendarTitle(){
  if(calendarMode==='month')return monthLabel(calendarYear,calendarMonth);
  if(calendarMode==='day')return shortDateLabel(selectedDateKey);
  const start=addDaysKey(selectedDateKey,-weekdayIndex(selectedDateKey));const end=addDaysKey(start,6);return `${shortDateLabel(start)} — ${shortDateLabel(end)}`;
}
function renderCalendar(){
  const title=$('#calendar-title');if(!title)return;title.textContent=calendarTitle();$$('[data-cal-mode]').forEach(b=>b.classList.toggle('active',b.dataset.calMode===calendarMode));if(calendarMode==='month')renderMonth();else if(calendarMode==='week')renderWeek();else renderDayMode();$$('#calendar-grid [data-date]').forEach(b=>b.onclick=()=>selectCalendarDate(b.dataset.date));renderDayEvents();
}
function selectCalendarDate(key){selectedDateKey=key;const [y,m]=key.split('-').map(Number);calendarYear=y;calendarMonth=m-1;renderCalendar()}
function shiftMonth(delta){calendarMonth+=delta;if(calendarMonth<0){calendarMonth=11;calendarYear--}if(calendarMonth>11){calendarMonth=0;calendarYear++}const day=Math.min(Number(selectedDateKey.slice(8,10)),daysInMonth(calendarYear,calendarMonth));selectedDateKey=`${calendarYear}-${pad(calendarMonth+1)}-${pad(day)}`}
function shiftCalendar(delta){if(calendarMode==='month')shiftMonth(delta);else selectedDateKey=addDaysKey(selectedDateKey,delta*(calendarMode==='week'?7:1));const [y,m]=selectedDateKey.split('-').map(Number);calendarYear=y;calendarMonth=m-1;renderCalendar()}
$$('[data-cal-mode]').forEach(b=>b.onclick=()=>{calendarMode=b.dataset.calMode;renderCalendar()});$('#calendar-prev').onclick=()=>shiftCalendar(-1);$('#calendar-next').onclick=()=>shiftCalendar(1);$('#calendar-today').onclick=()=>{selectedDateKey=todayKey();const [y,m]=selectedDateKey.split('-').map(Number);calendarYear=y;calendarMonth=m-1;renderCalendar()};

function bindCalendarActions(){
  $$('.invite-link-button').forEach(button=>button.onclick=()=>showInviteLink(button.dataset.eventId,button.dataset.eventTitle));
  $$('.invite-response').forEach(button=>button.onclick=()=>respondInvitation(button.dataset.invitationId,button.dataset.response));
}
async function showInviteLink(eventId,eventTitle){
  const area=document.getElementById('invite-'+eventId);if(!area)return;area.innerHTML='<div class="inviteBox">Создаю ссылку…</div>';
  try{
    const data=await api('create_invite_link',{event_id:eventId});const url=data.invite_url;
    area.innerHTML=`<div class="inviteBox"><div class="ey">ССЫЛКА-ПРИГЛАШЕНИЕ</div><p class="muted" style="margin:6px 0 10px">Можно отправить в любой мессенджер.</p><input class="inviteLink" value="${escapeHtml(url)}" readonly><div class="inviteLinkActions"><button class="repeat copy-invite">Копировать</button><button class="smallPrimary share-invite">Поделиться</button></div><div class="shareOk" hidden></div></div>`;
    const ok=area.querySelector('.shareOk');area.querySelector('.copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(url);ok.hidden=false;ok.textContent='Ссылка скопирована'}catch{const input=area.querySelector('.inviteLink');input.select();document.execCommand('copy');ok.hidden=false;ok.textContent='Ссылка скопирована'}};
    area.querySelector('.share-invite').onclick=async()=>{if(navigator.share){try{await navigator.share({title:eventTitle,text:`Приглашаю на «${eventTitle}» во «Вместе»`,url})}catch{}}else{await navigator.clipboard.writeText(url);ok.hidden=false;ok.textContent='Ссылка скопирована — вставьте её в мессенджер'}};
  }catch(err){area.innerHTML=`<div class="status error">${escapeHtml(err.message)}</div>`}
}
async function respondInvitation(invitationId,response){try{await api('respond_invitation',{invitation_id:invitationId,response});await loadEvents()}catch(err){alert(err.message)}}

async function loadEvents(){
  const dayRoot=$('#day-events');if(!dayRoot)return;
  if(!account){calendarEvents=[];renderCalendar();dayRoot.innerHTML='<div class="emptyDay">Войдите, чтобы увидеть свои события.</div>';return}
  dayRoot.innerHTML='<p class="muted">Загружаю…</p>';
  try{const data=await api('list_events');calendarEvents=allEventsFromResponse(data);renderCalendar()}catch(err){dayRoot.innerHTML=`<p class="muted">${escapeHtml(err.message)}</p>`}
}

function clearInviteFromUrl(){const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(null,'',url.pathname+url.search);localStorage.removeItem(PENDING_INVITE_KEY);pendingInviteToken=''}
function removeInviteOverlay(){document.querySelector('.inviteOverlay')?.remove()}
async function showPendingInvite(){
  if(!pendingInviteToken)return;removeInviteOverlay();
  try{
    const data=await api('preview_invite_link',{token:pendingInviteToken},false);const ev=data.event;
    const overlay=document.createElement('div');overlay.className='inviteOverlay';
    overlay.innerHTML=`<div class="inviteSheet"><div class="ey">ВАС ПРИГЛАСИЛИ</div><h2>${escapeHtml(ev.title)}</h2><p class="muted">${escapeHtml(ev.creator_name)} приглашает вас во «Вместе».</p><div class="inviteSheetMeta"><b>${formatEventDate(ev.starts_at)}</b><p class="muted" style="margin-top:6px">${ev.location_name?escapeHtml(ev.location_name)+' · ':''}${eventPrice(ev)}</p></div><div class="inviteSheetActions">${account?'<button class="primary accept-link-invite">Принять приглашение</button>':'<button class="primary login-for-invite">Войти или зарегистрироваться</button>'}</div><button class="inviteClose">Не сейчас</button><div class="status invite-overlay-status" hidden></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.inviteClose').onclick=removeInviteOverlay;
    if(account){overlay.querySelector('.accept-link-invite').onclick=async()=>{const status=overlay.querySelector('.invite-overlay-status');status.hidden=false;status.className='status';status.textContent='Добавляю событие в календарь…';try{await api('accept_invite_link',{token:pendingInviteToken});clearInviteFromUrl();removeInviteOverlay();selectedDateKey=dateKey(ev.starts_at);calendarYear=Number(selectedDateKey.slice(0,4));calendarMonth=Number(selectedDateKey.slice(5,7))-1;calendarMode='day';await loadEvents();openView('calendar')}catch(err){status.className='status error';status.textContent=err.message}}}
    else{overlay.querySelector('.login-for-invite').onclick=()=>{removeInviteOverlay();openView('login');const status=$('#auth-status');status.hidden=false;status.className='status';status.textContent='Войдите или зарегистрируйтесь, чтобы принять приглашение.'}}
  }catch(err){
    const overlay=document.createElement('div');overlay.className='inviteOverlay';overlay.innerHTML=`<div class="inviteSheet"><div class="ey">ПРИГЛАШЕНИЕ</div><h2>Ссылка недоступна</h2><p class="muted">${escapeHtml(err.message)}</p><button class="primary close-bad-invite" style="margin-top:16px">Закрыть</button></div>`;document.body.appendChild(overlay);overlay.querySelector('.close-bad-invite').onclick=()=>{clearInviteFromUrl();removeInviteOverlay()};
  }
}

(async function init(){await loadAccount();await loadEvents();renderCalendar();if(pendingInviteToken)await showPendingInvite()})();
