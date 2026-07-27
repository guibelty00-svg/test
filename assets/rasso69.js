(()=>{
  const configured=(window.RASSO69_API||'').replace(/\/$/,'');
  const api=(!configured||configured.includes('example.com'))?'https://test-production-0d4e.up.railway.app':configured;
  const esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let visitorId='';
  try{visitorId=localStorage.getItem('r69_visitor_id')||'';if(!visitorId){visitorId='adv_'+(crypto?.randomUUID?crypto.randomUUID().replace(/-/g,''):(Date.now().toString(36)+Math.random().toString(36).slice(2)));localStorage.setItem('r69_visitor_id',visitorId)}}catch(e){visitorId='adv_'+Date.now().toString(36)+Math.random().toString(36).slice(2)}

  const cd=document.querySelector('[data-countdown]');
  if(cd){const target=new Date(cd.closest('[data-date]').dataset.date);const tick=()=>{const d=target-Date.now();if(d<=0){cd.textContent='ÉVÉNEMENT EN COURS';return}const totalSeconds=Math.floor(d/1000);cd.textContent=`${Math.floor(totalSeconds/60).toLocaleString('fr-FR')} MIN : ${String(totalSeconds%60).padStart(2,'0')} SEC`};tick();setInterval(tick,1000)}

  const liveMembers=document.querySelector('[data-live-members]');
  const activity=document.querySelector('[data-activity-feed]');
  const ago=iso=>{const s=Math.max(0,Math.floor((Date.now()-new Date(iso))/1000));if(s<60)return `il y a ${s}s`;if(s<3600)return `il y a ${Math.floor(s/60)} min`;if(s<86400)return `il y a ${Math.floor(s/3600)} h`;return `il y a ${Math.floor(s/86400)} j`};
  const renderActivity=items=>{if(!activity)return;const icons={upload:'↑',approved:'✓',like:'♡',vote:'★',review:'★'};activity.innerHTML=(items||[]).length?(items||[]).map(x=>`<article class="r69-activity-item"><span class="r69-activity-icon">${icons[x.type]||'•'}</span><div><strong>${esc(x.text)}</strong><small>${esc(x.author||'Rasso.69')}</small></div><time>${ago(x.createdAt)}</time></article>`).join(''):'<div class="r69-loader">Le flux commencera avec les premières publications.</div>'};
  const updateLive=async()=>{try{const r=await fetch(`${api}/api/live?id=${encodeURIComponent(visitorId)}&limit=7&_=${Date.now()}`,{method:'GET',mode:'cors',cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();const members=Math.max(1,Number(d.members||0));if(liveMembers){liveMembers.querySelector('[data-member-count]').textContent=members.toLocaleString('fr-FR');liveMembers.classList.add('is-online')}document.querySelectorAll('[data-stat-members]').forEach(x=>x.textContent=members.toLocaleString('fr-FR'));document.querySelectorAll('[data-stat-media]').forEach(x=>x.textContent=Number(d.media||0).toLocaleString('fr-FR'));document.querySelectorAll('[data-stat-votes]').forEach(x=>x.textContent=Number(d.votes||0).toLocaleString('fr-FR'));renderActivity(d.activity||[])}catch(e){console.error('RASSO69 LIVE',e);liveMembers?.classList.remove('is-online');if(activity)activity.innerHTML='<div class="r69-loader">Connexion au direct en cours…</div>'}};
  if(liveMembers)liveMembers.querySelector('[data-member-count]').textContent='1';
  updateLive();setInterval(updateLive,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateLive()});
  const updateStats=updateLive;
  const loadActivity=updateLive;

  const gallery=document.querySelector('#gallery');
  const ranking=document.querySelector('[data-ranking]');
  let all=[];let currentFilter='all';
  const rankingRender=()=>{if(!ranking)return;const rows=[...all].sort((a,b)=>Number(b.votes||0)-Number(a.votes||0)).slice(0,6);ranking.innerHTML=rows.length?rows.map((x,i)=>`<div class="r69-rank"><strong>${i+1}</strong><div><b>${esc(x.vehicle||x.author||'Projet automobile')}</b><span>${esc(x.author)} · ${esc(x.category||'Autre')}</span></div><em>${Number(x.votes||0)} vote${Number(x.votes||0)>1?'s':''}</em></div>`).join(''):'<div class="r69-loader">Aucun projet en compétition.</div>'};
  const render=()=>{if(!gallery)return;const items=all.filter(x=>currentFilter==='all'||x.type===currentFilter||(currentFilter==='featured'&&x.featured));gallery.innerHTML=items.length?items.map((x,i)=>`<article class="r69-media ${i%7===0?'wide':''}" data-id="${esc(x.id)}"><${x.type==='video'?`video muted playsinline preload="metadata" poster="${esc(x.thumbnailUrl||'')}"`:'img loading="lazy"'} src="${esc(x.url)}" alt="${esc(x.caption||'Publication Rasso.69')}"></${x.type==='video'?'video':'img'}><div class="r69-media-info"><div class="r69-media-meta"><span class="vehicle">${esc(x.vehicle||x.author||'Projet Rasso.69')}</span><strong>${esc(x.author)}</strong><br><span>${esc(x.caption)}</span><br><span class="tag">${esc(x.category||'Autre')}</span></div><div class="r69-social-actions"><button data-like class="${(x.likedBy||[]).includes(visitorId)?'active':''}">♡ ${Number(x.likes||0)}</button><button data-vote class="${(x.votedBy||[]).includes(visitorId)?'active':''}">★ ${Number(x.votes||0)}</button><span>◉ ${Number(x.views||0)}</span></div></div></article>`).join(''):'<div class="r69-loader">Aucun contenu publié pour le moment. Sois le premier.</div>';rankingRender()};
  const loadMedia=async()=>{if(!gallery)return;try{const r=await fetch(`${api}/api/media?status=approved&_=${Date.now()}`,{cache:'no-store'}),d=await r.json();all=d.items||[];render()}catch(e){gallery.innerHTML='<div class="r69-loader">La galerie sera disponible après connexion du serveur Media Hub.</div>'}};
  loadMedia();
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.filter;render()}));

  if(gallery)gallery.addEventListener('click',async e=>{
    const card=e.target.closest('.r69-media');if(!card)return;const item=all.find(x=>String(x.id)===card.dataset.id);if(!item)return;
    const like=e.target.closest('[data-like]'),vote=e.target.closest('[data-vote]');
    if(like||vote){e.stopPropagation();const endpoint=like?'like':'vote';try{const r=await fetch(`${api}/api/media/${encodeURIComponent(item.id)}/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})}),d=await r.json();if(!r.ok)throw new Error(d.error||'Action impossible');await loadMedia();updateStats();loadActivity()}catch(err){alert(err.message)}return}
    fetch(`${api}/api/media/${encodeURIComponent(item.id)}/view`,{method:'POST'}).catch(()=>{});item.views=Number(item.views||0)+1;
    const lb=document.querySelector('.r69-lightbox');if(!lb)return;lb.querySelector('div').innerHTML=(item.type==='video'?`<video src="${esc(item.url)}" controls autoplay playsinline></video>`:`<img src="${esc(item.url)}" alt="">`)+`<div class="r69-lightbox-info"><strong>${esc(item.vehicle||item.author)}</strong><br><small>${esc(item.author)} · ${esc(item.category||'Autre')} · ${Number(item.views)} vues</small><p>${esc(item.caption)}</p></div>`;lb.hidden=false;render()
  });

  const lb=document.querySelector('.r69-lightbox');if(lb){const close=()=>{lb.hidden=true;lb.querySelector('div').innerHTML=''};lb.querySelector('button').addEventListener('click',close);lb.addEventListener('click',e=>{if(e.target===lb)close()})}

  const form=document.querySelector('#r69-upload-form');
  if(form){const input=form.querySelector('input[type=file]'),title=form.querySelector('.r69-drop strong');input.addEventListener('change',()=>{if(input.files[0])title.textContent=input.files[0].name});form.addEventListener('submit',async e=>{e.preventDefault();const s=form.querySelector('.r69-form-status'),btn=form.querySelector('button[type=submit]'),file=input.files[0];if(!file)return;if(file.size>100*1024*1024){s.textContent='Le fichier dépasse 100 Mo.';return}btn.disabled=true;s.textContent='Envoi et analyse de sécurité en cours…';try{const r=await fetch(`${api}/api/uploads`,{method:'POST',body:new FormData(form)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Erreur');s.textContent=d.message||'Contenu reçu. Il apparaîtra après validation.';form.reset();title.textContent='Dépose une photo ou vidéo';loadActivity()}catch(err){s.textContent='Impossible d’envoyer : '+err.message}finally{btn.disabled=false}})}


  const productSection=document.querySelector('[data-product-section]');
  if(productSection){
    const variantsEl=productSection.querySelector('[data-product-json]');
    const mediaEl=productSection.querySelector('[data-media-json]');
    const variants=variantsEl?JSON.parse(variantsEl.textContent):[];
    const media=mediaEl?JSON.parse(mediaEl.textContent):[];
    const form=productSection.querySelector('[data-product-form]');
    const idInput=productSection.querySelector('[data-variant-id]');
    const price=productSection.querySelector('[data-product-price]');
    const addBtn=productSection.querySelector('[data-add-to-cart]');
    const addLabel=productSection.querySelector('[data-add-label]');
    const status=productSection.querySelector('[data-product-status]');
    const money=cents=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:(window.Shopify&&Shopify.currency&&Shopify.currency.active)||'EUR'}).format(Number(cents||0)/100);
    const selectedOptions=()=>[...productSection.querySelectorAll('.r69-product-option')].map(group=>group.querySelector('input:checked')?.value);
    const updateVariant=()=>{
      const opts=selectedOptions();
      const variant=variants.find(v=>Array.isArray(v.options)&&v.options.every((x,i)=>x===opts[i]));
      if(!variant){addBtn.disabled=true;addLabel.textContent='Combinaison indisponible';return}
      idInput.value=variant.id;
      addBtn.disabled=!variant.available;
      addLabel.textContent=variant.available?'Ajouter au panier':'Indisponible';
      price.innerHTML=(variant.compare_at_price&&variant.compare_at_price>variant.price?`<s>${money(variant.compare_at_price)}</s>`:'')+`<strong>${money(variant.price)}</strong>`;
      const url=new URL(location.href);url.searchParams.set('variant',variant.id);history.replaceState({},'',url);
    };
    productSection.querySelectorAll('.r69-product-option input').forEach(x=>x.addEventListener('change',updateVariant));
    const qty=form?.querySelector('input[name=quantity]');
    productSection.querySelector('[data-qty-minus]')?.addEventListener('click',()=>{qty.value=Math.max(1,Number(qty.value||1)-1)});
    productSection.querySelector('[data-qty-plus]')?.addEventListener('click',()=>{qty.value=Math.max(1,Number(qty.value||1)+1)});
    productSection.querySelectorAll('[data-media-id]').forEach(btn=>btn.addEventListener('click',()=>{
      const item=media.find(x=>String(x.id)===String(btn.dataset.mediaId));if(!item)return;
      productSection.querySelectorAll('[data-media-id]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
      const main=productSection.querySelector('[data-main-media]');
      if(item.type==='image')main.innerHTML=`<img src="${esc(item.preview)}" alt="${esc(item.alt)}">`;
      else if(item.type==='video'&&item.sources?.length){const src=item.sources.find(x=>x.format==='mp4')||item.sources[0];main.innerHTML=`<video src="${esc(src.url)}" controls playsinline></video>`}
    }));
    form?.addEventListener('submit',async e=>{
      e.preventDefault();addBtn.disabled=true;status.textContent='Ajout au panier…';
      try{
        const response=await fetch('/cart/add.js',{method:'POST',headers:{Accept:'application/json'},body:new FormData(form)});
        const data=await response.json();if(!response.ok)throw new Error(data.description||'Impossible d’ajouter ce produit.');
        status.innerHTML='Produit ajouté au panier. <a href="/cart"><strong>Voir le panier →</strong></a>';
        const cart=await fetch('/cart.js').then(r=>r.json());
        document.querySelectorAll('a[href="/cart"]').forEach(link=>{if(link.closest('nav'))link.textContent=`Panier (${cart.item_count})`});
      }catch(err){status.textContent=err.message}finally{addBtn.disabled=false}
    });
  }

})();

// Menu mobile Rasso.69
(() => {
  const toggle = document.querySelector('.r69-menu-toggle');
  const menu = document.querySelector('#r69-mobile-menu');
  const close = document.querySelector('.r69-mobile-menu-close');
  if (!toggle || !menu) return;

  const openMenu = () => {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fermer le menu');
    document.body.classList.add('r69-menu-open');
  };
  const closeMenu = () => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.classList.remove('r69-menu-open');
  };

  toggle.addEventListener('click', () => menu.hidden ? openMenu() : closeMenu());
  close?.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) closeMenu();
  });
})();
