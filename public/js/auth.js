import { apiFetch } from './api.js';
import { toast, escapeHtml } from './ui.js';
import { syncUserDataFromServer } from './features.js';

export let currentUser = JSON.parse(localStorage.getItem('mollam_user') || 'null');
export let authToken = localStorage.getItem('mollam_token') || null;

export function setAuth(user, token) {
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

export function updateProfileUI() {
    const nameView = document.getElementById('profileNameView');
    const emailView = document.getElementById('profileEmailView');
    const authCard = document.getElementById('profileAuthCard');
    const logoutCard = document.getElementById('profileLogoutCard');
    const avatarView = document.getElementById('profileAvatarView');

    if (!nameView) return;

    if (currentUser) {
        nameView.textContent = escapeHtml(currentUser.name);
        emailView.textContent = escapeHtml(currentUser.email);
        if (currentUser.avatar && currentUser.avatar !== 'default.png') {
            avatarView.innerHTML = `<img src="${escapeHtml(currentUser.avatar)}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }
        if (authCard) authCard.classList.add('hidden');
        if (logoutCard) logoutCard.classList.remove('hidden');
    } else {
        nameView.textContent = 'Misafir Kullanıcı';
        emailView.textContent = '';
        avatarView.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        if (authCard) authCard.classList.remove('hidden');
        if (logoutCard) logoutCard.classList.add('hidden');
    }
}

export function initAuth() {
    let isLoginMode = true;
    const authModal = document.getElementById('authModal');
    const authOverlay = document.getElementById('authOverlay');
    const authError = document.getElementById('authError');

    window.openAuthModal = () => {
        if (!authModal || !authOverlay) return;
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
                { theme: "filled_black", size: "large", type: "standard", shape: "rectangular", text: "continue_with" }
            );
        }
    };

    window.closeAuthModal = () => {
        if (authModal) authModal.classList.add('hidden');
        if (authOverlay) authOverlay.classList.add('hidden');
        if (authError) authError.classList.add('hidden');
    };

    async function handleGoogleRes(response) {
        if (!authError) return;
        try {
            const btn = document.getElementById('authSubmitBtn');
            btn.textContent = 'Giriş Yapılıyor...';
            btn.disabled = true;

            const res = await apiFetch('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify({ idToken: response.credential })
            });

            btn.textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
            btn.disabled = false;

            if (res.success) {
                setAuth(res.data, res.data.token);
                toast('Giriş başarılı', 'success');
                window.closeAuthModal();
                await syncUserDataFromServer();
            } else {
                authError.textContent = res.error || 'Giriş başarısız oldu.';
                authError.classList.remove('hidden');
            }
        } catch (error) {
            authError.textContent = 'Sunucu bağlantı hatası.';
            authError.classList.remove('hidden');
        }
    }

    const openLoginBtn = document.getElementById('openLoginBtn');
    if (openLoginBtn) openLoginBtn.addEventListener('click', window.openAuthModal);

    const guestBtn = document.getElementById('guestBtn');
    if (guestBtn) guestBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.closeAuthModal();
        if (window.showOnboarding) window.showOnboarding();
        toast('Misafir olarak devam ediliyor', 'info');
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        setAuth(null, null);
        toast('Çıkış yapıldı', 'info');
        window.goToPage('pageChat');
    });

    const authToggleLink = document.getElementById('authToggleLink');
    if (authToggleLink) authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        document.getElementById('authTitle').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        authToggleLink.textContent = isLoginMode ? 'Kayıt Ol' : 'Giriş Yap';
        authToggleLink.parentElement.firstChild.textContent = isLoginMode ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? ';

        const nameGroup = document.getElementById('nameGroup');
        const authName = document.getElementById('authName');
        const authPassword = document.getElementById('authPassword');
        const fpLinkContainer = document.getElementById('fpLinkContainer');

        if (isLoginMode) {
            nameGroup.classList.add('hidden');
            authName.removeAttribute('required');
            authPassword.setAttribute('minlength', '1'); // Allows any password if checking DB
            if (fpLinkContainer) fpLinkContainer.classList.remove('hidden');
        } else {
            nameGroup.classList.remove('hidden');
            authName.setAttribute('required', 'true');
            authPassword.setAttribute('minlength', '6');
            if (fpLinkContainer) fpLinkContainer.classList.add('hidden');
        }
        if (authError) authError.classList.add('hidden');
    });

    const authForm = document.getElementById('authForm');
    if (authForm) authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const name = document.getElementById('authName').value;
        const btn = document.getElementById('authSubmitBtn');

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const body = isLoginMode ? { email, password } : { name, email, password };

        try {
            btn.disabled = true;
            btn.textContent = 'İşleniyor...';

            const res = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (res.success) {
                setAuth(res.data, res.data.token);
                toast(isLoginMode ? 'Giriş yapıldı' : 'Kayıt başarılı', 'success');
                window.closeAuthModal();
                if (window.showOnboarding && !isLoginMode) window.showOnboarding();
                await syncUserDataFromServer();
            } else {
                authError.textContent = res.error || 'İşlem başarısız.';
                authError.classList.remove('hidden');
            }
        } catch (error) {
            authError.textContent = 'Bir bağlantı hatası oluştu.';
            authError.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
        }
    });
}
