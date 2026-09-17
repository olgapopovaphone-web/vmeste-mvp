(function(){
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-event-media-api';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function token(){try{var s=JSON.parse(localStorage.getItem('vmeste_session_v1')||'null');return s&&s.access_token||''}catch(e){return''}}
  async function call(action,payload,retry){var t=token();if(!t)throw new Error('LOGIN');var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(Object.assign({action:action},payload||{}))});var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}if(r.status===401&&retry!==false&&typeof refreshSession==='function'&&await refreshSession())return call(action,payload,false);if(!r.ok)throw new Error(d.error||'Ошибка запроса');return d}
  function close(){document.querySelector('.communityMediaViewer')?.remove()}
  function viewer(items,index){
    if(!Array.isArray(items)||!items.length)return;index=Math.max(0,Math.min(items.length-1,index||0));var item=items[index];close();var o=document.createElement('div');o.className='communityMediaViewer';var visual=item.media_type==='video'?'<video src="'+esc(item.url||'')+'" controls playsinline autoplay></video>':'<img src="'+esc(item.url||'')+'" alt="">';o.innerHTML='<div class="communityMediaViewerTop"><button type="button" data-close>×</button><span>'+(index+1)+' / '+items.length+'</span><i></i></div><div class="communityMediaViewerStage"><button type="button" data-prev>‹</button>'+visual+'<button type="button" data-next>›</button></div><div class="communityMediaViewerBottom"><strong>'+esc(item.event_title||'Событие')+'</strong><small>'+esc(item.uploader_name||'Участник')+'</small></div>';document.body.appendChild(o);
    function go(d){viewer(items,(index+d+items.length)%items.length)}o.querySelector('[data-close]').onclick=close;o.querySelector('[data-prev]').onclick=function(){go(-1)};o.querySelector('[data-next]').onclick=function(){go(1)};var x0=null;o.addEventListener('touchstart',function(e){x0=e.touches&&e.touches[0]?e.touches[0].clientX:null},{passive:true});o.addEventListener('touchend',function(e){if(x0==null)return;var x=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientX:x0,dx=x-x0;x0=null;if(Math.abs(dx)>55)go(dx<0?1:-1)},{passive:true});
  }
  window.listEventMediaForCommunity=function(eventId){return call('list_media',{event_id:eventId})};
  window.openEventMediaViewerReadOnly=viewer;
})();
