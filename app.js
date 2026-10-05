const API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-api';
const CALENDAR_AFISHA_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-afisha-api';
const STORAGE_KEY='vmeste_session_v1';
const PIN_KEY='lya_pin_v1';
const PIN_DEVICE_SESSION_KEY='lya_pin_device_session_v1';
const PIN_UNLOCK_KEY='lya_pin_unlocked_v1';
const PIN_FAIL_KEY='lya_pin_fail_v1';
const PENDING_INVITE_KEY='vmeste_pending_invite_v1';
const TZ='Europe/Moscow';
let session=loadSession();
let account=null;
let authMode='signup';
let recoveryMode=false;
let calendarEvents=[];
let calendarSuggestionCache=new Map();
let calendarSuggestionSeq=0;
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
function loadPinConfig(){try{return JSON.parse(localStorage.getItem(PIN_KEY)||'null')}catch{return null}}
function loadPinDeviceSession(){try{return JSON.parse(localStorage.getItem(PIN_DEVICE_SESSION_KEY)||'null')}catch{return null}}
function savePinDeviceSession(value){
  const cfg=loadPinConfig();
  if(!cfg||!value?.refresh_token)return;
  const user=value.user||{},userId=user.id||cfg.user_id||'',email=user.email||cfg.email||'';
  localStorage.setItem(PIN_DEVICE_SESSION_KEY,JSON.stringify({version:1,refresh_token:value.refresh_token,user_id:userId,email,updated_at:new Date().toISOString()}))
}
function saveSession(value){session=value;if(value){localStorage.setItem(STORAGE_KEY,JSON.stringify(value));savePinDeviceSession(value)}else localStorage.removeItem(STORAGE_KEY)}
function clearSession(){saveSession(null);account=null;updateAvatars()}
function clearPinFailures(){localStorage.removeItem(PIN_FAIL_KEY)}
function clearPinConfig(){localStorage.removeItem(PIN_KEY);localStorage.removeItem(PIN_DEVICE_SESSION_KEY);sessionStorage.removeItem(PIN_UNLOCK_KEY);clearPinFailures();const btn=$('#login-with-pin');if(btn)btn.hidden=true}
function markPinUnlocked(){sessionStorage.setItem(PIN_UNLOCK_KEY,'1')}
function pinIsUnlocked(){return sessionStorage.getItem(PIN_UNLOCK_KEY)==='1'}
function currentAuthUserId(){return account?.user?.id||session?.user?.id||''}
function currentAuthEmail(){return account?.user?.email||session?.user?.email||''}
function canUsePin(){
  const cfg=loadPinConfig(),device=loadPinDeviceSession();
  if(!cfg)return false;
  const hasCredential=!!(session?.access_token||session?.refresh_token||device?.refresh_token);
  if(!hasCredential)return false;
  const uid=session?.user?.id||device?.user_id||'';
  return !uid||!cfg.user_id||String(cfg.user_id)===String(uid)
}
function pinMatchesSession(){return canUsePin()}
function randomSalt(){
  const a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')
}
async function hashPin(pin,salt,userId){
  if(!crypto?.subtle)throw new Error('Этот браузер не поддерживает быстрый PIN. Используйте вход по паролю.');
  const bytes=new TextEncoder().encode(String(pin)+'|'+String(salt)+'|'+String(userId||''));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
}
async function saveLocalPin(pin){
  const userId=currentAuthUserId();if(!userId)throw new Error('Не удалось определить аккаунт');
  const salt=randomSalt(),hash=await hashPin(pin,salt,userId);
  localStorage.setItem(PIN_KEY,JSON.stringify({version:1,user_id:userId,email:currentAuthEmail(),salt,hash,created_at:new Date().toISOString()}));
  if(session?.refresh_token)savePinDeviceSession(session);
  const btn=$('#login-with-pin');if(btn)btn.hidden=false;
  clearPinFailures();markPinUnlocked()
}
function pinFailureState(){try{return JSON.parse(localStorage.getItem(PIN_FAIL_KEY)||'null')||{count:0,lock_until:0}}catch{return{count:0,lock_until:0}}}
function recordPinFailure(){
  const prev=pinFailureState(),now=Date.now();let count=prev.lock_until>now?prev.count:Number(prev.count||0)+1,lockUntil=Number(prev.lock_until||0);
  if(count>=5){lockUntil=now+30000;count=5}
  const state={count,lock_until:lockUntil};localStorage.setItem(PIN_FAIL_KEY,JSON.stringify(state));return state
}
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
  const type=params.get('type')||'';
  if(access_token&&refresh_token){
    recoveryMode=type==='recovery';
    saveSession({access_token,refresh_token,expires_at:Number(params.get('expires_at')||0),token_type:'bearer'});
    history.replaceState(null,'',location.pathname+location.search);
  }
}
captureAuthHash();

