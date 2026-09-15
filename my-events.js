(function(){
  var section=null,listPane=null,calendarPane=null,currentFilter='all',lastData=null,loading=false;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function parts(v){try{var d=new Date(v),p=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).formatToParts(d),g=function(t){var x=p.find(function(a){return a.type===t});return x?x.value:''};return{day:g('day'),month:g('month').replace('.','').toUpperCase(),time:g('hour')+':'+g('minute')}}catch(e){return{day:'',month:'',time:''}}}
  function active(ev){return ev&&!['finished','cancelled'].includes(ev.status)}
  function classify(data){
    var created=(data.events||[]).filter(active).map(function(e){return Object.assign({},e,{my_kind:'organizing'})});
    var accepted=(data.invited_events||[]).filter(function(e){return active(e)&&e.invitation_status==='accepted'}).map(function(e){return Object.assign({},e,{my_kind:'going'})});
    var pending=(data.invited_events||[]).filter(function(e){return active(e)&&e.invitation_status==='pending'}).map(function(e){return Object.assign({},e,{my_kind:'pending'})});
    var byDate=function(a,b){return new Date(a.starts_at)-new Date(b.starts_at)};created.sort(byDate);accepted.sort(byDate);pending.sort(byDate);
    return{created:created,accepted:accepted,pending:pending,confirmed:created.concat(accepted).sort(byDate)};
  }
  function status(ev){if(ev.my_kind==='organizing')return{txt:ev.status==='draft'?'Черновик':'Организую',cls:'organizing'};if(ev.my_kind==='going')return{txt:'Иду',cls:'going'};return{txt:'Приглашение',cls:'pending'}}
  function card(ev){var d=parts(ev.starts_at),s=status(ev),meta=d.time+(ev.location_name?' · '+ev.location_name:'');return '<button type="button" class="myEventCard" data-my-event="'+esc(ev.id)+'"><span class="myEventDate"><b>'+esc(d.day)+'</b><span>'+esc(d.month)+'</span></span><span class="myEventBody"><h3>'+esc(ev.title)+'</h3><p>'+esc(meta)+'</p></span><span class="myEventSide"><span class="myEventStatus '+s.cls+'">'+esc(s.txt)+'</span><span class="myEventArrow">›</span></span></button>'}
  function pendingCard(ev){return '<article class="myEventsPendingCard">'+card(ev)+'<div class="myEventsPendingActions"><button type="button" class="myEventsAccept" data-invite-answer="accepted" data-invitation="'+esc(ev.invitation_id)+'">Принять</button><button type="button" class="myEventsDecline" data-invite-answer="declined" data-invitation="'+esc(ev.invitation_id)+'">Отклонить</button></div></article>'}
  function filtered(c){if(currentFilter==='organizing')return c.created;if(currentFilter==='going')return c.accepted;if(currentFilter==='invites')return c.pending;return c.confirmed}
  function render(){
    if(!listPane)return;
    if(!account){listPane.innerHTML='<div class="myEventsEmpty myEventsLogin"><div><strong>Ваши события появятся после входа.</strong><br>Здесь будут созданные встречи, подтверждённые планы и новые приглашения.</div><button type="button" data-my-events-login>Войти</button></div>';return}
    if(!lastData){listPane.innerHTML='<div class="myEventsEmpty">Загружаю события…</div>';return}
    var c=classify(lastData),now=Date.now(),quick=c.confirmed.filter(function(e){return new Date(e.starts_at).getTime()>=now}).slice(0,3),items=filtered(c);
    var pendingSection=c.pending.length?'<section class="myEventsSection"><div class="myEventsSectionHead"><h2>Ждут ответа</h2><small>'+c.pending.length+'</small></div><div class="myEventsQuick">'+c.pending.map(pendingCard).join('')+'</div></section>':'';
    var quickSection='<section class="myEventsSection"><div class="myEventsSectionHead"><h2>Ближайшие</h2><small>'+quick.length+'</small></div>'+(quick.length?'<div class="myEventsQuick">'+quick.map(card).join('')+'</div>':'<div class="myEventsEmpty">Подтверждённых будущих событий пока нет.</div>')+'</section>';
    var filters='<div class="myEventsFilters"><button data-my-filter="all" class="'+(currentFilter==='all'?'active':'')+'">Все</button><button data-my-filter="organizing" class="'+(currentFilter==='organizing'?'active':'')+'">Организую</button><button data-my-filter="going" class="'+(currentFilter==='going'?'active':'')+'">Иду</button><button data-my-filter="invites" class="'+(currentFilter==='invites'?'active':'')+'">Приглашения</button></div>';
    var allSection='<section class="myEventsSection"><div class="myEventsSectionHead"><h2>Все события</h2><small>'+items.length+'</small></div>'+filters+(items.length?'<div class="myEventsAll">'+items.map(function(e){return e.my_kind==='pending'?pendingCard(e):card(e)}).join('')+'</div>':'<div class="myEventsEmpty">В этой категории пока ничего нет.</div>')+'</section>';
    listPane.innerHTML=pendingSection+quickSection+allSection;
  }
  async function refresh(force){
    if(!account){lastData=null;render();return}
    if(loading)return;
    if(lastData&&!force){render();return}
    loading=true;if(!lastData)render();
    try{lastData=await api('list_events');render()}catch(e){listPane.innerHTML='<div class="myEventsEmpty">Не удалось загрузить события. '+esc(e.message)+'</div>'}finally{loading=false}
  }
  function setMode(mode,force){
    if(!section)return;mode=mode==='calendar'?'calendar':'list';section.classList.toggle('mode-list',mode==='list');section.classList.toggle('mode-calendar',mode==='calendar');
    section.querySelectorAll('[data-my-events-mode]').forEach(function(b){b.classList.toggle('active',b.dataset.myEventsMode===mode)});
    if(listPane)listPane.hidden=mode!=='list';if(calendarPane)calendarPane.hidden=mode!=='calendar';
    if(mode==='list')refresh(!!force);else{try{if(typeof loadEvents==='function')loadEvents()}catch(e){}try{if(typeof getCalendarReminderMinutes==='function')getCalendarReminderMinutes(true)}catch(e){}}
  }
  function bind(){
    section.querySelectorAll('[data-my-events-mode]').forEach(function(b){b.onclick=function(){setMode(b.dataset.myEventsMode,false)}});
    listPane.addEventListener('click',async function(e){
      var login=e.target.closest('[data-my-events-login]');if(login){openView('login');return}
      var filter=e.target.closest('[data-my-filter]');if(filter){currentFilter=filter.dataset.myFilter;render();return}
      var answer=e.target.closest('[data-invite-answer]');if(answer){e.preventDefault();e.stopPropagation();answer.disabled=true;try{await api('respond_invitation',{invitation_id:answer.dataset.invitation,response:answer.dataset.inviteAnswer});lastData=null;await refresh(true);try{if(typeof loadEvents==='function')await loadEvents()}catch(x){}}catch(err){alert(err.message);answer.disabled=false}return}
      var event=e.target.closest('[data-my-event]');if(event){if(typeof openEventView==='function')openEventView(event.dataset.myEvent,'calendar');return}
    });
  }
  function mount(){
    section=document.querySelector('[data-view="calendar"]');if(!section||section.dataset.myEventsMounted==='1')return;section.dataset.myEventsMounted='1';section.classList.add('myEventsView','mode-list');
    var ey=section.querySelector('.top .ey'),h=section.querySelector('.top h1'),p=section.querySelector('.top p');if(ey)ey.textContent='МОИ СОБЫТИЯ';if(h){h.id='my-events-title';h.textContent='События'}if(p)p.textContent='Все ваши встречи и приглашения — списком или в календаре.';
    var sw=document.createElement('div');sw.className='myEventsSwitch';sw.innerHTML='<button type="button" class="active" data-my-events-mode="list">Список</button><button type="button" data-my-events-mode="calendar">Календарь</button>';section.querySelector('.top').insertAdjacentElement('afterend',sw);
    listPane=document.createElement('div');listPane.id='my-events-list-pane';listPane.className='myEventsPane myEventsListPane';sw.insertAdjacentElement('afterend',listPane);
    calendarPane=document.createElement('div');calendarPane.id='my-events-calendar-pane';calendarPane.className='myEventsPane myEventsCalendarPane';calendarPane.hidden=true;listPane.insertAdjacentElement('afterend',calendarPane);
    var ct=document.createElement('h2');ct.id='calendar-title';ct.className='myEventsCalendarTitle';ct.textContent='Календарь';calendarPane.appendChild(ct);
    ['calendar-modes','calendar-reminder-control','calendar-prev'].forEach(function(){});
    var modes=document.getElementById('calendar-modes'),reminder=document.getElementById('calendar-reminder-control'),nav=section.querySelector('.calendarNav'),grid=document.getElementById('calendar-grid'),dayHead=section.querySelector('.dayHead'),day=document.getElementById('day-events');
    [modes,reminder,nav,grid,dayHead,day].forEach(function(el){if(el)calendarPane.appendChild(el)});
    bind();render();
    var obs=new MutationObserver(function(){if(section.classList.contains('active')){if(section.classList.contains('mode-list'))refresh(true)}});obs.observe(section,{attributes:true,attributeFilter:['class']});
  }
  window.openMyEvents=function(mode){setMode(mode||'list',true)};window.refreshMyEvents=function(){lastData=null;return refresh(true)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
