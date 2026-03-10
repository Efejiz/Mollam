export function initUI() {
    initTheme();
    initFontSize();
    initSound();
    initNotifications();
    initDynamicBg();
    initParticles();
    initRipples();
    initDrawer();
    initSwipe();
}

export function toast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };
    t.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
        t.classList.add('out');
        setTimeout(() => t.remove(), 250);
    }, 2200);
}

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const autoThemeToggle = document.getElementById('autoThemeToggle');
    if (!themeToggle || !autoThemeToggle) return;

    const savedTheme = localStorage.getItem('mollam_theme') || 'dark';
    const autoTheme = localStorage.getItem('mollam_auto_theme') === 'true';

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        const m = document.querySelector('meta[name="theme-color"]');
        if (m) m.content = t === 'dark' ? '#050F0A' : '#F8F4ED';
    }

    if (autoTheme) {
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        applyTheme(sys);
        themeToggle.checked = sys === 'dark';
        autoThemeToggle.checked = true;
    } else {
        applyTheme(savedTheme);
        themeToggle.checked = savedTheme === 'dark';
    }

    themeToggle.addEventListener('change', () => {
        const t = themeToggle.checked ? 'dark' : 'light';
        applyTheme(t);
        localStorage.setItem('mollam_theme', t);
        autoThemeToggle.checked = false;
        localStorage.setItem('mollam_auto_theme', 'false');
    });

    autoThemeToggle.addEventListener('change', () => {
        localStorage.setItem('mollam_auto_theme', autoThemeToggle.checked);
        if (autoThemeToggle.checked) {
            const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            applyTheme(sys);
            themeToggle.checked = sys === 'dark';
            toast('Sistem teması etkin', 'info');
        }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('mollam_auto_theme') === 'true') {
            const t = e.matches ? 'dark' : 'light';
            applyTheme(t);
            themeToggle.checked = e.matches;
        }
    });
}

function initFontSize() {
    let arabicSize = parseInt(localStorage.getItem('mollam_font') || '18');
    document.documentElement.style.setProperty('--arabic-size', arabicSize + 'px');
    const fsVal = document.getElementById('fontSizeVal');
    if (fsVal) fsVal.textContent = arabicSize + 'px';

    document.querySelectorAll('.font-btn').forEach(b => b.addEventListener('click', () => {
        arabicSize = Math.max(14, Math.min(28, arabicSize + (b.dataset.size === '+' ? 2 : -2)));
        document.documentElement.style.setProperty('--arabic-size', arabicSize + 'px');
        if (fsVal) fsVal.textContent = arabicSize + 'px';
        localStorage.setItem('mollam_font', arabicSize.toString());
        toast(`Yazı boyutu: ${arabicSize}px`, 'info');
    }));
}

export let audioCtx;
const soundToggle = document.getElementById('soundToggle');
function initSound() {
    if (soundToggle) {
        soundToggle.checked = localStorage.getItem('mollam_sound') === 'true';
        soundToggle.addEventListener('change', () => {
            localStorage.setItem('mollam_sound', soundToggle.checked);
            toast(soundToggle.checked ? 'Ses açıldı' : 'Ses kapatıldı', 'info');
        });
    }
}

export function playClick() {
    if (!soundToggle || !soundToggle.checked) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = 800;
    o.type = 'sine';
    g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    o.start(audioCtx.currentTime);
    o.stop(audioCtx.currentTime + 0.08);
}

function initNotifications() {
    const notifToggle = document.getElementById('notifToggle');
    if (notifToggle) {
        notifToggle.checked = localStorage.getItem('mollam_notif') === 'true';
        // Logic for requesting notification permission would go here
    }
}

function initDynamicBg() {
    function updateBg() {
        const h = new Date().getHours();
        const bg = document.getElementById('bgGrad');
        if (!bg) return;
        let g;
        if (h >= 5 && h < 7) g = 'radial-gradient(ellipse at 50% 0%,rgba(100,50,120,.06) 0%,transparent 55%)';
        else if (h < 12) g = 'radial-gradient(ellipse at 50% 0%,rgba(255,200,50,.05) 0%,transparent 55%)';
        else if (h < 16) g = 'radial-gradient(ellipse at 50% 0%,rgba(0,100,0,.05) 0%,transparent 55%)';
        else if (h < 19) g = 'radial-gradient(ellipse at 50% 0%,rgba(200,100,30,.06) 0%,transparent 55%)';
        else g = 'radial-gradient(ellipse at 50% 0%,rgba(0,50,100,.05) 0%,transparent 55%)';
        bg.style.background = g;
    }
    updateBg();
    setInterval(updateBg, 300000); // 5 min
}

