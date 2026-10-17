// =====================================================
//  Config
// =====================================================
// true = بعد عرض الـ QR بـ 8 ثواني بنحاكي نجاح الاتصال (للتجربة فقط)
// اقفله (false) لما توصل الـ API الحقيقي واستدعي setLineStatus(number,'on') لما الواتساب يتربط.
const DEMO_AUTO_CONNECT = true;

const STATUS_LABEL = { on: 'متصل', off: 'غير متصل', stop: 'متوقف', ready: 'جاهز' };

// =====================================================
//  Data
// =====================================================
const lines = [
  { code: 'E1', number: '201220378279', status: 'on'   },
  { code: 'N2', number: '966552471353', status: 'off'  },
  { code: 'E2', number: '201027212987', status: 'stop' },
];

const colors = ['#2F7DD1', '#7B61C9', '#12A58A', '#E08A2E', '#D1517A', '#3F6FB5', '#0E8F9E', '#8A6BD1'];

// line = رقم القناة التابعة لها المحادثة
const conversations = [
  { id: 1, name: '201001362227', line: '201220378279', pinned: true, unread: 0, time: '07:54 م',
    messages: [{ from: 'in', text: 'أهلاً، محتاج مساعدة.', time: '07:54 م' }] },
  { id: 2, name: 'Armia Nile hospital', line: '201220378279', unread: 3, time: '10:24 ص',
    messages: [
      { from: 'in',  text: 'السلام عليكم، محتاجين عرض سعر للنظام الجديد.', time: '10:20 ص' },
      { from: 'out', text: 'أهلاً بحضرتك، هبعتلك التفاصيل حالاً.', time: '10:22 ص' },
      { from: 'in',  text: 'تمام، مستنيين.', time: '10:24 ص' },
    ] },
  { id: 3, name: 'AIM Consulting', line: '966552471353', unread: 1, time: '10:24 ص',
    messages: [{ from: 'in', text: 'شكراً لاهتمامك، هنكلمك قريب.', time: '10:24 ص' }] },
  { id: 4, name: 'Amr Samir PH', line: '201220378279', unread: 0, time: '09:33 ص',
    messages: [{ from: 'in', text: 'بالنسبة لأكونت التحصيل.', time: '09:33 ص' }] },
  { id: 5, name: 'م/ محمود السويفي', line: '966552471353', unread: 0, time: 'أمس',
    messages: [{ from: 'in', text: 'لا ولا يهمك.', time: '07:06 م' }] },
  { id: 6, name: 'أبناء المصطفى @ ERTAQY', line: '201220378279', unread: 1, time: 'أمس',
    messages: [{ from: 'in', text: 'تمام', time: '06:33 م' }] },
  { id: 7, name: 'عبدالرحمن استشاري', line: '201027212987', unread: 0, time: 'أمس',
    messages: [{ from: 'in', text: 'حاضر هبلغ الحسابات.', time: '05:26 م' }] },
  { id: 8, name: 'Mohamed Hatem', line: '201027212987', unread: 0, time: 'أمس',
    messages: [{ from: 'in', text: '10 دقايق وهبعت لحضرتك.', time: '04:51 م' }] },
];

// =====================================================
//  API hooks  (استبدلهم بالـ API الحقيقي)
// =====================================================
async function apiStartLine(line) {
  // TODO: const res = await fetch(`/api/lines/${line.number}/start`, { method: 'POST' });
  //       return (await res.json()).qr;   // النص اللي بيتحول لـ QR
  return `whatsapp-link:${line.number}:${Date.now()}`;
}
async function apiStopLine(line) {
  // TODO: await fetch(`/api/lines/${line.number}/stop`, { method: 'POST' });
}

// =====================================================
//  State + helpers
// =====================================================
const state = { filter: 'all', query: '', selected: null, lineFilter: null, qrLine: null, linesCollapsed: window.matchMedia('(max-width: 900px)').matches, linesQuery: '' };
let qrTimer = null;

