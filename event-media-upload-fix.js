(function(){
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-event-media-api';
  var MAX_SIZE=50*1024*1024;
  var ALLOWED=['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm','video/x-m4v'];

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function token(){try{var s=JSON.parse(localStorage.getItem('vmeste_session_v1')||'null');return s&&s.access_token||''}catch(e){return''}}
  async function call(action,payload,retry){
    var t=token();if(!t)throw new Error('Требуется вход в аккаунт');
    var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}
    if(r.status===401&&retry!==false&&typeof refreshSession==='function'&&await refreshSession())return call(action,payload,false);
    if(!r.ok)throw new Error(d.error||'Ошибка запроса');return d
  }
  function queueRow(queue,index,file){
    var row=document.createElement('div');row.className='eventMediaUploadRow';row.dataset.uploadIndex=index;
    row.innerHTML='<div class="eventMediaUploadCopy"><strong>'+esc(file.name||'Файл')+'</strong><small>Подготовка…</small></div><div class="eventMediaProgress"><i></i></div>';
    queue.appendChild(row);return row
  }
  function rowStatus(row,text,pct,state){
    var small=row.querySelector('small'),bar=row.querySelector('i');if(small)small.textContent=text;
    if(bar&&pct!=null)bar.style.width=Math.max(0,Math.min(100,pct))+'%';
    row.classList.toggle('error',state==='error');row.classList.toggle('done',state==='done')
  }
  async function meta(file){
    var out={width:null,height:null,duration_seconds:null,captured_at:file.lastModified?new Date(file.lastModified).toISOString():null};
    try{
      if(file.type.indexOf('image/')===0&&typeof createImageBitmap==='function'){
        var bm=await createImageBitmap(file);out.width=bm.width;out.height=bm.height;bm.close();return out
      }
      if(file.type.indexOf('video/')===0){
        await new Promise(function(resolve){
          var v=document.createElement('video'),url=URL.createObjectURL(file),done=function(){URL.revokeObjectURL(url);resolve()};
          v.preload='metadata';v.onloadedmetadata=function(){out.width=v.videoWidth||null;out.height=v.videoHeight||null;out.duration_seconds=Number.isFinite(v.duration)?v.duration:null;done()};v.onerror=done;v.src=url
        })
      }
    }catch(e){}
    return out
  }
  function signedUpload(file,spec,row){
    return new Promise(function(resolve,reject){
      var xhr=new XMLHttpRequest();
      var url=spec.signed_url;
      if(!url){reject(new Error('Не получен адрес загрузки'));return}
      var form=new FormData();
      form.append('cacheControl','3600');
      form.append('',file,file.name||'file');
      xhr.open('PUT',url,true);
      xhr.setRequestHeader('x-upsert','false');
      xhr.upload.onprogress=function(e){if(e.lengthComputable){var p=e.total?e.loaded/e.total*100:0;rowStatus(row,'Загрузка · '+Math.round(p)+'%',p)}};
      xhr.onerror=function(){reject(new Error('Не удалось загрузить файл. Проверьте соединение.'))};
      xhr.onabort=function(){reject(new Error('Загрузка отменена'))};
      xhr.onload=function(){
        if(xhr.status>=200&&xhr.status<300){rowStatus(row,'Сохраняю…',100);resolve();return}
        var msg='Ошибка загрузки';
        try{var d=JSON.parse(xhr.responseText||'{}');msg=d.message||d.error||msg}catch(e){if(xhr.responseText)msg=xhr.responseText.slice(0,180)}
        reject(new Error(msg))
      };
      xhr.send(form)
    })
  }
  async function uploadFiles(eventId,files,section){
    var bad=files.find(function(f){return !ALLOWED.includes(String(f.type||'').toLowerCase())||f.size>MAX_SIZE||!f.size});
    if(bad){alert(bad.size>MAX_SIZE?'Файл «'+bad.name+'» больше 50 МБ.':'Формат «'+bad.name+'» пока не поддерживается.');return}
    if(files.length>50){alert('За один раз можно выбрать до 50 файлов. Можно добавить следующую пачку сразу после загрузки.');return}
    var queue=section.querySelector('.eventMediaUploadQueue');if(!queue)return;
    queue.hidden=false;queue.innerHTML='';
    var rows=files.map(function(file,i){return queueRow(queue,i,file)}),prepared;
    try{prepared=await call('prepare_upload',{event_id:eventId,files:files.map(function(f){return{name:f.name,type:f.type,size:f.size}})})}
    catch(e){queue.innerHTML='<div class="eventMediaUploadError">'+esc(e.message)+'</div>';return}
    var next=0,failed=0;
    async function worker(){
      while(next<files.length){
        var i=next++,file=files[i],spec=prepared.uploads&&prepared.uploads[i],row=rows[i];
        try{
          if(!spec)throw new Error('Не удалось подготовить файл');
          var m=await meta(file);
          await signedUpload(file,spec,row);
          await call('complete_upload',{event_id:eventId,storage_path:spec.path,mime_type:file.type,file_size:file.size,width:m.width,height:m.height,duration_seconds:m.duration_seconds,captured_at:m.captured_at});
          rowStatus(row,'Готово',100,'done')
        }catch(e){failed++;rowStatus(row,e&&e.message?e.message:'Ошибка загрузки',null,'error')}
      }
    }
    await Promise.all([worker(),worker()]);
    if(!failed)setTimeout(function(){if(queue)queue.hidden=true},700);
    if(typeof window.loadEventDetail==='function'){
      try{await window.loadEventDetail(eventId);return}catch(e){}
    }
    if(typeof window.loadChronicleV2==='function')window.loadChronicleV2()
  }

  document.addEventListener('change',function(e){
    var input=e.target&&e.target.closest&&e.target.closest('.eventMediaInput');if(!input)return;
    var section=input.closest('.eventMediaSection');if(!section)return;
    e.preventDefault();e.stopImmediatePropagation();
    var files=[].slice.call(input.files||[]),eventId=section.dataset.eventMediaEvent;input.value='';
    if(files.length&&eventId)uploadFiles(eventId,files,section)
  },true)
})();
