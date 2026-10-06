(function(){
  if(window.__lyaAuthCoreV2)return;
  window.__lyaAuthCoreV2=true;

  const API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-api';
  const SESSION_KEY='vmeste_session_v1';
  const PIN_KEY='lya_pin_v1';
  const DEVICE_KEY='lya_pin_device_session_v1';
  const PIN_UNLOCK_KEY='lya_pin_unlocked_v1';
  const PIN_FAIL_KEY='lya_pin_fail_v1';

  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
  function storedSession(){return readJson(SESSION_KEY)}
  function pinConfig(){return readJson(PIN_KEY)}
  function deviceSession(){return readJson(DEVICE_KEY)}
  function setSession(value){
    try{session=value}catch(e){}
    if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
  }
  function setAccount(value){
    try{account=value}catch(e){}
    if(typeof updateAvatars==='function')try{updateAvatars()}catch(e){}
  }
  function clearNormalSession(){setSession(null);setAccount(null)}
  function hasPinDevice(){
    const cfg=pinConfig(),dev=deviceSession();
    if(!cfg||!dev||!dev.refresh_token)return false;
    if(cfg.user_id&&dev.user_id&&String(cfg.user_id)!==String(dev.user_id))return false;
    return true;
  }
  function emit(detail){document.dispatchEvent(new CustomEvent('vmeste-auth-changed',{detail:Object.assign({signedIn:true},detail||{})}))}
  function showView(name){
    if(typeof openView==='function'){try{openView(name);return}catch(e){}}
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
    const bottom=document.getElementById('bottom-nav');if(bottom)bottom.style.display=(name==='profile'||name==='login')?'none':'grid';
    window.scrollTo(0,0);
  }
  function status(message,error){
    const el=document.getElementById('auth-status');if(!el)return;
    el.hidden=false;el.className=error?'status error':'status';el.textContent=message;
  }
  async function request(action,payload,token){
    let r;
    try{
      r=await fetch(API,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:JSON.stringify(Object.assign({action},payload||{}))});
    }catch(e){
      const err=new Error('Не удалось связаться с сервером. Попробуйте ещё раз.');
      err.status=0;throw err;
    }
    const d=await r.json().catch(()=>({}));
    if(!r.ok){
      const err=new Error(d.error||'Ошибка запроса');err.status=r.status;throw err;
    }
    return d;
  }
  async function hydrate(s){
    s=s||storedSession();
    if(!s||!s.access_token)return false;
    try{
      const d=await request('me',{},s.access_token);
      setSession(s);setAccount(d);
      emit({restored:true});
      if(document.querySelector('[data-view="profile"]')?.classList.contains('active')&&typeof window.renderProfileV2==='function'){
        try{await window.renderProfileV2()}catch(e){}
      }
      return true;
    }catch(err){
      if(err&&[401,403].includes(Number(err.status||0)))return false;
      throw err;
    }
  }
  async function refreshFromDevice(){
    const dev=deviceSession();if(!dev?.refresh_token)return false;
    try{
      const d=await request('refresh',{refresh_token:dev.refresh_token},'');
      if(!d.session)return false;
      setSession(d.session);
      localStorage.setItem(DEVICE_KEY,JSON.stringify({
        version:1,
        refresh_token:d.session.refresh_token,
        user_id:d.session.user?.id||dev.user_id||'',
        email:d.session.user?.email||dev.email||'',
        updated_at:new Date().toISOString()
      }));
      return await hydrate(d.session);
    }catch(err){return false}
  }
  async function hashPin(pin,salt,userId){
    const bytes=new TextEncoder().encode(String(pin)+'|'+String(salt)+'|'+String(userId||''));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  function randomSalt(){
    const a=new Uint8Array(16);crypto.getRandomValues(a);
    return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function failureState(){try{return JSON.parse(localStorage.getItem(PIN_FAIL_KEY)||'null')||{count:0,lock_until:0}}catch(e){return{count:0,lock_until:0}}}
  function recordFailure(){
    const prev=failureState(),now=Date.now();let count=Number(prev.count||0)+1,lock=0;
    if(count>=5){count=5;lock=now+30000}
    const st={count,lock_until:lock};localStorage.setItem(PIN_FAIL_KEY,JSON.stringify(st));return st;
  }
  function clearFailures(){localStorage.removeItem(PIN_FAIL_KEY)}
  function ensureSkipButton(){
    const card=document.querySelector('#pin-setup-gate .pinGateCard');if(!card)return null;
    let b=card.querySelector('#pin-setup-skip');
    if(!b){b=document.createElement('button');b.type='button';b.id='pin-setup-skip';b.className='authLink';b.textContent='Не сейчас';card.appendChild(b)}
    return b;
  }
  async function offerPinSetup(){
    const s=storedSession();if(!s?.refresh_token||!s?.user?.id)return false;
    const existing=pinConfig();
    if(existing&&String(existing.user_id||'')===String(s.user.id))return true;
    return new Promise(resolve=>{
      const gate=document.getElementById('pin-setup-gate'),form=document.getElementById('pin-setup-form');
      const a=document.getElementById('pin-setup-input'),b=document.getElementById('pin-setup-input-2'),st=document.getElementById('pin-setup-status');
      if(!gate||!form||!a||!b){resolve(false);return}
      const skip=ensureSkipButton();
      gate.hidden=false;a.value='';b.value='';st.hidden=true;
      const finish=value=>{gate.hidden=true;form.onsubmit=null;if(skip)skip.onclick=null;resolve(value)};
      form.onsubmit=async e=>{
        e.preventDefault();const pin=a.value.trim(),repeat=b.value.trim();
        st.hidden=true;
        if(!/^\d{4}$/.test(pin)){st.hidden=false;st.className='status error';st.textContent='PIN — ровно 4 цифры';return}
        if(pin!==repeat){st.hidden=false;st.className='status error';st.textContent='PIN не совпадает';b.value='';return}
        const btn=form.querySelector('button[type="submit"]');btn.disabled=true;
        try{
          const salt=randomSalt(),hash=await hashPin(pin,salt,s.user.id);
          localStorage.setItem(PIN_KEY,JSON.stringify({version:2,user_id:s.user.id,email:s.user.email||'',salt,hash,created_at:new Date().toISOString()}));
          localStorage.setItem(DEVICE_KEY,JSON.stringify({version:2,refresh_token:s.refresh_token,user_id:s.user.id,email:s.user.email||'',updated_at:new Date().toISOString()}));
          sessionStorage.setItem(PIN_UNLOCK_KEY,'1');clearFailures();finish(true);
        }catch(err){st.hidden=false;st.className='status error';st.textContent=err.message||'Не удалось сохранить PIN'}
        finally{btn.disabled=false}
      };
      if(skip)skip.onclick=()=>finish(false);
      setTimeout(()=>a.focus(),0);
    });
  }
  async function pinUnlock(){
    const cfg=pinConfig(),dev=deviceSession();
    if(!cfg||!dev?.refresh_token)return false;
    return new Promise(resolve=>{
      const gate=document.getElementById('pin-gate'),form=document.getElementById('pin-unlock-form'),input=document.getElementById('pin-unlock-input');
      const st=document.getElementById('pin-unlock-status'),forgot=document.getElementById('pin-forgot'),label=document.getElementById('pin-gate-user');
      if(!gate||!form||!input){resolve(false);return}
      gate.hidden=false;input.value='';st.hidden=true;if(label)label.textContent=cfg.email||dev.email||'4 цифры';
      let settled=false;
      const finish=value=>{if(settled)return;settled=true;gate.hidden=true;form.onsubmit=null;input.oninput=null;if(forgot)forgot.onclick=null;resolve(value)};
      form.onsubmit=async e=>{
        e.preventDefault();
        const state=failureState(),now=Date.now();
        if(Number(state.lock_until||0)>now){st.hidden=false;st.className='status error';st.textContent='Слишком много попыток. Попробуйте через '+Math.ceil((state.lock_until-now)/1000)+' сек.';return}
        const pin=input.value.trim();if(!/^\d{4}$/.test(pin)){st.hidden=false;st.className='status error';st.textContent='Введите 4 цифры';return}
        try{
          const hash=await hashPin(pin,cfg.salt,cfg.user_id);
          if(hash!==cfg.hash){
            const f=recordFailure();input.value='';st.hidden=false;st.className='status error';st.textContent=f.lock_until?'Слишком много попыток. Подождите 30 секунд.':'PIN не подошёл.';return;
          }
          clearFailures();sessionStorage.setItem(PIN_UNLOCK_KEY,'1');st.hidden=false;st.className='status';st.textContent='Восстанавливаю вход…';
          const ok=await refreshFromDevice();
          if(!ok){st.hidden=false;st.className='status error';st.textContent='Сессия устройства истекла. Войдите по почте и паролю.';return}
          finish(true);
        }catch(err){st.hidden=false;st.className='status error';st.textContent=err.message||'Не удалось войти по PIN'}
      };
      input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,4);if(input.value.length===4)form.requestSubmit()};
      if(forgot)forgot.onclick=()=>{finish(false);openLogin(cfg.email||dev.email||'','Введите почту и пароль.')};
      setTimeout(()=>input.focus(),0);
    });
  }
  function setMode(mode){
    const tabs=document.getElementById('auth-tabs'),form=document.getElementById('auth-form'),resetReq=document.getElementById('password-reset-request'),resetNew=document.getElementById('password-reset-new');
    if(tabs)tabs.hidden=false;if(form)form.hidden=false;if(resetReq)resetReq.hidden=true;if(resetNew)resetNew.hidden=true;
    const title=document.getElementById('auth-title');if(title)title.textContent=mode==='signup'?'Регистрация':'Вход';
    const signup=document.getElementById('signup-tab'),login=document.getElementById('login-tab');
    if(signup)signup.classList.toggle('active',mode==='signup');if(login)login.classList.toggle('active',mode==='login');
    const nameField=document.getElementById('name-field'),name=document.getElementById('auth-name');
    if(nameField)nameField.style.display=mode==='signup'?'grid':'none';if(name)name.required=mode==='signup';
    const submit=document.getElementById('auth-submit');if(submit)submit.textContent=mode==='signup'?'Создать аккаунт':'Войти';
    const forgot=document.getElementById('forgot-password');if(forgot)forgot.hidden=mode!=='login';
    const st=document.getElementById('auth-status');if(st)st.hidden=true;
    window.__lyaAuthMode=mode;
  }
  function openLogin(email,message){
    showView('login');setMode('login');
    const el=document.getElementById('auth-email');if(email&&el)el.value=email;
    if(message)status(message,false);
  }
  async function afterPasswordAuth(s,source){
    setSession(s);
    const ok=await hydrate(s);
    if(!ok)throw new Error('Не удалось загрузить профиль');
    showView('home');emit({source});
    if(!pinConfig()||String(pinConfig()?.user_id||'')!==String(s.user?.id||''))setTimeout(()=>offerPinSetup(),120);
  }
  function enhancePasswordFields(){
    ['auth-password','reset-new-password','reset-new-password-2'].forEach(id=>{
      const input=document.getElementById(id);if(!input||input.parentElement?.querySelector('.lyaPasswordToggle'))return;
      const wrap=document.createElement('div');wrap.className='lyaPasswordField';
      input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
      const btn=document.createElement('button');btn.type='button';btn.className='lyaPasswordToggle';btn.setAttribute('aria-label','Показать пароль');btn.textContent='Показать';
      btn.onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Скрыть':'Показать';btn.setAttribute('aria-label',show?'Скрыть пароль':'Показать пароль')};
      wrap.appendChild(btn);
    });
  }
  function bind(){
    setMode('login');
    enhancePasswordFields();
    const signup=document.getElementById('signup-tab'),login=document.getElementById('login-tab');
    if(signup)signup.onclick=()=>setMode('signup');
    if(login)login.onclick=()=>setMode('login');

    const form=document.getElementById('auth-form');
    if(form)form.onsubmit=async e=>{
      e.preventDefault();
      const mode=window.__lyaAuthMode||'login';
      const email=document.getElementById('auth-email')?.value.trim()||'';
      const password=document.getElementById('auth-password')?.value||'';
      const name=document.getElementById('auth-name')?.value.trim()||'';
      const submit=document.getElementById('auth-submit');if(submit)submit.disabled=true;
      status(mode==='signup'?'Создаю аккаунт…':'Вхожу…',false);
      try{
        const d=await request(mode==='signup'?'signup':'login',mode==='signup'?{email,password,display_name:name}:{email,password},'');
        if(!d.session)throw new Error('Сессия входа не получена');
        await afterPasswordAuth(d.session,mode);
      }catch(err){status(err.message||'Не удалось войти',true)}
      finally{if(submit)submit.disabled=false}
    };

    const pinBtn=document.getElementById('login-with-pin');
    if(pinBtn){
      pinBtn.hidden=!hasPinDevice();
      pinBtn.onclick=async()=>{pinBtn.disabled=true;try{const ok=await pinUnlock();if(ok)showView('home')}finally{pinBtn.disabled=false}};
    }

    const forgot=document.getElementById('forgot-password');
    if(forgot)forgot.onclick=()=>{
      const tabs=document.getElementById('auth-tabs'),form=document.getElementById('auth-form'),req=document.getElementById('password-reset-request'),title=document.getElementById('auth-title');
      if(tabs)tabs.hidden=true;if(form)form.hidden=true;if(req)req.hidden=false;if(title)title.textContent='Восстановить доступ';
      const e=document.getElementById('reset-email'),src=document.getElementById('auth-email');if(e&&src)e.value=src.value||'';
    };
    const resetBack=document.getElementById('reset-request-back');if(resetBack)resetBack.onclick=()=>setMode('login');
    const resetForm=document.getElementById('password-reset-request-form');
    if(resetForm)resetForm.onsubmit=async e=>{
      e.preventDefault();const email=document.getElementById('reset-email')?.value.trim()||'',st=document.getElementById('reset-request-status'),btn=resetForm.querySelector('button[type="submit"]');
      if(st){st.hidden=false;st.className='status';st.textContent='Отправляю письмо…'}if(btn)btn.disabled=true;
      try{const d=await request('request_password_reset',{email},'');if(st)st.textContent=d.message||'Письмо отправлено.'}
      catch(err){if(st){st.className='status error';st.textContent=err.message||'Не удалось отправить письмо'}}
      finally{if(btn)btn.disabled=false}
    };
  }
  async function ensure(){
    const s=storedSession();
    if(s?.access_token){
      try{if(await hydrate(s))return true}catch(e){}
    }
    if(hasPinDevice()){
      clearNormalSession();
      const ok=await pinUnlock();if(ok)return true;
    }
    setAccount(null);
    openLogin(pinConfig()?.email||deviceSession()?.email||'');
    return false;
  }
  async function boot(){
    bind();
    const s=storedSession();
    if(s?.access_token){
      try{
        if(await hydrate(s))return;
      }catch(e){
        if(Number(e.status||0)===0)return;
      }
    }
    if(hasPinDevice()){
      clearNormalSession();
      const ok=await pinUnlock();if(ok){showView('home');return}
    }else if(s){
      clearNormalSession();
      openLogin(s?.user?.email||'','Сессия истекла. Войдите по почте и паролю.');
    }
  }

  window.LyaAuth={ensure,openLogin,offerPinSetup,hasSession:()=>!!storedSession()?.access_token,hydrate,boot};
  document.addEventListener('DOMContentLoaded',boot,{once:true});
})();