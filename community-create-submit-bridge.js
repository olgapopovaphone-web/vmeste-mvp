(function(){
  if(window.__communityCreateSubmitBridgeMounted)return;
  window.__communityCreateSubmitBridgeMounted=true;

  document.addEventListener('lya:create-community-submit',async function(e){
    var d=e.detail||{},name=String(d.name||'').trim();if(!name)return;
    var store=window.LyaCommunityStore;
    var form=document.querySelector('[data-view="create"] .createCommunityForm');
    var status=form&&form.querySelector('.createCommunityStatus');
    var submit=form&&form.querySelector('button[type="submit"]');
    if(!store){if(status){status.hidden=false;status.className='status createCommunityStatus error';status.textContent='Сервис сообществ ещё загружается'}return}
    if(submit)submit.disabled=true;
    if(status){status.hidden=false;status.className='status createCommunityStatus';status.textContent='Создаю сообщество…'}
    try{
      var cover='';
      if(d.cover_file){
        cover=await new Promise(function(resolve){
          var reader=new FileReader();
          reader.onload=function(){resolve(reader.result||'')};
          reader.onerror=function(){resolve('')};
          reader.readAsDataURL(d.cover_file);
        });
      }
      var group=await store.create({
        name:name,
        description:String(d.description||'').trim(),
        access:d.access==='closed'?'closed':'open',
        chat_enabled:d.chat_enabled!==false,
        event_permission:'all',
        cover_url:cover||null
      });
      if(status)status.textContent='Сообщество создано';
      document.dispatchEvent(new CustomEvent('vmeste-community-changed',{detail:{community:group}}));
      if(group&&group.id&&typeof window.openCommunityDetail==='function')window.openCommunityDetail(group.id,group);
      else if(typeof window.openSocialCommunities==='function')window.openSocialCommunities();
    }catch(err){
      if(status){status.hidden=false;status.className='status createCommunityStatus error';status.textContent=err&&err.message?err.message:'Не удалось создать сообщество'}
    }finally{if(submit)submit.disabled=false}
  });
})();