(function(){
  function setStatus(message,isError){
    var st=document.getElementById('auth-status');
    if(!st)return;
    st.hidden=false;
    st.className=isError?'status error':'status';
    st.textContent=message;
  }

  function bindPinEntry(){
    var btn=document.getElementById('login-with-pin');
    if(!btn)return;

    var available=false;
    try{
      available=typeof canUsePin==='function'&&canUsePin();
    }catch(e){
      available=false;
    }

    btn.hidden=!available;
    if(!available)return;

    btn.onclick=async function(){
      btn.disabled=true;
      try{
        if(typeof canUsePin!=='function'||!canUsePin()){
          throw new Error('PIN-вход на этом устройстве пока недоступен');
        }
        if(typeof showPinUnlockGate!=='function'){
          throw new Error('PIN-вход временно недоступен');
        }
        var ok=await showPinUnlockGate();
        if(!ok)return;

        if(typeof loadAccount==='function'){
          var loaded=await loadAccount();
          if(!loaded)throw new Error('Не удалось восстановить профиль после PIN-входа');
        }

        if(typeof openView==='function')openView('home');
        document.dispatchEvent(new CustomEvent('vmeste-auth-changed',{detail:{signedIn:true,pin:true}}));
      }catch(err){
        setStatus((err&&err.message)||'Не удалось войти по PIN',true);
      }finally{
        btn.disabled=false;
      }
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindPinEntry,{once:true});
  }else{
    bindPinEntry();
  }
})();