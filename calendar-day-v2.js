(function(){
  var section=document.querySelector('[data-view="calendar"]');
  if(!section||section.dataset.calendarDayV2Mounted==='1')return;
  section.dataset.calendarDayV2Mounted='1';

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function dateKey(v){try{var p=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(new Date(v)),g=function(t){var x=p.find(function(a){return a.type===t});return x?x.value:''};return g('year')+'-'+g('month')+'-'+g('day')}catch(e){return''}}
  function fullLabel(key){try{var a=key.split('-').map(Number),d=new Date(Date.UTC(a[0],a[1]-1,a[2],12));var s=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(d);return s.charAt(0).toUpperCase()+s.slice(1)}catch(e){return key}}
  function time(v){try{return new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}catch(e){return''}}
  function active(ev){return ev&&!['finished','cancelled'].includes(ev.status)}
  function dayEvents(data,key){
    var created=(data.events||[]).filter(active).map(function(e){return Object.assign({},e,{day_kind:'created'})});
    var joined=(data.invited_events||[]).filter(function(e){return active(e)&&e.invitation_status==='accepted'}).map(function(e){return Object.assign({},e,{day_kind:'joined'})});
    return created.concat(joined).filter(function(e){return dateKey(e.starts_at)===key}).sort(function(a,b){return new Date(a.starts_at)-new Date(b.starts_at)});
  }
  function eventCard(ev){
    var meta=time(ev.starts_at)+(ev.location_name?' · '+ev.location_name:'');
    return '<button type="button" class="calendarDayEvent" data-calendar-day-event="'+esc(ev.id)+'"><span class="calendarDayTime">'+esc(time(ev.starts_at))+'</span><span class="calendarDayEventCopy"><strong>'+esc(ev.title)+'</strong><small>'+esc(ev.location_name||'Место не указано')+'</small></span><span class="calendarDayArrow">›</span></button>';
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
    if(!window.account){body.innerHTML='<div class="calendarDayEmpty"><strong>Войдите, чтобы увидеть события этого дня.</strong><button type="button" class="calendarDayLogin">Войти</button></div>';body.querySelector('.calendarDayLogin').onclick=function(){remove();openView('login')};return}
    try{
      var data=await api('list_events'),items=dayEvents(data,key);
      body.innerHTML=items.length?'<div class="calendarDayList">'+items.map(eventCard).join('')+'</div>':'<div class="calendarDayEmpty"><strong>На этот день пока ничего не запланировано.</strong><span>Можно создать событие прямо отсюда.</span></div>';
      body.querySelectorAll('[data-calendar-day-event]').forEach(function(b){b.onclick=function(){var id=b.dataset.calendarDayEvent;remove();if(typeof openEventView==='function')openEventView(id,'calendar')}});
    }catch(e){body.innerHTML='<div class="calendarDayEmpty"><strong>Не удалось загрузить день.</strong><span>'+esc(e.message)+'</span></div>'}
  }
  function openCreate(key){
    remove();
    if(!window.account){openView('login');return}
    openView('create');
    setTimeout(function(){
      var choice=document.getElementById('private-choice'),form=document.getElementById('event-form'),date=document.getElementById('event-date');
      if(choice&&form&&form.hidden)choice.click();
      if(date){date.value=key;date.dispatchEvent(new Event('change',{bubbles:true}))}
      if(form)setTimeout(function(){form.scrollIntoView({behavior:'smooth',block:'start'})},30);
    },30);
  }

  document.addEventListener('click',function(e){
    if(!section.classList.contains('active')||!section.classList.contains('mode-calendar'))return;
    var day=e.target.closest&&e.target.closest('#calendar-grid [data-date]');
    if(!day)return;
    var key=day.dataset.date;
    setTimeout(function(){openDay(key)},0);
  },true);

  window.openVmesteCalendarDay=openDay;
})();
