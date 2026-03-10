import { APP_VERSION } from './api.js';
import { initUI, openSheet, closeSheet, closeDrawer } from './ui.js';
import { initAuth, currentUser, updateProfileUI } from './auth.js';
import { initChat } from './chat.js';
import { initPrayer } from './prayer.js';
import { initFeatures, loadCalendar, loadEsma, loadDuas, loadHadithPage } from './features.js';

window.currentPage = 'pageChat';

function initNavigation() {
    const pages = document.querySelectorAll('.page');
    const navItems = document.querySelectorAll('.nav-btn, .nav-center');
    const topTitle = document.getElementById('topTitle');

    window.goToPage = (pid) => {
        pages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(pid);
        if (targetPage) targetPage.classList.add('active');

        navItems.forEach(n => {
            n.classList.remove('active');
            if (n.dataset.page === pid) n.classList.add('active');
        });

        const titles = {
            'pageChat': 'Mollam',
            'pagePrayer': 'Namaz Vakitleri',
            'pageTracker': 'Namaz Takibi',
            'pageTesbih': 'Tesbih',
            'pageDua': 'Dualar',
            'pageQibla': 'Kıble Pusulası',
            'pageCalendar': 'Takvim',
            'pageEsma': 'Esmaül Hüsna',
            'pageHadith': 'Hadis & Ayet',
            'pageZakat': 'Zekat Hesaplama',
            'pageFeatures': 'Keşfet',
            'pageProfile': 'Profil'
        };
        if (topTitle) topTitle.textContent = titles[pid] || 'Mollam';

        window.currentPage = pid;

        // Page load triggers
        if (pid === 'pageProfile') updateProfileUI();
        if (pid === 'pageCalendar') loadCalendar();
        if (pid === 'pageEsma') loadEsma();
        if (pid === 'pageDua') loadDuas();
        if (pid === 'pageHadith') loadHadithPage();

        window.scrollTo(0, 0);
    };

    navItems.forEach(n => {
        n.addEventListener('click', () => {
            if ('vibrate' in navigator) navigator.vibrate(10);
            const t = n.dataset.page;
            if (t) window.goToPage(t);
        });
    });

    document.querySelectorAll('.feat-card').forEach(c => {
        c.addEventListener('click', () => {
            if ('vibrate' in navigator) navigator.vibrate(15);
            // Add a subtle pop animation before navigation
            c.classList.remove('feat-pop');
            void c.offsetWidth;
            c.classList.add('feat-pop');

            const t = c.dataset.feat;
            if (t) {
                const pageId = 'page' + t.charAt(0).toUpperCase() + t.slice(1);
                setTimeout(() => window.goToPage(pageId), 150);
            }
        });
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const b = btn.dataset.back;
            if (b) window.goToPage(b);
        });
    });

    // PWA Back Button Support
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            window.goToPage(e.state.page);
        } else {
            window.goToPage('pageChat');
        }
    });

    // Replace original state
    history.replaceState({ page: 'pageChat' }, '', '');

    // Override goToPage to support history api
    const origGoToPage = window.goToPage;
    window.goToPage = (pid) => {
        if (window.currentPage !== pid) {
            history.pushState({ page: pid }, '', '');
        }
        origGoToPage(pid);
    };
}

function initOnboarding() {
    window.showOnboarding = () => {
        const onb = document.getElementById('onboarding');
        const stps = document.querySelectorAll('.ob-step');
        const next = document.getElementById('obNext');
        const skip = document.getElementById('obSkip');
        const dots = document.querySelectorAll('.ob-dot');
        let cur = 0;

        if (!onb) return;

        onb.classList.remove('hidden');

        function sh(i) {
            stps.forEach((s, idx) => {
                s.style.display = idx === i ? 'block' : 'none';
            });
            dots.forEach((d, idx) => {
                d.classList.toggle('active', idx === i);
            });
            next.textContent = i === stps.length - 1 ? 'Başla' : 'İleri';
        }

        sh(0);

        const finishOb = () => {
            onb.style.opacity = '0';
            setTimeout(() => onb.classList.add('hidden'), 300);
            localStorage.setItem('mollam_ob', 'done');
        };

        if (next) {
            next.onclick = () => {
                cur++;
                if (cur >= stps.length) finishOb();
                else sh(cur);
            };
        }
        if (skip) skip.onclick = finishOb;
    };

    if (!localStorage.getItem('mollam_ob') && !currentUser) {
        setTimeout(() => {
            if (window.openAuthModal) window.openAuthModal();
        }, 1500);
    }
}

function checkVersion() {
    const v = localStorage.getItem('mollam_v');
    if (v !== APP_VERSION) {
        localStorage.setItem('mollam_v', APP_VERSION);
    }
}

// Global scope bindings for inline event handlers in HTML if needed
window.openSheet = openSheet;
window.closeSheet = closeSheet;

// Boot
document.addEventListener('DOMContentLoaded', () => {
    checkVersion();
    initUI();
    initAuth();
    initNavigation();
    initChat();
    initPrayer();
    initFeatures();

    // Remove Splash Screen after everything is ready
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 400);
        }
        initOnboarding();
    }, 1200);

    // Register Service Worker
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('/service-worker.js').catch(err => console.log('SW ref', err));
    }
});
