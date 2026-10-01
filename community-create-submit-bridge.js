(function(){
  if(window.__communityCreateSubmitBridgeMounted)return;
  window.__communityCreateSubmitBridgeMounted=true;

  var GROUPS_KEY='vmeste_groups_proto_v1';
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-circle-api';

  function session(){try{return JSON.parse(localStorage.getItem('vmeste_session_v1')||'null')}catch(e){return null}}
  function readGroups(){try{var a=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  function writeGroups(a){try{localStorage.setItem(GROUPS_KEY,JSON.stringify(a))}catch(e){}}

  async function call(action,payload,retry){
    var s=session();if(!s||!s.access_token)throw new Error('Требуется вход в аккаунт');
    var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}
    if(r.status===401&&retry!==false&&typeof window.refreshSession==='function'&&await window.refreshSession())return call(action,payload,false);
    if(!r.ok)throw new Error(d.error||'Ошибка запроса');
    return d
  }

  function coverData(file){
    if(!file)return Promise.resolve(null);
    return new Promise(function(resolve,reject){
      var reader=new FileReader();
      reader.onload=function(){
        var src=reader.result,img=new Image();
        img.onload=function(){
          try{
            var w=1200,h=900,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
            var scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;
            canvas.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,w,h);
            resolve(canvas.toDataURL('image/jpeg',.82))
          }catch(e){resolve(src)}
        };
        img.onerror=function(){resolve(src)};img.src=src
      };
      reader.onerror=function(){reject(new Error('Не удалось прочитать обложку'))};
      reader.readAsDataURL(file)
    })
  }

  function cacheCommunity(g){
    var groups=readGroups().filter(function(x){return String(x.id)!==String(g.id)});
    groups.unshift(g);writeGroups(groups);
  }

  document.addEventListener('lya:create-community-submit',async function(e){
    var d=e.detail||{},name=String(d.name||'').trim();if(!name)return;
    var form=document.querySelector('[data-view="create"] .createCommunityForm');
    var status=form&&form.querySelector('.createCommunityStatus');
    var submit=form&&form.querySelector('button[type="submit"]');
    if(submit)submit.disabled=true;
    if(status){status.hidden=false;status.className='status createCommunityStatus';status.textContent='Создаю сообщество…'}
    try{
      var cover=await coverData(d.cover_file||null);
      var res=await call('create_community',{
        name:name,
        description:String(d.description||'').trim(),
        access:d.access==='closed'?'closed':'open',
        chat_enabled:d.chat_enabled!==false,
        event_permission:'all',
        cover_url:cover
      },true);
      var g=res.community;
      cacheCommunity(g);
      if(status)status.textContent='Сообщество создано';
      document.dispatchEvent(new CustomEvent('vmeste-community-changed',{detail:{community:g}}));
      if(typeof window.openCommunityDetail==='function')window.openCommunityDetail(g.id,g);
      else if(typeof window.openSocialCommunities==='function')window.openSocialCommunities();
    }catch(err){
      if(status){status.hidden=false;status.className='status createCommunityStatus error';status.textContent=err&&err.message?err.message:'Не удалось создать сообщество'}
    }finally{if(submit)submit.disabled=false}
  });
})();