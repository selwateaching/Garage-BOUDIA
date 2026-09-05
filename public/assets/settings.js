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
