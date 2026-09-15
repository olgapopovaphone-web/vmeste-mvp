function eventPrice(){return ''}

function allEventsFromResponse(data){
  const created=(data.events||[]).filter(ev=>!['finished','cancelled'].includes(ev.status)).map(ev=>({...ev,calendar_kind:'created'}));
  const invited=(data.invited_events||[]).filter(ev=>!['finished','cancelled'].includes(ev.status)).map(ev=>({...ev,calendar_kind:'invited'}));
  return [...created,...invited].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
}

function dayEventHtml(ev){
  const own=ev.calendar_kind==='created';
  const pending=ev.calendar_kind==='invited'&&ev.invitation_status==='pending';
  return `<article class="calendarEvent"><div class="eventKind">${own?'МОЁ СОБЫТИЕ':pending?'МЕНЯ ПРИГЛАСИЛИ':'Я УЧАСТВУЮ'}</div><div class="calendarEventTop"><div><h3>${escapeHtml(ev.title)}</h3><p class="muted">${eventTime(ev.starts_at)}${ev.location_name?' · '+escapeHtml(ev.location_name):''}</p></div><span class="tag">${eventBadge(ev)}</span></div><div class="calendarEventActions">${own?`<button class="repeat invite-link-button" data-event-id="${escapeHtml(ev.id)}" data-event-title="${escapeHtml(ev.title)}">Ссылка-приглашение</button>`:''}${pending?`<button class="smallPrimary invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="accepted">Принять</button><button class="repeat invite-response" data-invitation-id="${escapeHtml(ev.invitation_id)}" data-response="declined">Отклонить</button>`:''}</div><div class="invite-area" id="invite-${escapeHtml(ev.id)}"></div></article>`;
}

const privateEventForm=document.querySelector('#event-form');
if(privateEventForm){
  privateEventForm.onsubmit=async e=>{
    e.preventDefault();
    if(!account){openView('login');return}
    const status=document.querySelector('#event-status');
    status.hidden=false;status.className='status';status.textContent='Сохраняю в базе…';
    const date=document.querySelector('#event-date').value;
    const time=document.querySelector('#event-time').value;
    const starts=new Date(`${date}T${time}:00+03:00`);
    const ends=new Date(starts.getTime()+2*60*60*1000);
    const sourceUrl=(document.querySelector('#event-source')?.value||'').trim();
    try{
      const data=await api('create_event',{
        title:document.querySelector('#event-title').value.trim(),
        starts_at:starts.toISOString(),
        ends_at:ends.toISOString(),
        location_name:document.querySelector('#event-place').value.trim()||null,
        price_minor:0
      });
      if(sourceUrl)await eventRaw('set_source_url',{event_id:data.event.id,source_url:sourceUrl});
      status.textContent='Событие сохранено';
      e.target.reset();
      selectedDateKey=dateKey(data.event.starts_at);
      calendarYear=Number(selectedDateKey.slice(0,4));
      calendarMonth=Number(selectedDateKey.slice(5,7))-1;
      await loadEvents();
    }catch(err){status.className='status error';status.textContent=err.message}
  };
}

async function loadChronicle(){
  const root=document.querySelector('#chronicle-list');
  if(!root)return;
  if(!account){root.innerHTML='<p class="muted">Войдите, чтобы увидеть завершённые события.</p>';return}
  root.innerHTML='<p class="muted">Загружаю…</p>';
  try{
    const data=await eventRaw('list_chronicle');
    const events=data.events||[];
    root.innerHTML=events.length?events.map(ev=>{
      const d=new Date(ev.starts_at);
      const day=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',timeZone:'Europe/Moscow'}).format(d);
      const mon=new Intl.DateTimeFormat('ru-RU',{month:'short',timeZone:'Europe/Moscow'}).format(d).replace('.','').toUpperCase();
      return `<article class="history chronicleEvent" data-event-id="${eventEsc(ev.id)}"><div><b>${day}</b><span>${mon}</span></div><div><h3>${eventEsc(ev.title)}</h3><p>${eventEsc(ev.location_name||'Место не указано')}</p><button class="repeat">Открыть</button></div></article>`;
    }).join(''):'<p class="muted">Хроника пока пуста. Завершённые события появятся здесь.</p>';
    root.querySelectorAll('.chronicleEvent').forEach(card=>card.onclick=e=>{if(e.target.closest('button')||e.target===card||e.currentTarget===card)openEventView(card.dataset.eventId,'chronicle')});
  }catch(err){root.innerHTML=`<div class="status error">${eventEsc(err.message)}</div>`}
}
window.loadChronicle=loadChronicle;
const chronicleNav=document.querySelector('.nav[data-go="chronicle"]');
if(chronicleNav)chronicleNav.addEventListener('click',()=>setTimeout(loadChronicle,0));
