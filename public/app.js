// TennisMatch — Frontend API client & App logic

const API = '/api';

// ---- API helper ----

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(API + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
  return data;
}

// ---- Auth state ----

let currentUser = null;

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function clearAuth() { localStorage.removeItem('token'); currentUser = null; }

async function loadCurrentUser() {
  if (!getToken()) return null;
  try {
    currentUser = await apiFetch('/auth/me');
    return currentUser;
  } catch {
    clearAuth();
    return null;
  }
}

// ---- Level mapping ----

const LEVELS = {
  1: { label: '初心者',   cls: 'level-1' },
  2: { label: '初中級',   cls: 'level-2' },
  3: { label: '中級',     cls: 'level-3' },
  4: { label: '上級',     cls: 'level-4' },
  5: { label: '競技',     cls: 'level-5' },
};

// ---- State ----

let currentFilter = 'all';
let selectedPlan  = 'yearly';
let activeChatUserId = null;
let chatPolling = null;
let unreadPolling = null;

// ---- Nav ----

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.getElementById(view + '-view').classList.add('active');
  const tab = document.getElementById('tab-' + view);
  if (tab) tab.classList.add('active');

  if (view === 'home')    loadPosts();
  if (view === 'msg')     loadThreads();
  if (view === 'records') loadRecords();
  if (view === 'profile') renderProfile();

  // Stop chat polling when leaving msg
  if (view !== 'msg') stopChatPolling();
}

// ---- Auth forms ----

function showAuthView(mode) {
  document.getElementById('auth-view').classList.add('active');
  document.getElementById('home-view').classList.remove('active');
  document.getElementById('auth-tab').style.display = '';
  renderAuthForm(mode);
}

function renderAuthForm(mode) {
  const isLogin = mode === 'login';
  document.getElementById('auth-form').innerHTML = `
    <h2 class="auth-title">${isLogin ? 'ログイン' : '新規登録'}</h2>
    ${!isLogin ? `
    <div class="input-row">
      <div class="input-label">名前</div>
      <input class="input-field" id="auth-name" placeholder="山田 太郎">
    </div>` : ''}
    <div class="input-row">
      <div class="input-label">メールアドレス</div>
      <input class="input-field" id="auth-email" type="email" placeholder="you@example.com">
    </div>
    <div class="input-row">
      <div class="input-label">パスワード</div>
      <input class="input-field" id="auth-password" type="password" placeholder="${isLogin ? '' : '6文字以上'}">
    </div>
    ${!isLogin ? `
    <div class="input-row">
      <div class="input-label">レベル</div>
      <select class="input-field" id="auth-level">
        <option value="1">初心者</option>
        <option value="2" selected>初中級</option>
        <option value="3">中級</option>
        <option value="4">上級</option>
        <option value="5">競技</option>
      </select>
    </div>
    <div class="input-row">
      <div class="input-label">活動エリア</div>
      <input class="input-field" id="auth-area" placeholder="例: 東京都渋谷区">
    </div>` : ''}
    <button class="btn-primary" onclick="submitAuth('${mode}')">
      ${isLogin ? 'ログイン' : 'アカウント作成'}
    </button>
    <div style="text-align:center;margin-top:12px">
      <span style="font-size:0.875rem;color:var(--label2)">
        ${isLogin ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
        <span style="color:var(--accent);cursor:pointer" onclick="renderAuthForm('${isLogin ? 'register' : 'login'}')">
          ${isLogin ? '新規登録' : 'ログイン'}
        </span>
      </span>
    </div>
  `;
}

