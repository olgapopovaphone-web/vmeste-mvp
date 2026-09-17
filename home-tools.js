(function(){
  ['/home-discovery.css?v=20260915-2','/around-people.css?v=20260916-1','/place-detail.css?v=20260915-2','/my-events.css?v=20260915-2','/calendar-month-only.css?v=20260916-1','/calendar-day-v2.css?v=20260916-1','/social-hub.css?v=20260916-3','/social-circle.css?v=20260916-2','/social-cleanup.css?v=20260916-2','/people-tab-v2.css?v=20260916-1','/people-invite-app.css?v=20260916-1','/communities-tab-v2.css?v=20260916-1','/chronicle-v2.css?v=20260916-1','/event-media.css?v=20260917-1','/navigation-order-v2.css?v=20260916-1','/event-group-prototype.css?v=20260916-1','/event-edit.css?v=20260916-1','/event-circle-invite.css?v=20260916-1','/community-detail.css?v=20260916-1','/brand-lya.css?v=20260916-2','/brand-color-balance.css?v=20260916-2','/brand-vokrug.css?v=20260916-5','/image-cropper.css?v=20260916-2'].forEach(function(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)});

  function simplifyTabHeaders(){
    var createTop=document.querySelector('[data-view="create"] .top');
    if(createTop){
      var createEy=createTop.querySelector('.ey'),createTitle=createTop.querySelector('h1'),createText=createTop.querySelector('p');
      if(createEy)createEy.hidden=true;
      if(createText)createText.hidden=true;
      if(createTitle)createTitle.innerHTML='Создавай моменты,<br>которые <em>сближают</em>';
    }
    var eventsSection=document.querySelector('[data-view="calendar"]'),eventsTop=eventsSection&&eventsSection.querySelector('.top');
    if(eventsTop){
      var eventsEy=eventsTop.querySelector('.ey'),eventsTitle=eventsTop.querySelector('h1'),eventsText=eventsTop.querySelector('p');
      if(eventsEy)eventsEy.hidden=true;
      if(eventsText)eventsText.hidden=true;
      if(eventsTitle)eventsTitle.textContent=eventsSection.classList.contains('mode-calendar')?'Календарь':'Мои события';
    }
  }

  var homeNav=document.querySelector('.nav[data-go="home"]');if(homeNav){var homeLabel=homeNav.querySelector('span');if(homeLabel)homeLabel.textContent='Вокруг'}
  var circleNav=document.querySelector('.nav[data-go="communities"]');if(circleNav){var circleLabel=circleNav.querySelector('span');if(circleLabel)circleLabel.textContent='В кругу'}
  var eventsNav=document.querySelector('.nav[data-go="calendar"]');if(eventsNav){var label=eventsNav.querySelector('span');if(label)label.textContent='События';eventsNav.childNodes.forEach(function(n){if(n.nodeType===3&&n.textContent.trim())n.textContent='▤'})}
  simplifyTabHeaders();
  document.addEventListener('click',function(e){var mode=e.target.closest&&e.target.closest('[data-my-events-mode]');if(mode)setTimeout(simplifyTabHeaders,0)},true);

  import('/image-cropper.js?v=20260916-2').then(function(){return import('/image-upload-bridge.js?v=20260916-2')});
  import('/home-core.js?v=20260916-4');
  import('/calendar-reminders.js?v=20260915-2');
  import('/my-events.js?v=20260915-1').then(function(){simplifyTabHeaders();return import('/calendar-month-only.js?v=20260916-1')}).then(function(){return import('/calendar-day-v2.js?v=20260916-1')});
  import('/social-hub.js?v=20260916-6').then(function(){return import('/circle-labels.js?v=20260916-2')}).then(function(){return import('/social-cleanup.js?v=20260916-2')}).then(function(){return import('/people-tab-v2.js?v=20260916-1')}).then(function(){return import('/people-invite-app.js?v=20260916-1')}).then(function(){return import('/communities-tab-v2.js?v=20260916-1')});
  import('/community-detail.js?v=20260916-2');
  import('/community-detail-link.js?v=20260916-2');
  import('/event-group-prototype.js?v=20260916-1').then(function(){return import('/event-edit.js?v=20260916-1')}).then(function(){return import('/event-circle-invite.js?v=20260916-2')});
  import('/place-detail.js?v=20260915-2').then(function(){return import('/home-discovery.js?v=20260916-3')}).then(function(){return import('/around-people.js?v=20260916-1')});
  import('/chronicle-v2.js?v=20260916-1');
  import('/event-media.js?v=20260917-1');
  import('/brand-lya.js?v=20260916-3');
})();
