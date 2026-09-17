(function(){
  var views=['home','calendar','create','communities','chronicle'];

  function moveInto(actions,node){
    if(node&&node.parentElement!==actions)actions.appendChild(node);
  }

  function mountView(view){
    var section=document.querySelector('[data-view="'+view+'"]');
    if(!section)return;
    var oldTop=section.querySelector(':scope > .top');
    if(!oldTop)return;

    var bar=section.querySelector(':scope > .lyaKitHeader');
    if(!bar){
      bar=document.createElement('div');
      bar.className='lyaKitHeader';
      bar.innerHTML='<img class="lyaKitHeaderLogo" src="/brand-lya-logo.svg" alt="ЛЯ · люди и события"><div class="lyaKitHeaderActions"></div>';
      section.insertBefore(bar,oldTop);
    }
    var actions=bar.querySelector('.lyaKitHeaderActions');

    if(view==='home'){
      moveInto(actions,section.querySelector('#home-top-actions'));
    }else if(view==='chronicle'){
      var tools=oldTop.querySelector('.chronicleV2TopTools');
      if(tools){
        moveInto(actions,tools.querySelector('.chronicleV2SearchToggle'));
        moveInto(actions,tools.querySelector('.avatar.js-profile'));
      }else{
        moveInto(actions,oldTop.querySelector('.avatar.js-profile'));
      }
    }else{
      moveInto(actions,oldTop.querySelector('.avatar.js-profile'));
    }

    section.classList.add('lyaKitMounted');
  }

  function mount(){views.forEach(mountView)}
  mount();
  setTimeout(mount,120);
  setTimeout(mount,700);
  setTimeout(mount,1600);

  new MutationObserver(function(){
    clearTimeout(window.__lyaKitHeaderTimer);
    window.__lyaKitHeaderTimer=setTimeout(mount,30);
  }).observe(document.body,{childList:true,subtree:true});
})();
