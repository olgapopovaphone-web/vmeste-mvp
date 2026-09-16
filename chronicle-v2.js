(function(){
  var section=document.querySelector('[data-view="chronicle"]');
  var root=document.getElementById('chronicle-list');
  if(!section||!root||section.dataset.chronicleV2Mounted==='1')return;
  section.dataset.chronicleV2Mounted='1';

  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-chronicle-api';
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var LINKS_KEY='vmeste_event_group_proto_v1';
  var events=[],activeFilter='all',query='',loading=false,loaded=false,wasActive=false;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function read(key,fallback){try{var v=JSON.parse(localStorage.getItem(key)||'');return v||fallback}catch(e){return fallback}}
  function token(){try{var s=JSON.parse(localStorage.getItem('vmeste_session_v1')||'null');return s&&s.access_token||''}catch(e){return''}}
  async function call(action,payload,retry){var t=token();if(!t)throw new Error('LOGIN');var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(Object.assign({action:action},payload||{}))});var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}if(r.status===401&&retry!==false&&typeof refreshSession==='function'&&await refreshSession())return call(action,payload,false);if(!r.ok)throw new Error(d.error||'Ошибка запроса');return d}
  function groups(){var a=read(GROUPS_KEY,[]);return Array.isArray(a)?a:[]}
  function links(){var m=read(LINKS_KEY,{});return m&&typeof m==='object'?m:{}}
  function groupFor(ev){var id=links()[ev.id];if(!id)return null;return groups().find(function(g){return g.id===id})||null}
  function typeOf(ev){if(groupFor(ev))return'communities';if(ev.place_id||ev.source_url)return'places';return'people'}
  function dateLabel(v){try{return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(v)).replace(' г.','')}catch(e){return''}}
  function memberWord(n){var a=Math.abs(n)%100,b=a%10;if(a>10&&a<20)return'участников';if(b===1)return'участник';if(b>1&&b<5)return'участника';return'участников'}
  function searchable(ev){var g=groupFor(ev),names=Array.isArray(ev.participant_names)?ev.participant_names.join(' '):'';return [ev.title,ev.location_name,g&&g.name,names].filter(Boolean).join(' ').toLowerCase()}

  function setupHeader(){
    var top=section.querySelector(':scope > .top');if(!top)return;
    top.classList.add('chronicleV2Top');
    var intro=top.firstElementChild;if(intro){intro.querySelectorAll('.ey,h1,p').forEach(function(el){el.hidden=true})}
    if(!top.querySelector('.chronicleV2TopTools')){
      var avatar=top.querySelector('.avatar');
      var tools=document.createElement('div');tools.className='chronicleV2TopTools';
      tools.innerHTML='<button type="button" class="chronicleV2SearchToggle" aria-label="Поиск"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.8"></circle><path d="m16.2 16.2 4 4"></path></svg></button>';
      if(avatar){top.insertBefore(tools,avatar);tools.appendChild(avatar)}else top.appendChild(tools);
      tools.querySelector('.chronicleV2SearchToggle').onclick=function(){var panel=section.querySelector('.chronicleV2Search');if(!panel)return;panel.hidden=!panel.hidden;if(!panel.hidden)setTimeout(function(){panel.querySelector('input').focus()},0)};
    }
    if(!section.querySelector('.chronicleV2Controls')){
      var controls=document.createElement('div');controls.className='chronicleV2Controls';
      controls.innerHTML='<div class="chronicleV2Search" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.8"></circle><path d="m16.2 16.2 4 4"></path></svg><input type="search" autocomplete="off" placeholder="Событие, место, сообщество, человек"></div><div class="chronicleV2Filters"><button class="active" data-chronicle-filter="all">Все</button><button data-chronicle-filter="communities">Сообщества</button><button data-chronicle-filter="places">Места</button><button data-chronicle-filter="people">Люди</button></div>';
      root.insertAdjacentElement('beforebegin',controls);
      controls.querySelectorAll('[data-chronicle-filter]').forEach(function(b){b.onclick=function(){activeFilter=b.dataset.chronicleFilter;controls.querySelectorAll('[data-chronicle-filter]').forEach(function(x){x.classList.toggle('active',x===b)});render()}});
      var input=controls.querySelector('input');input.oninput=function(){query=input.value.trim().toLowerCase();render()};
    }
  }

  function card(ev){
    var g=groupFor(ev),count=Number(ev.participant_count||1),kind=typeOf(ev),meta=[];
    if(ev.location_name)meta.push('⌖ '+ev.location_name);
    if(count)meta.push(count+' '+memberWord(count));
    if(g)meta.push(g.name);
    var bg=ev.cover_url?' style="background-image:url(\''+esc(String(ev.cover_url).replace(/'/g,'%27'))+'\')"':'';
    return '<article class="chronicleV2Card '+(ev.cover_url?'has-cover':'no-cover')+'" data-chronicle-id="'+esc(ev.id)+'" data-kind="'+kind+'"'+bg+'><div class="chronicleV2Shade"></div><div class="chronicleV2CardBody"><time>'+esc(dateLabel(ev.starts_at))+'</time><h2>'+esc(ev.title||'Событие')+'</h2><p>'+meta.map(esc).join(' · ')+'</p><div class="chronicleV2Actions"><button type="button" class="chronicleV2Repeat" data-chronicle-repeat="'+esc(ev.id)+'">Повторить</button><button type="button" class="chronicleV2More" data-chronicle-menu="'+esc(ev.id)+'" aria-label="Ещё">•••</button></div></div></article>'
  }

  function visibleEvents(){return events.filter(function(ev){if(activeFilter!=='all'&&typeOf(ev)!==activeFilter)return false;if(query&&!searchable(ev).includes(query))return false;return true})}
  function render(){
    setupHeader();
    if(loading){root.innerHTML='<div class="chronicleV2State" data-chronicle-v2-root>Загружаю Хронику…</div>';return}
    if(!token()){root.innerHTML='<div class="chronicleV2State" data-chronicle-v2-root><strong>Хроника доступна после входа</strong><button type="button" data-chronicle-login>Войти</button></div>';var lb=root.querySelector('[data-chronicle-login]');if(lb)lb.onclick=function(){if(typeof openView==='function')openView('login')};return}
    var list=visibleEvents();
    root.innerHTML='<div class="chronicleV2Feed" data-chronicle-v2-root>'+(list.length?list.map(card).join(''):'<div class="chronicleV2State">'+(query?'Ничего не нашли.':'Здесь пока ничего нет.')+'</div>')+'</div>';
    bind();
  }

  function byId(id){return events.find(function(ev){return ev.id===id})||null}
  function bind(){
    root.querySelectorAll('.chronicleV2Card').forEach(function(c){c.onclick=function(e){if(e.target.closest('button'))return;var ev=byId(c.dataset.chronicleId);if(ev&&typeof openEventView==='function')openEventView(ev.id,'chronicle')}});
    root.querySelectorAll('[data-chronicle-repeat]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var ev=byId(b.dataset.chronicleRepeat);if(ev)repeatEvent(ev)}});
    root.querySelectorAll('[data-chronicle-menu]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var ev=byId(b.dataset.chronicleMenu);if(ev)openMenu(ev)}})
  }

  function repeatEvent(ev){
    if(typeof window.clearPendingEventCircleInviteIds==='function')window.clearPendingEventCircleInviteIds();
    if(typeof openView==='function')openView('create');
    setTimeout(function(){
      var form=document.getElementById('event-form'),choice=document.getElementById('private-choice');if(form&&form.hidden&&choice)choice.click();
      var title=document.getElementById('event-title'),place=document.getElementById('event-place'),source=document.getElementById('event-source'),description=document.getElementById('event-description'),date=document.getElementById('event-date'),time=document.getElementById('event-time');
      if(title)title.value=ev.title||'';if(place)place.value=ev.location_name||'';if(source)source.value=ev.location_url||ev.source_url||'';if(description)description.value=ev.description||'';if(date)date.value='';if(time)time.value='';
      document.querySelector('.chronicleRepeatContext')?.remove();
      if(form){var box=document.createElement('div');box.className='chronicleRepeatContext';box.textContent='Повторяем событие — выберите новую дату и время и заново добавьте участников.';form.insertAdjacentElement('beforebegin',box);form.scrollIntoView({behavior:'smooth',block:'start'})}
    },80)
  }

  function openMenu(ev){
    document.querySelector('.chronicleV2MenuOverlay')?.remove();var o=document.createElement('div');o.className='chronicleV2MenuOverlay';
    o.innerHTML='<div class="chronicleV2Menu"><div class="chronicleV2MenuHead"><strong>'+esc(ev.title||'Событие')+'</strong><button type="button" data-close>×</button></div><button type="button" data-share>Поделиться</button><button type="button" class="danger" data-hide>Убрать из Хроники</button></div>';
    document.body.appendChild(o);var close=function(){o.remove()};o.querySelector('[data-close]').onclick=close;o.onclick=function(e){if(e.target===o)close()};
    o.querySelector('[data-share]').onclick=async function(){var text='«'+(ev.title||'Событие')+'» — в ЛЯ';var url='https://vmeste-app-omega.vercel.app/';try{if(navigator.share)await navigator.share({title:ev.title||'ЛЯ',text:text,url:url});else if(navigator.clipboard)await navigator.clipboard.writeText(text+' '+url)}catch(e){}close()};
    o.querySelector('[data-hide]').onclick=async function(){var b=this;b.disabled=true;try{await call('hide',{event_id:ev.id});events=events.filter(function(x){return x.id!==ev.id});close();render();showUndo(ev)}catch(err){alert(err.message);b.disabled=false}}
  }

  function showUndo(ev){document.querySelector('.chronicleV2Toast')?.remove();var t=document.createElement('div');t.className='chronicleV2Toast';t.innerHTML='<span>Убрано из Хроники</span><button type="button">Вернуть</button>';document.body.appendChild(t);var timer=setTimeout(function(){t.remove()},5000);t.querySelector('button').onclick=async function(){clearTimeout(timer);try{await call('restore',{event_id:ev.id});t.remove();await load()}catch(e){alert(e.message)}}}

  async function load(){
    setupHeader();if(!token()){events=[];loaded=true;loading=false;render();return}
    loading=true;render();try{var d=await call('list',{});events=d.events||[];loaded=true}catch(e){events=[];loaded=true;root.innerHTML='<div class="chronicleV2State error" data-chronicle-v2-root>'+esc(e.message)+'</div>';loading=false;return}loading=false;render()
  }

  window.loadChronicleV2=load;window.loadChronicle=load;
  var nav=document.querySelector('.nav[data-go="chronicle"]');if(nav)nav.addEventListener('click',function(){setTimeout(load,40)});
  new MutationObserver(function(){var active=section.classList.contains('active');if(active&&!wasActive)setTimeout(load,30);wasActive=active}).observe(section,{attributes:true,attributeFilter:['class']});
  new MutationObserver(function(){if(section.classList.contains('active')&&loaded&&!root.querySelector('[data-chronicle-v2-root]'))setTimeout(render,0)}).observe(root,{childList:true});
  setupHeader();if(section.classList.contains('active'))load();
})();
