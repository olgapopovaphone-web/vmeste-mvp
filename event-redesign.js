(function(){
  function eventDateParts(value){
    const d=new Date(value);
    return {
      main:new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'Europe/Moscow'}).format(d),
      week:new Intl.DateTimeFormat('ru-RU',{weekday:'short',timeZone:'Europe/Moscow'}).format(d).replace('.',''),
      time:new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(d)
    };
  }
  function eventTimeRange(ev){
    const s=eventDateParts(ev.starts_at);
    let text=`${s.week}, ${s.time}`;
    if(ev.ends_at){
      const e=eventDateParts(ev.ends_at);
      if(new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(ev.starts_at))===new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(ev.ends_at))) text+=` – ${e.time}`;
    }
    return text;
  }
  function heroSubtitle(ev){
    const s=(ev.description||'').trim();
    if(!s)return ev.location_name||'Время быть вместе';
    return s.length>92?s.slice(0,89).trim()+'…':s;
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
    const preview=people.slice(0,4);
    const extra=Math.max(0,people.length-preview.length);
    const canInvite=data.can_invite&&!['finished','cancelled'].includes(data.event.status);
    return `<div class="eventPeopleStrip">
      <div class="eventInviteGroup">
        ${canInvite?'<div class="eventInviteUnit"><button class="eventInviteCircle" id="event-invite-plus" aria-label="Пригласить">＋</button><small>Пригласить</small></div>':''}
        <div class="eventAvatarStack">
          ${preview.map(compactAvatar).join('')}
          ${extra?`<button class="eventMorePeople" id="event-more-people">+${extra}</button>`:''}
        </div>
      </div>
      <button class="eventGoingCount" id="event-going-count"><span>${people.length} ${people.length===1?'идёт':'идут'}</span><b>›</b></button>
    </div>`;
  }
  function participantSheetHtml(data){
    const people=[{...(data.creator||{}),status:'creator'},...(data.participants||[])];
    const rows=people.map(p=>`<div class="eventPeopleRow">${compactAvatar(p)}<div><strong>${eventEsc(p.display_name||'Участник')}</strong><small>${p.status==='creator'?'Организатор':p.status==='going'?'Идёт':'Не сможет'}</small></div></div>`).join('');
    return `<div class="eventPeopleOverlay" id="event-people-overlay"><div class="eventPeopleSheet"><div class="eventPeopleSheetHead"><div><span class="ey">УЧАСТНИКИ</span><h2>Кто будет</h2></div><button id="event-people-close">×</button></div><div class="eventPeopleRows">${rows}</div></div></div>`;
  }
  function placeValue(ev){
    if(ev.place_id)return `<button class="eventPlaceValue" data-event-place="${eventEsc(ev.place_id)}">${eventEsc(ev.location_name||'Место')} <b>›</b></button>`;
    return `<strong>${eventEsc(ev.location_name||'Место не указано')}</strong>`;
  }
  function detailsPanel(data){
    const ev=data.event;
    const active=!['finished','cancelled'].includes(ev.status);
    const locationBlock=data.is_creator&&active
      ? `<div class="eventDetailBlock"><span class="eventInfoLabel">ССЫЛКА НА КАРТУ</span><div class="eventSourceEdit"><input id="event-location-edit" type="url" value="${eventEsc(ev.location_url||'')}" placeholder="https://yandex.ru/maps/..."><button id="event-location-save">Сохранить</button></div><div id="event-location-status" class="status" hidden></div>${ev.location_url?`<a class="eventDetailExternal" href="${eventEsc(ev.location_url)}" target="_blank" rel="noopener">Открыть на карте ↗</a>`:''}</div>`
      : ev.location_url?`<div class="eventDetailBlock"><a class="eventDetailExternal" href="${eventEsc(ev.location_url)}" target="_blank" rel="noopener">Открыть на карте ↗</a></div>`:'';
    const sourceBlock=ev.source_url?`<div class="eventDetailBlock"><span class="eventInfoLabel">ИСТОЧНИК</span><a class="eventDetailExternal" href="${eventEsc(ev.source_url)}" target="_blank" rel="noopener">Источник мероприятия ↗</a></div>`:'';
    return `<div class="eventAccordionPanel" data-event-panel="details" hidden>
      <div class="eventDetailGrid">
        <div><span class="eventInfoLabel">ОРГАНИЗАТОР</span><strong>${eventEsc(data.creator?.display_name||'Организатор')}</strong></div>
        <div><span class="eventInfoLabel">ДАТА И ВРЕМЯ</span><strong>${eventEsc(eventDateTime(ev.starts_at))}</strong></div>
        <div><span class="eventInfoLabel">МЕСТО</span>${placeValue(ev)}</div>
      </div>${locationBlock}${sourceBlock}
    </div>`;
  }
  function chatPanel(data){
    if(data.can_read_chat){
      return `<div class="eventAccordionPanel" data-event-panel="chat" hidden><div class="chatBox eventNewChat"><div id="chat-messages" class="chatMessages"><p class="muted">Загружаю сообщения…</p></div>${data.can_chat?'<form id="chat-form" class="chatForm"><textarea id="chat-text" maxlength="2000" placeholder="Написать сообщение"></textarea><button>↑</button></form>':'<p class="eventHint">Событие завершено — чат сохранён только для чтения.</p>'}</div></div>`;
    }
    return `<div class="eventAccordionPanel" data-event-panel="chat" hidden><div class="chatLocked">Чат откроется после принятия приглашения.</div></div>`;
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
    const chatNote=data.can_read_chat?'Перейти к разговору':'После принятия приглашения';
    return `<div class="eventAccordion">
      <button class="eventAccordionRow" data-event-toggle="details"><span class="eventRowIcon eventRowInfo">i</span><span><strong>Детали</strong><small>Дата, место и информация</small></span><b>›</b></button>${detailsPanel(data)}
      <button class="eventAccordionRow" data-event-toggle="chat"><span class="eventRowIcon eventRowChat">•••</span><span><strong>Чат</strong><small>${chatNote}</small></span><b>›</b></button>${chatPanel(data)}
      ${data.is_creator?`<button class="eventAccordionRow" data-event-toggle="management"><span class="eventRowIcon eventRowManage">≛</span><span><strong>Управление</strong><small>Для организатора</small></span><b>›</b></button>${managementPanel(data)}`:''}
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
      if(management&&panel){document.querySelectorAll('.eventAccordionPanel').forEach(p=>p.hidden=true);document.querySelectorAll('.eventAccordionRow').forEach(r=>r.classList.remove('open'));panel.hidden=false;management.classList.add('open');}
      const invite=document.querySelector('#event-invite-link');if(invite)invite.click();
    });
    document.querySelectorAll('[data-event-place]').forEach(btn=>btn.onclick=()=>{if(window.openPlaceView)window.openPlaceView(btn.dataset.eventPlace,{returnToEvent:data.event.id})});
    const more=document.querySelector('#event-description-more');
    if(more)more.onclick=()=>{const p=document.querySelector('.eventDescriptionText');const expanded=p.classList.toggle('expanded');more.textContent=expanded?'Свернуть':'Ещё';};
    const locationSave=document.querySelector('#event-location-save');
    if(locationSave)locationSave.onclick=async()=>{
      const input=document.querySelector('#event-location-edit');const status=document.querySelector('#event-location-status');
      status.hidden=false;status.className='status';status.textContent='Сохраняю…';
      try{await eventRaw('set_location_url',{event_id:data.event.id,location_url:input.value.trim()});status.textContent='Ссылка на место сохранена';await loadEventDetail(data.event.id)}catch(err){status.className='status error';status.textContent=err.message}
    };
    bindTopPreferences(data.event.id);
  }
  window.renderEventDetail=function(data){
    const root=document.querySelector('#event-detail-root');if(!root)return;
    const ev=data.event;
    const finished=ev.status==='finished';
    const date=eventDateParts(ev.starts_at);
    const cover=ev.cover_url?`<img src="${eventEsc(ev.cover_url)}" alt="Обложка события">`:`<div class="eventHeroPlaceholder"><span>${eventEsc(ev.title||'Вместе')}</span></div>`;
    const upload=data.is_creator&&!finished?`<input type="file" id="event-cover-input" accept="image/jpeg,image/png,image/webp" hidden><button class="eventCoverChange" id="event-cover-button" aria-label="Сменить обложку">＋ фото</button><div class="coverUploadStatus" id="cover-upload-status" hidden></div>`:'';
    const rsvp=!data.is_creator&&!finished?`<div class="eventDecision"><button data-rsvp="going" class="eventYes ${data.my_status==='going'?'active':''}"><span>✓</span>Я пойду</button><button data-rsvp="declined" class="eventNo ${data.my_status==='declined'?'active':''}">Не смогу</button></div>`:'';
    const organizerState=data.is_creator&&!finished?`<div class="eventOrganizerState">Вы организатор этого события</div>`:'';
    const description=ev.description?`<div class="eventDescription"><p class="eventDescriptionText">${eventEsc(ev.description)}</p><button id="event-description-more">Ещё</button></div>`:'';
    root.innerHTML=`
      <div class="eventHero">
        ${cover}
        <button class="eventHeroCircle eventHeroBack" aria-label="Назад">‹</button>
        <div class="eventHeroActions"><button class="eventHeroCircle" id="event-hero-like" aria-label="Нравится">♡</button><button class="eventHeroCircle" id="event-hero-compare" aria-label="Сравнить">▣</button></div>
        ${upload}
        <div class="eventHeroCopy">
          <span class="eventHeroEy">СОБЫТИЕ · ЛЮДИ · ГОРОД</span>
          <h1>${eventEsc(ev.title)}</h1>
          <p>${eventEsc(heroSubtitle(ev))}</p>
        </div>
        <div class="eventGalleryCount">1/1</div><div class="eventGalleryDots"><i class="active"></i></div>
      </div>
      <div class="eventContent">
        ${finished?'<div class="eventFinishedBadge">ЗАВЕРШЕНО</div>':''}
        <div class="eventFacts">
          <div class="eventFact"><span class="eventFactIcon">□</span><div><strong>${eventEsc(date.main)}</strong><small>${eventEsc(eventTimeRange(ev))}</small></div></div>
          <div class="eventFact"><span class="eventFactIcon">⌖</span><div>${ev.place_id?`<button class="eventFactPlace" data-event-place="${eventEsc(ev.place_id)}">${eventEsc(ev.location_name||'Место')} <b>›</b></button>`:`<strong>${eventEsc(ev.location_name||'Место не указано')}</strong>`}<small>${eventEsc(ev.address||'')}</small></div></div>
        </div>
        ${participantsStrip(data)}
        ${rsvp}${organizerState}
        ${description}
        <div id="event-invite-box-quick"></div>
        ${accordionRows(data)}
      </div>
    `;
    bindEventDetail(data);
    bindRedesignedEvent(data);
  };
})();
