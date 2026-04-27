/* ══════════════════════════════════════
   dhruv. vault — script.js
══════════════════════════════════════ */

let token = '';  // never auto-restore — require fresh login each visit
let selectedFile = null;

/* ── CURSOR ── */
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow) {
  document.addEventListener('mousemove', e => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top  = e.clientY + 'px';
  });
}

/* ── PARTICLES ── */
(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const dots = Array.from({ length: 60 }, () => ({
    x: Math.random() * 2000, y: Math.random() * 2000,
    r: Math.random() * 1.1 + 0.3,
    dx: (Math.random() - 0.5) * 0.28,
    dy: (Math.random() - 0.5) * 0.28,
    o: Math.random() * 0.4 + 0.1
  }));

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.dx; d.y += d.dy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,245,212,${d.o})`;
      ctx.fill();
    });
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(0,245,212,${0.035 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── LIVE CLOCK ── */
function updateClock() {
  const el = document.getElementById('navTime');
  if (!el) return;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
updateClock();
setInterval(updateClock, 1000);

/* ── NAVBAR SCROLL ── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

/* ── SCROLL REVEAL ── */
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

reveals.forEach(el => revealObserver.observe(el));

// hard fallback — show everything after 900ms no matter what
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible'));
}, 900);

/* ── AUTOSCALE ANIMATION ── */
(function scaleDemo() {
  const barsEl    = document.getElementById('scaleBars');
  const serversEl = document.getElementById('scaleServers');
  const statusEl  = document.getElementById('scaleStatus');
  if (!barsEl) return;

  let users = 0, servers = 1, tick = 0;
  const maxBars = 8;

  function render() {
    // bars
    barsEl.innerHTML = Array.from({ length: maxBars }, (_, i) => {
      const load = Math.min((users / (servers * 2)) * 100, 100);
      const h = i < users ? Math.min(20 + load * 0.7, 96) : 6;
      const color = load > 80 ? '#ff4d6d'
                  : load > 50 ? '#f97316'
                  : '#00f5d4';
      return `<div class="scale-bar" style="height:${h}px;background:${color}20;border-top:2px solid ${color};"></div>`;
    }).join('');

    // server nodes
    serversEl.innerHTML = Array.from({ length: Math.max(servers, 1) }, (_, i) =>
      `<div class="srv-node active" title="Server ${i+1}">🖥</div>`
    ).join('');

    const load = servers > 0 ? Math.round((users / (servers * 2)) * 100) : 0;
    if (statusEl) {
      statusEl.textContent = `${users} users · ${servers} server${servers > 1 ? 's' : ''} · ${load}% load`;
    }
  }

  function step() {
    tick++;
    if (tick % 4 === 0) {
      if (users < 14) users++;
      else if (tick % 20 === 0) users = 0;
    }
    if (users > servers * 2) servers++;
    if (users === 0) servers = 1;
    render();
  }

  render();
  setInterval(step, 700);
})();

/* ── TOAST ── */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3400);
}

/* ── LOGIN ── */
async function login() {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  const btn = document.querySelector('#loginSection .btn');
  if (!uEl || !pEl) return;

  if (btn) btn.innerHTML = '<span class="btn-text">Authenticating…</span>';

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uEl.value, password: pEl.value })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    token = data.token;
    // intentionally NOT saving to localStorage — fresh login required each visit
    showToast('✓ Authenticated');
    markAuthenticated();
  } catch (e) {
    showToast('✗ ' + e.message, true);
    if (btn) btn.innerHTML = '<span class="btn-text">Authenticate</span><span class="btn-arrow">→</span>';
  }
}

function markAuthenticated() {
  const badge = document.getElementById('loginBadge');
  if (badge) badge.classList.remove('hidden');
  const btn = document.querySelector('#loginSection .btn');
  if (btn) {
    btn.innerHTML = '✓ Authenticated';
    btn.style.cssText = 'background:rgba(74,222,128,0.12);color:#4ade80;border:1px solid rgba(74,222,128,0.2);';
    btn.disabled = true;
  }
}

/* ── DROP ZONE ── */
function setupDropZone() {
  const dz = document.getElementById('dropZone');
  const fi = document.getElementById('fileInput');
  if (!dz) return;

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
  });
  if (fi) fi.addEventListener('change', () => { if (fi.files[0]) setSelectedFile(fi.files[0]); });
}

function setSelectedFile(file) {
  selectedFile = file;
  const dz   = document.getElementById('dropZone');
  const meta = document.getElementById('fileMeta');

  // truncate long filenames for display
  const displayName = truncateName(file.name, 28);

  if (dz) {
    dz.classList.add('has-file');
    dz.innerHTML = `
      <div class="drop-icon-wrap" style="background:rgba(0,245,212,0.2)"><span>✓</span></div>
      <div class="drop-text" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;padding:0 8px">${escHtml(displayName)}</div>
      <div class="drop-sub">Ready to encrypt · ${formatBytes(file.size)}</div>`;
  }
  if (meta) {
    meta.classList.add('visible');
    const icon = document.getElementById('fileMetaIcon');
    const name = document.getElementById('fileMetaName');
    const size = document.getElementById('fileMetaSize');
    if (icon) icon.textContent = getFileEmoji(file.name);
    if (name) name.textContent = truncateName(file.name, 32);
    if (size) size.textContent = formatBytes(file.size);
  }
}

function truncateName(name, max) {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  const base = name.slice(0, name.length - ext.length);
  return base.slice(0, max - ext.length - 3) + '…' + ext;
}

function clearFile() {
  selectedFile = null;
  const dz   = document.getElementById('dropZone');
  const meta = document.getElementById('fileMeta');
  const fi   = document.getElementById('fileInput');
  if (meta) meta.classList.remove('visible');
  if (fi) fi.value = '';
  if (dz) {
    dz.classList.remove('has-file');
    dz.innerHTML = `
      <div class="drop-ripple"></div>
      <div class="drop-icon-wrap"><span>⬆</span></div>
      <div class="drop-text">Drag & drop or <span class="accent">browse</span></div>
      <div class="drop-sub">Any file — encrypted instantly</div>`;
    dz.onclick = () => document.getElementById('fileInput').click();
  }
}

/* ── UPLOAD ── */
async function uploadFile() {
  if (!token)        { showToast('✗ Unlock the vault first', true); return; }
  if (!selectedFile) { showToast('✗ No file selected', true);       return; }

  const btn       = document.querySelector('#uploadSection .btn-primary');
  const pw        = document.getElementById('progressWrap');
  const pb        = document.getElementById('progressBar');
  const pl        = document.getElementById('progressLabel');
  const pp        = document.getElementById('progressPct');
  const encProof  = document.getElementById('encProof');
  const secretCode = document.getElementById('filePassword')?.value?.trim() || '';

  if (pw) pw.classList.add('active');
  setProgress(pb, pp, 5);
  if (pl) pl.textContent = 'Preparing…';
  if (btn) { btn.innerHTML = '<span class="btn-text">Encrypting…</span>'; btn.disabled = true; }
  if (encProof) encProof.classList.remove('visible');

  await delay(180);
  setProgress(pb, pp, 38);
  if (pl) pl.textContent = 'Generating key + IV…';

  const expVal = document.querySelector('input[name="expiry"]:checked')?.value || '86400000';
  const fd = new FormData();
  fd.append('file', selectedFile);
  fd.append('password', secretCode);
  fd.append('expiry', expVal);

  try {
    await delay(200);
    setProgress(pb, pp, 65);
    if (pl) pl.textContent = 'Uploading encrypted file…';

    const res = await fetch('/upload', {
      method: 'POST',
      headers: { Authorization: token },
      body: fd
    });
    if (!res.ok) throw new Error('Upload failed — check your session');
    const data = await res.json();

    setProgress(pb, pp, 100);
    if (pl) pl.textContent = 'Locked ✓';

    await delay(350);
    if (pw) pw.classList.remove('active');

    // share URL always points to view.html — recipient enters code there
    const shareURL = secretCode
      ? `${location.origin}/view.html?file=${encodeURIComponent(data.file)}`
      : `${location.origin}/view.html?file=${encodeURIComponent(data.file)}&nocode=1`;
    showEncProof(shareURL, secretCode, selectedFile.name);
    showToast('✓ File encrypted and locked');

  } catch (e) {
    showToast('✗ ' + e.message, true);
    if (pw) pw.classList.remove('active');
    setProgress(pb, pp, 0);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-text">Encrypt & Lock</span><span class="btn-arrow">🔐</span>';
    }
  }
}

function showEncProof(shareURL, secretCode, fileName) {
  const encProof = document.getElementById('encProof');
  if (!encProof) return;

  // generate fake-but-realistic hex bytes for display
  const hexBytes = Array.from({ length: 96 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join(' ');
  const hexEl = document.getElementById('encHex');
  if (hexEl) hexEl.textContent = hexBytes;

  // secret code reminder
  const scrEl = document.getElementById('secretCodeReminder');
  if (scrEl) {
    if (secretCode) {
      scrEl.innerHTML = `
        <div class="sr-label">🔑 Your Secret Decryption Code</div>
        <div class="sr-code">${escHtml(secretCode)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px;font-family:var(--mono)">Share this with the recipient. Without it, the file cannot be opened.</div>
      `;
    } else {
      scrEl.innerHTML = `
        <div class="sr-label">No Secret Code Set</div>
        <div class="sr-none">Anyone with the link can open this file. Consider adding a code next time for extra security.</div>
      `;
    }
  }

  // share URL
  const urlEl = document.getElementById('shareUrl');
  if (urlEl) urlEl.innerHTML = `<a href="${shareURL}" target="_blank" style="color:var(--cyan);word-break:break-all">${shareURL}</a>`;

  // copy buttons
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const copyBothBtn = document.getElementById('copyBothBtn');
  if (copyLinkBtn) copyLinkBtn.onclick = () => copyLink(shareURL, copyLinkBtn);
  if (copyBothBtn) {
    if (secretCode) {
      const msg = `🔗 Link: ${shareURL}\n🔑 Secret Code: ${secretCode}`;
      copyBothBtn.onclick = () => copyLink(msg, copyBothBtn);
      copyBothBtn.style.display = 'inline-flex';
      copyBothBtn.textContent = '⎘ Copy Link + Secret Code together';
    } else {
      copyBothBtn.style.display = 'none';
    }
  }

  // recipient instructions
  const riEl = document.getElementById('riBody');
  if (riEl) {
    const expLabel = document.querySelector('input[name="expiry"]:checked')?.closest('.expiry-opt')?.textContent?.trim() || '24h';
    riEl.textContent = secretCode
      ? `Hey — I've shared a file with you via dhruv.vault.\n\n🔗 Link: ${shareURL}\n🔑 Secret Code: ${secretCode}\n\nOpen the link, enter the secret code when asked, and the file will decrypt instantly.\nThis link self-destructs in ${expLabel}.`
      : `Hey — I've shared a file with you via dhruv.vault.\n\n🔗 Link: ${shareURL}\n\nJust open the link — no secret code needed.\nThis link self-destructs in ${expLabel}.`;
  }

  encProof.classList.add('visible');
  encProof.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── DASHBOARD ── */
