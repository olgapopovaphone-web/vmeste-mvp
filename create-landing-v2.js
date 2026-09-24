(function(){
  var section=document.querySelector('[data-view="create"]');
  if(!section||section.dataset.createLandingV2==='1')return;
  section.dataset.createLandingV2='1';
  section.classList.add('createLandingV2');

  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-api';
  var SESSION_KEY='vmeste_session_v1';
  var oldChoice=section.querySelector('#private-choice');
  var eventForm=section.querySelector('#event-form');
  if(!oldChoice||!eventForm)return;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  function hasSession(){var s=getSession();return !!(s&&s.access_token)}
  async function api(action,payload,retry){
    var s=getSession();
    if(!s||!s.access_token)throw new Error('Требуется вход в аккаунт');
    var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}
    if(r.status===401&&retry!==false&&s.refresh_token){
      var rr=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'refresh',refresh_token:s.refresh_token})});
      var rd={};try{rd=await rr.json()}catch(e){}
      if(rr.ok&&rd.session){localStorage.setItem(SESSION_KEY,JSON.stringify(rd.session));return api(action,payload,false)}
    }
    if(!r.ok)throw new Error(d.error||'Ошибка запроса');
    return d
  }

  var shell=document.createElement('div');
  shell.className='createLandingShell';
  shell.innerHTML='\
    <div class="createBannerSlot" data-create-banner-slot aria-label="Место для эмоционального баннера"></div>\
    <div class="createActionGrid">\
      <button type="button" class="createActionCard" data-create-action="event">\
        <span class="createActionIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="3"></rect><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17"></path></svg></span>\
        <span class="createActionCopy"><strong>Событие</strong><span>Встреча, поездка, праздник или что-то своё</span></span>\
        <span class="createActionArrow">→</span>\
      </button>\
      <button type="button" class="createActionCard" data-create-action="community">\
        <span class="createActionIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3"></circle><circle cx="17" cy="10" r="2.4"></circle><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14.5 16a4.5 4.5 0 0 1 6 4"></path></svg></span>\
        <span class="createActionCopy"><strong>Сообщество</strong><span>Люди вокруг общего интереса, идеи или дела</span></span>\
        <span class="createActionArrow">→</span>\
      </button>\
    </div>';
  section.insertBefore(shell,oldChoice);

  var legacyEy=eventForm.querySelector(':scope > .ey');
  var legacyTitle=eventForm.querySelector(':scope > h3');
  if(legacyEy)legacyEy.classList.add('createLegacyHeading');
  if(legacyTitle)legacyTitle.classList.add('createLegacyHeading');
  var eventHead=document.createElement('div');
  eventHead.className='createFormHead';
  eventHead.innerHTML='<div><span class="createFormEy">НОВОЕ СОБЫТИЕ</span><h2>Создать событие</h2></div><button type="button" class="createFormClose" data-create-close="event" aria-label="Закрыть">×</button>';
  eventForm.insertBefore(eventHead,eventForm.firstChild);
  eventForm.classList.add('createFormCard','createEventForm');
  var eventSubmit=eventForm.querySelector('button.primary');
  if(eventSubmit){eventSubmit.textContent='Создать событие';eventSubmit.classList.add('createSubmit')}
  if(!eventForm.querySelector('[data-event-visibility]')){
    var visibility=document.createElement('fieldset');
    visibility.className='createChoiceField';
    visibility.dataset.eventVisibility='1';
    visibility.innerHTML='<legend>Кто увидит событие</legend><div class="createSegmented"><label><input type="radio" name="event-visibility" value="open" checked><span><strong>Открытое</strong><small>Видно участникам ЛЯ во «Вокруг»</small></span></label><label><input type="radio" name="event-visibility" value="invite_only"><span><strong>По приглашению</strong><small>Только тем, кого вы позовёте</small></span></label></div>';
    var eventStatus=eventForm.querySelector('#event-status');
    if(eventStatus)eventForm.insertBefore(visibility,eventStatus);else eventForm.appendChild(visibility);
  }

  var communityForm=document.createElement('form');
  communityForm.className='createFormCard createCommunityForm';
  communityForm.hidden=true;
  communityForm.innerHTML='\
    <div class="createFormHead">\
      <div><span class="createFormEy">НОВОЕ СООБЩЕСТВО</span><h2>Создать сообщество</h2></div>\
      <button type="button" class="createFormClose" data-create-close="community" aria-label="Закрыть">×</button>\
    </div>\
    <label class="createCoverField">\
      <input type="file" id="community-cover" accept="image/jpeg,image/png,image/webp" hidden>\
      <span class="createCoverPreview" data-community-cover-preview><span class="createCoverPlus">＋</span><strong>Добавить обложку</strong><small>Фото можно заменить позже</small></span>\
    </label>\
    <label>Название<input id="community-name" required maxlength="80" placeholder="Например, Бегаем по субботам"></label>\
    <label>Описание<textarea id="community-description" rows="4" maxlength="500" placeholder="О чём это сообщество и для кого"></textarea></label>\
    <fieldset class="createChoiceField"><legend>Доступ</legend><div class="createSegmented">\
      <label><input type="radio" name="community-access" value="open" checked><span><strong>Открытое</strong><small>Можно вступить самостоятельно</small></span></label>\
      <label><input type="radio" name="community-access" value="closed"><span><strong>Закрытое</strong><small>Только по приглашению или одобрению</small></span></label>\
    </div></fieldset>\
    <label class="createSwitchRow"><span><strong>Чат сообщества</strong><small>Участники смогут общаться в общем чате</small></span><input type="checkbox" id="community-chat" checked><i aria-hidden="true"></i></label>\
    <div class="status createCommunityStatus" hidden></div>\
    <button type="submit" class="primary createSubmit">Создать сообщество</button>';
  section.insertBefore(communityForm,eventForm.nextSibling);

  var currentFlow=null;
  var coverUrl='';

  function markDirty(form){form.dataset.createDirty='1'}
  [eventForm,communityForm].forEach(function(form){
    form.addEventListener('input',function(e){if(e.target&&!e.target.closest('.createFormClose'))markDirty(form)},true);
    form.addEventListener('change',function(e){if(e.target&&!e.target.closest('.createFormClose'))markDirty(form)},true);
  });

  function resetCover(){
    var input=communityForm.querySelector('#community-cover');if(input)input.value='';
    if(coverUrl){URL.revokeObjectURL(coverUrl);coverUrl=''}
    var p=communityForm.querySelector('[data-community-cover-preview]');
    if(p){p.classList.remove('hasPhoto');p.style.backgroundImage='';p.innerHTML='<span class="createCoverPlus">＋</span><strong>Добавить обложку</strong><small>Фото можно заменить позже</small>'}
  }
  function resetCommunity(){communityForm.reset();communityForm.dataset.createDirty='';resetCover();var s=communityForm.querySelector('.createCommunityStatus');if(s){s.hidden=true;s.textContent='';s.className='status createCommunityStatus'}}
  function resetEvent(){eventForm.reset();eventForm.dataset.createDirty='';var s=eventForm.querySelector('#event-status');if(s){s.hidden=true;s.textContent='';s.className='status'}if(typeof window.clearPendingEventCircleInviteIds==='function')window.clearPendingEventCircleInviteIds()}

  function canClose(form){return form.dataset.createDirty!=='1'||confirm('Закрыть без сохранения?')}
  function showLanding(force){
    var active=currentFlow==='event'?eventForm:currentFlow==='community'?communityForm:null;
    if(!force&&active&&!canClose(active))return false;
    if(currentFlow==='event')resetEvent();
    if(currentFlow==='community')resetCommunity();
    currentFlow=null;
    section.classList.remove('createFlowEvent','createFlowCommunity');
    eventForm.hidden=true;communityForm.hidden=true;shell.hidden=false;
    window.scrollTo(0,0);return true
  }
  function requireLogin(){if(typeof window.openView==='function')window.openView('login');else document.querySelector('[data-view="login"]')?.classList.add('active')}
  function showEvent(){
    if(!hasSession()){requireLogin();return}
    currentFlow='event';shell.hidden=true;communityForm.hidden=true;eventForm.hidden=false;
    section.classList.add('createFlowEvent');section.classList.remove('createFlowCommunity');
    eventForm.dataset.createDirty='';
    setTimeout(function(){eventForm.scrollIntoView({behavior:'smooth',block:'start'})},20)
  }
  function showCommunity(){
    if(!hasSession()){requireLogin();return}
    currentFlow='community';shell.hidden=true;eventForm.hidden=true;communityForm.hidden=false;
    section.classList.add('createFlowCommunity');section.classList.remove('createFlowEvent');
    communityForm.dataset.createDirty='';
    setTimeout(function(){communityForm.scrollIntoView({behavior:'smooth',block:'start'})},20)
  }

  shell.querySelector('[data-create-action="event"]').onclick=showEvent;
  shell.querySelector('[data-create-action="community"]').onclick=showCommunity;
  section.querySelectorAll('[data-create-close]').forEach(function(btn){btn.onclick=function(){showLanding(false)}});

  var coverInput=communityForm.querySelector('#community-cover');
  if(coverInput)coverInput.onchange=function(){
    var file=this.files&&this.files[0];if(!file)return;
    if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl=URL.createObjectURL(file);
    var p=communityForm.querySelector('[data-community-cover-preview]');
    p.classList.add('hasPhoto');p.style.backgroundImage='url("'+coverUrl.replace(/"/g,'%22')+'")';p.innerHTML='<span class="createCoverChange">Изменить обложку</span>'
  };

  eventForm.onsubmit=async function(e){
    e.preventDefault();
    if(!hasSession()){requireLogin();return}
    if(!eventForm.reportValidity())return;
    var status=eventForm.querySelector('#event-status');
    var submit=eventForm.querySelector('button.primary');
    var date=(eventForm.querySelector('#event-date')||{}).value||'';
    var time=(eventForm.querySelector('#event-time')||{}).value||'';
    var title=((eventForm.querySelector('#event-title')||{}).value||'').trim();
    var place=((eventForm.querySelector('#event-place')||{}).value||'').trim();
    var priceInput=eventForm.querySelector('#event-price');
    var price=priceInput?Number(priceInput.value||0):0;
    if(!date||!time||!title)return;
    if(status){status.hidden=false;status.className='status';status.textContent='Создаю событие…'}
    if(submit)submit.disabled=true;
    try{
      var starts=new Date(date+'T'+time+':00+03:00');
      var ends=new Date(starts.getTime()+2*60*60*1000);
      var visibility=((eventForm.querySelector('input[name="event-visibility"]:checked')||{}).value||'open');
      var d=await api('create_event',{title:title,starts_at:starts.toISOString(),ends_at:ends.toISOString(),location_name:place||null,price_minor:Math.round((Number.isFinite(price)?price:0)*100),visibility:visibility});
      var ev=d&&d.event;
      eventForm.dataset.createDirty='';
      if(status)status.textContent=visibility==='open'?'Событие опубликовано во «Вокруг»':'Событие создано по приглашению';
      currentFlow=null;section.classList.remove('createFlowEvent');eventForm.hidden=true;shell.hidden=false;
      if(typeof window.loadEvents==='function'){try{await window.loadEvents()}catch(ignore){}}
      if(visibility==='open'&&typeof window.loadAfisha==='function'){try{await window.loadAfisha()}catch(ignore){}}
      if(ev&&ev.id&&typeof window.openEventView==='function')window.openEventView(ev.id,'create');
      else if(typeof window.openView==='function')window.openView('calendar');
      resetEvent();
    }catch(err){if(status){status.hidden=false;status.className='status error';status.textContent=err&&err.message?err.message:'Не удалось создать событие'}}
    finally{if(submit)submit.disabled=false}
  };

  communityForm.onsubmit=function(e){
    e.preventDefault();
    if(!communityForm.reportValidity())return;
    var status=communityForm.querySelector('.createCommunityStatus');
    status.hidden=false;status.className='status createCommunityStatus';
    status.textContent='Форма готова. Реальное создание подключим вместе с backend сообществ.';
    section.dispatchEvent(new CustomEvent('lya:create-community-submit',{bubbles:true,detail:{
      name:(communityForm.querySelector('#community-name').value||'').trim(),
      description:(communityForm.querySelector('#community-description').value||'').trim(),
      access:(communityForm.querySelector('input[name="community-access"]:checked')||{}).value||'open',
      chat_enabled:!!communityForm.querySelector('#community-chat').checked,
      cover_file:coverInput&&coverInput.files?coverInput.files[0]||null:null
    }}))
  };

  document.querySelector('.nav[data-go="create"]')?.addEventListener('click',function(){setTimeout(function(){showLanding(true)},0)},true);
  showLanding(true);
})();
