
// auth_bridge.js - small module to bridge Firebase auth functions with app UI
import { adminLogin, adminLogout, onAuthChanged } from './app_reservas_firebase.js';
import { initAdminReservationsPanel, hidePublicReservationScreen, showPublicReservationScreen } from './reservations_ui.js';

// handle login form submit
document.addEventListener('DOMContentLoaded', ()=>{
  const loginForm = document.getElementById('login-form');
  const loader = document.getElementById('loader');
  const accessFixedBtn = document.getElementById('access-panel-btn-fixed');

  // hide loader quickly on DOM ready if still present
  if (loader) { setTimeout(()=>{ loader.style.opacity = '0'; setTimeout(()=> loader.style.display='none', 300); }, 250); }

  const loginError = document.getElementById('login-error');
  const accessFixed = document.getElementById('access-panel-btn-fixed');
  const loginScreen = document.getElementById('login-screen');
  const appRoot = document.getElementById('app-root');

  if (accessFixed) {
    accessFixed.addEventListener('click', ()=>{
      if (loginScreen) {
        loginScreen.style.display = 'flex';
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      loginError.innerText = '';
      const email = loginForm.email.value.trim();
      const pass = loginForm.pass.value.trim();
      try {
        const res = await adminLogin(email, pass);
        if (!res.ok) {
          loginError.innerText = res.error || 'Credenciales inválidas';
        } else {
          // success -> onAuthChanged will handle UI; hide login screen
          if (loginScreen) loginScreen.style.display = 'none';
        }
      } catch(err) {
        loginError.innerText = err.message || 'Error autenticando';
      }
    });
  }

  // Logout button hook if exists
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', async ()=> { await adminLogout(); });

  // auth state change
  onAuthChanged(user => {
    // hide loader once auth state known
    if (loader) { loader.style.opacity = '0'; setTimeout(()=> loader.style.display='none', 300); }
    if (user) {
      // show app
      if (accessFixedBtn) accessFixedBtn.style.display = 'none';
      if (appRoot) appRoot.style.display = '';
      if (loginScreen) loginScreen.style.display = 'none';
      // ensure public screen removed so it doesn't overlay admin UI
      try { hidePublicReservationScreen(); } catch(e){}
      try { initAdminReservationsPanel(); } catch(e){ console.error(e); }
      try { if (typeof showTab === 'function') { showTab('dashboard-section','tab-dashboard'); } } catch(e){}
      try { if (typeof refreshDashboard === 'function') refreshDashboard(); } catch(e){}
    } else {
      // show public reservation view only
      if (accessFixedBtn) accessFixedBtn.style.display = '';
      if (appRoot) appRoot.style.display = 'none';
      if (loginScreen) loginScreen.style.display = 'none';
      showPublicReservationScreen();
    }
  });
});
