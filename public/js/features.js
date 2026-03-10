import { apiFetch } from './api.js';
import { toast, playClick, escapeHtml } from './ui.js';
import { authToken } from './auth.js';

// ═══ STATE ═══
let totalCount = parseInt(localStorage.getItem('mollam_t') || '0');
let sessionCount = 0;
let currentTarget = 33;
let currentZikir = 'Sübhanallah';
let namazTracker = JSON.parse(localStorage.getItem('mollam_namaz') || '{}');
let zakatMadhab = localStorage.getItem('mollam_madhab') || 'Hanefi';
const RING_CIRCUMFERENCE = 2 * Math.PI * 90; // ~565.49

export function initFeatures() {
    initTesbih();
    initTracker();
    initGoals();
    initQibla();
    initZakat();
    updateCalendarMini();
}

// Update the calendar mini text on the feature grid immediately
function updateCalendarMini() {
    const calMini = document.getElementById('featCalMini');
    if (calMini) {
        const now = new Date();
        calMini.textContent = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
}

// ═══════════════════════════════════════
// TESBIH — matches HTML ring system
// ═══════════════════════════════════════
function initTesbih() {
    updateTesbihUI();

    const tapBtn = document.getElementById('tapBtn');
    const resetBtn = document.getElementById('resetBtn');
    const ringBar = document.getElementById('ringBar');

    if (ringBar) {
        ringBar.style.strokeDasharray = RING_CIRCUMFERENCE;
        ringBar.style.strokeDashoffset = RING_CIRCUMFERENCE;
    }

    // Mode buttons (33, 99, 100, ∞)
    document.querySelectorAll('.t-mode').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.t-mode').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTarget = parseInt(btn.dataset.target) || 0;
            sessionCount = 0;
            const tgt = document.getElementById('tTarget');
            if (tgt) tgt.textContent = currentTarget === 0 ? '∞' : currentTarget;
            updateTesbihUI();
        });
    });

    // Preset buttons (Sübhanallah, Elhamdülillah, etc.)
    document.querySelectorAll('.t-pre').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.t-pre').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentZikir = btn.dataset.z;
            const nameEl = document.getElementById('zikirName');
            if (nameEl) nameEl.textContent = currentZikir;
            sessionCount = 0;
            updateTesbihUI();
        });
    });

    if (tapBtn) {
        tapBtn.addEventListener('click', () => {
            totalCount++;
            sessionCount++;
            localStorage.setItem('mollam_t', totalCount);
            updateTesbihUI();
            playClick();
            if ('vibrate' in navigator) navigator.vibrate(15);

            if (currentTarget > 0 && sessionCount >= currentTarget) {
                toast(`${currentTarget} tamamlandı! Maaşallah!`, 'success');
                if ('vibrate' in navigator) navigator.vibrate([40, 60, 40]);
                sessionCount = 0;
            } else if (sessionCount % 33 === 0 && sessionCount > 0) {
                toast(`${sessionCount} zikir — Maaşallah!`, 'info');
                if ('vibrate' in navigator) navigator.vibrate([20, 40, 20]);
            }
            debouncedSync();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Oturum sayacını sıfırlamak istiyor musunuz?')) {
                sessionCount = 0;
                updateTesbihUI();
                toast('Sayaç sıfırlandı', 'info');
            }
        });
    }

    // Widget tesbih button
    const wTesbihBtn = document.getElementById('wTesbih');
    if (wTesbihBtn) {
        wTesbihBtn.addEventListener('click', () => {
            if (window.goToPage) window.goToPage('pageTesbih');
        });
    }
}

function updateTesbihUI() {
    const countEl = document.getElementById('tCount');
    const totalEl = document.getElementById('tTotal');
    const wEl = document.getElementById('wTesbihVal');
    const miniEl = document.getElementById('featTesbihMini');
    const ringBar = document.getElementById('ringBar');

    if (countEl) countEl.textContent = sessionCount;
    if (totalEl) totalEl.textContent = totalCount;
    if (wEl) wEl.textContent = totalCount;
    if (miniEl) miniEl.textContent = `${totalCount} zikir`;

    // Ring progress
    if (ringBar && currentTarget > 0) {
        const progress = Math.min(sessionCount / currentTarget, 1);
        const offset = RING_CIRCUMFERENCE * (1 - progress);
        ringBar.style.strokeDashoffset = offset;
    } else if (ringBar) {
        // Infinite mode — cycle every 100
        const progress = (sessionCount % 100) / 100;
        const offset = RING_CIRCUMFERENCE * (1 - progress);
        ringBar.style.strokeDashoffset = offset;
    }
}

