(() => {
  const root = document.querySelector('[data-r69-arcade]');
  if (!root) return;
  const $ = (s, p=root) => p.querySelector(s);
  const $$ = (s, p=root) => [...p.querySelectorAll(s)];
  const save = (k,v) => localStorage.setItem(k,String(v));
  const load = (k,d=0) => Number(localStorage.getItem(k) || d);
  const apiConfigured=(window.RASSO69_API||'').replace(/\/$/,'');
  const scoresApi=(!apiConfigured||apiConfigured.includes('example.com'))?'https://test-production-0d4e.up.railway.app':apiConfigured;
  const gameMeta={
    street:{unit:'pts',format:v=>`${Math.round(v)} pts`},
    launch:{unit:'ms',format:v=>`${Math.round(v)} ms`},
    drift:{unit:'pts',format:v=>`${Math.round(v)} pts`},
    pit:{unit:'s',format:v=>`${Number(v).toFixed(2)} s`},
    memory:{unit:'coups',format:v=>`${Math.round(v)} coups`}
  };
  const playerInput=$('[data-player-name]');
  const playerStatus=$('[data-player-status]');
  let playerName='';
  try{playerName=(localStorage.getItem('r69_player_name')||'').replace(/^@+/,'');}catch(e){}
  if(playerInput){
    playerInput.value=playerName;
    playerInput.addEventListener('input',()=>{
      playerName=playerInput.value.trim().replace(/^@+/,'').replace(/[^a-zA-Z0-9._]/g,'').slice(0,30);
      playerInput.value=playerName;
      try{localStorage.setItem('r69_player_name',playerName);}catch(e){}
      if(playerStatus)playerStatus.textContent=playerName.length>=2?`Scores enregistrés pour @${playerName}`:'Entre au moins 2 caractères.';
    });
    if(playerName&&playerStatus)playerStatus.textContent=`Scores enregistrés pour @${playerName}`;
  }
  let toastTimer=0;
  function scoreToast(text){
    let el=document.querySelector('.r69-score-toast');
    if(!el){el=document.createElement('div');el.className='r69-score-toast';document.body.appendChild(el);}
    el.textContent=text;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2600);
  }
  const escScore=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function loadTop3(){
    const boards=$$('[data-board]');
    await Promise.all(boards.map(async board=>{
      const game=board.dataset.board,listEl=$('[data-board-list]',board);
      try{
        const r=await fetch(`${scoresApi}/api/leaderboard?game=${encodeURIComponent(game)}&limit=3&_=${Date.now()}`,{cache:'no-store'});
        if(!r.ok)throw new Error('Classement indisponible');
        const d=await r.json(),items=d.items||[];
        listEl.innerHTML=items.length?items.map((x,i)=>`<div class="r69-top3-row"><span class="r69-top3-rank">${i+1}</span><span class="r69-top3-player">@${escScore(x.player)}</span><span class="r69-top3-score">${gameMeta[game].format(x.score)}</span></div>`).join(''):'<div class="r69-top3-empty">Aucun score pour le moment.</div>';
      }catch(e){listEl.innerHTML='<div class="r69-top3-empty">Connexion au classement en cours…</div>';}
    }));
  }
  async function submitGameScore(game,score){
    if(!gameMeta[game]||!Number.isFinite(Number(score))||Number(score)<=0)return;
    if(!playerName||playerName.length<2){
      scoreToast('Entre ton pseudo sous les jeux pour apparaître dans le Top 3.');
      playerInput?.focus();return;
    }
    try{
      const r=await fetch(`${scoresApi}/api/scores`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player:playerName,game,score:Number(score)})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'Score non enregistré');
      scoreToast(d.improved?'Nouveau record envoyé au classement !':'Ton meilleur score est déjà supérieur.');
      await loadTop3();
    }catch(e){scoreToast('Classement temporairement indisponible.');}
  }
  loadTop3();
  setInterval(loadTop3,30000);

  // Navigation arcade
  $$('[data-arcade-tab]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-arcade-tab]').forEach(b => b.classList.toggle('is-active', b === btn));
    $$('[data-arcade-panel]').forEach(p => p.classList.toggle('is-active', p.dataset.arcadePanel === btn.dataset.arcadeTab));
  }));

  // 01 Street Run
  (() => {
    const box = $('[data-game-street]'); if (!box) return;
    const canvas=$('[data-street-canvas]',box),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,lanes=[W*.25,W*.5,W*.75];
    const scoreEl=$('[data-street-score]',box),bestEl=$('[data-street-best]',box),speedEl=$('[data-street-speed]',box),overlay=$('[data-street-overlay]',box),title=$('[data-street-title]',box),msg=$('[data-street-message]',box);
    let best=load('r69_street_best'),state=null,frame,last=0; bestEl.textContent=best;
    const laneRect=(l,y,w,h)=>({x:lanes[l]-w/2,y,width:w,height:h});
    const hit=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
    const move=d=>{if(state?.running)state.lane=Math.max(0,Math.min(2,state.lane+d));};
    function reset(){state={running:true,lane:1,score:0,speed:245,road:0,spawn:0,bonus:2,obs:[],bon:[],boost:false};scoreEl.textContent=0;speedEl.textContent='1.0x';overlay.hidden=true;last=performance.now();cancelAnimationFrame(frame);frame=requestAnimationFrame(loop);}
    function over(){state.running=false;cancelAnimationFrame(frame);const s=Math.floor(state.score);if(s>best){best=s;save('r69_street_best',best);bestEl.textContent=best;title.textContent='Nouveau record !';}else title.textContent='Run terminé';msg.textContent=`Score : ${s} — Record : ${best}`;$('[data-street-start]',box).textContent='Rejouer';overlay.hidden=false;submitGameScore('street',s);}
    function update(dt){const diff=1+Math.min(state.score/900,1.7),spd=state.speed*diff*(state.boost?1.45:1);state.road=(state.road+spd*dt)%120;state.score+=dt*16*diff*(state.boost?1.45:1);state.spawn-=dt;state.bonus-=dt;if(state.spawn<=0){state.obs.push({lane:Math.floor(Math.random()*3),y:-110,type:['car','cone','van'][Math.floor(Math.random()*3)]});state.spawn=Math.max(.42,1.12-state.score/1800)+Math.random()*.38;}if(state.bonus<=0){state.bon.push({lane:Math.floor(Math.random()*3),y:-60,spin:0});state.bonus=3.2+Math.random()*3.4;}state.obs.forEach(o=>o.y+=spd*dt);state.bon.forEach(b=>{b.y+=spd*dt;b.spin+=dt*5;});const player=laneRect(state.lane,H-128,58,96);for(const o of state.obs){const z=o.type==='cone'?[38,50]:o.type==='van'?[66,112]:[58,96];if(hit(player,laneRect(o.lane,o.y,z[0],z[1])))return over();}state.bon=state.bon.filter(b=>{if(hit(player,laneRect(b.lane,b.y,42,42))){state.score+=120;return false;}return b.y<H+80;});state.obs=state.obs.filter(o=>o.y<H+140);scoreEl.textContent=Math.floor(state.score);speedEl.textContent=`${diff.toFixed(1)}x`;}
    function rr(x,y,w,h,r,c){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=c;ctx.fill();}
    function road(){ctx.fillStyle='#050508';ctx.fillRect(0,0,W,H);ctx.fillStyle='#17171d';ctx.fillRect(42,0,W-84,H);ctx.fillStyle='#ff4b0b';ctx.fillRect(38,0,4,H);ctx.fillRect(W-42,0,4,H);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=5;ctx.setLineDash([50,70]);ctx.lineDashOffset=state?.road||0;[W/3,W*2/3].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();});ctx.setLineDash([]);}
    function car(x,y,c='#ff4b0b',w=58,h=96){rr(x-w/2,y,w,h,14,c);rr(x-w/2+9,y+15,w-18,30,8,'#111116');ctx.fillStyle='#fff';ctx.fillRect(x-w/2+7,y+h-20,8,14);ctx.fillRect(x+w/2-15,y+h-20,8,14);}
    function draw(){road();if(!state)return;state.bon.forEach(b=>{ctx.save();ctx.translate(lanes[b.lane],b.y+21);ctx.rotate(b.spin);ctx.fillStyle='#ff4b0b';ctx.fillRect(-20,-20,40,40);ctx.fillStyle='#fff';ctx.font='900 11px Arial';ctx.textAlign='center';ctx.fillText('ADV',0,4);ctx.restore();});state.obs.forEach(o=>o.type==='cone'?(ctx.fillStyle='#ff7a1a',ctx.beginPath(),ctx.moveTo(lanes[o.lane],o.y),ctx.lineTo(lanes[o.lane]-19,o.y+50),ctx.lineTo(lanes[o.lane]+19,o.y+50),ctx.fill()):car(lanes[o.lane],o.y,o.type==='van'?'#ddd':'#666',o.type==='van'?66:58,o.type==='van'?112:96));car(lanes[state.lane],H-128);}
    function loop(now){const dt=Math.min((now-last)/1000,.035);last=now;if(state.running){update(dt);draw();frame=requestAnimationFrame(loop);}}
    $('[data-street-start]',box).addEventListener('click',reset);$('[data-street-left]',box).addEventListener('click',()=>move(-1));$('[data-street-right]',box).addEventListener('click',()=>move(1));const boost=$('[data-street-boost]',box);['pointerdown','touchstart'].forEach(e=>boost.addEventListener(e,()=>state&&(state.boost=true)));['pointerup','pointerleave','touchend'].forEach(e=>boost.addEventListener(e,()=>state&&(state.boost=false)));window.addEventListener('keydown',e=>{if(!box.closest('.is-active'))return;if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')move(-1);if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')move(1);if(e.code==='Space'||e.key==='ArrowUp')state&&(state.boost=true);});window.addEventListener('keyup',e=>{if(e.code==='Space'||e.key==='ArrowUp')state&&(state.boost=false);});road();
  })();

  // 02 Launch Control
  (()=>{
    const box=$('[data-game-launch]'); if(!box)return; const lights=$$('.r69-start-lights i',box),arm=$('[data-launch-arm]',box),go=$('[data-launch-go]',box),msg=$('[data-launch-message]',box),lastEl=$('[data-launch-last]',box),bestEl=$('[data-launch-best]',box); let timer,greenAt=0,armed=false,best=load('r69_launch_best',0);bestEl.textContent=best?`${best} ms`:'—';
    arm.addEventListener('click',()=>{clearTimeout(timer);armed=true;greenAt=0;lights.forEach(l=>l.className='');go.disabled=false;msg.textContent='Attends le feu vert…';let i=0;const seq=setInterval(()=>{if(!armed){clearInterval(seq);return;}if(i<5){lights[i].classList.add('red');i++;}else{clearInterval(seq);timer=setTimeout(()=>{lights.forEach(l=>{l.classList.remove('red');l.classList.add('green');});greenAt=performance.now();msg.textContent='GO !';},700+Math.random()*1800);}},280);});
    go.addEventListener('click',()=>{if(!armed)return;if(!greenAt){armed=false;clearTimeout(timer);lights.forEach(l=>l.className='');msg.textContent='Faux départ ! Recommence.';lastEl.textContent='FAUX';return;}const t=Math.round(performance.now()-greenAt);armed=false;lastEl.textContent=`${t} ms`;if(!best||t<best){best=t;save('r69_launch_best',best);bestEl.textContent=`${best} ms`;msg.textContent='Nouveau record de réaction !';}else msg.textContent=t<250?'Réflexe de pilote !':t<400?'Très bon départ.':'Tu peux faire mieux.';submitGameScore('launch',t);});
  })();

  // 03 ADV Circuit — conduite lente et accessible
  (()=>{
    const box=$('[data-game-drift]'); if(!box) return;
    const canvas=$('[data-drift-canvas]',box),ctx=canvas.getContext('2d');
    const scoreEl=$('[data-drift-score]',box),comboEl=$('[data-drift-combo]',box),speedEl=$('[data-drift-speed]',box),timeEl=$('[data-drift-time]',box),bestEl=$('[data-drift-best]',box),angleEl=$('[data-drift-angle]',box),chainEl=$('[data-drift-chain]',box),overlay=$('[data-drift-overlay]',box),title=$('[data-drift-title]',box),message=$('[data-drift-message]',box);
    const W=canvas.width,H=canvas.height;
    let controls={left:false,right:false},running=false,last=0,raf=0;
    let carX=W/2,carVX=0,distance=0,score=0,time=60,lives=3,flash=0;
    let best=load('r69_circuit_best',0);
    bestEl.textContent=best;

    const ROAD_HALF=115;
    const CAR_Y=H-92;
    const SEG=36;
    const SPEED=72; // volontairement lent

    const bindHold=(el,key)=>{
      if(!el)return;
      el.addEventListener('pointerdown',e=>{e.preventDefault();controls[key]=true;el.setPointerCapture?.(e.pointerId)});
      ['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,()=>controls[key]=false));
    };
    bindHold($('[data-drift-left]',box),'left');
    bindHold($('[data-drift-right]',box),'right');

    function roadCenter(worldY){
      return W/2
        + Math.sin(worldY/310)*105
        + Math.sin(worldY/135)*34
        + Math.sin(worldY/720)*42;
    }
    function roadWidth(worldY){
      return ROAD_HALF + Math.sin(worldY/240)*10;
    }
    function reset(){
      carX=W/2;carVX=0;distance=0;score=0;time=60;lives=3;flash=0;
      updateHud('PRÊT');
    }
    function startRun(){
      reset();running=true;overlay.classList.add('is-hidden');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
    }
    function finish(reason='Course terminée'){
      running=false;cancelAnimationFrame(raf);const final=Math.floor(score);
      if(final>best){best=final;save('r69_circuit_best',best);bestEl.textContent=best;title.textContent='NOUVEAU RECORD !';}
      else title.textContent=reason;
      message.textContent=`${final} points · ${Math.floor(distance/10)} m parcourus. Reste au centre de la piste et anticipe les virages.`;
      overlay.classList.remove('is-hidden');$('[data-drift-start]',box).textContent='Rejouer';submitGameScore('drift',final);
    }
    function updateHud(status){
      scoreEl.textContent=Math.floor(score);
      comboEl.textContent=`${lives} VIE${lives>1?'S':''}`;
      speedEl.textContent='LENT';
      timeEl.textContent=Math.max(0,time).toFixed(1);
      angleEl.textContent=status;
      chainEl.textContent=`Distance : ${Math.floor(distance/10)} m`;
    }
    function update(dt){
      time-=dt;
      distance+=SPEED*dt;
      const steer=(controls.right?1:0)-(controls.left?1:0);
      carVX+=steer*175*dt;
      carVX*=Math.pow(.18,dt);
      carX+=carVX*dt;

      const worldY=distance + (H-CAR_Y);
      const center=roadCenter(worldY);
      const half=roadWidth(worldY)-20;
      const delta=carX-center;
      let status='BONNE TRAJECTOIRE';

      if(Math.abs(delta)<half*.42){
        score+=dt*22;
        status='TRAJECTOIRE IDÉALE';
      }else if(Math.abs(delta)<half){
        score+=dt*10;
        status=delta<0?'RECENTRE À DROITE →':'← RECENTRE À GAUCHE';
      }else{
        flash=.32;
        lives--;
        score=Math.max(0,score-120);
        carX=center + Math.sign(delta)*half*.55;
        carVX*=-.25;
        status='SORTIE DE PISTE';
        if(lives<=0){finish('Voiture immobilisée');return;}
      }

      carX=Math.max(30,Math.min(W-30,carX));
      flash=Math.max(0,flash-dt);
      updateHud(status);
      if(time<=0)finish();
    }
    function drawRoad(){
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#07530f';ctx.fillRect(0,0,W,H);

      const left=[],right=[];
      for(let sy=-SEG;sy<=H+SEG;sy+=SEG){
        const worldY=distance+(H-sy);
        const c=roadCenter(worldY),half=roadWidth(worldY);
        left.push({x:c-half,y:sy});right.push({x:c+half,y:sy});
      }

      ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);
      left.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
      [...right].reverse().forEach(p=>ctx.lineTo(p.x,p.y));
      ctx.closePath();ctx.fillStyle='#22242a';ctx.fill();

      ctx.strokeStyle='#f5f5f5';ctx.lineWidth=5;
      ctx.beginPath();left.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
      ctx.beginPath();right.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();

      ctx.setLineDash([22,24]);ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.65)';
      ctx.beginPath();
      for(let sy=-SEG;sy<=H+SEG;sy+=SEG){
        const worldY=distance+(H-sy),c=roadCenter(worldY);
        if(sy===-SEG)ctx.moveTo(c,sy);else ctx.lineTo(c,sy);
      }
      ctx.stroke();ctx.setLineDash([]);

      // vibreurs simples
      for(let sy=-20;sy<H+20;sy+=28){
        const worldY=distance+(H-sy),c=roadCenter(worldY),half=roadWidth(worldY);
        ctx.fillStyle=((Math.floor((sy+distance)/28)%2)===0)?'#ff4b0b':'#fff';
        ctx.fillRect(c-half-7,sy,7,16);ctx.fillRect(c+half,sy,7,16);
      }
    }
    function drawCar(){
      const worldY=distance+(H-CAR_Y);
      const c1=roadCenter(worldY),c2=roadCenter(worldY+18);
      const roadAngle=Math.atan2(c2-c1,18)*.38;
      ctx.save();ctx.translate(carX,CAR_Y);ctx.rotate(roadAngle + carVX*.0017);
      ctx.fillStyle=flash?'#fff':'#ff4b0b';ctx.beginPath();ctx.roundRect(-18,-32,36,64,10);ctx.fill();
      ctx.fillStyle='#111116';ctx.beginPath();ctx.roundRect(-13,-18,26,25,6);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='900 9px Arial';ctx.textAlign='center';ctx.fillText('ADV',0,23);
      ctx.restore();
    }
    function draw(){
      drawRoad();drawCar();
      if(flash){ctx.fillStyle=`rgba(255,255,255,${flash})`;ctx.fillRect(0,0,W,H);}
    }
    function loop(now){
      const dt=Math.min((now-last)/1000,.035);last=now;
      if(running){update(dt);draw();raf=requestAnimationFrame(loop);}
    }
    $('[data-drift-start]',box).addEventListener('click',startRun);
    window.addEventListener('keydown',e=>{if(!box.closest('.is-active'))return;const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')controls.left=true;if(k==='arrowright'||k==='d')controls.right=true;});
    window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')controls.left=false;if(k==='arrowright'||k==='d')controls.right=false;});
    drawRoad();drawCar();
  })();

  // 04 Pit Stop
  (()=>{
    const box=$('[data-game-pit]');if(!box)return;const nuts=$$('[data-nut]',box),timeEl=$('[data-pit-time]',box),bestEl=$('[data-pit-best]',box),msg=$('[data-pit-message]',box);let startAt=0,active=false,raf,best=Number(localStorage.getItem('r69_pit_best')||0);bestEl.textContent=best?`${best.toFixed(2)} s`:'—';
    function tick(){if(!active)return;timeEl.textContent=((performance.now()-startAt)/1000).toFixed(2);raf=requestAnimationFrame(tick);}
    function start(){nuts.forEach(n=>n.classList.remove('is-done'));active=true;startAt=performance.now();msg.textContent='Vite ! Retire les 5 écrous.';cancelAnimationFrame(raf);tick();}
    nuts.forEach(n=>n.addEventListener('click',()=>{if(!active||n.classList.contains('is-done'))return;n.classList.add('is-done');if(nuts.every(x=>x.classList.contains('is-done'))){active=false;cancelAnimationFrame(raf);const t=(performance.now()-startAt)/1000;timeEl.textContent=t.toFixed(2);if(!best||t<best){best=t;localStorage.setItem('r69_pit_best',String(best));bestEl.textContent=`${best.toFixed(2)} s`;msg.textContent='Nouveau record au stand !';}else msg.textContent=`Roue terminée en ${t.toFixed(2)} secondes.`;submitGameScore('pit',Number(t.toFixed(2)));}}));$('[data-pit-start]',box).addEventListener('click',start);
  })();

  // 05 Memory
  (()=>{
    const box=$('[data-game-memory]');if(!box)return;const grid=$('[data-memory-grid]',box),movesEl=$('[data-memory-moves]',box),bestEl=$('[data-memory-best]',box),msg=$('[data-memory-message]',box);let first=null,lock=false,moves=0,pairs=0,best=load('r69_memory_best',0);bestEl.textContent=best||'—';
    const icons=['🏁','🔧','🛞','⚡'];
    function start(){grid.innerHTML='';moves=0;pairs=0;first=null;lock=false;movesEl.textContent=0;msg.textContent='Retrouve les quatre paires du garage.';[...icons,...icons].sort(()=>Math.random()-.5).forEach((icon,i)=>{const b=document.createElement('button');b.type='button';b.className='r69-memory-card';b.dataset.icon=icon;b.innerHTML=`<span>ADV</span><strong>${icon}</strong>`;b.addEventListener('click',()=>flip(b));grid.appendChild(b);});}
    function flip(card){if(lock||card.classList.contains('is-open')||card.classList.contains('is-found'))return;card.classList.add('is-open');if(!first){first=card;return;}moves++;movesEl.textContent=moves;if(first.dataset.icon===card.dataset.icon){first.classList.add('is-found');card.classList.add('is-found');first=null;pairs++;if(pairs===4){if(!best||moves<best){best=moves;save('r69_memory_best',best);bestEl.textContent=best;msg.textContent='Nouveau record du garage !';}else msg.textContent=`Terminé en ${moves} coups.`;submitGameScore('memory',moves);}}else{lock=true;setTimeout(()=>{first.classList.remove('is-open');card.classList.remove('is-open');first=null;lock=false;},700);}}
    $('[data-memory-start]',box).addEventListener('click',start);start();
  })();
})();
