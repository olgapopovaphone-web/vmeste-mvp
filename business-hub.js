(function(){
  if(window.__lyaBusinessHub)return;window.__lyaBusinessHub=true;
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-business-api';
  var MODE_KEY='lya_profile_mode_v1';
  var KIND_KEY='lya_professional_kind_v1';
  var state={data:null,loading:false,section:'home',calendarCursor:null,calendarSelected:null};

  function getProfileMode(){try{return localStorage.getItem(MODE_KEY)==='business'?'business':'personal'}catch(e){return'personal'}}
  function setProfileMode(mode){
    mode=mode==='business'?'business':'personal';
    var prev=getProfileMode();
    try{localStorage.setItem(MODE_KEY,mode)}catch(e){}
    if(prev!==mode)document.dispatchEvent(new CustomEvent('lya-profile-mode-changed',{detail:{mode:mode}}));
    return mode
  }
  function rememberedKind(){try{var k=localStorage.getItem(KIND_KEY);return k==='organization'?'organization':k==='business'?'business':null}catch(e){return null}}
  function rememberKind(b){var k=b&&b.account_kind==='organization'?'organization':'business';try{localStorage.setItem(KIND_KEY,k)}catch(e){}return k}
  function isOrganization(b){return !!(b&&b.account_kind==='organization')}
  function professionalLabel(b){if(b)return isOrganization(b)?'Организация':'Бизнес';var k=rememberedKind();return k==='organization'?'Организация':k==='business'?'Бизнес':'Проект'}
  function professionalTitle(b){if(b)return isOrganization(b)?'Организация Free':'ЛЯ Business';var k=rememberedKind();return k==='organization'?'Организация Free':k==='business'?'ЛЯ Business':'ЛЯ'}
  function canPublishPublic(b){return !!(b&&(b.verification_status==='verified'||(b.account_kind==='organization'&&b.legal_status==='informal')))}
  function publicVisibilityFor(b){return canPublishPublic(b)?'public':'open'}
  function modeSwitch(active){
    var b=state.data&&state.data.business||window.LyaBusinessState||null,label=professionalLabel(b);
    return '<div class="lyaProfileModeSwitch" role="group" aria-label="Режим профиля"><button type="button" data-profile-mode="personal" class="'+(active==='personal'?'active':'')+'">Личный</button><button type="button" data-profile-mode="business" class="'+(active==='business'?'active':'')+'">'+esc(label)+'</button></div>'
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
  function paymentLabel(x){return x==='onsite'?'На месте':x==='online'?'Онлайн':x==='contact'?'Уточнить при записи':''}
  function verification(v){return v==='verified'?'Реквизиты подтверждены':v==='pending'?'Реквизиты на проверке':v==='rejected'?'Нужно уточнить реквизиты':'Реквизиты не подтверждены'}
  function subscription(b){if(isOrganization(b))return 'Организация Free';return b.subscription_tier==='business'&&b.subscription_status==='active'?'ЛЯ Business':'ЛЯ Business · Free'}
  function closeOverlay(o){if(o)o.remove()}
  function sheet(title,body,cls){
    document.querySelector('.businessOverlay')?.remove();
    var o=document.createElement('div');o.className='businessOverlay '+(cls||'');
    var b=state.data&&state.data.business||window.LyaBusinessState||null;o.innerHTML='<div class="businessSheet"><div class="businessSheetHead"><div><span class="ey">'+esc(professionalTitle(b))+'</span><h2>'+esc(title)+'</h2></div><button type="button" data-business-close>×</button></div><div class="businessSheetBody">'+body+'</div></div>';
    document.body.appendChild(o);o.querySelector('[data-business-close]').onclick=function(){closeOverlay(o)};o.onclick=function(e){if(e.target===o)closeOverlay(o)};return o
  }

  function onboarding(){
    var r=root();if(!r)return;
    r.innerHTML='<div class="businessOnboarding"><div class="businessModeRow">'+modeSwitch('business')+'</div><span class="ey">ПРОФЕССИОНАЛЬНЫЙ ПРОФИЛЬ</span><h1 data-onboarding-title>Кто вы?</h1><p data-onboarding-copy>Выберите режим — интерфейс останется знакомым, изменятся только доступные функции.</p><form class="businessOnboardingForm">'+
      '<fieldset class="businessKindChoice"><legend>Тип профиля</legend><label><input type="radio" name="account_kind" value="business" checked><span><b>Бизнес</b><small>Коммерческие события, товары, услуги и предложения</small></span></label><label><input type="radio" name="account_kind" value="organization"><span><b>Некоммерческая организация</b><small>События, сообщества, места и статистика — бесплатно</small></span></label></fieldset>'+
      '<div class="businessLegalChoice" data-organization-legal hidden><span class="ey">СТАТУС ОРГАНИЗАЦИИ</span><label><input type="radio" name="legal_status" value="registered" checked><span><b>Есть ИНН</b><small>Фонд, АНО, НКО, общественная организация и другие зарегистрированные формы</small></span></label><label><input type="radio" name="legal_status" value="informal"><span><b>Без юридического лица</b><small>Волонтёрская группа, студенческое объединение или общественная инициатива</small></span></label></div>'+
      '<label>Название<input name="name" maxlength="120" required placeholder="Название проекта"></label><label>Категория<input name="category" maxlength="80" placeholder="Например: кафе, фонд, волонтёрский проект"></label><label>Город<input name="city" maxlength="80" value="Ростов-на-Дону"></label><label>Короткое описание<textarea name="description" maxlength="1200" rows="4"></textarea></label><label>Сайт<input name="website_url" type="url" placeholder="https://"></label><div class="businessStatus" hidden></div><button type="submit" class="businessPrimary" data-onboarding-submit>Создать профиль</button></form></div>';
    r.querySelector('[data-profile-mode="personal"]').onclick=openPersonalProfile;
    var form=r.querySelector('form'),legal=r.querySelector('[data-organization-legal]'),title=r.querySelector('[data-onboarding-title]'),copy=r.querySelector('[data-onboarding-copy]');
    function syncType(){
      var kind=(form.querySelector('input[name="account_kind"]:checked')||{}).value||'business',org=kind==='organization';
      legal.hidden=!org;
      title.textContent=org?'Создать профиль организации':'Создать бизнес-профиль';
      copy.textContent=org?'Публичные события, сообщества, места, команда и статистика — без коммерческих функций.':'Управляйте местами, событиями, сообществами и коммерческими предложениями.';
    }
    form.querySelectorAll('input[name="account_kind"]').forEach(function(x){x.onchange=syncType});syncType();
    form.onsubmit=async function(e){
      e.preventDefault();var st=form.querySelector('.businessStatus'),btn=form.querySelector('button[type="submit"]');st.hidden=false;st.className='businessStatus';st.textContent='Создаю…';btn.disabled=true;
      try{
        var fd=new FormData(form),kind=String(fd.get('account_kind')||'business'),legalStatus=kind==='organization'?String(fd.get('legal_status')||'registered'):'registered';
        var d=await call('create_business',{
          account_kind:kind,legal_status:legalStatus,
          name:String(fd.get('name')||'').trim(),category:String(fd.get('category')||'').trim(),city:String(fd.get('city')||'').trim(),
          description:String(fd.get('description')||'').trim(),website_url:String(fd.get('website_url')||'').trim()
        });
        if(typeof account!=='undefined'&&account&&account.profile)account.profile.account_type='business';
        state.data=d;if(d&&d.business)rememberKind(d.business);render()
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
    function statusLabel(x){return x==='published'?'Опубликовано':x==='archived'?'В архиве':'Черновик'}
    return '<div class="businessOfferings">'+items.map(function(x){return '<article class="businessOffering"><div><span>'+esc(offeringKind(x.kind))+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p></div><div class="businessOfferingFoot"><b>'+rub(x.price_minor)+'</b><small>'+esc(statusLabel(x.status))+'</small></div></article>'}).join('')+'</div>'
  }
  function communityRows(items){
    if(!items.length)return '<div class="businessEmpty">У бизнеса пока нет сообществ.</div>';
    return '<div class="businessList">'+items.map(function(c){return '<button type="button" class="businessRow businessCommunityRow" data-business-community-row="'+esc(c.id)+'"><span class="businessCommunityBadge">'+esc((c.name||'ЛЯ').trim().slice(0,2).toUpperCase())+'</span><span><b>'+esc(c.name||'Сообщество')+'</b><small>'+esc(c.access==='open'?'Открытое сообщество':'Закрытое сообщество')+'</small></span><i>›</i></button>'}).join('')+'</div>'
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

  function ownerEventRows(items){
    var now=Date.now(),list=(items||[]).filter(function(e){return Date.parse(e.starts_at)>=now&&e.status!=='cancelled'}).sort(function(a,b){return Date.parse(a.starts_at)-Date.parse(b.starts_at)}).slice(0,4);
    if(!list.length)return '<div class="businessOwnerEmpty"><b>Пока нет ближайших событий</b><span>Создайте первый повод для аудитории бизнеса.</span></div>';
    return '<div class="businessOwnerEventList">'+list.map(function(e){
      return '<button type="button" data-owner-event="'+esc(e.id)+'"><time>'+esc(businessWhen(e.starts_at,true))+'</time><span><b>'+esc(e.title)+'</b><small>'+esc(e.location_name||'Место не указано')+'</small></span><i>›</i></button>'
    }).join('')+'</div>'
  }
  function ownerAttention(d,b){
    var rows=[];
    if(b.legal_status!=='informal'&&b.verification_status==='unverified')rows.push('<button type="button" data-business-verify><span><b>Подтвердить реквизиты</b><small>Введите ИНН — он станет основой проверки организации или бизнеса.</small></span><i>→</i></button>');
    if(!b.description)rows.push('<button type="button" data-business-edit><span><b>Добавить описание</b><small>Коротко расскажите людям, чем занимается проект.</small></span><i>→</i></button>');
    var pending=(d.claims||[]).filter(function(x){return x.status==='pending'}).length;
    if(pending)rows.push('<div><span><b>Заявки на места</b><small>'+pending+' '+(pending===1?'заявка ждёт':'заявки ждут')+' подтверждения.</small></span><i>…</i></div>');
    return rows.length?'<section class="businessOwnerAttention"><span class="ey">ТРЕБУЕТ ВНИМАНИЯ</span>'+rows.join('')+'</section>':''
  }

  function ownerOfferingRows(items){
    var list=(items||[]).filter(function(x){return x.status!=='archived'}).slice(0,4);
    if(!list.length)return '<div class="businessOwnerEmpty"><b>Предложений пока нет</b><span>Добавьте товар, услугу или специальное предложение.</span></div>';
    return '<div class="businessOwnerOfferList">'+list.map(function(x){
      return '<article><span>'+esc(offeringKind(x.kind))+'</span><h3>'+esc(x.title)+'</h3><div><b>'+rub(x.price_minor)+'</b><small>'+esc(x.status==='published'?'Опубликовано':'Черновик')+'</small></div></article>'
    }).join('')+'</div>'
  }

  function renderAround(){
    var r=root();if(!r)return;
    var d=state.data;if(!d||!d.business){onboarding();return}
    var b=d.business,org=isOrganization(b),events=(d.events||[]),future=events.filter(function(e){return Date.parse(e.starts_at)>=Date.now()&&e.status!=='cancelled'}).length;
    rememberKind(b);
    window.LyaBusinessState={id:b.id,name:b.name,account_kind:b.account_kind,legal_status:b.legal_status,inn:b.inn||null,verification_status:b.verification_status,subscription_tier:b.subscription_tier,subscription_status:b.subscription_status};
    r.innerHTML='<div class="businessHub businessOwnerHome">'+
      '<header class="businessHero ownerHero"><div class="businessHeroTop">'+modeSwitch('business')+'<button type="button" class="businessPreviewButton" data-business-preview>Посмотреть как клиент</button></div><span class="ey">ВОКРУГ '+(org?'ОРГАНИЗАЦИИ':'БИЗНЕСА')+'</span><h1>'+esc(b.name)+'</h1><p>'+esc(b.category||(org?'Организация':'Бизнес'))+(b.city?' · '+esc(b.city):'')+'</p><div class="businessBadges"><span>'+esc(b.legal_status==='informal'?'Общественная инициатива':verification(b.verification_status))+'</span>'+(org?'<span>Организация Free</span>':'')+'</div></header>'+
      '<section class="businessOwnerProfile">'+
        '<div class="businessOwnerProfileIcon">'+esc((b.name||'Б').trim().slice(0,1).toUpperCase())+'</div>'+
        '<div class="businessOwnerProfileCopy"><span class="ey">ПРОФИЛЬ '+(org?'ОРГАНИЗАЦИИ':'БИЗНЕСА')+'</span><h2>Что видят люди</h2><p>'+esc(b.description||'Описание пока не добавлено.')+'</p></div>'+
        '<div class="businessOwnerProfileActions"><button type="button" data-business-preview>Посмотреть страницу</button><button type="button" data-business-edit>Изменить</button></div>'+
      '</section>'+
      ownerAttention(d,b)+
      '<section class="businessOwnerManage"><div class="businessSectionHead"><div><span class="ey">УПРАВЛЕНИЕ</span><h2>Ваш'+(org?'а организация':' бизнес')+' в ЛЯ</h2></div></div>'+
        '<div class="businessOwnerManageGrid">'+
          '<button type="button" data-business-jump="places"><span>Места</span><b>'+Number((d.places||[]).length)+'</b><small>Точки проекта</small></button>'+
          '<button type="button" data-business-jump="communities"><span>Сообщества</span><b>'+Number((d.communities||[]).length)+'</b><small>Люди вокруг проекта</small></button>'+
          '<button type="button" data-business-go="events"><span>События</span><b>'+future+'</b><small>Ближайшие</small></button>'+
          (!org?'<button type="button" data-business-jump="offers"><span>Предложения</span><b>'+Number((d.offerings||[]).filter(function(x){return x.status!=='archived'}).length)+'</b><small>Товары и услуги</small></button>':'')+
        '</div>'+
        '<button type="button" class="businessOwnerStatsLink" data-business-go="stats"><span><b>Статистика '+(org?'организации':'бизнеса')+'</b><small>Просмотры, приглашения и активность — во «В кругу»</small></span><i>→</i></button>'+
      '</section>'+
      '<section class="businessSection businessOwnerSection" data-owner-section="places"><div class="businessSectionHead"><div><span class="ey">МЕСТА</span><h2>Ваши точки</h2></div><button type="button" data-business-create-place>＋ Добавить</button></div>'+
        '<div class="businessOwnerSecondary"><button type="button" data-business-claim-place>Это моё место</button></div>'+
        placeRows(d.places||[])+claimRows(d.claims||[])+
      '</section>'+
      '<section class="businessSection businessOwnerSection" data-owner-section="communities"><div class="businessSectionHead"><div><span class="ey">СООБЩЕСТВА</span><h2>Вокруг проекта</h2></div><button type="button" data-business-create-community-top>＋ Создать</button></div>'+communityRows(d.communities||[])+'</section>'+
      '<section class="businessSection businessOwnerSection"><div class="businessSectionHead"><div><span class="ey">СОБЫТИЯ</span><h2>Ближайшие</h2></div><button type="button" data-business-create-event>＋ Создать</button></div>'+ownerEventRows(events)+'<button type="button" class="businessOwnerAllLink" data-business-go="events">Открыть календарь →</button></section>'+
      (!org?'<section class="businessSection businessOwnerSection" data-owner-section="offers"><div class="businessSectionHead"><div><span class="ey">ПРЕДЛОЖЕНИЯ</span><h2>Товары и услуги</h2></div><button type="button" data-business-create-offering>＋ Добавить</button></div>'+ownerOfferingRows(d.offerings||[])+'</section>':'')+
      '</div>';
    bindAround(r);syncBusinessNav('home')
  }

  function bindAround(r){
    var personal=r.querySelector('[data-profile-mode="personal"]');if(personal)personal.onclick=openPersonalProfile;
    r.querySelectorAll('[data-business-edit]').forEach(function(x){x.onclick=openEdit});
    r.querySelectorAll('[data-business-preview]').forEach(function(x){x.onclick=openPreview});
    var createPlace=r.querySelector('[data-business-create-place]');if(createPlace)createPlace.onclick=openCreatePlace;
    var claimPlace=r.querySelector('[data-business-claim-place]');if(claimPlace)claimPlace.onclick=openClaimPlace;
    var createOffering=r.querySelector('[data-business-create-offering]');if(createOffering)createOffering.onclick=function(){openOffering()};
    var verify=r.querySelector('[data-business-verify]');if(verify)verify.onclick=openVerification;
    r.querySelectorAll('[data-cancel-claim]').forEach(function(x){x.onclick=async function(){x.disabled=true;try{await call('cancel_claim',{business_id:state.data.business.id,claim_id:x.dataset.cancelClaim});await load()}catch(e){alert(e.message);x.disabled=false}}});
    r.querySelectorAll('[data-business-place]').forEach(function(x){x.onclick=function(){if(typeof window.openPlaceView==='function')window.openPlaceView(x.dataset.businessPlace)}});
    r.querySelectorAll('[data-business-community-row]').forEach(function(x){x.onclick=function(){var c=(state.data.communities||[]).find(function(y){return String(y.id)===String(x.dataset.businessCommunityRow)});if(c&&typeof window.openCommunityDetail==='function')window.openCommunityDetail(c.id,c)}});
    r.querySelectorAll('[data-owner-event]').forEach(function(x){x.onclick=function(){if(typeof window.openEventView==='function')window.openEventView(x.dataset.ownerEvent,'business')}});
    r.querySelectorAll('[data-business-jump]').forEach(function(x){x.onclick=function(){var target=r.querySelector('[data-owner-section="'+x.dataset.businessJump+'"]');if(target)target.scrollIntoView({behavior:'smooth',block:'start'})}});
    r.querySelectorAll('[data-business-go]').forEach(function(x){x.onclick=function(){state.section=x.dataset.businessGo;render()}});
    var createCommunity=r.querySelector('[data-business-create-community-top]');if(createCommunity)createCommunity.onclick=function(){var b=state.data.business;window.LyaBusinessCreateContext={business_id:b.id,business_name:b.name};openView('create');setTimeout(function(){document.querySelector('[data-view="create"] [data-create-action="community"]')?.click()},40)};
    var createEvent=r.querySelector('[data-business-create-event]');if(createEvent)createEvent.onclick=function(){var b=state.data.business;window.LyaBusinessCreateContext={business_id:b.id,business_name:b.name};if(typeof window.openLyaCreateEvent==='function')window.openLyaCreateEvent({business_id:b.id,business_name:b.name,visibility:publicVisibilityFor(b)});else openView('create')}
  }

  function openVerification(){
    var b=state.data&&state.data.business;if(!b||b.legal_status==='informal')return;
    var o=sheet('Подтвердить реквизиты','<form class="businessForm businessVerifyForm"><p class="businessSheetIntro">Введите ИНН. ЛЯ сохранит его для проверки по государственному реестру; ОГРН пользователь вводить не будет.</p><label>ИНН<input name="inn" inputmode="numeric" autocomplete="off" maxlength="12" required value="'+esc(b.inn||'')+'" placeholder="10 или 12 цифр"></label><p class="businessHint">Сейчас мы проверяем формат ИНН и отправляем реквизиты в статус «На проверке». Автоматическое получение ОГРН подключим через официальный интеграционный доступ ФНС.</p><div class="businessStatus" hidden></div><button class="businessPrimary" type="submit">Отправить ИНН на проверку</button></form>');
    var f=o.querySelector('form');f.onsubmit=async function(e){e.preventDefault();var fd=new FormData(f),st=f.querySelector('.businessStatus'),btn=f.querySelector('button[type="submit"]');btn.disabled=true;st.hidden=false;st.className='businessStatus';st.textContent='Проверяю ИНН…';try{await call('request_verification',{business_id:b.id,inn:String(fd.get('inn')||'').trim()});closeOverlay(o);await load()}catch(err){st.className='businessStatus error';st.textContent=err.message;btn.disabled=false}}
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
    var b=state.data&&state.data.business;if(!b)return;if(isOrganization(b)){alert('Организация Free работает без коммерческих предложений.');return;}
    var initial=['product','service','offer'].includes(String(presetKind||''))?String(presetKind):'offer';
    var title=initial==='product'?'Новый товар':initial==='service'?'Новая услуга':'Новое предложение';
    var o=sheet(title,'<form class="businessForm"><label>Тип<select name="kind"><option value="product">Товар</option><option value="service">Услуга</option><option value="offer">Предложение</option></select></label><label>Название<input name="title" maxlength="140" required></label><label>Описание<textarea name="description" rows="4" maxlength="1200"></textarea></label><label>Цена, ₽<input name="price" type="number" min="0" step="1" value="0"></label><label>Действие<select name="action_type"><option value="buy">Купить</option><option value="book">Забронировать</option><option value="signup">Записаться</option></select></label><div class="businessServicePayment" data-service-payment hidden><label>Оплата<select name="payment_method"><option value="online">Онлайн</option><option value="onsite">На месте</option><option value="contact">Уточнить при записи</option></select></label><p class="businessHint">Для онлайн-оплаты клиент увидит выбор: банковская карта или СБП. Платёжный провайдер подключим отдельным этапом.</p></div><label><span data-external-label>Прямая ссылка на товар / сайт</span><input name="external_url" type="url" placeholder="https://"></label><p class="businessHint" data-offering-hint>Для товара ссылка обязательна и должна вести прямо на конкретный товар.</p><div class="businessStatus" hidden></div><button class="businessPrimary" type="submit">Опубликовать</button></form>');
    var f=o.querySelector('form'),kind=f.elements.kind,action=f.elements.action_type,payment=f.elements.payment_method;
    var payBlock=f.querySelector('[data-service-payment]'),externalLabel=f.querySelector('[data-external-label]'),hint=f.querySelector('[data-offering-hint]');
    kind.value=initial;action.value=initial==='service'?'book':'buy';
    function syncKind(){
      var service=kind.value==='service';payBlock.hidden=!service;
      if(service){action.value='book';externalLabel.textContent='Ссылка на запись / сайт';hint.textContent='Ссылка на запись необязательна. Оплата настраивается отдельно.'}
      else if(kind.value==='product'){action.value='buy';externalLabel.textContent='Прямая ссылка на товар';hint.textContent='Для товара ссылка обязательна и должна вести прямо на конкретный товар.'}
      else{action.value='buy';externalLabel.textContent='Ссылка на предложение / сайт';hint.textContent='Добавьте ссылку, если действие происходит вне ЛЯ.'}
    }
    kind.onchange=syncKind;syncKind();
    f.onsubmit=async function(e){
      e.preventDefault();var fd=new FormData(f),st=f.querySelector('.businessStatus'),btn=f.querySelector('button[type="submit"]');btn.disabled=true;st.hidden=false;st.className='businessStatus';st.textContent='Публикую…';
      try{
        await call('create_offering',{
          business_id:b.id,kind:fd.get('kind'),title:fd.get('title'),description:fd.get('description'),
          price_minor:Math.round(Number(fd.get('price')||0)*100),action_type:fd.get('action_type'),external_url:fd.get('external_url'),
          payment_method:fd.get('kind')==='service'?fd.get('payment_method'):null,
          status:'published'
        });
        closeOverlay(o);await load()
      }catch(err){st.className='businessStatus error';st.textContent=err.message;btn.disabled=false}
    }
  }

  function openPaymentChoice(offering){
    if(!offering)return;
    var selected='';
    var o=sheet('Оплата','<div class="businessPaymentChoice"><span class="ey">СПОСОБ ОПЛАТЫ</span><h3>'+esc(offering.title||'Услуга')+'</h3><strong>'+rub(offering.price_minor)+'</strong><div class="businessPaymentMethods"><button type="button" data-pay-choice="card"><span class="businessPayIcon">▭</span><span><b>Банковской картой</b><small>Visa · Mastercard · МИР</small></span><i>›</i></button><button type="button" data-pay-choice="sbp"><span class="businessPayIcon">СБП</span><span><b>СБП</b><small>Оплата через приложение банка</small></span><i>›</i></button></div><p class="businessPaymentNote">Сейчас это выбор способа оплаты в интерфейсе. Подключение платёжного провайдера сделаем отдельно.</p></div>','paymentChoice');
    o.querySelectorAll('[data-pay-choice]').forEach(function(btn){btn.onclick=function(){selected=btn.dataset.payChoice||'';o.querySelectorAll('[data-pay-choice]').forEach(function(x){x.classList.toggle('selected',x===btn)})}});
    return o
  }

  function businessDateKey(v){
    try{
      var p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(new Date(v));
      var get=function(t){var x=p.find(function(a){return a.type===t});return x?x.value:''};
      return get('year')+'-'+get('month')+'-'+get('day')
    }catch(e){return''}
  }
  function businessWhen(v,withTime){
    try{return new Intl.DateTimeFormat('ru-RU',withTime?{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}:{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(v)).replace(' г.','')}catch(e){return''}
  }
  function syncBusinessNav(section){
    var map={home:'home',stats:'communities',events:'calendar',chronicle:'chronicle'},go=map[section]||'home';
    document.querySelectorAll('#bottom-nav .nav').forEach(function(n){n.classList.toggle('active',n.dataset.go===go)})
  }
  function businessSubHeader(label,title,copy){
    var b=state.data.business;
    return '<header class="businessSubHero"><div class="businessHeroTop">'+modeSwitch('business')+'<button type="button" class="businessPreviewButton" data-business-home>Профиль '+(isOrganization(b)?'организации':'бизнеса')+'</button></div><span class="ey">'+esc(label)+'</span><h1>'+esc(title)+'</h1><p>'+esc(copy||b.name)+'</p></header>'
  }
  function bindSubCommon(r){
    var personal=r.querySelector('[data-profile-mode="personal"]');if(personal)personal.onclick=openPersonalProfile;
    var home=r.querySelector('[data-business-home]');if(home)home.onclick=function(){state.section='home';render()}
  }
  function renderStats(){
    var r=root(),d=state.data,b=d.business,org=isOrganization(b),now=Date.now();
    var events=d.events||[],offers=d.offerings||[],places=d.places||[],comms=d.communities||[],claims=d.claims||[];
    var future=events.filter(function(e){return Date.parse(e.starts_at)>=now&&e.status!=='cancelled'}).length;
    var past=events.filter(function(e){return Date.parse(e.starts_at)<now||e.status==='finished'}).length;
    var published=offers.filter(function(x){return x.status==='published'}).length;
    var drafts=offers.filter(function(x){return x.status==='draft'}).length;
    var pendingClaims=claims.filter(function(x){return x.status==='pending'}).length;
    r.innerHTML='<div class="businessHub businessSubPage">'+
      businessSubHeader('В КРУГУ '+(org?'ОРГАНИЗАЦИИ':'БИЗНЕСА'),'Статистика','Что уже происходит внутри '+b.name)+
      '<section class="businessMetricGrid">'+
        '<div><b>'+places.length+'</b><span>мест</span></div>'+
        '<div><b>'+comms.length+'</b><span>сообществ</span></div>'+
        '<div><b>'+future+'</b><span>событий впереди</span></div>'+
        '<div><b>'+past+'</b><span>событий прошло</span></div>'+
        (!org?'<div><b>'+published+'</b><span>активных предложений</span></div><div><b>'+drafts+'</b><span>черновиков</span></div>':'')+
      '</section>'+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">СОСТОЯНИЕ</span><h2>Профиль проекта</h2></div></div>'+
        '<div class="businessStatRows">'+
          '<div><span>Реквизиты</span><b>'+esc(b.legal_status==='informal'?'Без юридического лица':verification(b.verification_status))+'</b></div>'+
          '<div><span>Заявки на места</span><b>'+pendingClaims+'</b></div>'+
          '<div><span>Режим</span><b>'+esc(subscription(b))+'</b></div>'+
        '</div>'+
      '</section>'+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">'+(org?'АКТИВНОСТЬ':'КОНВЕРСИЯ')+'</span><h2>Что будем считать дальше</h2></div></div>'+
        '<div class="businessAnalyticsPending"><div><b>—</b><span>просмотры</span></div><div><b>—</b><span>«Позвать своих»</span></div><div><b>—</b><span>'+(org?'участники':'переходы')+'</span></div><div><b>—</b><span>'+(org?'вернулись снова':'брони / покупки')+'</span></div></div>'+
        '<p class="businessLead">Эти цифры пока не подменяем нулями: подключим их вместе с трекингом реальных действий пользователей.</p>'+
      '</section>'+
    '</div>';
    bindSubCommon(r);syncBusinessNav('stats')
  }

  function initCalendarCursor(){
    if(state.calendarCursor)return;
    var p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(new Date());
    var get=function(t){var x=p.find(function(a){return a.type===t});return Number(x&&x.value||0)};
    state.calendarCursor={y:get('year'),m:get('month')-1};state.calendarSelected=[String(get('year')),String(get('month')).padStart(2,'0'),String(get('day')).padStart(2,'0')].join('-')
  }
  function monthLabel(y,m){
    try{return new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m,1))).replace(' г.','')}catch(e){return''}
  }
  function calendarGrid(events,y,m){
    var first=(new Date(Date.UTC(y,m,1)).getUTCDay()+6)%7,days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),cells=[];
    var counts={};events.forEach(function(e){var k=businessDateKey(e.starts_at);if(k)counts[k]=(counts[k]||0)+1});
    for(var i=0;i<first;i++)cells.push('<span class="businessCalDay empty"></span>');
    for(var d=1;d<=days;d++){
      var key=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),n=counts[key]||0,sel=state.calendarSelected===key;
      cells.push('<button type="button" class="businessCalDay '+(n?'hasEvent ':'')+(sel?'selected':'')+'" data-business-cal-day="'+key+'"><b>'+d+'</b>'+(n?'<i>'+n+'</i>':'')+'</button>')
    }
    return cells.join('')
  }
  function businessEventList(items,emptyText){
    if(!items.length)return '<div class="businessEmpty">'+esc(emptyText||'Событий пока нет.')+'</div>';
    return '<div class="businessEventList">'+items.map(function(e){return '<button type="button" data-business-event="'+esc(e.id)+'"><time>'+esc(businessWhen(e.starts_at,true))+'</time><b>'+esc(e.title)+'</b><small>'+esc(e.location_name||'Место не указано')+'</small></button>'}).join('')+'</div>'
  }
  function renderEvents(){
    initCalendarCursor();
    var r=root(),d=state.data,b=d.business,c=state.calendarCursor,events=(d.events||[]).slice().sort(function(a,b){return Date.parse(a.starts_at)-Date.parse(b.starts_at)});
    var monthPrefix=c.y+'-'+String(c.m+1).padStart(2,'0'),monthEvents=events.filter(function(e){return businessDateKey(e.starts_at).slice(0,7)===monthPrefix});
    var selected=state.calendarSelected&&state.calendarSelected.slice(0,7)===monthPrefix?monthEvents.filter(function(e){return businessDateKey(e.starts_at)===state.calendarSelected}):monthEvents;
    var title=state.calendarSelected&&state.calendarSelected.slice(0,7)===monthPrefix?'События выбранного дня':'События месяца';
    r.innerHTML='<div class="businessHub businessSubPage">'+
      businessSubHeader('СОБЫТИЯ '+(isOrganization(b)?'ОРГАНИЗАЦИИ':'БИЗНЕСА'),'Календарь',b.name)+
      '<section class="businessSection businessCalendarSection"><div class="businessCalendarNav"><button type="button" data-business-month="-1">←</button><h2>'+esc(monthLabel(c.y,c.m))+'</h2><button type="button" data-business-month="1">→</button></div>'+
        '<div class="businessCalendarWeek"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span></div>'+
        '<div class="businessCalendarGrid">'+calendarGrid(events,c.y,c.m)+'</div>'+
      '</section>'+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">ПЛАН</span><h2>'+esc(title)+'</h2></div><button type="button" data-business-new-event>＋ Событие</button></div>'+
        businessEventList(selected,'На эту дату событий нет.')+
      '</section>'+
    '</div>';
    bindSubCommon(r);
    r.querySelectorAll('[data-business-month]').forEach(function(x){x.onclick=function(){var shift=Number(x.dataset.businessMonth||0),next=new Date(Date.UTC(c.y,c.m+shift,1));state.calendarCursor={y:next.getUTCFullYear(),m:next.getUTCMonth()};state.calendarSelected=null;render()}});
    r.querySelectorAll('[data-business-cal-day]').forEach(function(x){x.onclick=function(){state.calendarSelected=x.dataset.businessCalDay;render()}});
    r.querySelectorAll('[data-business-event]').forEach(function(x){x.onclick=function(){if(typeof window.openEventView==='function')window.openEventView(x.dataset.businessEvent,'business')}});
    var create=r.querySelector('[data-business-new-event]');if(create)create.onclick=function(){window.LyaBusinessCreateContext={business_id:b.id,business_name:b.name};if(typeof window.openLyaCreateEvent==='function')window.openLyaCreateEvent({business_id:b.id,business_name:b.name,visibility:publicVisibilityFor(b),date:state.calendarSelected||''})};
    syncBusinessNav('events')
  }
  function renderChronicle(){
    var r=root(),d=state.data,b=d.business,now=Date.now();
    var past=(d.events||[]).filter(function(e){return Date.parse(e.starts_at)<now||e.status==='finished'}).sort(function(a,b){return Date.parse(b.starts_at)-Date.parse(a.starts_at)});
    var archived=(d.offerings||[]).filter(function(x){return x.status==='archived'}).sort(function(a,b){return Date.parse(b.updated_at||b.created_at)-Date.parse(a.updated_at||a.created_at)});
    r.innerHTML='<div class="businessHub businessSubPage">'+
      businessSubHeader('ХРОНИКА '+(isOrganization(b)?'ОРГАНИЗАЦИИ':'БИЗНЕСА'),'Что уже было',b.name)+
      '<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">ПРОШЕДШИЕ СОБЫТИЯ</span><h2>'+past.length+' в истории</h2></div></div>'+
        (past.length?'<div class="businessChronicleList">'+past.map(function(e){return '<article><button type="button" data-business-event="'+esc(e.id)+'"><time>'+esc(businessWhen(e.starts_at,false))+'</time><h3>'+esc(e.title)+'</h3><p>'+esc(e.location_name||'')+'</p></button><button type="button" class="businessRepeat" data-business-repeat="'+esc(e.id)+'">Повторить</button></article>'}).join('')+'</div>':'<div class="businessEmpty">После первых проведённых событий здесь появится история бизнеса.</div>')+
      '</section>'+
      (!isOrganization(b)&&archived.length?'<section class="businessSection"><div class="businessSectionHead"><div><span class="ey">АРХИВ</span><h2>Снятые предложения</h2></div></div>'+offeringRows(archived)+'</section>':'')+
    '</div>';
    bindSubCommon(r);
    r.querySelectorAll('[data-business-event]').forEach(function(x){x.onclick=function(){if(typeof window.openEventView==='function')window.openEventView(x.dataset.businessEvent,'business')}});
    r.querySelectorAll('[data-business-repeat]').forEach(function(x){x.onclick=function(){var ev=past.find(function(e){return String(e.id)===String(x.dataset.businessRepeat)});if(ev&&typeof window.openLyaCreateEvent==='function'){window.LyaBusinessCreateContext={business_id:b.id,business_name:b.name};window.openLyaCreateEvent({business_id:b.id,business_name:b.name,title:ev.title||'',place:ev.location_name||'',visibility:publicVisibilityFor(b),repeat:true})}}});
    syncBusinessNav('chronicle')
  }
  function render(){
    var r=root();if(!r)return;
    var d=state.data;if(!d||!d.business){onboarding();return}
    rememberKind(d.business);window.LyaBusinessState={id:d.business.id,name:d.business.name,account_kind:d.business.account_kind,legal_status:d.business.legal_status,inn:d.business.inn||null,verification_status:d.business.verification_status,subscription_tier:d.business.subscription_tier,subscription_status:d.business.subscription_status};
    if(state.section==='stats')return renderStats();
    if(state.section==='events')return renderEvents();
    if(state.section==='chronicle')return renderChronicle();
    renderAround();syncBusinessNav('home')
  }

  function publicBusinessMarkup(d){
    var x=d.business,org=isOrganization(x),events=d.events||[],offers=org?[]:(d.offerings||[]),places=d.places||[],comms=d.communities||[];
    return '<article class="businessPublic"><div class="businessPublicCover '+(x.cover_url?'hasPhoto':'')+'"'+(x.cover_url?' style="background-image:url(&quot;'+esc(x.cover_url)+'&quot;)"':'')+'></div><div class="businessPublicHead"><span class="businessPublicLogo">'+esc((x.name||'Б').slice(0,1).toUpperCase())+'</span><h1>'+esc(x.name)+'</h1><p>'+esc(x.category||(org?'Организация':'Бизнес'))+(x.city?' · '+esc(x.city):'')+'</p>'+(x.verification_status==='verified'?'<span class="businessVerifiedMark">Реквизиты подтверждены</span>':x.legal_status==='informal'?'<span class="businessVerifiedMark neutral">Общественная инициатива</span>':'')+'<div class="businessPublicLinks">'+(x.website_url?'<a href="'+esc(x.website_url)+'" target="_blank" rel="noopener">Сайт ↗</a>':'')+'</div></div>'+
      '<section><span class="ey">СКОРО</span><h2>События</h2>'+(events.length?events.map(function(e){return '<button type="button" class="businessPublicEvent" data-business-event="'+esc(e.id)+'"><b>'+esc(e.title)+'</b><small>'+new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(e.starts_at))+'</small></button>'}).join(''):'<div class="businessEmpty">Пока нет опубликованных событий.</div>')+'</section>'+
      (!org?'<section><span class="ey">ПРЕДЛОЖЕНИЯ</span><h2>Что можно сделать</h2>'+(offers.length?offers.map(function(y){return '<article class="businessPublicOffer"><span>'+esc(offeringKind(y.kind))+'</span><h3>'+esc(y.title)+'</h3><p>'+esc(y.description||'')+'</p>'+(y.kind==='service'&&y.payment_method?'<p class="businessPublicPayment">Оплата: '+esc(paymentLabel(y.payment_method))+'</p>':'')+'<div><b>'+rub(y.price_minor)+'</b><span class="businessPublicOfferActions">'+(y.external_url?'<a href="'+esc(y.external_url)+'" target="_blank" rel="noopener">'+esc(actionLabel(y.action_type))+' ↗</a>':'<button type="button" disabled>'+esc(actionLabel(y.action_type))+'</button>')+(y.kind==='service'&&y.payment_method==='online'?'<button type="button" data-business-payment="'+esc(y.id)+'">Оплатить</button>':'')+'</span></div></article>'}).join(''):'<div class="businessEmpty">Предложений пока нет.</div>')+'</section>':'')+
      '<section><span class="ey">МЕСТА</span><h2>Где нас найти</h2>'+placeRows(places)+'</section>'+
      (comms.length?'<section><span class="ey">СООБЩЕСТВА</span><h2>Наши сообщества</h2>'+comms.map(function(c){return '<button type="button" class="businessPublicCommunity" data-business-community="'+esc(c.id)+'"><b>'+esc(c.name)+'</b><p>'+esc(c.description||'')+'</p></button>'}).join('')+'</section>':'')+
    '</article>'
  }

  async function openPublicBusiness(businessId){
    if(!businessId)return;
    var o=sheet('Профиль проекта','<div class="businessEmpty">Загружаю публичную страницу…</div>','publicPreview');
    try{
      var d=await publicCall('get_public_business',{business_id:businessId}),body=o.querySelector('.businessSheetBody');
      o.querySelector('.businessSheetHead h2').textContent=d.business&&d.business.name||'Профиль проекта';
      body.innerHTML=publicBusinessMarkup(d);
      body.querySelectorAll('[data-business-place]').forEach(function(x){x.onclick=function(){closeOverlay(o);if(typeof window.openPlaceView==='function')window.openPlaceView(x.dataset.businessPlace)}});
      body.querySelectorAll('[data-business-event]').forEach(function(x){x.onclick=function(){closeOverlay(o);if(typeof window.openEventView==='function')window.openEventView(x.dataset.businessEvent,'business')}});
      body.querySelectorAll('[data-business-community]').forEach(function(x){x.onclick=function(){var c=(d.communities||[]).find(function(y){return String(y.id)===String(x.dataset.businessCommunity)});closeOverlay(o);if(c&&typeof window.openCommunityDetail==='function')window.openCommunityDetail(c.id,c)}});
      body.querySelectorAll('[data-business-payment]').forEach(function(x){x.onclick=function(){var offer=(d.offerings||[]).find(function(y){return String(y.id)===String(x.dataset.businessPayment)});closeOverlay(o);openPaymentChoice(offer)}});
    }catch(e){o.querySelector('.businessSheetBody').innerHTML='<div class="businessStatus error">'+esc(e.message)+'</div>'}
  }
  async function openPreview(){var b=state.data&&state.data.business;if(b)openPublicBusiness(b.id)}
  window.openLyaBusinessPublicProfile=openPublicBusiness;

  async function load(){
    var r=root();if(!r)return;setProfileMode('business');state.loading=true;r.innerHTML='<div class="businessLoading">Собираю профиль…</div>';
    try{state.data=await call('get_dashboard',{});render()}catch(e){r.innerHTML='<div class="businessOnboarding"><div class="businessModeRow">'+modeSwitch('business')+'</div><div class="businessStatus error">'+esc(e.message)+'</div></div>';var personal=r.querySelector('[data-profile-mode="personal"]');if(personal)personal.onclick=openPersonalProfile}finally{state.loading=false}
  }
  async function ensureBusinessContext(){
    if(state.data&&state.data.business)return state.data.business;
    if(!token())throw new Error('Нужно войти в аккаунт');
    state.data=await call('get_dashboard',{});
    if(!state.data||!state.data.business)throw new Error('Сначала создайте профессиональный профиль');
    var b=state.data.business;
    rememberKind(b);window.LyaBusinessState={id:b.id,name:b.name,account_kind:b.account_kind,legal_status:b.legal_status,inn:b.inn||null,verification_status:b.verification_status,subscription_tier:b.subscription_tier,subscription_status:b.subscription_status};
    return b
  }
  window.getLyaProfileMode=getProfileMode;
  window.setLyaProfileMode=setProfileMode;
  window.openLyaBusinessSection=async function(go){
    if(!token()){openView('login');return}
    var map={home:'home',communities:'stats',calendar:'events',chronicle:'chronicle'};
    state.section=map[go]||'home';setProfileMode('business');openView('business');
    if(!state.data||!state.data.business){await load();return}
    render()
  };
  window.renderLyaProfileModeSwitch=modeSwitch;
  window.ensureLyaBusinessContext=ensureBusinessContext;
  window.openLyaBusinessCreatePlace=async function(){await ensureBusinessContext();openCreatePlace()};
  window.openLyaBusinessClaimPlace=async function(){await ensureBusinessContext();openClaimPlace()};
  window.openLyaBusinessCreateOffering=async function(kind){await ensureBusinessContext();openOffering(kind)};
  window.openLyaBusinessHub=function(){if(!token()){openView('login');return}state.section='home';setProfileMode('business');openView('business');load()};
  window.refreshLyaBusinessHub=load;
})();