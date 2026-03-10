import { apiFetch } from './api.js';
import { toast } from './ui.js';

let pTimings = null;
const fallbackTimings = { Fajr: '05:42', Sunrise: '07:05', Dhuhr: '12:58', Asr: '16:16', Maghrib: '18:45', Isha: '20:06' };

export async function loadPrayerTimes() {
    let lat = 41.0082, lng = 28.9784;
    let gotLocation = false;
    try {
        const geoPromise = new Promise((rs, rj) => navigator.geolocation.getCurrentPosition(rs, rj, { timeout: 3000, maximumAge: 300000 }));
        const timeoutPromise = new Promise((_, rj) => setTimeout(() => rj(new Error('Geolocation timeout')), 3500));
        const pos = await Promise.race([geoPromise, timeoutPromise]);
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        gotLocation = true;
    } catch (e) {
        // Fallback to Istanbul
    }

    const locElement = document.getElementById('prayerLoc');

    // Reverse geocoding — şehir/ilçe adı göster
    if (gotLocation) {
        reverseGeocode(lat, lng, locElement);
    } else {
        if (locElement) locElement.textContent = '📍 İstanbul (varsayılan)';
    }

    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 6000);
        const res = await apiFetch(`/api/prayer-times?lat=${lat}&lng=${lng}&method=13`, { signal: controller.signal });
        clearTimeout(tid);

        if (res && res.success && res.data && res.data.success) {
            pTimings = res.data.timings;
            ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(k => {
                const el = document.getElementById(`time${k}`);
                if (el) el.textContent = pTimings[k];
            });
        } else {
            useFallback();
        }
    } catch (e) {
        useFallback();
    }
    highlightNext();
    updateWidgetPrayer();
}

async function reverseGeocode(lat, lng, el) {
    if (!el) return;
    el.textContent = '📍 Konum belirleniyor...';
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr`);
        const data = await resp.json();
        if (data && data.address) {
            const a = data.address;
            const district = a.suburb || a.town || a.county || a.district || '';
            const city = a.city || a.province || a.state || '';
            const parts = [district, city].filter(Boolean);
            el.textContent = parts.length > 0 ? `📍 ${parts.join(', ')}` : `📍 ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
        } else {
            el.textContent = `📍 ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
        }
    } catch (e) {
        el.textContent = `📍 ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    }
}

function useFallback() {
    pTimings = fallbackTimings;
    ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(k => {
        const el = document.getElementById(`time${k}`);
        if (el) el.textContent = fallbackTimings[k];
    });
    const locElement = document.getElementById('prayerLoc');
    if (locElement) locElement.textContent = '📍 İstanbul (varsayılan)';
    // Immediately update the feature grid mini text with fallback data
    updateWidgetPrayer();
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
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function highlightNext() {
    if (!pTimings) return;
    const info = getNextPrayerInfo();
    if (!info) return;

    document.querySelectorAll('.p-row').forEach((row, i) => {
        row.classList.toggle('active', i === info.idx);
    });

    const nextTimeEl = document.getElementById('nextTime');
    const nextLabelEl = document.getElementById('nextLabel');
    if (nextTimeEl) nextTimeEl.textContent = fmtCountdown(info.diff);
    if (nextLabelEl) nextLabelEl.textContent = `${info.name} namazına`;
}

function updateWidgetPrayer() {
    if (!pTimings) return;
    const info = getNextPrayerInfo();
    if (!info) return;

    const labelEl = document.getElementById('wPrayerLabel');
    const valEl = document.getElementById('wPrayerVal');
    if (labelEl) labelEl.textContent = info.name;
    if (valEl) valEl.textContent = fmtCountdown(info.diff);

    // Feature Grid Mini
    const miniEl = document.getElementById('featPrayerMini');
    if (miniEl) {
        const now = new Date();
        const curMin = now.getHours() * 60 + now.getMinutes();
        const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const display = ['İmsak', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'];
        for (let i = 0; i < names.length; i++) {
            const [h, m] = pTimings[names[i]].split(':').map(Number);
            if (h * 60 + m > curMin) {
                miniEl.textContent = `${display[i]} ${pTimings[names[i]]}`;
                break;
            }
        }
    }
}

export function initPrayer() {
    loadPrayerTimes();
    setInterval(() => {
        highlightNext();
        updateWidgetPrayer();
    }, 1000);

    // Location refresh button
    const locBtn = document.getElementById('locRefreshBtn');
    if (locBtn) {
        locBtn.addEventListener('click', async () => {
            locBtn.classList.add('spinning');
            locBtn.disabled = true;
            toast('Konum güncelleniyor...', 'info');
            try {
                await loadPrayerTimes();
                toast('Namaz vakitleri güncellendi ✓', 'success');
            } catch (e) {
                toast('Konum alınamadı', 'error');
            }
            locBtn.classList.remove('spinning');
            locBtn.disabled = false;
        });
    }
}
