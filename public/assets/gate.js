// Verrou d'accès à l'application. Le mot de passe n'est jamais stocké en clair :
// seule son empreinte SHA-256 est comparée. Pour changer/révoquer l'accès (ex: client
// qui ne paie plus), remplacez MPG_ACCESS_HASH par l'empreinte du nouveau mot de passe
// et redéployez — l'ancien mot de passe cesse aussitôt de fonctionner sur tous les postes.
(function(){
  const MPG_ACCESS_HASH = '620e5132be7b50366ce46d7e2145f055fe29a7f0b44b5b6cc2ecd4a1aab7d623';
  const UNLOCK_KEY = 'mpg_unlocked_v1';
  // Fin de la période d'essai — au-delà, l'accès se bloque tout seul, même avec le bon code.
  // Pour prolonger (client qui passe au payant), changez cette date et redéployez.
  const TRIAL_EXPIRES = '2026-09-13T00:00:00';

  async function sha256Hex(text){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  const expired = new Date() >= new Date(TRIAL_EXPIRES);

  if(!expired && localStorage.getItem(UNLOCK_KEY) === MPG_ACCESS_HASH) return;

  document.documentElement.style.visibility = 'hidden';

  function renderExpired(){
    const overlay = document.createElement('div');
    overlay.id = 'mpg-gate';
    overlay.style.cssText = 'position:fixed;inset:0;background:#0a0a0a;color:#f0ece4;display:flex;align-items:center;justify-content:center;z-index:999999;font-family:Barlow,Arial,sans-serif;';
    overlay.innerHTML = `
      <div style="background:#1c1c1c;border:1px solid #3a3a3a;padding:34px 30px;max-width:340px;width:90%;text-align:center;box-sizing:border-box;">
        <div style="font-size:1.15rem;font-weight:700;letter-spacing:1px;margin-bottom:10px;">⏳ Période d'essai terminée</div>
        <div style="font-size:.85rem;color:#a89f8c;line-height:1.6;">Contactez votre prestataire pour continuer à utiliser l'application.</div>
      </div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = 'visible';
  }

  function renderGate(){
    if(expired){ renderExpired(); return; }
    const overlay = document.createElement('div');
    overlay.id = 'mpg-gate';
    overlay.style.cssText = 'position:fixed;inset:0;background:#0a0a0a;color:#f0ece4;display:flex;align-items:center;justify-content:center;z-index:999999;font-family:Barlow,Arial,sans-serif;';
    overlay.innerHTML = `
      <div style="background:#1c1c1c;border:1px solid #3a3a3a;padding:34px 30px;max-width:320px;width:90%;text-align:center;box-sizing:border-box;">
        <div style="font-size:1.15rem;font-weight:700;letter-spacing:1px;margin-bottom:6px;">🔒 Accès protégé</div>
        <div style="font-size:.8rem;color:#a89f8c;margin-bottom:18px;">Entrez le code d'accès fourni par votre prestataire</div>
        <input id="mpg-gate-input" type="password" placeholder="Code d'accès" autocomplete="off" style="width:100%;padding:10px;background:#141414;border:1px solid #3a3a3a;color:#f0ece4;margin-bottom:10px;box-sizing:border-box;font-size:.9rem;">
        <button id="mpg-gate-btn" style="width:100%;padding:10px;background:#e8b400;color:#000;border:none;font-weight:700;cursor:pointer;font-size:.9rem;">Déverrouiller</button>
        <div id="mpg-gate-err" style="color:#e53935;font-size:.78rem;margin-top:10px;display:none;">Code incorrect</div>
      </div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = 'visible';

    const input = document.getElementById('mpg-gate-input');
    const btn = document.getElementById('mpg-gate-btn');
    const err = document.getElementById('mpg-gate-err');

    async function tryUnlock(){
      const hash = await sha256Hex(input.value.trim());
      if(hash === MPG_ACCESS_HASH){
        localStorage.setItem(UNLOCK_KEY, MPG_ACCESS_HASH);
        overlay.remove();
      }else{
        err.style.display = 'block';
        input.value = '';
        input.focus();
      }
    }
    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') tryUnlock(); });
    input.focus();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', renderGate);
  }else{
    renderGate();
  }
})();
