(function(){
  if(window.__communityCreateSubmitBridgeMounted)return;
  window.__communityCreateSubmitBridgeMounted=true;

  var GROUPS_KEY='vmeste_groups_proto_v1';
  var SESSION_KEY='vmeste_session_v1';

  function readGroups(){try{var a=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  function userInfo(){var s=session(),u=s&&s.user||{},m=u.user_metadata||{};return{id:u.id||'',name:m.display_name||m.name||u.email||'Вы'}}

  function coverData(file){
    if(!file)return Promise.resolve('');
    return new Promise(function(resolve){
      var reader=new FileReader();
      reader.onload=function(){
        var src=reader.result,img=new Image();
        img.onload=function(){
          try{
            var w=1200,h=960,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
            canvas.getContext('2d').drawImage(img,0,0,w,h);resolve(canvas.toDataURL('image/jpeg',.82))
          }catch(e){resolve(src)}
        };
        img.onerror=function(){resolve(src)};img.src=src
      };
      reader.onerror=function(){resolve('')};reader.readAsDataURL(file)
    })
  }

  document.addEventListener('lya:create-community-submit',async function(e){
    var d=e.detail||{},name=String(d.name||'').trim();if(!name)return;
    var form=document.querySelector('[data-view="create"] .createCommunityForm');var status=form&&form.querySelector('.createCommunityStatus');var submit=form&&form.querySelector('button[type="submit"]');
    if(submit)submit.disabled=true;if(status){status.hidden=false;status.className='status createCommunityStatus';status.textContent='Создаю сообщество…'}
    try{
      var cover=await coverData(d.cover_file||null),u=userInfo(),id='proto-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
      var group={id:id,name:name,description:String(d.description||'').trim(),access:d.access==='closed'?'closed':'open',chat_enabled:d.chat_enabled!==false,cover_url:cover,member_count:1,owner_id:u.id||null,role:'owner',is_owner:true,joined_via_invite:false,event_permission:'all',members:[{id:u.id||'owner',display_name:u.name,role:'owner',is_owner:true}],created_at:new Date().toISOString()};
      var groups=readGroups();groups.unshift(group);localStorage.setItem(GROUPS_KEY,JSON.stringify(groups));document.dispatchEvent(new CustomEvent('vmeste-community-changed',{detail:{community:group}}));
      if(status)status.textContent='Сообщество создано';if(typeof window.openCommunityDetail==='function')window.openCommunityDetail(id);else if(typeof window.openSocialCommunities==='function')window.openSocialCommunities()
    }catch(err){if(status){status.hidden=false;status.className='status createCommunityStatus error';status.textContent=err&&err.message?err.message:'Не удалось создать сообщество'}}finally{if(submit)submit.disabled=false}
  });
})();