// ═══════════════════════════════════════
// NAMAZ TRACKER — matches HTML checkboxes
// ═══════════════════════════════════════
function initTracker() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('mollam_namaz_date');

    // Reset daily tracker if new day
    if (savedDate !== today) {
        namazTracker = {};
        localStorage.setItem('mollam_namaz', '{}');
        localStorage.setItem('mollam_namaz_date', today);
    }

    // Bind checkboxes with data-prayer attribute
    document.querySelectorAll('#trackerGrid input[data-prayer]').forEach(cb => {
        const key = cb.dataset.prayer;
        cb.checked = !!namazTracker[key];
        cb.addEventListener('change', () => {
            if ('vibrate' in navigator) navigator.vibrate(cb.checked ? [15, 30, 20] : 10);
            namazTracker[key] = cb.checked;
            localStorage.setItem('mollam_namaz', JSON.stringify(namazTracker));
            updateTrackerMini();

            if (cb.checked) {
                toast('Kılındı olarak işaretlendi ✓', 'success');
                const checkEl = cb.nextElementSibling;
                if (checkEl) {
                    checkEl.classList.remove('success-anim');
                    void checkEl.offsetWidth;
                    checkEl.classList.add('success-anim');
                }

                const completed = Object.values(namazTracker).filter(Boolean).length;
                updateStreakData(completed);

                if (completed === 5) {
                    setTimeout(() => toast('Maşallah, bugünün tüm namazlarını eda ettiniz! 🎉', 'success'), 1000);
                    if ('vibrate' in navigator) navigator.vibrate([40, 60, 40, 60, 40]);
                    const grid = document.getElementById('trackerGrid');
                    if (grid) {
                        grid.classList.remove('success-anim');
                        void grid.offsetWidth;
                        grid.classList.add('success-anim');
                    }
                }
            } else {
                // Determine if we unchecked something causing 5/5 to be lost
                updateStreakData(Object.values(namazTracker).filter(Boolean).length);
            }
            debouncedSync();
        });
    });

    updateTrackerMini();
    renderWeekGrid();
    updateStreak();
}

function updateStreakData(completedCount) {
    let streakData = JSON.parse(localStorage.getItem('mollam_streak') || '{"current":0,"longest":0,"lastActiveDate":""}');
    const todayStr = new Date().toDateString();

    if (completedCount === 5) {
        if (!streakData.lastActiveDate) {
            streakData.current = 1;
            streakData.longest = Math.max(1, streakData.longest);
        } else {
            const d1 = new Date(streakData.lastActiveDate); d1.setHours(0, 0, 0, 0);
            const d2 = new Date(todayStr); d2.setHours(0, 0, 0, 0);
            const diff = Math.round((d2 - d1) / 86400000);

            if (diff === 1) {
                streakData.current += 1;
            } else if (diff > 1) {
                streakData.current = 1; // reset if missed day
            }
            streakData.longest = Math.max(streakData.longest, streakData.current);
        }
        streakData.lastActiveDate = todayStr;
        localStorage.setItem('mollam_streak', JSON.stringify(streakData));
    } else if (streakData.lastActiveDate === todayStr) {
        // Unchecked today's completed prayer -> revert today's streak
        streakData.current = Math.max(0, streakData.current - 1);
        let yest = new Date(); yest.setDate(yest.getDate() - 1);
        streakData.lastActiveDate = streakData.current > 0 ? yest.toDateString() : "";
        localStorage.setItem('mollam_streak', JSON.stringify(streakData));
    }
}

function updateTrackerMini() {
    const completed = Object.values(namazTracker).filter(Boolean).length;
    const miniEl = document.getElementById('featTrackerMini');
    if (miniEl) miniEl.textContent = `${completed}/5 vakit`;
}

