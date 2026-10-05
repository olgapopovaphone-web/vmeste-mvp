(function(){
  if(window.__lyaBusinessHub)return;window.__lyaBusinessHub=true;
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-business-api';
  var MODE_KEY='lya_profile_mode_v1';
  var state={data:null,loading:false};

  function getProfileMode(){try{return localStorage.getItem(MODE_KEY)==='business'?'business':'personal'}catch(e){return'personal'}}
  function setProfileMode(mode){
    mode=mode==='business'?'business':'personal';
    var prev=getProfileMode();
    try{localStorage.setItem(MODE_KEY,mode)}catch(e){}
    if(prev!==mode)document.dispatchEvent(new CustomEvent('lya-profile-mode-changed',{detail:{mode:mode}}));
    return mode
  }
  function modeSwitch(active){
    return '<div class="lyaProfileModeSwitch" role="group" aria-label="Режим профиля"><button type="button" data-profile-mode="personal" class="'+(active==='personal'?'active':'')+'">Личный</button><button type="button" data-profile-mode="business" class="'+(active==='business'?'active':'')+'">Бизнес</button></div>'
  }
  function openPersonalProfile(){
    setProfileMode('personal');
    if(typeof openView==='function')openView('profile');
    if(typeof window.renderProfileV2==='function')setTimeout(function(){window.renderProfileV2()},0)
  }

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function token(){try{var s=JSON.parse(localStorage.getItem('vmeste_session_v1')||'null');return s&&s.access_token||''}catch(e){return''}}
  async function call(action,payload){
    if(!token())throw new Error('Нужно войти в аккаунт');
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))};
    var r=window.lyaAuthedFetch?await window.lyaAuthedFetch(API,opts,true):await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:opts.body});
    var d=await r.json().catch(function(){return{error:'Некорректный ответ сервера'}});
    if(!r.ok)throw new Error(d.error||'Ошибка бизнес-аккаунта');
    return d;
  }
  async function publicCall(action,payload){
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))};
    var r=await fetch(API,opts),d=await r.json().catch(function(){return{error:'Некорректный ответ сервера'}});
    if(!r.ok)throw new Error(d.error||'Не удалось открыть бизнес-профиль');
    return d
  }
  function root(){return document.getElementById('business-root')}
  function rub(v){return new Intl.NumberFormat('ru-RU').format(Math.round(Number(v||0)/100))+' ₽'}
  function kindLabel(k){return({restaurant:'Ресторан',bar:'Бар',cafe:'Кафе',museum:'Музей',gallery:'Галерея',spa:'SPA',bathhouse:'Бани / сауна',sports_space:'Спорт',karaoke:'Караоке',theatre:'Театр',club:'Клуб',park:'Парк',shop:'Магазин',salon:'Салон',studio:'Студия',venue:'Место'})[k]||'Место'}
  function offeringKind(k){return k==='product'?'Товар':k==='service'?'Услуга':'Предложение'}
  function actionLabel(x){return x==='book'?'Забронировать':x==='signup'?'Записаться':'Купить'}
  function verification(v){return v==='verified'?'Подтверждён':v==='pending'?'На проверке':v==='rejected'?'Нужно уточнение':'Не подтверждён'}
  function subscription(b){return b.subscription_tier==='business'&&b.subscription_status==='active'?'ЛЯ Business':'Бесплатный'}
  function closeOverlay(o){if(o)o.remove()}
  function sheet(title,body,cls){
    document.querySelector('.businessOverlay')?.remove();
    var o=document.createElement('div');o.className='businessOverlay '+(cls||'');
    o.innerHTML='<div class="businessSheet"><div class="businessSheetHead"><div><span class="ey">ЛЯ BUSINESS</span><h2>'+esc(title)+'</h2></div><button type="button" data-business-close>×</button></div><div class="businessSheetBody">'+body+'</div></div>';
    document.body.appendChild(o);o.querySelector('[data-business-close]').onclick=function(){closeOverlay(o)};o.onclick=function(e){if(e.target===o)closeOverlay(o)};return o
  }

  function onboarding(){
    var r=root();if(!r)return;
    r.innerHTML='<div class="businessOnboarding"><div class="businessModeRow">'+modeSwitch('business')+'</div><span class="ey">ЛЯ BUSINESS</span><h1>Создать бизнес-профиль</h1><p>Бизнес сможет управлять местами, событиями, сообществами и предложениями из одной страницы.</p><form class="businessOnboardingForm"><label>Название<input name="name" maxlength="120" required placeholder="Название бренда или компании"></label><label>Категория<input name="category" maxlength="80" placeholder="Ресторан, магазин, студия…"></label><label>Город<input name="city" maxlength="80" value="Ростов-на-Дону"></label><label>Коротко о бизнесе<textarea name="description" maxlength="1200" rows="4"></textarea></label><label>Сайт<input name="website_url" type="url" placeholder="https://"></label><div class="businessStatus" hidden></div><button type="submit" class="businessPrimary">Создать бизнес-профиль</button></form></div>';
    r.querySelector('[data-profile-mode="personal"]').onclick=openPersonalProfile;
    var form=r.querySelector('form');form.onsubmit=async function(e){
      e.preventDefault();var st=form.querySelector('.businessStatus'),btn=form.querySelector('button[type="submit"]');st.hidden=false;st.className='businessStatus';st.textContent='Создаю…';btn.disabled=true;
      try{
        var fd=new FormData(form);var d=await call('create_business',{
          name:String(fd.get('name')||'').trim(),category:String(fd.get('category')||'').trim(),city:String(fd.get('city')||'').trim(),
          description:String(fd.get('description')||'').trim(),website_url:String(fd.get('website_url')||'').trim()
        });
        if(typeof account!=='undefined'&&account&&account.profile)account.profile.account_type='business';
        state.data=d;render()
      }catch(err){st.className='businessStatus error';st.textContent=err.message;btn.disabled=false}
    }
  }

  function placeRows(items){
    if(!items.length)return '<div class="businessEmpty">У бизнеса пока нет управляемых мест.</div>';
    return '<div class="businessList">'+items.map(function(p){return '<button type="button" class="businessRow" data-business-place="'+esc(p.id)+'"><span class="businessThumb '+(p.cover_url?'hasPhoto':'')+'"'+(p.cover_url?' style="background-image:url(&quot;'+esc(p.cover_url)+'&quot;)"':'')+'></span><span><b>'+esc(p.name)+'</b><small>'+esc(kindLabel(p.kind))+' · '+esc(p.city||'')+(p.verified?' · подтверждено':'')+'</small></span><i>›</i></button>'}).join('')+'</div>'
  }
  function claimRows(items){
    var pending=items.filter(function(x){return x.status==='pending'});if(!pending.length)return'';
    return '<div class="businessClaimBox"><span class="ey">ЗАЯВКИ НА МЕСТА</span>'+pending.map(function(c){return '<div class="businessClaim"><span><b>'+esc(c.place&&c.place.name||'Место')+'</b><small>Ждёт подтверждения</small></span><button type="button" data-cancel-claim="'+esc(c.id)+'">Отменить</button></div>'}).join('')+'</div>'
  }
  function offeringRows(items){
    if(!items.length)return '<div class="businessEmpty">Добавьте первый товар, услугу или предложение.</div>';
    return '<div class="businessOfferings">'+items.map(function(x){return '<article class="businessOffering"><div><span>'+esc(offeringKind(x.kind))+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p></div><div class="businessOfferingFoot"><b>'+rub(x.price_minor)+'</b><small>'+esc(x.status==='published'?'Опубликовано':'Черновик')+'</small></div></article>'}).join('')+'</div>'
  }
  function eventRows(items){
    var now=Date.now(),future=items.filter(function(e){return Date.parse(e.starts_at)>=now&&e.status!=='cancelled'}),past=items.filter(function(e){return Date.parse(e.starts_at)<now||e.status==='finished'});
    function cards(list){return list.length?list.slice(0,4).map(function(e){return '<button type="button" class="businessMiniCard" data-business-event-card="'+esc(e.id)+'"><small>'+new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'Europe/Moscow'}).format(new Date(e.starts_at))+'</small><b>'+esc(e.title)+'</b></button>'}).join(''):'<div class="businessEmpty mini">Пока пусто.</div>'}
    return {future:cards(future),past:cards(past),futureCount:future.length,pastCount:past.length}
  }
  function offeringMini(items){
    var list=(items||[]).filter(function(x){return x.status==='published'});
    return list.length?list.slice(0,4).map(function(x){return '<div class="businessMiniCard"><small>'+esc(offeringKind(x.kind))+' · '+rub(x.price_minor)+'</small><b>'+esc(x.title)+'</b></div>'}).join(''):'<div class="businessEmpty mini">Пока нет активных предложений.</div>'
  }
  function feedHtml(mode,d,ev){
    if(mode==='soon')return ev.future;
    if(mode==='offers')return offeringMini(d.offerings||[]);
    if(mode==='past')return ev.past;
    var active=(d.offerings||[]).filter(function(x){return x.status==='published'}).slice(0,2);
    if(active.length)return offeringMini(active);
    return ev.future
  }

  function render(){
    var r=root();if(!r)return;
    var d=state.data;if(!d||!d.business){onboarding();return}
    var b=d.business,ev=eventRows(d.events||[]);
    window.LyaBusinessState={id:b.id,name:b.name,verification_status:b.verification_status,subscription_tier:b.subscription_tier,subscription_status:b.subscription_status};
    r.innerHTML='<div class="businessHub">'+
      '<header class="businessHero"><div class="businessHeroTop">'+modeSwitch('business')+'<button type="button" class="businessPreviewButton" data-business-preview>Посмотреть страницу</button></div><span class="ey">ЛЯ BUSINESS</span><h1>'+esc(b.name)+'</h1><p>'+esc(b.category||'Бизнес')+(b.city?' · '+esc(b.city):'')+'</p><div class="businessBadges"><span>'+esc(verification(b.verification_status))+'</span><span>'+esc(subscription(b))+'</span></div></header>'+
      '<section class="businessStats"><div><b>'+Number((d.places||[]).length)+'</b><span>мест</span></div><div><b>'+ev.futureCount+'</b><span>событий</span></div><div><b>'+Number((d.offerings||[]).length)+'</b><span>предложений</span></div><div><b>'+Number((d.communities||[]).length)+'</b><span>сообществ</span></div></section>'+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">УПРАВЛЕНИЕ</span><h2>Бизнес-профиль</h2></div><button type="button" data-business-edit>Изменить</button></div><p class="businessLead">'+esc(b.description||'Добавьте короткое описание — оно будет видно пользователям ЛЯ.')+'</p>'+(b.verification_status==='unverified'?'<button type="button" class="businessSoftAction" data-business-verify>Отправить на подтверждение</button>':'')+'</section>'+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">МЕСТА</span><h2>Ваши точки</h2></div></div><div class="businessActionPair"><button type="button" data-business-create-place>＋ Создать место</button><button type="button" data-business-claim-place>Это моё место</button></div>'+placeRows(d.places||[])+claimRows(d.claims||[])+'</section>'+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">ЛЕНТА</span><h2>Что увидит клиент</h2></div></div><div class="businessFeedTabs"><button type="button" class="active" data-business-feed="now">Сейчас</button><button type="button" data-business-feed="soon">Скоро</button><button type="button" data-business-feed="offers">Предложения</button><button type="button" data-business-feed="past">Было</button></div><div class="businessFeedGrid" data-business-feed-body>'+feedHtml('now',d,ev)+'</div><div class="businessActionPair businessCreatePair"><button type="button" data-business-create-event>＋ Событие</button><button type="button" data-business-create-community>＋ Сообщество</button></div></section>'+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">ПРЕДЛОЖЕНИЯ</span><h2>Товары и услуги</h2></div><button type="button" data-business-create-offering>＋ Добавить</button></div>'+offeringRows(d.offerings||[])+'</section>'+
      '<section class="businessPlan"><span class="ey">ТАРИФ</span><h2>'+esc(subscription(b))+'</h2><p>Базовый профиль уже работает. Платный ЛЯ Business будет фиксированной ежемесячной подпиской — без процента с каждой продажи.</p></section>'+
      '</div>';
    bind(r)
  }

  function bind(r){
    r.querySelector('[data-profile-mode="personal"]').onclick=openPersonalProfile;
    r.querySelector('[data-business-edit]').onclick=openEdit;
    r.querySelector('[data-business-preview]').onclick=openPreview;
    r.querySelector('[data-business-create-place]').onclick=openCreatePlace;
    r.querySelector('[data-business-claim-place]').onclick=openClaimPlace;
    r.querySelector('[data-business-create-offering]').onclick=openOffering;
    var verify=r.querySelector('[data-business-verify]');if(verify)verify.onclick=async function(){verify.disabled=true;verify.textContent='Отправляю…';try{await call('request_verification',{business_id:state.data.business.id});await load()}catch(e){alert(e.message);verify.disabled=false;verify.textContent='Отправить на подтверждение'}};
    r.querySelectorAll('[data-cancel-claim]').forEach(function(x){x.onclick=async function(){x.disabled=true;try{await call('cancel_claim',{business_id:state.data.business.id,claim_id:x.dataset.cancelClaim});await load()}catch(e){alert(e.message);x.disabled=false}}});
    r.querySelectorAll('[data-business-place]').forEach(function(x){x.onclick=function(){if(typeof window.openPlaceView==='function')window.openPlaceView(x.dataset.businessPlace)}});
    function bindFeedEvents(){r.querySelectorAll('[data-business-event-card]').forEach(function(x){x.onclick=function(){if(typeof window.openEventView==='function')window.openEventView(x.dataset.businessEventCard,'business')}})}
    bindFeedEvents();
    r.querySelectorAll('[data-business-feed]').forEach(function(tab){tab.onclick=function(){
      r.querySelectorAll('[data-business-feed]').forEach(function(x){x.classList.toggle('active',x===tab)});
      var body=r.querySelector('[data-business-feed-body]'),ev=eventRows(state.data.events||[]);if(body){body.innerHTML=feedHtml(tab.dataset.businessFeed,state.data,ev);bindFeedEvents()}
    }});
    r.querySelector('[data-business-create-event]').onclick=function(){
      var b=state.data.business;window.LyaBusinessCreateContext={business_id:b.id,business_name:b.name};
      if(typeof window.openLyaCreateEvent==='function')window.openLyaCreateEvent({business_id:b.id,business_name:b.name,visibility:b.verification_status==='verified'?'public':'open'});
      else openView('create')
    };
    r.querySelector('[data-business-create-community]').onclick=function(){
      var b=state.data.business;window.LyaBusinessCreateContext={business_id:b.id,business_name:b.name};
      openView('create');setTimeout(function(){document.querySelector('[data-view="create"] [data-create-action="community"]')?.click()},40)
    }
  }

  function openEdit(){
    var b=state.data.business,o=sheet('Настроить бизнес','<form class="businessForm"><label>Название<input name="name" required maxlength="120" value="'+esc(b.name)+'"></label><label>Категория<input name="category" maxlength="80" value="'+esc(b.category||'')+'"></label><label>Город<input name="city" maxlength="80" value="'+esc(b.city||'')+'"></label><label>Описание<textarea name="description" rows="5" maxlength="1200">'+esc(b.description||'')+'</textarea></label><label>Сайт<input type="url" name="website_url" value="'+esc(b.website_url||'')+'"></label><label>Соцсеть<input type="url" name="social_url" value="'+esc(b.social_url||'')+'"></label><label>Email<input type="email" name="contact_email" value="'+esc(b.contact_email||'')+'"></label><label>Телефон<input name="contact_phone" value="'+esc(b.contact_phone||'')+'"></label><div class="businessStatus" hidden></div><button class="businessPrimary" type="submit">Сохранить</button></form>');
    var f=o.querySelector('form');f.onsubmit=async function(e){e.preventDefault();var fd=new FormData(f),st=f.querySelector('.businessStatus'),btn=f.querySelector('button[type="submit"]');btn.disabled=true;st.hidden=false;st.className='businessStatus';st.textContent='Сохраняю…';try{await call('update_business',{business_id:b.id,name:fd.get('name'),category:fd.get('category'),city:fd.get('city'),description:fd.get('description'),website_url:fd.get('website_url'),social_url:fd.get('social_url'),contact_email:fd.get('contact_email'),contact_phone:fd.get('contact_phone')});closeOverlay(o);await load()}catch(err){st.className='businessStatus error';st.textContent=err.message;btn.disabled=false}}
  }

  function openCreatePlace(){
    var b=state.data.business,o=sheet('Новое место','<form class="businessForm"><label>Название<input name="name" required maxlength="140"></label><label>Тип<select name="kind"><option value="shop">Магазин</option><option value="restaurant">Ресторан</option><option value="cafe">Кафе</option><option value="bar">Бар</option><option value="spa">SPA</option><option value="salon">Салон</option><option value="studio">Студия</option><option value="sports_space">Спорт</option><option value="gallery">Галерея</option><option value="venue">Другое место</option></select></label><label>Город<input name="city" value="'+esc(b.city||'Ростов-на-Дону')+'"></label><label>Адрес<input name="address" maxlength="240"></label><label>Описание<textarea name="description" rows="4" maxlength="1000"></textarea></label><label>Сайт места<input type="url" name="website_url" placeholder="https://"></label><div class="businessStatus" hidden></div><button class="businessPrimary" type="submit">Создать место</button></form>');
    var f=o.querySelector('form');f.onsubmit=async function(e){e.preventDefault();var fd=new FormData(f),st=f.querySelector('.businessStatus'),btn=f.querySelector('button[type="submit"]');btn.disabled=true;st.hidden=false;st.className='businessStatus';st.textContent='Создаю…';try{await call('create_place',{business_id:b.id,name:fd.get('name'),kind:fd.get('kind'),city:fd.get('city'),address:fd.get('address'),description:fd.get('description'),website_url:fd.get('website_url')});closeOverlay(o);await load()}catch(err){st.className='businessStatus error';st.textContent=err.message;btn.disabled=false}}
  }

  function openClaimPlace(){
    var b=state.data.business,o=sheet('Это моё место','<p class="businessSheetIntro">Найдите уже существующую карточку. Мы не создаём дубль — после подтверждения она перейдёт под управление бизнеса.</p><label class="businessSearch"><input type="search" placeholder="Название места"><button type="button">Найти</button></label><div class="businessSearchResults"><div class="businessEmpty">Введите название.</div></div>');
    var input=o.querySelector('input'),btn=o.querySelector('.businessSearch button'),results=o.querySelector('.businessSearchResults');
    async function search(){var q=input.value.trim();if(!q)return;btn.disabled=true;results.innerHTML='<div class="businessEmpty">Ищу…</div>';try{var d=await call('search_places',{business_id:b.id,query:q,city:b.city||null});var items=d.places||[];results.innerHTML=items.length?items.map(function(p){var own=p.business_id===b.id,locked=p.business_id&&p.business_id!==b.id;return '<div class="businessClaimResult"><span><b>'+esc(p.name)+'</b><small>'+esc(kindLabel(p.kind))+' · '+esc(p.city||'')+(p.address?' · '+esc(p.address):'')+'</small></span><button type="button" data-claim-place="'+esc(p.id)+'" '+(own||locked?'disabled':'')+'>'+(own?'Ваше':locked?'Управляется':'Это моё')+'</button></div>'}).join(''):'<div class="businessEmpty">Не нашли. Тогда создайте место как новое.</div>';results.querySelectorAll('[data-claim-place]').forEach(function(x){x.onclick=async function(){x.disabled=true;x.textContent='Отправляю…';try{await call('claim_place',{business_id:b.id,place_id:x.dataset.claimPlace});closeOverlay(o);await load()}catch(e){alert(e.message);x.disabled=false;x.textContent='Это моё'}}})}catch(e){results.innerHTML='<div class="businessStatus error">'+esc(e.message)+'</div>'}finally{btn.disabled=false}}
    btn.onclick=search;input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();search()}})
  }

  function openOffering(presetKind){
    var b=state.data&&state.data.business;if(!b)return;
    var initial=['product','service','offer'].includes(String(presetKind||''))?String(presetKind):'offer';
    var title=initial==='product'?'Новый товар':initial==='service'?'Новая услуга':'Новое предложение';
    var o=sheet(title,'<form class="businessForm"><label>Тип<select name="kind"><option value="product">Товар</option><option value="service">Услуга</option><option value="offer">Предложение</option></select></label><label>Название<input name="title" maxlength="140" required></label><label>Описание<textarea name="description" rows="4" maxlength="1200"></textarea></label><label>Цена, ₽<input name="price" type="number" min="0" step="1" value="0"></label><label>Действие<select name="action_type"><option value="buy">Купить</option><option value="book">Забронировать</option><option value="signup">Записаться</option></select></label><label>Прямая ссылка на товар / сайт<input name="external_url" type="url" placeholder="https://"></label><p class="businessHint">Для товара ссылка обязательна и должна вести прямо на конкретный товар. Услуги позже сможем закрывать оплатой внутри ЛЯ.</p><div class="businessStatus" hidden></div><button class="businessPrimary" type="submit">Опубликовать</button></form>');
    var f=o.querySelector('form'),kind=f.elements.kind,action=f.elements.action_type;
    kind.value=initial;action.value=initial==='service'?'book':'buy';
    kind.onchange=function(){if(kind.value==='service')action.value='book';else action.value='buy'};
    f.onsubmit=async function(e){e.preventDefault();var fd=new FormData(f),st=f.querySelector('.businessStatus'),btn=f.querySelector('button[type="submit"]');btn.disabled=true;st.hidden=false;st.className='businessStatus';st.textContent='Публикую…';try{await call('create_offering',{business_id:b.id,kind:fd.get('kind'),title:fd.get('title'),description:fd.get('description'),price_minor:Math.round(Number(fd.get('price')||0)*100),action_type:fd.get('action_type'),external_url:fd.get('external_url'),status:'published'});closeOverlay(o);await load()}catch(err){st.className='businessStatus error';st.textContent=err.message;btn.disabled=false}}
  }

  function publicBusinessMarkup(d){
    var x=d.business,events=d.events||[],offers=d.offerings||[],places=d.places||[],comms=d.communities||[];
    return '<article class="businessPublic"><div class="businessPublicCover '+(x.cover_url?'hasPhoto':'')+'"'+(x.cover_url?' style="background-image:url(&quot;'+esc(x.cover_url)+'&quot;)"':'')+'></div><div class="businessPublicHead"><span class="businessPublicLogo">'+esc((x.name||'Б').slice(0,1).toUpperCase())+'</span><h1>'+esc(x.name)+'</h1><p>'+esc(x.category||'Бизнес')+(x.city?' · '+esc(x.city):'')+'</p>'+(x.verification_status==='verified'?'<span class="businessVerifiedMark">Подтверждённый бизнес</span>':'')+'<div class="businessPublicLinks">'+(x.website_url?'<a href="'+esc(x.website_url)+'" target="_blank" rel="noopener">Сайт ↗</a>':'')+'</div></div>'+
      '<section><span class="ey">СКОРО</span><h2>События</h2>'+(events.length?events.map(function(e){return '<button type="button" class="businessPublicEvent" data-business-event="'+esc(e.id)+'"><b>'+esc(e.title)+'</b><small>'+new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(e.starts_at))+'</small></button>'}).join(''):'<div class="businessEmpty">Пока нет опубликованных событий.</div>')+'</section>'+
      '<section><span class="ey">ПРЕДЛОЖЕНИЯ</span><h2>Что можно сделать</h2>'+(offers.length?offers.map(function(y){return '<article class="businessPublicOffer"><span>'+esc(offeringKind(y.kind))+'</span><h3>'+esc(y.title)+'</h3><p>'+esc(y.description||'')+'</p><div><b>'+rub(y.price_minor)+'</b>'+(y.external_url?'<a href="'+esc(y.external_url)+'" target="_blank" rel="noopener">'+esc(actionLabel(y.action_type))+' ↗</a>':'<button type="button" disabled>'+esc(actionLabel(y.action_type))+'</button>')+'</div></article>'}).join(''):'<div class="businessEmpty">Предложений пока нет.</div>')+'</section>'+
      '<section><span class="ey">МЕСТА</span><h2>Где нас найти</h2>'+placeRows(places)+'</section>'+
      (comms.length?'<section><span class="ey">СООБЩЕСТВА</span><h2>Наши сообщества</h2>'+comms.map(function(c){return '<button type="button" class="businessPublicCommunity" data-business-community="'+esc(c.id)+'"><b>'+esc(c.name)+'</b><p>'+esc(c.description||'')+'</p></button>'}).join('')+'</section>':'')+
    '</article>'
  }
  async function openPublicBusiness(businessId){
    if(!businessId)return;
    var o=sheet('Бизнес-профиль','<div class="businessEmpty">Загружаю публичную страницу…</div>','publicPreview');
    try{
      var d=await publicCall('get_public_business',{business_id:businessId}),body=o.querySelector('.businessSheetBody');
      o.querySelector('.businessSheetHead h2').textContent=d.business&&d.business.name||'Бизнес-профиль';
      body.innerHTML=publicBusinessMarkup(d);
      body.querySelectorAll('[data-business-place]').forEach(function(x){x.onclick=function(){closeOverlay(o);if(typeof window.openPlaceView==='function')window.openPlaceView(x.dataset.businessPlace)}});
      body.querySelectorAll('[data-business-event]').forEach(function(x){x.onclick=function(){closeOverlay(o);if(typeof window.openEventView==='function')window.openEventView(x.dataset.businessEvent,'business')}});
      body.querySelectorAll('[data-business-community]').forEach(function(x){x.onclick=function(){var c=(d.communities||[]).find(function(y){return String(y.id)===String(x.dataset.businessCommunity)});closeOverlay(o);if(c&&typeof window.openCommunityDetail==='function')window.openCommunityDetail(c.id,c)}});
    }catch(e){o.querySelector('.businessSheetBody').innerHTML='<div class="businessStatus error">'+esc(e.message)+'</div>'}
  }
  async function openPreview(){var b=state.data&&state.data.business;if(b)openPublicBusiness(b.id)}
  window.openLyaBusinessPublicProfile=openPublicBusiness;

  async function load(){
    var r=root();if(!r)return;setProfileMode('business');state.loading=true;r.innerHTML='<div class="businessLoading">Собираю ЛЯ Business…</div>';
    try{state.data=await call('get_dashboard',{});render()}catch(e){r.innerHTML='<div class="businessOnboarding"><div class="businessModeRow">'+modeSwitch('business')+'</div><div class="businessStatus error">'+esc(e.message)+'</div></div>';var personal=r.querySelector('[data-profile-mode="personal"]');if(personal)personal.onclick=openPersonalProfile}finally{state.loading=false}
  }
  async function ensureBusinessContext(){
    if(state.data&&state.data.business)return state.data.business;
    if(!token())throw new Error('Нужно войти в аккаунт');
    state.data=await call('get_dashboard',{});
    if(!state.data||!state.data.business)throw new Error('Сначала создайте бизнес-профиль');
    var b=state.data.business;
    window.LyaBusinessState={id:b.id,name:b.name,verification_status:b.verification_status,subscription_tier:b.subscription_tier,subscription_status:b.subscription_status};
    return b
  }
  window.getLyaProfileMode=getProfileMode;
  window.setLyaProfileMode=setProfileMode;
  window.renderLyaProfileModeSwitch=modeSwitch;
  window.ensureLyaBusinessContext=ensureBusinessContext;
  window.openLyaBusinessCreatePlace=async function(){await ensureBusinessContext();openCreatePlace()};
  window.openLyaBusinessClaimPlace=async function(){await ensureBusinessContext();openClaimPlace()};
  window.openLyaBusinessCreateOffering=async function(kind){await ensureBusinessContext();openOffering(kind)};
  window.openLyaBusinessHub=function(){if(!token()){openView('login');return}setProfileMode('business');openView('business');load()};
  window.refreshLyaBusinessHub=load;
})();