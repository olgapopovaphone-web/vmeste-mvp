(function(){
  function setText(node,value){
    if(node&&node.textContent!==value)node.textContent=value;
  }
  function applyCircleLabels(){
    setText(document.querySelector('[data-view="communities"] .socialHubTop .ey'),'В КРУГУ');
    document.querySelectorAll('[data-view="communities"] .socialPersonAction.is-state').forEach(function(button){
      if(button.textContent.trim()==='В круге')button.textContent='В кругу';
    });
  }
  applyCircleLabels();
  document.addEventListener('vmeste-circle-changed',applyCircleLabels);
  var root=document.querySelector('[data-view="communities"]');
  if(root)new MutationObserver(applyCircleLabels).observe(root,{childList:true,subtree:true});
})();