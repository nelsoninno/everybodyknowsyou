/* Article visuals: each [data-afx] plays while on screen and shows its finished state otherwise. */
(function(){
  var RM=false;try{RM=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function later(st,fn,ms){st.t.push(setTimeout(fn,ms))}
  function clear(st){st.t.forEach(clearTimeout);st.t=[];if(st.raf)cancelAnimationFrame(st.raf);st.raf=0}
  var H={
    dots:{
      init:function(el,st){st.d=$$('.afx-grid i',el);st.n=el.querySelector('.afx-num');st.k=+el.getAttribute('data-k')||8;
        st.fix=[12,27,33,46,58,61,74,89].slice(0,st.k)},
      done:function(el,st){st.d.forEach(function(d,i){d.classList.toggle('on',st.fix.indexOf(i)>-1)});st.n.textContent=st.k},
      play:function(el,st){
        function run(){
          st.d.forEach(function(d){d.classList.remove('on')});st.n.textContent=0;
          var pick=[];while(pick.length<st.k){var r=Math.random()*100|0;if(pick.indexOf(r)<0)pick.push(r)}
          pick.forEach(function(i,j){later(st,function(){st.d[i].classList.add('on');st.n.textContent=j+1},500+j*320)});
          later(st,run,500+st.k*320+3200);
        }
        run();
      }
    },
    swap:{
      init:function(el,st){st.p=$$('.afx-p',el)},
      done:function(el,st){st.p.forEach(function(p,i){p.classList.remove('ask');p.classList.toggle('flip',i===2)})},
      play:function(el,st){
        var last=2;
        function run(){
          st.p.forEach(function(p){p.classList.remove('ask','flip')});
          var i;do{i=Math.random()*st.p.length|0}while(i===last);last=i;
          later(st,function(){st.p[i].classList.add('ask')},700);
          later(st,function(){st.p[i].classList.add('flip')},1900);
          later(st,function(){st.p[i].classList.remove('ask')},3300);
          later(st,run,5600);
        }
        run();
      }
    },
    zero:{
      init:function(el,st){st.g=$$('.afx-ring',el)},
      done:function(el,st){st.g.forEach(function(g){var v=+g.getAttribute('data-v');g.style.setProperty('--p',v);g.querySelector('b').textContent=v})},
      play:function(el,st){
        st.g.forEach(function(g,k){var v=+g.getAttribute('data-v'),b=g.querySelector('b');g.style.setProperty('--p',0);b.textContent=0;
          later(st,function(){var t0=performance.now();(function f(now){var p=Math.min(1,(now-t0)/1600),x=v*(1-Math.pow(1-p,3));g.style.setProperty('--p',x.toFixed(1));b.textContent=Math.round(x);if(p<1)requestAnimationFrame(f)})(t0)},300+k*500)});
      }
    },
    ladder:{
      init:function(el,st){st.s=$$('.afx-step',el);st.r=el.querySelector('.afx-rec')},
      done:function(el,st){st.s.forEach(function(s){s.classList.add('on')});st.r.classList.add('on')},
      play:function(el,st){
        function run(){
          st.s.forEach(function(s){s.classList.remove('on')});st.r.classList.remove('on');
          st.s.forEach(function(s,i){later(st,function(){s.classList.add('on')},600+i*750)});
          later(st,function(){st.r.classList.add('on')},600+st.s.length*750);
          later(st,run,600+st.s.length*750+3600);
        }
        run();
      }
    },
    answer:{
      init:function(el,st){st.l=$$('.afx-link',el);st.a=el.querySelector('.afx-say');st.txt=st.a.getAttribute('data-say')},
      done:function(el,st){st.l.forEach(function(l){l.classList.remove('hi')});st.a.textContent=st.txt;el.classList.add('said')},
      play:function(el,st){
        function run(){
          el.classList.remove('said');st.a.textContent='';
          st.l.forEach(function(l,i){later(st,function(){st.l.forEach(function(x){x.classList.remove('hi')});l.classList.add('hi')},300+i*260)});
          var t=300+st.l.length*260+200;
          later(st,function(){st.l.forEach(function(x){x.classList.remove('hi')})},t);
          var n=0;later(st,function type(){st.a.textContent=st.txt.slice(0,++n);if(n<st.txt.length)later(st,type,38);else el.classList.add('said')},t+300);
          later(st,run,t+300+st.txt.length*38+3400);
        }
        run();
      }
    },
    meter:{done:function(el){el.classList.add('in')},play:function(el){el.classList.remove('in');void el.offsetWidth;el.classList.add('in')}}
  };
  var els=$$('[data-afx]');if(!els.length)return;
  els.forEach(function(el){var h=H[el.getAttribute('data-afx')];if(!h)return;el._afx={t:[]};if(h.init)h.init(el,el._afx);h.done(el,el._afx)});
  if(RM||!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    var el=e.target,h=H[el.getAttribute('data-afx')],st=el._afx;if(!h||!st)return;
    if(e.isIntersecting&&!st.on){st.on=1;h.play(el,st)}
    else if(!e.isIntersecting&&st.on){st.on=0;clear(st);h.done(el,st)}
  })},{threshold:.3});
  els.forEach(function(el){if(el._afx)io.observe(el)});
})();
