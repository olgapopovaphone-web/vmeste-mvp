(function(){
  const INVITE_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-invite-api';

  async function inviteRaw(action,payload={},retry=true){
    const headers={'Content-Type':'application/json'};
    if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
    const r=await fetch(INVITE_API,{method:'POST',headers,body:JSON.stringify({action,...payload})});
    let data={};try{data=await r.json()}catch{data={error:'Некорректный ответ сервера'}}
    if(r.status===401&&retry&&await refreshSession())return inviteRaw(action,payload,false);
    if(!r.ok)throw new Error(data.error||'Ошибка запроса');
    return data;
  }

  function managementMarkup(data){
    const ev=data.event;
    const finished=ev.status==='finished';
    if(finished){
      return `<div class="eventManageBlock"><span class="eventInfoLabel">СОБЫТИЕ</span><p class="muted">Событие завершено и находится в Хронике.</p><button class="deleteEvent" id="delete-event">Удалить событие</button></div>`;
    }
    const open=!!ev.participant_invites_enabled;
    return `
      <div class="eventManageBlock">
        <span class="eventInfoLabel">ГРУППА УЧАСТНИКОВ</span>
        <div class="eventGroupModes">
          <button type="button" class="eventGroupMode ${!open?'active':''}" data-group-mode="closed" aria-pressed="${!open}">
            <span class="eventGroupRadio"></span><span><strong>Закрытая</strong><small>Только вы можете приглашать людей</small></span>
          </button>
          <button type="button" class="eventGroupMode ${open?'active':''}" data-group-mode="open" aria-pressed="${open}">
            <span class="eventGroupRadio"></span><span><strong>Открытая</strong><small>Участники тоже могут приглашать друзей</small></span>
          </button>
        </div>
        <p class="eventManageNote">Событие всё равно остаётся личным и не появляется в Афише. При переключении в закрытую группу прежняя ссылка приглашения перестанет работать.</p>
        <div id="event-group-mode-status" class="status" hidden></div>
      </div>
      <div class="eventManageBlock eventLifecycleBlock">
        <span class="eventInfoLabel">СОБЫТИЕ</span>
        <button class="finishEvent" id="finish-event">Завершить событие</button>
        <p class="eventManageNote">Событие перейдёт в Хронику, приглашения перестанут работать, чат останется только для чтения.</p>
        <button class="deleteEvent" id="delete-event">Удалить событие</button>
      </div>`;
  }

  function quickInviteMarkup(url,title){
    return `<div class="eventQuickInvite"><span class="eventInfoLabel">ССЫЛКА-ПРИГЛАШЕНИЕ</span><p>Отправьте её человеку, которого хотите позвать.</p><input class="eventQuickInviteUrl" value="${eventEsc(url)}" readonly><div class="eventQuickInviteActions"><button type="button" class="eventQuickCopy">Копировать</button><button type="button" class="eventQuickShare">Поделиться</button></div><button type="button" class="eventQuickClose">Закрыть</button><div class="eventQuickInviteStatus" hidden></div></div>`;
  }

  async function openInvite(data){
    const box=document.querySelector('#event-invite-box-quick');
    if(!box)return;
    box.innerHTML='<div class="eventQuickInvite eventQuickInviteLoading">Создаю ссылку…</div>';
    try{
      const result=await inviteRaw('create_invite_link',{event_id:data.event.id});
      const url=result.invite_url;
      box.innerHTML=quickInviteMarkup(url,data.event.title);
      const status=box.querySelector('.eventQuickInviteStatus');
      box.querySelector('.eventQuickCopy').onclick=async()=>{
        try{await navigator.clipboard.writeText(url);status.hidden=false;status.textContent='Ссылка скопирована'}catch{const input=box.querySelector('.eventQuickInviteUrl');input.select();document.execCommand('copy');status.hidden=false;status.textContent='Ссылка скопирована'}
      };
      box.querySelector('.eventQuickShare').onclick=async()=>{
        if(navigator.share){try{await navigator.share({title:data.event.title,text:`Приглашаю тебя на «${data.event.title}» во «Вместе»`,url})}catch{}}
        else{try{await navigator.clipboard.writeText(url);status.hidden=false;status.textContent='Ссылка скопирована'}catch{}}
      };
      box.querySelector('.eventQuickClose').onclick=()=>{box.innerHTML=''};
      box.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(err){box.innerHTML=`<div class="status error">${eventEsc(err.message)}</div>`}
  }

  function bindInvitePlus(data){
    const active=!['finished','cancelled'].includes(data.event.status);
    const stack=document.querySelector('.eventAvatarStack');
    let plus=document.querySelector('#event-invite-plus');
    if(data.can_invite&&active&&!plus&&stack){
      stack.insertAdjacentHTML('afterbegin','<button class="eventInviteCircle" id="event-invite-plus" aria-label="Пригласить">＋</button>');
      plus=document.querySelector('#event-invite-plus');
    }
    if(plus){
      const clean=plus.cloneNode(true);plus.replaceWith(clean);clean.onclick=()=>openInvite(data);
    }
    const organizer=document.querySelector('#event-organizer-invite');
    if(organizer)organizer.onclick=()=>openInvite(data);
  }

  function bindManagement(data){
    if(!data.is_creator)return;
    const panel=document.querySelector('[data-event-panel="management"]');
    if(!panel)return;
    panel.innerHTML=managementMarkup(data);
    panel.querySelectorAll('[data-group-mode]').forEach(btn=>btn.onclick=async()=>{
      const enabled=btn.dataset.groupMode==='open';
      if(enabled===!!data.event.participant_invites_enabled)return;
      const status=panel.querySelector('#event-group-mode-status');
      panel.querySelectorAll('[data-group-mode]').forEach(x=>x.disabled=true);
      status.hidden=false;status.className='status';status.textContent='Сохраняю…';
      try{
        await eventRaw('set_invite_mode',{event_id:data.event.id,enabled});
        await loadEventDetail(data.event.id);
        const management=document.querySelector('[data-event-toggle="management"]');
        if(management){management.click();const s=document.querySelector('#event-group-mode-status');if(s){s.hidden=false;s.textContent=enabled?'Группа открыта для приглашений участников':'Группа закрыта. Старые ссылки отозваны.'}}
      }catch(err){status.className='status error';status.textContent=err.message;panel.querySelectorAll('[data-group-mode]').forEach(x=>x.disabled=false)}
    });
    const finish=panel.querySelector('#finish-event');if(finish)finish.onclick=()=>finishEvent(data.event.id,data.event.title);
    const del=panel.querySelector('#delete-event');if(del)del.onclick=()=>deleteEvent(data.event.id,data.event.title);
  }

  const baseRender=window.renderEventDetail;
  if(typeof baseRender==='function'){
    window.renderEventDetail=function(data){
      baseRender(data);
      bindManagement(data);
      bindInvitePlus(data);
    };
  }
})();