const $ = (id) => document.getElementById(id);
const linesEl = $('lines'), listEl = $('list'), filtersEl = $('filters');
const searchInput = $('searchInput');
const appEl = document.querySelector('.app');
const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
const emptyEl = $('empty'), chatInner = $('chatInner');
const messagesEl = $('messages'), composer = $('composer'), msgInput = $('msgInput');
const qrModal = $('qrModal'), qrBox = $('qrBox'), qrStatus = $('qrStatus');

const pinIcon = '<span class="pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 17v5M9 3h6l-1 7 3 3H7l3-3z"/></svg></span>';

const lastMsg = (c) => c.messages[c.messages.length - 1];
const initial = (n) => n.trim().charAt(0).toUpperCase();
const esc = (s) => s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const colorOf = (id) => colors[(id - 1) % colors.length];
const lineOf = (number) => lines.find((l) => l.number === number);
const codeOf = (number) => (lineOf(number) || {}).code || '';
const canSend = (conv) => (lineOf(conv.line) || {}).status === 'on';

// =====================================================
//  Render
// =====================================================
const chevron = '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
const SEARCH_MIN_LINES = 6; // مربع بحث القنوات بيظهر لما العدد يوصل لده

function buildLinesShell() {
  linesEl.innerHTML = `
    <div class="lines-head">
      <button class="lines-toggle" data-act="toggle" aria-expanded="true">${chevron}<span>القنوات</span><span class="lines-count" id="linesCount"></span></button>
      <div class="lines-summary" id="linesSummary"></div>
      <button class="lines-clear" data-act="clear" hidden>إلغاء الفلتر</button>
    </div>
    <div class="lines-body">
      <input class="lines-search" id="linesSearch" type="search" placeholder="ابحث برقم القناة" aria-label="بحث في القنوات" hidden>
      <div class="lines-list" id="linesList"></div>
    </div>`;
  $('linesSearch').addEventListener('input', (e) => { state.linesQuery = e.target.value; renderLines(); });
}

function renderLines() {
  if (!$('linesList')) buildLinesShell();

  $('linesCount').textContent = lines.length;
  $('linesSearch').hidden = lines.length < SEARCH_MIN_LINES;
  linesEl.classList.toggle('is-collapsed', state.linesCollapsed);
  linesEl.querySelector('[data-act="toggle"]').setAttribute('aria-expanded', String(!state.linesCollapsed));
  linesEl.querySelector('[data-act="clear"]').hidden = !state.lineFilter;

  // ملخص الحالات (بيظهر فقط الحالات الموجودة)
  $('linesSummary').innerHTML = Object.keys(STATUS_LABEL).map((st) => {
    const n = lines.filter((l) => l.status === st).length;
    return n ? `<span class="sum-item" title="${STATUS_LABEL[st]}"><span class="dot ${st}"></span>${n}</span>` : '';
  }).join('');

  const q = (state.linesQuery || '').trim().toLowerCase();
  const shown = lines.filter((l) => !q || l.number.includes(q) || l.code.toLowerCase().includes(q));

  $('linesList').innerHTML = shown.length ? shown.map((l) => `
    <div class="line ${state.lineFilter === l.number ? 'is-active' : ''}" data-number="${l.number}">
      <button class="dot ${l.status}" data-act="menu" aria-label="خيارات القناة ${l.number}" title="خيارات القناة"></button>
      <div class="line-info" data-act="filter" role="button" tabindex="0" title="عرض محادثات هذا الرقم فقط">
        <b>${l.number}</b><span class="line-code">${l.code}</span>
      </div>
      <small class="line-label">${STATUS_LABEL[l.status]}</small>
    </div>`).join('') : '<div class="lines-empty">لا توجد قنوات مطابقة</div>';
}

function renderList() {
  const q = state.query.trim().toLowerCase();
  const items = conversations.filter((c) => {
    if (state.lineFilter && c.line !== state.lineFilter) return false;
    if (state.filter === 'unread' && !c.unread) return false;
    if (state.filter === 'pinned' && !c.pinned) return false;
    if (q && !(c.name.toLowerCase().includes(q) || lastMsg(c).text.toLowerCase().includes(q))) return false;
    return true;
  });

  if (!items.length) {
    listEl.innerHTML = '<div class="no-results">لا توجد محادثات مطابقة</div>';
    return;
  }

  listEl.innerHTML = items.map((c) => `
    <div class="row ${c.id === state.selected ? 'is-selected' : ''}" data-id="${c.id}" tabindex="0">
      <div class="avatar" style="background:${colorOf(c.id)}">${esc(initial(c.name))}<span class="ln">${codeOf(c.line)}</span></div>
      <div class="mid">
        <div class="name">${esc(c.name)}</div>
        <div class="preview">${esc(lastMsg(c).text)}</div>
      </div>
      <div class="meta">
        <span class="time">${c.time}</span>
        ${c.unread ? `<span class="unread">${c.unread}</span>` : (c.pinned ? pinIcon : '')}
      </div>
    </div>`).join('');
}

