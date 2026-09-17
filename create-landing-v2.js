(function(){
  var section=document.querySelector('[data-view="create"]');
  if(!section||section.dataset.createLandingV2==='1')return;
  section.dataset.createLandingV2='1';
  section.classList.add('createLandingV2');

  var oldChoice=section.querySelector('#private-choice');
  var form=section.querySelector('#event-form');
  if(!oldChoice||!form)return;

  var shell=document.createElement('div');
  shell.className='createLandingShell';
  shell.innerHTML='\
    <div class="createBannerSlot" data-create-banner-slot aria-label="Место для эмоционального баннера">\
      <span class="createBannerSlotLabel">место под баннер</span>\
    </div>\
    <div class="createActionGrid">\
      <button type="button" class="createActionCard" data-create-action="event">\
        <span class="createActionIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="3"></rect><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17"></path></svg></span>\
        <span class="createActionCopy"><strong>Событие</strong><span>Встреча, поездка, праздник или что-то своё</span></span>\
        <span class="createActionArrow">→</span>\
      </button>\
      <button type="button" class="createActionCard" data-create-action="community">\
        <span class="createActionIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3"></circle><circle cx="17" cy="10" r="2.4"></circle><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14.5 16a4.5 4.5 0 0 1 6 4"></path></svg></span>\
        <span class="createActionCopy"><strong>Сообщество</strong><span>Люди вокруг общего интереса, идеи или дела</span></span>\
        <span class="createActionArrow">→</span>\
      </button>\
    </div>';

  section.insertBefore(shell,oldChoice);

  var back=document.createElement('button');
  back.type='button';
  back.className='createFlowBack';
  back.textContent='← Назад к выбору';
  form.insertBefore(back,form.firstChild);

  function showLanding(){
    section.classList.remove('createFlowEvent');
    form.hidden=true;
    window.scrollTo(0,0);
  }
  function showEvent(){
    section.classList.add('createFlowEvent');
    if(!window.account&&!window.session){oldChoice.click();return}
    oldChoice.click();
    form.hidden=false;
    setTimeout(function(){form.scrollIntoView({behavior:'smooth',block:'start'})},20);
  }

  shell.querySelector('[data-create-action="event"]').onclick=showEvent;
  shell.querySelector('[data-create-action="community"]').onclick=function(){
    section.dispatchEvent(new CustomEvent('lya:create-community-requested',{bubbles:true}));
  };
  back.onclick=showLanding;
  oldChoice.addEventListener('click',function(){
    if(document.querySelector('[data-view="create"].active'))section.classList.add('createFlowEvent');
  });
  document.querySelector('.nav[data-go="create"]')?.addEventListener('click',function(){setTimeout(showLanding,0)},true);
})();
