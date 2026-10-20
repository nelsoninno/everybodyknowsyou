/* Hero layers that scroll at different speeds, and flowers that follow the mouse. */
(function(){
  var RM=false; try{RM=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}

  /* ---- layers: one scroll value, one animation frame, each layer at its own rate ---- */
  var hero=document.querySelector('.hero-scene');
  if(hero&&!RM){
    var L=Array.prototype.map.call(hero.querySelectorAll('[data-depth]'),function(el){return [el,parseFloat(el.getAttribute('data-depth'))||0]});
    var queued=false,last=-1;
    function paint(){
      queued=false;
      var max=hero.offsetTop+hero.offsetHeight,s=Math.min(Math.max(window.scrollY||window.pageYOffset,0),max);
      if(s===last)return;last=s;
      for(var i=0;i<L.length;i++)L[i][0].style.transform='translate3d(0,'+(L[i][1]*s).toFixed(1)+'px,0)';
    }
    function ask(){if(!queued){queued=true;requestAnimationFrame(paint)}}
    window.addEventListener('scroll',ask,{passive:true});
    window.addEventListener('resize',function(){last=-1;ask()});
    paint();
  }

  /* ---- flowers that follow the mouse ---- */
  var fine=false; try{fine=matchMedia('(hover: hover) and (pointer: fine)').matches}catch(e){}
  if(!fine||RM)return;
  var COLORS=['var(--ink)','var(--purple)','mf-lime','var(--pink)'];
  var FLOWER='<svg viewBox="438 283 151 165"><path d="M536.09,419.61c-.52-7.8-2.56-14.15-3.85-22.47,5.84,5.91,10.82,10.49,17.33,15.05,10.2,7.15,24.58,3.77,31.24-6.32,6.65-10.1,4.1-23.96-6.14-31.26-6.41-4.57-13.77-5.98-21.76-9.51,13.99-4.85,28.43-9.08,30.98-23.35,1.5-8.44-1.24-17.23-7.61-22.09-9.36-7.15-20.53-6.81-29.28.17-5.27,4.21-9.6,8.3-15.18,13.56,1.6-8.11,3.62-14.79,4.09-22.67.79-13.05-9.9-23.42-22.35-23.44-12.82-.02-23.15,10.65-22.5,23.75.38,7.69,2.98,13.86,3.87,22.3-4.3-4.91-8.63-8.07-13.02-12.11-10.28-9.47-25.4-8.97-34.22,1.68-8.26,9.98-6.01,26.1,5.29,33.32,6.54,4.18,13.56,5.91,21.26,9.01-8.02,3.42-15.73,5.07-22.22,9.86-10.98,8.1-12.03,24.08-3.31,33.48,9.4,10.14,23.75,9.6,33.91.26l13.28-12.21c-2.11,8.39-4.6,15.86-4.59,24.35.01,12.78,10.87,22.72,23.26,22.27,12.14-.44,22.35-11.11,21.51-23.61Z"/></svg>';
  var N=7,box=document.createElement('div');box.className='mf';box.setAttribute('aria-hidden','true');
  var F=[],H=[],HMAX=90;   /* H: recent mouse positions, so slow flowers can follow the path, not just the point */
  function rnd(i,m){return ((i*9301+49297)%233280)/233280*m}   /* fixed pseudo-random per flower */
  for(var i=0;i<N;i++){
    var s=document.createElement('span');s.innerHTML=FLOWER;
    var c=COLORS[i%COLORS.length];
    if(c==='mf-lime')s.className='mf-lime';else s.style.color=c;
    var size=11+Math.round(rnd(i+3,15));s.style.width=s.style.height=size+'px';
    box.appendChild(s);
    var q=i/(N-1);                       /* 0 = quickest, 1 = slowest */
    F.push({el:s,x:-99,y:-99,vx:0,vy:0,half:size/2,
      lag:q*q*0.9,                        /* seconds behind the mouse along its path: 0 to 0.9 s */
      k:0.145-0.133*q,                    /* pull strength: the slowest pull about 12x softer than the fastest */
      damp:0.80+rnd(i+7,0.1),
      r:26+rnd(i+11,74),                  /* orbit radius once the mouse rests */
      a:i*(Math.PI*2/N),w:(0.5+rnd(i+5,1.4))*(i%2?1:-1),
      tr:3+rnd(i+13,14),spin:0,sp:(i%2?1:-1)*(35+rnd(i+17,120))});
  }
  document.body.appendChild(box);
  var mx=-1,my=-1,moved=0,seen=false,idle=0,raf=0,prev=0,visible=true;
  function at(t){                         /* mouse position at time t, read from the path */
    if(!H.length)return [mx,my];
    for(var j=H.length-1;j>=0;j--){if(H[j][0]<=t){var A=H[j],B=H[j+1]||A,d=B[0]-A[0]||1,u=Math.min(1,(t-A[0])/d);return [A[1]+(B[1]-A[1])*u,A[2]+(B[2]-A[2])*u]}}
    return [H[0][1],H[0][2]];
  }
  document.addEventListener('mousemove',function(e){
    mx=e.clientX;my=e.clientY;moved=performance.now();
    H.push([moved/1000,mx,my]);if(H.length>HMAX)H.shift();
    if(!seen){seen=true;F.forEach(function(f){f.x=mx;f.y=my});box.classList.add('mf-on')}
    if(!visible){visible=true;box.classList.add('mf-on')}
    if(!raf)raf=requestAnimationFrame(tick);
  },{passive:true});
  document.documentElement.addEventListener('mouseleave',function(){visible=false;box.classList.remove('mf-on')});
  document.addEventListener('visibilitychange',function(){if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0}else if(!document.hidden&&seen&&!raf){prev=0;raf=requestAnimationFrame(tick)}});
  function tick(now){
    var dt=prev?Math.min(0.05,(now-prev)/1000):0.016;prev=now;
    var resting=now-moved>350,t=now/1000;
    idle+=((resting?1:0)-idle)*Math.min(1,dt*(resting?1.4:5));
    for(var i=0;i<N;i++){
      var f=F[i],p=at(t-f.lag);
      f.a+=f.w*dt*(0.35+idle*0.65);
      var r=f.tr+(f.r-f.tr)*idle;
      var tx=p[0]+Math.cos(f.a)*r,ty=p[1]+Math.sin(f.a)*r;
      f.vx=(f.vx+(tx-f.x)*f.k)*f.damp;f.vy=(f.vy+(ty-f.y)*f.k)*f.damp;
      f.x+=f.vx;f.y+=f.vy;
      f.spin+=f.sp*dt*(1+idle);
      f.el.style.transform='translate3d('+(f.x-f.half).toFixed(1)+'px,'+(f.y-f.half).toFixed(1)+'px,0) rotate('+f.spin.toFixed(1)+'deg)';
    }
    if(!visible&&now-moved>2500){raf=0;prev=0;return}
    raf=document.hidden?0:requestAnimationFrame(tick);
  }
})();
