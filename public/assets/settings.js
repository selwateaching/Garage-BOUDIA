// Paramètres du garage — stockés localement dans le navigateur (localStorage)
// Chaque copie déployée (un garage = un déploiement) a ses propres paramètres.
const MPG_DEFAULTS = {
  nom: '',
  adresse: '',
  ville: '',
  tel: '',
  email: '',
  nif: '',
  rc: '',
  ai: '',
  logo: '',
  tampon: '',
  mecaA: 'Mécanicien A',
  mecaB: 'Mécanicien B',
  mecaC: 'Mécanicien C'
};

function mpgGetSettings(){
  try{
    const s = JSON.parse(localStorage.getItem('mpg_settings') || '{}');
    return Object.assign({}, MPG_DEFAULTS, s);
  }catch(e){
    return Object.assign({}, MPG_DEFAULTS);
  }
}

function mpgSaveSettings(partial){
  const s = Object.assign(mpgGetSettings(), partial);
  localStorage.setItem('mpg_settings', JSON.stringify(s));
  return s;
}

// Met à jour le titre de l'onglet du navigateur avec le nom réel du garage
function mpgSetPageTitle(pageLabel){
  const s = mpgGetSettings();
  document.title = pageLabel + ' — ' + (s.nom || 'MecaPulse Garage');
}

// Applique les paramètres enregistrés sur les éléments marqués data-mpg="cle"
function mpgApplySettings(){
  const s = mpgGetSettings();
  document.querySelectorAll('[data-mpg]').forEach(el=>{
    const key = el.dataset.mpg;
    if(!(key in s) || !s[key]) return;
    const tag = el.tagName;
    if(tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT'){
      el.value = s[key];
    }else{
      el.textContent = s[key];
    }
  });
  return s;
}

// Sauvegarde automatique quand un champ marqué data-mpg est modifié
function mpgBindAutoSave(){
  document.querySelectorAll('[data-mpg]').forEach(el=>{
    el.addEventListener('change', ()=>{
      mpgSaveSettings({ [el.dataset.mpg]: el.value });
    });
  });
}

// Affiche une image de paramètre (logo ou tampon) si configurée (image #imgId), sinon garde le repli visible (#fallbackId)
function mpgApplyImage(key, imgId, fallbackId){
  const s = mpgGetSettings();
  const img = document.getElementById(imgId);
  const fb = fallbackId ? document.getElementById(fallbackId) : null;
  if(img && s[key]){
    img.src = s[key];
    img.style.display = 'block';
    if(fb) fb.style.display = 'none';
  }
}
function mpgApplyLogo(imgId, fallbackId){ mpgApplyImage('logo', imgId, fallbackId); }
function mpgApplyTampon(imgId, fallbackId){ mpgApplyImage('tampon', imgId, fallbackId); }

// ══ CLIENTS (particuliers / entreprises) ══
function mpgGetClients(){
  try{ return JSON.parse(localStorage.getItem('mpg_clients') || '[]'); }
  catch(e){ return []; }
}
function mpgSaveClients(list){
  localStorage.setItem('mpg_clients', JSON.stringify(list));
}
// Ajoute ou met à jour un client (identifié par nom, insensible à la casse). Retourne le client sauvegardé.
function mpgUpsertClient(client){
  const list = mpgGetClients();
  const nomKey = (client.nom||'').trim().toLowerCase();
  if(!nomKey) return null;
  const idx = list.findIndex(c => (c.nom||'').trim().toLowerCase() === nomKey);
  if(idx >= 0){
    list[idx] = Object.assign({}, list[idx], client, { id: list[idx].id });
  }else{
    client.id = 'c' + Date.now() + Math.floor(Math.random()*1000);
    list.push(client);
  }
  mpgSaveClients(list);
  return idx >= 0 ? list[idx] : client;
}
function mpgFindClientByName(nom){
  const nomKey = (nom||'').trim().toLowerCase();
  if(!nomKey) return null;
  return mpgGetClients().find(c => (c.nom||'').trim().toLowerCase() === nomKey) || null;
}
function mpgDeleteClient(id){
  mpgSaveClients(mpgGetClients().filter(c => c.id !== id));
}
// Remplit un <datalist id="datalistId"> avec les noms de tous les clients enregistrés
function mpgFillClientDatalist(datalistId){
  const dl = document.getElementById(datalistId);
  if(!dl) return;
  dl.innerHTML = mpgGetClients().map(c => `<option value="${String(c.nom||'').replace(/"/g,'&quot;')}">`).join('');
}

