(function(){
  var section=document.querySelector('[data-view="calendar"]');
  var AFISHA_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-afisha-api';
  if(!section||section.dataset.calendarDayV2Mounted==='1')return;
  section.dataset.calendarDayV2Mounted='1';

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function hasAccount(){try{return typeof account!=='undefined'&&!!account}catch(e){return false}}
  function dateKey(v){try{var p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(new Date(v)),g=function(t){var x=p.find(function(a){return a.type===t});return x?x.value:''};return g('year')+'-'+g('month')+'-'+g('day')}catch(e){return''}}
  function fullLabel(key){try{var a=key.split('-').map(Number),d=new Date(Date.UTC(a[0],a[1]-1,a[2],12));var s=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(d);return s.charAt(0).toUpperCase()+s.slice(1)}catch(e){return key}}
  function time(v){try{return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}catch(e){return''}}
  function active(ev){return ev&&!['finished','cancelled'].includes(ev.status)}
  function dayEvents(data,key){
    var created=(data.events||[]).filter(active).map(function(e){return Object.assign({},e,{day_kind:'created'})});
    var joined=(data.invited_events||[]).filter(function(e){return active(e)&&e.invitation_status==='accepted'}).map(function(e){return Object.assign({},e,{day_kind:'joined'})});
    return created.concat(joined).filter(function(e){return dateKey(e.starts_at)===key}).sort(function(a,b){return new Date(a.starts_at)-new Date(b.starts_at)});
  }
  function eventCard(ev){return '<button type="button" class="calendarDayEvent" data-calendar-day-event="'+esc(ev.id)+'"><span class="calendarDayTime">'+esc(time(ev.starts_at))+'</span><span class="calendarDayEventCopy"><strong>'+esc(ev.title)+'</strong><small>'+esc(ev.location_name||'Место не указано')+'</small></span><span class="calendarDayArrow">›</span></button>'}
  var CAT={cinema:'Кино',music:'Музыка',theatre:'Театр',humor:'Юмор',exhibition:'Выставка',fair:'Ярмарка',kids:'С детьми',walks:'Прогулка',food:'Еда',sport:'Спорт',lya:'ЛЯ'};
  function afishaCard(ev){
    var lya=ev.source_type==='lya'||ev.category==='lya',label=CAT[ev.category]||'Событие';
    var action=lya
      ?'<button type="button" class="calendarDayIdeaAction" data-calendar-day-lya="'+esc(ev.event_id||ev.id)+'">Открыть</button>'
      :'<button type="button" class="calendarDayIdeaAction" data-calendar-day-afisha="'+esc(ev.id)+'">Позвать своих</button>';
    return '<article class="calendarDayIdea"><div class="calendarDayIdeaCopy"><span>'+esc(label)+' · '+esc(time(ev.starts_at))+'</span><strong>'+esc(ev.title||'Событие')+'</strong><small>'+esc(ev.venue||'Место уточняется')+'</small></div>'+action+'</article>'
  }
  async function afishaForDay(key){
    var city='Ростов-на-Дону';
    try{if(typeof account!=='undefined'&&account&&account.profile&&account.profile.city)city=account.profile.city}catch(e){}
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feed',city:city,date:key})};
    var r=window.lyaAuthedFetch?await window.lyaAuthedFetch(AFISHA_API,opts,true):await fetch(AFISHA_API,opts);
    var d=await r.json().catch(function(){return{}});
    if(!r.ok)throw new Error(d.error||'Не удалось загрузить события дня');
    return (d.events||[]).filter(function(ev){return dateKey(ev.starts_at)===key}).slice(0,5)
  }
  function bindIdeas(root,key){
    root.querySelectorAll('[data-calendar-day-afisha]').forEach(function(b){b.onclick=function(){
      var id=b.dataset.calendarDayAfisha;remove();
      if(typeof window.collectAfishaCompany==='function')window.collectAfishaCompany(id);
      else if(typeof window.openAfishaForDate==='function')window.openAfishaForDate(key)
    }});
    root.querySelectorAll('[data-calendar-day-lya]').forEach(function(b){b.onclick=function(){var id=b.dataset.calendarDayLya;remove();if(typeof openEventView==='function')openEventView(id,'calendar')}});
    var all=root.querySelector('[data-calendar-day-all]');if(all)all.onclick=function(){remove();if(typeof window.openAfishaForDate==='function')window.openAfishaForDate(key);else if(typeof openView==='function')openView('home')}
  }
  function remove(){document.querySelector('.calendarDayOverlay')?.remove()}
  function renderShell(key){
    remove();
    var o=document.createElement('div');o.className='calendarDayOverlay';o.dataset.calendarDayKey=key;
    o.innerHTML='<div class="calendarDayScreen"><header class="calendarDayHeader"><button type="button" class="calendarDayBack" aria-label="Назад">‹</button><div><span>ДЕНЬ</span><h2>'+esc(fullLabel(key))+'</h2></div><span class="calendarDayHeaderSpacer"></span></header><main class="calendarDayBody"><div class="calendarDayLoading">Загружаю…</div></main><div class="calendarDayBottom"><button type="button" class="calendarDayCreate">＋ Создать событие</button></div></div>';
    document.body.appendChild(o);
    o.querySelector('.calendarDayBack').onclick=remove;
    o.querySelector('.calendarDayCreate').onclick=function(){openCreate(key)};
    return o;
  }
  async function openDay(key){
    var o=renderShell(key),body=o.querySelector('.calendarDayBody');
    if(!hasAccount()){body.innerHTML='<div class="calendarDayEmpty"><strong>Войдите, чтобы увидеть события этого дня.</strong><button type="button" class="calendarDayLogin">Войти</button></div>';body.querySelector('.calendarDayLogin').onclick=function(){remove();openView('login')};return}

    body.innerHTML='<section class="calendarDaySection"><div class="calendarDaySectionHead"><span>ВАШИ ПЛАНЫ</span></div><div data-calendar-day-plans><div class="calendarDayLoading">Загружаю планы…</div></div></section><section class="calendarDaySection calendarDayIdeas"><div class="calendarDaySectionHead"><span>СОБЫТИЯ НА ЭТОТ ДЕНЬ</span><h3>Что можно сделать вместе</h3></div><div data-calendar-day-ideas><div class="calendarDayLoading">Ищу события…</div></div></section>';
    var plans=body.querySelector('[data-calendar-day-plans]'),ideas=body.querySelector('[data-calendar-day-ideas]');

    try{
      var data=await api('list_events'),items=dayEvents(data,key);
      plans.innerHTML=items.length?'<div class="calendarDayList">'+items.map(eventCard).join('')+'</div>':'<div class="calendarDayEmpty calendarDayEmptyCompact"><strong>На этот день пока ничего не запланировано.</strong><span>Можно выбрать готовый повод ниже или создать свой.</span></div>';
      plans.querySelectorAll('[data-calendar-day-event]').forEach(function(b){b.onclick=function(){var id=b.dataset.calendarDayEvent;remove();if(typeof openEventView==='function')openEventView(id,'calendar')}});
    }catch(e){plans.innerHTML='<div class="calendarDayEmpty calendarDayEmptyCompact"><strong>Не удалось загрузить ваши планы.</strong><span>'+esc(e.message)+'</span></div>'}

    try{
      var found=await afishaForDay(key);
      ideas.innerHTML=found.length?'<div class="calendarDayIdeaList">'+found.map(afishaCard).join('')+'</div><button type="button" class="calendarDayAll" data-calendar-day-all>Все события дня</button>':'<div class="calendarDayEmpty calendarDayEmptyCompact"><strong>Готовых событий пока не нашли.</strong><span>Можно создать свой повод на эту дату.</span></div><button type="button" class="calendarDayAll" data-calendar-day-all>Посмотреть «Вокруг»</button>';
      bindIdeas(ideas,key);
    }catch(e){ideas.innerHTML='<div class="calendarDayEmpty calendarDayEmptyCompact"><strong>Не удалось загрузить афишу.</strong><span>'+esc(e.message)+'</span></div><button type="button" class="calendarDayAll" data-calendar-day-all>Открыть «Вокруг»</button>';bindIdeas(ideas,key)}
  }
  function openCreate(key){
    remove();
    if(!hasAccount()){openView('login');return}
    openView('create');
    setTimeout(function(){
      var choice=document.getElementById('private-choice'),form=document.getElementById('event-form'),date=document.getElementById('event-date');
      if(choice&&form&&form.hidden)choice.click();
      if(date){date.value=key;date.dispatchEvent(new Event('change',{bubbles:true}))}
      if(form)setTimeout(function(){form.scrollIntoView({behavior:'smooth',block:'start'})},30);
    },30);
  }

  document.addEventListener('click',function(e){
    if(!section.classList.contains('active'))return;
    var day=e.target.closest&&e.target.closest('#calendar-grid [data-date]');
    if(!day)return;
    var key=day.dataset.date;
    setTimeout(function(){openDay(key)},0);
  },true);

  window.openVmesteCalendarDay=openDay;
})();
