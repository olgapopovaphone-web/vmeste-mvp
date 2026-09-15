const API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-api';
const STORAGE_KEY='vmeste_session_v1';
let session=loadSession();
let account=null;
let authMode='signup';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));

function loadSession(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
}
function saveSession(value){
  session=value;
  if(value)localStorage.setItem(STORAGE_KEY,JSON.stringify(value));
  else localStorage.removeItem(STORAGE_KEY);
}
function clearSession(){saveSession(null);account=null;updateAvatars();}

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
  saveSession(result.data.session);
  return true;
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
$$('.repeat').forEach(b=>b.addEventListener('click',()=>alert('«Повторить» подключим после проверки первого пользовательского цикла')));

function updateAvatars(){
  const letter=(account?.profile?.display_name||account?.user?.email||'В').trim().slice(0,1).toUpperCase()||'В';
  $$('.avatar').forEach(a=>a.textContent=letter);
}

async function loadAccount(){
  if(!session?.access_token){account=null;updateAvatars();renderProfile();return false}
  try{
    account=await api('me');
    updateAvatars();
    renderProfile();
    return true;
  }catch(e){
    clearSession();
    renderProfile();
    return false;
  }
}

function renderProfile(){
  const root=$('#profile-root');
  if(!root)return;
  if(!account){
    root.innerHTML='<div class="mark">В</div><span class="ey">ПРОФИЛЬ</span><h1>Вы пока гость</h1><p class="muted">Главную можно смотреть без входа. Для приглашений и собственных событий нужен аккаунт.</p><div class="panel"><button class="primary" id="enter-account">Войти или зарегистрироваться</button></div>';
    $('#enter-account').onclick=()=>openView('login');
    return;
  }
  const p=account.profile||{};
  const name=p.display_name||'Участник';
  root.innerHTML=`<div class="mark">${escapeHtml(name.slice(0,1).toUpperCase())}</div><span class="ey">ПРОФИЛЬ</span><h1>${escapeHtml(name)}</h1><p class="muted">${escapeHtml(account.user?.email||'')}</p><form class="panel" id="profile-form"><label>Имя<input id="profile-name" value="${escapeHtml(name)}" required></label><label>Дата рождения<input id="profile-birth" type="date" value="${escapeHtml(p.birth_date||'')}"></label><p class="muted">Тип аккаунта: ${p.account_type==='business'?'бизнес':'личный'}${p.business_verified?' · подтверждён':''}</p><div id="profile-status" class="status" hidden></div><button class="primary">Сохранить</button></form><button class="repeat" id="signout" style="margin-top:18px">Выйти</button>`;
  $('#profile-form').onsubmit=saveProfile;
  $('#signout').onclick=signOut;
}

async function saveProfile(e){
  e.preventDefault();
  const status=$('#profile-status');
  status.hidden=false;status.className='status';status.textContent='Сохраняю…';
  try{
    const data=await api('update_profile',{display_name:$('#profile-name').value.trim(),birth_date:$('#profile-birth').value||null});
    account.profile=data.profile;
    updateAvatars();
    status.textContent='Сохранено';
  }catch(err){status.className='status error';status.textContent=err.message}
}

async function signOut(){
  try{if(session?.access_token)await api('logout')}catch{}
  clearSession();
  openView('home');
}

function setAuthMode(mode){
  authMode=mode;
  $('#signup-tab').classList.toggle('active',mode==='signup');
  $('#login-tab').classList.toggle('active',mode==='login');
  $('#name-field').style.display=mode==='signup'?'grid':'none';
  $('#auth-name').required=mode==='signup';
  $('#auth-submit').textContent=mode==='signup'?'Создать аккаунт':'Войти';
  $('#auth-status').hidden=true;
}
$('#signup-tab').onclick=()=>setAuthMode('signup');
$('#login-tab').onclick=()=>setAuthMode('login');

$('#auth-form').onsubmit=async e=>{
  e.preventDefault();
  const status=$('#auth-status');
  status.hidden=false;status.className='status';status.textContent=authMode==='signup'?'Создаю аккаунт…':'Вхожу…';
  const email=$('#auth-email').value.trim();
  const password=$('#auth-password').value;
  try{
    if(authMode==='signup'){
      const data=await api('signup',{email,password,display_name:$('#auth-name').value.trim()},false);
      if(data.session){
        saveSession(data.session);await loadAccount();openView('profile');
      }else{
        setAuthMode('login');
        status.hidden=false;status.className='status';
        status.textContent='Аккаунт создан. Подтвердите email по ссылке из письма, затем вернитесь сюда и войдите.';
      }
    }else{
      const data=await api('login',{email,password},false);
      saveSession(data.session);
      await loadAccount();
      openView('profile');
    }
  }catch(err){status.hidden=false;status.className='status error';status.textContent=err.message}
};

$('#private-choice').onclick=()=>{
  if(!account){openView('login');return}
  const form=$('#event-form');
  form.hidden=false;
  form.scrollIntoView({behavior:'smooth'});
};

