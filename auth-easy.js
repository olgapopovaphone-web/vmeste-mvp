const PASSWORDLESS_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-passwordless';

(function initEasyAuth(){
  const auth=document.querySelector('.auth');
  const tabs=auth?.querySelector('.tabs');
  const form=auth?.querySelector('#auth-form');
  if(!auth||!tabs||!form)return;

  const wrap=document.createElement('div');
  wrap.id='legacy-auth-wrap';
  wrap.hidden=true;
  tabs.parentNode.insertBefore(wrap,tabs);
  wrap.appendChild(tabs);
  wrap.appendChild(form);

  const quick=document.createElement('div');
  quick.className='quickAuth';
  quick.innerHTML=`
    <span class="ey">БЫСТРЫЙ ВХОД</span>
    <h3>Без пароля</h3>
    <p class="muted">Введите email — пришлём одноразовую ссылку для входа.</p>
    <form id="quick-auth-form">
      <label>Email<input id="quick-auth-email" type="email" autocomplete="email" required placeholder="name@example.com"></label>
      <div id="quick-auth-status" class="status" hidden></div>
      <div class="quickAuthActions"><button class="primary" id="quick-auth-submit">Прислать ссылку для входа</button></div>
    </form>
    <p class="quickAuthNote">На этом устройстве после входа сессия сохранится автоматически.</p>
  `;
  auth.insertBefore(quick,wrap);

  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='authAlternativeToggle';
  toggle.textContent='Пароль или регистрация';
  quick.after(toggle);

  toggle.onclick=()=>{
    wrap.hidden=!wrap.hidden;
    toggle.textContent=wrap.hidden?'Пароль или регистрация':'Скрыть другие способы';
  };

  const quickForm=document.querySelector('#quick-auth-form');
  quickForm.onsubmit=async e=>{
    e.preventDefault();
    const email=document.querySelector('#quick-auth-email').value.trim();
    const status=document.querySelector('#quick-auth-status');
    const submit=document.querySelector('#quick-auth-submit');
    status.hidden=false;status.className='status';status.textContent='Отправляю ссылку…';submit.disabled=true;
    try{
      const response=await fetch(PASSWORDLESS_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,invite_token:typeof pendingInviteToken!=='undefined'?pendingInviteToken||null:null})});
      let data={};try{data=await response.json()}catch{}
      if(!response.ok)throw new Error(data.error||'Не удалось отправить ссылку');
      status.className='quickAuthSuccess';
      status.innerHTML='Ссылка отправлена. Откройте письмо и нажмите кнопку входа — «ЛЯ» откроется уже авторизованным.';
      submit.textContent='Отправить ещё раз';
    }catch(err){
      status.className='status error';
      status.textContent=err.message||'Не удалось отправить ссылку';
    }finally{submit.disabled=false}
  };
})();
