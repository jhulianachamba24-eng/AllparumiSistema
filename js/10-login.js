
/* Login: indicador "Conectando…" y avisos siempre visibles */
(function(){
 const base=Auth.login.bind(Auth);
 Auth.login=async function(){
   const btn=document.querySelector('#login-view button[onclick="Auth.login()"]');
   const txt=btn?btn.textContent:'';
   if(btn){btn.disabled=true;btn.textContent='Conectando…';}
   try{return await base();}
   finally{if(btn){btn.disabled=false;btn.textContent=txt||'Iniciar Sesión';}}
 };
})();
