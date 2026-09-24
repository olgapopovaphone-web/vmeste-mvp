(function(){
  if(window.__lyaProfileV3)return;window.__lyaProfileV3=true;
  var CIRCLE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-circle-api';
  var AVATAR_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-avatar-api';
  var INVITE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-invite-api';
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var interestsList=['Кино','Музыка','Театр','Юмор','Выставки','С детьми','Прогулки','Еда','Спорт','Искусство','Книги','Путешествия'];
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
  function mergeCommunities(detail,isSelf){
    var map=new Map();(detail.communities||[]).forEach(function(c){map.set(String(c.id),c)});
    if(isSelf)localGroups().forEach(function(c){if(c&&c.id&&!map.has(String(c.id)))map.set(String(c.id),c)});
    return Array.from(map.values()).slice(0,6)
  }

  function actions(detail){
    var p=detail.profile||{},r=detail.relation||{};
    if(r.status==='self')return '';
    var circleLabel='В круг',circleClass='primary',circleAttr='data-profile-add';
    if(r.status==='accepted'){circleLabel='В кругу';circleClass='';circleAttr='disabled'}
    else if(r.status==='pending'&&r.direction==='outgoing'){circleLabel='Запрос отправлен';circleClass='';circleAttr='disabled'}
    else if(r.status==='pending'&&r.direction==='incoming'){circleLabel='Принять в круг';circleClass='primary';circleAttr='data-profile-accept'}
    var accepted=r.status==='accepted';
    return '<div class="profileV2Actions">'+
      '<button type="button" class="profileV2Action '+circleClass+'" '+circleAttr+'>'+circleLabel+'</button>'+
      '<button type="button" class="profileV2Action" data-profile-chat '+(accepted?'':'disabled')+'>Написать</button>'+
      '<button type="button" class="profileV2Action" data-profile-invite '+(accepted?'':'disabled')+'>Пригласить</button>'+
    '</div>'
  }

  function pinnedBlock(detail,isSelf){
    var x=detail.pinned;if(!x){if(!isSelf)return'';return '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">ЗАКРЕПЛЕНО</span><h2>Главное сейчас</h2></div>'+privacyBadge(detail,'pinned',isSelf)+'</div><div class="profileV2Empty">Выберите событие, сообщество или место в настройках профиля.</div></section>'}
    var title=x.type==='place'?(x.name||'Место'):(x.name||x.title||'Событие'),meta=x.type==='event'?'Событие · '+fmtDate(x.starts_at):x.type==='community'?'Сообщество':'Место · '+(x.city||'');
    var cover=x.cover_url?' style="background-image:url(\''+esc(String(x.cover_url).replace(/'/g,'%27'))+'\')"':'';
    return '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">ЗАКРЕПЛЕНО</span><h2>Главное сейчас</h2></div>'+privacyBadge(detail,'pinned',isSelf)+'</div><button type="button" class="profileV2Pinned" data-profile-pinned="'+esc(x.type)+':'+esc(x.id)+'"'+cover+'><span>'+esc(meta)+'</span><strong>'+esc(title)+'</strong></button></section>'
  }

  function wantBlock(detail,isSelf){
    var p=detail.profile||{};
    if(!p.want_text){if(!isSelf)return'';return '<button type="button" class="profileV2Want profileV2WantEmpty" data-profile-edit-want><span class="ey">СЕЙЧАС ХОЧУ…</span><p>Добавить статус</p><small>Например: на выставку, гулять вечером, найти компанию на концерт.</small></button>'}
    var invite=!isSelf&&detail.relation&&detail.relation.status==='accepted'?'<button type="button" data-profile-want-invite>Пригласить</button>':'';
    return '<section class="profileV2Want"><div class="profileV2WantTop"><span class="ey">СЕЙЧАС ХОЧУ…</span>'+privacyBadge(detail,'want',isSelf)+'</div><p>'+esc(p.want_text)+'</p><div class="profileV2WantActions">'+(isSelf?'<button type="button" data-profile-edit-want>Изменить</button>':invite)+'</div></section>'
  }

  function circleBlock(detail,isSelf){
    var people=detail.circle_people||[];
    if(!people.length&&!isSelf)return'';
    return '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">МОЙ КРУГ</span><h2>'+(people.length?people.length+' '+(people.length===1?'человек':'людей'):'Пока пусто')+'</h2></div>'+privacyBadge(detail,'circle',isSelf)+'</div>'+
      (people.length?'<div class="profileV2Circle">'+people.map(function(p){return '<button type="button" data-profile-person="'+esc(p.id)+'">'+avatarHtml(p,'small')+'<span>'+esc(p.display_name||'Участник')+'</span></button>'}).join('')+'</div>':'<div class="profileV2Empty">Добавляйте знакомых во «В кругу».</div>')+
    '</section>'
  }

  function commonBlock(detail){
    var people=Number(detail.common_people_count||0),events=detail.common_events||[];
    if(!people&&!events.length)return'';
    return '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">У ВАС ЕСТЬ ОБЩЕЕ</span><h2>Уже пересекались</h2></div></div><div class="profileV2CommonGrid">'+
      '<div><strong>'+people+'</strong><span>общих знакомых</span></div><div><strong>'+events.length+'</strong><span>общих событий</span></div></div>'+
      (events.length?'<div class="profileV2CommonEvents">'+events.slice(0,3).map(function(e){return '<button type="button" data-profile-event="'+esc(e.id)+'"><span>'+esc(fmtDate(e.starts_at))+'</span><b>'+esc(e.title)+'</b></button>'}).join('')+'</div>':'')+
    '</section>'
  }

  function interestBlock(detail,isSelf){
    var items=(detail.profile&&detail.profile.interests)||[];
    if(!items.length&&!isSelf)return'';
    return '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">ИНТЕРЕСЫ</span><h2>Что нравится</h2></div>'+privacyBadge(detail,'interests',isSelf)+'</div>'+
      (items.length?'<div class="profileV2Interests">'+items.slice(0,7).map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div>':'<div class="profileV2Empty">Выберите до 7 интересов.</div>')+
    '</section>'
  }

  function eventCards(events){
    if(!events||!events.length)return '<div class="profileV2Empty">Пока ничего не запланировано.</div>';
    return '<div class="profileV2EventList">'+events.map(function(e){return '<button type="button" class="profileV2Event" data-profile-event="'+esc(e.id)+'"><span>'+esc(fmtDate(e.starts_at))+'</span><strong>'+esc(e.title||'Событие')+'</strong><small>'+esc(e.location_name||'Место не указано')+'</small></button>'}).join('')+'</div>'
  }
  function communityCards(items){
    if(!items||!items.length)return '<div class="profileV2Empty">Сообщества пока не добавлены.</div>';
    return '<div class="profileV2CommunityList">'+items.map(function(c){var style=c.cover_url?' style="background-image:url(\''+esc(String(c.cover_url).replace(/'/g,'%27'))+'\')"':'';return '<button type="button" class="profileV2Community" data-profile-community="'+esc(c.id)+'"'+style+'><span>'+esc(c.role==='owner'?'Создатель':'Сообщество')+'</span><strong>'+esc(c.name||'Сообщество')+'</strong></button>'}).join('')+'</div>'
  }
  function placesBlock(detail,isSelf){
    var items=detail.places||[];
    if(!items.length&&!isSelf)return'';
    return '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">МОИ МЕСТА</span><h2>Куда люблю ходить</h2></div>'+privacyBadge(detail,'places',isSelf)+'</div>'+
      (items.length?'<div class="profileV2Places">'+items.map(function(p){var style=p.cover_url?' style="background-image:url(\''+esc(String(p.cover_url).replace(/'/g,'%27'))+'\')"':'';return '<button type="button" data-profile-place="'+esc(p.id)+'"'+style+'><span>'+esc(p.kind||'Место')+'</span><strong>'+esc(p.name)+'</strong><small>'+esc(p.city||'')+'</small></button>'}).join('')+'</div>':'<div class="profileV2Empty">Сохраните места и выберите 3–5 любимых в настройках.</div>')+
    '</section>'
  }
  function momentsBlock(detail,isSelf){
    var items=detail.moments||[];
    if(!items.length&&!isSelf)return'';
    return '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">МОМЕНТЫ</span><h2>Из Хроники</h2></div>'+privacyBadge(detail,'moments',isSelf)+'</div>'+
      (items.length?'<div class="profileV2Moments">'+items.map(function(m,i){return '<button type="button" data-profile-moment="'+i+'"><img src="'+esc(m.url)+'" alt=""></button>'}).join('')+'</div>':'<div class="profileV2Empty">Выберите несколько фотографий из завершённых событий.</div>')+
    '</section>'
  }

  function profileMarkup(detail,isSelf){
    var p=detail.profile||{},comms=mergeCommunities(detail,isSelf);
    var about=p.bio?'<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">О СЕБЕ</span></div>'+privacyBadge(detail,'bio',isSelf)+'</div><p class="profileV2Bio">'+esc(p.bio)+'</p></section>':(isSelf?'<button type="button" class="profileV2AddSection" data-profile-edit>＋ Добавить «О себе»</button>':'');
    var upcoming=(detail.events&&detail.events.length)||isSelf?'<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">СКОРО БУДУ</span><h2>Ближайшие события</h2></div>'+privacyBadge(detail,'events',isSelf)+'</div>'+eventCards(detail.events||[])+'</section>':'';
    var communities=(comms.length||isSelf)?'<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">СООБЩЕСТВА</span><h2>Где я состою</h2></div>'+privacyBadge(detail,'communities',isSelf)+'</div>'+communityCards(comms)+'</section>':'';
    return '<article class="profileV2">'+
      '<header class="profileV2Hero '+(p.cover_url?'has-cover':'standard-cover')+'"'+coverStyle(p)+'>'+
        '<div class="profileV2HeroShade"></div>'+
        '<button type="button" class="profileV2Back" data-profile-back>‹</button>'+
        (isSelf?'<button type="button" class="profileV2Edit" data-profile-edit>Настроить</button><button type="button" class="profileV2CoverButton" data-profile-cover>'+(p.cover_url?'Сменить фон':'Загрузить фон')+'</button>':'')+
      '</header>'+
      '<div class="profileV2Main">'+
        '<div class="profileV2Identity">'+
          '<button type="button" class="profileV2AvatarButton" '+(isSelf?'data-profile-avatar':'')+'>'+avatarHtml(p,'large')+'</button>'+
          '<div><h1>'+esc(p.display_name||'Участник')+'</h1><p>'+esc(p.city||'Город не указан')+'</p></div>'+
        '</div>'+
        actions(detail)+
        about+
        pinnedBlock(detail,isSelf)+
        wantBlock(detail,isSelf)+
        (!isSelf?commonBlock(detail):'')+
        circleBlock(detail,isSelf)+
        interestBlock(detail,isSelf)+
        upcoming+
        communities+
        placesBlock(detail,isSelf)+
        momentsBlock(detail,isSelf)+
        (isSelf?'<button type="button" class="profileV2Signout" data-profile-signout>Выйти из аккаунта</button>':'')+
      '</div>'+
      '<input type="file" data-profile-cover-input accept="image/jpeg,image/png,image/webp" hidden>'+
      '<input type="file" data-profile-avatar-input accept="image/jpeg,image/png,image/webp" hidden>'+
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
          profile_place_ids:selectedPlaces,
          profile_moment_ids:selectedMoments,
          pinned_type:pinType,
          pinned_id:pinId
        });
        if(typeof account!=='undefined'&&account)account.profile=data.profile;
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
      var cover=root.querySelector('[data-profile-cover]'),coverInput=root.querySelector('[data-profile-cover-input]');if(cover&&coverInput){cover.onclick=function(){coverInput.click()};coverInput.onchange=async function(){var file=coverInput.files&&coverInput.files[0];if(!file)return;cover.textContent='Загружаю…';cover.disabled=true;try{var blob=await prepareImage(file,1400,650,.87),d=await avatarRequest('upload_cover',blob);if(typeof account!=='undefined'&&account&&account.profile)account.profile.cover_url=d.cover_url;renderSelf()}catch(e){alert(e.message);cover.disabled=false;cover.textContent='Загрузить фон'}finally{coverInput.value=''}}}
      var av=root.querySelector('[data-profile-avatar]'),avInput=root.querySelector('[data-profile-avatar-input]');if(av&&avInput){av.onclick=function(){avInput.click()};avInput.onchange=async function(){var file=avInput.files&&avInput.files[0];if(!file)return;try{var blob=await prepareImage(file,700,700,.9),d=await avatarRequest('upload',blob);if(typeof account!=='undefined'&&account&&account.profile)account.profile.avatar_url=d.avatar_url;if(typeof updateAvatars==='function')updateAvatars();renderSelf()}catch(e){alert(e.message)}finally{avInput.value=''}}}
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