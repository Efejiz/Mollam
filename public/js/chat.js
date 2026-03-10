import { apiFetch } from './api.js';
import { toast, escapeHtml } from './ui.js';

let chatHistory = JSON.parse(localStorage.getItem('mollam_h') || '[]');
let convHistory = [];
let favorites = JSON.parse(localStorage.getItem('mollam_fav') || '[]');
let selectedMadhab = localStorage.getItem('mollam_madhab') || 'Hanefi';

export function initChat() {
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    const charCt = document.getElementById('charCt');

    if (!msgInput || !sendBtn) return;

    msgInput.addEventListener('input', () => {
        const l = msgInput.value.length;
        charCt.textContent = l > 0 ? l : '';
        charCt.classList.toggle('warn', l > 800 && l <= 950);
        charCt.classList.toggle('err', l > 950);
    });

    document.querySelectorAll('.sug-card').forEach(c => {
        c.addEventListener('click', () => {
            msgInput.value = c.dataset.q;
            sendMsg();
        });
    });

    sendBtn.addEventListener('click', sendMsg);
    msgInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMsg();
    });

    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            convHistory = [];
            const chatMsgs = document.getElementById('chatMsgs');
            chatMsgs.innerHTML = `
                <div class="msg ai">
                    <div class="msg-av">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                            <circle cx="9" cy="9" r="1" fill="currentColor"/>
                            <circle cx="15" cy="9" r="1" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="msg-bub"><p>Yeni sohbet başlatıldı.</p></div>
                </div>`;
            toast('Yeni sohbet başlatıldı', 'success');
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const chatMsgs = document.getElementById('chatMsgs');
            const msgs = chatMsgs.querySelectorAll('.msg');
            if (msgs.length <= 1) {
                toast('Sohbet bulunamadı', 'info');
                return;
            }

            let txt = 'Mollam Sohbet\n' + new Date().toLocaleString('tr-TR') + '\n\n';
            msgs.forEach(m => {
                const u = m.classList.contains('user');
                const b = m.querySelector('.msg-bub');
                if (b) {
                    // Just take text content, stripping HTML
                    txt += `${u ? 'Siz' : 'Mollam'}: ${b.textContent.trim()}\n\n`;
                }
            });

            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
            a.download = `mollam-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            toast('Sohbet indirildi', 'success');
        });
    }

    initVoice();
}

function renderMd(text) {
    let html = escapeHtml(text);
    // Simple markdown mapping: **bold** into <strong>bold</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return html;
}

function timeStr() {
    return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function addMsg(text, isUser, sources = [], hasRag = false) {
    const suggestions = document.getElementById('suggestions');
    if (suggestions) suggestions.remove();

    const chatMsgs = document.getElementById('chatMsgs');
    const div = document.createElement('div');
    div.className = `msg ${isUser ? 'user' : 'ai'}`;

    const av = document.createElement('div');
    av.className = 'msg-av';

    if (isUser) {
        av.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    } else {
        av.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>';
    }

    const bub = document.createElement('div');
    bub.className = 'msg-bub';

    if (isUser) {
        bub.textContent = text;
    } else {
        text.split('\n').filter(l => l.trim()).forEach(l => {
            const p = document.createElement('p');
            p.innerHTML = renderMd(l);
            bub.appendChild(p);
        });

        // Add Rag/Source Badge
        const qb = document.createElement('div');
        qb.className = `q-badge ${hasRag ? 'high' : 'low'}`;
        qb.textContent = hasRag ? 'Kaynak doğrulanmış' : 'Genel bilgi';
        bub.appendChild(qb);

        // Actions
        const acts = document.createElement('div');
        acts.className = 'msg-acts';

        const mkBtn = (svg, title, clickHandler) => {
            const b = document.createElement('button');
            b.className = 'ma-btn';
            b.title = title;
            b.innerHTML = svg;
            b.onclick = clickHandler;
            return b;
        };

        acts.appendChild(mkBtn(
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
            'Paylaş',
            () => {
                const shareText = `Mollam:\n${text}`;
                if (navigator.share) {
                    navigator.share({ title: 'Mollam', text: shareText }).catch(() => { });
                } else {
                    navigator.clipboard.writeText(shareText).then(() => toast('Kopyalandı', 'success'));
                }
            }
        ));

        acts.appendChild(mkBtn(
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
            'Favorile',
            function () {
                const s = text.substring(0, 200);
                if (!favorites.find(f => f.text === s)) {
                    favorites.unshift({ text: s, time: new Date().toLocaleString('tr-TR') });
                    favorites = favorites.slice(0, 30);
                    localStorage.setItem('mollam_fav', JSON.stringify(favorites));
                    this.classList.add('fav');
                    toast('Favorilere eklendi', 'success');
                }
            }
        ));

        acts.appendChild(mkBtn(
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>',
            'Sesli oku',
            () => {
                if ('speechSynthesis' in window) {
                    if (speechSynthesis.speaking) {
                        speechSynthesis.cancel();
                        return;
                    }
                    const u = new SpeechSynthesisUtterance(text);
                    u.lang = 'tr-TR';
                    u.rate = 0.9;
                    speechSynthesis.speak(u);
                }
            }
        ));

        bub.appendChild(acts);
    }

    const tm = document.createElement('div');
    tm.className = 'msg-time';
    tm.textContent = timeStr();
    bub.appendChild(tm);

    div.append(av, bub);
    chatMsgs.appendChild(div);

    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    requestAnimationFrame(() => {
        chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' });
    });
}

function showTyping() {
    const chatMsgs = document.getElementById('chatMsgs');
    const d = document.createElement('div');
    d.className = 'msg ai';
    d.id = 'typing';
    d.innerHTML = `
        <div class="msg-av">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <circle cx="9" cy="9" r="1" fill="currentColor"/>
                <circle cx="15" cy="9" r="1" fill="currentColor"/>
            </svg>
        </div>
        <div class="msg-bub">
            <div class="typing"><span></span><span></span><span></span></div>
        </div>`;
    chatMsgs.appendChild(d);
    chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' });
}

function hideTyping() {
    const typingElement = document.getElementById('typing');
    if (typingElement) typingElement.remove();
}

function showFollowUp(lastQ) {
    const chatMsgs = document.getElementById('chatMsgs');
    const msgInput = document.getElementById('msgInput');
    const map = {
        'abdest': ['Abdesti bozan şeyler?', 'Mesh nasıl yapılır?'],
        'namaz': ['Kazâ namazı nasıl kılınır?', 'Namazda yapılan hatalar?'],
        'oruç': ['Fidye nedir?', 'Oruçluyken yapılabilecekler?'],
        'zekat': ['Nisap nasıl hesaplanır?', 'Fitre kimlere verilir?'],
        'gusül': ['Teyemmüm nasıl alınır?', 'Gusülsüz yapılamayanlar?']
    };

    const lq = lastQ.toLowerCase();
    for (const [k, qs] of Object.entries(map)) {
        if (lq.includes(k)) {
            const fu = document.createElement('div');
            fu.className = 'followup';
            qs.forEach(q => {
                const b = document.createElement('button');
                b.className = 'fu-btn';
                b.textContent = q;
                b.addEventListener('click', () => {
                    msgInput.value = q;
                    sendMsg();
                    fu.remove();
                });
                fu.appendChild(b);
            });
            chatMsgs.appendChild(fu);
            chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' });
            break;
        }
    }
}

async function sendMsg() {
    const msgInput = document.getElementById('msgInput');
    const charCt = document.getElementById('charCt');

    const text = msgInput.value.trim();
    if (!text) return;

    addMsg(text, true);
    msgInput.value = '';
    charCt.textContent = '';
    msgInput.focus();

    chatHistory.unshift({ q: text, time: new Date().toLocaleString('tr-TR') });
    chatHistory = chatHistory.slice(0, 50);
    localStorage.setItem('mollam_h', JSON.stringify(chatHistory));

    convHistory.push({ role: 'user', text });
    selectedMadhab = localStorage.getItem('mollam_madhab') || 'Hanefi';

    // Geçici akış balonu (Streaming container) oluştur
    const chatMsgs = document.getElementById('chatMsgs');
    const div = document.createElement('div');
    div.className = 'msg ai';
    div.innerHTML = `
        <div class="msg-av">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <circle cx="9" cy="9" r="1" fill="currentColor"/>
                <circle cx="15" cy="9" r="1" fill="currentColor"/>
            </svg>
        </div>
        <div class="msg-bub"><div class="streaming-text"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' });

    const streamEl = div.querySelector('.streaming-text');
    let fullText = '';
    let sources = [];

    try {
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, madhab: selectedMadhab, history: convHistory.slice(-6) })
        });

        if (!response.ok) throw new Error('Ağ hatası');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            if (value) {
                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');

                for (let line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'chunk') {
                                fullText += data.text;
                                let display = fullText.replace(/\{"sources":.*$/, '');
                                streamEl.innerHTML = renderMd(display) + '<span class="stream-cursor"></span>';
                                chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' });
                            } else if (data.type === 'done') {
                                sources = data.sources || [];
                            } else if (data.type === 'error') {
                                fullText = data.text;
                            }
                        } catch (e) { }
                    }
                }
            }
            done = readerDone;
        }

        // Akış bittiğinde geçici balonu sil ve kalıcı olanı koy
        div.remove();
        const cleanText = fullText.replace(/\{"sources":.*$/, '');
        addMsg(cleanText, false, sources, false);

        convHistory.push({ role: 'ai', text: cleanText.substring(0, 300) });
        if (convHistory.length > 12) convHistory = convHistory.slice(-12);
        showFollowUp(text);

    } catch (e) {
        div.remove();
        addMsg('Sunucudan yanıt alınırken bir hata oluştu.', false);
    }
}

function initVoice() {
    const voiceBtn = document.getElementById('voiceBtn');
    const msgInput = document.getElementById('msgInput');

    if (!voiceBtn || !msgInput) return;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = 'tr-TR';
        rec.continuous = false;
        let isRec = false;

        voiceBtn.addEventListener('click', () => {
            if (isRec) {
                rec.stop();
                return;
            }
            try {
                rec.start();
                isRec = true;
                voiceBtn.classList.add('recording');
                toast('Dinleniyor...', 'info');
            } catch (e) {
                console.error("Speech Rec Error:", e);
                isRec = false;
                voiceBtn.classList.remove('recording');
            }
        });

        rec.onresult = e => {
            msgInput.value = e.results[0][0].transcript;
            isRec = false;
            voiceBtn.classList.remove('recording');
            // sendMsg(); // Auto-send on finish?
        };
        rec.onend = () => {
            isRec = false;
            voiceBtn.classList.remove('recording');
        };
        rec.onerror = () => {
            isRec = false;
            voiceBtn.classList.remove('recording');
            toast('Ses algılanamadı', 'error');
        };
    } else {
        voiceBtn.style.display = 'none';
    }
}
