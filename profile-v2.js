(function(){
  if(window.__lyaProfileV2)return;window.__lyaProfileV2=true;
  var CIRCLE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-circle-api';
  var AVATAR_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-avatar-api';
  var INVITE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-invite-api';
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var interestsList=['Кино','Музыка','Театр','Юмор','Выставки','С детьми','Прогулки','Еда','Спорт'];
  var themes=[['paper','Светлая'],['sage','Шалфей'],['graphite','Графит'],['sky','Серо-голубая'],['coral','Коралловая']];

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
  function themeClass(p){return 'theme-'+(p.profile_theme||'paper')}
  function avatarHtml(p,cls){var name=p.display_name||'У',c=cls||'';if(p.avatar_url)return '<span class="profileV2Avatar '+c+' has-photo" style="background-image:url(\''+esc(p.avatar_url)+'\')"></span>';return '<span class="profileV2Avatar '+c+'">'+esc(name.trim().slice(0,1).toUpperCase()||'У')+'</span>'}
  function coverStyle(p){return p.cover_url?' style="background-image:url(\''+esc(String(p.cover_url).replace(/'/g,'%27'))+'\')"':''}
  function mergeCommunities(detail,isSelf){
    var map=new Map();(detail.communities||[]).forEach(function(c){map.set(String(c.id),c)});
    if(isSelf)localGroups().forEach(function(c){if(c&&c.id&&!map.has(String(c.id)))map.set(String(c.id),c)});
    return Array.from(map.values()).slice(0,6)
  }
  function eventCards(events){
    if(!events||!events.length)return '<div class="profileV2Empty">Пока ничего не запланировано.</div>';
    return '<div class="profileV2EventList">'+events.map(function(e){return '<button type="button" class="profileV2Event" data-profile-event="'+esc(e.id)+'"><span>'+esc(fmtDate(e.starts_at))+'</span><strong>'+esc(e.title||'Событие')+'</strong><small>'+esc(e.location_name||'Место не указано')+'</small></button>'}).join('')+'</div>'
  }
  function communityCards(items){
    if(!items||!items.length)return '<div class="profileV2Empty">Сообщества пока не добавлены.</div>';
    return '<div class="profileV2CommunityList">'+items.map(function(c){var style=c.cover_url?' style="background-image:url(\''+esc(String(c.cover_url).replace(/'/g,'%27'))+'\')"':'';return '<button type="button" class="profileV2Community" data-profile-community="'+esc(c.id)+'"'+style+'><span>'+esc(c.role==='owner'?'Создатель':'Сообщество')+'</span><strong>'+esc(c.name||'Сообщество')+'</strong></button>'}).join('')+'</div>'
  }
  function wantBlock(p,isSelf){
    if(p.want_text)return '<section class="profileV2Want"><span class="ey">ХОЧУ…</span><p>'+esc(p.want_text)+'</p>'+(isSelf?'<button type="button" data-profile-edit-want>Изменить</button>':'')+'</section>';
    return isSelf?'<button type="button" class="profileV2Want profileV2WantEmpty" data-profile-edit-want><span class="ey">ХОЧУ…</span><p>Что вам хочется сейчас?</p><small>Концерт, выставка, прогулка, ужин — напишите, и это увидят люди вокруг.</small></button>':''
  }
  function actions(detail){
    var p=detail.profile,r=detail.relation||{};
    if(r.status==='self')return '';
    var a='';
    if(r.status==='accepted'){
      a+='<button type="button" class="profileV2Action primary" data-profile-chat>Написать</button>';
      a+='<button type="button" class="profileV2Action" data-profile-invite>Пригласить</button>';
    }else if(r.status==='pending'&&r.direction==='outgoing'){
      a+='<button type="button" class="profileV2Action" disabled>Запрос отправлен</button>';
    }else if(r.status==='pending'&&r.direction==='incoming'){
      a+='<button type="button" class="profileV2Action primary" data-profile-accept>Принять в круг</button>';
    }else{
      a+='<button type="button" class="profileV2Action primary" data-profile-add>Добавить в круг</button>';
    }
    return '<div class="profileV2Actions">'+a+'</div>'
  }
  function profileMarkup(detail,isSelf){
    var p=detail.profile||{},comms=mergeCommunities(detail,isSelf);
    var interests=(p.interests||[]).map(function(x){return '<span>'+esc(x)+'</span>'}).join('');
    var common=!isSelf&&detail.common_people_count?'<span>'+detail.common_people_count+' общих</span>':'';
    return '<article class="profileV2 '+themeClass(p)+'">'+
      '<header class="profileV2Hero '+(p.cover_url?'has-cover':'')+'"'+coverStyle(p)+'>'+
        '<div class="profileV2HeroShade"></div>'+
        '<button type="button" class="profileV2Back" data-profile-back>‹</button>'+
        (isSelf?'<button type="button" class="profileV2Edit" data-profile-edit>Редактировать</button>':'')+
        (isSelf?'<button type="button" class="profileV2CoverButton" data-profile-cover>Обложка</button>':'')+
      '</header>'+
      '<div class="profileV2Main">'+
        '<div class="profileV2Identity">'+
          '<button type="button" class="profileV2AvatarButton" '+(isSelf?'data-profile-avatar':'')+'>'+avatarHtml(p,'large')+'</button>'+
          '<div><h1>'+esc(p.display_name||'Участник')+'</h1><p>'+esc(p.city||'Город не указан')+'</p>'+(common?'<div class="profileV2Common">'+common+'</div>':'')+'</div>'+
        '</div>'+
        actions(detail)+
        wantBlock(p,isSelf)+
        (p.bio?'<section class="profileV2Section"><span class="ey">О СЕБЕ</span><p class="profileV2Bio">'+esc(p.bio)+'</p></section>':(isSelf?'<button type="button" class="profileV2AddSection" data-profile-edit>＋ Добавить «О себе»</button>':''))+
        (interests?'<section class="profileV2Section"><span class="ey">ИНТЕРЕСЫ</span><div class="profileV2Interests">'+interests+'</div></section>':'')+
        '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">СКОРО БУДУ</span><h2>Ближайшие события</h2></div></div>'+eventCards(detail.events||[])+'</section>'+
        '<section class="profileV2Section"><div class="profileV2SectionHead"><div><span class="ey">В КРУГУ</span><h2>Сообщества</h2></div></div>'+communityCards(comms)+'</section>'+
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
  function themeEditor(current){
    return '<div class="profileV2ThemeEditor">'+themes.map(function(x){return '<label class="'+(x[0]===current?'active':'')+'"><input type="radio" name="profile-theme" value="'+x[0]+'" '+(x[0]===current?'checked':'')+'><i></i><span>'+x[1]+'</span></label>'}).join('')+'</div>'
  }
  function openEditor(detail,focusWant){
    var p=detail.profile||{};document.querySelector('.profileV2EditOverlay')?.remove();
    var o=document.createElement('div');o.className='profileV2EditOverlay';
    o.innerHTML='<div class="profileV2EditSheet"><div class="profileV2EditHead"><div><span class="ey">ЛИЧНАЯ СТРАНИЦА</span><h2>Редактировать</h2></div><button type="button">×</button></div>'+
      '<form class="profileV2EditForm">'+
        '<label>Имя<input name="name" maxlength="80" required value="'+esc(p.display_name||'')+'"></label>'+
        '<label>Город<input name="city" maxlength="80" value="'+esc(p.city||'')+'" placeholder="Ростов-на-Дону"></label>'+
        '<label>О себе<textarea name="bio" maxlength="500" rows="3" placeholder="Пара строк о себе">'+esc(p.bio||'')+'</textarea></label>'+
        '<label class="wantField">Хочу…<textarea name="want" maxlength="180" rows="2" placeholder="Например: на джаз в пятницу">'+esc(p.want_text||'')+'</textarea></label>'+
        '<label>Показывать «Хочу…»<select name="want_ttl"><option value="none">Пока не удалю</option><option value="day">24 часа</option><option value="week" selected>7 дней</option></select></label>'+
        '<fieldset><legend>Интересы</legend>'+interestEditor(p.interests||[])+'</fieldset>'+
        '<fieldset><legend>Оформление</legend>'+themeEditor(p.profile_theme||'paper')+'</fieldset>'+
        '<label class="profileV2Toggle"><span><b>Показывать будущие события</b><small>Другие увидят открытые события, куда вы собираетесь.</small></span><input type="checkbox" name="show_events" '+(p.show_future_events!==false?'checked':'')+'><i></i></label>'+
        '<div class="profileV2EditActions"><button type="button" class="profileV2RemoveCover" '+(p.cover_url?'':'hidden')+'>Удалить обложку</button><button class="profileV2Save" type="submit">Сохранить</button></div>'+
        '<div class="profileV2EditStatus" hidden></div>'+
      '</form></div>';
    document.body.appendChild(o);var close=function(){o.remove()};o.querySelector('.profileV2EditHead button').onclick=close;o.onclick=function(e){if(e.target===o)close()};
    o.querySelectorAll('.profileV2ThemeEditor input').forEach(function(i){i.onchange=function(){o.querySelectorAll('.profileV2ThemeEditor label').forEach(function(l){l.classList.toggle('active',!!l.querySelector('input:checked'))})}});
    var remove=o.querySelector('.profileV2RemoveCover');if(remove)remove.onclick=async function(){if(!confirm('Удалить обложку профиля?'))return;remove.disabled=true;try{await avatarRequest('remove_cover');if(typeof account!=='undefined'&&account&&account.profile)account.profile.cover_url=null;detail.profile.cover_url=null;close();renderSelf()}catch(e){alert(e.message);remove.disabled=false}};
    var form=o.querySelector('form');form.onsubmit=async function(e){e.preventDefault();var st=form.querySelector('.profileV2EditStatus');st.hidden=false;st.textContent='Сохраняю…';var want=form.elements.want.value.trim(),ttl=form.elements.want_ttl.value,expires=null;if(want&&ttl!=='none'){var d=new Date();d.setTime(d.getTime()+(ttl==='day'?86400000:604800000));expires=d.toISOString()}var selected=Array.from(form.querySelectorAll('.profileV2InterestEditor input:checked')).map(function(x){return x.value});try{var data=await window.api('update_profile',{display_name:form.elements.name.value.trim(),city:form.elements.city.value.trim()||null,bio:form.elements.bio.value.trim()||null,want_text:want||null,want_expires_at:expires,interests:selected,profile_theme:form.querySelector('input[name="profile-theme"]:checked')?.value||'paper',show_future_events:form.elements.show_events.checked});if(typeof account!=='undefined'&&account)account.profile=data.profile;close();renderSelf()}catch(err){st.textContent=err.message;st.classList.add('error')}};
    if(focusWant)setTimeout(function(){form.elements.want.focus()},120)
  }

  async function sendCircleRequest(userId){
    return circle('send_request',{target_user_id:userId})
  }
  async function respondCircle(connectionId,response){
    return circle('respond_request',{connection_id:connectionId,response:response})
  }
  function openInvitePicker(person){
    document.querySelector('.profileV2InviteOverlay')?.remove();var o=document.createElement('div');o.className='profileV2InviteOverlay';o.innerHTML='<div class="profileV2InviteSheet"><div class="profileV2EditHead"><div><span class="ey">ПРИГЛАСИТЬ</span><h2>'+esc(person.display_name||'Участника')+'</h2></div><button type="button">×</button></div><div class="profileV2InviteBody"><div class="profileV2Empty">Загружаю события…</div></div></div>';document.body.appendChild(o);var close=function(){o.remove()};o.querySelector('.profileV2EditHead button').onclick=close;o.onclick=function(e){if(e.target===o)close()};
    var body=o.querySelector('.profileV2InviteBody');
    Promise.resolve(window.api('list_events')).then(function(d){var now=Date.now(),events=(d.events||[]).filter(function(e){return !['finished','cancelled'].includes(e.status)&&Date.parse(e.ends_at||e.starts_at)>now});body.innerHTML=events.length?events.map(function(e){return '<button type="button" class="profileV2InviteEvent" data-invite-event="'+esc(e.id)+'"><span>'+esc(fmtDate(e.starts_at))+'</span><strong>'+esc(e.title)+'</strong></button>'}).join(''):'<div class="profileV2Empty">Нет будущих событий, куда можно пригласить.</div>';body.querySelectorAll('[data-invite-event]').forEach(function(b){b.onclick=async function(){b.disabled=true;try{await inviteToEvent(b.dataset.inviteEvent,person.id);b.textContent='Приглашение отправлено ✓'}catch(e){alert(e.message);b.disabled=false}}})}).catch(function(e){body.innerHTML='<div class="profileV2Empty">'+esc(e.message)+'</div>'})
  }

  function bindProfile(root,detail,isSelf,closePublic){
    var p=detail.profile||{};
    var back=root.querySelector('[data-profile-back]');if(back)back.onclick=function(){if(closePublic)closePublic();else if(typeof openView==='function')openView('home')};
    root.querySelectorAll('[data-profile-edit]').forEach(function(b){b.onclick=function(){openEditor(detail,false)}});
    var ew=root.querySelector('[data-profile-edit-want]');if(ew)ew.onclick=function(){openEditor(detail,true)};
    root.querySelectorAll('[data-profile-event]').forEach(function(b){b.onclick=function(){if(closePublic)closePublic();if(typeof openEventView==='function')openEventView(b.dataset.profileEvent,'profile')}});
    root.querySelectorAll('[data-profile-community]').forEach(function(b){b.onclick=function(){var c=mergeCommunities(detail,isSelf).find(function(x){return String(x.id)===String(b.dataset.profileCommunity)});if(closePublic)closePublic();if(c&&typeof window.openCommunityDetail==='function')window.openCommunityDetail(c.id,c)}});
    var chat=root.querySelector('[data-profile-chat]');if(chat)chat.onclick=function(){if(closePublic)closePublic();if(typeof window.openLyaDirectChat==='function')window.openLyaDirectChat(p)};
    var invite=root.querySelector('[data-profile-invite]');if(invite)invite.onclick=function(){openInvitePicker(p)};
    var add=root.querySelector('[data-profile-add]');if(add)add.onclick=async function(){add.disabled=true;try{await sendCircleRequest(p.id);add.textContent='Запрос отправлен';detail.relation={status:'pending',direction:'outgoing'};document.dispatchEvent(new CustomEvent('vmeste-circle-changed'))}catch(e){alert(e.message);add.disabled=false}};
    var accept=root.querySelector('[data-profile-accept]');if(accept)accept.onclick=async function(){accept.disabled=true;try{await respondCircle(detail.relation.connection_id,'accepted');detail.relation={status:'accepted'};if(closePublic)openPublicProfile(p);document.dispatchEvent(new CustomEvent('vmeste-circle-changed'))}catch(e){alert(e.message);accept.disabled=false}};
    var signout=root.querySelector('[data-profile-signout]');if(signout)signout.onclick=function(){if(typeof signOut==='function')signOut()};
    if(isSelf){
      var cover=root.querySelector('[data-profile-cover]'),coverInput=root.querySelector('[data-profile-cover-input]');if(cover&&coverInput){cover.onclick=function(){coverInput.click()};coverInput.onchange=async function(){var file=coverInput.files&&coverInput.files[0];if(!file)return;cover.textContent='Загружаю…';cover.disabled=true;try{var blob=await prepareImage(file,1400,650,.87),d=await avatarRequest('upload_cover',blob);if(typeof account!=='undefined'&&account&&account.profile)account.profile.cover_url=d.cover_url;renderSelf()}catch(e){alert(e.message);cover.disabled=false;cover.textContent='Обложка'}finally{coverInput.value=''}}}
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