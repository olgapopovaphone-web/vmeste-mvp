(function(){
  if(window.__lyaImageSystemV2)return;window.__lyaImageSystemV2=true;
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var pendingEventCover=null,pendingEventPreview='',activeCommunityId=null,openEventPatched=false,openCommunityPatched=false;

  function readGroups(){try{var a=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  function writeGroups(a){try{localStorage.setItem(GROUPS_KEY,JSON.stringify(a));return true}catch(e){alert('Не удалось сохранить изображение. Попробуйте выбрать другое фото.');return false}}
  function activeGroup(){var a=readGroups();if(activeCommunityId){var g=a.find(function(x){return String(x.id)===String(activeCommunityId)});if(g)return g}var title=document.querySelector('[data-view="community-detail"].active .communityDetailHeroCopy h1');if(title){var name=title.textContent.trim();return a.find(function(x){return String(x.name||'').trim()===name})||null}return null}
  function patchGroup(id,patch){var a=readGroups(),g=a.find(function(x){return String(x.id)===String(id)});if(!g)return null;Object.assign(g,patch);if(!writeGroups(a))return null;document.dispatchEvent(new CustomEvent('vmeste-community-changed',{detail:{community:g}}));return g}
  function cleanObjectUrl(){if(pendingEventPreview){URL.revokeObjectURL(pendingEventPreview);pendingEventPreview=''}}
  function styleDefault(el,kind,key,text){if(!el||!window.LyaDefaultCovers||!window.LyaDefaultCovers.ready())return false;var s=kind==='community'?window.LyaDefaultCovers.community(key,text):window.LyaDefaultCovers.event(key,text);return window.LyaDefaultCovers.apply(el,s)}

  function decorateDefaults(root){
    root=root||document;
    root.querySelectorAll('.eventHeroPlaceholder:not([data-default-cover])').forEach(function(el){var hero=el.closest('.eventHero'),title=hero&&hero.querySelector('.eventHeroCopy h1');if(styleDefault(el,'event',title&&title.textContent,title&&title.textContent)){el.dataset.defaultCover='1';el.textContent=''}});
    root.querySelectorAll('.communityDetailHero:not(.has-cover):not([data-default-cover])').forEach(function(el){var title=el.querySelector('.communityDetailHeroCopy h1');if(styleDefault(el,'community',activeCommunityId||title&&title.textContent,title&&title.textContent)){el.dataset.defaultCover='1';el.classList.add('has-default-cover')}});
    root.querySelectorAll('.socialCommunityCard').forEach(function(card){var mark=card.querySelector('.socialCommunityMark:not(.socialCommunityPhoto):not([data-default-cover])'),title=card.querySelector('h3');if(mark&&styleDefault(mark,'community',title&&title.textContent,title&&title.textContent)){mark.dataset.defaultCover='1';mark.textContent='';mark.classList.add('socialCommunityPhoto','default-cover')}});
    root.querySelectorAll('.chronicleV2Card.no-cover:not([data-default-cover])').forEach(function(card){var title=card.querySelector('h2');if(styleDefault(card,'event',card.dataset.chronicleId||title&&title.textContent,title&&title.textContent)){card.dataset.defaultCover='1';card.classList.remove('no-cover');card.classList.add('has-default-cover')}})
  }

  function ensureEventCreateCover(){
    var form=document.getElementById('event-form');if(!form||form.querySelector('.eventCreateCoverField'))return;
    var head=form.querySelector('.createFormHead');if(!head)return;
    var box=document.createElement('div');box.className='eventCreateCoverField';
    box.innerHTML='<input type="file" id="event-create-cover-input" data-image-role="event-cover" accept="image/jpeg,image/png,image/webp" hidden><button type="button" class="eventCreateCoverPick"><span class="eventCreateCoverPlus">＋</span><span><strong>Обложка события</strong><small>Если не выбрать фото, ЛЯ поставит обложку автоматически</small></span></button><div class="eventCreateCoverActions" hidden><button type="button" data-event-cover-reframe>Изменить кадр</button><button type="button" data-event-cover-remove>Удалить</button></div>';
    head.insertAdjacentElement('afterend',box);
    var input=box.querySelector('input'),pick=box.querySelector('.eventCreateCoverPick'),actions=box.querySelector('.eventCreateCoverActions');
    function choose(){input.click()}
    pick.onclick=choose;box.querySelector('[data-event-cover-reframe]').onclick=choose;
    box.querySelector('[data-event-cover-remove]').onclick=function(){pendingEventCover=null;cleanObjectUrl();input.value='';box.classList.remove('has-photo');box.style.backgroundImage='';actions.hidden=true;pick.hidden=false};
    input.addEventListener('change',function(){var f=input.files&&input.files[0];if(!f)return;pendingEventCover=f;cleanObjectUrl();pendingEventPreview=URL.createObjectURL(f);box.style.backgroundImage='url("'+pendingEventPreview.replace(/"/g,'%22')+'")';box.classList.add('has-photo');pick.hidden=true;actions.hidden=false});
    form.addEventListener('reset',function(){setTimeout(function(){if(!pendingEventCover){cleanObjectUrl();input.value='';box.classList.remove('has-photo');box.style.backgroundImage='';actions.hidden=true;pick.hidden=false}},0)})
  }

  async function uploadCreatedEventCover(eventId,file){
    if(!file||!eventId)return;
    try{
      var prepare=window.prepareCover||(typeof prepareCover==='function'?prepareCover:null);var raw=window.eventRaw||(typeof eventRaw==='function'?eventRaw:null);if(!prepare||!raw)return;
      var prepared=await prepare(file);await raw('upload_cover',Object.assign({event_id:eventId},prepared));
      var reload=window.loadEventDetail||(typeof loadEventDetail==='function'?loadEventDetail:null);if(reload)await reload(eventId)
    }catch(err){alert('Событие создано, но обложку не удалось загрузить. Её можно добавить позже.')}
  }

  function patchOpenEvent(){
    if(openEventPatched||typeof window.openEventView!=='function')return;
    var base=window.openEventView;window.openEventView=function(id,source){var f=source==='create'?pendingEventCover:null;if(f){pendingEventCover=null;cleanObjectUrl()}var r=base.apply(this,arguments);if(f)setTimeout(function(){uploadCreatedEventCover(id,f)},120);return r};openEventPatched=true
  }
  function patchOpenCommunity(){
    if(openCommunityPatched||typeof window.openCommunityDetail!=='function')return;
    var base=window.openCommunityDetail;window.openCommunityDetail=function(id){activeCommunityId=id;var r=base.apply(this,arguments);setTimeout(function(){decorateDefaults(document);enhanceCommunityManagement()},0);return r};openCommunityPatched=true
  }

  function routeLegacyCommunityCreate(e){
    var target=e.target.closest&&e.target.closest('.socialCreateCommunity,[data-social-create],[data-social-action="create"]');if(!target)return;
    var view=target.closest('[data-view="communities"]');if(!view)return;
    e.preventDefault();e.stopImmediatePropagation();if(typeof window.openView==='function')window.openView('create');
    setTimeout(function(){var b=document.querySelector('[data-view="create"] [data-create-action="community"]');if(b)b.click()},50)
  }

  function imageToCommunityData(file){
    return new Promise(function(resolve,reject){var url=URL.createObjectURL(file),img=new Image();img.onload=function(){try{var c=document.createElement('canvas');c.width=1200;c.height=960;c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.82))}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('Не удалось прочитать изображение'))};img.src=url})
  }

  function enhanceCommunityManagement(){
    document.querySelectorAll('.communityActionSheet').forEach(function(sheet){
      if(sheet.dataset.imageManage==='1'||!sheet.querySelector('[data-community-edit]'))return;var g=activeGroup();if(!g)return;sheet.dataset.imageManage='1';
      var edit=sheet.querySelector('[data-community-edit]'),wrap=document.createElement('div');wrap.className='communityImageManage';
      wrap.innerHTML='<input type="file" data-community-cover-input data-image-role="community-cover" accept="image/jpeg,image/png,image/webp" hidden><button type="button" class="communityManageRow" data-community-cover-change>'+(g.cover_url?'Изменить обложку':'Добавить обложку')+' <b>›</b></button>'+(g.cover_url?'<button type="button" class="communityManageRow communityCoverRemove" data-community-cover-remove>Удалить обложку <b>×</b></button>':'');
      edit.insertAdjacentElement('beforebegin',wrap);var input=wrap.querySelector('input');wrap.querySelector('[data-community-cover-change]').onclick=function(){input.click()};
      input.addEventListener('change',async function(){var f=input.files&&input.files[0];if(!f)return;try{var data=await imageToCommunityData(f),updated=patchGroup(g.id,{cover_url:data});if(updated){sheet.closest('.communityActionOverlay')?.remove();if(typeof window.openCommunityDetail==='function')window.openCommunityDetail(g.id)}}catch(err){alert('Не удалось сохранить обложку')}});
      var remove=wrap.querySelector('[data-community-cover-remove]');if(remove)remove.onclick=function(){if(!confirm('Удалить обложку сообщества?'))return;var updated=patchGroup(g.id,{cover_url:''});if(updated){sheet.closest('.communityActionOverlay')?.remove();if(typeof window.openCommunityDetail==='function')window.openCommunityDetail(g.id)}}
    })
  }

  function enhanceEventEditRemove(){
    document.querySelectorAll('.eventEditSheet').forEach(function(sheet){
      if(sheet.dataset.imageManage==='1')return;sheet.dataset.imageManage='1';var cover=sheet.querySelector('.eventEditCover'),form=sheet.querySelector('.eventEditForm');if(!cover||!form)return;
      var heroHasImage=!!document.querySelector('[data-view="event"].active .eventHero>img');if(!heroHasImage)return;
      var btn=document.createElement('button');btn.type='button';btn.className='eventEditRemoveCover';btn.textContent='Удалить обложку';cover.insertAdjacentElement('afterend',btn);
      btn.onclick=async function(){if(!confirm('Удалить обложку события?'))return;var id=window.activeEventId||(typeof activeEventId!=='undefined'?activeEventId:null),raw=window.eventRaw||(typeof eventRaw==='function'?eventRaw:null);if(!id||!raw)return;btn.disabled=true;try{await raw('remove_cover',{event_id:id});sheet.closest('.eventEditOverlay')?.remove();var reload=window.loadEventDetail||(typeof loadEventDetail==='function'?loadEventDetail:null);if(reload)await reload(id)}catch(err){alert(err.message||'Не удалось удалить обложку');btn.disabled=false}}
    })
  }

  function scan(){ensureEventCreateCover();patchOpenEvent();patchOpenCommunity();decorateDefaults(document);enhanceCommunityManagement();enhanceEventEditRemove()}
  document.addEventListener('click',routeLegacyCommunityCreate,true);
  window.addEventListener('lya:default-covers-ready',function(){decorateDefaults(document)});
  document.addEventListener('vmeste-community-changed',function(){setTimeout(function(){decorateDefaults(document)},0)});
  new MutationObserver(function(){clearTimeout(window.__lyaImageScanTimer);window.__lyaImageScanTimer=setTimeout(scan,20)}).observe(document.body,{childList:true,subtree:true});
  scan();setTimeout(scan,150);setTimeout(scan,900)
})();