function renderWeekGrid() {
    const grid = document.getElementById('weekGrid');
    if (!grid) return;

    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const today = new Date();
    const todayDay = (today.getDay() + 6) % 7; // Monday=0

    // Reset week tracking on new week
    let d = new Date(today);
    let dayDiff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    let weekStartStr = new Date(d.setDate(dayDiff)).toDateString();

    if (localStorage.getItem('mollam_week_start') !== weekStartStr) {
        localStorage.setItem('mollam_week_start', weekStartStr);
        for (let i = 0; i < 7; i++) localStorage.setItem(`mollam_week_${i}`, '0');
    }

    const todayCompleted = Object.values(namazTracker).filter(Boolean).length;
    localStorage.setItem(`mollam_week_${todayDay}`, todayCompleted);

    grid.innerHTML = days.map((dName, i) => {
        const isToday = i === todayDay;
        const count = parseInt(localStorage.getItem(`mollam_week_${i}`) || '0');
        return `<div class="week-day ${isToday ? 'today' : ''} ${count >= 5 ? 'done' : ''}">
            <span class="wd-name">${dName}</span>
            <span class="wd-count">${count}/5</span>
        </div>`;
    }).join('');
}

function updateStreak() {
    let streakData = JSON.parse(localStorage.getItem('mollam_streak') || '{"current":0,"longest":0,"lastActiveDate":""}');
    const todayStr = new Date().toDateString();

    if (streakData.lastActiveDate) {
        const d1 = new Date(streakData.lastActiveDate); d1.setHours(0, 0, 0, 0);
        const d2 = new Date(todayStr); d2.setHours(0, 0, 0, 0);
        const diff = Math.round((d2 - d1) / 86400000);
        if (diff > 1) {
            streakData.current = 0; // Streak broken
            localStorage.setItem('mollam_streak', JSON.stringify(streakData));
        }
    }

    const streakEl = document.getElementById('streak');
    if (streakEl) streakEl.textContent = streakData.current;
}

// ═══════════════════════════════════════
// GOALS — matches HTML checkbox goals
// ═══════════════════════════════════════
function initGoals() {
    const goalChecks = document.querySelectorAll('#goals input[data-goal]');
    const goalData = JSON.parse(localStorage.getItem('mollam_daily_goals') || '{}');
    const today = new Date().toDateString();

    if (localStorage.getItem('mollam_goals_date') !== today) {
        localStorage.setItem('mollam_goals_date', today);
        localStorage.setItem('mollam_daily_goals', '{}');
    }

    goalChecks.forEach(cb => {
        const key = cb.dataset.goal;
        cb.checked = !!goalData[key];
        cb.addEventListener('change', () => {
            if ('vibrate' in navigator) navigator.vibrate(cb.checked ? [15, 30, 20] : 10);
            const data = JSON.parse(localStorage.getItem('mollam_daily_goals') || '{}');
            data[key] = cb.checked;
            localStorage.setItem('mollam_daily_goals', JSON.stringify(data));
            updateGoalBar();

            if (cb.checked) {
                toast('Hedef tamamlandı ✓', 'success');
                const checkEl = cb.nextElementSibling;
                if (checkEl) {
                    checkEl.classList.remove('success-anim');
                    void checkEl.offsetWidth;
                    checkEl.classList.add('success-anim');
                }

                const total = document.querySelectorAll('#goals input[data-goal]').length || 3;
                const done = Object.values(data).filter(Boolean).length;
                if (done === total) {
                    if ('vibrate' in navigator) navigator.vibrate([40, 60, 40, 60, 40]);
                    const bar = document.getElementById('goalFill');
                    if (bar) {
                        bar.classList.remove('success-anim');
                        void bar.offsetWidth;
                        bar.classList.add('success-anim');
                    }
                }
            }
        });
    });

    updateGoalBar();
}

function updateGoalBar() {
    const data = JSON.parse(localStorage.getItem('mollam_daily_goals') || '{}');
    const total = document.querySelectorAll('#goals input[data-goal]').length || 3;
    const done = Object.values(data).filter(Boolean).length;

    const fill = document.getElementById('goalFill');
    const text = document.getElementById('goalText');
    const wVal = document.getElementById('wGoalVal');

    if (fill) fill.style.width = `${(done / total) * 100}%`;
    if (text) text.textContent = `${done} / ${total} hedef tamamlandı`;
    if (wVal) wVal.textContent = `${done}/${total}`;
}

