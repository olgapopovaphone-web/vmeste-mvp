(function(){
  var GROUPS_KEY='vmeste_groups_proto_v1';
  var LINKS_KEY='vmeste_event_group_proto_v1';

  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch(e){return fallback}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function groups(){var g=read(GROUPS_KEY,[]);return Array.isArray(g)?g:[]}
  function links(){var m=read(LINKS_KEY,{});return m&&typeof m==='object'?m:{}}
  function getLinked(eventId){var m=links(),id=m[eventId];if(!id)return null;return groups().find(function(g){return g.id===id})||null}
  function saveLink(eventId,groupId){var m=links();if(groupId)m[eventId]=groupId;else delete m[eventId];write(LINKS_KEY,m)}
  function icon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19a5.5 5.5 0 0 1 11 0"></path><circle cx="17" cy="9" r="2.3"></circle><path d="M15.5 14.6a4.4 4.4 0 0 1 5 4.4"></path></svg>'}

  function blockMarkup(data){
    var g=getLinked(data.event.id);
    if(!g){
      return '<div class="eventManageBlock eventCommunityProto" data-event-community-proto><span class="eventInfoLabel">ГРУППА</span><p class="eventCommunityIntro">Привяжите событие к постоянной группе, чтобы затем пригласить всех её участников одним действием.</p><button type="button" class="eventCommunityLink" data-event-community-pick><span class="eventCommunityLinkIcon">'+icon()+'</span><span class="eventCommunityLinkCopy"><b>Выбрать группу</b><small>Мои группы</small></span><span class="eventCommunityChevron">›</span></button></div>';
    }
    var count=Number(g.member_count||1);
    return '<div class="eventManageBlock eventCommunityProto" data-event-community-proto><span class="eventInfoLabel">ГРУППА</span><button type="button" class="eventCommunityLink" data-event-community-pick><span class="eventCommunityLinkIcon">'+icon()+'</span><span class="eventCommunityLinkCopy"><b>'+esc(g.name)+'</b><small>'+count+' '+(count===1?'участник':'участников')+'</small></span><span class="eventCommunityChevron">›</span></button><div class="eventCommunityActions"><button type="button" class="eventCommunityInviteAll" data-event-community-invite>Пригласить всю группу</button><button type="button" class="eventCommunityDetach" data-event-community-detach>Отвязать</button></div><div class="eventCommunityProtoStatus" hidden></div></div>';
  }

  function mount(data){
    if(!data||!data.is_creator||!data.event||['finished','cancelled'].includes(data.event.status))return;
    var panel=document.querySelector('[data-event-panel="management"]');if(!panel)return;
    panel.querySelector('[data-event-community-proto]')?.remove();
    var lifecycle=panel.querySelector('.eventLifecycleBlock');
    if(lifecycle)lifecycle.insertAdjacentHTML('beforebegin',blockMarkup(data));
    else panel.insertAdjacentHTML('beforeend',blockMarkup(data));
    var block=panel.querySelector('[data-event-community-proto]');if(!block)return;
    var pick=block.querySelector('[data-event-community-pick]');if(pick)pick.onclick=function(){openPicker(data)};
    var detach=block.querySelector('[data-event-community-detach]');if(detach)detach.onclick=function(){saveLink(data.event.id,null);mount(data)};
    var invite=block.querySelector('[data-event-community-invite]');if(invite)invite.onclick=function(){var s=block.querySelector('.eventCommunityProtoStatus');s.hidden=false;s.textContent='Прототип: массовые приглашения пока не отправляются. Проверяем только сценарий и интерфейс.'};
  }

  function openPicker(data){
    document.querySelector('.eventCommunityOverlay')?.remove();
    var list=groups();
    var body='';
    if(list.length){
      body='<div class="eventCommunityChoices">'+list.map(function(g){var c=Number(g.member_count||1);return '<button type="button" class="eventCommunityChoice" data-event-community-id="'+esc(g.id)+'"><span class="eventCommunityChoiceMark">'+esc((g.name||'?').trim().slice(0,1).toUpperCase())+'</span><span class="eventCommunityChoiceCopy"><b>'+esc(g.name)+'</b><small>'+c+' '+(c===1?'участник':'участников')+(g.access==='closed'?' · закрытая':' · открытая')+'</small></span><span class="eventCommunityChoiceArrow">›</span></button>'}).join('')+'</div>';
    }else{
      body='<div class="eventCommunityEmpty"><h3>Сначала создайте группу</h3><p>В прототипе группы сохраняются только в этом браузере и не затрагивают рабочие данные.</p><button type="button" class="eventCommunityCreate" data-event-community-create>Создать группу</button></div>';
    }
    var o=document.createElement('div');o.className='eventCommunityOverlay';o.innerHTML='<div class="eventCommunitySheet"><div class="eventCommunitySheetHead"><h2>Группа для события</h2><button type="button" class="eventCommunitySheetClose">×</button></div>'+body+'</div>';
    document.body.appendChild(o);
    o.querySelector('.eventCommunitySheetClose').onclick=function(){o.remove()};
    o.onclick=function(e){if(e.target===o)o.remove()};
    o.querySelectorAll('[data-event-community-id]').forEach(function(btn){btn.onclick=function(){saveLink(data.event.id,btn.dataset.eventCommunityId);o.remove();mount(data)}});
    var create=o.querySelector('[data-event-community-create]');if(create)create.onclick=function(){o.remove();if(typeof window.openSocialCommunities==='function')window.openSocialCommunities();else{var nav=document.querySelector('.nav[data-go="communities"]');if(nav)nav.click()}};
  }

  var base=window.renderEventDetail;
  if(typeof base==='function'){
    window.renderEventDetail=function(data){base(data);mount(data)};
  }
})();