$('#event-form').onsubmit=async e=>{
  e.preventDefault();
  if(!account){openView('login');return}
  const status=$('#event-status');
  status.hidden=false;status.className='status';status.textContent='Сохраняю в базе…';
  const date=$('#event-date').value;
  const time=$('#event-time').value;
  const starts=new Date(`${date}T${time}:00+03:00`);
  const ends=new Date(starts.getTime()+2*60*60*1000);
  try{
    await api('create_event',{
      title:$('#event-title').value.trim(),
      starts_at:starts.toISOString(),
      ends_at:ends.toISOString(),
      location_name:$('#event-place').value.trim()||null,
      price_minor:Math.round((Number($('#event-price').value)||0)*100)
    });
    status.textContent='Событие сохранено в Supabase';
    e.target.reset();$('#event-price').value=0;
    await loadEvents();
  }catch(err){status.className='status error';status.textContent=err.message}
};

function formatEventDate(value){
  return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(value));
}

function eventPrice(ev){
  return ev.price_minor?Math.round(ev.price_minor/100)+' ₽':'Бесплатно';
}

function creatorEventHtml(ev){
  return `<div class="eventRow" style="display:block"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h3>${escapeHtml(ev.title)}</h3><p class="muted">${formatEventDate(ev.starts_at)}${ev.location_name?' · '+escapeHtml(ev.location_name):''} · ${eventPrice(ev)}</p></div><span class="tag">${ev.status==='draft'?'Черновик':'Опубликовано'}</span></div><div style="margin-top:10px"><button class="repeat invite-button" data-event-id="${escapeHtml(ev.id)}" data-event-title="${escapeHtml(ev.title)}">Пригласить</button></div><div class="invite-area" id="invite-${escapeHtml(ev.id)}"></div></div>`;
}

function invitedEventHtml(ev){
  const pending=ev.invitation_status==='pending';
  return `<div class="eventRow" style="display:block"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h3>${escapeHtml(ev.title)}</h3><p class="muted">${formatEventDate(ev.starts_at)}${ev.location_name?' · '+escapeHtml(ev.location_name):''} · ${eventPrice(ev)}</p></div><span class="tag">${pending?'Приглашение':'Иду'}</span></div>${pending?`<div style="display:flex;gap:8px;margin-top:10px"><button class="primary invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="accepted" style="width:auto;padding:10px 14px">Принять</button><button class="repeat invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="declined">Отклонить</button></div>`:''}</div>`;
}

function bindCalendarActions(){
  $$('.invite-button').forEach(button=>button.onclick=()=>showInviteForm(button.dataset.eventId,button.dataset.eventTitle));
  $$('.invite-response').forEach(button=>button.onclick=()=>respondInvitation(button.dataset.invitationId,button.dataset.response));
}

function showInviteForm(eventId,eventTitle){
  const area=document.getElementById('invite-'+eventId);
  if(!area)return;
  area.innerHTML=`<div class="panel" style="margin-top:12px;padding:14px"><p class="muted" style="margin-bottom:10px">Пригласить на «${escapeHtml(eventTitle)}»</p><label>Email<input type="email" class="invite-email" placeholder="name@example.com" required></label><div class="status invite-status" hidden></div><button class="primary send-invite" style="margin-top:10px">Отправить приглашение</button></div>`;
  const input=area.querySelector('.invite-email');
  const status=area.querySelector('.invite-status');
  const send=area.querySelector('.send-invite');
  input.focus();
  send.onclick=async()=>{
    const email=input.value.trim();
    if(!email){status.hidden=false;status.className='status error';status.textContent='Введите email';return}
    status.hidden=false;status.className='status';status.textContent='Отправляю…';
    send.disabled=true;
    try{
      await api('invite_by_email',{event_id:eventId,email});
      status.textContent='Приглашение отправлено. Событие опубликовано для приглашённых.';
      input.value='';
      await loadEvents();
    }catch(err){status.className='status error';status.textContent=err.message;send.disabled=false}
  };
}

async function respondInvitation(invitationId,response){
  try{
    await api('respond_invitation',{invitation_id:invitationId,response});
    await loadEvents();
  }catch(err){alert(err.message)}
}

async function loadEvents(){
  const root=$('#my-events');
  if(!root)return;
  if(!account){root.innerHTML='<p class="muted">Войдите, чтобы увидеть свои события.</p>';return}
  root.innerHTML='<p class="muted">Загружаю…</p>';
  try{
    const data=await api('list_events');
    const events=data.events||[];
    const invited=data.invited_events||[];
    let html='';
    if(invited.length){html+=`<div style="margin-bottom:24px"><span class="ey">МЕНЯ ПРИГЛАСИЛИ</span>${invited.map(invitedEventHtml).join('')}</div>`}
    html+=events.length?events.map(creatorEventHtml).join(''):'<p class="muted">Пока пусто. Создайте первое событие.</p>';
    root.innerHTML=html;
    bindCalendarActions();
  }catch(err){root.innerHTML=`<p class="muted">${escapeHtml(err.message)}</p>`}
}

(async function init(){
  await loadAccount();
  await loadEvents();
})();
