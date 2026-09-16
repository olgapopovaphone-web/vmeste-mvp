(function(){
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var LINKS_KEY='vmeste_event_group_proto_v1';
  var activeGroupId=null;
  var activeTab='events';
  var lastEvents=null;
  var lastChronicle=null;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function read(key,fallback){try{var v=JSON.parse(localStorage.getItem(key)||'');return v||fallback}catch(e){return fallback}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function groups(){var a=read(GROUPS_KEY,[]);return Array.isArray(a)?a:[]}
  function links(){var m=read(LINKS_KEY,{});return m&&typeof m==='object'?m:{}}
  function group(){return groups().find(function(g){return g.id===activeGroupId})||null}
  function groupEventIds(){var m=links();return Object.keys(m).filter(function(id){return m[id]===activeGroupId})}
  function eventParts(v){try{var p=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(new Date(v)),g=function(t){var x=p.find(function(a){return a.type===t});return x?x.value:''};return{day:g('day'),month:g('month').replace('.','').toUpperCase(),time:g('hour')+':'+g('minute')}}catch(e){return{day:'',month:'',time:''}}}
  function memberWord(n){var m=Math.abs(n)%100,d=m%10;if(m>10&&m<20)return'участников';if(d===1)return'участник';if(d>1&&d<5)return'участника';return'участников'}
  function accountName(){return (window.account&&window.account.profile&&window.account.profile.display_name)||(window.account&&window.account.user&&window.account.user.email)||'Вы'}

  function ensure(){
    if(document.querySelector('[data-view="community-detail"]'))return;
    var section=document.createElement('section');section.className='view communityDetailView';section.dataset.view='community-detail';section.innerHTML='<div id="community-detail-root"></div>';
    var app=document.querySelector('.app'),nav=document.getElementById('bottom-nav');if(app)app.insertBefore(section,nav||null);
  }

  function close(){activeGroupId=null;activeTab='events';lastEvents=null;lastChronicle=null;if(typeof window.openSocialCommunities==='function')window.openSocialCommunities();else if(typeof openView==='function')openView('communities')}

  function hero(g){
    var cover=g.cover_url?'style="background-image:url(\''+esc(g.cover_url)+'\')"':'';
    return '<div class="communityDetailHero '+(g.cover_url?'has-cover':'')+'" '+cover+'><button type="button" class="communityDetailBack" aria-label="Назад">‹</button><button type="button" class="communityDetailMenu" aria-label="Управление">•••</button><div class="communityDetailHeroShade"></div><div class="communityDetailHeroCopy"><span class="ey">СООБЩЕСТВО</span><h1>'+esc(g.name)+'</h1><p>'+esc(g.description||'Локальная группа')+'</p><small>'+Number(g.member_count||1)+' '+memberWord(Number(g.member_count||1))+'</small></div></div>';
  }

  function tabs(){return '<div class="communityDetailTabs"><button type="button" data-community-tab="events" class="'+(activeTab==='events'?'active':'')+'">События</button><button type="button" data-community-tab="members" class="'+(activeTab==='members'?'active':'')+'">Участники</button><button type="button" data-community-tab="chronicle" class="'+(activeTab==='chronicle'?'active':'')+'">Хроника</button></div>'}

  function eventCard(ev,history){var d=eventParts(ev.starts_at);return '<button type="button" class="communityEventCard" data-community-event="'+esc(ev.id)+'"><span class="communityEventDate"><b>'+esc(d.day)+'</b><small>'+esc(d.month)+'</small></span><span class="communityEventCopy"><strong>'+esc(ev.title)+'</strong><small>'+esc(d.time+(ev.location_name?' · '+ev.location_name:''))+'</small></span><span class="communityEventState">'+(history?'Было':'Открыть')+' ›</span></button>'}

  function eventsPanel(g){
    var ids=groupEventIds();
    if(!window.account)return '<div class="communityDetailEmpty"><h3>Войдите, чтобы увидеть события группы</h3><p>Сама группа сохранена в прототипе, а события загружаются из вашего аккаунта.</p></div>';
    if(lastEvents===null)return '<div class="communityDetailEmpty">Загружаю события…</div>';
    var all=[];(lastEvents.events||[]).forEach(function(e){all.push(e)});(lastEvents.invited_events||[]).forEach(function(e){if(e.invitation_status==='accepted')all.push(e)});
    var now=Date.now(),items=all.filter(function(e){return ids.indexOf(e.id)>=0&&!['finished','cancelled'].includes(e.status)&&new Date(e.starts_at).getTime()>=now}).sort(function(a,b){return new Date(a.starts_at)-new Date(b.starts_at)});
    if(!items.length)return '<div class="communityDetailEmpty"><h3>Пока нет ближайших событий</h3><p>Создайте первое событие для всей группы.</p></div>';
    var first=items[0],rest=items.slice(1);
    return '<div class="communityNext"><span class="eventInfoLabel">БЛИЖАЙШЕЕ</span>'+eventCard(first,false)+'</div>'+(rest.length?'<div class="communityAllEvents"><span class="eventInfoLabel">ВСЕ ПРЕДСТОЯЩИЕ</span>'+rest.map(function(e){return eventCard(e,false)}).join('')+'</div>':'');
  }

  function membersPanel(g){
    var n=Number(g.member_count||1),name=accountName(),letter=String(name).trim().slice(0,1).toUpperCase()||'Я';
    return '<div class="communityMembersHead"><strong>'+n+' '+memberWord(n)+'</strong><button type="button" class="communityInviteMembers">+ Пригласить</button></div><div class="communityMemberList"><div class="communityMemberRow"><span class="communityMemberAvatar">'+esc(letter)+'</span><span><strong>'+esc(name)+'</strong><small>Создатель</small></span></div></div>'+(n>1?'<p class="communityMembersNote">Остальные участники появятся здесь после подключения данных сообщества.</p>':'');
  }

  function chroniclePanel(){
    var ids=groupEventIds();
    if(!window.account)return '<div class="communityDetailEmpty"><h3>Хроника появится после входа</h3></div>';
    if(lastChronicle===null)return '<div class="communityDetailEmpty">Загружаю хронику…</div>';
    var items=(lastChronicle.events||[]).filter(function(e){return ids.indexOf(e.id)>=0}).sort(function(a,b){return new Date(b.starts_at)-new Date(a.starts_at)});
    if(!items.length)return '<div class="communityDetailEmpty"><h3>Здесь будет история группы</h3><p>Завершённые события автоматически появятся в Хронике.</p></div>';
    return '<div class="communityChronicleList">'+items.map(function(e){return eventCard(e,true)}).join('')+'</div>';
  }

  function content(g){if(activeTab==='members')return membersPanel(g);if(activeTab==='chronicle')return chroniclePanel();return eventsPanel(g)}

  function render(){
    ensure();var g=group(),root=document.getElementById('community-detail-root');if(!root)return;
    if(!g){root.innerHTML='<div class="communityDetailMissing"><button class="communityDetailBack">‹</button><h2>Группа не найдена</h2></div>';root.querySelector('.communityDetailBack').onclick=close;return}
    root.innerHTML=hero(g)+'<div class="communityDetailBody"><button type="button" class="communityCreateEvent" data-community-create-event>＋ Создать событие</button>'+tabs()+'<div class="communityDetailContent">'+content(g)+'</div></div>';
    root.querySelector('.communityDetailBack').onclick=close;
    root.querySelector('.communityDetailMenu').onclick=function(){openManagement(g)};
    root.querySelectorAll('[data-community-tab]').forEach(function(b){b.onclick=function(){activeTab=b.dataset.communityTab;render();if(activeTab==='chronicle')loadChronicle();if(activeTab==='events')loadEvents()}});
    var create=root.querySelector('[data-community-create-event]');if(create)create.onclick=function(){openCreateEvent(g)};
    root.querySelectorAll('[data-community-event]').forEach(function(b){b.onclick=function(){if(typeof openEventView==='function')openEventView(b.dataset.communityEvent,'communities')}});
    var invite=root.querySelector('.communityInviteMembers');if(invite)invite.onclick=function(){openInvitePrototype(g)};
  }

  async function loadEvents(){if(!window.account||typeof api!=='function')return;try{lastEvents=await api('list_events');if(activeTab==='events')render()}catch(e){lastEvents={events:[],invited_events:[]};if(activeTab==='events')render()}}
  async function loadChronicle(){if(!window.account||typeof eventRaw!=='function')return;try{lastChronicle=await eventRaw('list_chronicle',{});if(activeTab==='chronicle')render()}catch(e){lastChronicle={events:[]};if(activeTab==='chronicle')render()}}

  function openCreateEvent(g){
    sessionStorage.setItem('vmeste_group_event_context_v1',g.id);
    if(typeof openView==='function')openView('create');
    var form=document.getElementById('event-form'),choice=document.getElementById('private-choice');if(choice&&!window.account){choice.click();return}if(form)form.hidden=false;
    var old=document.querySelector('.communityCreateContext');if(old)old.remove();
    var box=document.createElement('div');box.className='communityCreateContext';box.innerHTML='<span>СОБЫТИЕ ДЛЯ ГРУППЫ</span><strong>'+esc(g.name)+'</strong><small>После создания привяжите событие к группе в «Управлении». Массовые приглашения подключим после утверждения серверной логики.</small>';
    if(form)form.insertAdjacentElement('beforebegin',box);if(form)setTimeout(function(){form.scrollIntoView({behavior:'smooth',block:'start'})},30);
  }

  function openInvitePrototype(g){
    document.querySelector('.communityActionOverlay')?.remove();var o=document.createElement('div');o.className='communityActionOverlay';o.innerHTML='<div class="communityActionSheet"><div class="communityActionHead"><h2>Пригласить в «'+esc(g.name)+'»</h2><button type="button">×</button></div><p>В прототипе членство ещё не подключено к базе. Здесь будет ссылка-приглашение в группу.</p><button type="button" class="communityActionPrimary">Понятно</button></div>';document.body.appendChild(o);o.querySelector('.communityActionHead button').onclick=function(){o.remove()};o.querySelector('.communityActionPrimary').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};
  }

  function openManagement(g){
    document.querySelector('.communityActionOverlay')?.remove();var o=document.createElement('div');o.className='communityActionOverlay';o.innerHTML='<div class="communityActionSheet"><div class="communityActionHead"><div><span class="ey">УПРАВЛЕНИЕ</span><h2>'+esc(g.name)+'</h2></div><button type="button">×</button></div><button type="button" class="communityManageRow" data-community-edit>Редактировать группу <b>›</b></button><div class="communityManageSetting"><span><strong>Кто создаёт события</strong><small>Для MVP</small></span><select data-community-event-permission><option value="all">Все участники</option><option value="owner">Только создатель</option></select></div><button type="button" class="communityManageRow" data-community-invite>Приглашения в группу <b>›</b></button><button type="button" class="communityManageDanger" data-community-delete>Удалить группу</button></div>';document.body.appendChild(o);
    var sel=o.querySelector('[data-community-event-permission]');sel.value=g.event_permission||'all';sel.onchange=function(){var a=groups(),x=a.find(function(q){return q.id===g.id});if(x){x.event_permission=sel.value;write(GROUPS_KEY,a)}};
    o.querySelector('.communityActionHead button').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};
    o.querySelector('[data-community-invite]').onclick=function(){o.remove();openInvitePrototype(g)};
    o.querySelector('[data-community-edit]').onclick=function(){o.remove();openEditGroup(g)};
    o.querySelector('[data-community-delete]').onclick=function(){if(!confirm('Удалить группу «'+g.name+'»?'))return;var a=groups().filter(function(q){return q.id!==g.id});write(GROUPS_KEY,a);var m=links();Object.keys(m).forEach(function(id){if(m[id]===g.id)delete m[id]});write(LINKS_KEY,m);o.remove();close()};
  }

  function openEditGroup(g){
    document.querySelector('.communityActionOverlay')?.remove();var o=document.createElement('div');o.className='communityActionOverlay';o.innerHTML='<div class="communityActionSheet"><div class="communityActionHead"><div><span class="ey">РЕДАКТИРОВАНИЕ</span><h2>Группа</h2></div><button type="button">×</button></div><form class="communityEditForm"><label>Название<input name="name" maxlength="80" required value="'+esc(g.name)+'"></label><label>Описание<textarea name="description" rows="3" maxlength="240">'+esc(g.description||'')+'</textarea></label><fieldset><legend>Доступ</legend><label><input type="radio" name="access" value="closed" '+(g.access!=='open'?'checked':'')+'> Закрытая</label><label><input type="radio" name="access" value="open" '+(g.access==='open'?'checked':'')+'> Открытая</label></fieldset><button class="communityActionPrimary" type="submit">Сохранить</button></form></div>';document.body.appendChild(o);o.querySelector('.communityActionHead button').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};o.querySelector('form').onsubmit=function(e){e.preventDefault();var a=groups(),x=a.find(function(q){return q.id===g.id});if(!x)return;x.name=e.target.elements.name.value.trim();x.description=e.target.elements.description.value.trim();x.access=e.target.elements.access.value;write(GROUPS_KEY,a);o.remove();render()};
  }

  window.openCommunityDetail=function(id){activeGroupId=id;activeTab='events';lastEvents=null;lastChronicle=null;ensure();if(typeof openView==='function')openView('community-detail');render();loadEvents()};
  ensure();
})();
