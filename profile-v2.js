(function(){
  if(window.__lyaProfileV3)return;window.__lyaProfileV3=true;
  var CIRCLE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-circle-api';
  var AVATAR_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-avatar-api';
  var INVITE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-invite-api';
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var interestsList=['Кино','Музыка','Театр','Юмор','Выставки','С детьми','Прогулки','Еда','Спорт','Искусство','Книги','Путешествия'];
  var notificationMeta=[
    ['event_invites','События','Приглашения на события'],
    ['circle_requests','Круг','Заявки в круг'],
    ['community_invites','Сообщества','Приглашения в сообщества'],
    ['event_reminders','Напоминания','Напоминания перед событиями'],
    ['sound','Звук','Короткий сигнал при новом уведомлении']
  ];
  var visibilityMeta=[
    ['city','Город','Показывать город'],
    ['bio','О себе','Показывать текст «О себе»'],
    ['want','Сейчас хочу…','Показывать временный статус'],
    ['circle','Мой круг','Показывать людей из круга'],
    ['common','Общее','Показывать общих знакомых и события'],
    ['interests','Интересы','Показывать теги интересов'],
    ['events','Скоро буду','Показывать будущие открытые события'],
    ['communities','Сообщества','Показывать сообщества'],
    ['places','Мои места','Показывать выбранные места'],
    ['moments','Моменты','Показывать выбранные фото'],
    ['pinned','Закреплено','Показывать закреплённый объект']
  ];

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function sessionData(){try{return JSON.parse(localStorage.getItem('vmeste_session_v1')||'null')}catch(e){return null}}
  function token(){var s=sessionData();return s&&s.access_token||''}
  function myId(){var s=sessionData();return s&&s.user&&s.user.id||''}
  function localGroups(){try{var x=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');return Array.isArray(x)?x:[]}catch(e){return[]}}
  async function circle(action,payload){
    var t=token();if(!t)throw new Error('Нужно войти в аккаунт');
    var r=await fetch(CIRCLE_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    var d=await r.json().catch(function(){return{error:'Некорректный ответ сервера'}});
    if(!r.ok)throw new Error(d.error||'Ошибка запроса');return d
  }
  async function avatarRequest(action,file){
    var t=token();if(!t)throw new Error('Нужно войти в аккаунт');
    var opts={method:'POST',headers:{'Authorization':'Bearer '+t}};
    if(file){var fd=new FormData();fd.append('action',action);fd.append('file',file,action==='upload_cover'?'cover.jpg':'avatar.jpg');opts.body=fd}
    else{opts.headers['Content-Type']='application/json';opts.body=JSON.stringify({action:action})}
    var r=await fetch(AVATAR_API,opts),d=await r.json().catch(function(){return{error:'Некорректный ответ сервера'}});
    if(!r.ok)throw new Error(d.error||'Ошибка загрузки');return d
  }
  async function inviteToEvent(eventId,userId){
    var t=token();var r=await fetch(INVITE_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({action:'invite_from_circle',event_id:eventId,user_ids:[userId]})});
    var d=await r.json().catch(function(){return{error:'Некорректный ответ сервера'}});if(!r.ok)throw new Error(d.error||'Не удалось отправить приглашение');return d
  }
  function fmtDate(value){try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(value))}catch(e){return''}}
  function avatarHtml(p,cls){var name=p.display_name||'У',c=cls||'';if(p.avatar_url)return '<span class="profileV2Avatar '+c+' has-photo" style="background-image:url(\''+esc(String(p.avatar_url).replace(/'/g,'%27'))+'\')"></span>';return '<span class="profileV2Avatar '+c+'">'+esc(name.trim().slice(0,1).toUpperCase()||'У')+'</span>'}
  function coverStyle(p){return p.cover_url?' style="background-image:url(\''+esc(String(p.cover_url).replace(/'/g,'%27'))+'\')"':''}
  function vis(detail,key){return !!(detail&&detail.profile&&detail.profile.profile_visibility&&detail.profile.profile_visibility[key]===true)}
  function privacyBadge(detail,key,isSelf){return isSelf&&!vis(detail,key)?'<span class="profileV2PrivacyBadge">Скрыто</span>':''}
  function notificationSettings(detail){
    var d={event_invites:true,circle_requests:true,community_invites:true,event_reminders:true,sound:true};
    var p=detail&&detail.profile||{},src=p.notification_settings||((typeof account!=='undefined'&&account&&account.profile&&account.profile.notification_settings)||{});
    return Object.assign(d,src||{})
  }
  function notificationBlock(detail,isSelf){
    if(!isSelf)return'';
    var n=notificationSettings(detail),enabled=notificationMeta.filter(function(x){return n[x[0]]!==false}).length;
    return '<section class="profileV2Section profileV2Notifications"><div class="profileV2SectionHead"><div><span class="ey">УВЕДОМЛЕНИЯ</span><h2>Что сообщать мне</h2></div><button type="button" class="profileV2SectionAction" data-profile-edit-notifications>Настроить</button></div>'+
      '<button type="button" class="profileV2NotificationSummary" data-profile-open-notifications><span><b>'+enabled+' из '+notificationMeta.length+' включено</b><small>'+(n.sound!==false?'Звук включён':'Без звука')+'</small></span><strong>Открыть все ›</strong></button></section>'
  }
  function notificationCenterBlock(isSelf){
    if(!isSelf)return '';
    return '<div class="profileV2NotificationChips" data-profile-notification-center>'+
      '<button type="button" data-profile-notification-category="events"><span>События</span><b data-profile-notification-count="events">0</b></button>'+
      '<button type="button" data-profile-notification-category="circle"><span>Круг</span><b data-profile-notification-count="circle">0</b></button>'+
      '<button type="button" data-profile-notification-category="community"><span>Сообщества</span><b data-profile-notification-count="community">0</b></button>'+
      '<button type="button" data-profile-notification-category="reminders"><span>Напоминания</span><b data-profile-notification-count="reminders">0</b></button>'+
    '</div>'
  }

  async function hydrateNotificationCenter(root){
    var box=root&&root.querySelector('[data-profile-notification-center]');if(!box)return;
    try{
      if(typeof window.getLyaNotificationData!=='function')return;
      var d=await window.getLyaNotificationData();
      var counts={
        events:(d.pending||[]).length,
        circle:(d.circle||[]).length,
        community:(d.community||[]).length,
        reminders:(d.reminders||[]).length
      };
      Object.keys(counts).forEach(function(k){
        var el=box.querySelector('[data-profile-notification-count="'+k+'"]');
        if(el){el.textContent=String(counts[k]);el.hidden=counts[k]<=0;el.closest('button')?.classList.toggle('has-count',counts[k]>0)}
      })
    }catch(e){}
  }

  function notificationEditor(current){
    current=Object.assign({event_invites:true,circle_requests:true,community_invites:true,event_reminders:true,sound:true},current||{});
    return '<div class="profileV2VisibilityEditor profileV2NotificationEditor">'+notificationMeta.map(function(x){return '<label class="profileV2Toggle"><span><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></span><input type="checkbox" data-notification="'+x[0]+'" '+(current[x[0]]!==false?'checked':'')+'><i></i></label>'}).join('')+'</div>'
  }

  function mergeCommunities(detail,isSelf){
    var map=new Map();(detail.communities||[]).forEach(function(c){map.set(String(c.id),c)});
    if(isSelf)localGroups().forEach(function(c){if(c&&c.id&&!map.has(String(c.id)))map.set(String(c.id),c)});
    return Array.from(map.values()).slice(0,6)
  }

  function profileLogo(){
    return '<svg class="profileV2Logo" viewBox="0 0 32.61 20.96" aria-label="ЛЯ"><path fill="#FD4F2F" d="M4.24 0h5.67a2.26 2.26 0 0 1 0 4.52H6.49a2.62 2.62 0 0 0-2.62 2.62v3.12c0 .13-.1.22-.23.2A4.25 4.25 0 0 1 0 6.26V4.23A4.25 4.25 0 0 1 4.24 0z"/><path fill="#2B2A29" d="M13.47 20.75V9.8a.2.2 0 0 0-.2-.2h-2.98a.2.2 0 0 0-.2.18l-.24 1.89c-1.05 7.91-2.8 9.26-8.48 9.29a.2.2 0 0 1-.21-.2l-.02-1.28a1.45 1.45 0 0 1 1.1-1.42c2.71-.65 3.13-3.87 3.55-7.04L6.29 7a.2.2 0 0 1 .2-.18c1.68 0 11.08-.02 11.08.03v13.91a.2.2 0 0 1-.2.2h-3.69a.2.2 0 0 1-.2-.2z"/><path fill="#2B2A29" d="M22.13 16.22a4.82 4.82 0 0 1 1.55-9.39l8.72.03a.2.2 0 0 1 .2.2v13.7a.2.2 0 0 1-.2.2h-3.69a.2.2 0 0 1-.2-.2v-4.08a.2.2 0 0 0-.2-.2h-1.12a.2.2 0 0 0-.17.1l-3.07 4.3a.2.2 0 0 1-.17.1h-4.32a.2.2 0 0 1-.18-.32l2.97-4.13a.2.2 0 0 0-.12-.3zm6.38-2.73V9.81a.2.2 0 0 0-.2-.2h-3.3a2.05 2.05 0 1 0 0 4.1l3.3-.01a.2.2 0 0 0 .2-.2z"/></svg>'
  }
  function actions(detail){
    var r=detail.relation||{};
    if(r.status==='self')return '';
    var circleLabel='В круг',circleClass='primary',circleAttr='data-profile-add';
    if(r.status==='accepted'){circleLabel='В кругу';circleClass='';circleAttr='disabled'}
    else if(r.status==='pending'&&r.direction==='outgoing'){circleLabel='Запрос отправлен';circleClass='';circleAttr='disabled'}
    else if(r.status==='pending'&&r.direction==='incoming'){circleLabel='Принять в круг';circleClass='primary';circleAttr='data-profile-accept'}
    var accepted=r.status==='accepted';
    return '<div class="profileV2Actions">'+
      '<button type="button" class="profileV2Action '+circleClass+'" '+circleAttr+'>'+circleLabel+'</button>'+
      '<button type="button" class="profileV2Action" data-profile-chat '+(accepted?'':'disabled')+'>Написать</button>'+
      '<button type="button" class="profileV2Action invite" data-profile-invite '+(accepted?'':'disabled')+'>Пригласить на событие</button>'+
    '</div>'
  }
  function dayPart(value){try{var d=new Date(value);return {day:new Intl.DateTimeFormat('ru-RU',{day:'2-digit',timeZone:'Europe/Moscow'}).format(d),month:new Intl.DateTimeFormat('ru-RU',{month:'short',timeZone:'Europe/Moscow'}).format(d).replace('.','').toUpperCase(),time:new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(d)}}catch(e){return{day:'',month:'',time:''}}}
  function pinnedBlock(detail,isSelf){
    var x=detail.pinned;
    if(!x){if(!isSelf)return'';return '<section class="profileV2PinnedEmpty" data-block="pinned"><div class="profileV2Eyebrow">ЗАКРЕПЛЕНО</div><p>Выберите событие, сообщество или место в настройках профиля.</p></section>'}
    var title=x.type==='place'?(x.name||'Место'):(x.name||x.title||'Событие');
    var meta=x.type==='event'?'Событие · '+fmtDate(x.starts_at):x.type==='community'?'Сообщество':'Место · '+(x.city||'');
    return '<section class="profileV2Pinned" data-block="pinned"><button type="button" data-profile-pinned="'+esc(x.type)+':'+esc(x.id)+'">'+
      '<span class="profileV2PinImage">'+(x.cover_url?'<img src="'+esc(x.cover_url)+'" alt="">':'<i></i>')+'<em>Закреплено</em></span>'+
      '<span class="profileV2PinBody"><small>'+esc(meta)+'</small><strong>'+esc(title)+'</strong></span>'+
    '</button></section>'
  }
  function wantBlock(detail,isSelf){
    var p=detail.profile||{};
    if(!p.want_text){if(!isSelf)return'';return '<button type="button" class="profileV2Want profileV2WantEmpty" data-profile-edit-want data-block="status"><span class="profileV2Eyebrow">Сейчас хочу</span><p>Добавить статус</p><small>Например: на выставку, прогулку или концерт.</small></button>'}
    var invite=!isSelf&&detail.relation&&detail.relation.status==='accepted'?'<button type="button" data-profile-want-invite>Пригласить '+esc((p.display_name||'').split(' ')[0]||'')+' ↗</button>':'';
    return '<section class="profileV2Want" data-block="status"><span class="profileV2Eyebrow">Сейчас хочу</span>'+privacyBadge(detail,'want',isSelf)+'<p>'+esc(p.want_text)+'</p>'+(isSelf?'<button type="button" data-profile-edit-want>Изменить</button>':invite)+'</section>'
  }
  function circleBlock(detail,isSelf){
    var people=detail.circle_people||[],common=Number(detail.common_people_count||0),shown=people.slice(0,4);
    if(!people.length&&!isSelf)return'';
    var stack=shown.length?'<div class="profileV2CircleStack">'+shown.map(function(p){return '<button type="button" data-profile-person="'+esc(p.id)+'">'+avatarHtml(p,'small')+'</button>'}).join('')+'</div>':'';
    var note=!isSelf&&common?common+' '+(common===1?'человек знаком с вами':'человек знакомы с вами'):(people.length?'Люди, которых вы добавили в круг':'Добавляйте людей во «В кругу»');
    return '<section class="profileV2CircleSection" data-block="circle"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Люди рядом</span><h2>Мой круг</h2></div><span class="profileV2Count">'+people.length+'</span></div><div class="profileV2CircleLine">'+stack+'<p>'+esc(note)+'</p></div></section>'
  }
  function commonBlock(detail){
    var people=Number(detail.common_people_count||0),events=detail.common_events||[];
    if(!people&&!events.length)return'';
    return '<section class="profileV2Section profileV2Common" data-block="mutuals"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Пересечения</span><h2>Общее</h2></div></div><div class="profileV2Rows">'+
      (people?'<div class="profileV2Row"><span class="profileV2RowIco">◉</span><span><b>'+people+' '+(people===1?'общий знакомый':'общих знакомых')+'</b><small>Люди из ваших кругов</small></span><i>›</i></div>':'')+
      (events.length?'<button type="button" class="profileV2Row" data-profile-event="'+esc(events[0].id)+'"><span class="profileV2RowIco">□</span><span><b>'+events.length+' '+(events.length===1?'общее событие':'общих события')+'</b><small>'+esc(events.slice(0,2).map(function(e){return e.title}).join(', '))+'</small></span><i>›</i></button>':'')+
    '</div></section>'
  }
  function interestBlock(detail,isSelf){
    var items=(detail.profile&&detail.profile.interests)||[];
    if(!items.length&&!isSelf)return'';
    return '<section class="profileV2Section" data-block="interests"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Совпадения</span><h2>Интересы</h2></div></div>'+
      (items.length?'<div class="profileV2Interests">'+items.slice(0,7).map(function(x,i){return '<span class="'+(i===1?'em':'')+'">'+esc(x)+'</span>'}).join('')+'</div>':'<div class="profileV2Empty">Выберите до 7 интересов.</div>')+
    '</section>'
  }
  function eventCards(events){
    if(!events||!events.length)return '<div class="profileV2Empty">Пока ничего не запланировано.</div>';
    return '<div class="profileV2EventScroller">'+events.map(function(e){var d=dayPart(e.starts_at);return '<button type="button" class="profileV2Event" data-profile-event="'+esc(e.id)+'"><span class="profileV2EventTop"><span><b>'+esc(d.day)+'</b><small>'+esc(d.month)+'</small></span><em>Открытый план</em></span><strong>'+esc(e.title||'Событие')+'</strong><small>'+esc(e.location_name||'Место не указано')+(d.time?' · '+esc(d.time):'')+'</small></button>'}).join('')+'</div>'
  }
  function communityCards(items){
    if(!items||!items.length)return '<div class="profileV2Empty">Сообщества пока не добавлены.</div>';
    return '<div class="profileV2CommunityList">'+items.map(function(c,i){var n=(c.name||'Сообщество').trim().split(/\s+/).map(function(x){return x[0]}).join('').slice(0,2).toUpperCase();return '<button type="button" class="profileV2Community" data-profile-community="'+esc(c.id)+'"><span class="profileV2CommunityBadge '+(i===0?'first':'')+'">'+esc(n||'ЛЯ')+'</span><span><b>'+esc(c.name||'Сообщество')+'</b><small>'+esc(c.role==='owner'?'Создатель':'Участник сообщества')+'</small></span><i>›</i></button>'}).join('')+'</div>'
  }
  function placesBlock(detail,isSelf){
    var items=detail.places||[];
    if(!items.length&&!isSelf)return'';
    if(!items.length)return '<section class="profileV2Section" data-block="places"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Личная карта</span><h2>Мои места</h2></div></div><div class="profileV2Empty">Сохраните места и выберите любимые в настройках.</div></section>';
    var main=items[0],rest=items.slice(1,5);
    return '<section class="profileV2Section" data-block="places"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Личная карта</span><h2>Мои места</h2></div><span class="profileV2Count">'+items.length+'</span></div>'+
      '<button type="button" class="profileV2PlaceHero" data-profile-place="'+esc(main.id)+'">'+(main.cover_url?'<img src="'+esc(main.cover_url)+'" alt="">':'<i></i>')+'<span><small>Главное место</small><b>'+esc(main.name)+'</b><em>'+esc(main.city||main.kind||'')+'</em></span></button>'+
      (rest.length?'<div class="profileV2PlaceMini">'+rest.map(function(p){return '<button type="button" data-profile-place="'+esc(p.id)+'">'+esc(p.name)+'</button>'}).join('')+'</div>':'')+
    '</section>'
  }
  function momentsBlock(detail,isSelf){
    var items=detail.moments||[];
    if(!items.length&&!isSelf)return'';
    if(!items.length)return '<section class="profileV2Section" data-block="chronicle"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Хроника</span><h2>Недавние моменты</h2></div></div><div class="profileV2Empty">Выберите фотографии из завершённых событий.</div></section>';
    return '<section class="profileV2Section" data-block="chronicle"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Хроника</span><h2>Недавние моменты</h2></div><span class="profileV2Count">'+items.length+'</span></div><div class="profileV2Moments">'+
      '<button type="button" class="big" data-profile-moment="0"><img src="'+esc(items[0].url)+'" alt=""></button>'+
      (items[1]?'<button type="button" data-profile-moment="1"><img src="'+esc(items[1].url)+'" alt=""></button>':'<span></span>')+
      (items.length>2?'<button type="button" class="more" data-profile-moment="2"><b>+'+(items.length-2)+'</b><span>момента</span></button>':'<span class="more"><b>1</b><span>момент</span></span>')+
    '</div></section>'
  }
  function profileMarkup(detail,isSelf){
    var p=detail.profile||{},comms=mergeCommunities(detail,isSelf),now=Date.now();
    var events=(detail.events||[]).filter(function(e){
      var t=Date.parse(e.starts_at||'');return Number.isFinite(t)&&t>=now-60000
    }).sort(function(a,b){
      return Date.parse(a.starts_at||'')-Date.parse(b.starts_at||'')
    }).slice(0,5);
    var about=p.bio?'<p class="profileV2Bio">'+esc(p.bio)+'</p>':(isSelf?'<button type="button" class="profileV2AddBio" data-profile-edit>＋ Добавить «О себе»</button>':'');
    var topLeft=isSelf?'<button type="button" class="profileV2Brand" data-profile-back>'+profileLogo()+'</button>':'<button type="button" class="profileV2TopIcon profileV2Back" data-profile-back>‹</button>';
    var topRight=isSelf?'<div class="profileV2TopBtns"><label class="profileV2TopIcon" for="profile-cover-input-v3" data-profile-cover aria-label="Загрузить фон">◫</label><button type="button" class="profileV2TopIcon" data-profile-edit aria-label="Настройки">⚙</button></div>':'';
    return '<article class="profileV2">'+
      '<header class="profileV2Hero '+(p.cover_url?'has-cover':'standard-cover')+'"'+coverStyle(p)+'><div class="profileV2HeroShade"></div><div class="profileV2Top">'+topLeft+topRight+'</div></header>'+
      '<div class="profileV2Head">'+
        '<button type="button" class="profileV2AvatarButton" '+(isSelf?'data-profile-avatar':'')+'>'+avatarHtml(p,'large')+'</button>'+
        '<div class="profileV2NameRow"><div><h1>'+esc(p.display_name||'Участник')+'</h1><p>⌖ '+esc(p.city||'Город не указан')+'</p></div><i></i></div>'+
        about+
      '</div>'+
      actions(detail)+
      notificationCenterBlock(isSelf)+
      wantBlock(detail,isSelf)+
      circleBlock(detail,isSelf)+
      interestBlock(detail,isSelf)+
      (!isSelf?commonBlock(detail):'')+
      ((events.length||isSelf)?'<section class="profileV2Section profileV2Upcoming" data-block="upcoming"><div class="profileV2Title"><div><span class="profileV2Eyebrow">Открытые планы</span><h2>Скоро буду</h2></div><span class="profileV2Count">'+events.length+'</span></div>'+eventCards(events)+'</section>':'')+
      ((comms.length||isSelf)?'<section class="profileV2Section" data-block="communities"><div class="profileV2Title"><div><span class="profileV2Eyebrow">В кругу</span><h2>Сообщества</h2></div></div>'+communityCards(comms)+'</section>':'')+
      placesBlock(detail,isSelf)+
      momentsBlock(detail,isSelf)+
      pinnedBlock(detail,isSelf)+
      (isSelf?'<button type="button" class="profileV2Signout" data-profile-signout>Выйти из аккаунта</button>':'')+
      '<div class="profileV2Foot">ЛЯ · 2026</div>'+
      '<input id="profile-cover-input-v3" class="profileV2FileInput" type="file" data-profile-cover-input accept="image/jpeg,image/png,image/webp">'+
      '<input id="profile-avatar-input-v3" class="profileV2FileInput" type="file" data-profile-avatar-input accept="image/jpeg,image/png,image/webp">'+
    '</article>'
  }

  async function prepareImage(file,w,h,quality){
    return new Promise(function(resolve,reject){
      var url=URL.createObjectURL(file),img=new Image();
      img.onload=function(){try{
        var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        var scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;
        canvas.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,w,h);
        URL.revokeObjectURL(url);canvas.toBlob(function(b){b?resolve(b):reject(new Error('Не удалось подготовить изображение'))},'image/jpeg',quality||.86)
      }catch(e){URL.revokeObjectURL(url);reject(e)}};
      img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('Не удалось прочитать изображение'))};img.src=url
    })
  }

  function interestEditor(selected){
    var set=new Set(selected||[]);return '<div class="profileV2InterestEditor">'+interestsList.map(function(x){return '<label><input type="checkbox" value="'+esc(x)+'" '+(set.has(x)?'checked':'')+'><span>'+esc(x)+'</span></label>'}).join('')+'</div>'
  }
  function visibilityEditor(current){
    current=current||{};return '<div class="profileV2VisibilityEditor">'+visibilityMeta.map(function(x){return '<label class="profileV2Toggle"><span><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></span><input type="checkbox" data-visibility="'+x[0]+'" '+(current[x[0]]===true?'checked':'')+'><i></i></label>'}).join('')+'</div>'
  }
  function placesEditor(detail){
    var selected=new Set((detail.profile.profile_place_ids||[]).map(String)),items=detail.available_places||[];
    if(!items.length)return '<div class="profileV2EditorEmpty">Сначала сохраните несколько мест во «Вокруг».</div>';
    return '<div class="profileV2PickPlaces">'+items.map(function(p){return '<label><input type="checkbox" data-place-pick value="'+esc(p.id)+'" '+(selected.has(String(p.id))?'checked':'')+'><span><b>'+esc(p.name)+'</b><small>'+esc(p.city||p.kind||'Место')+'</small></span></label>'}).join('')+'</div>'
  }
  function momentsEditor(detail){
    var selected=new Set((detail.profile.profile_moment_ids||[]).map(String)),items=detail.available_moments||[];
    if(!items.length)return '<div class="profileV2EditorEmpty">В Хронике пока нет ваших фотографий.</div>';
    return '<div class="profileV2PickMoments">'+items.map(function(m){return '<label><input type="checkbox" data-moment-pick value="'+esc(m.id)+'" '+(selected.has(String(m.id))?'checked':'')+'><img src="'+esc(m.url)+'" alt=""><i>✓</i></label>'}).join('')+'</div>'
  }
  function pinEditor(detail){
    var p=detail.profile||{},current=p.pinned_type&&p.pinned_id?p.pinned_type+':'+p.pinned_id:'';
    var options=['<option value="">Не закреплять</option>'];
    (detail.events||[]).forEach(function(e){options.push('<option value="event:'+esc(e.id)+'" '+(current==='event:'+e.id?'selected':'')+'>Событие · '+esc(e.title)+'</option>')});
    mergeCommunities(detail,true).forEach(function(c){options.push('<option value="community:'+esc(c.id)+'" '+(current==='community:'+c.id?'selected':'')+'>Сообщество · '+esc(c.name)+'</option>')});
    (detail.available_places||[]).forEach(function(x){options.push('<option value="place:'+esc(x.id)+'" '+(current==='place:'+x.id?'selected':'')+'>Место · '+esc(x.name)+'</option>')});
    return '<select name="pin">'+options.join('')+'</select>'
  }

  function openEditor(detail,focusWant){
    var p=detail.profile||{};document.querySelector('.profileV2EditOverlay')?.remove();
    var o=document.createElement('div');o.className='profileV2EditOverlay';
    o.innerHTML='<div class="profileV2EditSheet"><div class="profileV2EditHead"><div><span class="ey">ЛИЧНАЯ СТРАНИЦА</span><h2>Настроить профиль</h2></div><button type="button">×</button></div>'+
      '<form class="profileV2EditForm">'+
        '<section class="profileV2EditorGroup"><h3>Основное</h3>'+
          '<label>Имя<input name="name" maxlength="80" required value="'+esc(p.display_name||'')+'"></label>'+
          '<label>Город<input name="city" maxlength="80" value="'+esc(p.city||'')+'" placeholder="Ростов-на-Дону"></label>'+
          '<label>О себе<textarea name="bio" maxlength="360" rows="3" placeholder="2–3 короткие строки о себе">'+esc(p.bio||'')+'</textarea></label>'+
          '<label class="wantField">Сейчас хочу…<textarea name="want" maxlength="180" rows="2" placeholder="Например: на выставку в субботу">'+esc(p.want_text||'')+'</textarea></label>'+
          '<label>Срок статуса<select name="want_ttl"><option value="none">Пока не удалю</option><option value="day">24 часа</option><option value="week" selected>7 дней</option></select></label>'+
        '</section>'+
        '<section class="profileV2EditorGroup"><h3>Интересы · до 7</h3>'+interestEditor(p.interests||[])+'</section>'+
        '<section class="profileV2EditorGroup" data-notification-settings><div class="profileV2EditorTitleRow"><h3>Уведомления</h3><button type="button" class="profileV2SoundTest" data-test-notification-sound>Проверить звук</button></div>'+notificationEditor(p.notification_settings||{})+'<button type="button" class="profileV2OpenNotifications" data-open-all-notifications>Открыть все уведомления</button></section>'+
        '<section class="profileV2EditorGroup"><h3>Что показывать другим</h3>'+visibilityEditor(p.profile_visibility||{})+'</section>'+
        '<section class="profileV2EditorGroup"><h3>Мои места · до 5</h3>'+placesEditor(detail)+'</section>'+
        '<section class="profileV2EditorGroup"><h3>Моменты · до 6</h3>'+momentsEditor(detail)+'</section>'+
        '<section class="profileV2EditorGroup"><h3>Закрепить</h3>'+pinEditor(detail)+'</section>'+
        '<div class="profileV2EditActions"><button type="button" class="profileV2RemoveCover" '+(p.cover_url?'':'hidden')+'>Вернуть стандартный фон</button><button class="profileV2Save" type="submit">Сохранить</button></div>'+
        '<div class="profileV2EditStatus" hidden></div>'+
      '</form></div>';
    document.body.appendChild(o);var close=function(){o.remove()};o.querySelector('.profileV2EditHead button').onclick=close;o.onclick=function(e){if(e.target===o)close()};

    function limitChecked(selector,max){
      o.querySelectorAll(selector).forEach(function(input){input.onchange=function(){var checked=o.querySelectorAll(selector+':checked');if(checked.length>max){input.checked=false;alert('Можно выбрать не больше '+max)}}})
    }
    limitChecked('.profileV2InterestEditor input',7);limitChecked('[data-place-pick]',5);limitChecked('[data-moment-pick]',6);
    var soundTest=o.querySelector('[data-test-notification-sound]');if(soundTest)soundTest.onclick=function(){if(typeof window.playLyaNotificationSound==='function')window.playLyaNotificationSound(true);else alert('Звук уведомлений ещё загружается. Закройте настройки и откройте снова.')};
    var allNotifications=o.querySelector('[data-open-all-notifications]');if(allNotifications)allNotifications.onclick=function(e){if(typeof window.openLyaNotifications==='function'){close();window.openLyaNotifications(e)}};

    var remove=o.querySelector('.profileV2RemoveCover');if(remove)remove.onclick=async function(){if(!confirm('Вернуть стандартный фон ЛЯ?'))return;remove.disabled=true;try{await avatarRequest('remove_cover');if(typeof account!=='undefined'&&account&&account.profile)account.profile.cover_url=null;detail.profile.cover_url=null;close();renderSelf()}catch(e){alert(e.message);remove.disabled=false}};

    var form=o.querySelector('form'),saveBtn=form.querySelector('.profileV2Save');
    async function saveProfileSettings(e){
      if(e)e.preventDefault();
      var st=form.querySelector('.profileV2EditStatus');
      st.hidden=false;st.classList.remove('error');st.textContent='Сохраняю…';
      if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Сохраняю…'}
      try{
        var nameInput=form.querySelector('[name="name"]');
        var cityInput=form.querySelector('[name="city"]');
        var bioInput=form.querySelector('[name="bio"]');
        var wantInput=form.querySelector('[name="want"]');
        var ttlInput=form.querySelector('[name="want_ttl"]');
        var pinInput=form.querySelector('[name="pin"]');
        if(!nameInput||!cityInput||!bioInput||!wantInput||!ttlInput||!pinInput)throw new Error('Не удалось прочитать поля профиля');

        var displayName=String(nameInput.value||'').trim();
        if(!displayName)throw new Error('Имя не может быть пустым');
        var want=String(wantInput.value||'').trim(),ttl=String(ttlInput.value||'none'),expires=null;
        if(want&&ttl!=='none'){var d=new Date();d.setTime(d.getTime()+(ttl==='day'?86400000:604800000));expires=d.toISOString()}

        var selectedInterests=Array.from(form.querySelectorAll('.profileV2InterestEditor input:checked')).map(function(x){return x.value});
        var selectedPlaces=Array.from(form.querySelectorAll('[data-place-pick]:checked')).map(function(x){return x.value});
        var selectedMoments=Array.from(form.querySelectorAll('[data-moment-pick]:checked')).map(function(x){return x.value});
        var visibility={};form.querySelectorAll('[data-visibility]').forEach(function(x){visibility[x.dataset.visibility]=x.checked===true});
        var notifications={};form.querySelectorAll('[data-notification]').forEach(function(x){notifications[x.dataset.notification]=x.checked===true});
        var pin=String(pinInput.value||''),parts=pin?pin.split(':'):[],pinType=parts.shift()||null,pinId=parts.join(':')||null;

        var apiFn=window.api||(typeof api==='function'?api:null);
        if(typeof apiFn!=='function')throw new Error('Сервис профиля не загрузился. Обновите страницу.');
        var data=await apiFn('update_profile',{
          display_name:displayName,
          city:String(cityInput.value||'').trim()||null,
          bio:String(bioInput.value||'').trim()||null,
          want_text:want||null,
          want_expires_at:expires,
          interests:selectedInterests,
          profile_visibility:visibility,
          notification_settings:notifications,
          profile_place_ids:selectedPlaces,
          profile_moment_ids:selectedMoments,
          pinned_type:pinType,
          pinned_id:pinId
        });
        if(typeof account!=='undefined'&&account)account.profile=data.profile;
        document.dispatchEvent(new CustomEvent('lya-notification-settings-changed'));
        st.textContent='Сохранено';
        var fresh=await getDetail(myId());
        close();
        var root=document.getElementById('profile-root');
        if(root){root.innerHTML=profileMarkup(fresh,true);bindProfile(root,fresh,true,null)}
      }catch(err){
        st.hidden=false;st.textContent=(err&&err.message)||'Не удалось сохранить изменения';st.classList.add('error');
        if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Сохранить'}
      }
    }
    form.addEventListener('submit',saveProfileSettings);
    if(saveBtn)saveBtn.addEventListener('click',function(e){e.preventDefault();saveProfileSettings(e)});
    if(focusWant)setTimeout(function(){form.elements.want.focus()},120)
  }

  async function sendCircleRequest(userId){return circle('send_request',{target_user_id:userId})}
  async function respondCircle(connectionId,response){return circle('respond_request',{connection_id:connectionId,response:response})}
  function openInvitePicker(person){
    document.querySelector('.profileV2InviteOverlay')?.remove();var o=document.createElement('div');o.className='profileV2InviteOverlay';o.innerHTML='<div class="profileV2InviteSheet"><div class="profileV2EditHead"><div><span class="ey">ПРИГЛАСИТЬ НА СОБЫТИЕ</span><h2>'+esc(person.display_name||'Участника')+'</h2></div><button type="button">×</button></div><div class="profileV2InviteBody"><div class="profileV2Empty">Загружаю события…</div></div></div>';document.body.appendChild(o);var close=function(){o.remove()};o.querySelector('.profileV2EditHead button').onclick=close;o.onclick=function(e){if(e.target===o)close()};
    var body=o.querySelector('.profileV2InviteBody');
    Promise.resolve(window.api('list_events')).then(function(d){var now=Date.now(),events=(d.events||[]).filter(function(e){return !['finished','cancelled'].includes(e.status)&&Date.parse(e.ends_at||e.starts_at)>now});body.innerHTML=events.length?events.map(function(e){return '<button type="button" class="profileV2InviteEvent" data-invite-event="'+esc(e.id)+'"><span>'+esc(fmtDate(e.starts_at))+'</span><strong>'+esc(e.title)+'</strong></button>'}).join(''):'<div class="profileV2Empty">Нет будущих событий, куда можно пригласить.</div>';body.querySelectorAll('[data-invite-event]').forEach(function(b){b.onclick=async function(){b.disabled=true;try{await inviteToEvent(b.dataset.inviteEvent,person.id);b.textContent='Приглашение отправлено ✓'}catch(e){alert(e.message);b.disabled=false}}})}).catch(function(e){body.innerHTML='<div class="profileV2Empty">'+esc(e.message)+'</div>'})
  }

  function openMomentViewer(items,index){
    var m=items[index];if(!m)return;document.querySelector('.profileV2MomentOverlay')?.remove();var o=document.createElement('div');o.className='profileV2MomentOverlay';o.innerHTML='<button type="button">×</button><img src="'+esc(m.url)+'" alt="">';document.body.appendChild(o);o.onclick=function(e){if(e.target===o||e.target.tagName==='BUTTON')o.remove()}
  }

  function bindProfile(root,detail,isSelf,closePublic){
    var p=detail.profile||{};
    var back=root.querySelector('[data-profile-back]');if(back)back.onclick=function(){if(closePublic)closePublic();else if(typeof openView==='function')openView('home')};
    root.querySelectorAll('[data-profile-edit]').forEach(function(b){b.onclick=function(){openEditor(detail,false)}});
    root.querySelectorAll('[data-profile-notification-category]').forEach(function(b){b.onclick=function(e){if(typeof window.openLyaNotifications==='function')window.openLyaNotifications(b.dataset.profileNotificationCategory||'all')}}); 
    hydrateNotificationCenter(root);
    if(isSelf&&!root._lyaNotificationRefresh){
      root._lyaNotificationRefresh=function(){hydrateNotificationCenter(root)};
      document.addEventListener('lya-notifications-changed',root._lyaNotificationRefresh);
      document.addEventListener('lya-notification-count',root._lyaNotificationRefresh)
    }
    var editNotifications=root.querySelector('[data-profile-edit-notifications]');if(editNotifications)editNotifications.onclick=function(){openEditor(detail,false);setTimeout(function(){document.querySelector('[data-notification-settings]')?.scrollIntoView({behavior:'smooth',block:'start'})},140)};
    var openNotifications=root.querySelector('[data-profile-open-notifications]');if(openNotifications)openNotifications.onclick=function(e){if(typeof window.openLyaNotifications==='function')window.openLyaNotifications(e)};
    var ew=root.querySelector('[data-profile-edit-want]');if(ew)ew.onclick=function(){openEditor(detail,true)};
    root.querySelectorAll('[data-profile-event]').forEach(function(b){b.onclick=function(){if(closePublic)closePublic();if(typeof openEventView==='function')openEventView(b.dataset.profileEvent,'profile')}});
    root.querySelectorAll('[data-profile-community]').forEach(function(b){b.onclick=function(){var c=mergeCommunities(detail,isSelf).find(function(x){return String(x.id)===String(b.dataset.profileCommunity)});if(closePublic)closePublic();if(c&&typeof window.openCommunityDetail==='function')window.openCommunityDetail(c.id,c)}});
    root.querySelectorAll('[data-profile-place]').forEach(function(b){b.onclick=function(){if(closePublic)closePublic();if(typeof window.openPlaceView==='function')window.openPlaceView(b.dataset.profilePlace)}});
    root.querySelectorAll('[data-profile-person]').forEach(function(b){b.onclick=function(){var x=(detail.circle_people||[]).find(function(q){return String(q.id)===String(b.dataset.profilePerson)});if(x)openPublicProfile(x)}});
    root.querySelectorAll('[data-profile-moment]').forEach(function(b){b.onclick=function(){openMomentViewer(detail.moments||[],Number(b.dataset.profileMoment))}});

    var pin=root.querySelector('[data-profile-pinned]');if(pin)pin.onclick=function(){var x=detail.pinned;if(!x)return;if(x.type==='event'&&typeof openEventView==='function'){if(closePublic)closePublic();openEventView(x.id,'profile')}else if(x.type==='place'&&typeof window.openPlaceView==='function'){if(closePublic)closePublic();window.openPlaceView(x.id)}else if(x.type==='community'&&typeof window.openCommunityDetail==='function'){if(closePublic)closePublic();window.openCommunityDetail(x.id,x)}};

    var chat=root.querySelector('[data-profile-chat]');if(chat)chat.onclick=function(){if(chat.disabled)return;if(closePublic)closePublic();if(typeof window.openLyaDirectChat==='function')window.openLyaDirectChat(p)};
    root.querySelectorAll('[data-profile-invite],[data-profile-want-invite]').forEach(function(invite){invite.onclick=function(){if(!invite.disabled)openInvitePicker(p)}});
    var add=root.querySelector('[data-profile-add]');if(add)add.onclick=async function(){add.disabled=true;try{await sendCircleRequest(p.id);add.textContent='Запрос отправлен';detail.relation={status:'pending',direction:'outgoing'};document.dispatchEvent(new CustomEvent('vmeste-circle-changed'))}catch(e){alert(e.message);add.disabled=false}};
    var accept=root.querySelector('[data-profile-accept]');if(accept)accept.onclick=async function(){accept.disabled=true;try{await respondCircle(detail.relation.connection_id,'accepted');detail.relation={status:'accepted'};if(closePublic)openPublicProfile(p);document.dispatchEvent(new CustomEvent('vmeste-circle-changed'))}catch(e){alert(e.message);accept.disabled=false}};
    var signout=root.querySelector('[data-profile-signout]');if(signout)signout.onclick=function(){if(typeof signOut==='function')signOut()};

    if(isSelf){
      var cover=root.querySelector('[data-profile-cover]'),coverInput=root.querySelector('[data-profile-cover-input]');
      if(cover&&coverInput){
        coverInput.addEventListener('change',async function(){
          var file=coverInput.files&&coverInput.files[0];if(!file)return;
          var originalHtml=cover.innerHTML;cover.classList.add('is-loading');cover.setAttribute('aria-busy','true');
          try{
            var blob=null;
            if(typeof window.openImageCropperV2==='function'){
              blob=await window.openImageCropperV2(file,{
                aspect:430/235,
                outputWidth:1400,
                outputHeight:765,
                maxZoom:4,
                quality:.9,
                touchOnly:true,
                title:'Настроить обложку'
              });
              if(!blob){cover.classList.remove('is-loading');cover.removeAttribute('aria-busy');return}
            }else{
              blob=await prepareImage(file,1400,765,.9)
            }
            var d=await avatarRequest('upload_cover',blob);
            if(!d||!d.cover_url)throw new Error('Сервер не вернул адрес обложки');
            if(typeof account!=='undefined'&&account&&account.profile)account.profile.cover_url=d.cover_url;
            setTimeout(function(){renderSelf()},120);
          }catch(e){
            cover.innerHTML=originalHtml;cover.classList.remove('is-loading');cover.removeAttribute('aria-busy');alert((e&&e.message)||'Не удалось загрузить фон');
          }finally{coverInput.value=''}
        })
      }
      var av=root.querySelector('[data-profile-avatar]'),avInput=root.querySelector('[data-profile-avatar-input]');
      if(av&&avInput){
        av.onclick=function(){if(typeof avInput.showPicker==='function'){try{avInput.showPicker();return}catch(e){}}avInput.click()};
        avInput.addEventListener('change',async function(){var file=avInput.files&&avInput.files[0];if(!file)return;try{var blob=null;if(typeof window.openImageCropperV2==='function'){blob=await window.openImageCropperV2(file,{aspect:1,outputWidth:960,outputHeight:960,circle:true,maxZoom:5,quality:.9,title:'Фото профиля'});if(!blob)return}else{blob=await prepareImage(file,700,700,.9)}var d=await avatarRequest('upload',blob);if(typeof account!=='undefined'&&account&&account.profile)account.profile.avatar_url=d.avatar_url;if(typeof updateAvatars==='function')updateAvatars();renderSelf()}catch(e){alert(e.message)}finally{avInput.value=''}})
      }
    }
  }

  async function getDetail(userId){return circle('get_person_profile',{user_id:userId})}
  async function renderSelf(){
    var root=document.getElementById('profile-root');if(!root)return;if(!token()){root.innerHTML='<div class="profileV2Guest"><h2>Войдите в ЛЯ</h2><button type="button">Войти</button></div>';root.querySelector('button').onclick=function(){if(typeof openView==='function')openView('login')};return}
    root.innerHTML='<div class="profileV2Loading">Собираю вашу страницу…</div>';
    try{var detail=await getDetail(myId());root.innerHTML=profileMarkup(detail,true);bindProfile(root,detail,true,null)}catch(e){root.innerHTML='<div class="profileV2Loading">'+esc(e.message)+'</div>'}
  }

  async function openPublicProfile(seed){
    if(!seed||!seed.id)return;document.querySelector('.profileV2PublicOverlay')?.remove();
    var o=document.createElement('div');o.className='profileV2PublicOverlay';o.innerHTML='<div class="profileV2Loading">Открываю профиль…</div>';document.body.appendChild(o);var close=function(){o.remove()};
    try{var detail=await getDetail(seed.id);o.innerHTML=profileMarkup(detail,false);bindProfile(o,detail,false,close)}catch(e){o.innerHTML='<div class="profileV2PublicError"><button type="button">×</button><p>'+esc(e.message)+'</p></div>';o.querySelector('button').onclick=close}
  }

  window.openLyaPublicProfileV2=openPublicProfile;
  window.openLyaPersonProfile=openPublicProfile;
  window.renderProfileV2=renderSelf;
  try{renderProfile=renderSelf;window.renderProfile=renderSelf}catch(e){window.renderProfile=renderSelf}
})();