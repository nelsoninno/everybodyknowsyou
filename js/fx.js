/* Visuals: each [data-fx] plays while on screen and shows its finished state otherwise. */
(function(){
  var RM=false; try{RM=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  var ES=(document.documentElement.lang||'').slice(0,2)==='es';
  var ASK=ES?[
    ['¿Cuál es el mejor restaurante para ir en familia?','Tú','Restaurante familiar','turestaurante.com'],
    ['Consultor de IA cerca de mí','Tú','Consultor de IA','tunombre.com'],
    ['Retiro de surf en El Salvador','Tú','Retiro de surf','turetiro.com'],
    ['Villa de playa cerca del aeropuerto de El Salvador','Tú','Villa de playa','tuvilla.com'],
    ['Mejores tours privados en El Salvador','Tú','Tours privados','tustours.com'],
    ['¿Quién puede dar una charla sobre liderazgo?','Tú','Conferencista','tunombre.com']
  ]:[
    ['Which is the best restaurant for families?','You','Family restaurant','yourrestaurant.com'],
    ['AI consultant near me','You','AI consultant','yourname.com'],
    ['Surf retreat in El Salvador','You','Surf retreat','yourretreat.com'],
    ["Beach villa near El Salvador's airport",'You','Beach villa','yourvilla.com'],
    ['Best private tours in El Salvador','You','Private tours','yourtours.com'],
    ['Who can give a keynote on leadership?','You','Keynote speaker','yourname.com']
  ];
  var TYPE=ES?['Tu nombre','Tu marca','Tu negocio','Tu hotel','Tus tours']:['Your name','Your brand','Your business','Your hotel','Your tours'];
  var GLYPH='#%&?@!*/<>$=+';

  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function later(st,fn,ms){var id=setTimeout(fn,ms);st.t.push(id);return id}
  function clear(st){st.t.forEach(clearTimeout);st.t=[];if(st.iv){clearInterval(st.iv);st.iv=0}}

  var H={
    ask:{
      play:function(el,st){
        var q=$('.fx-ask-q',el),who=$('.fx-ask-who b',el),what=$('.fx-ask-who small',el),src=$('.fx-ask-src',el);
        if(st.i==null)st.i=1;
        function set(s){el.classList.remove('fx-s0','fx-s1','fx-s2');if(s)el.classList.add(s)}
        function run(){
          var d=ASK[st.i%ASK.length];st.i++;
          set('fx-s0');q.textContent='';
          later(st,function(){
            set('fx-s1');who.textContent=d[1];what.textContent=d[2];src.textContent=d[3];
            var n=0;(function type(){q.textContent=d[0].slice(0,++n);if(n<d[0].length)later(st,type,30+Math.random()*28);else later(st,function(){
              set('fx-s2');later(st,function(){set('');later(st,run,3400)},650)},300)})();
          },350);
        }
        later(st,run,st.started?600:2600);st.started=1;
      },
      stop:function(el){el.classList.remove('fx-s0','fx-s1','fx-s2')}
    },
    guess:{
      init:function(el,st){
        st.bad=$$('.fx-bad .fx-glist span',el).map(function(s){return [s,s.textContent]});
        st.good=$$('.fx-good .fx-glist span',el).map(function(s){return [s,s.textContent]});
        st.badCard=$('.fx-bad',el);
      },
      play:function(el,st){
        function scramble(s,txt,ms,done){
          var t0=Date.now();
          (function f(){var p=Math.min(1,(Date.now()-t0)/ms),k=Math.floor(txt.length*p),o=txt.slice(0,k);
            for(var i=k;i<txt.length;i++)o+=txt[i]===' '?' ':GLYPH[Math.random()*GLYPH.length|0];
            s.textContent=o;if(p<1)later(st,f,45);else{s.textContent=txt;if(done)done()}})();
        }
        function glitch(){st.badCard.classList.remove('fx-glitch');void st.badCard.offsetWidth;st.badCard.classList.add('fx-glitch')}
        function cycle(){
          el.classList.add('fx-armed');el.classList.remove('fx-stamped');
          st.bad.concat(st.good).forEach(function(p){p[0].parentNode.classList.remove('fx-done','fx-chk')});
          st.good.forEach(function(p){p[0].textContent=''});
          var t=300;
          st.bad.forEach(function(p){later(st,function(){p[0].parentNode.classList.add('fx-done');scramble(p[0],p[1],520)},t);t+=360});
          later(st,glitch,t);t+=500;
          st.good.forEach(function(p){
            later(st,function(){
              var li=p[0].parentNode,n=0,pen=document.createElement('i');pen.className='fx-pen';
              li.classList.add('fx-done');p[0].textContent='';p[0].after(pen);
              (function w(){p[0].textContent=p[1].slice(0,++n);if(n<p[1].length)later(st,w,26);else{pen.remove();li.classList.add('fx-chk')}})();
            },t);
            t+=p[1].length*26+260;
          });
          later(st,function(){el.classList.add('fx-stamped')},t+200);
          later(st,function(){var k=0;st.iv=setInterval(function(){var p=st.bad[k++%st.bad.length];scramble(p[0],p[1],380);if(k%2)glitch()},1300)},t+600);
          later(st,function(){clearInterval(st.iv);st.iv=0;cycle()},t+6200);
        }
        cycle();
      },
      stop:function(el,st){
        el.classList.remove('fx-armed','fx-stamped');
        st.bad.concat(st.good).forEach(function(p){p[0].textContent=p[1];p[0].parentNode.classList.remove('fx-done','fx-chk')});
        $$('.fx-pen',el).forEach(function(x){x.remove()});
      }
    },
    type:{
      play:function(el,st){
        st.base=st.base||el.getAttribute('placeholder');var i=0;
        function busy(){return document.activeElement===el||el.value}
        function word(){
          if(busy()){el.setAttribute('placeholder',st.base);later(st,word,1500);return}
          var s=TYPE[i++%TYPE.length]+'…',n=0;
          (function add(){el.setAttribute('placeholder',s.slice(0,++n));if(n<s.length)later(st,add,70);else later(st,del,1400)})();
          function del(){if(busy())return word();el.setAttribute('placeholder',s.slice(0,--n));if(n>0)later(st,del,30);else later(st,word,250)}
        }
        later(st,word,600);
      },
      stop:function(el,st){if(st.base)el.setAttribute('placeholder',st.base)}
    },
    loop:{},
    race:{
      init:function(el,st){
        st.day=$('.fx-r-day b',el);st.max=+el.getAttribute('data-days')||41;st.prom=+el.getAttribute('data-promised')||30;
        st.us=$('.fx-r-us',el);st.fu=$('.fx-r-us .fx-r-track i',el);st.ok=$('.fx-r-ok',el);st.late=$('.fx-r-late',el);st.pin=$('.fx-r-pin',el);
        st.lanes=$$('.fx-r-msg',el).map(function(m){return {m:m,s:m.firstElementChild,steps:JSON.parse(m.getAttribute('data-steps')),fin:m.firstElementChild.textContent,cur:''}});
      },
      play:function(el,st){
        function say(L,txt,bad){if(L.cur===txt)return;L.cur=txt;L.s.textContent=txt;L.m.classList.toggle('fx-bad2',!!bad);L.m.classList.remove('fx-swap');void L.m.offsetWidth;L.m.classList.add('fx-swap')}
        function show(d){
          st.day.textContent=d;
          st.fu.style.setProperty('--p',Math.min(1,d/3));
          st.ok.style.setProperty('--p',Math.min(1,d/st.prom));
          st.late.style.setProperty('--p',d<=st.prom?0:(d-st.prom)/(st.max-st.prom));
          st.pin.classList.toggle('fx-miss',d>st.prom);
          el.classList.toggle('fx-pre',d<3);
          if(d===3){st.us.classList.remove('fx-won');void st.us.offsetWidth;st.us.classList.add('fx-won')}
          st.lanes.forEach(function(L){var txt=L.cur,bad=0;L.steps.forEach(function(p){if(p[0]<=d){txt=p[1];bad=p[2]}});if(d>0)say(L,txt,bad)});
        }
        function run(){
          st.lanes.forEach(function(L){L.cur=''});
          var t=0;show(0);
          for(var d=1;d<=st.max;d++){(function(day){later(st,function(){show(day)},t)})(d);t+=d<3?700:d===3?1000:(d===st.prom?900:170)}
          later(st,run,t+2800);
        }
        run();
      },
      stop:function(el,st){
        st.day.textContent=st.max;el.classList.remove('fx-pre');st.pin.classList.add('fx-miss');
        [st.fu,st.ok,st.late].forEach(function(x){x.style.setProperty('--p',1)});
        st.lanes.forEach(function(L){L.s.textContent=L.fin;L.cur=L.fin;L.m.classList.remove('fx-swap')});
        st.lanes[1].m.classList.add('fx-bad2');
      }
    },
    proof:{
      always:1,
      init:function(el,st){
        var chips=$$('.fx-pchip',el),slides=$$('.fx-pslide',el),stage=$('.fx-pstage',el),url=$('.fx-purl',el);
        st.i=0;
        st.show=function(i,user){
          var h0=stage.offsetHeight;
          st.i=(i+slides.length)%slides.length;
          chips.forEach(function(c,j){c.setAttribute('aria-selected',j===st.i?'true':'false');c.tabIndex=j===st.i?0:-1});
          slides.forEach(function(s,j){s.classList.toggle('is-on',j===st.i);s.classList.remove('fx-lit');s.setAttribute('aria-hidden',j===st.i?'false':'true')});
          if(!RM&&h0){var h1=slides[st.i].offsetHeight;if(h1!==h0){stage.style.height=h0+'px';void stage.offsetHeight;stage.style.height=h1+'px';clearTimeout(st.ht);st.ht=setTimeout(function(){stage.style.height=''},500)}}
          if(url&&slides[st.i].getAttribute('data-url'))url.textContent=slides[st.i].getAttribute('data-url');
          var s=slides[st.i];if(RM)s.classList.add('fx-lit');else setTimeout(function(){s.classList.add('fx-lit')},60);
          if(user)st.hold=1;
        };
        chips.forEach(function(c,j){
          c.addEventListener('click',function(){st.show(j,1)});
          c.addEventListener('keydown',function(e){var k=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(k){e.preventDefault();st.show(st.i+k,1);chips[st.i].focus()}});
        });
        el.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')st.hover=1});
        el.addEventListener('pointerleave',function(){st.hover=0});
        st.show(0);
      },
      play:function(el,st){
        if(RM)return;
        st.iv=setInterval(function(){if(!st.hover&&!st.hold&&!el.contains(document.activeElement))st.show(st.i+1)},7000);
      }
    }
  };

  var els=$$('[data-fx]');if(!els.length)return;
  els.forEach(function(el){
    var h=H[el.getAttribute('data-fx')];if(!h)return;
    el._fx={t:[]};
    if(h.init&&(!RM||h.always))h.init(el,el._fx);
  });
  if(!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    var el=e.target,h=H[el.getAttribute('data-fx')],st=el._fx;if(!h||!st)return;
    if(e.isIntersecting){
      if(el.classList.contains('fx-on'))return;
      el.classList.add('fx-on');
      if(h.play&&(!RM||h.always))h.play(el,st);
    }else if(el.classList.contains('fx-on')){
      el.classList.remove('fx-on');clear(st);if(h.stop&&!RM)h.stop(el,st);
    }
  })},{threshold:.25});
  els.forEach(function(el){io.observe(el)});
})();
