(function(){
  function icon(name){
    var p={
      home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3Z"></path>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="3"></rect><path d="M7 3v4M17 3v4M3 10h18"></path>',
      people:'<circle cx="9" cy="8" r="3"></circle><path d="M3.5 19a5.5 5.5 0 0 1 11 0"></path><circle cx="17" cy="9" r="2.3"></circle><path d="M15.5 14.6a4.4 4.4 0 0 1 5 4.4"></path>',
      chronicle:'<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>'
    };return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p[name]+'</svg>';
  }
  function nav(go,label,name){var b=document.querySelector('.nav[data-go="'+go+'"]');if(!b)return;if(go==='create'){b.innerHTML='<span>'+label+'</span>';return}b.innerHTML=icon(name)+'<span>'+label+'</span>'}
  function mountHeaderLogos(){
    ['home','calendar','create','communities','chronicle'].forEach(function(view){
      var header=document.querySelector('[data-view="'+view+'"]>.top');if(!header)return;
      var copy=header.querySelector(':scope > div:first-child');if(!copy)return;
      var logo=copy.querySelector(':scope > .lyaHeaderLogo');
      if(!logo){logo=document.createElement('img');logo.className='lyaHeaderLogo';logo.src='/brand-lya-mark.svg';logo.alt='ЛЯ';copy.insertBefore(logo,copy.firstChild)}
    });
  }
  function apply(){
    document.title='ЛЯ — люди и события';
    var meta=document.querySelector('meta[name="description"]');if(meta)meta.content='ЛЯ — люди и события вокруг тебя';
    nav('home','Вокруг','home');nav('calendar','События','calendar');nav('create','Создать');nav('communities','В кругу','people');nav('chronicle','Хроника','chronicle');
    mountHeaderLogos();
    var loginEy=document.querySelector('[data-view="login"] .ey');if(loginEy)loginEy.textContent='ЛЯ · ЛЮДИ И СОБЫТИЯ';
    var loginTitle=document.querySelector('[data-view="login"] .auth h2');if(loginTitle&&/MVP/i.test(loginTitle.textContent))loginTitle.textContent='Вход';
    var profileBack=document.querySelector('[data-view="profile"] .js-home');if(profileBack)profileBack.textContent='← Вокруг';
    var createTitle=document.querySelector('[data-view="create"]>.top h1');if(createTitle)createTitle.innerHTML='Создавай моменты,<br>которые <em>сближают</em>';
  }
  apply();
  setTimeout(apply,120);
  setTimeout(apply,700);
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.nav'))setTimeout(apply,0)},true);
})();
