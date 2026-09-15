const EVENT_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-event-api';
let activeEventId=null;
let eventChatTimer=null;
let eventReturnView='calendar';

function eventEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]))}
function eventDateTime(v){return new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(v))}

async function eventRaw(action,payload={},retry=true){
  const headers={'Content-Type':'application/json'};
  if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
  const r=await fetch(EVENT_API,{method:'POST',headers,body:JSON.stringify({action,...payload})});
  let data={};try{data=await r.json()}catch{data={error:'Некорректный ответ сервера'}}
  if(r.status===401&&retry&&await refreshSession())return eventRaw(action,payload,false);
  if(!r.ok)throw new Error(data.error||'Ошибка запроса');
  return data;
}

function openEventView(eventId,returnView='calendar'){
  if(!account){openView('login');return}
  activeEventId=eventId;
  eventReturnView=returnView;
  openView('event');
  const bottom=document.querySelector('#bottom-nav');if(bottom)bottom.style.display='none';
  loadEventDetail(eventId);
}

function closeEventView(){
  activeEventId=null;
  stopChatPolling();
  openView(eventReturnView||'calendar');
  if(eventReturnView==='chronicle'&&window.loadChronicle)window.loadChronicle();
}

document.addEventListener('click',e=>{
  const back=e.target.closest('#event-back');if(back){closeEventView();return}
  const card=e.target.closest('#day-events .calendarEvent');
  if(!card||e.target.closest('button,input,textarea,a'))return;
  const cards=[...document.querySelectorAll('#day-events .calendarEvent')];
  const idx=cards.indexOf(card);
  try{const events=eventsForDate(selectedDateKey);const ev=events[idx];if(ev?.id)openEventView(ev.id,'calendar')}catch{}
});

function avatarHtml(person){
  if(person.avatar_url)return `<span class="personAvatar"><img src="${eventEsc(person.avatar_url)}" alt=""></span>`;
  const letter=(person.display_name||'У').trim().slice(0,1).toUpperCase();
  return `<span class="personAvatar">${eventEsc(letter)}</span>`;
}
function statusLabel(s){return s==='going'?'Пойдёт':s==='interested'?'Возможно':s==='declined'?'Не сможет':'Участник'}

async function loadEventDetail(eventId){
  const root=document.querySelector('#event-detail-root');if(!root)return;
  root.innerHTML='<p class="muted">Загружаю событие…</p>';
  try{
    const data=await eventRaw('event_detail',{event_id:eventId});
    renderEventDetail(data);
    if(data.can_read_chat){await loadEventMessages(eventId);if(data.can_chat)startChatPolling(eventId);else stopChatPolling()}
    else stopChatPolling();
  }catch(err){root.innerHTML=`<div class="status error">${eventEsc(err.message)}</div>`}
}

