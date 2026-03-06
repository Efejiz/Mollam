/* ============================================
   MOLLAM — App Logic v8
   Improved: security, a11y, offline, XSS fixes
   ============================================ */
const API = location.origin;
const APP_VERSION = '2.5.0';
document.addEventListener('DOMContentLoaded', () => {

    // ═══ OFFLINE DETECTION ═══
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            toast('Çevrimdışısınız. Bazı özellikler çalışmayabilir.', 'error');
        }
    }
    window.addEventListener('offline', () => toast('İnternet bağlantısı kesildi.', 'error'));
    window.addEventListener('online', () => toast('İnternet bağlantısı yeniden kuruldu.', 'success'));
    setTimeout(updateOnlineStatus, 2000);

    // ═══ SPLASH ═══
    setTimeout(() => {
        const s = document.getElementById('splash');
        s.classList.add('out');
        setTimeout(() => {
            s.remove();
            if (!currentUser) {
                openAuthModal();
            } else {
                showOnboarding();
            }
        }, 500);
    }, 1600);

    // ═══ SERVICE WORKER ═══
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => { });

    // ═══ AUTHENTICATION STATE ═══
    let currentUser = JSON.parse(localStorage.getItem('mollam_user') || 'null');
    let authToken = localStorage.getItem('mollam_token') || null;

    function setAuth(user, token) {
        currentUser = user;
        authToken = token;
        if (user && token) {
            localStorage.setItem('mollam_user', JSON.stringify(user));
            localStorage.setItem('mollam_token', token);
        } else {
            localStorage.removeItem('mollam_user');
            localStorage.removeItem('mollam_token');
        }
        updateProfileUI();
    }

    // ═══ TOAST ═══
    function toast(msg, type = 'success') {
        const c = document.getElementById('toastContainer');
        const t = document.createElement('div'); t.className = `toast ${type}`;
        const icons = { success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>', error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' };
        t.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 2200);
    }

    // ═══ ONBOARDING ═══
    function showOnboarding() {
        if (localStorage.getItem('mollam_ob')) return;
        const ob = document.getElementById('onboarding'); ob.classList.remove('hidden');
        const slides = ob.querySelectorAll('.ob-slide'), dots = ob.querySelectorAll('.ob-dots span');
        let idx = 0;
        function go(i) {
            slides[idx].classList.remove('active'); slides[idx].classList.add('exit');
            setTimeout(() => slides[idx].classList.remove('exit'), 400);
            dots[idx].classList.remove('active');
            idx = i;
            slides[idx].classList.add('active'); dots[idx].classList.add('active');
            if (idx === slides.length - 1) document.getElementById('obNext').textContent = 'Başla';
        }
        document.getElementById('obNext').addEventListener('click', () => { if (idx < slides.length - 1) go(idx + 1); else close(); });
        document.getElementById('obSkip').addEventListener('click', close);
        function close() { ob.classList.add('hidden'); localStorage.setItem('mollam_ob', '1'); }
    }

    // ═══ THEME ═══
    const themeToggle = document.getElementById('themeToggle');
    const autoThemeToggle = document.getElementById('autoThemeToggle');
    const savedTheme = localStorage.getItem('mollam_theme') || 'dark';
    const autoTheme = localStorage.getItem('mollam_auto_theme') === 'true';
    function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#0B0B0B' : '#F4F1EB'; }
    if (autoTheme) { const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; applyTheme(sys); themeToggle.checked = sys === 'dark'; autoThemeToggle.checked = true; }
    else { applyTheme(savedTheme); themeToggle.checked = savedTheme === 'dark'; }
    themeToggle.addEventListener('change', () => { const t = themeToggle.checked ? 'dark' : 'light'; applyTheme(t); localStorage.setItem('mollam_theme', t); autoThemeToggle.checked = false; localStorage.setItem('mollam_auto_theme', 'false'); });
    autoThemeToggle.addEventListener('change', () => {
        localStorage.setItem('mollam_auto_theme', autoThemeToggle.checked);
        if (autoThemeToggle.checked) { const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; applyTheme(sys); themeToggle.checked = sys === 'dark'; toast('Sistem teması etkin', 'info'); }
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('mollam_auto_theme') === 'true') { const t = e.matches ? 'dark' : 'light'; applyTheme(t); themeToggle.checked = e.matches; }
    });

    // ═══ FONT SIZE ═══
    let arabicSize = parseInt(localStorage.getItem('mollam_font') || '18');
    document.documentElement.style.setProperty('--arabic-size', arabicSize + 'px');
    document.getElementById('fontSizeVal').textContent = arabicSize + 'px';
    document.querySelectorAll('.font-btn').forEach(b => b.addEventListener('click', () => {
        arabicSize = Math.max(14, Math.min(28, arabicSize + (b.dataset.size === '+' ? 2 : -2)));
        document.documentElement.style.setProperty('--arabic-size', arabicSize + 'px');
        document.getElementById('fontSizeVal').textContent = arabicSize + 'px';
        localStorage.setItem('mollam_font', arabicSize);
        toast(`Yazı boyutu: ${arabicSize}px`, 'info');
    }));

    // ═══ SOUND ═══
    const soundToggle = document.getElementById('soundToggle');
    soundToggle.checked = localStorage.getItem('mollam_sound') === 'true';
    soundToggle.addEventListener('change', () => { localStorage.setItem('mollam_sound', soundToggle.checked); toast(soundToggle.checked ? 'Ses açıldı' : 'Ses kapatıldı', 'info'); });
    let audioCtx;
    function playClick() { if (!soundToggle.checked) return; if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 800; o.type = 'sine'; g.gain.setValueAtTime(.1, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .08); o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + .08); }

    // ═══ NOTIFICATIONS ═══
    const notifToggle = document.getElementById('notifToggle');
    notifToggle.checked = localStorage.getItem('mollam_notif') === 'true';
    notifToggle.addEventListener('change', async () => {
        if (notifToggle.checked && 'Notification' in window) { const p = await Notification.requestPermission(); if (p !== 'granted') { notifToggle.checked = false; toast('Bildirim izni reddedildi', 'error'); return; } }
        localStorage.setItem('mollam_notif', notifToggle.checked);
        toast(notifToggle.checked ? 'Bildirimler açıldı' : 'Bildirimler kapatıldı', 'info');
    });

    // ═══ DYNAMIC BG ═══
    function updateBg() { const h = new Date().getHours(), bg = document.getElementById('bgGrad'); let g; if (h >= 5 && h < 7) g = 'radial-gradient(ellipse at 50% 0%,rgba(100,50,120,.06) 0%,transparent 55%)'; else if (h < 12) g = 'radial-gradient(ellipse at 50% 0%,rgba(255,200,50,.05) 0%,transparent 55%)'; else if (h < 16) g = 'radial-gradient(ellipse at 50% 0%,rgba(0,100,0,.05) 0%,transparent 55%)'; else if (h < 19) g = 'radial-gradient(ellipse at 50% 0%,rgba(200,100,30,.06) 0%,transparent 55%)'; else g = 'radial-gradient(ellipse at 50% 0%,rgba(0,50,100,.05) 0%,transparent 55%)'; if (bg) bg.style.background = g; } updateBg(); setInterval(updateBg, 300000);

    // ═══ PARTICLES ═══
    const cvs = document.getElementById('particleCanvas'), cx = cvs.getContext('2d'); let pts = [], aId;
    function rz() { cvs.width = innerWidth; cvs.height = innerHeight; } rz(); addEventListener('resize', rz);
    class Pt { constructor() { this.r(); } r() { this.x = Math.random() * cvs.width; this.y = Math.random() * cvs.height; this.tx = cvs.width / 2 + (Math.random() - .5) * 80; this.ty = cvs.height * .35 + (Math.random() - .5) * 40; this.sp = .002 + Math.random() * .003; this.sz = Math.random() * 1.5 + .3; this.life = 0; this.ml = 200 + Math.random() * 200; this.op = 0; const v = Math.random() * 35; this.cr = 184 + v; this.cg = 134 + v * .5; } u() { this.life++; this.x += (this.tx - this.x) * this.sp; this.y += (this.ty - this.y) * this.sp; this.op = this.life < 20 ? this.life / 20 : this.life > this.ml - 20 ? (this.ml - this.life) / 20 : .4 + Math.sin(this.life * .03) * .15; this.x += Math.sin(this.life * .018) * .2; if (this.life >= this.ml) this.r(); } d() { cx.beginPath(); cx.arc(this.x, this.y, this.sz, 0, Math.PI * 2); cx.fillStyle = `rgba(${this.cr},${this.cg},11,${this.op * .2})`; cx.fill(); } }
    const ptCount = window.innerWidth <= 430 ? 10 : 20;
    for (let i = 0; i < ptCount; i++) { const p = new Pt(); p.life = Math.random() * p.ml; pts.push(p); }
    function anim() { cx.clearRect(0, 0, cvs.width, cvs.height); pts.forEach(p => { p.u(); p.d(); }); aId = requestAnimationFrame(anim); } anim();
    document.addEventListener('visibilitychange', () => { document.hidden ? cancelAnimationFrame(aId) : anim(); });

    // ═══ RIPPLE EFFECT ═══
    function createRipple(e) {
        const btn = e.currentTarget;
        const circle = document.createElement('span');
        const d = Math.max(btn.clientWidth, btn.clientHeight);
        const rect = btn.getBoundingClientRect();
        circle.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px;position:absolute;border-radius:50%;background:rgba(255,255,255,.15);transform:scale(0);animation:rippleAnim .4s ease-out;pointer-events:none`;
        btn.style.position = btn.style.position || 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(circle);
        circle.addEventListener('animationend', () => circle.remove());
    }
    document.querySelectorAll('.nav-btn,.nav-center,.feat-card,.widget,.sug-card,.send-btn,.ob-next,.auth-btn,.action-btn,.drawer-item,.topbar-btn,.back-btn,.sm-btn').forEach(el => {
        el.addEventListener('click', createRipple);
    });

    // ═══ NAVIGATION ═══
    const allPages = document.querySelectorAll('.page'), navBtns = document.querySelectorAll('.nav-btn, .nav-center');
    let currentPage = 'pageChat';
    const pageHistory = ['pageChat'];
    const featureMap = { prayer: 'pagePrayer', tracker: 'pageTracker', tesbih: 'pageTesbih', dua: 'pageDua', qibla: 'pageQibla', calendar: 'pageCalendar', esma: 'pageEsma', hadith: 'pageHadith' };
    const pageTitles = { pageChat: 'Mollam', pageFeatures: 'Keşfet', pagePrayer: 'Namaz Vakitleri', pageTracker: 'Namaz Takibi', pageTesbih: 'Tesbih', pageDua: 'Dualar', pageQibla: 'Kıble', pageCalendar: 'Takvim', pageEsma: 'Esmaül Hüsna', pageHadith: 'Hadis & Ayet', pageProfile: 'Profil' };

    function goTo(pageId, pushState = true) {
        if (pageId === currentPage) return;
        allPages.forEach(p => p.classList.remove('active'));
        const el = document.getElementById(pageId); el.classList.add('active');
        navBtns.forEach(b => b.classList.remove('active'));
        if (pageId === 'pageChat') document.getElementById('navChat').classList.add('active');
        else if (pageId === 'pageProfile') document.getElementById('navProfile').classList.add('active');
        else document.getElementById('navFeatures').classList.add('active');
        const tt = document.getElementById('topTitle');
        tt.textContent = pageTitles[pageId] || 'Mollam';
        tt.style.fontFamily = pageId === 'pageChat' ? 'var(--fa)' : 'var(--f)';
        currentPage = pageId;
        if (pushState) {
            pageHistory.push(pageId);
            history.pushState({ page: pageId }, '', null);
        }
        if (pageId === 'pagePrayer') loadPrayerTimes();
        if (pageId === 'pageCalendar') loadCalendar();
        if (pageId === 'pageEsma') loadEsma();
        if (pageId === 'pageDua') loadDuas();
        if (pageId === 'pageHadith') loadHadithPage();
        if (pageId === 'pageProfile') loadProfile();
        if (pageId === 'pageTracker') { renderWeek(); updateGoals(); }
        if (pageId === 'pageFeatures') updateFeatMini();
    }
    navBtns.forEach(b => b.addEventListener('click', () => goTo(b.dataset.page)));
    document.querySelectorAll('.feat-card').forEach(c => c.addEventListener('click', () => { const p = featureMap[c.dataset.feat]; if (p) goTo(p); }));
    document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', () => goTo(b.dataset.back)));
    document.getElementById('navChat').classList.add('active');

    // ═══ BACK BUTTON HANDLING ═══
    history.replaceState({ page: 'pageChat' }, '', null);
    window.addEventListener('popstate', (e) => {
        if (pageHistory.length > 1) {
            pageHistory.pop();
            const prevPage = pageHistory[pageHistory.length - 1];
            goTo(prevPage, false);
        } else {
            history.pushState({ page: currentPage }, '', null);
        }
    });

    // Feature mini info
    function updateFeatMini() {
        const tt = parseInt(localStorage.getItem('mt_t') || '0');
        document.getElementById('featTesbihMini').textContent = `${tt} toplam`;
        document.getElementById('featTrackerMini').textContent = `Seri: ${document.getElementById('streak').textContent}`;
        const d = new Date();
        document.getElementById('featCalMini').textContent = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        if (pTimings) {
            const now = d.getHours() * 60 + d.getMinutes();
            const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            const display = ['İmsak', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
            for (let i = 0; i < names.length; i++) { const [h, m] = pTimings[names[i]].split(':').map(Number); if (h * 60 + m > now) { document.getElementById('featPrayerMini').textContent = `${display[i]} ${pTimings[names[i]]}`; break; } }
        }
    }

    // ═══ DRAWER ═══
    const drawer = document.getElementById('drawer'), overlay = document.getElementById('drawerOverlay');
    document.getElementById('menuBtn').addEventListener('click', () => { drawer.classList.add('open'); overlay.classList.remove('hidden'); });
    function closeDrawer() { drawer.classList.remove('open'); overlay.classList.add('hidden'); }
    overlay.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-item').forEach(item => {
        item.addEventListener('click', () => {
            closeDrawer();
            const act = item.dataset.action;
            if (act === 'favorites') goTo('pageProfile');
            else if (act === 'history') goTo('pageProfile');
            else if (act === 'library') goTo('pageHadith');
            else if (act === 'settings') goTo('pageProfile');
            else if (act === 'about') openSheet('<h3 style="margin-bottom:10px">Mollam</h3><p style="color:var(--t2);line-height:1.6">Mollam, yapay zeka destekli güvenilir bir İslami fıkıh asistanıdır. Muteber kaynakları referans alarak sorularınıza cevap verir.</p><p style="margin-top:10px;color:var(--t3);font-size:12px">Versiyon: ' + APP_VERSION + '</p>');
        });
    });

    // ═══ INFO BUTTON (top right) ═══
    document.getElementById('topRightBtn').style.visibility = 'visible';
    document.getElementById('topRightBtn').addEventListener('click', () => {
        openSheet('<h3 style="margin-bottom:8px">Hakkında</h3><p style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:8px">Mollam yapay zeka destekli dijital fıkıh rehberinizdir. Muteber İslami kaynaklardan derlenen bilgilerle fıkhi sorularınızı cevaplar.</p><div style="display:flex;flex-direction:column;gap:6px;margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--t3)">Versiyon</span><span>' + APP_VERSION + '</span></div><div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--t3)">Mezhep</span><span>' + esc(selectedMadhab) + '</span></div><div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--t3)">Toplam Soru</span><span>' + chatHistory.length + '</span></div></div>');
    });

    // ═══ BOTTOM SHEET ═══
    const bs = document.getElementById('bottomSheet'), bsOverlay = document.getElementById('bsOverlay'), bsContent = document.getElementById('bsContent');
    function openSheet(html) { bsContent.innerHTML = html; bs.classList.add('open'); bsOverlay.classList.remove('hidden'); }
    function closeSheet() { bs.classList.remove('open'); bsOverlay.classList.add('hidden'); }
    bsOverlay.addEventListener('click', closeSheet);

    // ═══ SEARCH ═══
    document.getElementById('featSearch').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.feat-card').forEach(c => { c.classList.toggle('hide', q && !c.textContent.toLowerCase().includes(q)); });
    });

    // ═══ SWIPE ═══
    let tsX = 0, tsY = 0; const app = document.getElementById('app');
    app.addEventListener('touchstart', e => { tsX = e.changedTouches[0].screenX; tsY = e.changedTouches[0].screenY; }, { passive: true });
    app.addEventListener('touchend', e => { const dx = e.changedTouches[0].screenX - tsX, dy = e.changedTouches[0].screenY - tsY; if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) { const mp = ['pageFeatures', 'pageChat', 'pageProfile']; const i = mp.indexOf(currentPage); if (i === -1) return; if (dx < 0 && i < mp.length - 1) goTo(mp[i + 1]); else if (dx > 0 && i > 0) goTo(mp[i - 1]); } }, { passive: true });

    // ═══ PULL TO REFRESH ═══
    document.querySelectorAll('[data-pull]').forEach(el => {
        let startY = 0; const ind = el.querySelector('.pull-indicator');
        el.addEventListener('touchstart', e => { if (el.scrollTop === 0) startY = e.touches[0].clientY; }, { passive: true });
        el.addEventListener('touchmove', e => { if (startY && e.touches[0].clientY - startY > 50) ind.classList.add('active'); }, { passive: true });
        el.addEventListener('touchend', () => {
            if (ind.classList.contains('active')) {
                const t = el.dataset.pull;
                if (t === 'prayer') loadPrayerTimes();
                if (t === 'hadith') loadHadithPage();
                toast('Yenileniyor...', 'info');
                setTimeout(() => ind.classList.remove('active'), 1000);
            }
            startY = 0;
        }, { passive: true });
    });

    // ═══ WIDGETS ═══
    function updateWidgets() {
        document.getElementById('wTesbihVal').textContent = localStorage.getItem('mt_t') || '0';
        updateGoalWidget();
    }

    // Widget clicks
    document.getElementById('wPrayer').addEventListener('click', () => goTo('pagePrayer'));
    document.getElementById('wTesbih').addEventListener('click', () => goTo('pageTesbih'));
    document.getElementById('wGoal').addEventListener('click', () => goTo('pageTracker'));

    // ═══ CHAT ═══
    const chatMsgs = document.getElementById('chatMsgs'), msgInput = document.getElementById('msgInput'), sendBtn = document.getElementById('sendBtn'), charCt = document.getElementById('charCt');
    let selectedMadhab = localStorage.getItem('mollam_madhab') || 'Hanefi';
    let chatHistory = JSON.parse(localStorage.getItem('mollam_h') || '[]');
    let convHistory = [];
    let favorites = JSON.parse(localStorage.getItem('mollam_fav') || '[]');
    function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function renderMd(t) { return esc(t).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }

    msgInput.addEventListener('input', () => { const l = msgInput.value.length; charCt.textContent = l > 0 ? l : ''; charCt.classList.toggle('warn', l > 800 && l <= 950); charCt.classList.toggle('err', l > 950); });
    document.querySelectorAll('.sug-card').forEach(c => c.addEventListener('click', () => { msgInput.value = c.dataset.q; sendMsg(); }));

    function timeStr() { return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }

    function addMsg(text, isUser, sources = [], hasRag = false) {
        document.getElementById('suggestions')?.remove();
        const div = document.createElement('div'); div.className = `msg ${isUser ? 'user' : 'ai'}`;
        const av = document.createElement('div'); av.className = 'msg-av';
        if (isUser) av.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
        else av.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>';
        const bub = document.createElement('div'); bub.className = 'msg-bub';
        if (isUser) { bub.textContent = text; }
        else {
            text.split('\n').filter(l => l.trim()).forEach(l => { const p = document.createElement('p'); p.innerHTML = renderMd(l); bub.appendChild(p); });
            const qb = document.createElement('div'); qb.className = `q-badge ${hasRag ? 'high' : 'low'}`; qb.textContent = hasRag ? 'Kaynak doğrulanmış' : 'Genel bilgi'; bub.appendChild(qb);
            const acts = document.createElement('div'); acts.className = 'msg-acts';
            const mkBtn = (svg, title, fn) => { const b = document.createElement('button'); b.className = 'ma-btn'; b.title = title; b.innerHTML = svg; b.onclick = fn; return b; };
            acts.appendChild(mkBtn('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>', 'Paylaş', () => { const t = `Mollam:\n${text}`; if (navigator.share) navigator.share({ title: 'Mollam', text: t }).catch(() => { }); else navigator.clipboard.writeText(t).then(() => toast('Kopyalandı', 'success')); }));
            acts.appendChild(mkBtn('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', 'Favorile', function () { const s = text.substring(0, 200); if (!favorites.find(f => f.text === s)) { favorites.unshift({ text: s, time: new Date().toLocaleString('tr-TR') }); favorites = favorites.slice(0, 30); localStorage.setItem('mollam_fav', JSON.stringify(favorites)); this.classList.add('fav'); toast('Favorilere eklendi', 'success'); } }));
            acts.appendChild(mkBtn('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>', 'Sesli oku', () => { if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; } const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = .9; speechSynthesis.speak(u); }));
            bub.appendChild(acts);
        }
        // Timestamp
        const tm = document.createElement('div'); tm.className = 'msg-time'; tm.textContent = timeStr();
        bub.appendChild(tm);
        div.append(av, bub); chatMsgs.appendChild(div); chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' });
    }

    function showTyping() { const d = document.createElement('div'); d.className = 'msg ai'; d.id = 'typing'; d.innerHTML = '<div class="msg-av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg></div><div class="msg-bub"><div class="typing"><span></span><span></span><span></span></div></div>'; chatMsgs.appendChild(d); chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' }); }
    function hideTyping() { document.getElementById('typing')?.remove(); }

    // Follow-up suggestions
    function showFollowUp(lastQ) {
        const map = { 'abdest': ['Abdesti bozan şeyler?', 'Mesh nasıl yapılır?'], 'namaz': ['Kazâ namazı nasıl kılınır?', 'Namazda yapılan hatalar?'], 'oruç': ['Fidye nedir?', 'Oruçluyken yapılabilecekler?'], 'zekat': ['Nisap nasıl hesaplanır?', 'Fitre kimlere verilir?'], 'gusül': ['Teyemmüm nasıl alınır?', 'Gusülsüz yapılamayanlar?'] };
        const lq = lastQ.toLowerCase();
        for (const [k, qs] of Object.entries(map)) {
            if (lq.includes(k)) {
                const fu = document.createElement('div'); fu.className = 'followup';
                qs.forEach(q => { const b = document.createElement('button'); b.className = 'fu-btn'; b.textContent = q; b.addEventListener('click', () => { msgInput.value = q; sendMsg(); fu.remove(); }); fu.appendChild(b); });
                chatMsgs.appendChild(fu); chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' }); break;
            }
        }
    }

    async function sendMsg() {
        const text = msgInput.value.trim(); if (!text) return;
        addMsg(text, true); msgInput.value = ''; charCt.textContent = ''; msgInput.focus();
        chatHistory.unshift({ q: text, time: new Date().toLocaleString('tr-TR') }); chatHistory = chatHistory.slice(0, 50); localStorage.setItem('mollam_h', JSON.stringify(chatHistory));
        convHistory.push({ role: 'user', text }); showTyping();
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const r = await fetch(`${API}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message: text, madhab: selectedMadhab, history: convHistory.slice(-6) }) });
            const d = await r.json(); hideTyping();
            if (d.text) {
                addMsg(d.text, false, d.sources || [], d.ragUsed || false);
                if (d.success) {
                    convHistory.push({ role: 'ai', text: (d.text || '').substring(0, 300) });
                    if (convHistory.length > 12) convHistory = convHistory.slice(-12);
                    showFollowUp(text);
                }
            } else {
                addMsg(d.error || 'Bir hata oluştu.', false);
            }
        } catch (e) {
            hideTyping();
            addMsg('Sunucuya bağlanılamadı. İnternet veya sunucu bağlantınızı kontrol edin.', false);
            toast('Bağlantı hatası', 'error');
            console.error('Chat fetch error:', e);
        }
    }
    sendBtn.addEventListener('click', sendMsg);
    msgInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });

    document.getElementById('newChatBtn').addEventListener('click', () => {
        convHistory = [];
        chatMsgs.innerHTML = '<div class="msg ai"><div class="msg-av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg></div><div class="msg-bub"><p>Yeni sohbet başlatıldı.</p></div></div>';
        toast('Yeni sohbet başlatıldı', 'success');
    });
    document.getElementById('exportBtn').addEventListener('click', () => {
        const msgs = chatMsgs.querySelectorAll('.msg'); if (msgs.length <= 1) { toast('Sohbet bulunamadı', 'info'); return; }
        let txt = 'Mollam Sohbet\n' + new Date().toLocaleString('tr-TR') + '\n\n';
        msgs.forEach(m => { const u = m.classList.contains('user'); const b = m.querySelector('.msg-bub'); if (b) txt += `${u ? 'Siz' : 'Mollam'}: ${b.textContent.trim()}\n\n`; });
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })); a.download = `mollam-${new Date().toISOString().split('T')[0]}.txt`; a.click();
        toast('Sohbet indirildi', 'success');
    });

    // ═══ VOICE ═══
    const voiceBtn = document.getElementById('voiceBtn');
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR(); rec.lang = 'tr-TR'; rec.continuous = false; let isRec = false;
        voiceBtn.addEventListener('click', () => { if (isRec) { rec.stop(); return; } rec.start(); isRec = true; voiceBtn.classList.add('recording'); toast('Dinleniyor...', 'info'); });
        rec.onresult = e => { msgInput.value = e.results[0][0].transcript; isRec = false; voiceBtn.classList.remove('recording'); };
        rec.onend = () => { isRec = false; voiceBtn.classList.remove('recording'); };
        rec.onerror = () => { isRec = false; voiceBtn.classList.remove('recording'); toast('Ses algılanamadı', 'error'); };
    } else voiceBtn.style.display = 'none';

    // ═══ PRAYER TIMES ═══
    let pTimings = null;
    // Istanbul fallback times
    const fallbackTimings = { Fajr: '05:42', Sunrise: '07:05', Dhuhr: '12:58', Asr: '16:16', Maghrib: '18:45', Isha: '20:06' };

    async function loadPrayerTimes() {
        let lat = 41.0082, lng = 28.9784;
        try { const pos = await new Promise((rs, rj) => navigator.geolocation.getCurrentPosition(rs, rj, { timeout: 5000 })); lat = pos.coords.latitude; lng = pos.coords.longitude; } catch (e) { }
        document.getElementById('prayerLoc').textContent = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
        try {
            const r = await fetch(`${API}/api/prayer-times?lat=${lat}&lng=${lng}&method=13`);
            const d = await r.json();
            if (d.success) {
                pTimings = d.timings;
                ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(k => {
                    document.getElementById(`time${k}`).textContent = d.timings[k];
                });
            } else { useFallback(); }
        } catch (e) {
            useFallback();
        }
        highlightNext();
        updateWidgetPrayer();
    }

    function useFallback() {
        pTimings = fallbackTimings;
        ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(k => {
            document.getElementById(`time${k}`).textContent = fallbackTimings[k];
        });
        document.getElementById('prayerLoc').textContent = 'İstanbul (varsayılan)';
    }

    function getNextPrayerInfo() {
        if (!pTimings) return null;
        const now = new Date();
        const curSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const names = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const display = ['İmsak', 'Güneş', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
        for (let i = 0; i < names.length; i++) {
            const [h, m] = pTimings[names[i]].split(':').map(Number);
            const pSec = h * 3600 + m * 60;
            if (pSec > curSec) return { name: display[i], key: names[i], diff: pSec - curSec, idx: i };
        }
        // All prayers passed — next is tomorrow's Fajr
        const [fh, fm] = pTimings.Fajr.split(':').map(Number);
        const fajrSec = fh * 3600 + fm * 60;
        return { name: 'İmsak', key: 'Fajr', diff: (86400 - curSec) + fajrSec, idx: -1 };
    }

    function fmtCountdown(sec) {
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function highlightNext() {
        if (!pTimings) return;
        const info = getNextPrayerInfo();
        if (!info) return;
        const names = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        document.querySelectorAll('.p-row').forEach((row, i) => {
            row.classList.toggle('active', i === info.idx);
        });
        document.getElementById('nextTime').textContent = fmtCountdown(info.diff);
        document.getElementById('nextLabel').textContent = `${info.name} namazına`;
    }

    function updateWidgetPrayer() {
        if (!pTimings) return;
        const info = getNextPrayerInfo();
        if (!info) return;
        document.getElementById('wPrayerLabel').textContent = info.name;
        document.getElementById('wPrayerVal').textContent = fmtCountdown(info.diff);
    }

    // Load on start + LIVE countdown every second
    loadPrayerTimes();
    setInterval(() => { highlightNext(); updateWidgetPrayer(); }, 1000);

    // ═══ TRACKER ═══
    const today = new Date().toISOString().split('T')[0];
    let ptLog = JSON.parse(localStorage.getItem('mollam_pt') || '{}');
    if (!ptLog[today]) ptLog[today] = {};
    document.querySelectorAll('#trackerGrid input').forEach(cb => {
        if (ptLog[today][cb.dataset.prayer]) cb.checked = true;
        cb.addEventListener('change', () => { ptLog[today][cb.dataset.prayer] = cb.checked; localStorage.setItem('mollam_pt', JSON.stringify(ptLog)); updateStreak(); toast(cb.checked ? 'Namaz işaretlendi' : 'İşaret kaldırıldı', 'success'); });
    });
    function updateStreak() {
        let s = 0; const d = new Date();
        for (let i = 0; i < 365; i++) { const k = d.toISOString().split('T')[0], log = ptLog[k]; if (log && Object.values(log).filter(Boolean).length === 5) { s++; d.setDate(d.getDate() - 1); } else break; }
        document.getElementById('streak').textContent = s;
    }
    updateStreak();

    // ═══ WEEKLY GRID ═══
    function renderWeek() {
        const g = document.getElementById('weekGrid'); g.innerHTML = '';
        const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const now = new Date(); const todayKey = now.toISOString().split('T')[0];
        // Get start of week (Monday)
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
            const key = d.toISOString().split('T')[0];
            const log = ptLog[key]; const count = log ? Object.values(log).filter(Boolean).length : 0;
            const div = document.createElement('div'); div.className = 'week-day';
            let circleClass = 'wd-circle'; if (count === 5) circleClass += ' full'; else if (count > 0) circleClass += ' partial'; if (key === todayKey) circleClass += ' today';
            div.innerHTML = `<span class="wd-label">${dayNames[i]}</span><div class="${circleClass}">${count}</div>`;
            g.appendChild(div);
        }
    }

    // ═══ GOALS ═══
    let goalLog = JSON.parse(localStorage.getItem('mollam_goals') || '{}');
    if (!goalLog[today]) goalLog[today] = {};
    document.querySelectorAll('#goals input').forEach(cb => {
        if (goalLog[today][cb.dataset.goal]) cb.checked = true;
        cb.addEventListener('change', () => { goalLog[today][cb.dataset.goal] = cb.checked; localStorage.setItem('mollam_goals', JSON.stringify(goalLog)); updateGoals(); if (cb.checked) toast('Hedef tamamlandı!', 'success'); });
    });
    function updateGoals() {
        const checks = document.querySelectorAll('#goals input');
        const done = Array.from(checks).filter(c => c.checked).length;
        const total = checks.length;
        document.getElementById('goalFill').style.width = `${(done / total) * 100}%`;
        document.getElementById('goalText').textContent = `${done} / ${total} hedef tamamlandı`;
        updateGoalWidget();
    }
    function updateGoalWidget() {
        const checks = document.querySelectorAll('#goals input');
        const done = Array.from(checks).filter(c => c.checked).length;
        document.getElementById('wGoalVal').textContent = `${done}/${checks.length}`;
    }
    updateGoals();

    // ═══ TESBIH ═══
    let tc = parseInt(localStorage.getItem('mt_c') || '0'), tt = parseInt(localStorage.getItem('mt_t') || '0');
    let tg = parseInt(localStorage.getItem('mt_g') || '33'), tz = localStorage.getItem('mt_z') || 'Sübhanallah';
    const circ = 2 * Math.PI * 90;
    function updateT() {
        document.getElementById('tCount').textContent = tc; document.getElementById('tTotal').textContent = tt;
        document.getElementById('tTarget').textContent = tg || '∞'; document.getElementById('zikirName').textContent = tz;
        document.getElementById('ringBar').style.strokeDashoffset = circ - (tg > 0 ? Math.min(tc / tg, 1) : 0) * circ;
        localStorage.setItem('mt_c', tc); localStorage.setItem('mt_t', tt);
        document.getElementById('wTesbihVal').textContent = tt;
    }
    updateT();
    document.getElementById('tapBtn').addEventListener('click', () => {
        tc++; tt++; const el = document.getElementById('tCount'); el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 60);
        if (navigator.vibrate) navigator.vibrate(10); playClick();
        if (tg > 0 && tc >= tg) { tc = 0; if (navigator.vibrate) navigator.vibrate([30, 15, 30]); toast('Tur tamamlandı!', 'success'); }
        updateT();
    });
    // Keyboard accessibility for tesbih
    document.getElementById('tapBtn').setAttribute('aria-label', 'Tesbih çek - dokunun veya Space/Enter tuşuna basın');
    document.querySelectorAll('.t-mode').forEach(b => { if (parseInt(b.dataset.target) === tg) b.classList.add('active'); b.addEventListener('click', () => { document.querySelectorAll('.t-mode').forEach(x => x.classList.remove('active')); b.classList.add('active'); tg = parseInt(b.dataset.target); tc = 0; localStorage.setItem('mt_g', tg); updateT(); }); });
    document.querySelectorAll('.t-pre').forEach(b => { if (b.dataset.z === tz) b.classList.add('active'); b.addEventListener('click', () => { document.querySelectorAll('.t-pre').forEach(x => x.classList.remove('active')); b.classList.add('active'); tz = b.dataset.z; localStorage.setItem('mt_z', tz); updateT(); }); });
    document.getElementById('resetBtn').addEventListener('click', () => { tc = 0; updateT(); toast('Sayaç sıfırlandı', 'info'); });

    // ═══ DUAS ═══
    const duaIcons = {
        sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 18a5 5 0 00-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/></svg>',
        mosque: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18"/><path d="M5 21v-6a7 7 0 0114 0v6"/><path d="M9 21v-4a3 3 0 016 0v4"/><path d="M12 3v1"/><path d="M12 7a2 2 0 00-2 2"/><path d="M12 7a2 2 0 012 2"/><circle cx="12" cy="5" r="1"/></svg>',
        home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
        travel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z"/></svg>',
        book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
        lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
        mercy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg>'
    };

    let duasLoaded = false;
    async function loadDuas() {
        if (duasLoaded) return;
        try {
            const r = await fetch(`${API}/api/duas`); const d = await r.json();
            if (d.success) {
                const el = document.getElementById('duaList'); el.innerHTML = '';
                d.categories.forEach(cat => {
                    const icon = duaIcons[cat.icon] || duaIcons.book;
                    const btn = document.createElement('button'); btn.className = 'dua-cat';
                    btn.innerHTML = `${icon}${esc(cat.category)}<span class="dua-ct">${cat.duas.length}</span>`;
                    let detail = null;
                    btn.addEventListener('click', () => {
                        if (detail) { detail.remove(); detail = null; return; }
                        detail = document.createElement('div'); detail.className = 'dua-detail';
                        cat.duas.forEach(d => { detail.innerHTML += `<div class="d-item"><div class="d-title">${esc(d.title)}</div><div class="d-arabic">${esc(d.arabic)}</div><div class="d-reading">${esc(d.reading)}</div><div class="d-meaning">${esc(d.meaning)}</div><div class="d-source">${esc(d.source)}</div></div>`; });
                        btn.after(detail);
                    });
                    el.appendChild(btn);
                });
                duasLoaded = true;
            }
        } catch (e) { document.getElementById('duaList').innerHTML = '<p class="muted">Yüklenemedi.</p>'; }
    }

    // ═══ QIBLA ═══
    let qAngle = 0;
    function calcQ(lat, lng) { const kL = 21.4225 * Math.PI / 180, kN = 39.8262 * Math.PI / 180; lat *= Math.PI / 180; lng *= Math.PI / 180; return ((Math.atan2(Math.sin(kN - lng), Math.cos(lat) * Math.tan(kL) - Math.sin(lat) * Math.cos(kN - lng)) * 180 / Math.PI) + 360) % 360; }
    navigator.geolocation?.getCurrentPosition(p => { qAngle = calcQ(p.coords.latitude, p.coords.longitude); document.getElementById('compassInfo').textContent = `Kıble: ${Math.round(qAngle)}°`; }, () => { qAngle = calcQ(41.0082, 28.9784); document.getElementById('compassInfo').textContent = `Kıble: ~${Math.round(qAngle)}°`; });
    if (window.DeviceOrientationEvent) { const handler = e => { let h = e.webkitCompassHeading || (360 - (e.alpha || 0)); const n = document.getElementById('needle'), k = document.getElementById('kaaba'); if (n) n.style.transform = `translateX(-50%) rotate(${h}deg)`; if (k) { k.style.transform = `translateX(-50%) rotate(${qAngle - h}deg)`; k.style.top = '14px'; } }; if (typeof DeviceOrientationEvent.requestPermission === 'function') { document.getElementById('compass').addEventListener('click', async () => { try { if (await DeviceOrientationEvent.requestPermission() === 'granted') addEventListener('deviceorientation', handler); } catch (e) { } }); } else addEventListener('deviceorientation', handler); }

    // ═══ CALENDAR ═══
    function loadCalendar() {
        const now = new Date();
        // Miladi tarih
        const gregStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('calGreg').textContent = gregStr;
        document.getElementById('calDay').textContent = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][now.getDay()];
        // Hicri tarih
        try {
            const hijri = new Intl.DateTimeFormat('tr-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
            document.getElementById('calHijri').textContent = hijri;
        } catch (e) { document.getElementById('calHijri').textContent = ''; }
        // Ayet
        fetch(`${API}/api/ayet`).then(r => r.json()).then(d => { if (d.success) { document.getElementById('ayetTxt').textContent = `"${d.ayet.text}"`; document.getElementById('ayetSrc').textContent = `— ${d.ayet.sure} ${d.ayet.ayet}`; } }).catch(() => { });

        // İslami önemli günler - Hicri takvime göre yaklaşık hesaplama
        // Hicri yıl başlangıcını baz alarak dinamik hesaplama
        function getIslamicEvents(year) {
            // Hicri takvim yıllık ~10-11 gün geri kayar
            // 2026 baz alınarak öteleme hesabı
            const baseYear = 2026;
            const yearDiff = year - baseYear;
            const dayShift = Math.round(yearDiff * -10.6);

            function shifted(m, d) {
                const dt = new Date(year, m, d + dayShift);
                return dt;
            }

            return [
                { n: 'Regaib Kandili', d: shifted(0, 22) },
                { n: 'Miraç Kandili', d: shifted(1, 12) },
                { n: 'Berat Kandili', d: shifted(2, 1) },
                { n: 'Ramazan Başlangıcı', d: shifted(2, 17) },
                { n: 'Kadir Gecesi', d: shifted(3, 12) },
                { n: 'Ramazan Bayramı', d: shifted(3, 16) },
                { n: 'Arefe (Kurban)', d: shifted(5, 23) },
                { n: 'Kurban Bayramı', d: shifted(5, 24) },
                { n: 'Hicri Yılbaşı', d: shifted(6, 17) },
                { n: 'Aşure Günü', d: shifted(7, 25) },
                { n: 'Mevlid Kandili', d: shifted(9, 5) }
            ];
        }

        const currentYear = now.getFullYear();
        const allEvents = [
            ...getIslamicEvents(currentYear),
            ...getIslamicEvents(currentYear + 1)
        ];
        const upcoming = allEvents
            .map(i => ({ ...i, diff: Math.ceil((i.d - now) / 86400000) }))
            .filter(i => i.diff >= 0)
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 8);

        document.getElementById('datesList').innerHTML = upcoming.map(d => {
            const gregDate = d.d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            return `<div class="date-row"><div class="date-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg></div><div><strong>${esc(d.n)}</strong><small>${gregDate}</small></div><span class="date-cd">${d.diff === 0 ? 'Bugün!' : d.diff + ' gün'}</span></div>`;
        }).join('');
    }

    // ═══ ESMA ═══
    let esmaLoaded = false;
    async function loadEsma() {
        if (esmaLoaded) return;
        try { const r = await fetch(`${API}/api/esmaul-husna`); const d = await r.json(); if (d.success) { const g = document.getElementById('esmaGrid'); g.innerHTML = ''; d.names.forEach(n => { const c = document.createElement('div'); c.className = 'esma-card'; c.innerHTML = `<div class="esma-ar">${esc(n.arabic)}</div><div class="esma-name">${esc(n.transliteration)}</div><div class="esma-mean">${esc(n.meaning)}</div>`; c.addEventListener('click', () => { document.querySelectorAll('.esma-card.exp').forEach(x => { if (x !== c) x.classList.remove('exp'); }); c.classList.toggle('exp'); }); g.appendChild(c); }); esmaLoaded = true; } } catch (e) { }
    }

    // ═══ HADITH ═══
    async function loadHadithPage() {
        try { const [hr, ar] = await Promise.all([fetch(`${API}/api/hadith`), fetch(`${API}/api/ayet`)]); const [hd, ad] = await Promise.all([hr.json(), ar.json()]); if (hd.success) { document.getElementById('hadithTxt').textContent = `"${hd.hadith.text}"`; document.getElementById('hadithSrc').textContent = `— ${hd.hadith.source}`; } if (ad.success) { document.getElementById('hadithAyetTxt').textContent = `"${ad.ayet.text}"`; document.getElementById('hadithAyetSrc').textContent = `— ${ad.ayet.sure} ${ad.ayet.ayet}`; } } catch (e) { }
    }

    // ═══ PROFILE ═══
    function updateProfileUI() {
        const nameView = document.getElementById('profileNameView');
        const emailView = document.getElementById('profileEmailView');
        const authCard = document.getElementById('profileAuthCard');
        const logoutCard = document.getElementById('profileLogoutCard');
        const avatarView = document.getElementById('profileAvatarView');

        if (currentUser) {
            nameView.textContent = currentUser.name;
            emailView.textContent = currentUser.email;
            if (currentUser.avatar && currentUser.avatar !== 'default.png') {
                avatarView.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            }
            authCard.classList.add('hidden');
            logoutCard.classList.remove('hidden');
        } else {
            nameView.textContent = 'Misafir Kullanıcı';
            emailView.textContent = '';
            avatarView.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
            authCard.classList.remove('hidden');
            logoutCard.classList.add('hidden');
        }
    }

    // Auth Modal Logic
    const authModal = document.getElementById('authModal');
    const authOverlay = document.getElementById('authOverlay');
    let isLoginMode = true;

    function openAuthModal() {
        authModal.classList.remove('hidden');
        authOverlay.classList.remove('hidden');

        // Render Google Button when modal opens
        if (window.google && google.accounts && google.accounts.id) {
            if (location.protocol === 'file:') {
                document.getElementById("googleAuthBtnContainer").innerHTML = '<p class="muted" style="text-align:center; font-size:11px;">(APK sürümünde Google ile giriş desteklenmiyor. Lütfen e-posta kullanın.)</p>';
                return;
            }
            google.accounts.id.initialize({
                client_id: "749876282734-ns7ta6ja20plr02drqhvnerdnp57ujdc.apps.googleusercontent.com",
                callback: handleGoogleRes
            });
            google.accounts.id.renderButton(
                document.getElementById("googleAuthBtnContainer"),
                { theme: "outline", size: "large", type: "standard", shape: "rectangular", text: "continue_with" }
            );
        }
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        authOverlay.classList.add('hidden');
        document.getElementById('authError').classList.add('hidden');
    }

    async function handleGoogleRes(response) {
        const errObj = document.getElementById('authError');
        try {
            const btn = document.getElementById('authSubmitBtn');
            btn.textContent = 'Google ile Giriş Yapılıyor...';
            btn.disabled = true;

            const res = await fetch(API + '/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: response.credential })
            });

            const data = await res.json();
            btn.textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
            btn.disabled = false;

            if (res.ok) {
                setAuth({
                    id: data._id,
                    name: data.name,
                    email: data.email,
                    avatar: data.avatar
                }, data.token);
                toast('Google ile giriş başarılı', 'success');
                closeAuthModal();
                await syncUserData(); // Sync data from server
                loadProfile(); // Refresh UI
            } else {
                errObj.textContent = data.error || 'Google girişi başarısız oldu.';
                errObj.classList.remove('hidden');
            }
        } catch (error) {
            errObj.textContent = 'Sunucu bağlantı hatası.';
            errObj.classList.remove('hidden');
        }
    }

    document.getElementById('openLoginBtn')?.addEventListener('click', openAuthModal);

    // Guest Bypass
    document.getElementById('guestBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeAuthModal();
        showOnboarding();
        toast('Misafir olarak devam ediliyor', 'info');
    });

    document.getElementById('authToggleLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        document.getElementById('authTitle').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        document.getElementById('authToggleLink').textContent = isLoginMode ? 'Kayıt Ol' : 'Giriş Yap';
        document.getElementById('authToggleLink').parentElement.firstChild.textContent = isLoginMode ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? ';

        if (isLoginMode) {
            document.getElementById('nameGroup').classList.add('hidden');
            document.getElementById('authName').removeAttribute('required');
        } else {
            document.getElementById('nameGroup').classList.remove('hidden');
            document.getElementById('authName').setAttribute('required', 'true');
        }
        document.getElementById('authError').classList.add('hidden');
    });

    document.getElementById('authForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const name = document.getElementById('authName').value;
        const errObj = document.getElementById('authError');

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const body = isLoginMode ? { email, password } : { name, email, password };

        try {
            const btn = document.getElementById('authSubmitBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Bekleyin...';
            btn.disabled = true;

            const res = await fetch(API + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            btn.textContent = originalText;
            btn.disabled = false;

            if (res.ok) {
                setAuth({
                    id: data._id,
                    name: data.name,
                    email: data.email,
                    avatar: data.avatar
                }, data.token);
                toast(isLoginMode ? 'Giriş başarılı' : 'Kayıt başarılı', 'success');
                closeAuthModal();
                await syncUserData(); // Sync data from server
                loadProfile(); // Refresh UI
            } else {
                errObj.textContent = data.error || 'Bir hata oluştu.';
                errObj.classList.remove('hidden');
            }
        } catch (error) {
            errObj.textContent = 'Sunucu bağlantı hatası.';
            errObj.classList.remove('hidden');
        }
    });


    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
            setAuth(null, null);
            toast('Çıkış yapıldı', 'info');
        }
    });

    async function syncUserData() {
        if (!authToken) return;
        try {
            const r = await fetch(`${API}/api/user-data`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (r.ok) {
                const data = await r.json();

                // For demonstration, map db favorites to local storage schema
                if (data.favorites && data.favorites.length > 0) {
                    // Normally you would merge these. Let's just override local for simplicity if server has data
                    const mappedFavs = data.favorites.map(f => ({ text: f.text, time: f.addedAt }));
                    favorites = mappedFavs;
                    localStorage.setItem('mollam_fav', JSON.stringify(favorites));
                }

                // Similarly map settings...
                if (data.settings && data.settings.theme) {
                    applyTheme(data.settings.theme);
                    localStorage.setItem('mollam_theme', data.settings.theme);
                }
            }
        } catch (e) {
            console.error('Data sync failed', e);
        }
    }

    function loadProfile() {
        updateProfileUI();

        const favEl = document.getElementById('favList');
        if (favorites.length > 0) {
            favEl.innerHTML = '';
            favorites.forEach((f, i) => {
                const div = document.createElement('div'); div.className = 'fav-item';
                const fSpan = document.createElement('span'); fSpan.className = 'fav-text'; fSpan.textContent = f.text.length > 70 ? f.text.slice(0, 70) + '...' : f.text;
                const del = document.createElement('span'); del.className = 'fav-del'; del.textContent = '✕'; del.dataset.i = i;
                del.addEventListener('click', async () => {
                    favorites.splice(i, 1);
                    localStorage.setItem('mollam_fav', JSON.stringify(favorites));

                    if (authToken) {
                        try {
                            // Example deletion call
                            // await fetch(`${API}/api/user-data/favorites/${f._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }});
                        } catch (e) { }
                    }

                    loadProfile();
                    toast('Favoriden kaldırıldı', 'info');
                });
                div.append(fSpan, del); favEl.appendChild(div);
            });
        } else { favEl.innerHTML = '<p class="muted">Henüz favori eklenmedi.</p>'; }
    }
    document.getElementById('clearHistBtn').addEventListener('click', () => { if (confirm('Geçmiş silinecek. Emin misiniz?')) { chatHistory = []; localStorage.removeItem('mollam_h'); loadProfile(); toast('Geçmiş temizlendi', 'success'); } });
    document.querySelectorAll('input[name="madhab"]').forEach(r => r.addEventListener('change', e => { selectedMadhab = e.target.value; localStorage.setItem('mollam_madhab', selectedMadhab); toast(`Mezhep: ${selectedMadhab}`, 'info'); }));

    // Init
    updateWidgets();
});