async function loadDashboard() {
  await Promise.all([loadStats(), loadFiles(), loadLogs()]);
}

async function loadStats() {
  try {
    const res = await fetch('/stats');
    const d   = await res.json();
    setText('statUsers',   d.users);
    setText('statServers', d.servers);
    setText('liveUsers',   d.users);
    setText('liveServers', d.servers);
    setBarW('fillUsers',   Math.min(d.users * 12, 100));
    setBarW('fillServers', Math.min(d.servers * 25, 100));
  } catch {}
}

async function loadFiles() {
  try {
    const res   = await fetch('/files');
    const files = await res.json();
    const el    = document.getElementById('fileList');
    if (!el) return;
    setText('statFiles', files.length);
    setText('liveFiles', files.length);
    setBarW('fillFiles', Math.min(files.length * 10, 100));
    if (!files.length) { el.innerHTML = '<div class="empty-row">No files yet</div>'; return; }
    el.innerHTML = files.map((f, i) => {
      const raw   = f.replace('.enc', '').split('_').slice(1).join('_') || f;
      const ext   = raw.split('.').pop().toUpperCase().slice(0, 6) || 'ENC';
      const short = f.length > 34 ? '…' + f.slice(-28) : f;
      return `<div class="file-item" style="animation-delay:${i*40}ms">
        <span class="file-ext">${escHtml(ext)}</span>
        <span class="file-name" title="${escHtml(f)}">${escHtml(short)}</span>
        <a href="/view/${encodeURIComponent(f)}" target="_blank" class="file-open">↗</a>
      </div>`;
    }).join('');
  } catch {
    const el = document.getElementById('fileList');
    if (el) el.innerHTML = '<div class="empty-row">Server unreachable</div>';
  }
}