function renderEventDetail(data){
  const root=document.querySelector('#event-detail-root');
  const ev=data.event;
  const finished=ev.status==='finished';
  const participants=data.participants||[];
  const counts={going:0,interested:0,declined:0};participants.forEach(p=>{if(counts[p.status]!==undefined)counts[p.status]++});
  const cover=ev.cover_url?`<img src="${eventEsc(ev.cover_url)}" alt="Обложка события">`:`<div class="eventCoverPlaceholder">В</div>`;
  const upload=data.is_creator&&!finished?`<input type="file" id="event-cover-input" accept="image/jpeg,image/png,image/webp" hidden><button class="coverEdit" id="event-cover-button">${ev.cover_url?'Сменить обложку':'Добавить обложку'}</button><div class="coverUploadStatus" id="cover-upload-status" hidden></div>`:'';
  const rsvp=data.is_creator||finished?'':`<div class="eventSection"><div class="eventSectionHead"><div><span class="ey">МОЙ ОТВЕТ</span><h3>Вы пойдёте?</h3></div></div><div class="rsvp"><button data-rsvp="going" class="${data.my_status==='going'?'active':''}">Пойду</button><button data-rsvp="interested" class="${data.my_status==='interested'?'active':''}">Возможно</button><button data-rsvp="declined" class="${data.my_status==='declined'?'active':''}">Не смогу</button></div></div>`;
  const people=[{...data.creator,status:'creator'},...participants];
  const peopleHtml=people.map(p=>`<div class="personRow">${avatarHtml(p)}<div><strong>${eventEsc(p.display_name)}</strong><small>${p.status==='creator'?'Организатор':statusLabel(p.status)}</small></div></div>`).join('');
  const invite=data.is_creator&&!finished?`<div class="eventSection"><div class="eventSectionHead"><div><span class="ey">ПРИГЛАШЕНИЕ</span><h3>Позвать людей</h3></div></div><div class="eventActions"><button class="primary" id="event-invite-link">Получить ссылку</button></div><div id="event-invite-box" class="inviteBox"></div></div>`:'';
  const source=data.is_creator&&!finished?`<div class="eventSection"><div class="eventSectionHead"><div><span class="ey">ССЫЛКА</span><h3>Реальное мероприятие</h3></div></div><div class="panel" style="margin-top:0"><label>Ссылка<input id="event-source-edit" type="url" value="${eventEsc(ev.source_url||'')}" placeholder="https://..."></label><button class="primary" id="event-source-save">Сохранить ссылку</button><div id="event-source-status" class="status" hidden></div></div>${ev.source_url?`<a class="eventExternalLink" href="${eventEsc(ev.source_url)}" target="_blank" rel="noopener">Открыть мероприятие ↗</a>`:''}</div>`:ev.source_url?`<div class="eventSection"><a class="eventExternalLink" href="${eventEsc(ev.source_url)}" target="_blank" rel="noopener">Открыть реальное мероприятие ↗</a></div>`:'';
  let chat='';
  if(data.can_read_chat){
    chat=`<div class="eventSection"><div class="eventSectionHead"><div><span class="ey">ЧАТ</span><h3>${finished?'История разговора':'Разговор события'}</h3></div>${!finished?'<button class="repeat" id="chat-refresh">Обновить</button>':''}</div><div class="chatBox"><div id="chat-messages" class="chatMessages"><p class="muted">Загружаю сообщения…</p></div>${data.can_chat?'<form id="chat-form" class="chatForm"><textarea id="chat-text" maxlength="2000" placeholder="Написать сообщение"></textarea><button>↑</button></form>':'<p class="eventHint">Событие завершено — чат сохранён только для чтения.</p>'}</div></div>`;
  }else{
    chat=`<div class="eventSection"><div class="eventSectionHead"><div><span class="ey">ЧАТ</span><h3>Разговор события</h3></div></div><div class="chatLocked">Чат открывается организатору и участникам со статусом «Пойду» или «Возможно».</div></div>`;
  }
  const lifecycle=data.is_creator?`<div class="eventSection eventDanger"><div class="eventSectionHead"><div><span class="ey">УПРАВЛЕНИЕ</span><h3>${finished?'Событие завершено':'Событие'}</h3></div></div>${finished?'<p class="muted">Оно находится в Хронике.</p>':`<button class="finishEvent" id="finish-event">Завершить событие</button>`}<button class="deleteEvent" id="delete-event">Удалить событие</button></div>`:'';
  root.innerHTML=`<div class="eventCover">${cover}${upload}</div><span class="ey">${finished?'ЗАВЕРШЕНО':data.is_creator?'МОЁ СОБЫТИЕ':'СОБЫТИЕ'}</span><h1 class="eventDetailTitle">${eventEsc(ev.title)}</h1>${ev.description?`<p class="muted">${eventEsc(ev.description)}</p>`:''}<div class="eventMeta"><div><small>КОГДА</small><b>${eventEsc(eventDateTime(ev.starts_at))}</b></div><div><small>ГДЕ</small><b>${eventEsc(ev.location_name||'Место не указано')}</b></div><div><small>ОРГАНИЗАТОР</small><b>${eventEsc(data.creator.display_name)}</b></div></div>${rsvp}<div class="eventSection"><div class="eventSectionHead"><div><span class="ey">УЧАСТНИКИ</span><h3>Кто будет</h3></div></div><div class="participantSummary"><span>Пойдут · ${counts.going}</span><span>Возможно · ${counts.interested}</span><span>Не смогут · ${counts.declined}</span></div><div class="participantList">${peopleHtml}</div></div>${source}${invite}${chat}${lifecycle}`;
  bindEventDetail(data);
}

function bindEventDetail(data){
  document.querySelectorAll('[data-rsvp]').forEach(btn=>btn.onclick=async()=>{
    btn.disabled=true;
    try{await eventRaw('set_rsvp',{event_id:data.event.id,status:btn.dataset.rsvp});await loadEventDetail(data.event.id);await loadEvents()}catch(err){alert(err.message);btn.disabled=false}
  });
  const coverBtn=document.querySelector('#event-cover-button');const coverInput=document.querySelector('#event-cover-input');
  if(coverBtn&&coverInput){coverBtn.onclick=()=>coverInput.click();coverInput.onchange=()=>uploadEventCover(data.event.id,coverInput.files?.[0])}
  const inviteBtn=document.querySelector('#event-invite-link');if(inviteBtn)inviteBtn.onclick=()=>createEventInviteLink(data.event.id,data.event.title);
  const sourceBtn=document.querySelector('#event-source-save');if(sourceBtn)sourceBtn.onclick=()=>saveEventSource(data.event.id);
  const finishBtn=document.querySelector('#finish-event');if(finishBtn)finishBtn.onclick=()=>finishEvent(data.event.id,data.event.title);
  const deleteBtn=document.querySelector('#delete-event');if(deleteBtn)deleteBtn.onclick=()=>deleteEvent(data.event.id,data.event.title);
  const chatForm=document.querySelector('#chat-form');if(chatForm)chatForm.onsubmit=async e=>{
    e.preventDefault();const text=document.querySelector('#chat-text').value.trim();if(!text)return;
    const send=chatForm.querySelector('button');send.disabled=true;
    try{await eventRaw('send_message',{event_id:data.event.id,text});document.querySelector('#chat-text').value='';await loadEventMessages(data.event.id)}catch(err){alert(err.message)}finally{send.disabled=false}
  };
  const refresh=document.querySelector('#chat-refresh');if(refresh)refresh.onclick=()=>loadEventMessages(data.event.id);
}

