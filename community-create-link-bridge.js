(function(){
  var LINKS_KEY='vmeste_event_group_proto_v1';
  var CONTEXT_KEY='vmeste_group_event_context_v1';
  function readLinks(){try{var v=JSON.parse(localStorage.getItem(LINKS_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(e){return{}}}
  function save(eventId){var groupId=sessionStorage.getItem(CONTEXT_KEY);if(!groupId||!eventId)return;var m=readLinks();m[eventId]=groupId;localStorage.setItem(LINKS_KEY,JSON.stringify(m));sessionStorage.removeItem(CONTEXT_KEY);document.querySelector('.communityCreateContext')?.remove()}
  var base=window.openEventView;
  if(typeof base==='function'&&!window.__communityCreateLinkPatched){window.openEventView=function(id,source){if(source==='create')save(id);return base.apply(this,arguments)};window.__communityCreateLinkPatched=true}
  document.addEventListener('click',function(e){
    var nav=e.target.closest&&e.target.closest('.nav[data-go="create"]');if(nav){sessionStorage.removeItem(CONTEXT_KEY);document.querySelector('.communityCreateContext')?.remove();return}
    var close=e.target.closest&&e.target.closest('[data-create-close="event"]');if(close){sessionStorage.removeItem(CONTEXT_KEY);document.querySelector('.communityCreateContext')?.remove()}
  },true);
})();