async function loadLogs() {
  try {
    const res  = await fetch('/logs');
    const logs = await res.json();
    const el   = document.getElementById('logList');
    if (!el) return;
    if (!logs.length) { el.innerHTML = '<div class="empty-row">No activity yet</div>'; return; }
    el.innerHTML = [...logs].reverse().slice(0, 25).map((log, i) =>
      `<div class="log-item" style="animation-delay:${i*35}ms">
        <div class="log-dot"></div>
        <div class="log-text">${escHtml(log)}</div>
      </div>`).join('');
  } catch {}
}

/* ── COPY ── */
function copyLink(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('✓ Copied to clipboard');
    if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = '⎘ Copy link'; }, 2000); }
  }).catch(() => showToast('✗ Copy failed', true));
}

/* ── HELPERS ── */
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function setBarW(id, p) { const e = document.getElementById(id); if (e) e.style.width = p + '%'; }
function setProgress(bar, pct, v) { if (bar) bar.style.width = v + '%'; if (pct) pct.textContent = v + '%'; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getFileEmoji(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { pdf:'📄', jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',svg:'🖼',webp:'🖼',
    mp4:'🎬',mov:'🎬',avi:'🎬',mkv:'🎬', mp3:'🎵',wav:'🎵',flac:'🎵',
    zip:'📦',rar:'📦',tar:'📦',gz:'📦', doc:'📝',docx:'📝',txt:'📝',md:'📝',
    xls:'📊',xlsx:'📊',csv:'📊', js:'💻',ts:'💻',py:'💻',html:'💻',css:'💻',json:'💻' };
  return map[ext] || '📄';
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  setupDropZone();
  if (token) markAuthenticated();
  if (document.getElementById('fileList')) {
    loadDashboard();
    setInterval(loadDashboard, 3000);
  }
  if (document.getElementById('liveUsers')) {
    loadStats();
    setInterval(loadStats, 4000);
  }
});