async function saveEventSource(eventId){
  const input=document.querySelector('#event-source-edit');const status=document.querySelector('#event-source-status');
  status.hidden=false;status.className='status';status.textContent='Сохраняю…';
  try{await eventRaw('set_source_url',{event_id:eventId,source_url:input.value.trim()});status.textContent='Ссылка сохранена';await loadEventDetail(eventId)}catch(err){status.className='status error';status.textContent=err.message}
}

async function finishEvent(eventId,title){
  if(!confirm(`Завершить «${title}»? Событие перейдёт в Хронику.`))return;
  try{await eventRaw('finish_event',{event_id:eventId});stopChatPolling();await loadEvents();if(window.loadChronicle)await window.loadChronicle();activeEventId=null;openView('chronicle')}catch(err){alert(err.message)}
}

async function deleteEvent(eventId,title){
  if(!confirm(`Удалить «${title}» без возможности восстановления?`))return;
  try{await eventRaw('delete_event',{event_id:eventId});stopChatPolling();activeEventId=null;await loadEvents();if(window.loadChronicle)await window.loadChronicle();openView(eventReturnView==='chronicle'?'chronicle':'calendar')}catch(err){alert(err.message)}
}

async function prepareCover(file){
  if(!file)throw new Error('Файл не выбран');
  const bitmap=await createImageBitmap(file);const max=1600;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не удалось подготовить изображение')),'image/jpeg',0.84));
  if(blob.size>5*1024*1024)throw new Error('Изображение слишком большое');
  const buffer=await blob.arrayBuffer();let binary='';const bytes=new Uint8Array(buffer);const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return {base64:btoa(binary),content_type:'image/jpeg'};
}

async function uploadEventCover(eventId,file){
  const status=document.querySelector('#cover-upload-status');if(!file)return;status.hidden=false;status.textContent='Готовлю изображение…';
  try{const prepared=await prepareCover(file);status.textContent='Загружаю…';await eventRaw('upload_cover',{event_id:eventId,...prepared});await loadEventDetail(eventId);await loadEvents()}catch(err){status.hidden=false;status.textContent=err.message}
}

async function createEventInviteLink(eventId,title){
  const box=document.querySelector('#event-invite-box');box.innerHTML='<p class="muted">Создаю ссылку…</p>';
  try{
    const data=await api('create_invite_link',{event_id:eventId});const url=data.invite_url;
    box.innerHTML=`<input class="inviteUrl" value="${eventEsc(url)}" readonly><div class="eventActions" style="margin-top:8px"><button class="repeat" id="detail-copy-invite">Копировать</button><button class="primary" id="detail-share-invite">Поделиться</button></div>`;
    document.querySelector('#detail-copy-invite').onclick=async()=>{await navigator.clipboard.writeText(url);document.querySelector('#detail-copy-invite').textContent='Скопировано ✓'};
    document.querySelector('#detail-share-invite').onclick=async()=>{if(navigator.share){try{await navigator.share({title:`Вместе · ${title}`,text:`Приглашаю тебя на «${title}»`,url})}catch{}}else{await navigator.clipboard.writeText(url);alert('Ссылка скопирована')}};
  }catch(err){box.innerHTML=`<div class="status error">${eventEsc(err.message)}</div>`}
}

function stopChatPolling(){if(eventChatTimer){clearInterval(eventChatTimer);eventChatTimer=null}}
function startChatPolling(eventId){stopChatPolling();eventChatTimer=setInterval(()=>{if(activeEventId===eventId&&document.querySelector('[data-view="event"].active'))loadEventMessages(eventId)},5000)}
async function loadEventMessages(eventId){
  const root=document.querySelector('#chat-messages');if(!root)return;
  try{const data=await eventRaw('list_messages',{event_id:eventId});const messages=data.messages||[];root.innerHTML=messages.length?messages.map(m=>`<div class="message${m.mine?' mine':''}"><b>${eventEsc(m.display_name)}</b><p>${eventEsc(m.body)}</p><time>${new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(new Date(m.created_at))}</time></div>`).join(''):'<p class="muted">Пока никто ничего не написал.</p>';root.scrollTop=root.scrollHeight}catch(err){root.innerHTML=`<p class="muted">${eventEsc(err.message)}</p>`}
}
