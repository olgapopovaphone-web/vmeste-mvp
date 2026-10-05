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
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))};
    var r=window.lyaAuthedFetch?await window.lyaAuthedFetch(API,opts,retry!==false):await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token},body:opts.body});
    var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}
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
        <span class="createActionCopy"><strong>Событие</strong><span>Создайте повод и позовите своих</span></span>\
        <span class="createActionArrow">→</span>\
      </button>\
      <button type="button" class="createActionCard" data-create-action="community">\
        <span class="createActionIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3"></circle><circle cx="17" cy="10" r="2.4"></circle><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14.5 16a4.5 4.5 0 0 1 6 4"></path></svg></span>\
        <span class="createActionCopy"><strong>Сообщество</strong><span>Люди вокруг общего интереса, идеи или дела</span></span>\
        <span class="createActionArrow">→</span>\
      </button>\
    </div>';
  section.insertBefore(shell,oldChoice);

  function isBusinessCreateMode(){
    try{
      if(typeof window.getLyaProfileMode==='function')return window.getLyaProfileMode()==='business';
      return localStorage.getItem('lya_profile_mode_v1')==='business'
    }catch(e){return false}
  }
  function actionIcon(type){
    var icons={
      event:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="3"></rect><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17"></path></svg>',
      community:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3"></circle><circle cx="17" cy="10" r="2.4"></circle><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14.5 16a4.5 4.5 0 0 1 6 4"></path></svg>',
      place:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z"></path><circle cx="12" cy="10" r="2"></circle></svg>',
      product:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>',
      service:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M12 4v16"></path><circle cx="12" cy="12" r="8"></circle></svg>',
      offer:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5V4h3.5L20 16.5 16.5 20 4 7.5z"></path><circle cx="7" cy="7" r="1"></circle></svg>'
    };return icons[type]||icons.event
  }
  function actionCard(type,title,copy){
    return '<button type="button" class="createActionCard" data-create-action="'+type+'"><span class="createActionIcon">'+actionIcon(type)+'</span><span class="createActionCopy"><strong>'+title+'</strong><span>'+copy+'</span></span><span class="createActionArrow">→</span></button>'
  }
  function renderCreateActions(){
    var grid=shell.querySelector('.createActionGrid'),banner=shell.querySelector('[data-create-banner-slot]');if(!grid)return;
    var business=isBusinessCreateMode();
    shell.classList.toggle('createBusinessLanding',business);
    grid.classList.toggle('businessExpanded',business);
    if(business){
      var name=window.LyaBusinessState&&window.LyaBusinessState.name||'вашего бизнеса';
      if(banner)banner.innerHTML='<div class="createBusinessBanner"><span>ЛЯ BUSINESS</span><h2>Создать для '+esc(name)+'</h2><p>Публикуйте то, что приводит людей к действию.</p></div>';
      grid.innerHTML=
        actionCard('event','Событие','Опубликовать повод и собрать людей')+
        actionCard('place','Место','Добавить магазин, студию или площадку')+
        actionCard('community','Сообщество','Собрать людей вокруг бизнеса или идеи')+
        actionCard('product','Товар','Добавить товар с прямой ссылкой на покупку')+
        actionCard('service','Услуга','Добавить запись или бронирование')+
        actionCard('offer','Предложение','Опубликовать специальное предложение');
    }else{
      if(banner)banner.innerHTML='';
      grid.innerHTML=
        actionCard('event','Событие','Создайте повод и позовите своих')+
        actionCard('community','Сообщество','Люди вокруг общего интереса, идеи или дела');
    }
  }
  async function getBusinessCreateContext(){
    if(typeof window.ensureLyaBusinessContext!=='function')throw new Error('ЛЯ Business ещё загружается. Обновите страницу.');
    var b=await window.ensureLyaBusinessContext();
    window.LyaBusinessCreateContext={business_id:b.id,business_name:b.name};
    return b
  }

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
  function resetEvent(){eventForm.reset();eventForm.dataset.createDirty='';delete eventForm.dataset.communityId;delete eventForm.dataset.placeId;delete eventForm.dataset.businessId;delete eventForm.dataset.businessPublic;document.querySelector('.communityCreateContext')?.remove();document.querySelector('.chronicleRepeatContext')?.remove();document.querySelector('.businessCreateContext')?.remove();var s=eventForm.querySelector('#event-status');if(s){s.hidden=true;s.textContent='';s.className='status'}if(typeof window.clearPendingEventCircleInviteIds==='function')window.clearPendingEventCircleInviteIds()}

  function canClose(form){return form.dataset.createDirty!=='1'||confirm('Закрыть без сохранения?')}
  function showLanding(force){
    var active=currentFlow==='event'?eventForm:currentFlow==='community'?communityForm:null;
    if(!force&&active&&!canClose(active))return false;
    if(currentFlow==='event')resetEvent();
    if(currentFlow==='community')resetCommunity();
    currentFlow=null;
    section.classList.remove('createFlowEvent','createFlowCommunity');
    eventForm.hidden=true;communityForm.hidden=true;shell.hidden=false;renderCreateActions();
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

  window.openLyaCreateEvent=function(opts){
    opts=opts||{};
    if(!hasSession()){requireLogin();return}
    if(typeof window.openView==='function')window.openView('create');
    showEvent();
    var title=eventForm.querySelector('#event-title'),place=eventForm.querySelector('#event-place'),source=eventForm.querySelector('#event-source'),date=eventForm.querySelector('#event-date'),time=eventForm.querySelector('#event-time');
    if(title&&opts.title!==undefined)title.value=opts.title||'';
    if(place&&opts.place!==undefined)place.value=opts.place||'';
    if(source&&opts.source_url!==undefined)source.value=opts.source_url||'';
    if(date&&opts.date!==undefined)date.value=opts.date||'';
    if(time&&opts.time!==undefined)time.value=opts.time||'';if(opts.visibility){var visibilityInput=eventForm.querySelector('input[name="event-visibility"][value="'+opts.visibility+'"]');if(visibilityInput)visibilityInput.checked=true}
    if(opts.community_id)eventForm.dataset.communityId=String(opts.community_id);else delete eventForm.dataset.communityId;if(opts.place_id)eventForm.dataset.placeId=String(opts.place_id);else delete eventForm.dataset.placeId;
    if(opts.business_id){eventForm.dataset.businessId=String(opts.business_id);eventForm.dataset.businessPublic=opts.visibility==='public'?'1':'0'}else{delete eventForm.dataset.businessId;delete eventForm.dataset.businessPublic}
    document.querySelector('.communityCreateContext')?.remove();
    document.querySelector('.chronicleRepeatContext')?.remove();
    document.querySelector('.businessCreateContext')?.remove();
    if(opts.business_id){
      var biz=document.createElement('div');biz.className='businessCreateContext';biz.innerHTML='<span>СОБЫТИЕ БИЗНЕСА</span><strong>'+esc(opts.business_name||'ЛЯ Business')+'</strong><small>'+(opts.visibility==='public'?'После создания событие будет публичным.':'До подтверждения бизнеса событие будет открытым для участников ЛЯ.')+'</small>';eventForm.insertAdjacentElement('beforebegin',biz)
    }
    if(opts.community_id){
      var box=document.createElement('div');box.className='communityCreateContext';box.innerHTML='<span>СОБЫТИЕ ДЛЯ СООБЩЕСТВА</span><strong>'+esc(opts.community_name||'Сообщество')+'</strong><small>Сообщество уже выбрано. Событие будет связано с ним автоматически.</small>';eventForm.insertAdjacentElement('beforebegin',box)
    }else if(opts.repeat){
      var note=document.createElement('div');note.className='chronicleRepeatContext';note.textContent='Повторяем событие — выберите новую дату и время и заново добавьте участников.';eventForm.insertAdjacentElement('beforebegin',note)
    }
    eventForm.dataset.createDirty='';
    setTimeout(function(){eventForm.scrollIntoView({behavior:'smooth',block:'start'});if(opts.inviteOwn&&typeof window.openCreateCircleInvitePicker==='function')window.openCreateCircleInvitePicker()},80)
  };

  shell.addEventListener('click',async function(e){
    var btn=e.target&&e.target.closest&&e.target.closest('[data-create-action]');if(!btn)return;
    var action=btn.dataset.createAction;
    if(!isBusinessCreateMode()){
      if(action==='event')showEvent();
      else if(action==='community')showCommunity();
      return
    }
    btn.disabled=true;
    try{
      var b=await getBusinessCreateContext();
      if(action==='event'){
        window.openLyaCreateEvent({business_id:b.id,business_name:b.name,visibility:b.verification_status==='verified'?'public':'open'});
      }else if(action==='community'){
        showCommunity();
      }else if(action==='place'){
        window.LyaBusinessCreateContext=null;
        if(typeof window.openLyaBusinessCreatePlace==='function')await window.openLyaBusinessCreatePlace();
      }else if(['product','service','offer'].includes(action)){
        window.LyaBusinessCreateContext=null;
        if(typeof window.openLyaBusinessCreateOffering==='function')await window.openLyaBusinessCreateOffering(action);
      }
    }catch(err){alert(err&&err.message?err.message:'Не удалось открыть создание')}
    finally{btn.disabled=false}
  });
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
      var sourceUrl=((eventForm.querySelector('#event-source')||{}).value||'').trim();
      var communityId=eventForm.dataset.communityId||null;
      var placeId=eventForm.dataset.placeId||null;
      var businessId=eventForm.dataset.businessId||null;
      if(businessId&&eventForm.dataset.businessPublic==='1'&&visibility!=='invite_only')visibility='public';
      var inviteTargets=typeof window.getPendingEventInviteTargets==='function'?window.getPendingEventInviteTargets():{user_ids:(typeof window.getPendingEventCircleInviteIds==='function'?window.getPendingEventCircleInviteIds():[]),community_ids:[]};
      var d=await api('create_event',{title:title,starts_at:starts.toISOString(),ends_at:ends.toISOString(),location_name:place||null,price_minor:Math.round((Number.isFinite(price)?price:0)*100),visibility:visibility,community_id:communityId,place_id:placeId,business_id:businessId});
      var ev=d&&d.event;
      if(ev&&ev.id&&sourceUrl&&typeof window.eventRaw==='function'){try{await window.eventRaw('set_location_url',{event_id:ev.id,location_url:sourceUrl})}catch(ignore){}}
      var invitedCount=0;
      var hasInviteTargets=(inviteTargets.user_ids||[]).length||(inviteTargets.community_ids||[]).length;
      if(ev&&ev.id&&hasInviteTargets&&(typeof window.inviteTargetsToEvent==='function'||typeof window.inviteCircleToEvent==='function')){try{var inviteFn=window.inviteTargetsToEvent||window.inviteCircleToEvent;var inviteResult=await inviteFn(ev.id,inviteTargets);invitedCount=(inviteResult.invited_ids||[]).length}catch(inviteErr){if(status){status.hidden=false;status.className='status';status.textContent='Событие создано. Часть приглашений не отправилась — можно повторить из карточки события.'}}}
      eventForm.dataset.createDirty='';
      if(status)status.textContent=((visibility==='open'||visibility==='public')?'Событие опубликовано во «Вокруг»':'Событие создано по приглашению')+(invitedCount?' · позвали: '+invitedCount:'');
      currentFlow=null;section.classList.remove('createFlowEvent');eventForm.hidden=true;shell.hidden=false;if(businessId)window.LyaBusinessCreateContext=null;
      if(typeof window.loadEvents==='function'){try{await window.loadEvents()}catch(ignore){}}
      if((visibility==='open'||visibility==='public')&&typeof window.loadAfisha==='function'){try{await window.loadAfisha()}catch(ignore){}}
      if(ev&&ev.id&&typeof window.openEventView==='function')window.openEventView(ev.id,'create');
      else if(typeof window.openView==='function')window.openView('calendar');
      resetEvent();
    }catch(err){if(status){status.hidden=false;status.className='status error';status.textContent=err&&err.message?err.message:'Не удалось создать событие'}}
    finally{if(submit)submit.disabled=false}
  };

  async function prepareCommunityCover(file){
    if(!file)return null;
    return new Promise(function(resolve,reject){
      var src=URL.createObjectURL(file),img=new Image();
      img.onload=function(){try{
        var w=1200,h=900,scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),sw=w/scale,sh=h/scale,sx=(img.naturalWidth-sw)/2,sy=(img.naturalHeight-sh)/2;
        var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,w,h);
        URL.revokeObjectURL(src);resolve(canvas.toDataURL('image/jpeg',.82))
      }catch(err){URL.revokeObjectURL(src);reject(err)}};
      img.onerror=function(){URL.revokeObjectURL(src);reject(new Error('Не удалось прочитать обложку'))};img.src=src
    })
  }

  communityForm.onsubmit=async function(e){
    e.preventDefault();
    if(!communityForm.reportValidity())return;
    if(!window.LyaCommunityStore||typeof window.LyaCommunityStore.create!=='function'){alert('Сервис сообществ не загрузился. Обновите страницу.');return}
    var status=communityForm.querySelector('.createCommunityStatus'),submit=communityForm.querySelector('button[type="submit"]'),businessContext=window.LyaBusinessCreateContext||null;
    status.hidden=false;status.className='status createCommunityStatus';status.textContent='Создаю сообщество…';if(submit)submit.disabled=true;
    try{
      var coverFile=coverInput&&coverInput.files?coverInput.files[0]||null:null,coverData=coverFile?await prepareCommunityCover(coverFile):null;
      var community=await window.LyaCommunityStore.create({
        name:(communityForm.querySelector('#community-name').value||'').trim(),
        description:(communityForm.querySelector('#community-description').value||'').trim(),
        access:(communityForm.querySelector('input[name="community-access"]:checked')||{}).value||'open',
        chat_enabled:!!communityForm.querySelector('#community-chat').checked,
        cover_url:coverData,
        business_id:businessContext&&businessContext.business_id||null
      });
      status.textContent='Сообщество создано';communityForm.dataset.createDirty='';
      currentFlow=null;section.classList.remove('createFlowCommunity');communityForm.hidden=true;shell.hidden=false;
      if(businessContext)window.LyaBusinessCreateContext=null;
      document.dispatchEvent(new CustomEvent('vmeste-community-changed',{detail:{community:community}}));
      resetCommunity();
      if(community&&typeof window.openCommunityDetail==='function')window.openCommunityDetail(community.id,community)
    }catch(err){status.hidden=false;status.className='status createCommunityStatus error';status.textContent=err&&err.message?err.message:'Не удалось создать сообщество'}
    finally{if(submit)submit.disabled=false}
  };

  document.querySelector('.nav[data-go="create"]')?.addEventListener('click',function(){window.LyaBusinessCreateContext=null;setTimeout(function(){showLanding(true)},0)},true);
  document.addEventListener('vmeste-session-refreshed',function(){if(shell&&!shell.hidden)renderCreateActions()});
  document.addEventListener('lya-profile-mode-changed',function(){window.LyaBusinessCreateContext=null;if(shell&&!shell.hidden)renderCreateActions()});
  renderCreateActions();
  showLanding(true);
})();
