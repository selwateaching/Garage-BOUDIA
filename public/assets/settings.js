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

// Affiche le logo du garage s'il a été configuré (image #imgId), sinon garde le repli visible (#fallbackId)
function mpgApplyLogo(imgId, fallbackId){
  const s = mpgGetSettings();
  const img = document.getElementById(imgId);
  const fb = fallbackId ? document.getElementById(fallbackId) : null;
  if(img && s.logo){
    img.src = s.logo;
    img.style.display = 'block';
    if(fb) fb.style.display = 'none';
  }
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