function initParticles() {
    const cvs = document.getElementById('particleCanvas');
    if (!cvs) return;
    const cx = cvs.getContext('2d');
    let pts = [], aId;

    function rz() {
        cvs.width = window.innerWidth;
        cvs.height = window.innerHeight;
    }
    rz();
    window.addEventListener('resize', rz);

    class Pt {
        constructor() { this.r(); }
        r() {
            this.x = Math.random() * cvs.width;
            this.y = Math.random() * cvs.height;
            this.tx = cvs.width / 2 + (Math.random() - 0.5) * 80;
            this.ty = cvs.height * 0.35 + (Math.random() - 0.5) * 40;
            this.sp = 0.002 + Math.random() * 0.003;
            this.sz = Math.random() * 1.5 + 0.3;
            this.life = 0;
            this.ml = 200 + Math.random() * 200;
            this.op = 0;
            const v = Math.random() * 35;
            this.cr = 170 + v;
            this.cg = 138 + v * 0.5;
        }
        u() {
            this.life++;
            this.x += (this.tx - this.x) * this.sp;
            this.y += (this.ty - this.y) * this.sp;
            if (this.life < 20) this.op = this.life / 20;
            else if (this.life > this.ml - 20) this.op = Math.max(0, (this.ml - this.life) / 20);
            else this.op = 0.4 + Math.sin(this.life * 0.03) * 0.15;

            this.x += Math.sin(this.life * 0.018) * 0.2;
            if (this.life >= this.ml) this.r();
        }
        d() {
            cx.beginPath();
            cx.arc(this.x, this.y, this.sz, 0, Math.PI * 2);
            cx.fillStyle = `rgba(${this.cr},${this.cg},30,${this.op * 0.2})`;
            cx.fill();
        }
    }

    const ptCount = window.innerWidth <= 430 ? 10 : 20;
    for (let i = 0; i < ptCount; i++) {
        const p = new Pt();
        p.life = Math.random() * p.ml;
        pts.push(p);
    }

    function anim() {
        cx.clearRect(0, 0, cvs.width, cvs.height);
        pts.forEach(p => { p.u(); p.d(); });
        aId = requestAnimationFrame(anim);
    }
    anim();

    document.addEventListener('visibilitychange', () => {
        document.hidden ? cancelAnimationFrame(aId) : anim();
    });
}

function initRipples() {
    function createRipple(e) {
        const btn = e.currentTarget;
        const circle = document.createElement('span');
        const d = Math.max(btn.clientWidth, btn.clientHeight);
        const rect = btn.getBoundingClientRect();

        // Handle touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        circle.style.cssText = `width:${d}px;height:${d}px;left:${clientX - rect.left - d / 2}px;top:${clientY - rect.top - d / 2}px;position:absolute;border-radius:50%;background:rgba(255,255,255,.15);transform:scale(0);animation:rippleAnim .4s ease-out;pointer-events:none`;

        const computedStyle = window.getComputedStyle(btn);
        if (computedStyle.position === 'static') {
            btn.style.position = 'relative';
        }
        btn.style.overflow = 'hidden';

        btn.appendChild(circle);
        circle.addEventListener('animationend', () => circle.remove());
    }

    const selectors = '.nav-btn, .nav-center, .feat-card, .widget, .sug-card, .send-btn, .ob-next, .auth-btn, .action-btn, .drawer-item, .topbar-btn, .back-btn, .sm-btn';
    document.querySelectorAll(selectors).forEach(el => {
        el.addEventListener('mousedown', createRipple);
        el.addEventListener('touchstart', createRipple, { passive: true });
    });
}

export function openSheet(html) {
    const bs = document.getElementById('bottomSheet');
    const bsOverlay = document.getElementById('bsOverlay');
    const bsContent = document.getElementById('bsContent');
    if (!bs || !bsOverlay || !bsContent) return;

    bsContent.innerHTML = html;
    bs.classList.add('open');
    bsOverlay.classList.remove('hidden');
}

export function closeSheet() {
    const bs = document.getElementById('bottomSheet');
    const bsOverlay = document.getElementById('bsOverlay');
    if (!bs || !bsOverlay) return;

    bs.classList.remove('open');
    bsOverlay.classList.add('hidden');
}

function initDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    const menuBtn = document.getElementById('menuBtn');

    if (!drawer || !overlay || !menuBtn) return;

    menuBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        overlay.classList.remove('hidden');
    });

    overlay.addEventListener('click', closeDrawer);

    document.querySelectorAll('.drawer-item').forEach(item => {
        item.addEventListener('click', () => {
            closeDrawer();
            const act = item.dataset.action;
            const goToParams = window.goToPage; // Assumes navigation function is exposed

            if (!goToParams) return;

            if (act === 'favorites') {
                goToParams('pageProfile');
                setTimeout(() => document.getElementById('favList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
            }
            else if (act === 'history') {
                goToParams('pageProfile');
                setTimeout(() => document.getElementById('histList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
            }
            else if (act === 'library') goToParams('pageHadith');
            else if (act === 'settings') goToParams('pageProfile');
        });
    });

    const bsOverlay = document.getElementById('bsOverlay');
    if (bsOverlay) {
        bsOverlay.addEventListener('click', closeSheet);
    }
}

export function closeDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
}

function initSwipe() {
    let tsX = 0, tsY = 0;
    const app = document.getElementById('app');
    if (!app) return;

    app.addEventListener('touchstart', e => {
        tsX = e.changedTouches[0].screenX;
        tsY = e.changedTouches[0].screenY;
    }, { passive: true });

    app.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].screenX - tsX;
        const dy = e.changedTouches[0].screenY - tsY;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
            const mp = ['pageFeatures', 'pageChat', 'pageProfile'];
            const i = mp.indexOf(window.currentPage);
            if (i === -1 || !window.goToPage) return;

            if (dx < 0 && i < mp.length - 1) {
                // Swipe Left -> Next Page
                window.goToPage(mp[i + 1]);
            } else if (dx > 0 && i > 0) {
                // Swipe Right -> Prev Page
                window.goToPage(mp[i - 1]);
            }
        }
    }, { passive: true });
}

export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
