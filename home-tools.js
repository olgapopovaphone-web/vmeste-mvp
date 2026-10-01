(function(){
  ['/home-discovery.css?v=20260924-4','/around-people.css?v=20260916-1','/place-detail.css?v=20260924-1','/my-events.css?v=20260915-2','/calendar-month-only.css?v=20260916-1','/calendar-day-v2.css?v=20260916-1','/social-hub.css?v=20260918-3','/social-circle.css?v=20260916-2','/social-cleanup.css?v=20260916-2','/people-tab-v2.css?v=20260924-3','/profile-v2.css?v=20261001-1','/people-invite-app.css?v=20260917-2','/communities-tab-v2.css?v=20260917-2','/chronicle-v2.css?v=20260916-1','/event-media.css?v=20260918-2','/navigation-order-v2.css?v=20260916-1','/event-group-prototype.css?v=20260916-1','/event-edit.css?v=20260916-1','/event-circle-invite.css?v=20260916-1','/community-detail.css?v=20260917-3','/community-detail-v3.css?v=20260924-10','/image-cropper.css?v=20260925-2','/image-system-v2.css?v=20260918-3','/header-kit-v1.css?v=20261001-1','/create-landing-v2.css?v=20260918-3','/lya-ui-v1.css?v=20261001-7'].forEach(function(href){var l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)});


  import('/image-cropper.js?v=20260925-2').then(function(){return import('/image-upload-bridge.js?v=20260925-1')});
  import('/default-covers-v1.js?v=20260918-2');
  import('/home-core.js?v=20261001-1');
  import('/calendar-reminders.js?v=20260925-1').then(function(){return import('/calendar-reminder-cleanup.js?v=20260917-1')});
  import('/my-events.js?v=20260915-1').then(function(){return import('/calendar-month-only.js?v=20260916-1')}).then(function(){return import('/calendar-day-v2.js?v=20260916-1')});
  import('/social-hub.js?v=20260918-3').then(function(){return import('/circle-labels.js?v=20260916-2')}).then(function(){return import('/social-cleanup.js?v=20260916-2')}).then(function(){return import('/people-tab-v2.js?v=20260924-14')}).then(function(){return import('/people-invite-app.js?v=20260917-2')}).then(function(){return import('/communities-tab-v2.js?v=20260924-2')}).then(function(){return import('/profile-v2.js?v=20260925-7')});
  import('/community-detail.js?v=20260917-3').then(function(){return import('/community-media-bridge.js?v=20260917-1')}).then(function(){return import('/community-detail-v3.js?v=20260924-7')}).then(function(){var s=document.querySelector('[data-view="community-detail"]');if(s)s.classList.add('communityDetailV3');return import('/community-detail-link.js?v=20260917-3')});
  import('/event-group-prototype.js?v=20260916-1').then(function(){return import('/event-edit.js?v=20260916-1')}).then(function(){return import('/event-circle-invite.js?v=20260916-2')});
  import('/place-detail.js?v=20260924-1').then(function(){return import('/home-discovery.js?v=20260924-4')}).then(function(){return import('/around-people.js?v=20260916-1')});
  import('/chronicle-v2.js?v=20260916-1');
  import('/event-media.js?v=20260918-3');
  import('/header-kit-v1.js?v=20261001-1').then(function(){return import('/create-landing-v2.js?v=20260924-1')}).then(function(){return import('/community-create-submit-bridge.js?v=20260918-3')}).then(function(){return import('/community-create-link-bridge.js?v=20260917-1')}).then(function(){return import('/image-system-v2.js?v=20260918-3')}).then(function(){return import('/image-system-reset-fix.js?v=20260918-1')});
})();