async function submitAuth(mode) {
  try {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    let data;
    if (mode === 'login') {
      data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    } else {
      const name  = document.getElementById('auth-name').value.trim();
      const level = parseInt(document.getElementById('auth-level').value);
      const area  = document.getElementById('auth-area').value.trim();
      data = await apiFetch('/auth/register', { method: 'POST', body: { name, email, password, level, area } });
    }

    setToken(data.token);
    currentUser = data.user;
    onLoggedIn();
    showToast(`ようこそ、${currentUser.name}さん！`);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function onLoggedIn() {
  document.getElementById('auth-view').classList.remove('active');
  document.getElementById('auth-tab').style.display = 'none';
  updateNavForAuth();
  switchView('home');
  startUnreadPolling();
}

function logout() {
  clearAuth();
  updateNavForAuth();
  switchView('home');
  showToast('ログアウトしました');
  stopChatPolling();
  clearInterval(unreadPolling);
}

function updateNavForAuth() {
  const loggedIn = !!currentUser;
  document.getElementById('nav-login-btn').style.display = loggedIn ? 'none' : '';
  document.getElementById('nav-user-icon').style.display = loggedIn ? '' : 'none';
  if (loggedIn) {
    document.getElementById('nav-user-icon').textContent = currentUser.avatar || '🎾';
  }
}

// ---- Posts ----

async function loadPosts() {
  const list = document.getElementById('match-list');
  list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--label3)">読み込み中...</div>';
  try {
    const params = new URLSearchParams();
    if (currentFilter !== 'all') params.set('level', currentFilter);
    const posts = await apiFetch('/posts?' + params);
    renderPosts(posts);
  } catch (err) {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red)">${err.message}</div>`;
  }
}

