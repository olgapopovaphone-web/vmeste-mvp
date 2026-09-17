(function(){
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-event-media-api';
  var PROJECT='nmeoakrpafxhpdrplsuo';
  var BUCKET='event-media';
  var MAX_SIZE=50*1024*1024;
  var tusPromise=null;
  var current={eventId:null,data:null,items:[],counts:{total:0,images:0,videos:0}};

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function token(){try{var s=JSON.parse(localStorage.getItem('vmeste_session_v1')||'null');return s&&s.access_token||''}catch(e){return''}}
  async function call(action,payload,retry){var t=token();if(!t)throw new Error('Требуется вход в аккаунт');var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(Object.assign({action:action},payload||{}))});var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}if(r.status===401&&retry!==false&&typeof refreshSession==='function'&&await refreshSession())return call(action,payload,false);if(!r.ok)throw new Error(d.error||'Ошибка запроса');return d}
  function countLabel(c){var a=[];if(c.images)a.push(c.images+' фото');if(c.videos)a.push(c.videos+' видео');return a.join(' · ')}
  function duration(v){var n=Math.max(0,Math.round(Number(v)||0)),m=Math.floor(n/60),s=String(n%60).padStart(2,'0');return m+':'+s}
  function tus(){if(!tusPromise)tusPromise=import('https://unpkg.com/tus-js-client@4.3.1/lib.esm/browser/index.js');return tusPromise}

  function ensureSection(data){
    var root=document.getElementById('event-detail-root');if(!root)return null;
    root.classList.add('hasEventMedia');root.querySelector('.eventMediaSection')?.remove();
    var section=document.createElement('section');section.className='eventMediaSection';section.dataset.eventMediaEvent=data.event.id;
    section.innerHTML='<div class="eventMediaHead"><div><span class="ey">МЕДИАТЕКА СОБЫТИЯ</span><h3>Фото и видео</h3><p class="eventMediaCount">Загружаю…</p></div><button type="button" class="eventMediaAdd" hidden>＋ Добавить</button></div><input class="eventMediaInput" type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/x-m4v"><div class="eventMediaUploadQueue" hidden></div><div class="eventMediaGrid"><div class="eventMediaEmpty">Загружаю медиатеку…</div></div>';
    var content=root.querySelector('.eventContent'),accordion=content&&content.querySelector('.eventAccordion');
    if(accordion)accordion.insertAdjacentElement('beforebegin',section);else if(content)content.appendChild(section);else root.appendChild(section);
    section.querySelector('.eventMediaAdd').onclick=function(){section.querySelector('.eventMediaInput').click()};
    section.querySelector('.eventMediaInput').onchange=function(){var files=[].slice.call(this.files||[]);this.value='';if(files.length)uploadFiles(data.event.id,files,section)};
    return section
  }

  function updateHero(){
    var root=document.getElementById('event-detail-root');if(!root)return;var hero=root.querySelector('.eventHero');if(!hero)return;
    hero.querySelectorAll('.eventGalleryCount,.eventGalleryDots').forEach(function(x){x.hidden=true});
    var cover=current.items.find(function(x){return x.is_cover&&x.url});if(!cover)return;
    var img=hero.querySelector(':scope > img');if(img){img.src=cover.url;img.alt='Обложка события';img.removeAttribute('data-default-cover')}else{hero.querySelector('.eventHeroPlaceholder')?.remove();img=document.createElement('img');img.src=cover.url;img.alt='Обложка события';hero.insertBefore(img,hero.firstChild)}
  }

  function tile(item,index){var visual=item.media_type==='video'?'<video src="'+esc(item.url||'')+'" muted playsinline preload="metadata"></video><span class="eventMediaVideoBadge">▶ '+esc(duration(item.duration_seconds))+'</span>':'<img src="'+esc(item.url||'')+'" alt="" loading="lazy">';return '<button type="button" class="eventMediaTile" data-media-index="'+index+'" aria-label="Открыть '+(item.media_type==='video'?'видео':'фото')+'">'+visual+(item.is_cover?'<span class="eventMediaCoverBadge">Обложка</span>':'')+'</button>'}
  function render(section){
    if(!section)return;var count=section.querySelector('.eventMediaCount'),grid=section.querySelector('.eventMediaGrid'),add=section.querySelector('.eventMediaAdd');
    if(count)count.textContent=current.counts.total?countLabel(current.counts):'Общая медиатека участников';if(add)add.hidden=!(current.data&&current.data.can_upload);
    grid.innerHTML=current.items.length?current.items.map(tile).join(''):'<div class="eventMediaEmpty"><strong>Здесь пока нет фото и видео.</strong><span>Участники могут добавлять материалы во время события и после него.</span></div>';
    grid.querySelectorAll('[data-media-index]').forEach(function(b){b.onclick=function(){openViewer(Number(b.dataset.mediaIndex))}});updateHero()
  }
  async function load(eventId,section){try{var d=await call('list_media',{event_id:eventId});current={eventId:eventId,data:d,items:d.media||[],counts:d.counts||{total:0,images:0,videos:0}};render(section)}catch(e){var grid=section&&section.querySelector('.eventMediaGrid');if(grid)grid.innerHTML='<div class="eventMediaEmpty error">'+esc(e.message)+'</div>'}}

  async function meta(file){
    var out={width:null,height:null,duration_seconds:null,captured_at:file.lastModified?new Date(file.lastModified).toISOString():null};
    try{if(file.type.indexOf('image/')===0&&typeof createImageBitmap==='function'){var bm=await createImageBitmap(file);out.width=bm.width;out.height=bm.height;bm.close();return out}if(file.type.indexOf('video/')===0){await new Promise(function(resolve){var v=document.createElement('video'),url=URL.createObjectURL(file),done=function(){URL.revokeObjectURL(url);resolve()};v.preload='metadata';v.onloadedmetadata=function(){out.width=v.videoWidth||null;out.height=v.videoHeight||null;out.duration_seconds=Number.isFinite(v.duration)?v.duration:null;done()};v.onerror=done;v.src=url})}}catch(e){}return out
  }

  function queueRow(queue,index,file){
    var row=document.createElement('div');row.className='eventMediaUploadRow';row.dataset.uploadIndex=index;
    var preview='';if(file.type.indexOf('image/')===0){var u=URL.createObjectURL(file);row._previewUrl=u;preview='<img class="eventMediaUploadPreview" src="'+esc(u)+'" alt="">'}else if(file.type.indexOf('video/')===0)preview='<span class="eventMediaUploadPreview eventMediaUploadVideo">▶</span>';
    row.innerHTML=preview+'<div class="eventMediaUploadCopy"><strong>'+esc(file.name||'Файл')+'</strong><small>Подготовка…</small></div><div class="eventMediaProgress"><i></i></div>';queue.appendChild(row);return row
  }
  function cleanupRows(rows){rows.forEach(function(r){if(r._previewUrl){URL.revokeObjectURL(r._previewUrl);r._previewUrl=''}})}
  function rowStatus(row,text,pct,state){var small=row.querySelector('small'),bar=row.querySelector('i');if(small)small.textContent=text;if(bar&&pct!=null)bar.style.width=Math.max(0,Math.min(100,pct))+'%';row.classList.toggle('error',state==='error');row.classList.toggle('done',state==='done')}

  function uploadSigned(file,spec,row){
    return new Promise(function(resolve,reject){
      if(!spec||!spec.signed_url){reject(new Error('Не удалось подготовить загрузку'));return}
      var xhr=new XMLHttpRequest(),form=new FormData();
      form.append('cacheControl','3600');
      form.append('',file,file.name||'file');
      xhr.open('PUT',spec.signed_url,true);
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
    var allowed=['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm','video/x-m4v'];
    var bad=files.find(function(f){return !allowed.includes(String(f.type||'').toLowerCase())||f.size>MAX_SIZE||!f.size});if(bad){alert(bad.size>MAX_SIZE?'Файл «'+bad.name+'» больше 50 МБ.':'Формат «'+bad.name+'» пока не поддерживается.');return}
    if(files.length>50){alert('За один раз можно выбрать до 50 файлов. Можно добавить следующую пачку сразу после загрузки.');return}
    var heroImg=document.querySelector('.eventHero > img'),hadRealCover=!!(heroImg&&!heroImg.hasAttribute('data-default-cover'));
    var queue=section.querySelector('.eventMediaUploadQueue');queue.hidden=false;queue.innerHTML='';var rows=files.map(function(file,i){return queueRow(queue,i,file)}),prepared;
    try{prepared=await call('prepare_upload',{event_id:eventId,files:files.map(function(f){return{name:f.name,type:f.type,size:f.size}})})}catch(e){cleanupRows(rows);queue.innerHTML='<div class="eventMediaUploadError">'+esc(e.message)+'</div>';return}
    var next=0,failed=0;
    async function worker(){while(next<files.length){var i=next++,file=files[i],spec=prepared.uploads[i],row=rows[i];try{var m=await meta(file);await uploadSigned(file,spec,row);await call('complete_upload',{event_id:eventId,storage_path:spec.path,mime_type:file.type,file_size:file.size,width:m.width,height:m.height,duration_seconds:m.duration_seconds,captured_at:m.captured_at});rowStatus(row,'Готово',100,'done')}catch(e){failed++;rowStatus(row,e&&e.message?e.message:'Не удалось загрузить файл. Проверьте соединение.',null,'error')}}}
    await Promise.all([worker(),worker()]);await load(eventId,section);
    if(!hadRealCover&&!current.items.some(function(x){return x.is_cover})){var first=current.items.find(function(x){return x.media_type==='image'&&x.can_cover});if(first){try{await call('set_cover',{media_id:first.id});await load(eventId,section);if(typeof window.loadEventDetail==='function')setTimeout(function(){window.loadEventDetail(eventId)},0)}catch(e){}}}
    if(typeof window.loadChronicleV2==='function')window.loadChronicleV2();if(!failed)setTimeout(function(){cleanupRows(rows);if(queue)queue.hidden=true},1000)
  }

  function closeViewer(){document.querySelector('.eventMediaViewer')?.remove()}
  function openViewer(index){
    if(!current.items.length)return;index=Math.max(0,Math.min(current.items.length-1,index));var item=current.items[index];closeViewer();var o=document.createElement('div');o.className='eventMediaViewer';o.dataset.index=index;
    var media=item.media_type==='video'?'<video class="eventMediaViewerMedia" src="'+esc(item.url||'')+'" controls playsinline autoplay></video>':'<img class="eventMediaViewerMedia" src="'+esc(item.url||'')+'" alt="">';
    o.innerHTML='<div class="eventMediaViewerTop"><button type="button" data-close aria-label="Закрыть">×</button><span>'+(index+1)+' / '+current.items.length+'</span><i></i></div><div class="eventMediaViewerStage"><button type="button" class="eventMediaPrev" data-prev aria-label="Предыдущее">‹</button>'+media+'<button type="button" class="eventMediaNext" data-next aria-label="Следующее">›</button></div><div class="eventMediaViewerBottom"><div><strong>'+esc(item.uploader_name||'Участник')+'</strong><small>'+esc(item.media_type==='video'?'Видео':'Фото')+'</small></div><div class="eventMediaViewerActions">'+(item.can_cover&&!item.is_cover?'<button type="button" data-cover>Сделать обложкой</button>':'')+(item.can_delete?'<button type="button" class="danger" data-delete>Удалить</button>':'')+'</div></div>';
    document.body.appendChild(o);o.querySelector('[data-close]').onclick=closeViewer;var go=function(d){var n=(Number(o.dataset.index)+d+current.items.length)%current.items.length;openViewer(n)};o.querySelector('[data-prev]').onclick=function(){go(-1)};o.querySelector('[data-next]').onclick=function(){go(1)};
    var x0=null;o.addEventListener('touchstart',function(e){x0=e.touches&&e.touches[0]?e.touches[0].clientX:null},{passive:true});o.addEventListener('touchend',function(e){if(x0==null)return;var x=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientX:x0,dx=x-x0;x0=null;if(Math.abs(dx)>55)go(dx<0?1:-1)},{passive:true});
    o.addEventListener('keydown',function(e){if(e.key==='Escape')closeViewer();if(e.key==='ArrowLeft')go(-1);if(e.key==='ArrowRight')go(1)});o.tabIndex=-1;o.focus();
    var cover=o.querySelector('[data-cover]');if(cover)cover.onclick=async function(){cover.disabled=true;try{await call('set_cover',{media_id:item.id});closeViewer();var section=document.querySelector('.eventMediaSection');await load(current.eventId,section);if(typeof window.loadChronicleV2==='function')window.loadChronicleV2()}catch(e){alert(e.message);cover.disabled=false}};
    var del=o.querySelector('[data-delete]');if(del)del.onclick=async function(){if(!confirm('Удалить этот материал из события?'))return;del.disabled=true;try{await call('delete_media',{media_id:item.id});closeViewer();var section=document.querySelector('.eventMediaSection');await load(current.eventId,section);if(item.is_cover&&typeof window.loadEventDetail==='function')window.loadEventDetail(current.eventId);if(typeof window.loadChronicleV2==='function')window.loadChronicleV2()}catch(e){alert(e.message);del.disabled=false}}
  }

  function mount(data){if(!data||!data.event||!data.event.id)return;var section=ensureSection(data);load(data.event.id,section)}
  window.mountEventMedia=mount;
  if(typeof window.renderEventDetail==='function'&&!window.__lyaMediaRenderPatched){var original=window.renderEventDetail;window.renderEventDetail=function(data){original(data);setTimeout(function(){mount(data)},0)};window.__lyaMediaRenderPatched=true}
})();