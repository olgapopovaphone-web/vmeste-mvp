(function(){
  var count=0;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}
  function fmt(v){try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}catch(e){return''}}
  function badge(sel,n){var b=document.querySelector(sel+' .homeToolBadge');if(!b)return;n=Number(n)||0;b.hidden=n<=0;b.textContent=n>99?'99+':String(n)}
  function badges(){badge('.homeNotifications',count);try{badge('.homeLiked',afishaLiked.size)}catch(e){badge('.homeLiked',0)}try{badge('.homeCompare',afishaCompared.size)}catch(e){badge('.homeCompare',0)}}
  function close(){var o=document.querySelector('.homeToolsOverlay');if(o)o.remove()}
  function sheet(title,body){close();var o=document.createElement('div');o.className='homeToolsOverlay';o.innerHTML='<div class="homeToolsSheet"><div class="homeToolsHead"><h2>'+esc(title)+'</h2><button class="homeToolsClose">×</button></div><div class="homeToolsBody">'+body+'</div></div>';document.body.appendChild(o);o.querySelector('.homeToolsClose').onclick=close;o.onclick=function(e){if(e.target===o)close()};return o}
  async function pending(){if(!account){count=0;badges();return[]}try{var d=await api('list_events');var a=(d.invited_events||[]).filter(function(x){return x.invitation_status==='pending'});count=a.length;badges();return a}catch(e){count=0;badges();return[]}}
  async function notifications(){if(!account){openView('login');return}var o=sheet('Оповещения','<div class="homeToolsEmpty">Загружаю…</div>'),body=o.querySelector('.homeToolsBody'),a=await pending();if(!document.body.contains(o))return;if(!a.length){body.innerHTML='<div class="homeToolsEmpty">Новых уведомлений пока нет.</div>';return}body.innerHTML=a.map(function(x){return'<article class="homeNotification"><small>ПРИГЛАШЕНИЕ</small><h3>'+esc(x.title)+'</h3><p>'+esc(fmt(x.starts_at))+(x.location_name?' · '+esc(x.location_name):'')+'</p><div class="homeNotificationActions"><button class="smallPrimary notifAnswer" data-id="'+esc(x.invitation_id)+'" data-response="accepted">Принять приглашение</button><button class="repeat notifAnswer" data-id="'+esc(x.invitation_id)+'" data-response="declined">Отклонить</button></div></article>'}).join('');body.querySelectorAll('.notifAnswer').forEach(function(b){b.onclick=async function(){b.disabled=true;try{await respondInvitation(b.dataset.id,b.dataset.response);notifications()}catch(e){alert(e.message);b.disabled=false}}})}
  async function liked(){if(!account){openView('login');return}try{if(typeof loadAfisha==='function'&&(!afishaEvents||!afishaEvents.length))await loadAfisha()}catch(e){}var a=[];try{a=afishaEvents.filter(function(x){return afishaLiked.has(x.id)})}catch(e){}var o=sheet('Понравилось',a.length?'':'<div class="homeToolsEmpty">Здесь появятся мероприятия, которым вы поставили ♥.</div>');if(!a.length)return;var body=o.querySelector('.homeToolsBody');body.innerHTML=a.map(function(x){return'<article class="homeLikedItem"><small>'+esc(fmt(x.starts_at))+'</small><h3>'+esc(x.title)+'</h3><p>'+esc(x.venue||'Место уточняется')+'</p><div class="homeLikedActions"><button class="primaryMini likedCollect" data-id="'+esc(x.id)+'">Собрать компанию</button><button class="likedRemove" data-id="'+esc(x.id)+'">Убрать ♥</button></div></article>'}).join('');body.querySelectorAll('.likedCollect').forEach(function(b){b.onclick=function(){close();collectCompany(b.dataset.id)}});body.querySelectorAll('.likedRemove').forEach(function(b){b.onclick=async function(){b.disabled=true;await toggleAfisha('like',b.dataset.id);badges();liked()}})}
  function compare(){if(!account){openView('login');return}var n=0;try{n=afishaCompared.size}catch(e){}if(!n){if(typeof afToast==='function')afToast('Добавьте мероприятия в сравнение');return}if(typeof openAfishaComparison==='function')openAfishaComparison()}
  function bind(){var n=document.querySelector('.homeNotifications'),l=document.querySelector('.homeLiked'),c=document.querySelector('.homeCompare');if(n)n.onclick=notifications;if(l)l.onclick=liked;if(c)c.onclick=compare;badges()}
  bind();setTimeout(function(){bind();pending()},600);setInterval(function(){if(account)pending();else{count=0;badges()}},30000);document.addEventListener('visibilitychange',function(){if(!document.hidden&&account)pending()});
})();

(function(){
  var returnState=null;
  function norm(value){return String(value||'').trim().toLocaleLowerCase('ru-RU')}
  async function resolvePlace(name){
    var key=norm(name);if(!key)return null;
    var items=window.vmestePlaces||[];
    var place=items.find(function(p){return norm(p.name)===key})||null;
    if(place)return place;
    if(typeof afRaw!=='function')return null;
    try{var data=await afRaw('places_feed',{city:'Ростов-на-Дону'});items=data.places||[];window.vmestePlaces=items;return items.find(function(p){return norm(p.name)===key})||null}catch(e){return null}
  }
  async function openFromEvent(data){
    var ev=data&&data.event;if(!ev)return;
    var place=await resolvePlace(ev.location_name);if(!place||typeof window.openPlaceView!=='function')return;
    var back='calendar';try{back=eventReturnView||'calendar'}catch(e){}
    returnState={eventId:ev.id,returnView:back};window.openPlaceView(place.id);
  }
  function enhance(data){
    var panel=document.querySelector('[data-event-panel="details"]');if(!panel)return;
    var labels=[].slice.call(panel.querySelectorAll('.eventInfoLabel'));
    var label=labels.find(function(x){return x.textContent.trim()==='МЕСТО'});var box=label&&label.parentElement;
    if(!box||box.querySelector('.eventPlaceEntity'))return;var strong=box.querySelector('strong');if(!strong)return;
    var btn=document.createElement('button');btn.type='button';btn.className='eventPlaceEntity';btn.innerHTML='<strong>'+strong.innerHTML+'</strong><b>›</b>';strong.replaceWith(btn);btn.onclick=function(){openFromEvent(data)};
  }
  function patch(){
    if(typeof window.renderEventDetail!=='function'||window.renderEventDetail.__placeLinked)return false;
    var original=window.renderEventDetail,wrapped=function(data){original(data);enhance(data)};wrapped.__placeLinked=true;window.renderEventDetail=wrapped;return true;
  }
  var style=document.createElement('style');style.textContent='.eventPlaceEntity{width:100%;border:0;background:transparent;padding:0;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;color:#222c43}.eventPlaceEntity strong{font-size:13px;line-height:1.4}.eventPlaceEntity b{font-size:25px;line-height:1;color:#66718c;font-weight:400}';document.head.appendChild(style);
  document.addEventListener('click',function(e){if(!returnState)return;var b=e.target.closest&&e.target.closest('.placeBack');if(!b)return;e.preventDefault();e.stopImmediatePropagation();var s=returnState;returnState=null;if(typeof openEventView==='function')openEventView(s.eventId,s.returnView||'calendar')},true);
  if(!patch())setTimeout(patch,300);
})();
