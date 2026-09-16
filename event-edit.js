(function(){
  function dateTimeInputParts(value){
    if(!value)return{date:'',time:''};
    var parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
    var get=function(t){var p=parts.find(function(x){return x.type===t});return p?p.value:''};
    return{date:get('year')+'-'+get('month')+'-'+get('day'),time:get('hour')+':'+get('minute')};
  }

  function isoFromInputs(date,time){
    if(!date||!time)return'';
    var d=new Date(date+'T'+time+':00+03:00');
    return Number.isNaN(d.getTime())?'':d.toISOString();
  }

  function editBlockMarkup(){
    return '<div class="eventManageBlock eventEditProto" data-event-edit-block><span class="eventInfoLabel">РЕДАКТИРОВАНИЕ</span><button type="button" class="eventEditOpen" data-event-edit-open><span><strong>Редактировать событие</strong><small>Название, дата, время, место, ссылки и обложка</small></span><b>›</b></button></div>';
  }

  function editSheetMarkup(data){
    var ev=data.event,start=dateTimeInputParts(ev.starts_at),end=dateTimeInputParts(ev.ends_at);
    return '<div class="eventEditOverlay"><div class="eventEditSheet">'
      +'<div class="eventEditHead"><div><span class="ey">УПРАВЛЕНИЕ</span><h2>Редактировать событие</h2></div><button type="button" class="eventEditClose" aria-label="Закрыть">×</button></div>'
      +'<form class="eventEditForm">'
      +'<div class="eventEditCover" id="event-edit-cover"><button type="button" class="eventEditCoverButton" id="event-edit-cover-button">'+(ev.cover_url?'Сменить обложку':'Добавить обложку')+'</button><input type="file" id="event-edit-cover-input" accept="image/jpeg,image/png,image/webp" hidden></div>'
      +'<label>Название<input id="event-edit-title" required maxlength="160" value="'+eventEsc(ev.title||'')+'"></label>'
      +'<label>Описание<textarea id="event-edit-description" rows="3" maxlength="2000" placeholder="Что важно знать участникам">'+eventEsc(ev.description||'')+'</textarea></label>'
      +'<div class="eventEditPair"><label>Дата начала<input id="event-edit-start-date" type="date" required value="'+eventEsc(start.date)+'"></label><label>Начало<input id="event-edit-start-time" type="time" required value="'+eventEsc(start.time)+'"></label></div>'
      +'<div class="eventEditPair"><label>Дата окончания<input id="event-edit-end-date" type="date" required value="'+eventEsc(end.date||start.date)+'"></label><label>Окончание<input id="event-edit-end-time" type="time" required value="'+eventEsc(end.time)+'"></label></div>'
      +'<label>Место<input id="event-edit-place" maxlength="160" value="'+eventEsc(ev.location_name||'')+'" placeholder="Например, Султан спа"></label>'
      +'<label>Адрес<input id="event-edit-address" maxlength="240" value="'+eventEsc(ev.address||'')+'" placeholder="Адрес места"></label>'
      +'<label>Ссылка на место<input id="event-edit-location-url" type="url" value="'+eventEsc(ev.location_url||'')+'" placeholder="https://..."></label>'
      +'<label>Бронь / билеты / источник<input id="event-edit-source-url" type="url" value="'+eventEsc(ev.source_url||'')+'" placeholder="https://..."></label>'
      +'<div class="eventEditStatus" id="event-edit-status" hidden></div>'
      +'<button type="submit" class="eventEditSave">Сохранить изменения</button>'
      +'</form></div></div>';
  }

  function openEdit(data){
    document.querySelector('.eventEditOverlay')?.remove();
    document.body.insertAdjacentHTML('beforeend',editSheetMarkup(data));
    var overlay=document.querySelector('.eventEditOverlay');
    if(!overlay)return;
    var ev=data.event,cover=overlay.querySelector('#event-edit-cover'),coverInput=overlay.querySelector('#event-edit-cover-input'),previewUrl='';
    if(ev.cover_url){cover.style.backgroundImage='url("'+String(ev.cover_url).replace(/["\\]/g,'')+'")';cover.classList.add('has-cover')}
    function close(){if(previewUrl)URL.revokeObjectURL(previewUrl);overlay.remove()}
    overlay.querySelector('.eventEditClose').onclick=close;
    overlay.onclick=function(e){if(e.target===overlay)close()};
    overlay.querySelector('#event-edit-cover-button').onclick=function(){coverInput.click()};
    coverInput.onchange=function(){var file=coverInput.files&&coverInput.files[0];if(!file)return;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);cover.style.backgroundImage='url("'+previewUrl+'")';cover.classList.add('has-cover');overlay.querySelector('#event-edit-cover-button').textContent='Изменить фото'};
    overlay.querySelector('.eventEditForm').onsubmit=async function(e){
      e.preventDefault();
      var status=overlay.querySelector('#event-edit-status'),save=overlay.querySelector('.eventEditSave');
      var startsAt=isoFromInputs(overlay.querySelector('#event-edit-start-date').value,overlay.querySelector('#event-edit-start-time').value);
      var endsAt=isoFromInputs(overlay.querySelector('#event-edit-end-date').value,overlay.querySelector('#event-edit-end-time').value);
      status.hidden=false;status.className='eventEditStatus';status.textContent='Сохраняю…';save.disabled=true;
      try{
        await eventRaw('update_event',{
          event_id:ev.id,
          title:overlay.querySelector('#event-edit-title').value.trim(),
          description:overlay.querySelector('#event-edit-description').value.trim(),
          starts_at:startsAt,
          ends_at:endsAt,
          location_name:overlay.querySelector('#event-edit-place').value.trim(),
          address:overlay.querySelector('#event-edit-address').value.trim(),
          location_url:overlay.querySelector('#event-edit-location-url').value.trim(),
          source_url:overlay.querySelector('#event-edit-source-url').value.trim()
        });
        var file=coverInput.files&&coverInput.files[0];
        if(file){
          status.textContent='Загружаю обложку…';
          if(typeof prepareCover!=='function')throw new Error('Не удалось подготовить обложку');
          var prepared=await prepareCover(file);
          await eventRaw('upload_cover',Object.assign({event_id:ev.id},prepared));
        }
        if(previewUrl)URL.revokeObjectURL(previewUrl);
        overlay.remove();
        await loadEventDetail(ev.id);
        try{if(typeof loadEvents==='function')await loadEvents()}catch(x){}
        try{if(typeof refreshMyEvents==='function')await refreshMyEvents()}catch(x){}
      }catch(err){status.className='eventEditStatus error';status.textContent=err.message;save.disabled=false}
    };
  }

  function mount(data){
    if(!data||!data.is_creator||!data.event||['finished','cancelled'].includes(data.event.status))return;
    var panel=document.querySelector('[data-event-panel="management"]');
    if(!panel)return;
    panel.querySelector('[data-event-edit-block]')?.remove();
    panel.insertAdjacentHTML('afterbegin',editBlockMarkup());
    var button=panel.querySelector('[data-event-edit-open]');
    if(button)button.onclick=function(){openEdit(data)};
  }

  var base=window.renderEventDetail;
  if(typeof base==='function'){
    window.renderEventDetail=function(data){base(data);mount(data)};
  }
})();