// ══ FACTURES (émises à partir d'un devis signé ou validé manuellement) + PAIEMENTS ══
function mpgGetFactures(){
  try{ return JSON.parse(localStorage.getItem('mpg_factures') || '[]'); }
  catch(e){ return []; }
}
function mpgSaveFactures(list){
  localStorage.setItem('mpg_factures', JSON.stringify(list));
}
// Génère le prochain numéro de facture (F-001, F-002...)
function mpgNextFactureNum(){
  let n=parseInt(localStorage.getItem('facture_n')||'0')+1;
  localStorage.setItem('facture_n', n);
  return 'F-'+String(n).padStart(3,'0');
}
// Enregistre (ou met à jour) une facture, identifiée par son numéro.
function mpgSaveFacture(record){
  const list = mpgGetFactures();
  const idx = list.findIndex(f => f.numero === record.numero);
  if(idx >= 0){
    record.paiements = list[idx].paiements || [];
    list[idx] = Object.assign({}, list[idx], record);
  }else{
    record.paiements = record.paiements || [];
    list.push(record);
  }
  mpgSaveFactures(list);
  return record;
}
function mpgAddPayment(numero, paiement){
  const list = mpgGetFactures();
  const idx = list.findIndex(f => f.numero === numero);
  if(idx < 0) return null;
  list[idx].paiements = list[idx].paiements || [];
  list[idx].paiements.push(paiement);
  mpgSaveFactures(list);
  return list[idx];
}
// 'paye' | 'partiel' | 'impaye'
function mpgStatutPaiement(record){
  const paye = (record.paiements||[]).reduce((s,p)=>s+(parseFloat(p.montant)||0),0);
  const ttc = parseFloat(record.montantTTC)||0;
  if(paye <= 0) return 'impaye';
  if(paye >= ttc - 0.01) return 'paye';
  return 'partiel';
}
function mpgTotalPaye(record){
  return (record.paiements||[]).reduce((s,p)=>s+(parseFloat(p.montant)||0),0);
}

// Ouvre Gmail (compose) dans un nouvel onglet avec destinataire / sujet / corps pré-remplis.
// Ne peut pas joindre automatiquement un fichier (limitation navigateur) : le PDF doit être
// téléchargé puis joint manuellement dans Gmail.
function mpgOpenGmail(to, subject, body){
  const url = 'https://mail.google.com/mail/?view=cm&fs=1'
    + '&to=' + encodeURIComponent(to || '')
    + '&su=' + encodeURIComponent(subject || '')
    + '&body=' + encodeURIComponent(body || '');
  window.open(url, '_blank');
}

// ══ MENU LATÉRAL (cartes) ══
// Injecte un menu de navigation en cartes, fixé à gauche, sur toutes les pages.
// Appeler mpgRenderSidebar('cle', 'dark'|'light') une fois le <body> chargé.
const MPG_PAGES = [
  { key: 'index',      href: 'index.html',      label: 'Ordre de réparation', icon: '🔧' },
  { key: 'devis',      href: 'devis.html',      label: 'Devis',               icon: '📄' },
  { key: 'stock',      href: 'stock.html',      label: 'Stock',               icon: '📦' },
  { key: 'clients',    href: 'clients.html',    label: 'Clients',             icon: '👥' },
  { key: 'recettes',   href: 'recettes.html',   label: 'Recettes',            icon: '💰' },
  { key: 'parametres', href: 'parametres.html', label: 'Paramètres',          icon: '⚙️' }
];