function renderPosts(posts) {
  const list = document.getElementById('match-list');
  if (!posts.length) {
    list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--label3)">募集がありません</div>';
    return;
  }

  list.innerHTML = posts.map(p => {
    const lv = LEVELS[p.user_level] || LEVELS[2];
    const timeAgo = relativeTime(p.created_at);
    const isOwn = currentUser && p.user_id === currentUser.id;
    return `
      <div class="match-card">
        <div class="match-card-top">
          <div class="avatar ${p.user_premium ? 'premium-user' : ''}">${escHtml(p.user_avatar || '🎾')}</div>
          <div class="match-card-meta">
            <div class="match-user-row">
              <div class="match-username">${escHtml(p.user_name)}</div>
              <div class="match-time">${timeAgo}</div>
            </div>
            <span class="level-badge ${lv.cls}">${lv.label}</span>
          </div>
        </div>
        <div class="match-title">${escHtml(p.title)}</div>
        ${p.body ? `<div style="font-size:0.8125rem;color:var(--label2);margin:4px 0">${escHtml(p.body)}</div>` : ''}
        <div class="match-tags">
          <span class="tag">📅 ${escHtml(p.date_str)} ${escHtml(p.time_slot)}</span>
          ${(p.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
          <span class="tag">👥 ${p.applicants}人申込み</span>
        </div>
        <div class="match-card-bottom">
          <div class="match-location">📍 ${escHtml(p.location)}</div>
          ${isOwn
            ? `<button class="btn-apply applied" onclick="deletePost(${p.id})">削除</button>`
            : `<button class="btn-apply ${p.applied ? 'applied' : ''}" onclick="applyPost(event,${p.id},${p.user_id})">
                ${p.applied ? '申込み済み' : '参加する'}
              </button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

async function applyPost(e, postId, ownerId) {
  e.stopPropagation();
  if (!currentUser) { showToast('ログインが必要です'); showAuthView('login'); return; }
  try {
    await apiFetch(`/posts/${postId}/apply`, { method: 'POST', body: { message: '' } });
    showToast('参加申込みを送りました！');
    loadPosts();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

async function deletePost(id) {
  if (!confirm('この募集を削除しますか？')) return;
  try {
    await apiFetch(`/posts/${id}`, { method: 'DELETE' });
    showToast('削除しました');
    loadPosts();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function filterLevel(el, level) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentFilter = level;
  loadPosts();
}

// ---- Post form ----

async function submitPost() {
  if (!currentUser) { showToast('ログインが必要です'); showAuthView('login'); return; }
  try {
    const title    = document.getElementById('post-title').value.trim();
    const body     = document.getElementById('post-body').value.trim();
    const date_str = document.getElementById('post-date').value;
    const time_slot= document.getElementById('post-time').value;
    const location = document.getElementById('post-location').value.trim();
    const level_min= parseInt(document.getElementById('post-level-min').value);
    const level_max= parseInt(document.getElementById('post-level-max').value);

    await apiFetch('/posts', {
      method: 'POST',
      body: { title, body, date_str, time_slot, location, level_min, level_max },
    });
    showToast('投稿しました！');
    document.getElementById('post-title').value = '';
    document.getElementById('post-body').value = '';
    document.getElementById('post-location').value = '';
    switchView('home');
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

// ---- Messages ----

async function loadThreads() {
  const list = document.getElementById('thread-list');
  if (!currentUser) {
    list.innerHTML = '<div class="auth-prompt">ログインするとメッセージを使えます</div>';
    return;
  }
  try {
    const threads = await apiFetch('/messages');
    if (!threads.length) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--label3)">メッセージはありません</div>';
      return;
    }
    list.innerHTML = threads.map(t => `
      <div class="msg-card" onclick="openChat(${t.partner.id}, '${escHtml(t.partner.name)}')">
        <div class="msg-avatar">
          ${t.partner.avatar || '🎾'}
          ${t.unread_count > 0 ? '<div class="msg-unread-dot"></div>' : ''}
        </div>
        <div class="msg-body">
          <div class="msg-name-row">
            <div class="msg-name">${escHtml(t.partner.name)}</div>
            <div class="msg-time">${relativeTime(t.last_message.created_at)}</div>
          </div>
          <div class="msg-preview ${t.unread_count > 0 ? 'unread' : ''}">
            ${escHtml(t.last_message.body)}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div style="padding:20px;color:var(--red)">${err.message}</div>`;
  }
}

function openChat(userId, name) {
  activeChatUserId = userId;
  document.getElementById('thread-list').style.display = 'none';
  const chat = document.getElementById('chat-panel');
  chat.style.display = 'flex';
  document.getElementById('chat-name').textContent = name;
  loadChatMessages();
  stopChatPolling();
  chatPolling = setInterval(loadChatMessages, 3000);
}

function closeChat() {
  stopChatPolling();
  activeChatUserId = null;
  document.getElementById('chat-panel').style.display = 'none';
  document.getElementById('thread-list').style.display = '';
  loadThreads();
}

function stopChatPolling() {
  if (chatPolling) { clearInterval(chatPolling); chatPolling = null; }
}

async function loadChatMessages() {
  if (!activeChatUserId) return;
  try {
    const msgs = await apiFetch(`/messages/${activeChatUserId}`);
    const box = document.getElementById('chat-messages');
    box.innerHTML = msgs.map(m => {
      const mine = m.sender_id === currentUser.id;
      return `
        <div class="chat-msg ${mine ? 'mine' : 'theirs'}">
          <div class="bubble">${escHtml(m.body)}</div>
          <div class="bubble-time">${relativeTime(m.created_at)}</div>
        </div>
      `;
    }).join('');
    box.scrollTop = box.scrollHeight;
    updateUnreadBadge();
  } catch {}
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const body = input.value.trim();
  if (!body) return;
  try {
    await apiFetch(`/messages/${activeChatUserId}`, { method: 'POST', body: { body } });
    input.value = '';
    loadChatMessages();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

// ---- Unread badge ----

async function updateUnreadBadge() {
  if (!currentUser) return;
  try {
    const { count } = await apiFetch('/messages/unread/count');
    const badge = document.getElementById('msg-badge');
    badge.style.display = count > 0 ? '' : 'none';
    badge.textContent = count > 9 ? '9+' : count;
  } catch {}
}

function startUnreadPolling() {
  updateUnreadBadge();
  unreadPolling = setInterval(updateUnreadBadge, 15000);
}

// ---- Records ----

async function loadRecords() {
  const container = document.getElementById('records-container');
  if (!currentUser) {
    container.innerHTML = '<div class="auth-prompt">ログインして戦績を記録しましょう</div>';
    return;
  }
  try {
    const { records, stats } = await apiFetch('/records');
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-win').textContent   = stats.wins;
    document.getElementById('stat-lose').textContent  = stats.losses;
    document.getElementById('stat-rate').textContent  = stats.rate != null ? stats.rate + '%' : '—';

    const list = document.getElementById('records-list');
    if (!records.length) {
      list.innerHTML = '<div class="empty-records"><div class="empty-icon">🎾</div>まだ戦績がありません。</div>';
      return;
    }
    list.innerHTML = records.map(r => `
      <div class="record-card ${r.win ? 'win' : 'lose'}">
        <button class="record-delete" onclick="deleteRecord(${r.id})">✕</button>
        <div class="record-badge">${r.win ? 'WIN' : 'LOSE'}</div>
        <div class="record-body">
          <div class="record-opponent">vs ${escHtml(r.opponent)}</div>
          <div class="record-score">${r.sets_me} - ${r.sets_opp}  ${r.score ? '(' + escHtml(r.score) + ')' : ''}</div>
          <div class="record-meta">
            📅 ${new Date(r.played_at).toLocaleDateString('ja-JP')}
            ${r.location ? ' · 📍 ' + escHtml(r.location) : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="padding:20px;color:var(--red)">${err.message}</div>`;
  }
}

async function addRecord() {
  const opponent  = document.getElementById('rec-opponent').value.trim();
  const location  = document.getElementById('rec-location').value.trim();
  const win       = document.getElementById('rec-result').value === 'win';
  const sets_me   = parseInt(document.getElementById('rec-sets-me').value) || 0;
  const sets_opp  = parseInt(document.getElementById('rec-sets-opp').value) || 0;

  if (!opponent) { showToast('対戦相手を入力してください'); return; }

  try {
    await apiFetch('/records', { method: 'POST', body: { opponent, location, win, sets_me, sets_opp } });
    showToast('戦績を保存しました');
    document.getElementById('rec-opponent').value = '';
    document.getElementById('rec-location').value = '';
    document.getElementById('rec-sets-me').value = '';
    document.getElementById('rec-sets-opp').value = '';
    loadRecords();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

async function deleteRecord(id) {
  try {
    await apiFetch(`/records/${id}`, { method: 'DELETE' });
    showToast('削除しました');
    loadRecords();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

// ---- Profile ----

function renderProfile() {
  if (!currentUser) return;
  document.getElementById('profile-name').textContent  = currentUser.name;
  document.getElementById('profile-area').textContent  = LEVELS[currentUser.level]?.label + ' · ' + (currentUser.area || '未設定');
  document.getElementById('profile-avatar-el').textContent = currentUser.avatar || '🎾';
  document.getElementById('premium-menu-label').textContent =
    currentUser.premium ? '⭐ プレミアム会員中' : 'プレミアムにアップグレード';
}

// ---- Premium ----

function showPremium() {
  document.getElementById('premium-modal').classList.add('show');
}

function closePremium() {
  document.getElementById('premium-modal').classList.remove('show');
}

function selectPlan(plan) {
  selectedPlan = plan;
  document.getElementById('plan-monthly').classList.toggle('selected', plan === 'monthly');
  document.getElementById('plan-yearly').classList.toggle('selected', plan === 'yearly');
}

async function subscribe() {
  if (!currentUser) { closePremium(); showAuthView('login'); return; }
  try {
    const { url } = await apiFetch('/stripe/checkout', { method: 'POST', body: { plan: selectedPlan } });
    window.location.href = url;
  } catch (err) {
    // Stripe未設定の場合
    showToast('⚠️ ' + err.message);
    closePremium();
  }
}

// ---- Toast ----

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---- Util ----

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function relativeTime(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'たった今';
  if (diff < 3600)   return Math.floor(diff / 60) + '分前';
  if (diff < 86400)  return Math.floor(diff / 3600) + '時間前';
  return Math.floor(diff / 86400) + '日前';
}

// ---- Init ----

window.addEventListener('DOMContentLoaded', async () => {
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('post-date');
  if (dateEl) dateEl.value = today;

  await loadCurrentUser();
  updateNavForAuth();

  if (currentUser) {
    startUnreadPolling();
  }

  // Stripe success callback
  const params = new URLSearchParams(location.search);
  if (params.get('premium') === 'success') {
    showToast('🎉 プレミアム登録完了！');
    history.replaceState({}, '', '/');
    await loadCurrentUser();
    renderProfile();
  }

  switchView('home');
});