/* ══════════════════════════════════════
   LIVE ENCRYPTION PLAYGROUND
   Real AES-256-CBC via Web Crypto API
══════════════════════════════════════ */

let pgCryptoKey = null;
let pgIvBytes   = null;
let pgEncrypted = null;

// generate a fresh key + IV, display them
async function pgGenKey() {
  pgCryptoKey = await crypto.subtle.generateKey(
    { name: 'AES-CBC', length: 256 }, true, ['encrypt', 'decrypt']
  );
  pgIvBytes = crypto.getRandomValues(new Uint8Array(16));

  const rawKey = await crypto.subtle.exportKey('raw', pgCryptoKey);
  const keyHex = Array.from(new Uint8Array(rawKey)).map(b => b.toString(16).padStart(2,'0')).join('');
  const ivHex  = Array.from(pgIvBytes).map(b => b.toString(16).padStart(2,'0')).join('');

  const kEl = document.getElementById('pgKeyDisplay');
  const iEl = document.getElementById('pgIvDisplay');
  if (kEl) kEl.textContent = keyHex.slice(0,32) + '…';
  if (iEl) iEl.textContent = ivHex;
}

async function pgEncrypt() {
  const input = document.getElementById('pgInput')?.value?.trim();
  if (!input) { showToast('✗ Type something to encrypt first', true); return; }

  const encBtn = document.getElementById('pgEncBtn');
  const decBtn = document.getElementById('pgDecBtn');
  const outputEl = document.getElementById('pgOutput');
  const arrow = document.getElementById('pgArrow');
  const labelEl = document.getElementById('pgOutputLabel');

  // start matrix rain
  startMatrix();
  if (arrow) arrow.classList.add('encrypting');

  // scramble the output box visually
  if (outputEl) {
    outputEl.className = 'pg-output';
    outputEl.innerHTML = '<span class="scrambling">Generating key...</span>';
  }
  await delay(300);

  // generate fresh key + IV every encrypt
  await pgGenKey();

  if (outputEl) outputEl.innerHTML = '<span class="scrambling">Encrypting bytes...</span>';
  await delay(400);

  // actually encrypt using Web Crypto
  const encoded = new TextEncoder().encode(input);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: pgIvBytes },
    pgCryptoKey,
    encoded
  );

  pgEncrypted = encryptedBuffer;

  // convert to base64 for display
  const bytes = new Uint8Array(encryptedBuffer);
  const b64 = btoa(String.fromCharCode(...bytes));

  // stop matrix
  await delay(200);
  stopMatrix();
  if (arrow) { arrow.classList.remove('encrypting'); arrow.textContent = '🔐'; }

  // show encrypted output with char-by-char reveal
  if (outputEl) {
    outputEl.className = 'pg-output encrypted-state';
    outputEl.textContent = '';
    await typeOut(outputEl, b64, 1);
  }

  if (labelEl) labelEl.textContent = '🔒 AES-256-CBC Encrypted (Base64)';

  // show stats
  const statsEl = document.getElementById('pgStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="pg-stat-item"><span class="pg-stat-key">plaintext</span><span class="pg-stat-val">${encoded.length}B</span></div>
      <div class="pg-stat-item"><span class="pg-stat-key">encrypted</span><span class="pg-stat-val">${bytes.length}B</span></div>
      <div class="pg-stat-item"><span class="pg-stat-key">algo</span><span class="pg-stat-val">AES-256-CBC</span></div>
      <div class="pg-stat-item"><span class="pg-stat-key">key</span><span class="pg-stat-val">256-bit</span></div>
      <div class="pg-stat-item"><span class="pg-stat-key">iv</span><span class="pg-stat-val">128-bit</span></div>
    `;
  }

  if (decBtn) decBtn.disabled = false;
  if (encBtn) encBtn.textContent = '🔐 Re-Encrypt';
  showToast('✓ Text encrypted with real AES-256');
}

async function pgDecrypt() {
  if (!pgEncrypted || !pgCryptoKey || !pgIvBytes) return;

  const outputEl = document.getElementById('pgOutput');
  const arrow    = document.getElementById('pgArrow');
  const labelEl  = document.getElementById('pgOutputLabel');

  if (arrow) { arrow.textContent = '🔓'; arrow.style.color = 'var(--green)'; }
  if (outputEl) {
    outputEl.className = 'pg-output';
    outputEl.innerHTML = '<span class="scrambling">Decrypting…</span>';
  }
  await delay(500);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: pgIvBytes },
      pgCryptoKey,
      pgEncrypted
    );
    const text = new TextDecoder().decode(decryptedBuffer);

    if (outputEl) {
      outputEl.className = 'pg-output decrypted-state';
      outputEl.textContent = '';
      await typeOut(outputEl, text, 18);
    }
    if (labelEl) labelEl.textContent = '✅ Decrypted — original text restored';
    if (arrow) { arrow.textContent = '→'; arrow.style.color = ''; }
    showToast('✓ Decrypted successfully — same bytes, same key');
  } catch(e) {
    if (outputEl) outputEl.textContent = '✗ Decryption failed';
    showToast('✗ Decryption error', true);
  }
}

function pgReset() {
  pgCryptoKey = null; pgIvBytes = null; pgEncrypted = null;
  const fields = ['pgInput','pgKeyDisplay','pgIvDisplay','pgOutput','pgStats'];
  const placeholders = { pgInput:'', pgKeyDisplay:'—', pgIvDisplay:'—', pgOutput:'', pgStats:'' };
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = id === 'pgOutput' ? 'pg-output' : el.className;
    if (id === 'pgOutput') el.innerHTML = '<div class="pg-placeholder">Encrypted bytes will appear here…</div>';
    else if (id === 'pgStats') el.innerHTML = '';
    else el.textContent = placeholders[id] ?? '';
  });
  const decBtn = document.getElementById('pgDecBtn');
  const encBtn = document.getElementById('pgEncBtn');
  if (decBtn) decBtn.disabled = true;
  if (encBtn) encBtn.textContent = '🔐 Encrypt Now';
  const arrow = document.getElementById('pgArrow');
  if (arrow) { arrow.textContent = '→'; arrow.style.color = ''; arrow.classList.remove('encrypting'); }
  const labelEl = document.getElementById('pgOutputLabel');
  if (labelEl) labelEl.textContent = '🔒 Encrypted Output (Base64)';
  stopMatrix();
}

// type text char by char into element
async function typeOut(el, text, msPerChar = 8) {
  el.textContent = '';
  const chunkSize = Math.max(1, Math.floor(text.length / 80));
  for (let i = 0; i < text.length; i += chunkSize) {
    el.textContent += text.slice(i, i + chunkSize);
    if (i % (chunkSize * 10) === 0) await delay(msPerChar);
  }
  el.textContent = text;
}

/* ══════════════════════════════════════
   MATRIX RAIN (shows during encryption)
══════════════════════════════════════ */
let matrixRAF = null;

function startMatrix() {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');

  const ctx = canvas.getContext('2d');
  const cols = Math.floor(canvas.width / 16);
  const drops = Array(cols).fill(1);
  const chars = 'アイウエオカキクケコABCDEF0123456789!@#$%^&*⬡◈◉✦';

  function drawMatrix() {
    ctx.fillStyle = 'rgba(6,8,14,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00f5d4';
    ctx.font = '13px "Space Mono", monospace';

    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = y === 1 ? '#ffffff' : `rgba(0,245,212,${Math.random() * 0.6 + 0.2})`;
      ctx.fillText(char, i * 16, y * 16);
      if (y * 16 > canvas.height && Math.random() > 0.97) drops[i] = 0;
      drops[i]++;
    });

    matrixRAF = requestAnimationFrame(drawMatrix);
  }

  drawMatrix();
}

function stopMatrix() {
  if (matrixRAF) { cancelAnimationFrame(matrixRAF); matrixRAF = null; }
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;
  canvas.classList.remove('active');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* ── EXPOSE TO GLOBAL SCOPE for onclick attributes ── */
window.login        = login;
window.uploadFile   = uploadFile;
window.clearFile    = clearFile;
window.copyLink     = copyLink;
window.pgEncrypt    = pgEncrypt;
window.pgDecrypt    = pgDecrypt;
window.pgReset      = pgReset;