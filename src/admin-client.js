export const adminClient = String.raw`
(() => {
  'use strict';
  const q = (s) => document.querySelector(s);
  let token = sessionStorage.getItem('rasso69_admin_token') || '';

  function setLoginMessage(message) {
    const el = q('#loginError');
    if (el) el.textContent = message || '';
  }

  function authHeaders() {
    return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  function mediaUrl(value) {
    if (!value) return '';
    return value.startsWith('http') ? value : location.origin + value;
  }

  function showLogin() {
    q('#login').classList.remove('hidden');
    q('#dashboard').classList.add('hidden');
    q('#logout').classList.add('hidden');
  }

  function showDashboard() {
    q('#login').classList.add('hidden');
    q('#dashboard').classList.remove('hidden');
    q('#logout').classList.remove('hidden');
  }

  function logout(message = '') {
    token = '';
    sessionStorage.removeItem('rasso69_admin_token');
    showLogin();
    setLoginMessage(message);
  }

  async function verifyAndConnect() {
    const input = q('#token');
    const button = q('#connect');
    const entered = input.value.trim();
    if (!entered) {
      setLoginMessage('Entre ton ADMIN_TOKEN.');
      input.focus();
      return;
    }

    token = entered;
    button.disabled = true;
    button.textContent = 'Connexion…';
    setLoginMessage('Vérification du mot de passe…');

    try {
      const response = await fetch('/api/admin/media?status=pending', {
        method: 'GET',
        headers: authHeaders(),
        cache: 'no-store'
      });
      if (response.status === 401) throw new Error('Mot de passe incorrect.');
      if (!response.ok) throw new Error('Erreur serveur : ' + response.status);

      sessionStorage.setItem('rasso69_admin_token', token);
      showDashboard();
      setLoginMessage('');
      await load();
    } catch (error) {
      token = '';
      sessionStorage.removeItem('rasso69_admin_token');
      setLoginMessage(error.message || 'Connexion impossible.');
    } finally {
      button.disabled = false;
      button.textContent = 'Se connecter';
    }
  }

  async function load() {
    const status = q('#status').value;
    q('#message').textContent = 'Chargement…';
    try {
      const response = await fetch('/api/admin/media' + (status ? '?status=' + encodeURIComponent(status) : ''), {
        headers: authHeaders(), cache: 'no-store'
      });
      if (response.status === 401) {
        logout('Session expirée ou mot de passe incorrect.');
        return;
      }
      if (!response.ok) throw new Error('Impossible de charger les médias.');
      const data = await response.json();
      render(data.items || []);
      q('#message').textContent = '';
    } catch (error) {
      q('#message').textContent = error.message || 'Erreur de chargement.';
    }
  }

  function render(items) {
    q('#count').textContent = items.length + ' contenu' + (items.length > 1 ? 's' : '');
    if (!items.length) {
      q('#grid').innerHTML = '<div class="empty">Aucun contenu dans cette catégorie.</div>';
      return;
    }
    q('#grid').innerHTML = items.map((item) => {
      const url = mediaUrl(item.url);
      const media = item.type === 'video'
        ? '<video controls preload="metadata" src="' + esc(url) + '"></video>'
        : '<img loading="lazy" src="' + esc(url) + '" alt="Publication Rasso.69">';
      return '<article class="card"><div class="media">' + media + '</div><div class="body">' +
        '<div class="meta"><span>' + esc(new Date(item.createdAt).toLocaleString('fr-FR')) + '</span><span>' + esc(item.type) + '</span></div>' +
        '<div class="author">@' + esc(item.author || 'anonyme') + '</div>' +
        '<div class="caption">' + esc(item.caption || 'Sans légende') + '</div>' +
        '<span class="badge">' + esc(item.status) + '</span>' +
        (item.featured ? '<span class="badge featured"> Mis en avant</span>' : '') +
        '<div class="actions">' +
        '<button class="approve" data-action="approve" data-id="' + esc(item.id) + '">Accepter</button>' +
        '<button class="reject" data-action="reject" data-id="' + esc(item.id) + '">Refuser</button>' +
        '<button class="feature" data-action="feature" data-id="' + esc(item.id) + '" data-featured="' + Boolean(item.featured) + '">' + (item.featured ? 'Retirer la mise en avant' : 'Mettre en avant') + '</button>' +
        '<button class="delete" data-action="delete" data-id="' + esc(item.id) + '">Supprimer</button>' +
        '</div></div></article>';
    }).join('');
  }

  async function act(action, id, featured) {
    if (action === 'delete' && !confirm('Supprimer définitivement ce contenu ?')) return;
    q('#message').textContent = 'Mise à jour…';
    try {
      const payload = { action };
      if (action === 'feature') payload.featured = featured !== 'true';
      const response = await fetch('/api/admin/media/' + encodeURIComponent(id) + '/action', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        logout('Session expirée ou mot de passe incorrect.');
        return;
      }
      if (!response.ok) throw new Error(data.error || ('Action impossible (' + response.status + ')'));
      q('#message').textContent = '';
      await load();
    } catch (error) {
      q('#message').textContent = '';
      alert(error.message || 'Action impossible.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    q('#connect').addEventListener('click', verifyAndConnect);
    q('#token').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') verifyAndConnect();
    });
    q('#logout').addEventListener('click', () => logout());
    q('#refresh').addEventListener('click', load);
    q('#status').addEventListener('change', load);
    q('#grid').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (button) act(button.dataset.action, button.dataset.id, button.dataset.featured);
    });

    if (token) {
      showDashboard();
      load();
    } else {
      showLogin();
    }
  });
})();
`;
