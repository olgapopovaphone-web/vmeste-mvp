(function(){
  if(window.__lyaEditorialDesignV1)return;window.__lyaEditorialDesignV1=true;

  function icon(name){
    var v='viewBox="0 0 24 24" aria-hidden="true"';
    if(name==='text')return '<svg '+v+'><path d="M5 5h14M12 5v14M8 19h8"/></svg>';
    if(name==='desc')return '<svg '+v+'><path d="M4 6h16M4 12h12M4 18h16"/></svg>';
    if(name==='group')return '<svg '+v+'><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.6a4.4 4.4 0 0 1 5 4.4"/></svg>';
    if(name==='chat')return '<svg '+v+'><path d="M20 15a4 4 0 0 1-4 4H9l-5 3 1.5-5A8 8 0 1 1 20 15Z"/></svg>';
    return '';
  }

  function decorateEvent(){
    var root=document.getElementById('event-detail-root');if(!root)return;
    var hero=root.querySelector('.eventHero');if(!hero)return;
    var view=root.closest('[data-view="event"]')||root.closest('.eventView');if(view)view.classList.add('lyaEditorialEvent');
    if(!root.querySelector('.lyaEventIntro')){
      var copy=hero.querySelector('.eventHeroCopy'),title=copy&&copy.querySelector('h1'),short=copy&&copy.querySelector('p');
      var full=root.querySelector('.eventDescriptionText');
      if(title){
        var intro=document.createElement('div');intro.className='lyaEventIntro';
        var h=document.createElement('h1');h.textContent=title.textContent||'';
        intro.appendChild(h);
        var desc=(full&&full.textContent||short&&short.textContent||'').trim();
        if(desc){var p=document.createElement('p');p.textContent=desc;intro.appendChild(p)}
        hero.insertAdjacentElement('afterend',intro)
      }
    }
    if(!root.querySelector('.lyaEventInfoCard')){
      var facts=root.querySelector('.eventFacts'),people=root.querySelector('.eventPeopleStrip');
      if(facts){
        var card=document.createElement('div');card.className='lyaEventInfoCard';
        facts.parentNode.insertBefore(card,facts);card.appendChild(facts);if(people)card.appendChild(people)
      }
    }
  }

  function decorateCommunity(){
    var root=document.getElementById('community-detail-root');if(!root)return;
    var hero=root.querySelector('.communityDetailHero');if(!hero)return;
    if(!root.querySelector('.lyaCommunityIntro')){
      var copy=hero.querySelector('.communityDetailHeroCopy');
      var title=copy&&copy.querySelector('h1'),desc=copy&&copy.querySelector('p'),meta=copy&&copy.querySelector('small');
      if(title){
        var intro=document.createElement('div');intro.className='lyaCommunityIntro';
        var h=document.createElement('h1');h.textContent=title.textContent||'';intro.appendChild(h);
        if(desc&&desc.textContent.trim()){var p=document.createElement('p');p.textContent=desc.textContent.trim();intro.appendChild(p)}
        if(meta&&meta.textContent.trim()){var s=document.createElement('small');s.textContent=meta.textContent.trim();intro.appendChild(s)}
        hero.insertAdjacentElement('afterend',intro)
      }
    }
  }

  function fieldIcon(name){var s=document.createElement('span');s.className='lyaCreateFieldIcon';s.innerHTML=icon(name);return s}
  function decorateField(input,title,name){
    if(!input)return;var label=input.closest('label');if(!label||label.classList.contains('lyaCreateFieldRow'))return;
    label.classList.add('lyaCreateFieldRow');
    Array.from(label.childNodes).forEach(function(n){if(n.nodeType===3)n.remove()});
    var copy=document.createElement('span');copy.className='lyaCreateFieldCopy';
    var strong=document.createElement('strong');strong.textContent=title;copy.appendChild(strong);
    copy.appendChild(input);
    label.insertBefore(fieldIcon(name),label.firstChild);label.appendChild(copy)
  }

  function applyDefaultCreateCover(form){
    var preview=form&&form.querySelector('[data-community-cover-preview]');if(!preview||preview.classList.contains('hasPhoto'))return;
    if(preview.style.backgroundImage)return;
    if(!window.LyaDefaultCovers||!window.LyaDefaultCovers.ready())return;
    var style=window.LyaDefaultCovers.community('create-community-preview','книжный клуб');
    window.LyaDefaultCovers.apply(preview,style)
  }

  function decorateCreateCommunity(){
    var form=document.querySelector('[data-view="create"] .createCommunityForm');if(!form)return;
    form.classList.add('lyaEditorialCreateCommunity');
    decorateField(form.querySelector('#community-name'),'Название сообщества','text');
    decorateField(form.querySelector('#community-description'),'Описание сообщества','desc');
    var fieldset=form.querySelector('.createChoiceField');
    if(fieldset&&!fieldset.dataset.lyaEditorial){
      fieldset.dataset.lyaEditorial='1';var legend=fieldset.querySelector('legend');if(legend)legend.textContent='Тип сообщества';
      var ii=fieldIcon('group');ii.classList.add('lyaChoiceIcon');fieldset.insertBefore(ii,fieldset.firstChild);
      var open=fieldset.querySelector('input[value="open"]+span small');if(open)open.textContent='Присоединиться может любой желающий';
      var closed=fieldset.querySelector('input[value="closed"]+span small');if(closed)closed.textContent='Только по приглашению'
    }
    var sw=form.querySelector('.createSwitchRow');
    if(sw&&!sw.querySelector('.lyaCreateFieldIcon'))sw.insertBefore(fieldIcon('chat'),sw.firstChild);
    applyDefaultCreateCover(form)
  }

  function scan(){decorateEvent();decorateCommunity();decorateCreateCommunity()}
  if(typeof window.renderEventDetail==='function'&&!window.__lyaEditorialEventRenderPatch){
    var base=window.renderEventDetail;
    window.renderEventDetail=function(data){var r=base.apply(this,arguments);setTimeout(decorateEvent,0);return r};
    window.__lyaEditorialEventRenderPatch=true
  }
  window.addEventListener('lya:default-covers-ready',function(){setTimeout(decorateCreateCommunity,0)});
  new MutationObserver(function(){clearTimeout(window.__lyaEditorialScanTimer);window.__lyaEditorialScanTimer=setTimeout(scan,16)}).observe(document.body,{childList:true,subtree:true});
  scan();setTimeout(scan,120);setTimeout(scan,700)
})();