async function raw(action,payload={},token=''){
  const headers={'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  let response;
  try{
    response=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...payload})});
  }catch(e){
    return {ok:false,status:0,data:{error:'Не удалось связаться с сервером. Обновите страницу и попробуйте ещё раз.'}};
  }
  let data={};
  try{data=await response.json()}catch{data={error:'Некорректный ответ сервера'}}
  return {ok:response.ok,status:response.status,data};
}
let refreshSessionPromise=null;
async function refreshSession(){
  if(refreshSessionPromise)return refreshSessionPromise;
  const device=loadPinDeviceSession();
  const availableRefresh=session?.refresh_token||(pinIsUnlocked()&&device?.refresh_token)||'';
  if(!availableRefresh)return false;
  if(!session?.refresh_token&&device?.refresh_token){
    session={refresh_token:device.refresh_token,user:{id:device.user_id||'',email:device.email||''}};
  }
  refreshSessionPromise=(async()=>{
    const refreshToken=session&&session.refresh_token;
    const result=await raw('refresh',{refresh_token:refreshToken});
    if(!result.ok||!result.data.session){
      if([400,401,403].includes(result.status)&&session&&session.refresh_token===refreshToken)clearSession();
      return false;
    }
    saveSession(result.data.session);
    document.dispatchEvent(new CustomEvent('vmeste-session-refreshed',{detail:{session:result.data.session}}));
    return true;
  })();
  try{return await refreshSessionPromise}
  finally{refreshSessionPromise=null}
}
window.refreshSession=refreshSession;
window.getLyaAccessToken=function(){return session&&session.access_token||''};
window.lyaAuthedFetch=async function(url,options={},retry=true){
  var opts=Object.assign({},options);
  opts.headers=Object.assign({},options.headers||{});
  var t=session&&session.access_token||'';
  if(t)opts.headers.Authorization='Bearer '+t;
  var response=await fetch(url,opts);
  if((response.status===401||response.status===403)&&retry&&await refreshSession()){
    return window.lyaAuthedFetch(url,options,false);
  }
  return response;
};
async function api(action,payload={},needsAuth=true,retry=true){
  const result=await raw(action,payload,needsAuth?session?.access_token||'':'');
  if((result.status===401||result.status===403)&&needsAuth&&retry&&await refreshSession())return api(action,payload,true,false);
  if(!result.ok){const err=new Error(result.data.error||'Ошибка запроса');err.status=result.status;throw err}
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
$('.nav').forEach(b=>b.addEventListener('click',()=>{
  const go=b.dataset.go;
  const businessMode=typeof window.getLyaProfileMode==='function'&&window.getLyaProfileMode()==='business';
  if(businessMode&&go!=='create'&&typeof window.openLyaBusinessSection==='function'){window.openLyaBusinessSection(go);return}
  openView(go)
}));
$('.js-profile').forEach(b=>b.addEventListener('click',()=>{const businessMode=typeof window.getLyaProfileMode==='function'&&window.getLyaProfileMode()==='business';if(businessMode&&typeof window.openLyaBusinessHub==='function')window.openLyaBusinessHub();else openView('profile')}));
$$('.js-home').forEach(b=>b.addEventListener('click',()=>openView('home')));

function updateAvatars(){const letter=(account?.profile?.display_name||account?.user?.email||'В').trim().slice(0,1).toUpperCase()||'В';$$('.avatar').forEach(a=>a.textContent=letter)}
async function loadAccount(){
  if(!session?.access_token){account=null;updateAvatars();renderProfile();return false}
  try{account=await api('me');updateAvatars();renderProfile();return true}
  catch(e){
    if(e&&[401,403].includes(Number(e.status||0)))clearSession();
    account=null;updateAvatars();renderProfile();return false
  }
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
async function signOut(){try{if(session?.access_token)await api('logout')}catch{}try{localStorage.removeItem('lya_profile_mode_v1');localStorage.removeItem('lya_professional_kind_v1')}catch{}window.LyaBusinessState=null;clearPinConfig();clearSession();openView('home')}

function showStandardAuth(){
  $('#auth-tabs').hidden=false;$('#auth-form').hidden=false;$('#password-reset-request').hidden=true;$('#password-reset-new').hidden=true;$('#auth-title').textContent='Вход'
}
function setAuthMode(mode){
  showStandardAuth();authMode=mode;
  $('#signup-tab').classList.toggle('active',mode==='signup');$('#login-tab').classList.toggle('active',mode==='login');
  $('#name-field').style.display=mode==='signup'?'grid':'none';$('#auth-name').required=mode==='signup';
  $('#auth-submit').textContent=mode==='signup'?'Создать аккаунт':'Войти';
  $('#forgot-password').hidden=mode!=='login';$('#auth-status').hidden=true
}
function showLoginWithEmail(email,message){
  openView('login');setAuthMode('login');if(email)$('#auth-email').value=email;
  if(message){const st=$('#auth-status');st.hidden=false;st.className='status';st.textContent=message}
}
function openPasswordResetRequest(){
  $('#auth-tabs').hidden=true;$('#auth-form').hidden=true;$('#password-reset-new').hidden=true;$('#password-reset-request').hidden=false;
  $('#auth-title').textContent='Восстановить доступ';$('#reset-email').value=$('#auth-email').value||'';
  $('#reset-request-status').hidden=true;setTimeout(()=>$('#reset-email').focus(),0)
}
function openPasswordResetNew(){
  openView('login');$('#auth-tabs').hidden=true;$('#auth-form').hidden=true;$('#password-reset-request').hidden=true;$('#password-reset-new').hidden=false;
  $('#auth-title').textContent='Новый пароль';$('#reset-new-status').hidden=true;setTimeout(()=>$('#reset-new-password').focus(),0)
}
async function ensurePinSetup(){
  const cfg=loadPinConfig(),uid=currentAuthUserId();
  if(cfg&&uid&&String(cfg.user_id)===String(uid)){markPinUnlocked();return true}
  if(cfg)clearPinConfig();
  return showPinSetupGate()
}
function showPinSetupGate(){
  return new Promise(function(resolve){
    const gate=$('#pin-setup-gate'),form=$('#pin-setup-form'),a=$('#pin-setup-input'),b=$('#pin-setup-input-2'),status=$('#pin-setup-status');
    gate.hidden=false;a.value='';b.value='';status.hidden=true;
    const submit=async function(e){
      e.preventDefault();const pin=a.value.trim(),repeat=b.value.trim();
      status.hidden=true;
      if(!/^\d{4}$/.test(pin)){status.hidden=false;status.className='status error';status.textContent='PIN — ровно 4 цифры';a.focus();return}
      if(pin!==repeat){status.hidden=false;status.className='status error';status.textContent='PIN не совпадает';b.value='';b.focus();return}
      const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Сохраняю…';
      try{await saveLocalPin(pin);gate.hidden=true;resolve(true)}
      catch(err){status.hidden=false;status.className='status error';status.textContent=err.message;btn.disabled=false;btn.textContent='Сохранить PIN'}
    };
    form.onsubmit=submit;setTimeout(()=>a.focus(),0)
  })
}
function showPinUnlockGate(){
  return new Promise(function(resolve){
    const gate=$('#pin-gate'),form=$('#pin-unlock-form'),input=$('#pin-unlock-input'),status=$('#pin-unlock-status'),forgot=$('#pin-forgot'),cfg=loadPinConfig();
    if(!cfg){resolve(true);return}
    gate.hidden=false;input.value='';status.hidden=true;$('#pin-gate-user').textContent=cfg.email?cfg.email:'4 цифры';
    let settled=false;
    const finish=function(value){if(settled)return;settled=true;gate.hidden=true;resolve(value)};
    form.onsubmit=async function(e){
      e.preventDefault();const pin=input.value.trim(),state=pinFailureState(),now=Date.now();
      if(Number(state.lock_until||0)>now){const sec=Math.ceil((state.lock_until-now)/1000);status.hidden=false;status.className='status error';status.textContent='Слишком много попыток. Попробуйте через '+sec+' сек.';input.value='';return}
      if(!/^\d{4}$/.test(pin)){status.hidden=false;status.className='status error';status.textContent='Введите 4 цифры';return}
      try{
        const hash=await hashPin(pin,cfg.salt,cfg.user_id);
        if(hash!==cfg.hash){
          const fail=recordPinFailure();input.value='';status.hidden=false;status.className='status error';
          status.textContent=fail.lock_until>Date.now()?'Слишком много попыток. Подождите 30 секунд.':'PIN не подошёл. Осталось '+Math.max(0,5-fail.count)+' попытки.';input.focus();return
        }
        clearPinFailures();markPinUnlocked();
        if(!session?.access_token){
          const device=loadPinDeviceSession();
          if(!device?.refresh_token){
            sessionStorage.removeItem(PIN_UNLOCK_KEY);
            status.hidden=false;status.className='status error';status.textContent='На этом устройстве не сохранилась сессия. Один раз войдите по паролю — после этого PIN будет работать без него.';return
          }
          status.hidden=false;status.className='status';status.textContent='Восстанавливаю вход…';
          const restored=await refreshSession();
          if(!restored){
            sessionStorage.removeItem(PIN_UNLOCK_KEY);
            status.hidden=false;status.className='status error';status.textContent='Сессия устройства истекла. Один раз войдите по паролю и задайте PIN заново.';return
          }
        }
        finish(true)
      }catch(err){status.hidden=false;status.className='status error';status.textContent=err.message}
    };
    input.oninput=function(){input.value=input.value.replace(/\D/g,'').slice(0,4);if(input.value.length===4)form.requestSubmit()};
    forgot.onclick=function(){
      const email=cfg.email||session?.user?.email||'';clearPinConfig();clearSession();finish(false);
      setTimeout(()=>showLoginWithEmail(email,'Введите пароль аккаунта и задайте новый PIN.'),0)
    };
    setTimeout(()=>input.focus(),0)
  })
}
$('#signup-tab').onclick=()=>setAuthMode('signup');$('#login-tab').onclick=()=>setAuthMode('login');
const pinLoginButton=$('#login-with-pin');
if(pinLoginButton)pinLoginButton.onclick=async function(){
  pinLoginButton.disabled=true;
  try{
    if(!canUsePin())throw new Error('PIN-вход на этом устройстве пока недоступен');
    const ok=await showPinUnlockGate();if(!ok)return;
    const loaded=await loadAccount();if(!loaded)throw new Error('Не удалось загрузить профиль после PIN-входа');
    openView('home');document.dispatchEvent(new CustomEvent('vmeste-auth-changed',{detail:{signedIn:true,pin:true}}))
  }catch(err){const st=$('#auth-status');st.hidden=false;st.className='status error';st.textContent=err.message}
  finally{pinLoginButton.disabled=false}
};
$('#forgot-password').onclick=openPasswordResetRequest;
$('#reset-request-back').onclick=()=>setAuthMode('login');
$('#password-reset-request-form').onsubmit=async function(e){
  e.preventDefault();const status=$('#reset-request-status'),email=$('#reset-email').value.trim(),btn=e.target.querySelector('button[type="submit"]');
  status.hidden=false;status.className='status';status.textContent='Отправляю письмо…';btn.disabled=true;
  try{const d=await api('request_password_reset',{email},false);status.textContent=d.message||'Если аккаунт существует, письмо отправлено.'}
  catch(err){status.className='status error';status.textContent=err.message}
  finally{btn.disabled=false}
};
$('#reset-new-restart').onclick=function(){clearSession();recoveryMode=false;openPasswordResetRequest()};
$('#password-reset-new-form').onsubmit=async function(e){
  e.preventDefault();const a=$('#reset-new-password').value,b=$('#reset-new-password-2').value,status=$('#reset-new-status'),btn=e.target.querySelector('button[type="submit"]');
  status.hidden=false;status.className='status';
  if(a.length<6){status.className='status error';status.textContent='Пароль должен быть не короче 6 символов';return}
  if(a!==b){status.className='status error';status.textContent='Пароли не совпадают';return}
  btn.disabled=true;status.textContent='Сохраняю новый пароль…';
  try{
    await api('update_password',{password:a});
    clearPinConfig();
    const ok=await loadAccount();if(!ok)throw new Error('Пароль сохранён, но не удалось загрузить профиль. Войдите ещё раз по почте и новому паролю.');
    await ensurePinSetup();recoveryMode=false;openView('home');
    document.dispatchEvent(new CustomEvent('vmeste-auth-changed',{detail:{signedIn:true,recovered:true}}))
  }catch(err){status.className='status error';status.textContent=err.message}
  finally{btn.disabled=false}
};
$('#auth-form').onsubmit=async e=>{
  e.preventDefault();const status=$('#auth-status');status.hidden=false;status.className='status';status.textContent=authMode==='signup'?'Создаю аккаунт…':'Вхожу…';const email=$('#auth-email').value.trim();const password=$('#auth-password').value;
  try{
    if(authMode==='signup'){
      const data=await api('signup',{email,password,display_name:$('#auth-name').value.trim(),invite_token:pendingInviteToken||null},false);
      if(!data.session)throw new Error('Аккаунт создан, но сессия не получена');
      saveSession(data.session);markPinUnlocked();
      const ok=await loadAccount();
      if(!ok)throw new Error('Аккаунт создан, но профиль не загрузился');
      await ensurePinSetup();
      status.hidden=false;status.className='status';status.textContent='Готово';
      if(pendingInviteToken)await showPendingInvite();
      else{
        openView('home');
        document.dispatchEvent(new CustomEvent('vmeste-auth-changed',{detail:{signedIn:true}}));
      }
    }else{
      if(!email||password.length<6)throw new Error('Введите почту и пароль');
      const data=await api('login',{email,password},false);
      if(!data.session)throw new Error('Сессия входа не получена');
      saveSession(data.session);markPinUnlocked();
      const ok=await loadAccount();
      if(!ok)throw new Error('Не удалось загрузить профиль после входа');
      await ensurePinSetup();
      if(pendingInviteToken)await showPendingInvite();
      else{
        openView('home');
        document.dispatchEvent(new CustomEvent('vmeste-auth-changed',{detail:{signedIn:true}}));
      }
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
  return `<article class="calendarEvent"><div class="eventKind">${own?'МОЁ СОБЫТИЕ':pending?'МЕНЯ ПРИГЛАСИЛИ':'Я УЧАСТВУЮ'}</div><div class="calendarEventTop"><div><h3>${escapeHtml(ev.title)}</h3><p class="muted">${eventTime(ev.starts_at)}${ev.location_name?' · '+escapeHtml(ev.location_name):''} · ${eventPrice(ev)}</p></div><span class="tag">${eventBadge(ev)}</span></div><div class="calendarEventActions">${own?`<button class="smallPrimary invite-circle-button" data-event-id="${escapeHtml(ev.id)}">Позвать своих</button><button class="repeat invite-link-button" data-event-id="${escapeHtml(ev.id)}" data-event-title="${escapeHtml(ev.title)}">По ссылке</button>`:''}${pending?`<button class="smallPrimary invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="accepted">Принять</button><button class="repeat invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="declined">Отклонить</button>`:''}</div><div class="invite-area" id="invite-${escapeHtml(ev.id)}"></div></article>`;
}
const CALENDAR_AFISHA_CATEGORIES={cinema:'Кино',music:'Музыка',theatre:'Театр',humor:'Юмор',exhibition:'Выставка',fair:'Ярмарка',kids:'С детьми',walks:'Прогулка',food:'Еда',sport:'Спорт',lya:'Событие ЛЯ'};
function calendarSuggestionHtml(ev){
  const isLya=ev.source_type==='lya'||ev.category==='lya';
  const meta=[eventTime(ev.starts_at),CALENDAR_AFISHA_CATEGORIES[ev.category]||'Событие',ev.venue||'Место уточняется'].filter(Boolean).join(' · ');
  const action=isLya
    ?'<button class="calendarSuggestionAction" data-calendar-lya-event="'+escapeHtml(ev.event_id||ev.id)+'">Открыть</button>'
    :'<button class="calendarSuggestionAction" data-calendar-afisha-invite="'+escapeHtml(ev.id)+'">Позвать своих</button>';
  return '<article class="calendarSuggestion"><div class="calendarSuggestionBody"><div class="eventKind">'+escapeHtml(CALENDAR_AFISHA_CATEGORIES[ev.category]||'СОБЫТИЕ')+'</div><h3>'+escapeHtml(ev.title||'Событие')+'</h3><p>'+escapeHtml(meta)+'</p></div>'+action+'</article>';
}
async function fetchCalendarSuggestions(key){
  if(calendarSuggestionCache.has(key))return calendarSuggestionCache.get(key);
  const opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feed',city:(account&&account.profile&&account.profile.city)||'Ростов-на-Дону',date:key})};
  const response=window.lyaAuthedFetch?await window.lyaAuthedFetch(CALENDAR_AFISHA_API,opts,true):await fetch(CALENDAR_AFISHA_API,opts);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Не удалось загрузить события дня');
  const items=(data.events||[]).filter(ev=>dateKey(ev.starts_at)===key);
  calendarSuggestionCache.set(key,items);
  return items;
}
async function loadCalendarSuggestions(key){
  const host=document.querySelector('.calendarSuggestions[data-date="'+CSS.escape(key)+'"]');if(!host)return;
  const seq=++calendarSuggestionSeq;
  try{
    const items=await fetchCalendarSuggestions(key);
    if(seq!==calendarSuggestionSeq||selectedDateKey!==key)return;
    const current=document.querySelector('.calendarSuggestions[data-date="'+CSS.escape(key)+'"]');if(!current)return;
    const visible=items.slice(0,5);
    current.innerHTML=visible.length?visible.map(calendarSuggestionHtml).join(''):'<div class="calendarSuggestionEmpty">На эту дату пока не нашли готовых событий.</div>';
    bindCalendarActions();
  }catch(err){
    const current=document.querySelector('.calendarSuggestions[data-date="'+CSS.escape(key)+'"]');if(current)current.innerHTML='<div class="calendarSuggestionEmpty">'+escapeHtml(err.message)+'</div>';
  }
}
function renderDayEvents(){
  const root=$('#day-events');if(!root)return;
  $('#selected-date-title').textContent=fullDateLabel(selectedDateKey);
  const events=eventsForDate(selectedDateKey);
  const planned='<section class="calendarDaySection"><div class="calendarDaySectionHead"><span class="ey">ВАШИ ПЛАНЫ</span><span>'+events.length+'</span></div>'+(events.length?events.map(dayEventHtml).join(''):'<div class="emptyDay">На этот день у вас пока ничего не запланировано.</div>')+'</section>';
  const discover=selectedDateKey>=todayKey()
    ?'<section class="calendarDaySection calendarDayDiscovery"><div class="calendarDaySectionHead"><div><span class="ey">СОБЫТИЯ НА ЭТОТ ДЕНЬ</span><h3>Что можно сделать вместе</h3></div></div><div class="calendarSuggestions" data-date="'+escapeHtml(selectedDateKey)+'"><p class="muted">Загружаю события дня…</p></div><button class="repeat calendar-discover-button" data-date="'+escapeHtml(selectedDateKey)+'">Все события дня</button></section>'
    :'';
  root.innerHTML=planned+discover;
  bindCalendarActions();
  if(selectedDateKey>=todayKey())loadCalendarSuggestions(selectedDateKey);
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
  $$('.invite-circle-button').forEach(button=>button.onclick=()=>{if(typeof window.openEventCircleInvitePicker==='function')window.openEventCircleInvitePicker(button.dataset.eventId);else openEventView(button.dataset.eventId,'calendar')});
  $$('.invite-link-button').forEach(button=>button.onclick=()=>showInviteLink(button.dataset.eventId,button.dataset.eventTitle));
  $$('.invite-response').forEach(button=>button.onclick=()=>respondInvitation(button.dataset.invitationId,button.dataset.response));
  $$('.calendar-discover-button').forEach(button=>button.onclick=()=>{if(typeof window.openAfishaForDate==='function')window.openAfishaForDate(button.dataset.date)});
  $$('[data-calendar-afisha-invite]').forEach(button=>button.onclick=()=>{if(typeof window.collectAfishaCompany==='function')window.collectAfishaCompany(button.dataset.calendarAfishaInvite);else if(typeof window.openAfishaForDate==='function')window.openAfishaForDate(selectedDateKey)});
  $$('[data-calendar-lya-event]').forEach(button=>button.onclick=()=>{if(typeof openEventView==='function')openEventView(button.dataset.calendarLyaEvent,'calendar')});
}
async function showInviteLink(eventId,eventTitle){
  const area=document.getElementById('invite-'+eventId);if(!area)return;area.innerHTML='<div class="inviteBox">Создаю ссылку…</div>';
  try{
    const data=await api('create_invite_link',{event_id:eventId});const url=data.invite_url;
    area.innerHTML=`<div class="inviteBox"><div class="ey">ССЫЛКА-ПРИГЛАШЕНИЕ</div><p class="muted" style="margin:6px 0 10px">Можно отправить в любой мессенджер.</p><input class="inviteLink" value="${escapeHtml(url)}" readonly><div class="inviteLinkActions"><button class="repeat copy-invite">Копировать</button><button class="smallPrimary share-invite">Поделиться</button></div><div class="shareOk" hidden></div></div>`;
    const ok=area.querySelector('.shareOk');area.querySelector('.copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(url);ok.hidden=false;ok.textContent='Ссылка скопирована'}catch{const input=area.querySelector('.inviteLink');input.select();document.execCommand('copy');ok.hidden=false;ok.textContent='Ссылка скопирована'}};
    area.querySelector('.share-invite').onclick=async()=>{if(navigator.share){try{await navigator.share({title:eventTitle,text:`Приглашаю на «${eventTitle}» в ЛЯ`,url})}catch{}}else{await navigator.clipboard.writeText(url);ok.hidden=false;ok.textContent='Ссылка скопирована — вставьте её в мессенджер'}};
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
    overlay.innerHTML=`<div class="inviteSheet"><div class="ey">ВАС ПРИГЛАСИЛИ</div><h2>${escapeHtml(ev.title)}</h2><p class="muted">${escapeHtml(ev.creator_name)} приглашает вас в ЛЯ.</p><div class="inviteSheetMeta"><b>${formatEventDate(ev.starts_at)}</b><p class="muted" style="margin-top:6px">${ev.location_name?escapeHtml(ev.location_name)+' · ':''}${eventPrice(ev)}</p></div><div class="inviteSheetActions">${account?'<button class="primary accept-link-invite">Принять приглашение</button>':'<button class="primary login-for-invite">Войти или зарегистрироваться</button>'}</div><button class="inviteClose">Не сейчас</button><div class="status invite-overlay-status" hidden></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.inviteClose').onclick=removeInviteOverlay;
    if(account){overlay.querySelector('.accept-link-invite').onclick=async()=>{const status=overlay.querySelector('.invite-overlay-status');status.hidden=false;status.className='status';status.textContent='Добавляю событие в календарь…';try{await api('accept_invite_link',{token:pendingInviteToken});clearInviteFromUrl();removeInviteOverlay();selectedDateKey=dateKey(ev.starts_at);calendarYear=Number(selectedDateKey.slice(0,4));calendarMonth=Number(selectedDateKey.slice(5,7))-1;calendarMode='day';await loadEvents();openView('calendar')}catch(err){status.className='status error';status.textContent=err.message}}}
    else{overlay.querySelector('.login-for-invite').onclick=()=>{removeInviteOverlay();openView('login');const status=$('#auth-status');status.hidden=false;status.className='status';status.textContent='Войдите или зарегистрируйтесь, чтобы принять приглашение.'}}
  }catch(err){
    const overlay=document.createElement('div');overlay.className='inviteOverlay';overlay.innerHTML=`<div class="inviteSheet"><div class="ey">ПРИГЛАШЕНИЕ</div><h2>Ссылка недоступна</h2><p class="muted">${escapeHtml(err.message)}</p><button class="primary close-bad-invite" style="margin-top:16px">Закрыть</button></div>`;document.body.appendChild(overlay);overlay.querySelector('.close-bad-invite').onclick=()=>{clearInviteFromUrl();removeInviteOverlay()};
  }
}

(async function init(){
  renderCalendar();
  if(recoveryMode){
    clearPinConfig();openPasswordResetNew();return
  }
  if(session?.refresh_token&&loadPinConfig())savePinDeviceSession(session);
  const pinButton=$('#login-with-pin');if(pinButton)pinButton.hidden=!canUsePin();
  const startedWithSession=!!(session?.access_token||session?.refresh_token||loadPinDeviceSession()?.refresh_token);
  if(startedWithSession&&pinMatchesSession()&&!pinIsUnlocked()){
    const unlocked=await showPinUnlockGate();
    if(!unlocked){await loadEvents();renderCalendar();return}
  }
  if(!session?.access_token&&pinIsUnlocked()&&loadPinDeviceSession()?.refresh_token)await refreshSession();
  const ok=await loadAccount();
  if(ok){
    await ensurePinSetup();
    if(document.querySelector('[data-view="login"].active'))openView('home')
  }else if(startedWithSession&&!session?.access_token){
    showLoginWithEmail(loadPinConfig()?.email||'','Сессия закончилась. Войдите по почте и паролю — все данные аккаунта сохранены.')
  }
  await loadEvents();renderCalendar();if(pendingInviteToken)await showPendingInvite()
})();