function mpgRenderSidebar(activeKey, theme){
  theme = (theme === 'light') ? 'light' : 'dark';
  const s = mpgGetSettings();

  if(!document.getElementById('mpg-sidebar-style')){
    const style = document.createElement('style');
    style.id = 'mpg-sidebar-style';
    style.textContent = `
#mpg-sidebar{position:fixed;left:0;top:0;bottom:0;width:216px;z-index:1000;padding:22px 14px;
  display:flex;flex-direction:column;gap:22px;overflow-y:auto;font-family:'Barlow','DM Sans',sans-serif;
  box-sizing:border-box;}
#mpg-sidebar.mpg-dark{background:#141414;border-right:1px solid #2a2a2a;}
#mpg-sidebar.mpg-light{background:#fff;border-right:1px solid #e5e5e5;}
.mpg-brand{display:flex;align-items:center;gap:10px;padding:0 4px;}
.mpg-brand-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  font-size:1.1rem;flex-shrink:0;}
#mpg-sidebar.mpg-dark .mpg-brand-icon{background:#2d2500;border:1px solid #e8b400;color:#e8b400;}
#mpg-sidebar.mpg-light .mpg-brand-icon{background:#fdeaea;border:1px solid #cc2222;color:#cc2222;}
.mpg-brand-text{display:flex;flex-direction:column;line-height:1.3;min-width:0;}
.mpg-brand-text strong{font-size:.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mpg-brand-text span{font-size:.65rem;text-transform:uppercase;letter-spacing:1px;}
#mpg-sidebar.mpg-dark .mpg-brand-text strong{color:#f0ece4;}
#mpg-sidebar.mpg-dark .mpg-brand-text span{color:#a89f8c;}
#mpg-sidebar.mpg-light .mpg-brand-text strong{color:#111;}
#mpg-sidebar.mpg-light .mpg-brand-text span{color:#888;}
.mpg-nav{display:flex;flex-direction:column;gap:8px;}
.mpg-nav-card{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:8px;text-decoration:none;
  font-size:.82rem;font-weight:500;transition:border-color .15s,background .15s,color .15s;}
#mpg-sidebar.mpg-dark .mpg-nav-card{background:#1c1c1c;border:1px solid #2a2a2a;color:#a89f8c;}
#mpg-sidebar.mpg-dark .mpg-nav-card:hover{border-color:#e8b400;color:#f0ece4;}
#mpg-sidebar.mpg-dark .mpg-nav-card.active{background:#2d2500;border-color:#e8b400;color:#e8b400;}
#mpg-sidebar.mpg-light .mpg-nav-card{background:#f7f7f7;border:1px solid #e8e8e8;color:#555;}
#mpg-sidebar.mpg-light .mpg-nav-card:hover{border-color:#cc2222;color:#111;}
#mpg-sidebar.mpg-light .mpg-nav-card.active{background:#fdeaea;border-color:#cc2222;color:#cc2222;}
.mpg-nav-icon{font-size:1rem;flex-shrink:0;}
#mpg-burger{position:fixed;top:14px;left:14px;z-index:1002;width:38px;height:38px;border-radius:8px;
  display:none;align-items:center;justify-content:center;cursor:pointer;font-size:1.1rem;}
#mpg-sidebar.mpg-dark ~ #mpg-burger,body.mpg-sidebar-dark #mpg-burger{background:#1c1c1c;border:1px solid #2a2a2a;color:#e8b400;}
body.mpg-sidebar-light #mpg-burger{background:#fff;border:1px solid #e5e5e5;color:#cc2222;}
#mpg-overlay{display:none;}
@media(max-width:880px){
  #mpg-sidebar{transform:translateX(-100%);transition:transform .25s ease;box-shadow:2px 0 24px rgba(0,0,0,.4);}
  body.mpg-sidebar-open #mpg-sidebar{transform:translateX(0);}
  #mpg-burger{display:flex;}
  body.mpg-sidebar-open #mpg-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;}
}
@media(min-width:881px){
  body.mpg-has-sidebar{padding-left:252px;}
}
@media print{
  #mpg-sidebar,#mpg-burger,#mpg-overlay{display:none !important;}
  body.mpg-has-sidebar{padding-left:0 !important;}
}
`;
    document.head.appendChild(style);
  }

  const cardsHtml = MPG_PAGES.map(p =>
    `<a class="mpg-nav-card${p.key === activeKey ? ' active' : ''}" href="${p.href}">`
    + `<span class="mpg-nav-icon">${p.icon}</span><span class="mpg-nav-label">${p.label}</span></a>`
  ).join('');

  const markupHost = document.createElement('div');
  markupHost.innerHTML =
    `<button id="mpg-burger" aria-label="Ouvrir le menu">☰</button>`
    + `<div id="mpg-overlay"></div>`
    + `<aside id="mpg-sidebar" class="mpg-${theme}">`
    +   `<div class="mpg-brand"><div class="mpg-brand-icon">🔧</div>`
    +   `<div class="mpg-brand-text"><strong>${(s.nom || 'MecaPulse Garage')}</strong><span>Menu</span></div></div>`
    +   `<nav class="mpg-nav">${cardsHtml}</nav>`
    + `</aside>`;

  const ref = document.body.firstChild;
  Array.from(markupHost.childNodes).forEach(node => document.body.insertBefore(node, ref));

  document.body.classList.add('mpg-has-sidebar', theme === 'light' ? 'mpg-sidebar-light' : 'mpg-sidebar-dark');

  const burger = document.getElementById('mpg-burger');
  const overlay = document.getElementById('mpg-overlay');
  if(burger) burger.addEventListener('click', () => document.body.classList.toggle('mpg-sidebar-open'));
  if(overlay) overlay.addEventListener('click', () => document.body.classList.remove('mpg-sidebar-open'));
}
