(function(){
  if(window.LyaCommunityStore)return;

  var API='https://nmeoakrpafxhpdrplsuo.supabase.co/functions/v1/vmeste-circle-api';
  var SESSION_KEY='vmeste_session_v1';
  var LEGACY_GROUPS_KEY='vmeste_groups_proto_v1';
  var LEGACY_INVITES_KEY='vmeste_community_invites_proto_v1';
  var state={mine:[],discover:[],invites:[],loading:false};

  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  function token(){var s=session();return s&&s.access_token||''}
  function emit(){document.dispatchEvent(new CustomEvent('lya-community-store-changed',{detail:{mine:state.mine,discover:state.discover,invites:state.invites}}))}
  function cacheCompat(){
    try{localStorage.setItem(LEGACY_GROUPS_KEY,JSON.stringify(state.mine||[]))}catch(e){}
    try{localStorage.setItem(LEGACY_INVITES_KEY,JSON.stringify(state.invites||[]))}catch(e){}
  }
  async function call(action,payload,retry){
    var t=token();if(!t)throw new Error('LOGIN');
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))};
    var r=window.lyaAuthedFetch?await window.lyaAuthedFetch(API,opts,retry!==false):await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:opts.body});
    var d={};try{d=await r.json()}catch(e){d={error:'Некорректный ответ сервера'}}
    if(!r.ok)throw new Error(d.error||'Ошибка запроса');
    return d;
  }
  async function refreshMine(){
    if(!token()){state.mine=[];cacheCompat();emit();return state.mine}
    var d=await call('list_my_communities',{});
    state.mine=d.communities||[];cacheCompat();emit();return state.mine;
  }
  async function refreshDiscover(q){
    if(!token()){state.discover=[];emit();return state.discover}
    var d=await call('discover_communities',{query:String(q||'').trim()});
    state.discover=d.communities||[];emit();return state.discover;
  }
  async function refreshInvites(){
    if(!token()){state.invites=[];cacheCompat();emit();return state.invites}
    var d=await call('list_community_invitations',{});
    state.invites=(d.invitations||[]).map(function(x){
      return Object.assign({},x.community||{},{
        _server_invitation_id:x.invitation_id,
        _inviter:x.inviter||null,
        membership_status:'invited'
      });
    });
    cacheCompat();emit();return state.invites;
  }
  async function refreshAll(){
    state.loading=true;emit();
    try{await Promise.all([refreshMine(),refreshInvites()]);return state}
    finally{state.loading=false;emit()}
  }
  async function create(payload){
    var d=await call('create_community',payload||{});
    await refreshMine();
    return d.community;
  }
  async function get(id){var d=await call('get_community',{community_id:id});return d.community}
  async function update(id,patch){
    var d=await call('update_community',Object.assign({community_id:id},patch||{}));
    await refreshMine();return d.community;
  }
  async function join(id){
    var d=await call('join_community',{community_id:id});
    await Promise.all([refreshMine(),refreshDiscover('')]);return d;
  }
  async function respondInvite(invitationId,response){
    var d=await call('respond_community_invite',{invitation_id:invitationId,response:response});
    await Promise.all([refreshMine(),refreshInvites()]);return d;
  }
  async function leave(id){var d=await call('leave_community',{community_id:id});await refreshMine();return d}
  async function removeMember(id,userId){var d=await call('remove_community_member',{community_id:id,user_id:userId});await refreshMine();return d}
  async function remove(id){var d=await call('delete_community',{community_id:id});await refreshMine();return d}
  function upsertLocal(c){
    if(!c||!c.id)return;
    var i=state.mine.findIndex(function(x){return String(x.id)===String(c.id)});
    if(i>=0)state.mine[i]=Object.assign({},state.mine[i],c);else state.mine.unshift(c);
    cacheCompat();emit();
  }

  window.LyaCommunityStore={
    state:state,call:call,refreshMine:refreshMine,refreshDiscover:refreshDiscover,
    refreshInvites:refreshInvites,refreshAll:refreshAll,create:create,get:get,update:update,
    join:join,respondInvite:respondInvite,leave:leave,removeMember:removeMember,remove:remove,
    upsertLocal:upsertLocal
  };
})();