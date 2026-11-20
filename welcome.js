'use strict';
(function(){
 const welcome=document.getElementById('welcomeScreen'),workspace=document.getElementById('labScreen'),video=document.getElementById('introVideo'),start=document.getElementById('startLab');
 function enter(){video.pause();welcome.hidden=true;workspace.inert=false;workspace.removeAttribute('aria-hidden');document.body.classList.remove('welcome-open');window.dispatchEvent(new Event('resize'));document.getElementById('board').focus();}
 start.addEventListener('click',enter);
 video.addEventListener('error',()=>{document.getElementById('introFallback').hidden=false;},true);
 const playback=video.play();if(playback&&playback.catch)playback.catch(()=>{video.controls=true;});
})();
