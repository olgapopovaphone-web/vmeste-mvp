const views=[...document.querySelectorAll('.view')];
const nav=[...document.querySelectorAll('.nav')];
function openView(name){
  views.forEach(v=>v.classList.toggle('active',v.dataset.view===name));
  nav.forEach(b=>b.classList.toggle('active',b.dataset.go===name));
  const bottom=document.getElementById('bottom-nav');
  bottom.style.display=(name==='profile'||name==='login')?'none':'grid';
  window.scrollTo(0,0);
}
nav.forEach(b=>b.addEventListener('click',()=>openView(b.dataset.go)));
document.querySelectorAll('.js-profile').forEach(b=>b.addEventListener('click',()=>openView('profile')));
document.querySelectorAll('.js-home').forEach(b=>b.addEventListener('click',()=>openView('home')));
document.querySelectorAll('.repeat').forEach(b=>b.addEventListener('click',()=>alert('«Повторить» подключим следующим шагом')));
const profileRoot=document.getElementById('profile-root');
profileRoot.innerHTML='<div class="mark">В</div><span class="ey">ПРОФИЛЬ</span><h1>Вы пока гость</h1><p class="muted">Для приглашений и собственных событий нужен аккаунт.</p><div class="panel"><button class="primary" id="enter-account">Войти или зарегистрироваться</button></div>';
document.getElementById('enter-account').addEventListener('click',()=>openView('login'));
document.getElementById('private-choice').addEventListener('click',()=>{document.getElementById('event-form').hidden=false;document.getElementById('event-form').scrollIntoView({behavior:'smooth'});});
document.getElementById('auth-form').addEventListener('submit',e=>{e.preventDefault();alert('Регистрацию подключаем к Supabase следующим шагом');});
document.getElementById('event-form').addEventListener('submit',e=>{e.preventDefault();const s=document.getElementById('event-status');s.hidden=false;s.textContent='Черновик сохранён в тестовом интерфейсе';});