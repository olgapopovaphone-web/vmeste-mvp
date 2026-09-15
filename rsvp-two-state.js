(function(){
  function simplifyEventRsvp(){
    document.querySelectorAll('[data-rsvp="interested"]').forEach(el=>el.remove());
    document.querySelectorAll('.participantSummary span').forEach(el=>{
      if((el.textContent||'').toLowerCase().includes('возможно')) el.remove();
    });
    document.querySelectorAll('.chatLocked').forEach(el=>{
      if((el.textContent||'').includes('Возможно')){
        el.textContent='Чат открывается организатору и участникам, которые приняли приглашение.';
      }
    });
  }

  const original=window.renderEventDetail;
  if(typeof original==='function'){
    window.renderEventDetail=function(data){
      const result=original(data);
      simplifyEventRsvp();
      return result;
    };
  }

  const observer=new MutationObserver(simplifyEventRsvp);
  observer.observe(document.body,{subtree:true,childList:true});
  simplifyEventRsvp();
})();
