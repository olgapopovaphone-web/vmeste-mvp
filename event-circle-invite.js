(function(){
  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-invite-api';
  var createSelectedPeople=new Map();
  var createSelectedCommunities=new Map();

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function session(){try{return JSON.parse(localStorage.getItem('vmeste_session_v1')||'null')}catch(e){return null}}
  function token(){var s=session();return s&&s.access_token||''}
  async function raw(action,payload){
    var t=token();if(!t)throw new Error('LOGIN');
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))};
    var r=window.lyaAuthedFetch?await window.lyaAuthedFetch(API,opts,true):await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:opts.body});
    var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}
    if(!r.ok)throw new Error(d.error||'Ошибка запроса');
    return d
  }
  function avatar(p){
    var name=p.display_name||'У';
    if(p.avatar_url)return '<span class="eventCircleAvatar eventCircleAvatarPhoto" style="background-image:url(\''+esc(p.avatar_url)+'\')"></span>';
    return '<span class="eventCircleAvatar">'+esc(name.trim().slice(0,1).toUpperCase()||'У')+'</span>'
  }
  function communityAvatar(c){
    var name=c.name||'Сообщество';
    if(c.cover_url)return '<span class="eventCircleCommunityAvatar hasPhoto" style="background-image:url(\''+esc(c.cover_url)+'\')"></span>';
    var letters=name.trim().split(/\s+/).map(function(x){return x.charAt(0)}).join('').slice(0,2).toUpperCase()||'ЛЯ';
    return '<span class="eventCircleCommunityAvatar">'+esc(letters)+'</span>'
  }
  function stateText(state){return state==='going'?'Уже участвует':state==='invited'?'Приглашение отправлено':state==='accepted'?'Уже приглашён':state==='declined'?'Отказался':''}
  function memberWord(n){var m=Math.abs(n)%100,d=m%10;if(m>10&&m<20)return'участников';if(d===1)return'участник';if(d>1&&d<5)return'участника';return'участников'}

  function renderCreateSelected(){
    var root=document.getElementById('event-create-circle-selected');if(!root)return;
    var people=Array.from(createSelectedPeople.values()),communities=Array.from(createSelectedCommunities.values());
    if(!people.length&&!communities.length){root.innerHTML='<span class="eventCircleCreateEmpty">Никто не выбран</span>';return}
    var chips=[];
    people.forEach(function(p){chips.push('<span class="eventCircleSelectedChip">'+avatar(p)+'<b>'+esc(p.display_name||'Участник')+'</b><button type="button" data-create-person-remove="'+esc(p.id)+'" aria-label="Убрать">×</button></span>')});
    communities.forEach(function(c){chips.push('<span class="eventCircleSelectedChip community">'+communityAvatar(c)+'<b>'+esc(c.name||'Сообщество')+'</b><button type="button" data-create-community-remove="'+esc(c.id)+'" aria-label="Убрать">×</button></span>')});
    root.innerHTML='<div class="eventCircleSelectedList">'+chips.join('')+'</div>';
    root.querySelectorAll('[data-create-person-remove]').forEach(function(b){b.onclick=function(){createSelectedPeople.delete(b.dataset.createPersonRemove);renderCreateSelected()}});
    root.querySelectorAll('[data-create-community-remove]').forEach(function(b){b.onclick=function(){createSelectedCommunities.delete(b.dataset.createCommunityRemove);renderCreateSelected()}})
  }

  function mountCreate(){
    var form=document.getElementById('event-form');if(!form||form.querySelector('[data-event-circle-create]'))return;
    var block=document.createElement('div');block.className='eventCircleCreate';block.dataset.eventCircleCreate='1';
    block.innerHTML='<div class="eventCircleCreateHead"><div><span class="ey">ПОЗВАТЬ СВОИХ</span><strong>Люди или целое сообщество</strong></div><button type="button" class="eventCirclePickButton" id="event-create-circle-pick">Выбрать</button></div><div id="event-create-circle-selected"></div>';
    var status=document.getElementById('event-status');if(status)form.insertBefore(block,status);else form.appendChild(block);
    block.querySelector('#event-create-circle-pick').onclick=function(){openPicker({mode:'create'})};
    renderCreateSelected()
  }

  function personRow(p,selected){
    var state=stateText(p.state),disabled=!!p.state;
    return '<label class="eventCirclePerson '+(disabled?'is-disabled':'')+'">'+avatar(p)+'<span class="eventCirclePersonCopy"><b>'+esc(p.display_name||'Участник')+'</b><small>'+esc(state||p.city||'В вашем круге')+'</small></span><input type="checkbox" data-circle-person="'+esc(p.id)+'" '+(selected?'checked ':'')+(disabled?'disabled':'')+'><span class="eventCircleCheck">✓</span></label>'
  }
  function communityRow(c,selected){
    var n=Number(c.member_count||0),disabled=n<=1;
    return '<label class="eventCircleCommunity '+(disabled?'is-disabled':'')+'">'+communityAvatar(c)+'<span class="eventCirclePersonCopy"><b>'+esc(c.name||'Сообщество')+'</b><small>'+esc(disabled?'Кроме вас пока никого нет':n+' '+memberWord(n))+'</small></span><input type="checkbox" data-circle-community="'+esc(c.id)+'" '+(selected?'checked ':'')+(disabled?'disabled':'')+'><span class="eventCircleCheck">✓</span></label>'
  }

  async function openPicker(opts){
    opts=opts||{};
    document.querySelector('.eventCircleOverlay')?.remove();
    if(!token()){if(typeof openView==='function')openView('login');return}
    var overlay=document.createElement('div');overlay.className='eventCircleOverlay';
    overlay.innerHTML='<div class="eventCircleSheet"><div class="eventCircleSheetHead"><div><span class="ey">В КРУГУ</span><h2>Позвать своих</h2></div><button type="button" class="eventCircleClose">×</button></div><div class="eventCircleTargetTabs"><button type="button" class="active" data-target-tab="people">Люди</button><button type="button" data-target-tab="communities">Сообщества</button></div><div class="eventCircleBody"><div class="eventCircleLoading">Загружаю ваших…</div></div><div class="eventCircleFooter"><button type="button" class="eventCircleSubmit" disabled>Выбрать</button></div></div>';
    document.body.appendChild(overlay);
    var close=function(result){
      overlay.remove();
      if(opts.mode==='pick'){
        if(result!==undefined&&typeof opts.onSelected==='function')opts.onSelected(result);
        else if(result===undefined&&typeof opts.onCancel==='function')opts.onCancel()
      }
    };
    overlay.querySelector('.eventCircleClose').onclick=function(){close()};
    overlay.onclick=function(e){if(e.target===overlay)close()};
    var body=overlay.querySelector('.eventCircleBody'),submit=overlay.querySelector('.eventCircleSubmit'),tabs=overlay.querySelector('.eventCircleTargetTabs');
    var selectedPeople=new Set(),selectedCommunities=new Set();
    if(opts.mode==='create'||opts.storeForCreate){
      createSelectedPeople.forEach(function(_,id){selectedPeople.add(id)});
      createSelectedCommunities.forEach(function(_,id){selectedCommunities.add(id)})
    }

    try{
      var d=await raw('list_circle_invitees',opts.eventId?{event_id:opts.eventId}:{});
      var people=d.people||[],communities=opts.peopleOnly?[]:(d.communities||[]);
      if(opts.peopleOnly)tabs.hidden=true;
      if(!people.length&&!communities.length){
        body.innerHTML='<div class="eventCircleEmpty"><h3>Пока некого звать</h3><p>Добавьте людей во «В кругу» или вступите в сообщество.</p></div>';
        overlay.querySelector('.eventCircleFooter').hidden=true;return
      }

      body.innerHTML='<div class="eventCircleTargetPanel active" data-target-panel="people">'+(people.length?'<div class="eventCirclePeople">'+people.map(function(p){return personRow(p,selectedPeople.has(p.id))}).join('')+'</div>':'<div class="eventCircleEmpty"><h3>В кругу пока никого нет</h3><p>Можно перейти во вкладку «Сообщества».</p></div>')+'</div>'+
        '<div class="eventCircleTargetPanel" data-target-panel="communities">'+(communities.length?'<div class="eventCirclePeople">'+communities.map(function(c){return communityRow(c,selectedCommunities.has(c.id))}).join('')+'</div>':'<div class="eventCircleEmpty"><h3>Сообществ пока нет</h3><p>Создайте своё или вступите в существующее.</p></div>')+'</div>';

      function sync(){
        var count=selectedPeople.size+selectedCommunities.size;
        submit.disabled=count===0;
        var verb=opts.mode==='event'?'Позвать':opts.mode==='pick'?'Продолжить':'Выбрать';
        submit.textContent=count?verb+' · '+count:verb
      }
      body.querySelectorAll('[data-circle-person]').forEach(function(input){input.onchange=function(){if(input.checked)selectedPeople.add(input.dataset.circlePerson);else selectedPeople.delete(input.dataset.circlePerson);sync()}});
      body.querySelectorAll('[data-circle-community]').forEach(function(input){input.onchange=function(){if(input.checked)selectedCommunities.add(input.dataset.circleCommunity);else selectedCommunities.delete(input.dataset.circleCommunity);sync()}});
      tabs.querySelectorAll('[data-target-tab]').forEach(function(b){b.onclick=function(){var tab=b.dataset.targetTab;tabs.querySelectorAll('button').forEach(function(x){x.classList.toggle('active',x===b)});body.querySelectorAll('[data-target-panel]').forEach(function(x){x.classList.toggle('active',x.dataset.targetPanel===tab)})}});
      if(!people.length&&communities.length&&!opts.peopleOnly){var communityTab=tabs.querySelector('[data-target-tab="communities"]');if(communityTab)communityTab.click()}
      sync();

      submit.onclick=async function(){
        submit.disabled=true;
        var targets={user_ids:Array.from(selectedPeople),community_ids:Array.from(selectedCommunities)};
        if(opts.mode==='create'){
          createSelectedPeople.clear();createSelectedCommunities.clear();
          people.forEach(function(p){if(selectedPeople.has(p.id)&&!p.state)createSelectedPeople.set(p.id,p)});
          communities.forEach(function(c){if(selectedCommunities.has(c.id)&&Number(c.member_count||0)>1)createSelectedCommunities.set(c.id,c)});
          renderCreateSelected();close();return
        }
        if(opts.mode==='pick'){
          if(opts.storeForCreate){
            createSelectedPeople.clear();createSelectedCommunities.clear();
            people.forEach(function(p){if(selectedPeople.has(p.id)&&!p.state)createSelectedPeople.set(p.id,p)});
            communities.forEach(function(c){if(selectedCommunities.has(c.id)&&Number(c.member_count||0)>1)createSelectedCommunities.set(c.id,c)});
            renderCreateSelected()
          }
          close(targets);return
        }
        submit.textContent='Отправляю…';
        try{
          var res=await raw('invite_from_circle',{event_id:opts.eventId,user_ids:targets.user_ids,community_ids:targets.community_ids});
          close();
          if(res.blocked_ids&&res.blocked_ids.length)alert('Часть приглашений не отправлена из-за возрастных ограничений события.');
          else if(!(res.invited_ids||[]).length&&res.skipped_ids&&res.skipped_ids.length)alert('Все выбранные уже приглашены или участвуют.');
          if(typeof loadEventDetail==='function')await loadEventDetail(opts.eventId);
          if(typeof loadEvents==='function')await loadEvents()
        }catch(err){
          submit.disabled=false;submit.textContent='Повторить';
          var note=overlay.querySelector('.eventCircleError');
          if(!note){note=document.createElement('div');note.className='eventCircleError';overlay.querySelector('.eventCircleFooter').prepend(note)}
          note.textContent=err.message
        }
      }
    }catch(err){
      body.innerHTML='<div class="eventCircleEmpty"><h3>Не удалось загрузить своих</h3><p>'+esc(err.message==='LOGIN'?'Нужно войти в аккаунт.':err.message)+'</p></div>';
      overlay.querySelector('.eventCircleFooter').hidden=true
    }
  }

  async function inviteSelectedToEvent(eventId,ids,communityIds){
    var targets=Array.isArray(ids)?{user_ids:ids,community_ids:Array.isArray(communityIds)?communityIds:[]}:(ids||{});
    var userIds=targets.user_ids||[],groups=targets.community_ids||[];
    if(!userIds.length&&!groups.length)return{invited_ids:[]};
    return raw('invite_from_circle',{event_id:eventId,user_ids:userIds,community_ids:groups})
  }

  function mountDetail(data){
    if(!data||!data.event||!data.can_invite||['finished','cancelled'].includes(data.event.status))return;
    var id=data.event.id,plus=document.getElementById('event-invite-plus');
    if(plus){var clean=plus.cloneNode(true);plus.replaceWith(clean);clean.onclick=function(){openPicker({mode:'event',eventId:id})}}
    if(data.is_creator){
      var panel=document.querySelector('[data-event-panel="management"]');
      if(panel&&!panel.querySelector('[data-event-circle-manage]')){
        var block=document.createElement('div');block.className='eventManageBlock eventCircleManage';block.dataset.eventCircleManage='1';
        block.innerHTML='<span class="eventInfoLabel">ПОЗВАТЬ СВОИХ</span><button type="button" class="eventManagePrimary" data-open-event-circle>Люди или сообщество</button><small>Можно выбрать отдельных людей или пригласить целое сообщество.</small>';
        panel.insertBefore(block,panel.firstChild);
        block.querySelector('[data-open-event-circle]').onclick=function(){openPicker({mode:'event',eventId:id})};
        var linkBlock=panel.querySelector('.eventManageBlock:not([data-event-circle-manage])');
        if(linkBlock){var label=linkBlock.querySelector('.eventInfoLabel');if(label&&label.textContent.trim()==='ПРИГЛАШЕНИЕ')label.textContent='ПО ССЫЛКЕ';var linkBtn=linkBlock.querySelector('#event-invite-link');if(linkBtn)linkBtn.textContent='Создать ссылку-приглашение'}
      }
    }
  }

  var base=window.renderEventDetail;
  if(typeof base==='function'){window.renderEventDetail=function(data){base(data);var duplicate=document.querySelector('.eventHeroPlaceholder span');if(duplicate)duplicate.remove();mountDetail(data)}}

  window.getPendingEventCircleInviteIds=function(){return Array.from(createSelectedPeople.keys())};
  window.getPendingEventInviteTargets=function(){return{user_ids:Array.from(createSelectedPeople.keys()),community_ids:Array.from(createSelectedCommunities.keys())}};
  window.clearPendingEventCircleInviteIds=function(){createSelectedPeople.clear();createSelectedCommunities.clear();renderCreateSelected()};
  window.inviteCircleToEvent=inviteSelectedToEvent;
  window.inviteTargetsToEvent=inviteSelectedToEvent;
  window.openCreateCircleInvitePicker=function(){openPicker({mode:'create'})};
  window.openEventCircleInvitePicker=function(eventId){openPicker({mode:'event',eventId:eventId})};
  window.pickInviteTargets=function(opts){opts=opts||{};return new Promise(function(resolve){var settled=false;openPicker({mode:'pick',storeForCreate:!!opts.storeForCreate,onSelected:function(targets){settled=true;resolve(targets||{user_ids:[],community_ids:[]})},onCancel:function(){if(!settled)resolve({user_ids:[],community_ids:[]})}})})};
  window.pickCirclePeople=function(opts){opts=opts||{};return new Promise(function(resolve){var settled=false;openPicker({mode:'pick',peopleOnly:true,storeForCreate:!!opts.storeForCreate,onSelected:function(targets){settled=true;resolve((targets&&targets.user_ids)||[])},onCancel:function(){if(!settled)resolve([])}})})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountCreate);else mountCreate()
})();