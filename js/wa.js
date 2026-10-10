/* WhatsApp buttons: the link is put together only when a person presses the button, then cleared again.
   Buttons carry data-wa (and optional data-wa-msg) with href="#". */
(function(){
  var K=[12,7,10,14,9,7,15,8,15,7,7];
  function link(msg){
    var n=K.map(function(c){return c-7;}).join('');
    return 'https:'+'//'+'wa'+'.'+'me/'+n+(msg?'?text='+encodeURIComponent(msg):'');
  }
  function arm(e){
    var t=e.target, a=t&&t.closest?t.closest('a[data-wa]'):null;
    if(!a) return;
    a.href=link(a.getAttribute('data-wa-msg')||'');
    clearTimeout(a._waT);
    a._waT=setTimeout(function(){a.href='#';},2000);
  }
  ['pointerdown','touchstart','mousedown','keydown','click','auxclick'].forEach(function(ev){
    document.addEventListener(ev,arm,true);
  });
})();
