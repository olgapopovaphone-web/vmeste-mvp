(function(){
  function shortWhen(value){
    return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(value)).replace(' в ', ', ');
  }

  function goingPeople(data){
    const creator={...(data.creator||{}),status:'creator'};
    const going=(data.participants||[]).filter(p=>p.status==='going');
    return [creator,...going];
  }

  function compactAvatar(person){
    const name=person.display_name||'Участник';
    if(person.avatar_url)return `<span class="eventMiniAvatar"><img src="${eventEsc(person.avatar_url)}" alt="${eventEsc(name)}"></span>`;
    return `<span class="eventMiniAvatar eventMiniAvatarFallback">${eventEsc(name.trim().slice(0,1).toUpperCase()||'У')}</span>`;
  }

  function participantsStrip(data){
    const people=goingPeople(data);
    const preview=people.slice(0,5);
    const extra=Math.max(0,people.length-preview.length);
    return `<div class="eventPeopleStrip">
      <div class="eventAvatarStack">
        ${data.is_creator&&!['finished','cancelled'].includes(data.event.status)?'<button class="eventInviteCircle" id="event-invite-plus" aria-label="Пригласить">＋</button>':''}
        ${preview.map(compactAvatar).join('')}
        ${extra?`<button class="eventMorePeople" id="event-more-people">+${extra}</button>`:''}
      </div>
      <button class="eventGoingCount" id="event-going-count"><span class="eventPeopleIcon">●●</span><b>${people.length}</b> ${people.length===1?'идёт':'идут'}</button>
    </div>`;
  }

  function participantSheetHtml(data){
    const people=[{...(data.creator||{}),status:'creator'},...(data.participants||[])];
    const rows=people.map(p=>`<div class="eventPeopleRow">${compactAvatar(p)}<div><strong>${eventEsc(p.display_name||'Участник')}</strong><small>${p.status==='creator'?'Организатор':p.status==='going'?'Я иду':'Не сможет'}</small></div></div>`).join('');
    return `<div class="eventPeopleOverlay" id="event-people-overlay"><div class="eventPeopleSheet"><div class="eventPeopleSheetHead"><div><span class="ey">УЧАСТНИКИ</span><h2>Кто будет</h2></div><button id="event-people-close">×</button></div><div class="eventPeopleRows">${rows}</div></div></div>`;
  }

  function detailsPanel(data){
    const ev=data.event;
    const source=data.is_creator&&!['finished','cancelled'].includes(ev.status)
      ? `<div class="eventDetailBlock"><span class="eventInfoLabel">ССЫЛКА НА МЕРОПРИЯТИЕ</span><div class="eventSourceEdit"><input id="event-source-edit" type="url" value="${eventEsc(ev.source_url||'')}" placeholder="https://..."><button id="event-source-save">Сохранить</button></div><div id="event-source-status" class="status" hidden></div>${ev.source_url?`<a class="eventDetailExternal" href="${eventEsc(ev.source_url)}" target="_blank" rel="noopener">Открыть источник ↗</a>`:''}</div>`
      : ev.source_url?`<div class="eventDetailBlock"><span class="eventInfoLabel">ССЫЛКА НА МЕРОПРИЯТИЕ</span><a class="eventDetailExternal" href="${eventEsc(ev.source_url)}" target="_blank" rel="noopener">Открыть источник ↗</a></div>`:'';
    return `<div class="eventAccordionPanel" data-event-panel="details" hidden>
      ${ev.description?`<div class="eventDetailBlock"><span class="eventInfoLabel">О СОБЫТИИ</span><p>${eventEsc(ev.description)}</p></div>`:''}
      <div class="eventDetailGrid">
        <div><span class="eventInfoLabel">ОРГАНИЗАТОР</span><strong>${eventEsc(data.creator?.display_name||'Организатор')}</strong></div>
        <div><span class="eventInfoLabel">ДАТА И ВРЕМЯ</span><strong>${eventEsc(eventDateTime(ev.starts_at))}</strong></div>
        <div><span class="eventInfoLabel">МЕСТО</span><strong>${eventEsc(ev.location_name||'Не указано')}</strong></div>
      </div>${source}
    </div>`;
  }

  function chatPanel(data){
    if(data.can_read_chat){
      return `<div class="eventAccordionPanel" data-event-panel="chat" hidden><div class="chatBox eventNewChat"><div id="chat-messages" class="chatMessages"><p class="muted">Загружаю сообщения…</p></div>${data.can_chat?'<form id="chat-form" class="chatForm"><textarea id="chat-text" maxlength="2000" placeholder="Написать сообщение"></textarea><button>↑</button></form>':'<p class="eventHint">Событие завершено — чат сохранён только для чтения.</p>'}</div></div>`;
    }
    return `<div class="eventAccordionPanel" data-event-panel="chat" hidden><div class="chatLocked">Чат открывается после того, как приглашение принято.</div></div>`;
  }

  function managementPanel(data){
    if(!data.is_creator)return '';
    const ev=data.event;
    const finished=ev.status==='finished';
    return `<div class="eventAccordionPanel" data-event-panel="management" hidden>
      ${!finished?`<div class="eventManageBlock"><span class="eventInfoLabel">ПРИГЛАШЕНИЕ</span><button class="eventManagePrimary" id="event-invite-link">Получить ссылку-приглашение</button><div id="event-invite-box" class="inviteBox"></div></div>`:''}
      <div class="eventManageBlock"><span class="eventInfoLabel">СОБЫТИЕ</span>${finished?'<p class="muted">Событие завершено и находится в Хронике.</p>':'<button class="finishEvent" id="finish-event">Завершить событие</button>'}<button class="deleteEvent" id="delete-event">Удалить событие</button></div>
    </div>`;
  }

  function accordionRows(data){
    return `<div class="eventAccordion">
      <button class="eventAccordionRow" data-event-toggle="details"><span class="eventRowIcon eventRowInfo">i</span><span>Детали</span><b>›</b></button>${detailsPanel(data)}
      <button class="eventAccordionRow" data-event-toggle="chat"><span class="eventRowIcon eventRowChat">•••</span><span>Чат</span><b>›</b></button>${chatPanel(data)}
      ${data.is_creator?`<button class="eventAccordionRow" data-event-toggle="management"><span class="eventRowIcon eventRowManage">⚙</span><span>Управление</span><b>›</b></button>${managementPanel(data)}`:''}
    </div>`;
  }

  async function bindTopPreferences(eventId){
    const like=document.querySelector('#event-hero-like');
    const compare=document.querySelector('#event-hero-compare');
    if(!like||!compare||typeof prefRaw!=='function')return;
    try{
      const state=await prefRaw('state',{event_id:eventId});
      like.classList.toggle('active',!!state.liked);
      like.innerHTML=state.liked?'♥':'♡';
      compare.classList.toggle('active',!!state.compared);
    }catch{}
    like.onclick=async()=>{
      like.disabled=true;
      try{const r=await prefRaw('toggle_like',{event_id:eventId});like.classList.toggle('active',r.liked);like.innerHTML=r.liked?'♥':'♡'}catch(err){alert(err.message)}finally{like.disabled=false}
    };
    compare.onclick=async()=>{
      compare.disabled=true;
      try{const r=await prefRaw('toggle_compare',{event_id:eventId});compare.classList.toggle('active',r.compared);if(r.compare_count>=2&&typeof openComparison==='function')openComparison()}catch(err){alert(err.message)}finally{compare.disabled=false}
    };
  }

  function bindRedesignedEvent(data){
    document.querySelector('.eventHeroBack')?.addEventListener('click',closeEventView);
    document.querySelectorAll('[data-event-toggle]').forEach(btn=>btn.onclick=()=>{
      const name=btn.dataset.eventToggle;
      const panel=document.querySelector(`[data-event-panel="${name}"]`);
      if(!panel)return;
      const willOpen=panel.hidden;
      document.querySelectorAll('.eventAccordionPanel').forEach(p=>p.hidden=true);
      document.querySelectorAll('.eventAccordionRow').forEach(r=>r.classList.remove('open'));
      if(willOpen){panel.hidden=false;btn.classList.add('open');setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'nearest'}),20)}
    });
    const openPeople=()=>{
      document.querySelector('#event-people-overlay')?.remove();
      document.body.insertAdjacentHTML('beforeend',participantSheetHtml(data));
      const overlay=document.querySelector('#event-people-overlay');
      overlay.querySelector('#event-people-close').onclick=()=>overlay.remove();
      overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
    };
    document.querySelector('#event-going-count')?.addEventListener('click',openPeople);
    document.querySelector('#event-more-people')?.addEventListener('click',openPeople);
    document.querySelector('#event-invite-plus')?.addEventListener('click',()=>{
      const management=document.querySelector('[data-event-toggle="management"]');
      const panel=document.querySelector('[data-event-panel="management"]');
      if(management&&panel){document.querySelectorAll('.eventAccordionPanel').forEach(p=>p.hidden=true);panel.hidden=false;management.classList.add('open');}
      const invite=document.querySelector('#event-invite-link');if(invite)invite.click();
    });
    bindTopPreferences(data.event.id);
  }

  window.renderEventDetail=function(data){
    const root=document.querySelector('#event-detail-root');if(!root)return;
    const ev=data.event;
    const finished=ev.status==='finished';
    const cover=ev.cover_url?`<img src="${eventEsc(ev.cover_url)}" alt="Обложка события">`:`<div class="eventHeroPlaceholder"><span>${eventEsc(ev.title||'Вместе')}</span></div>`;
    const upload=data.is_creator&&!finished?`<input type="file" id="event-cover-input" accept="image/jpeg,image/png,image/webp" hidden><button class="eventCoverChange" id="event-cover-button" aria-label="Сменить обложку">＋ фото</button><div class="coverUploadStatus" id="cover-upload-status" hidden></div>`:'';
    const rsvp=!data.is_creator&&!finished?`<div class="eventDecision"><button data-rsvp="going" class="eventYes ${data.my_status==='going'?'active':''}"><span>✓</span>Я иду</button><button data-rsvp="declined" class="eventNo ${data.my_status==='declined'?'active':''}"><span>×</span>Не смогу</button></div>`:'';
    const organizerState=data.is_creator&&!finished?`<div class="eventOrganizerState"><span>Вы организатор</span><button id="event-organizer-invite">Пригласить</button></div>`:'';
    root.innerHTML=`
      <div class="eventHero">
        ${cover}
        <button class="eventHeroCircle eventHeroBack" aria-label="Назад">‹</button>
        <div class="eventHeroActions"><button class="eventHeroCircle" id="event-hero-like" aria-label="Нравится">♡</button><button class="eventHeroCircle" id="event-hero-compare" aria-label="Сравнить">⇄</button></div>
        ${upload}
      </div>
      <div class="eventMainCard">
        ${finished?'<div class="eventFinishedBadge">ЗАВЕРШЕНО</div>':''}
        <h1 class="eventDetailTitle">${eventEsc(ev.title)}</h1>
        <div class="eventPrimaryMeta"><span><i>◷</i>${eventEsc(shortWhen(ev.starts_at))}</span><span><i>⌖</i>${eventEsc(ev.location_name||'Место не указано')}</span></div>
        ${participantsStrip(data)}
        ${rsvp}${organizerState}
        <div id="event-invite-box-quick"></div>
      </div>
      ${accordionRows(data)}
    `;
    bindEventDetail(data);
    bindRedesignedEvent(data);
    const organizerInvite=document.querySelector('#event-organizer-invite');if(organizerInvite)organizerInvite.onclick=()=>document.querySelector('#event-invite-plus')?.click();
  };
})();
