(function(){
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var INVITES_KEY='vmeste_community_invites_proto_v1';
  var LINKS_KEY='vmeste_event_group_proto_v1';
  var CHAT_KEY='vmeste_community_chat_proto_v1';
  var APP_URL='https://vmeste-app-omega.vercel.app';
  var CIRCLE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-circle-api';
  var activeGroupId=null,activeSnapshot=null,activeTab='events';
  var lastEvents=null,lastChronicle=null,lastAlbum=null,albumLoading=false,serverMembers=null;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function read(key,fallback){try{var v=JSON.parse(localStorage.getItem(key)||'');return v||fallback}catch(e){return fallback}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function groups(){var a=read(GROUPS_KEY,[]);return Array.isArray(a)?a:[]}
  function invites(){var a=read(INVITES_KEY,[]);return Array.isArray(a)?a:[]}
  function links(){var m=read(LINKS_KEY,{});return m&&typeof m==='object'?m:{}}
  function chats(){var m=read(CHAT_KEY,{});return m&&typeof m==='object'?m:{}}
  function session(){try{return JSON.parse(localStorage.getItem('vmeste_session_v1')||'null')}catch(e){return null}}
  function hasSession(){var s=session();return !!(s&&s.access_token)}
  async function circleApi(action,payload){var ss=session();if(!ss||!ss.access_token)throw new Error('Войдите в ЛЯ');var r=await fetch(CIRCLE_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ss.access_token},body:JSON.stringify(Object.assign({action:action},payload||{}))});var d=await r.json().catch(function(){return{error:'Некорректный ответ сервера'}});if(!r.ok)throw new Error(d.error||'Ошибка запроса');return d}
  function currentUserId(){var s=session();return s&&s.user&&s.user.id||window.account&&window.account.user&&window.account.user.id||''}
  function accountName(){var s=session(),u=s&&s.user,meta=u&&u.user_metadata||{};return window.account&&window.account.profile&&window.account.profile.display_name||window.account&&window.account.user&&window.account.user.email||meta.display_name||meta.name||u&&u.email||'Вы'}
  function memberWord(n){var m=Math.abs(n)%100,d=m%10;if(m>10&&m<20)return'участников';if(d===1)return'участник';if(d>1&&d<5)return'участника';return'участников'}
  function memberCopy(){return groups().find(function(g){return g.id===activeGroupId})||null}
  function inviteCopy(){return invites().find(function(g){return g.id===activeGroupId})||null}
  function group(){return memberCopy()||inviteCopy()||activeSnapshot||null}
  function isMember(){return !!memberCopy()}
  function isInvited(){return !!inviteCopy()&&!isMember()}
  function isOwner(g){var m=memberCopy()||g;if(!isMember())return false;var uid=currentUserId();if(m&&m.owner_id&&uid)return m.owner_id===uid;if(m&&m.role)return m.role==='owner';if(m&&m.is_owner!=null)return !!m.is_owner;return !(m&&m.joined_via_invite)}
  function canCreate(g){if(!isMember())return false;return (g.event_permission||'all')!=='owner'||isOwner(g)}
  function chatEnabled(g){return g.chat_enabled!==false}
  function groupEventIds(){var m=links();return Object.keys(m).filter(function(id){return m[id]===activeGroupId})}
  function eventParts(v){try{var p=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(new Date(v)),f=function(t){var x=p.find(function(a){return a.type===t});return x?x.value:''};return{day:f('day'),month:f('month').replace('.','').toUpperCase(),time:f('hour')+':'+f('minute')}}catch(e){return{day:'',month:'',time:''}}}

  function ensure(){
    if(document.querySelector('[data-view="community-detail"]'))return;
    var section=document.createElement('section');section.className='view communityDetailView communityDetailV3';section.dataset.view='community-detail';section.innerHTML='<div id="community-detail-root"></div>';
    var app=document.querySelector('.app'),nav=document.getElementById('bottom-nav');if(app)app.insertBefore(section,nav||null);
  }
  function close(){activeGroupId=null;activeSnapshot=null;activeTab='events';lastEvents=null;lastChronicle=null;lastAlbum=null;if(typeof window.openSocialCommunities==='function')window.openSocialCommunities();else if(typeof openView==='function')openView('communities')}

  function hero(g){
    var cover=g.cover_url?'style="background-image:url(\''+esc(String(g.cover_url).replace(/'/g,'%27'))+'\')"':'';
    return '<div class="communityDetailHero '+(g.cover_url?'has-cover':'')+'" '+cover+'><button type="button" class="communityDetailBack" aria-label="Назад">‹</button><button type="button" class="communityDetailMenu" aria-label="Меню">•••</button><div class="communityDetailHeroShade"></div>'+(canCreate(g)?'<button type="button" class="communityHeroCreate" data-community-create-event aria-label="Создать событие">＋</button>':'')+'<div class="communityDetailHeroCopy"><span class="ey">СООБЩЕСТВО</span><h1>'+esc(g.name||'Сообщество')+'</h1><p>'+esc(g.description||'')+'</p><small>'+Number(g.member_count||1)+' '+memberWord(Number(g.member_count||1))+'</small></div></div>';
  }
  function membership(g){
    if(isMember())return'';
    if(isInvited()&&g.access==='closed')return '<div class="communityMembership communityMembershipInvite"><button type="button" class="communityMembershipJoin" data-community-join>Вступить</button><button type="button" class="communityMembershipDecline" data-community-decline>Отклонить</button></div>';
    if(g.access==='open')return '<div class="communityMembership"><button type="button" class="communityMembershipJoin" data-community-join>Вступить</button></div>';
    return'';
  }
  function tabs(){return '<div class="communityDetailTabs"><button type="button" data-community-tab="events" class="'+(activeTab==='events'?'active':'')+'">События</button><button type="button" data-community-tab="members" class="'+(activeTab==='members'?'active':'')+'">Участники</button><button type="button" data-community-tab="album" class="'+(activeTab==='album'?'active':'')+'">Альбом</button></div>'}
  function eventCard(ev){var d=eventParts(ev.starts_at);return '<button type="button" class="communityEventCard" data-community-event="'+esc(ev.id)+'"><span class="communityEventDate"><b>'+esc(d.day)+'</b><small>'+esc(d.month)+'</small></span><span class="communityEventCopy"><strong>'+esc(ev.title)+'</strong><small>'+esc(d.time+(ev.location_name?' · '+ev.location_name:''))+'</small></span><span class="communityEventState">Открыть ›</span></button>'}
  function closedGate(){return '<div class="communityDetailEmpty communityPrivateGate"><h3>Закрытое сообщество</h3><p>События, участники, альбом и чат станут доступны после вступления.</p></div>'}

  function eventsPanel(g){
    if(g.access==='closed'&&!isMember())return closedGate();
    var ids=groupEventIds();
    if(!hasSession())return '<div class="communityDetailEmpty"><h3>Войдите, чтобы увидеть события</h3><p>После входа здесь появятся события сообщества.</p></div>';
    if(lastEvents===null)return '<div class="communityDetailEmpty">Загружаю события…</div>';
    var all=[];(lastEvents.events||[]).forEach(function(e){all.push(e)});(lastEvents.invited_events||[]).forEach(function(e){if(e.invitation_status==='accepted')all.push(e)});
    var now=Date.now(),future=all.filter(function(e){return ids.indexOf(e.id)>=0&&!['finished','cancelled'].includes(e.status)&&new Date(e.starts_at).getTime()>=now}).sort(function(a,b){return new Date(a.starts_at)-new Date(b.starts_at)});
    var past=all.filter(function(e){return ids.indexOf(e.id)>=0&&(e.status==='finished'||new Date(e.starts_at).getTime()<now)}).sort(function(a,b){return new Date(b.starts_at)-new Date(a.starts_at)}).slice(0,3);
    if(!future.length&&!past.length)return '<div class="communityDetailEmpty"><h3>Пока нет событий</h3><p>Первое событие можно создать кнопкой «＋» на обложке сообщества.</p></div>';
    var h='';if(future.length)h+='<div class="communityAllEvents"><span class="eventInfoLabel">БЛИЖАЙШИЕ</span>'+future.map(eventCard).join('')+'</div>';if(past.length)h+='<div class="communityAllEvents communityPastEvents"><span class="eventInfoLabel">НЕДАВНО</span>'+past.map(eventCard).join('')+'</div>';return h;
  }

  function normalizedMembers(g){
    var list=Array.isArray(serverMembers)&&serverMembers.length?serverMembers.slice():(Array.isArray(g.members)?g.members.slice():[]);
    if(!list.length&&isMember())list.push({id:currentUserId()||'me',display_name:accountName(),role:isOwner(g)?'owner':'member'});
    return list;
  }
  function memberRow(g,m){
    var name=m.display_name||m.name||'Участник',photo=m.avatar_url?'<span class="communityMemberAvatar has-photo" style="background-image:url(\''+esc(String(m.avatar_url).replace(/'/g,'%27'))+'\')"></span>':'<span class="communityMemberAvatar">'+esc(String(name).trim().slice(0,1).toUpperCase()||'У')+'</span>';
    var owner=m.role==='owner'||m.is_owner===true,canRemove=isOwner(g)&&!owner&&String(m.id||'')!==String(currentUserId()||'');
    return '<div class="communityMemberRow" data-community-member="'+esc(m.id||'')+'">'+photo+'<span class="communityMemberCopy"><strong>'+esc(name)+'</strong><small>'+(owner?'Создатель':'Участник')+'</small></span>'+(canRemove?'<button type="button" class="communityMemberMore" data-community-member-menu="'+esc(m.id||'')+'" aria-label="Действия">•••</button>':'')+'</div>';
  }
  function openCommunityPerson(p){
    if(!p||!p.id)return;
    if(String(p.id)===String(currentUserId())){if(typeof openView==='function')openView('profile');return}
    if(typeof window.openLyaPersonProfile==='function')window.openLyaPersonProfile({id:p.id,display_name:p.display_name||p.name||'Участник',avatar_url:p.avatar_url||null,city:p.city||null});
  }
  function membersPanel(g){
    if(g.access==='closed'&&!isMember())return closedGate();
    var list=normalizedMembers(g),n=Math.max(Number(g.member_count||1),list.length),canInvite=isMember();
    return '<div class="communityMembersHead"><strong>'+n+' '+memberWord(n)+'</strong>'+(canInvite?'<button type="button" class="communityInviteMembers">＋ Пригласить</button>':'')+'</div><div class="communityMemberList">'+list.map(function(m){return memberRow(g,m)}).join('')+'</div>';
  }

  function albumTitleMap(){var map={};function add(ev){if(ev&&ev.id)map[ev.id]=ev.title||'Событие'};(lastChronicle&&lastChronicle.events||[]).forEach(add);(lastEvents&&lastEvents.events||[]).forEach(add);(lastEvents&&lastEvents.invited_events||[]).forEach(add);return map}
  function albumPanel(g){
    if(!isMember())return '<div class="communityDetailEmpty"><h3>Альбом доступен участникам</h3><p>В нём собираются фото и видео из событий этого сообщества.</p></div>';
    if(albumLoading||lastAlbum===null)return '<div class="communityDetailEmpty">Собираю альбом…</div>';
    if(!lastAlbum.length)return '<div class="communityDetailEmpty"><h3>Альбом пока пуст</h3><p>Фото и видео из событий сообщества автоматически появятся здесь.</p></div>';
    var groupsBy={};lastAlbum.forEach(function(item){var id=item.event_id||'event';if(!groupsBy[id])groupsBy[id]={title:item.event_title||'Событие',items:[]};groupsBy[id].items.push(item)});
    return '<div class="communityAlbum">'+Object.keys(groupsBy).map(function(id){var block=groupsBy[id];return '<section class="communityAlbumGroup"><div class="communityAlbumHead"><strong>'+esc(block.title)+'</strong><small>'+block.items.length+' '+(block.items.length===1?'материал':'материалов')+'</small></div><div class="communityAlbumGrid">'+block.items.map(function(item){var index=lastAlbum.indexOf(item),visual=item.media_type==='video'?'<video src="'+esc(item.url||'')+'" muted playsinline preload="metadata"></video><span class="communityAlbumPlay">▶</span>':'<img src="'+esc(item.url||'')+'" alt="" loading="lazy">';return '<button type="button" class="communityAlbumTile" data-community-media="'+index+'">'+visual+'</button>'}).join('')+'</div></section>'}).join('')+'</div>';
  }
  function content(g){if(activeTab==='members')return membersPanel(g);if(activeTab==='album')return albumPanel(g);return eventsPanel(g)}

  function chatMessages(g){var m=chats();return Array.isArray(m[g.id])?m[g.id]:[]}
  function chatTeaser(g){
    if(!isMember()||!chatEnabled(g))return'';
    return '<button type="button" class="communityChatPeek" data-community-chat-open><span class="communityChatHandle"></span><span class="communityChatPeekCopy"><strong>Чат сообщества</strong><small>Сообщения участников сообщества</small></span><span class="communityChatPeekArrow">⌃</span></button>';
  }

  function render(){
    ensure();var g=group(),root=document.getElementById('community-detail-root');if(!root)return;
    if(!g){root.innerHTML='<div class="communityDetailMissing"><button class="communityDetailBack">‹</button><h2>Сообщество не найдено</h2></div>';root.querySelector('.communityDetailBack').onclick=close;return}
    var privateLocked=g.access==='closed'&&!isMember();
    root.innerHTML=hero(g)+'<div class="communityDetailBody">'+membership(g)+(privateLocked?'':tabs())+'<div class="communityDetailContent">'+content(g)+'</div>'+chatTeaser(g)+'</div>';
    root.querySelector('.communityDetailBack').onclick=close;
    root.querySelector('.communityDetailMenu').onclick=function(){openMenu(g)};
    root.querySelectorAll('[data-community-tab]').forEach(function(b){b.onclick=function(){activeTab=b.dataset.communityTab;render();if(activeTab==='events')loadEvents();if(activeTab==='album')loadAlbum()}});
    root.querySelectorAll('[data-community-create-event]').forEach(function(b){b.onclick=function(){openCreateEvent(g)}});
    root.querySelectorAll('[data-community-event]').forEach(function(b){b.onclick=function(){if(typeof openEventView==='function')openEventView(b.dataset.communityEvent,'communities')}});
    var join=root.querySelector('[data-community-join]');if(join)join.onclick=function(){joinGroup(g)};
    var decline=root.querySelector('[data-community-decline]');if(decline)decline.onclick=function(){declineInvite(g)};
    var invite=root.querySelector('.communityInviteMembers');if(invite)invite.onclick=function(){openInvitePicker(g)};
    root.querySelectorAll('[data-community-member]').forEach(function(row){row.onclick=function(e){if(e.target.closest('[data-community-member-menu]'))return;var m=normalizedMembers(g).find(function(x){return String(x.id||'')===String(row.dataset.communityMember||'')});if(m)openCommunityPerson(m)}});
    root.querySelectorAll('[data-community-member-menu]').forEach(function(b){b.onclick=function(){openMemberMenu(g,b.dataset.communityMemberMenu)}});
    root.querySelectorAll('[data-community-media]').forEach(function(b){b.onclick=function(){var i=Number(b.dataset.communityMedia)||0;if(typeof window.openEventMediaViewerReadOnly==='function')window.openEventMediaViewerReadOnly(lastAlbum,i)}});
    var chat=root.querySelector('[data-community-chat-open]');if(chat){var y0=null;chat.onclick=function(){openChat(g)};chat.addEventListener('touchstart',function(e){y0=e.touches&&e.touches[0]?e.touches[0].clientY:null},{passive:true});chat.addEventListener('touchend',function(e){if(y0==null)return;var y=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientY:y0;if(y-y0<-32)openChat(g);y0=null},{passive:true})}
  }

  async function loadEvents(){if(!hasSession())return;var fn=typeof window.api==='function'?window.api:(typeof api==='function'?api:null);if(!fn)return;try{lastEvents=await fn('list_events');if(activeTab==='events')render()}catch(e){lastEvents={events:[],invited_events:[]};if(activeTab==='events')render()}}
  async function loadChronicle(){if(!hasSession())return;var fn=typeof window.eventRaw==='function'?window.eventRaw:(typeof eventRaw==='function'?eventRaw:null);if(!fn)return;try{lastChronicle=await fn('list_chronicle',{});}catch(e){lastChronicle={events:[]}}}
  async function loadAlbum(){
    if(!isMember()){lastAlbum=[];albumLoading=false;render();return}
    albumLoading=true;lastAlbum=null;render();
    try{
      await loadChronicle();var ids=groupEventIds(),titles=albumTitleMap(),all=[];
      if(typeof window.listEventMediaForCommunity==='function'){
        var batches=await Promise.all(ids.map(async function(id){try{var d=await window.listEventMediaForCommunity(id);return(d.media||[]).map(function(x){return Object.assign({},x,{event_id:id,event_title:titles[id]||'Событие'})})}catch(e){return[]}}));batches.forEach(function(a){all=all.concat(a)});
      }else{
        (lastChronicle&&lastChronicle.events||[]).filter(function(e){return ids.indexOf(e.id)>=0&&e.cover_url}).forEach(function(e){all.push({event_id:e.id,event_title:e.title,url:e.cover_url,media_type:'image'})});
      }
      lastAlbum=all;
    }catch(e){lastAlbum=[]}finally{albumLoading=false;if(activeTab==='album')render()}
  }

  function saveMemberGroup(g,extra){var mine=groups(),i=mine.findIndex(function(x){return x.id===g.id}),copy=Object.assign({},g,extra||{});if(i>=0)mine[i]=Object.assign({},mine[i],copy);else mine.unshift(copy);write(GROUPS_KEY,mine);activeSnapshot=Object.assign({},copy)}
  async function joinGroup(g){try{if(g._server_invitation_id)await circleApi('respond_community_invite',{invitation_id:g._server_invitation_id,response:'accepted'});var invitedBefore=isInvited(),base=Object.assign({},g,{member_count:Number(g.member_count||0)+1,role:'member',joined_via_invite:true});delete base._server_invitation_id;saveMemberGroup(base);if(invitedBefore)write(INVITES_KEY,invites().filter(function(x){return x.id!==g.id}));activeSnapshot=base;serverMembers=null;render();loadEvents();loadCommunityMembers(base);document.dispatchEvent(new CustomEvent('vmeste-community-invites-changed'))}catch(e){alert(e.message)}}
  async function declineInvite(g){try{if(g._server_invitation_id)await circleApi('respond_community_invite',{invitation_id:g._server_invitation_id,response:'declined'});write(INVITES_KEY,invites().filter(function(x){return x.id!==g.id}));document.dispatchEvent(new CustomEvent('vmeste-community-invites-changed'));close()}catch(e){alert(e.message)}}
  function leaveGroup(g){if(!confirm('Покинуть сообщество «'+g.name+'»?'))return;write(GROUPS_KEY,groups().filter(function(x){return x.id!==g.id}));activeSnapshot=Object.assign({},g,{member_count:Math.max(0,Number(g.member_count||1)-1),role:null,joined_via_invite:false});render()}

  function openCreateEvent(g){
    sessionStorage.setItem('vmeste_group_event_context_v1',g.id);
    if(typeof openView==='function')openView('create');
    setTimeout(function(){var action=document.querySelector('[data-view="create"] [data-create-action="event"]');if(action)action.click();var form=document.getElementById('event-form');if(!form)return;document.querySelector('.communityCreateContext')?.remove();var box=document.createElement('div');box.className='communityCreateContext';box.innerHTML='<span>СОБЫТИЕ СООБЩЕСТВА</span><strong>'+esc(g.name)+'</strong><small>Сообщество уже выбрано — после создания событие появится здесь автоматически.</small>';form.insertAdjacentElement('beforebegin',box)},60)
  }

  function communitySnapshot(g){return{id:g.id,name:g.name||'Сообщество',description:g.description||'',access:g.access||'closed',cover_url:g.cover_url||null,event_permission:g.event_permission||'all',chat_enabled:g.chat_enabled!==false,member_count:Number(g.member_count||1),owner_id:g.owner_id||currentUserId()}}
  async function shareInviteExternal(g){var text='Присоединяйся к сообществу «'+g.name+'» в ЛЯ.';try{if(navigator.share)await navigator.share({title:g.name||'ЛЯ',text:text,url:APP_URL});else if(navigator.clipboard){await navigator.clipboard.writeText(text+' '+APP_URL);alert('Ссылка скопирована')}}catch(e){}}
  async function openInvitePicker(g){
    if(!hasSession()){alert('Войдите в ЛЯ, чтобы приглашать участников');return}
    document.querySelector('.communityActionOverlay')?.remove();var o=document.createElement('div');o.className='communityActionOverlay communityInvitePickerOverlay';
    o.innerHTML='<div class="communityActionSheet communityInvitePicker"><div class="communityActionHead"><div><span class="ey">ПРИГЛАСИТЬ</span><h2>Участники ЛЯ</h2></div><button type="button">×</button></div><div class="communityInvitePickerBody"><div class="communityDetailEmpty">Загружаю людей…</div></div><button type="button" class="communityManageRow communityInviteExternal">Поделиться ссылкой <b>↗</b></button></div>';
    document.body.appendChild(o);var close=function(){o.remove()};o.querySelector('.communityActionHead button').onclick=close;o.onclick=function(e){if(e.target===o)close()};o.querySelector('.communityInviteExternal').onclick=function(){shareInviteExternal(g)};
    var body=o.querySelector('.communityInvitePickerBody');
    try{
      var data=await circleApi('list_people',{}),memberIds=new Set(normalizedMembers(g).map(function(m){return String(m.id||'')})),people=(data.people||[]).filter(function(p){return !p.is_self&&!memberIds.has(String(p.id))});
      body.innerHTML=people.length?people.map(function(p){var n=p.display_name||'Участник',photo=p.avatar_url?'<span class="communityInvitePersonAvatar has-photo" style="background-image:url(\''+esc(String(p.avatar_url).replace(/'/g,'%27'))+'\')"></span>':'<span class="communityInvitePersonAvatar">'+esc(String(n).trim().slice(0,1).toUpperCase()||'У')+'</span>';return '<div class="communityInvitePerson">'+photo+'<span class="communityInvitePersonCopy"><strong>'+esc(n)+'</strong><small>'+esc(p.city||'Участник ЛЯ')+'</small></span><button type="button" data-community-direct-invite="'+esc(p.id)+'">Пригласить</button></div>'}).join(''):'<div class="communityDetailEmpty">Все участники ЛЯ уже в сообществе.</div>';
      body.querySelectorAll('[data-community-direct-invite]').forEach(function(b){b.onclick=async function(){b.disabled=true;b.textContent='Отправляю…';try{await circleApi('send_community_invite',{target_user_id:b.dataset.communityDirectInvite,community:communitySnapshot(g)});b.textContent='Отправлено ✓';document.dispatchEvent(new CustomEvent('vmeste-community-invites-changed'))}catch(e){b.disabled=false;b.textContent='Пригласить';alert(e.message)}}})
    }catch(e){body.innerHTML='<div class="communityDetailEmpty">'+esc(e.message)+'</div>'}
  }
  async function shareCommunity(g){var text='«'+g.name+'» — сообщество в ЛЯ.';try{if(navigator.share)await navigator.share({title:g.name||'ЛЯ',text:text,url:APP_URL});else if(navigator.clipboard)await navigator.clipboard.writeText(text+' '+APP_URL)}catch(e){}}

  function openMenu(g){
    document.querySelector('.communityActionOverlay')?.remove();var owner=isOwner(g),member=isMember(),o=document.createElement('div');o.className='communityActionOverlay';var rows='<button type="button" class="communityManageRow" data-community-share>Поделиться <b>›</b></button>';
    if(owner)rows='<button type="button" class="communityManageRow" data-community-edit>Редактировать сообщество <b>›</b></button><div class="communityManageSetting"><span><strong>Кто создаёт события</strong><small>Право на кнопку «＋»</small></span><select data-community-event-permission><option value="all">Все участники</option><option value="owner">Только создатель</option></select></div><label class="communityManageToggle"><span><strong>Чат сообщества</strong><small>Показывать нижнее окно чата</small></span><input type="checkbox" data-community-chat-toggle '+(chatEnabled(g)?'checked':'')+'><i></i></label><button type="button" class="communityManageRow" data-community-invite>Пригласить людей <b>›</b></button>'+rows+'<button type="button" class="communityManageDanger" data-community-delete>Удалить сообщество</button>';
    else if(member)rows='<button type="button" class="communityManageRow" data-community-invite>Пригласить людей <b>›</b></button>'+rows+'<button type="button" class="communityManageDanger" data-community-leave>Покинуть сообщество</button>';
    o.innerHTML='<div class="communityActionSheet"><div class="communityActionHead"><div><span class="ey">СООБЩЕСТВО</span><h2>'+esc(g.name)+'</h2></div><button type="button" data-close>×</button></div>'+rows+'</div>';document.body.appendChild(o);
    var closeSheet=function(){o.remove()};o.querySelector('[data-close]').onclick=closeSheet;o.onclick=function(e){if(e.target===o)closeSheet()};
    var share=o.querySelector('[data-community-share]');if(share)share.onclick=function(){shareCommunity(g);closeSheet()};var inv=o.querySelector('[data-community-invite]');if(inv)inv.onclick=function(){closeSheet();openInvitePicker(g)};var leave=o.querySelector('[data-community-leave]');if(leave)leave.onclick=function(){closeSheet();leaveGroup(g)};var edit=o.querySelector('[data-community-edit]');if(edit)edit.onclick=function(){closeSheet();openEditGroup(g)};
    var sel=o.querySelector('[data-community-event-permission]');if(sel){sel.value=g.event_permission||'all';sel.onchange=function(){var mine=groups(),x=mine.find(function(q){return q.id===g.id});if(x){x.event_permission=sel.value;write(GROUPS_KEY,mine);activeSnapshot=Object.assign({},x);render()}}}
    var chat=o.querySelector('[data-community-chat-toggle]');if(chat)chat.onchange=function(){var mine=groups(),x=mine.find(function(q){return q.id===g.id});if(x){x.chat_enabled=chat.checked;write(GROUPS_KEY,mine);activeSnapshot=Object.assign({},x);render()}};
    var del=o.querySelector('[data-community-delete]');if(del)del.onclick=function(){if(!confirm('Удалить сообщество «'+g.name+'»?'))return;write(GROUPS_KEY,groups().filter(function(q){return q.id!==g.id}));var m=links();Object.keys(m).forEach(function(id){if(m[id]===g.id)delete m[id]});write(LINKS_KEY,m);closeSheet();close()};
  }

  function openEditGroup(g){
    document.querySelector('.communityActionOverlay')?.remove();var o=document.createElement('div');o.className='communityActionOverlay';o.innerHTML='<div class="communityActionSheet"><div class="communityActionHead"><div><span class="ey">РЕДАКТИРОВАНИЕ</span><h2>Сообщество</h2></div><button type="button">×</button></div><form class="communityEditForm"><label>Название<input name="name" maxlength="80" required value="'+esc(g.name)+'"></label><label>Описание<textarea name="description" rows="3" maxlength="500">'+esc(g.description||'')+'</textarea></label><fieldset><legend>Доступ</legend><label><input type="radio" name="access" value="open" '+(g.access==='open'?'checked':'')+'> Открытое</label><label><input type="radio" name="access" value="closed" '+(g.access!=='open'?'checked':'')+'> Закрытое</label></fieldset><button class="communityActionPrimary" type="submit">Сохранить</button></form></div>';document.body.appendChild(o);o.querySelector('.communityActionHead button').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};o.querySelector('form').onsubmit=function(e){e.preventDefault();var mine=groups(),x=mine.find(function(q){return q.id===g.id});if(!x)return;x.name=e.target.elements.name.value.trim();x.description=e.target.elements.description.value.trim();x.access=e.target.elements.access.value;write(GROUPS_KEY,mine);activeSnapshot=Object.assign({},x);o.remove();render()};
  }

  function openMemberMenu(g,id){
    var member=normalizedMembers(g).find(function(m){return String(m.id||'')===String(id||'')});if(!member)return;document.querySelector('.communityActionOverlay')?.remove();var o=document.createElement('div');o.className='communityActionOverlay';o.innerHTML='<div class="communityActionSheet"><div class="communityActionHead"><h2>'+esc(member.display_name||member.name||'Участник')+'</h2><button type="button">×</button></div><button type="button" class="communityManageDanger" data-remove-member>Удалить из сообщества</button></div>';document.body.appendChild(o);o.querySelector('.communityActionHead button').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};o.querySelector('[data-remove-member]').onclick=function(){if(!confirm('Удалить участника из сообщества?'))return;var mine=groups(),x=mine.find(function(q){return q.id===g.id});if(x&&Array.isArray(x.members)){x.members=x.members.filter(function(m){return String(m.id||'')!==String(id||'')});x.member_count=Math.max(1,Number(x.member_count||1)-1);write(GROUPS_KEY,mine);activeSnapshot=Object.assign({},x)}o.remove();render()};
  }

  function openChatThemePicker(g,currentTheme,applyTheme){
    document.querySelector('.communityChatThemeOverlay')?.remove();
    var t=document.createElement('div');t.className='communityChatThemeOverlay';
    var themes=[['paper','Светлая'],['sage','Шалфей'],['graphite','Графит'],['sky','Серо-голубая']];
    t.innerHTML='<div class="communityChatThemeSheet"><div class="communityChatThemeHead"><div><span class="ey">ОФОРМЛЕНИЕ</span><h3>Ваш вид чата</h3></div><button type="button">×</button></div><p>Настройка меняет чат только у вас.</p><div class="communityChatThemes">'+themes.map(function(x){return '<button type="button" data-chat-theme="'+x[0]+'" class="'+(x[0]===currentTheme?'active':'')+'"><i></i><span>'+x[1]+'</span></button>'}).join('')+'</div></div>';
    document.body.appendChild(t);var close=function(){t.remove()};t.querySelector('.communityChatThemeHead button').onclick=close;t.onclick=function(e){if(e.target===t)close()};
    t.querySelectorAll('[data-chat-theme]').forEach(function(btn){btn.onclick=async function(){var theme=btn.dataset.chatTheme;try{await circleApi('set_community_chat_preference',{community_id:g.id,owner_id:g.owner_id||'',theme:theme});applyTheme(theme);close()}catch(e){alert(e.message)}}})
  }

  function openChat(g){
    document.querySelector('.communityChatSheet')?.remove();var o=document.createElement('div');o.className='communityChatSheet theme-paper';o.innerHTML='<div class="communityChatPull"><span></span></div><header class="communityChatHead"><div><strong>'+esc(g.name)+'</strong><small>Чат сообщества</small></div><button type="button" class="communityChatCustomize" aria-label="Оформление чата"><span>◐</span><b>Оформление</b></button></header><div class="communityChatMessages"><div class="communityChatEmpty"><span>Загружаю сообщения…</span></div></div><form class="communityChatForm"><textarea maxlength="1500" rows="1" placeholder="Сообщение"></textarea><button type="submit">↑</button></form>';document.body.appendChild(o);document.body.classList.add('communityChatOpen');
    var messages=[],theme='paper',timer=null,box=o.querySelector('.communityChatMessages');
    function applyTheme(next){theme=next||'paper';o.classList.remove('theme-paper','theme-sage','theme-graphite','theme-sky');o.classList.add('theme-'+theme)}
    function avatar(m){if(m.avatar_url)return '<span class="communityChatAvatar has-photo" style="background-image:url(\''+esc(String(m.avatar_url).replace(/'/g,'%27'))+'\')"></span>';return '<span class="communityChatAvatar">'+esc(String(m.display_name||'У').trim().slice(0,1).toUpperCase()||'У')+'</span>'}
    function draw(){box.innerHTML=messages.length?messages.map(function(m){var who='<button type="button" class="communityChatAuthor" data-chat-user="'+esc(m.user_id||'')+'">'+avatar(m)+'<span><b>'+esc(m.display_name||'Участник')+'</b><small>'+new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(m.created_at))+'</small></span></button>';return '<div class="communityChatMessage '+(m.mine?'mine':'')+'">'+who+'<div class="communityChatBubble"><span>'+esc(m.body||'')+'</span></div></div>'}).join(''):'<div class="communityChatEmpty"><strong>Чат открыт</strong><span>Напишите первое сообщение.</span></div>';box.querySelectorAll('[data-chat-user]').forEach(function(btn){btn.onclick=function(){var m=messages.find(function(x){return String(x.user_id)===String(btn.dataset.chatUser)});if(m)openCommunityPerson(m)}});box.scrollTop=box.scrollHeight}
    async function load(silent){try{var d=await circleApi('list_community_messages',{community_id:g.id,owner_id:g.owner_id||''});messages=d.messages||[];draw()}catch(e){if(!silent)box.innerHTML='<div class="communityChatEmpty"><strong>Не удалось загрузить чат</strong><span>'+esc(e.message)+'</span></div>'}}
    async function loadTheme(){try{var d=await circleApi('get_community_chat_preference',{community_id:g.id,owner_id:g.owner_id||''});applyTheme(d.theme||'paper')}catch(e){applyTheme('paper')}}
    function closeChat(){if(timer)clearInterval(timer);document.body.classList.remove('communityChatOpen');o.remove();render()}
    var form=o.querySelector('form'),text=form.querySelector('textarea');form.onsubmit=async function(e){e.preventDefault();var v=text.value.trim();if(!v)return;var send=form.querySelector('button');send.disabled=true;try{await circleApi('send_community_message',{community_id:g.id,owner_id:g.owner_id||'',text:v});text.value='';await load(true)}catch(err){alert(err.message)}finally{send.disabled=false}};
    o.querySelector('.communityChatCustomize').onclick=function(){openChatThemePicker(g,theme,applyTheme)};
    var y0=null;o.querySelector('.communityChatPull').addEventListener('touchstart',function(e){y0=e.touches&&e.touches[0]?e.touches[0].clientY:null},{passive:true});o.querySelector('.communityChatPull').addEventListener('touchend',function(e){if(y0==null)return;var y=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientY:y0;if(y-y0>45)closeChat();y0=null},{passive:true});o.querySelector('.communityChatPull').onclick=closeChat;
    loadTheme();load(false);timer=setInterval(function(){if(document.body.contains(o))load(true)},4000);setTimeout(function(){try{text.focus({preventScroll:true})}catch(e){text.focus()}},120)
  }

  async function loadCommunityMembers(g){if(!g||!g.id||!hasSession())return;try{var d=await circleApi('list_community_members',{community_id:g.id});serverMembers=d.members||[];if(serverMembers.length){var mine=groups(),x=mine.find(function(q){return q.id===g.id});if(x){x.members=serverMembers;x.member_count=Math.max(Number(x.member_count||1),serverMembers.length);write(GROUPS_KEY,mine);activeSnapshot=Object.assign({},x)}}if(activeTab==='members')render()}catch(e){}}
  window.openCommunityDetail=function(id,snapshot){activeGroupId=id;activeSnapshot=snapshot||null;activeTab='events';lastEvents=null;lastChronicle=null;lastAlbum=null;albumLoading=false;serverMembers=null;ensure();if(typeof openView==='function')openView('community-detail');render();loadEvents();loadCommunityMembers(group())};
  window.refreshCommunityDetailV3=function(){if(activeGroupId)render()};
  ensure();
})();
