(()=>{
  const AVATAR_API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-avatar-api';
  let avatarCache=null;
  let hydrating=false;

  function token(){try{return session?.access_token||''}catch{return ''}}
  function currentAvatar(){try{return account?.profile?.avatar_url||avatarCache||null}catch{return avatarCache}}
  function currentLetter(){try{return (account?.profile?.display_name||account?.user?.email||'В').trim().slice(0,1).toUpperCase()||'В'}catch{return 'В'}}

  async function avatarJson(action,retry=true){
    const response=await fetch(AVATAR_API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({action})});
    if(response.status===401&&retry&&typeof refreshSession==='function'&&await refreshSession())return avatarJson(action,false);
    const data=await response.json().catch(()=>({error:'Некорректный ответ сервера'}));
    if(!response.ok)throw new Error(data.error||'Ошибка загрузки аватара');
    return data;
  }

  async function uploadBlob(blob,retry=true){
    const form=new FormData();form.append('action','upload');form.append('file',blob,'avatar.jpg');
    const response=await fetch(AVATAR_API,{method:'POST',headers:{'Authorization':'Bearer '+token()},body:form});
    if(response.status===401&&retry&&typeof refreshSession==='function'&&await refreshSession())return uploadBlob(blob,false);
    const data=await response.json().catch(()=>({error:'Некорректный ответ сервера'}));
    if(!response.ok)throw new Error(data.error||'Не удалось загрузить фото');
    return data;
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);const img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Не удалось прочитать изображение'))};
      img.src=url;
    });
  }

  async function prepareAvatar(file){
    if(!file?.type?.startsWith('image/'))throw new Error('Выберите изображение');
    const img=await loadImage(file);const side=Math.min(img.naturalWidth,img.naturalHeight);const sx=(img.naturalWidth-side)/2;const sy=(img.naturalHeight-side)/2;
    const size=Math.min(960,side);const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не удалось подготовить фото')),'image/jpeg',0.88));
  }

  async function cropAvatar(file){
    if(/-crop\.jpg$/i.test(file?.name||''))return file;
    if(!window.openImageCropper){try{await import('/image-cropper.js?v=20260925-2')}catch{}}
    if(window.openImageCropper)return window.openImageCropper(file,{aspect:1,outputWidth:960,outputHeight:960,circle:true,title:'Фото профиля',quality:.9});
    return prepareAvatar(file);
  }

  function paintTopAvatars(){
    const url=(typeof account!=='undefined'&&account)?currentAvatar():null;const letter=currentLetter();
    document.querySelectorAll('.avatar').forEach(el=>{
      if(url){el.classList.add('avatarHasPhoto');el.style.backgroundImage=`url("${url}")`;el.textContent='';}
      else{el.classList.remove('avatarHasPhoto');el.style.backgroundImage='';el.textContent=letter;}
    });
  }

  function setStatus(text,error=false){const el=document.getElementById('profile-avatar-status');if(!el)return;el.textContent=text||'';el.classList.toggle('error',!!error)}

  function enhanceProfile(){
    const root=document.getElementById('profile-root');
    if(!root||typeof account==='undefined'||!account)return;
    if(root.querySelector('.profileAvatarWrap')){paintProfileAvatar();return}
    const oldMark=root.querySelector('.mark');if(!oldMark)return;
    const wrap=document.createElement('div');wrap.className='profileAvatarWrap';
    wrap.innerHTML=`<div class="profileAvatarMain"><button class="profileAvatarLarge" id="profile-avatar-button" type="button" aria-label="Изменить фото профиля">${currentLetter()}</button><button class="profileAvatarCamera" id="profile-avatar-camera" type="button" aria-label="Выбрать фото">＋</button></div><div class="profileAvatarCopy"><b>Фото профиля</b><button class="profileAvatarAction" id="profile-avatar-change" type="button">${currentAvatar()?'Сменить фото':'Добавить фото'}</button><button class="profileAvatarAction profileAvatarRemove" id="profile-avatar-remove" type="button" ${currentAvatar()?'':'hidden'}>Удалить фото</button><div class="profileAvatarStatus" id="profile-avatar-status"></div></div><input id="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>`;
    oldMark.replaceWith(wrap);
    const input=wrap.querySelector('#profile-avatar-input');
    const choose=()=>input.click();
    wrap.querySelector('#profile-avatar-button').onclick=choose;wrap.querySelector('#profile-avatar-camera').onclick=choose;wrap.querySelector('#profile-avatar-change').onclick=choose;
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;setStatus('Настройте кадр…');
      try{
        const blob=await cropAvatar(file);if(!blob){setStatus('');return}
        setStatus('Загружаю…');const data=await uploadBlob(blob);avatarCache=data.avatar_url||null;
        if(account?.profile)account.profile.avatar_url=avatarCache;paintTopAvatars();paintProfileAvatar();setStatus('Готово');
      }catch(err){setStatus(err.message||'Не удалось загрузить фото',true)}finally{input.value=''}
    };
    wrap.querySelector('#profile-avatar-remove').onclick=async()=>{
      if(!confirm('Удалить фото профиля?'))return;setStatus('Удаляю…');
      try{await avatarJson('remove');avatarCache=null;if(account?.profile)account.profile.avatar_url=null;paintTopAvatars();paintProfileAvatar();setStatus('Фото удалено')}catch(err){setStatus(err.message||'Не удалось удалить фото',true)}
    };
    paintProfileAvatar();
  }

  function paintProfileAvatar(){
    const button=document.getElementById('profile-avatar-button');if(!button)return;const url=currentAvatar();
    if(url){button.style.backgroundImage=`url("${url}")`;button.textContent='';}
    else{button.style.backgroundImage='';button.textContent=currentLetter()}
    const change=document.getElementById('profile-avatar-change');if(change)change.textContent=url?'Сменить фото':'Добавить фото';
    const remove=document.getElementById('profile-avatar-remove');if(remove)remove.hidden=!url;
  }

  async function hydrateAvatar(){
    if(hydrating||!token())return;hydrating=true;
    try{const data=await avatarJson('get');avatarCache=data.avatar_url||null;if(typeof account!=='undefined'&&account?.profile)account.profile.avatar_url=avatarCache;paintTopAvatars();enhanceProfile()}catch{}finally{hydrating=false}
  }

  if(typeof updateAvatars==='function'){
    const original=updateAvatars;updateAvatars=function(){original.apply(this,arguments);paintTopAvatars()}
  }
  if(typeof renderProfile==='function'){
    const original=renderProfile;renderProfile=function(){original.apply(this,arguments);enhanceProfile();paintTopAvatars()}
  }
  if(typeof loadAccount==='function'){
    const original=loadAccount;loadAccount=async function(){const ok=await original.apply(this,arguments);if(ok)await hydrateAvatar();return ok}
  }

  setTimeout(()=>{paintTopAvatars();enhanceProfile();hydrateAvatar()},250);
})();