function renderChat() {
  const c = conversations.find((x) => x.id === state.selected);
  if (!c) return;
  emptyEl.hidden = true;
  chatInner.hidden = false;

  const av = $('chatAvatar');
  av.style.background = colorOf(c.id);
  av.textContent = initial(c.name);
  $('chatName').textContent = c.name;

  const line = lineOf(c.line);
  const st = $('chatStatus');
  st.textContent = `${STATUS_LABEL[line.status]} · عبر ${line.number}`;
  st.className = line.status === 'on' ? '' : (line.status === 'ready' ? 'wait' : 'warn');

  messagesEl.innerHTML = '<div class="day">اليوم</div>' + c.messages.map((m) => `
    <div class="bubble ${m.from}">${esc(m.text)}<small>${m.time}</small></div>`).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;

  const ok = canSend(c);
  composer.classList.toggle('is-disabled', !ok);
  msgInput.disabled = !ok;
  composer.querySelector('.send').disabled = !ok;
  msgInput.placeholder = ok ? 'اكتب رسالتك هنا...' : `القناة ${STATUS_LABEL[line.status]} — الإرسال معطل`;
}

function renderAll() { renderLines(); renderList(); renderChat(); }

// =====================================================
//  Line status
// =====================================================
function setLineStatus(number, status) {
  const line = lineOf(number);
  if (!line) return;
  line.status = status;
  renderAll();
  if (state.qrLine === number && !qrModal.hidden) updateQrStatus();
}
window.setLineStatus = setLineStatus; // تقدر تناديها من أي مكان (WebSocket مثلاً)

// استقبال رسالة (يتجاهلها لو القناة مش متصلة)
function receiveMessage(number, convId, text) {
  const line = lineOf(number);
  const c = conversations.find((x) => x.id === convId);
  if (!line || !c || line.status !== 'on') return false;
  const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  c.messages.push({ from: 'in', text, time: now });
  c.time = now;
  if (c.id !== state.selected) c.unread += 1;
  renderAll();
  return true;
}
window.receiveMessage = receiveMessage;

// =====================================================
//  Channel popover (تشغيل / إيقاف / إلغاء)
// =====================================================
let popEl = null;

function closeMenu() { if (popEl) { popEl.remove(); popEl = null; } }

function openMenu(number, anchor) {
  closeMenu();
  const line = lineOf(number);
  popEl = document.createElement('div');
  popEl.className = 'popover';
  popEl.innerHTML = `
    <div class="pop-title">${line.number}</div>
    <button data-do="start" ${line.status === 'on' ? 'disabled' : ''}>تشغيل</button>
    <button data-do="stop" ${line.status === 'stop' ? 'disabled' : ''}>إيقاف</button>
    <button data-do="cancel">إلغاء</button>`;
  document.body.appendChild(popEl);

  const r = anchor.getBoundingClientRect();
  const w = popEl.offsetWidth;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
  popEl.style.top = `${r.bottom + 12}px`;
  popEl.style.left = `${left}px`;

  popEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-do]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.do;
    closeMenu();
    if (action === 'start') startLine(line);
    if (action === 'stop') stopLine(line);
  });
}

async function startLine(line) {
  const qr = await apiStartLine(line);
  showQr(line, qr);
}

async function stopLine(line) {
  await apiStopLine(line);
  clearTimeout(qrTimer);
  if (state.qrLine === line.number) closeQr();
  setLineStatus(line.number, 'stop');
}

