(function(){
  if(window.__lyaAuthRuntimeLoaded)return;
  window.__lyaAuthRuntimeLoaded=true;

  function hasStoredSession(){
    try{
      var s=JSON.parse(localStorage.getItem('vmeste_session_v1')||'null');
      return !!(s&&(s.access_token||s.refresh_token));
    }catch(e){return false}
  }

  async function syncAccount(){
    try{
      if(typeof session==='undefined')return false;
      if(!session?.access_token&&session?.refresh_token&&typeof refreshSession==='function'){
        await refreshSession();
      }
      if(!session?.access_token){
        try{account=null}catch(e){}
        return false;
      }
      var data=await api('me');
      account=data;
      if(typeof updateAvatars==='function')updateAvatars();
      return true;
    }catch(err){
      if(err&&[401,403].includes(Number(err.status||0))&&typeof clearSession==='function')clearSession();
      try{account=null}catch(e){}
      return false;
    }
  }

  window.lyaHasSession=hasStoredSession;
  window.lyaEnsureAccount=async function(){
    try{if(typeof account!=='undefined'&&account)return true}catch(e){}
    return syncAccount();
  };

  function emitAuth(detail){
    document.dispatchEvent(new CustomEvent('vmeste-auth-changed',{detail:Object.assign({signedIn:true},detail||{})}));
  }

  function bindAuthUi(){
    var signup=document.querySelector('#signup-tab');
    var login=document.querySelector('#login-tab');
    if(signup)signup.onclick=function(){setAuthMode('signup')};
    if(login)login.onclick=function(){setAuthMode('login')};

    var pinLoginButton=document.querySelector('#login-with-pin');
    if(pinLoginButton){
      pinLoginButton.hidden=!canUsePin();
      pinLoginButton.onclick=async function(){
        pinLoginButton.disabled=true;
        try{
          if(!canUsePin())throw new Error('PIN-вход на этом устройстве пока недоступен');
          var ok=await showPinUnlockGate();if(!ok)return;
          var loaded=await syncAccount();if(!loaded)throw new Error('Не удалось загрузить профиль после PIN-входа');
          openView('home');emitAuth({pin:true})
        }catch(err){
          var st=document.querySelector('#auth-status');
          if(st){st.hidden=false;st.className='status error';st.textContent=err.message}
        }finally{pinLoginButton.disabled=false}
      };
    }

    var forgot=document.querySelector('#forgot-password');
    if(forgot)forgot.onclick=openPasswordResetRequest;

    var resetBack=document.querySelector('#reset-request-back');
    if(resetBack)resetBack.onclick=function(){setAuthMode('login')};

    var resetRequest=document.querySelector('#password-reset-request-form');
    if(resetRequest)resetRequest.onsubmit=async function(e){
      e.preventDefault();
      var status=document.querySelector('#reset-request-status');
      var email=document.querySelector('#reset-email').value.trim();
      var btn=e.target.querySelector('button[type="submit"]');
      status.hidden=false;status.className='status';status.textContent='Отправляю письмо…';btn.disabled=true;
      try{
        var d=await api('request_password_reset',{email:email},false);
        status.textContent=d.message||'Если аккаунт существует, письмо отправлено.'
      }catch(err){status.className='status error';status.textContent=err.message}
      finally{btn.disabled=false}
    };

    var resetRestart=document.querySelector('#reset-new-restart');
    if(resetRestart)resetRestart.onclick=function(){clearSession();recoveryMode=false;openPasswordResetRequest()};

    var resetNew=document.querySelector('#password-reset-new-form');
    if(resetNew)resetNew.onsubmit=async function(e){
      e.preventDefault();
      var a=document.querySelector('#reset-new-password').value;
      var b=document.querySelector('#reset-new-password-2').value;
      var status=document.querySelector('#reset-new-status');
      var btn=e.target.querySelector('button[type="submit"]');
      status.hidden=false;status.className='status';
      if(a.length<6){status.className='status error';status.textContent='Пароль должен быть не короче 6 символов';return}
      if(a!==b){status.className='status error';status.textContent='Пароли не совпадают';return}
      btn.disabled=true;status.textContent='Сохраняю новый пароль…';
      try{
        await api('update_password',{password:a});
        clearPinConfig();
        var ok=await syncAccount();
        if(!ok)throw new Error('Пароль сохранён, но не удалось загрузить профиль. Войдите ещё раз по почте и новому паролю.');
        await ensurePinSetup();recoveryMode=false;openView('home');emitAuth({recovered:true})
      }catch(err){status.className='status error';status.textContent=err.message}
      finally{btn.disabled=false}
    };

    var authForm=document.querySelector('#auth-form');
    if(authForm)authForm.onsubmit=async function(e){
      e.preventDefault();
      var status=document.querySelector('#auth-status');
      var email=document.querySelector('#auth-email').value.trim();
      var password=document.querySelector('#auth-password').value;
      status.hidden=false;status.className='status';status.textContent=authMode==='signup'?'Создаю аккаунт…':'Вхожу…';
      try{
        if(authMode==='signup'){
          var signupData=await api('signup',{
            email:email,
            password:password,
            display_name:document.querySelector('#auth-name').value.trim(),
            invite_token:pendingInviteToken||null
          },false);
          if(!signupData.session)throw new Error('Аккаунт создан, но сессия не получена');
          saveSession(signupData.session);markPinUnlocked();
          var signupOk=await syncAccount();
          if(!signupOk)throw new Error('Аккаунт создан, но профиль не загрузился');
          await ensurePinSetup();
          status.hidden=false;status.className='status';status.textContent='Готово';
          if(pendingInviteToken)await showPendingInvite();
          else{openView('home');emitAuth({signup:true})}
        }else{
          if(!email||password.length<6)throw new Error('Введите почту и пароль');
          var loginData=await api('login',{email:email,password:password},false);
          if(!loginData.session)throw new Error('Сессия входа не получена');
          saveSession(loginData.session);markPinUnlocked();
          var loginOk=await syncAccount();
          if(!loginOk)throw new Error('Не удалось загрузить профиль после входа');
          await ensurePinSetup();
          if(pendingInviteToken)await showPendingInvite();
          else{openView('home');emitAuth({login:true})}
        }
      }catch(err){
        status.hidden=false;status.className='status error';status.textContent=err.message;
      }
    };
  }

  async function boot(){
    bindAuthUi();
    if(typeof recoveryMode!=='undefined'&&recoveryMode){
      clearPinConfig();openPasswordResetNew();return;
    }
    if(hasStoredSession()){
      var ok=await syncAccount();
      if(ok){
        emitAuth({restored:true});
        if(document.querySelector('[data-view="login"].active'))openView('home');
      }
    }
  }

  document.addEventListener('vmeste-session-refreshed',async function(){
    var ok=await syncAccount();
    if(ok)emitAuth({refreshed:true});
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();