// ═══════════════════════════════════════
// QIBLA — matches HTML compass with calibration
// ═══════════════════════════════════════
function initQibla() {
    const startBtn = document.getElementById('startQiblaBtn');
    const compass = document.getElementById('compass');
    const needle = document.getElementById('needle');
    const kaaba = document.getElementById('kaaba');
    const info = document.getElementById('compassInfo');
    const degreeEl = document.getElementById('qiblaDegree');
    const calibHint = document.getElementById('calibrationHint');

    if (!startBtn) return;

    startBtn.addEventListener('click', async () => {
        startBtn.textContent = 'Yükleniyor...';
        startBtn.disabled = true;

        const QIBLA_LAT = 21.4225, QIBLA_LNG = 39.8262;
        let uLat = 41.0082, uLng = 28.9784;

        try {
            const pos = await new Promise((rs, rj) =>
                navigator.geolocation.getCurrentPosition(rs, rj, { timeout: 8000 })
            );
            uLat = pos.coords.latitude;
            uLng = pos.coords.longitude;
        } catch (e) {
            toast('Konum alınamadı, İstanbul varsayılan', 'info');
        }

        // Calculate Qibla bearing
        const dLng = (QIBLA_LNG - uLng) * Math.PI / 180;
        const lat1 = uLat * Math.PI / 180;
        const lat2 = QIBLA_LAT * Math.PI / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        let qDir = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

        if (degreeEl) degreeEl.textContent = `${Math.round(qDir)}°`;

        // Manyetik sapma (Declination) hesaplama (Gerçek Kuzey - Manyetik Kuzey farkı)
        let declination = 0;
        try {
            const decRes = await fetch(`https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=${uLat}&lon1=${uLng}&resultFormat=json`);
            const decData = await decRes.json();
            if (decData && decData.result && decData.result[0]) {
                declination = decData.result[0].declination;
            }
        } catch (e) {
            // Türkiye sınırları için yaklaşık manyetik sapma (Fallback)
            if (uLat > 35 && uLat < 43 && uLng > 25 && uLng < 45) {
                declination = 5.5 + (uLng - 35) / 4;
            }
        }

        let orientationActive = false;

        function handleOrientation(e) {
            let heading = e.webkitCompassHeading;
            let isMagnetic = true;
            if (heading === undefined || heading === null) {
                heading = e.alpha ? (360 - e.alpha) : null;
                isMagnetic = false; // Android (deviceorientationabsolute) genelde True North verir
            }
            if (heading === null) return;

            // iOS compass verirken manyetik kuzeyi verir, gerçek kuzeye (True North) çevir.
            if (isMagnetic) {
                heading = (heading + declination + 360) % 360;
            }

            orientationActive = true;
            const rot = qDir - heading;

            if (needle) needle.style.transform = `translateX(-50%) rotate(${heading}deg)`;
            if (kaaba) {
                kaaba.style.transform = `translateX(-50%) rotate(${rot}deg)`;
                kaaba.style.top = '15px';
            }

            const diff = Math.abs(((rot % 360) + 360) % 360);
            const isAligned = diff < 8 || diff > 352;

            if (compass) {
                compass.style.boxShadow = isAligned
                    ? '0 0 30px rgba(34,197,94,0.4)'
                    : 'none';
            }

            if (isAligned && 'vibrate' in navigator) navigator.vibrate(10);

            if (info) info.textContent = isAligned
                ? '🕋 Kıble yönündesiniz!'
                : `Kıble: ${Math.round(qDir)}° — Cihazı düz tutun`;

            // Calibration hint
            if (calibHint && e.webkitCompassAccuracy && e.webkitCompassAccuracy > 25) {
                calibHint.classList.remove('hidden');
            } else if (calibHint) {
                calibHint.classList.add('hidden');
            }
        }

        try {
            if (typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                const perm = await DeviceOrientationEvent.requestPermission();
                if (perm === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation, true);
                } else {
                    toast('Pusula izni reddedildi', 'error');
                }
            } else {
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
        } catch (err) {
            toast('Pusula başlatılamadı', 'error');
        }

        // Show static direction for desktop or if no orientation events
        setTimeout(() => {
            if (!orientationActive && info) {
                info.textContent = `Kıble yönü: ${Math.round(qDir)}° (Pusula sensörü bulunamadı)`;
                if (kaaba) {
                    kaaba.style.transform = `translateX(-50%) rotate(0deg)`;
                    kaaba.style.top = '15px';
                }
            }
        }, 2000);

        startBtn.classList.add('hidden');
        toast('Pusula aktif', 'success');
    });
}