// =====================================================
//  QR modal
// =====================================================
function showQr(line, payload) {
  state.qrLine = line.number;
  $('qrTitle').textContent = line.number;
  qrBox.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrBox, { text: payload, width: 220, height: 220, colorDark: '#10294A', colorLight: '#f1f5fb' });
  } else {
    qrBox.textContent = payload; // fallback لو مكتبة الـ QR ماتحملتش
  }
  qrModal.hidden = false;
  setLineStatus(line.number, 'ready');

  clearTimeout(qrTimer);
  if (DEMO_AUTO_CONNECT) {
    qrTimer = setTimeout(() => {
      if (lineOf(line.number).status === 'ready') setLineStatus(line.number, 'on');
    }, 8000);
  }
}

function updateQrStatus() {
  const line = lineOf(state.qrLine);
  qrStatus.className = 'qr-status' + (line.status === 'on' ? ' ok' : '');
  qrStatus.textContent =
    line.status === 'ready' ? 'جاهز — في انتظار مسح الكود...' :
    line.status === 'on' ? 'تم الاتصال بنجاح ✓' : STATUS_LABEL[line.status];
  if (line.status === 'on') setTimeout(() => { if (state.qrLine === line.number) closeQr(); }, 1200);
}

function closeQr() { qrModal.hidden = true; state.qrLine = null; }

qrModal.addEventListener('click', (e) => { if (e.target === qrModal) closeQr(); });
$('qrClose').addEventListener('click', closeQr);

// =====================================================
//  Events
// =====================================================
function toggleLineFilter(number) {
  state.lineFilter = state.lineFilter === number ? null : number;
  renderLines();
  renderList();
}

linesEl.addEventListener('click', (e) => {
  const head = e.target.closest('[data-act="toggle"], [data-act="clear"]');
  if (head) {
    if (head.dataset.act === 'toggle') { state.linesCollapsed = !state.linesCollapsed; renderLines(); }
    else { state.lineFilter = null; renderLines(); renderList(); }
    return;
  }
  const lineEl = e.target.closest('.line');
  const act = e.target.closest('[data-act]');
  if (!lineEl || !act) return;
  const number = lineEl.dataset.number;
  if (act.dataset.act === 'menu') {
    e.stopPropagation();
    openMenu(number, act);
  } else if (act.dataset.act === 'filter') {
    toggleLineFilter(number);
  }
});
linesEl.addEventListener('keydown', (e) => {
  const act = e.target.closest('[data-act="filter"]');
  if (act && e.key === 'Enter') toggleLineFilter(e.target.closest('.line').dataset.number);
});

document.addEventListener('click', (e) => { if (popEl && !e.target.closest('.popover')) closeMenu(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeMenu(); if (!qrModal.hidden) closeQr(); }
});

function selectConversation(id) {
  state.selected = id;
  conversations.find((x) => x.id === id).unread = 0;
  renderList();
  renderChat();
  if (isMobile()) appEl.classList.add('chat-open');
  else if (!msgInput.disabled) msgInput.focus();
}

function closeChatMobile() {
  appEl.classList.remove('chat-open');
  state.selected = null;
  renderList();
}
$('backBtn').addEventListener('click', closeChatMobile);
window.addEventListener('resize', () => { if (!isMobile()) appEl.classList.remove('chat-open'); });

listEl.addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  if (row) selectConversation(Number(row.dataset.id));
});
listEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const row = e.target.closest('.row');
    if (row) selectConversation(Number(row.dataset.id));
  }
});

filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  state.filter = btn.dataset.filter;
  filtersEl.querySelectorAll('.chip').forEach((b) => b.classList.toggle('is-active', b === btn));
  renderList();
});

searchInput.addEventListener('input', () => { state.query = searchInput.value; renderList(); });

composer.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  const c = conversations.find((x) => x.id === state.selected);
  if (!text || !c || !canSend(c)) return;
  const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  c.messages.push({ from: 'out', text, time: now });
  c.time = now;
  msgInput.value = '';
  renderChat();
  renderList();
});

$('refreshBtn').addEventListener('click', renderAll);

// =====================================================
//  Init
// =====================================================
renderLines();
renderList();
if (!isMobile()) selectConversation(2);   // على الموبايل نبدأ بالقائمة