// ═══════════════════════════════════════
// DUAS — load from API with categories
// ═══════════════════════════════════════
let duasLoaded = false;
export async function loadDuas() {
    if (duasLoaded) return;
    const container = document.getElementById('duaList');
    if (!container) return;

    try {
        const res = await apiFetch('/api/duas');
        if (res.success && res.data && res.data.categories) {
            container.innerHTML = '';
            res.data.categories.forEach(cat => {
                // Category header
                const catDiv = document.createElement('div');
                catDiv.className = 'dua-category';

                const catHeader = document.createElement('button');
                catHeader.className = 'dua-cat-btn';
                catHeader.innerHTML = `<span>${escapeHtml(cat.category)}</span><span class="dua-cat-count">${cat.duas.length} dua</span>`;

                const catContent = document.createElement('div');
                catContent.className = 'dua-cat-content hidden';

                cat.duas.forEach(dua => {
                    const card = document.createElement('div');
                    card.className = 'dua-card';
                    card.innerHTML = `
                        <h4 class="dua-title">${escapeHtml(dua.title)}</h4>
                        <div class="dua-arabic">${escapeHtml(dua.arabic)}</div>
                        <div class="dua-reading">${escapeHtml(dua.reading)}</div>
                        <div class="dua-meaning">${escapeHtml(dua.meaning)}</div>
                        <div class="dua-source">${escapeHtml(dua.source)}</div>
                    `;
                    catContent.appendChild(card);
                });

                catHeader.addEventListener('click', () => {
                    const isOpen = !catContent.classList.contains('hidden');
                    // Close all others
                    document.querySelectorAll('.dua-cat-content').forEach(c => c.classList.add('hidden'));
                    document.querySelectorAll('.dua-cat-btn').forEach(b => b.classList.remove('open'));
                    if (!isOpen) {
                        catContent.classList.remove('hidden');
                        catHeader.classList.add('open');
                    }
                });

                catDiv.appendChild(catHeader);
                catDiv.appendChild(catContent);
                container.appendChild(catDiv);
            });
            duasLoaded = true;
        } else {
            container.innerHTML = '<p class="muted">Dualar yüklenemedi.</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="muted">Dualar yüklenemedi.</p>';
    }
}

// ═══════════════════════════════════════
// CALENDAR — proper Islamic calendar
// ═══════════════════════════════════════
export function loadCalendar() {
    const now = new Date();

    // Gregorian date
    const gregEl = document.getElementById('calGreg');
    const dayEl = document.getElementById('calDay');
    const hijriEl = document.getElementById('calHijri');

    if (gregEl) gregEl.textContent = now.toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    if (dayEl) dayEl.textContent = dayNames[now.getDay()];

    // Hijri date via Intl
    try {
        const hijri = new Intl.DateTimeFormat('tr-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(now);
        if (hijriEl) hijriEl.textContent = hijri;
    } catch (e) {
        if (hijriEl) hijriEl.textContent = '';
    }

    // Mini feature
    const calMini = document.getElementById('featCalMini');
    if (calMini) calMini.textContent = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

    // Daily ayet
    loadDailyAyet();

    // Islamic events
    renderIslamicEvents(now);
}

async function loadDailyAyet() {
    const txt = document.getElementById('ayetTxt');
    const src = document.getElementById('ayetSrc');
    try {
        const res = await apiFetch('/api/ayet');
        if (res.success && res.data && res.data.ayet) {
            const a = res.data.ayet;
            if (txt) txt.textContent = `"${a.text}"`;
            if (src) src.textContent = `— ${a.sure} ${a.ayet}`;
        } else {
            if (txt) txt.textContent = '"Hiç bilenlerle bilmeyenler bir olur mu?"';
            if (src) src.textContent = '— Zümer 39:9';
        }
    } catch (e) {
        if (txt) txt.textContent = '"Hiç bilenlerle bilmeyenler bir olur mu?"';
        if (src) src.textContent = '— Zümer 39:9';
    }
}

function renderIslamicEvents(now) {
    const list = document.getElementById('datesList');
    if (!list) return;

    // Get approximate Hijri dates for Islamic events
    // Using a calculation method based on known reference points
    const year = now.getFullYear();

    function getExactEventsForYear(y) {
        if (y === 2024) return [
            { name: 'Regaib Kandili', date: new Date(y, 0, 11), emoji: '🌙' },
            { name: 'Miraç Kandili', date: new Date(y, 1, 6), emoji: '✨' },
            { name: 'Berat Kandili', date: new Date(y, 1, 24), emoji: '🌟' },
            { name: 'Ramazan Başlangıcı', date: new Date(y, 2, 11), emoji: '☪️' },
            { name: 'Kadir Gecesi', date: new Date(y, 3, 5), emoji: '💫' },
            { name: 'Ramazan Bayramı', date: new Date(y, 3, 10), emoji: '🎉' },
            { name: 'Arefe (Kurban)', date: new Date(y, 5, 15), emoji: '🐑' },
            { name: 'Kurban Bayramı', date: new Date(y, 5, 16), emoji: '🎊' },
            { name: 'Hicri Yılbaşı', date: new Date(y, 6, 7), emoji: '📅' },
            { name: 'Aşure Günü', date: new Date(y, 6, 16), emoji: '🤲' },
            { name: 'Mevlid Kandili', date: new Date(y, 8, 14), emoji: '🕌' }
        ];
        if (y === 2025) return [
            { name: 'Regaib Kandili', date: new Date(y, 0, 2), emoji: '🌙' },
            { name: 'Miraç Kandili', date: new Date(y, 0, 26), emoji: '✨' },
            { name: 'Berat Kandili', date: new Date(y, 1, 13), emoji: '🌟' },
            { name: 'Ramazan Başlangıcı', date: new Date(y, 2, 1), emoji: '☪️' },
            { name: 'Kadir Gecesi', date: new Date(y, 2, 26), emoji: '💫' },
            { name: 'Ramazan Bayramı', date: new Date(y, 2, 30), emoji: '🎉' },
            { name: 'Arefe (Kurban)', date: new Date(y, 5, 5), emoji: '🐑' },
            { name: 'Kurban Bayramı', date: new Date(y, 5, 6), emoji: '🎊' },
            { name: 'Hicri Yılbaşı', date: new Date(y, 5, 26), emoji: '📅' },
            { name: 'Aşure Günü', date: new Date(y, 6, 5), emoji: '🤲' },
            { name: 'Mevlid Kandili', date: new Date(y, 8, 3), emoji: '🕌' }
        ];
        if (y === 2026) return [
            { name: 'Regaib Kandili', date: new Date(2025, 11, 23), emoji: '🌙' },
            { name: 'Miraç Kandili', date: new Date(y, 0, 16), emoji: '✨' },
            { name: 'Berat Kandili', date: new Date(y, 1, 3), emoji: '🌟' },
            { name: 'Ramazan Başlangıcı', date: new Date(y, 1, 18), emoji: '☪️' },
            { name: 'Kadir Gecesi', date: new Date(y, 2, 16), emoji: '💫' },
            { name: 'Ramazan Bayramı', date: new Date(y, 2, 20), emoji: '🎉' },
            { name: 'Arefe (Kurban)', date: new Date(y, 4, 26), emoji: '🐑' },
            { name: 'Kurban Bayramı', date: new Date(y, 4, 27), emoji: '🎊' },
            { name: 'Hicri Yılbaşı', date: new Date(y, 5, 16), emoji: '📅' },
            { name: 'Aşure Günü', date: new Date(y, 5, 25), emoji: '🤲' },
            { name: 'Mevlid Kandili', date: new Date(y, 7, 23), emoji: '🕌' },
            { name: 'Regaib Kandili (2.kez)', date: new Date(y, 11, 11), emoji: '🌙' }
        ];
        return [];
    }

    const events = [
        ...getExactEventsForYear(year),
        ...getExactEventsForYear(year + 1)
    ];

    const upcoming = events
        .map(e => {
            const yStart = new Date(now); yStart.setHours(0, 0, 0, 0);
            return { ...e, diff: Math.ceil((e.date - yStart) / 86400000) };
        })
        .filter(e => e.diff >= 0)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 5);

    if (upcoming.length === 0) {
        list.innerHTML = '<p class="muted">Yaklaşan önemli gün bulunamadı.</p>';
        return;
    }

    list.innerHTML = upcoming.map(e => {
        const dateStr = e.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const badge = e.diff === 0 ? '<span class="event-badge today">Bugün!</span>'
            : e.diff <= 7 ? `<span class="event-badge soon">${e.diff} gün</span>`
                : `<span class="event-badge">${e.diff} gün</span>`;
        return `<div class="event-row">
            <div class="event-emoji">${e.emoji}</div>
            <div class="event-info">
                <strong>${escapeHtml(e.name)}</strong>
                <small>${dateStr}</small>
            </div>
            ${badge}
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════
// ESMA'ÜL HÜSNA — match API format
// ═══════════════════════════════════════
let esmaLoaded = false;
export async function loadEsma() {
    if (esmaLoaded) return;
    const grid = document.getElementById('esmaGrid');
    if (!grid) return;

    try {
        const res = await apiFetch('/api/esmaul-husna');
        if (res.success && res.data && res.data.names) {
            grid.innerHTML = res.data.names.map(n => `
                <div class="esma-card" tabindex="0">
                    <div class="esma-num">${n.number}</div>
                    <div class="esma-ar">${escapeHtml(n.arabic)}</div>
                    <div class="esma-tr">${escapeHtml(n.transliteration)}</div>
                    <div class="esma-mn">${escapeHtml(n.meaning)}</div>
                </div>
            `).join('');

            // Toggle expansion on click
            grid.querySelectorAll('.esma-card').forEach(card => {
                card.addEventListener('click', () => {
                    grid.querySelectorAll('.esma-card.expanded').forEach(c => {
                        if (c !== card) c.classList.remove('expanded');
                    });
                    card.classList.toggle('expanded');
                });
            });

            esmaLoaded = true;
        } else {
            grid.innerHTML = '<p class="muted">Esmaül Hüsna yüklenemedi.</p>';
        }
    } catch (e) {
        grid.innerHTML = '<p class="muted">Esmaül Hüsna yüklenemedi.</p>';
    }
}

// ═══════════════════════════════════════
// HADIS & AYET — load on page open
// ═══════════════════════════════════════
export async function loadHadithPage() {
    try {
        const [hRes, aRes] = await Promise.all([
            apiFetch('/api/hadith'),
            apiFetch('/api/ayet')
        ]);

        if (hRes.success && hRes.data) {
            const h = hRes.data.hadith || hRes.data;
            const hTxt = document.getElementById('hadithTxt');
            const hSrc = document.getElementById('hadithSrc');
            if (hTxt && h.text) hTxt.textContent = `"${h.text}"`;
            if (hSrc && h.source) hSrc.textContent = `— ${h.source}`;
        }

        if (aRes.success && aRes.data) {
            const a = aRes.data.ayet || aRes.data;
            const aTxt = document.getElementById('hadithAyetTxt');
            const aSrc = document.getElementById('hadithAyetSrc');
            if (aTxt && a.text) aTxt.textContent = `"${a.text}"`;
            if (aSrc && a.sure) aSrc.textContent = `— ${a.sure} ${a.ayet}`;
        }
    } catch (e) { /* silent */ }
}

// ═══════════════════════════════════════
// ZEKAT — full 4-madhab calculation
// ═══════════════════════════════════════
function initZakat() {
    // Madhab selection
    document.querySelectorAll('.z-madhab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.z-madhab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            zakatMadhab = btn.dataset.madhab;
        });
    });

    const calcBtn = document.getElementById('calcZakatBtn');
    if (calcBtn) {
        calcBtn.addEventListener('click', calculateZakat);
    }
}

function calculateZakat() {
    const cash = parseFloat(document.getElementById('zCash')?.value) || 0;
    const goldGr = parseFloat(document.getElementById('zGold')?.value) || 0;
    const silverGr = parseFloat(document.getElementById('zSilver')?.value) || 0;
    const stocks = parseFloat(document.getElementById('zStocks')?.value) || 0;
    const business = parseFloat(document.getElementById('zBusiness')?.value) || 0;
    const rent = parseFloat(document.getElementById('zRent')?.value) || 0;
    const debt = parseFloat(document.getElementById('zDebt')?.value) || 0;
    const goldPrice = parseFloat(document.getElementById('zGoldPrice')?.value) || 3200;
    const silverPrice = parseFloat(document.getElementById('zSilverPrice')?.value) || 38;

    // Nisab thresholds per madhab
    let goldNisabGr, silverNisabGr, useLowest;
    if (zakatMadhab === 'Hanefi') {
        goldNisabGr = 87.48;     // 20 miskal
        silverNisabGr = 612.36;  // 200 dirhem
        useLowest = true;        // Hanefi: ikisinden düşük olan
    } else {
        goldNisabGr = 85;
        silverNisabGr = 595;
        useLowest = false;       // Şafii/Maliki/Hanbeli: altın nisabı
    }

    const goldNisabTL = goldNisabGr * goldPrice;
    const silverNisabTL = silverNisabGr * silverPrice;
    const nisabTL = useLowest ? Math.min(goldNisabTL, silverNisabTL) : goldNisabTL;

    const goldVal = goldGr * goldPrice;
    const silverVal = silverGr * silverPrice;
    const totalAsset = cash + goldVal + silverVal + stocks + business + rent;
    const netAsset = totalAsset - debt;

    // Show result
    const resultDiv = document.getElementById('zakatResult');
    const nisabInfo = document.getElementById('zNisabInfo');
    const totalEl = document.getElementById('zTotalAsset');
    const nisabEl = document.getElementById('zNisabVal');
    const zakatEl = document.getElementById('zZakatVal');
    const noteEl = document.getElementById('zNote');

    if (resultDiv) resultDiv.classList.remove('hidden');

    const fmt = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (totalEl) totalEl.textContent = `₺${fmt(netAsset)}`;
    if (nisabEl) nisabEl.textContent = `₺${fmt(nisabTL)}`;

    if (nisabInfo) {
        const nisabType = useLowest
            ? (silverNisabTL < goldNisabTL ? 'Gümüş nisabı (düşük olan)' : 'Altın nisabı (düşük olan)')
            : 'Altın nisabı';
        nisabInfo.innerHTML = `<strong>${zakatMadhab}</strong> mezhebi — ${nisabType} esas alınır.`;
    }

    if (netAsset >= nisabTL) {
        const zakat = netAsset * 0.025;
        if (zakatEl) zakatEl.textContent = `₺${fmt(zakat)}`;
        if (noteEl) {
            noteEl.textContent = 'Varlığınız nisab miktarını aşıyor. Zekat vermeniz gerekir.';
            noteEl.style.color = 'var(--success)';
        }
    } else {
        if (zakatEl) zakatEl.textContent = '₺0,00';
        if (noteEl) {
            noteEl.textContent = 'Varlığınız nisab miktarına ulaşmadığı için zekat gerekmez.';
            noteEl.style.color = 'var(--t2)';
        }
    }
}

// ═══════════════════════════════════════
// SYNC
// ═══════════════════════════════════════
let syncTimer = null;
function debouncedSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncUserDataToServer(), 3000);
}

export async function syncUserDataFromServer() {
    if (!authToken) return;
    try {
        const res = await apiFetch('/api/user-data', { method: 'GET' });
        if (res.success && res.data) {
            const data = res.data;
            if (data.tasbihCount !== undefined) {
                totalCount = data.tasbihCount;
                localStorage.setItem('mollam_t', totalCount.toString());
                updateTesbihUI();
            }
            if (data.namazTracker) {
                namazTracker = data.namazTracker;
                localStorage.setItem('mollam_namaz', JSON.stringify(namazTracker));
            }
            if (data.favorites) {
                localStorage.setItem('mollam_fav', JSON.stringify(data.favorites));
            }
            if (data.chatHistory) {
                localStorage.setItem('mollam_h', JSON.stringify(data.chatHistory));
            }
            if (data.preferences) {
                if (data.preferences.madhab) localStorage.setItem('mollam_madhab', data.preferences.madhab);
                if (data.preferences.theme) {
                    localStorage.setItem('mollam_theme', data.preferences.theme);
                    document.documentElement.setAttribute('data-theme', data.preferences.theme);
                }
            }
        }
    } catch (e) {
        console.error('Data sync error', e);
    }
}

export async function syncUserDataToServer() {
    if (!authToken) return;
    try {
        await apiFetch('/api/user-data', {
            method: 'POST',
            body: JSON.stringify({
                tasbihCount: totalCount,
                namazTracker,
                streak: JSON.parse(localStorage.getItem('mollam_streak') || '{"current":0,"longest":0,"lastActiveDate":""}'),
                favorites: JSON.parse(localStorage.getItem('mollam_fav') || '[]'),
                chatHistory: JSON.parse(localStorage.getItem('mollam_h') || '[]'),
                preferences: {
                    madhab: localStorage.getItem('mollam_madhab') || 'Hanefi',
                    theme: localStorage.getItem('mollam_theme') || 'dark'
                }
            })
        });
    } catch (e) {
        console.error('Cloud sync failed', e);
    }
}
