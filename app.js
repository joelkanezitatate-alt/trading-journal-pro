// ============================================== //
// app.js — Y Journal                              //
// ============================================== //

// ---------- STATE ---------- //
const state = {
    currentUser: null,
    accounts: [],
    selectedColor: '#6C5CE7'
};

// ---------- INITIALIZATION ---------- //
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateCurrencySuffix();
    setupPasswordStrength();
    updateGreeting();

    document.getElementById('currency').addEventListener('change', updateCurrencySuffix);
});

function loadState() {
    const saved = localStorage.getItem('yjournal_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
    }

    if (state.currentUser) {
        if (state.accounts.length > 0) {
            showSection('dashboard-section');
            renderDashboard();
        } else {
            showSection('create-account-section');
        }
    } else {
        showSection('auth-section');
    }
}

function saveState() {
    localStorage.setItem('yjournal_state', JSON.stringify(state));
}

// ---------- SECTION MANAGEMENT ---------- //
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
}

// ---------- AUTH TAB SWITCH ---------- //
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');

    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(tab === 'login' ? 'login-form' : 'register-form').classList.add('active');

    clearMessages();
}

// ---------- AUTH HANDLERS ---------- //
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showFormMessage('login-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('yjournal_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        state.currentUser = user;

        const userAccounts = JSON.parse(localStorage.getItem(`yjournal_accounts_${user.email}`) || '[]');
        state.accounts = userAccounts;

        saveState();
        showToast('Connexion réussie ! 🎉', 'success');

        if (state.accounts.length > 0) {
            showSection('dashboard-section');
            renderDashboard();
        } else {
            showSection('create-account-section');
        }
    } else {
        showFormMessage('login-message', 'Email ou mot de passe incorrect.', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const terms = document.getElementById('accept-terms').checked;

    if (!name || !email || !password || !confirm) {
        showFormMessage('register-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    if (password !== confirm) {
        showFormMessage('register-message', 'Les mots de passe ne correspondent pas.', 'error');
        return;
    }

    if (password.length < 6) {
        showFormMessage('register-message', 'Le mot de passe doit contenir au moins 6 caractères.', 'error');
        return;
    }

    if (!terms) {
        showFormMessage('register-message', 'Veuillez accepter les conditions d\'utilisation.', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('yjournal_users') || '[]');

    if (users.find(u => u.email === email)) {
        showFormMessage('register-message', 'Cet email est déjà utilisé.', 'error');
        return;
    }

    const user = {
        name,
        email,
        password,
        createdAt: new Date().toISOString()
    };

    users.push(user);
    localStorage.setItem('yjournal_users', JSON.stringify(users));

    state.currentUser = user;
    state.accounts = [];
    saveState();

    showToast('Compte créé avec succès ! 🚀', 'success');
    showSection('create-account-section');
}

function handleLogout() {
    state.currentUser = null;
    state.accounts = [];
    saveState();

    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    clearMessages();

    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    removeSidebarOverlay();

    showSection('auth-section');
    showToast('Déconnexion effectuée.', 'info');
}

// ---------- CREATE ACCOUNT ---------- //
function handleCreateAccount(e) {
    e.preventDefault();
    const account = {
        id: Date.now().toString(),
        name: document.getElementById('account-name').value.trim(),
        broker: document.getElementById('broker').value.trim(),
        type: document.getElementById('account-type').value,
        currency: document.getElementById('currency').value,
        initialCapital: parseFloat(document.getElementById('initial-capital').value),
        currentBalance: parseFloat(document.getElementById('initial-capital').value),
        color: state.selectedColor,
        trades: [],
        createdAt: new Date().toISOString()
    };

    if (!account.name || !account.broker || !account.type || !account.currency || isNaN(account.initialCapital)) {
        showFormMessage('create-account-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    state.accounts.push(account);
    saveAccountsToStorage();
    saveState();

    showToast(`Compte "${account.name}" connecté ! ✅`, 'success');
    showSection('dashboard-section');
    renderDashboard();
}

function handleModalCreateAccount(e) {
    e.preventDefault();
    const account = {
        id: Date.now().toString(),
        name: document.getElementById('modal-account-name').value.trim(),
        broker: document.getElementById('modal-broker').value.trim(),
        type: document.getElementById('modal-account-type').value,
        currency: document.getElementById('modal-currency').value,
        initialCapital: parseFloat(document.getElementById('modal-capital').value),
        currentBalance: parseFloat(document.getElementById('modal-capital').value),
        color: state.selectedColor,
        trades: [],
        createdAt: new Date().toISOString()
    };

    if (!account.name || !account.broker || !account.type || !account.currency || isNaN(account.initialCapital)) {
        showFormMessage('modal-message', 'Veuillez remplir tous les champs.', 'error');
        return;
    }

    state.accounts.push(account);
    saveAccountsToStorage();
    saveState();

    closeAddAccountModal();
    showToast(`Compte "${account.name}" connecté ! ✅`, 'success');
    renderDashboard();
}

function skipAccountCreation() {
    showSection('dashboard-section');
    renderDashboard();
}

function saveAccountsToStorage() {
    if (state.currentUser) {
        localStorage.setItem(`yjournal_accounts_${state.currentUser.email}`, JSON.stringify(state.accounts));
    }
}

// ---------- COLOR PICKER ---------- //
function selectColor(el) {
    const picker = el.closest('.color-picker');
    picker.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    state.selectedColor = el.dataset.color;
}

// ---------- SIDEBAR ---------- //
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');

    if (sidebar.classList.contains('open')) {
        createSidebarOverlay();
    } else {
        removeSidebarOverlay();
    }
}

function createSidebarOverlay() {
    if (document.querySelector('.sidebar-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay active';
    overlay.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        removeSidebarOverlay();
    });
    document.getElementById('dashboard-section').appendChild(overlay);
}

function removeSidebarOverlay() {
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.remove();
}

// ---------- DASHBOARD TABS ---------- //
function switchDashboardTab(tab, navItem) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navItem) navItem.classList.add('active');

    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active');

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        removeSidebarOverlay();
    }
}

// ---------- RENDER DASHBOARD ---------- //
function renderDashboard() {
    if (!state.currentUser) return;

    const user = state.currentUser;
    const firstName = user.name.split(' ')[0];
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    // Greeting
    updateGreeting();

    // Profile
    document.getElementById('profile-avatar').textContent = initials;
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('sidebar-username').textContent = user.name;
    document.getElementById('greeting-text').textContent = `Bonjour, ${firstName} 👋`;

    const createdDate = new Date(user.createdAt);
    document.getElementById('profile-member-since').textContent = `Membre depuis ${createdDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;

    // Account stats
    const totalAccounts = state.accounts.length;
    const totalTrades = state.accounts.reduce((sum, a) => sum + (a.trades ? a.trades.length : 0), 0);
    const daysActive = Math.max(1, Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    document.getElementById('profile-accounts-count').textContent = totalAccounts;
    document.getElementById('profile-total-trades').textContent = totalTrades;
    document.getElementById('profile-days-active').textContent = daysActive;

    // Global Summary
    const totalCapital = state.accounts.reduce((sum, a) => sum + a.initialCapital, 0);
    const totalBalance = state.accounts.reduce((sum, a) => sum + (a.currentBalance || a.initialCapital), 0);

    let winningTrades = 0;
    let totalTradesCount = 0;
    state.accounts.forEach(a => {
        if (a.trades) {
            a.trades.forEach(t => {
                totalTradesCount++;
                if (t.profit > 0) winningTrades++;
            });
        }
    });
    const winrate = totalTradesCount > 0 ? Math.round((winningTrades / totalTradesCount) * 100) : 0;

    const mainCurrency = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    document.getElementById('total-capital').textContent = `${mainCurrency}${formatNumber(totalCapital)}`;
    document.getElementById('total-balance').textContent = `${mainCurrency}${formatNumber(totalBalance)}`;
    document.getElementById('global-winrate').textContent = `${winrate}%`;

    const balanceChange = totalCapital > 0 ? (((totalBalance - totalCapital) / totalCapital) * 100).toFixed(2) : 0;
    const changeEl = document.getElementById('balance-change');
    changeEl.textContent = `${balanceChange >= 0 ? '+' : ''}${balanceChange}%`;
    changeEl.className = `summary-change ${balanceChange >= 0 ? 'positive' : 'negative'}`;

    // Winrate bar
    document.getElementById('winrate-fill').style.width = `${winrate}%`;

    // Render accounts
    renderAccounts();
}

function renderAccounts() {
    const grid = document.getElementById('accounts-grid');
    const emptyCard = document.getElementById('empty-accounts-card');

    // Remove existing account cards but keep the empty card
    grid.querySelectorAll('.account-card-item').forEach(c => c.remove());

    if (state.accounts.length === 0) {
        emptyCard.style.display = 'flex';
        return;
    }

    emptyCard.style.display = 'none';

    state.accounts.forEach(account => {
        const card = createAccountCard(account);
        grid.appendChild(card);
    });
}

function createAccountCard(account) {
    const card = document.createElement('div');
    card.className = 'account-card-item';
    card.dataset.id = account.id;

    const currencySymbol = getCurrencySymbol(account.currency);
    const typeLabels = {
        'reel': '💰 Réel',
        'demo': '🎮 Démo',
        'prop-firm': '🏢 Prop Firm',
        'challenge': '🏆 Challenge',
        'paper': '📝 Paper'
    };

    const profit = account.currentBalance - account.initialCapital;
    const profitPercent = account.initialCapital > 0 ? ((profit / account.initialCapital) * 100).toFixed(2) : 0;

    let tradeCount = account.trades ? account.trades.length : 0;
    let accountWinrate = 0;
    if (account.trades && account.trades.length > 0) {
        const wins = account.trades.filter(t => t.profit > 0).length;
        accountWinrate = Math.round((wins / account.trades.length) * 100);
    }

    card.innerHTML = `
        <div class="account-card-color-bar" style="background: ${account.color}"></div>
        <div class="account-card-body">
            <div class="account-card-header">
                <span class="account-card-name">${escapeHTML(account.name)}</span>
                <span class="account-card-type">${typeLabels[account.type] || account.type}</span>
            </div>
            <div class="account-card-broker">${escapeHTML(account.broker)} · ${account.currency}</div>
            <div class="account-card-stats">
                <div class="account-stat">
                    <span class="account-stat-label">Capital Initial</span>
                    <span class="account-stat-value">${currencySymbol}${formatNumber(account.initialCapital)}</span>
                </div>
                <div class="account-stat">
                    <span class="account-stat-label">Solde Actuel</span>
                    <span class="account-stat-value" style="color: ${profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${currencySymbol}${formatNumber(account.currentBalance)}</span>
                </div>
                <div class="account-stat">
                    <span class="account-stat-label">P&L</span>
                    <span class="account-stat-value" style="color: ${profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${profit >= 0 ? '+' : ''}${profitPercent}%</span>
                </div>
                <div class="account-stat">
                    <span class="account-stat-label">Winrate</span>
                    <span class="account-stat-value">${accountWinrate}%</span>
                </div>
            </div>
        </div>
        <div class="account-card-footer">
            <button class="account-card-delete" onclick="deleteAccount('${account.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                Supprimer
            </button>
        </div>
    `;

    return card;
}

function deleteAccount(id) {
    if (!confirm('Supprimer ce compte de trading ?')) return;

    state.accounts = state.accounts.filter(a => a.id !== id);
    saveAccountsToStorage();
    saveState();
    renderDashboard();
    showToast('Compte supprimé.', 'info');
}

// ---------- MODAL ---------- //
function openAddAccountModal() {
    document.getElementById('add-account-modal').classList.add('active');
    document.getElementById('modal-account-name').value = '';
    document.getElementById('modal-broker').value = '';
    document.getElementById('modal-account-type').value = '';
    document.getElementById('modal-currency').value = '';
    document.getElementById('modal-capital').value = '';
    state.selectedColor = '#6C5CE7';

    const modal = document.getElementById('add-account-modal');
    modal.querySelectorAll('.color-option').forEach(c => {
        c.classList.toggle('active', c.dataset.color === '#6C5CE7');
    });

    clearMessages();
}

function closeAddAccountModal() {
    document.getElementById('add-account-modal').classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ---------- PASSWORD ---------- //
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const eyeOpen = btn.querySelector('.eye-open');
    const eyeClosed = btn.querySelector('.eye-closed');

    if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
    } else {
        input.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
    }
}

function setupPasswordStrength() {
    const passwordInput = document.getElementById('register-password');
    if (!passwordInput) return;

    passwordInput.addEventListener('input', () => {
        const value = passwordInput.value;
        const bar = document.getElementById('strength-bar');
        const text = document.getElementById('strength-text');
        let strength = 0;

        if (value.length >= 6) strength++;
        if (value.length >= 10) strength++;
        if (/[A-Z]/.test(value)) strength++;
        if (/[0-9]/.test(value)) strength++;
        if (/[^A-Za-z0-9]/.test(value)) strength++;

        const levels = [
            { width: '0%', color: 'transparent', label: '' },
            { width: '20%', color: '#E17055', label: 'Très faible' },
            { width: '40%', color: '#E17055', label: 'Faible' },
            { width: '60%', color: '#FDCB6E', label: 'Moyen' },
            { width: '80%', color: '#00B894', label: 'Fort' },
            { width: '100%', color: '#00B894', label: 'Très fort' }
        ];

        const level = levels[strength];
        bar.style.width = level.width;
        bar.style.background = level.color;
        text.textContent = value.length > 0 ? level.label : '';
        text.style.color = level.color;
    });
}

// ---------- UTILITIES ---------- //
function updateCurrencySuffix() {
    const currencySelect = document.getElementById('currency');
    const suffix = document.getElementById('currency-suffix');
    if (currencySelect && suffix) {
        suffix.textContent = currencySelect.value || 'USD';
    }
}

function updateGreeting() {
    const dateEl = document.getElementById('greeting-date');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('fr-FR', options);
    }
}

function getCurrencySymbol(currency) {
    const symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'CHF': 'CHF ',
        'JPY': '¥', 'CAD': 'C$', 'AUD': 'A$', 'XOF': 'CFA '
    };
    return symbols[currency] || '$';
}

function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showFormMessage(id, message, type) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.className = `form-message ${type}`;
    }
}

function clearMessages() {
    document.querySelectorAll('.form-message').forEach(m => {
        m.textContent = '';
        m.className = 'form-message';
    });
}

// ---------- TOAST ---------- //
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3200);
}


// ============================================== //
// JOURNAL & TRADE MODAL — Ajoutez à app.js       //
// ============================================== //

// ---------- JOURNAL STATE ---------- //
const journalState = {
    year: new Date().getFullYear(),
    period: 'all',
    currentStep: 1,
    totalSteps: 4,
    editingTradeId: null,
    direction: 'BUY',
    selectedTF: '5m',
    selectedPOIs: [],
    selectedEmotion: '',
    planRating: 0,
    screenshots: { 1: null, 2: null, 3: null }
};

// ---------- JOURNAL INIT ---------- //
function initJournal() {
    document.getElementById('journal-year').textContent = journalState.year;
    renderTradesTable();
    updateJournalSummary();
}

// Override the original switchDashboardTab to trigger journal init
const _origSwitchTab = switchDashboardTab;
switchDashboardTab = function(tab, navItem) {
    _origSwitchTab(tab, navItem);
    if (tab === 'journal') {
        initJournal();
    }
};

// ---------- YEAR NAVIGATION ---------- //
function changeJournalYear(delta) {
    journalState.year += delta;
    document.getElementById('journal-year').textContent = journalState.year;
    renderTradesTable();
    updateJournalSummary();
}

// ---------- PERIOD FILTER ---------- //
function setJournalPeriod(period, btn) {
    journalState.period = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTradesTable();
    updateJournalSummary();
}

// ---------- GET FILTERED TRADES ---------- //
function getFilteredTrades() {
    const allTrades = getAllTrades();
    const year = journalState.year;
    const period = journalState.period;
    const now = new Date();

    return allTrades.filter(trade => {
        const d = new Date(trade.date);
        if (d.getFullYear() !== year) return false;

        if (period === 'all') return true;

        const month = d.getMonth();
        const weekNow = getWeekNumber(now);
        const weekTrade = getWeekNumber(d);

        switch (period) {
            case 'weekly':
                return d.getFullYear() === now.getFullYear() && weekTrade === weekNow;
            case 'monthly':
                return month === now.getMonth() && d.getFullYear() === now.getFullYear();
            case 'quarterly':
                const qTrade = Math.floor(month / 3);
                const qNow = Math.floor(now.getMonth() / 3);
                return qTrade === qNow && d.getFullYear() === now.getFullYear();
            case 'semi':
                const sTrade = month < 6 ? 0 : 1;
                const sNow = now.getMonth() < 6 ? 0 : 1;
                return sTrade === sNow && d.getFullYear() === now.getFullYear();
            case 'yearly':
                return true; // already filtered by year
            default:
                return true;
        }
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function getAllTrades() {
    const trades = [];
    if (!state.currentUser) return trades;
    state.accounts.forEach(account => {
        if (account.trades) {
            account.trades.forEach(trade => {
                trades.push({ ...trade, accountName: account.name, accountId: account.id, currency: account.currency });
            });
        }
    });
    return trades;
}

// ---------- RENDER TABLE ---------- //
function renderTradesTable() {
    const tbody = document.getElementById('trades-tbody');
    const emptyState = document.getElementById('trades-empty');
    const table = document.getElementById('trades-table');

    const trades = getFilteredTrades();
    tbody.innerHTML = '';

    if (trades.length === 0) {
        table.style.display = 'none';
        emptyState.classList.remove('hidden');
        emptyState.style.display = 'flex';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';
    emptyState.classList.add('hidden');

    trades.forEach(trade => {
        const tr = document.createElement('tr');
        tr.onclick = () => openTradeModal(trade);

        const d = new Date(trade.date);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const returnR = trade.returnR != null ? trade.returnR : 0;
        const pnl = trade.pnl != null ? trade.pnl : 0;
        const returnClass = returnR > 0 ? 'positive' : returnR < 0 ? 'negative' : 'neutral';
        const returnSign = returnR > 0 ? '+' : '';
        const pnlSign = pnl > 0 ? '+' : '';
        const currSymbol = getCurrencySymbol(trade.currency || 'USD');

        const dirClass = (trade.direction || '').toLowerCase();

        tr.innerHTML = `
            <td class="td-date">
                ${dateStr}
                <span class="trade-time">${timeStr}</span>
            </td>
            <td class="td-asset">
                ${escapeHTML(trade.asset || '—')}
                <span class="trade-direction ${dirClass}">${trade.direction || ''}</span>
            </td>
            <td class="td-return ${returnClass}">
                ${returnSign}${returnR.toFixed(2)}R
                <span class="return-pnl">${pnlSign}${currSymbol}${Math.abs(pnl).toFixed(2)}</span>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// ---------- JOURNAL SUMMARY ---------- //
function updateJournalSummary() {
    const trades = getFilteredTrades();
    const total = trades.length;
    const wins = trades.filter(t => (t.returnR || 0) > 0).length;
    const losses = trades.filter(t => (t.returnR || 0) < 0).length;
    const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalR = trades.reduce((sum, t) => sum + (t.returnR || 0), 0);

    const mainCurr = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    document.getElementById('journal-total-trades').textContent = total;
    document.getElementById('journal-wins').textContent = wins;
    document.getElementById('journal-losses').textContent = losses;
    document.getElementById('journal-winrate').textContent = winrate + '%';

    const pnlEl = document.getElementById('journal-pnl');
    pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${mainCurr}${Math.abs(pnl).toFixed(2)}`;
    pnlEl.style.color = pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    const rEl = document.getElementById('journal-total-r');
    rEl.textContent = `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`;
    rEl.style.color = totalR >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
}

// ---------- TRADE MODAL ---------- //
function openTradeModal(existingTrade) {
    journalState.currentStep = 1;
    journalState.editingTradeId = existingTrade ? existingTrade.id : null;

    // Populate account selector
    const accountSelect = document.getElementById('trade-account');
    accountSelect.innerHTML = '<option value="" disabled selected>Sélectionner un compte</option>';
    state.accounts.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = `${acc.name} (${acc.broker})`;
        accountSelect.appendChild(opt);
    });

    // Set default date
    if (!existingTrade) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('trade-date').value = now.toISOString().slice(0, 16);
    }

    // Modal title
    document.getElementById('trade-modal-title').innerHTML = existingTrade
        ? `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Modifier le Trade`
        : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nouveau Trade`;

    if (existingTrade) {
        populateTradeForm(existingTrade);
    } else {
        resetTradeForm();
    }

    updateTradeStepUI();
    document.getElementById('trade-modal').classList.add('active');
}

function closeTradeModal() {
    document.getElementById('trade-modal').classList.remove('active');
    journalState.editingTradeId = null;
}

function resetTradeForm() {
    document.getElementById('trade-form').reset();

    journalState.direction = 'BUY';
    journalState.selectedTF = '5m';
    journalState.selectedPOIs = [];
    journalState.selectedEmotion = '';
    journalState.planRating = 0;
    journalState.screenshots = { 1: null, 2: null, 3: null };

    // Reset direction
    document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.dir-btn.buy').classList.add('active');

    // Reset TF
    document.querySelectorAll('.tf-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.tf-chip[data-tf="5m"]').classList.add('active');

    // Reset POIs
    document.querySelectorAll('.poi-chip').forEach(c => c.classList.remove('active'));

    // Reset emotions
    document.querySelectorAll('.emotion-chip').forEach(c => c.classList.remove('active'));

    // Reset stars
    document.querySelectorAll('.plan-star').forEach(s => s.classList.remove('active'));

    // Reset screenshots
    for (let i = 1; i <= 3; i++) {
        removeScreenshot(i);
        document.getElementById(`screenshot-url-${i}`).value = '';
    }

    // Reset calculator
    document.getElementById('calc-rr').textContent = '—';
    document.getElementById('calc-rr').className = 'rr-value';
    document.getElementById('calc-pnl').textContent = '—';
    document.getElementById('calc-pnl').className = 'rr-value';
    document.getElementById('calc-return-r').textContent = '—';
    document.getElementById('calc-return-r').className = 'rr-value';

    // Set default date
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('trade-date').value = now.toISOString().slice(0, 16);
}

function populateTradeForm(trade) {
    resetTradeForm();

    document.getElementById('trade-account').value = trade.accountId || '';
    document.getElementById('trade-asset').value = trade.asset || '';
    document.getElementById('trade-date').value = trade.date ? trade.date.slice(0, 16) : '';

    // Direction
    journalState.direction = trade.direction || 'BUY';
    document.querySelectorAll('.dir-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.dir === journalState.direction);
    });

    document.getElementById('trade-model').value = trade.model || '';
    document.getElementById('trade-session').value = trade.session || '';
    document.getElementById('trade-type').value = trade.tradeType || '';

    // TF
    if (trade.tfExec) {
        journalState.selectedTF = trade.tfExec;
        document.querySelectorAll('.tf-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.tf === trade.tfExec);
        });
    }

    document.getElementById('trade-entry').value = trade.entryPrice || '';
    document.getElementById('trade-sl').value = trade.sl || '';
    document.getElementById('trade-tp').value = trade.tp || '';
    document.getElementById('trade-lot-size').value = trade.lotSize || '';
    document.getElementById('trade-close-price').value = trade.closePrice || '';

    // Step 2
    document.getElementById('trade-structure').value = trade.structure || '';
    document.getElementById('trade-htf').value = trade.htf || '';

    // POIs
    journalState.selectedPOIs = trade.pois || [];
    document.querySelectorAll('.poi-chip').forEach(c => {
        c.classList.toggle('active', journalState.selectedPOIs.includes(c.dataset.poi));
    });

    document.getElementById('trade-confluence').value = trade.confluence || '';

    // Step 3
    if (trade.emotion) {
        journalState.selectedEmotion = trade.emotion;
        document.querySelectorAll('.emotion-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.emotion === trade.emotion);
        });
    }

    document.getElementById('trade-context').value = trade.context || '';
    document.getElementById('trade-management').value = trade.management || '';

    if (trade.planRating) {
        setPlanRating(trade.planRating);
    }

    document.getElementById('trade-outcome-select').value = trade.outcome || '';

    // Step 4
    if (trade.screenshotUrls) {
        for (let i = 1; i <= 3; i++) {
            if (trade.screenshotUrls[i]) {
                document.getElementById(`screenshot-url-${i}`).value = trade.screenshotUrls[i];
            }
        }
    }

    if (trade.screenshots) {
        for (let i = 1; i <= 3; i++) {
            if (trade.screenshots[i]) {
                journalState.screenshots[i] = trade.screenshots[i];
                showScreenshotPreview(i, trade.screenshots[i]);
            }
        }
    }

    document.getElementById('trade-lessons').value = trade.lessons || '';

    calculateRR();
}

// ---------- STEP NAVIGATION ---------- //
function tradeStepNext() {
    if (journalState.currentStep < journalState.totalSteps) {
        // Validate step 1 required fields
        if (journalState.currentStep === 1) {
            const account = document.getElementById('trade-account').value;
            const asset = document.getElementById('trade-asset').value;
            const date = document.getElementById('trade-date').value;
            const entry = document.getElementById('trade-entry').value;
            const sl = document.getElementById('trade-sl').value;

            if (!account || !asset || !date || !entry || !sl) {
                showToast('Veuillez remplir les champs obligatoires (Compte, Actif, Date, Entrée, SL).', 'error');
                return;
            }
        }

        journalState.currentStep++;
        updateTradeStepUI();
    }
}

function tradeStepPrev() {
    if (journalState.currentStep > 1) {
        journalState.currentStep--;
        updateTradeStepUI();
    }
}

function updateTradeStepUI() {
    const step = journalState.currentStep;

    // Steps content
    document.querySelectorAll('.trade-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`trade-step-${step}`).classList.add('active');

    // Step indicators
    document.querySelectorAll('.trade-step-indicator').forEach(ind => {
        const s = parseInt(ind.dataset.step);
        ind.classList.remove('active', 'completed');
        if (s === step) ind.classList.add('active');
        else if (s < step) ind.classList.add('completed');
    });

    // Step lines
    const lines = document.querySelectorAll('.trade-steps-bar .trade-step-line');
    lines.forEach((line, i) => {
        line.classList.toggle('completed', (i + 1) < step);
    });

    // Dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.toggle('active', parseInt(dot.dataset.step) === step);
    });

    // Nav buttons
    const prevBtn = document.getElementById('trade-prev-btn');
    const nextBtn = document.getElementById('trade-next-btn');
    const submitBtn = document.getElementById('trade-submit-btn');

    prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';

    if (step === journalState.totalSteps) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

// ---------- DIRECTION ---------- //
function setDirection(dir, btn) {
    journalState.direction = dir;
    document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    calculateRR();
}

// ---------- TIMEFRAME ---------- //
function selectTF(el) {
    document.querySelectorAll('.tf-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    journalState.selectedTF = el.dataset.tf;
}

// ---------- POI ---------- //
function togglePOI(el) {
    el.classList.toggle('active');
    const poi = el.dataset.poi;
    if (journalState.selectedPOIs.includes(poi)) {
        journalState.selectedPOIs = journalState.selectedPOIs.filter(p => p !== poi);
    } else {
        journalState.selectedPOIs.push(poi);
    }
}

// ---------- EMOTION ---------- //
function selectEmotion(el) {
    document.querySelectorAll('.emotion-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    journalState.selectedEmotion = el.dataset.emotion;
}

// ---------- PLAN RATING ---------- //
function setPlanRating(rating) {
    journalState.planRating = rating;
    document.querySelectorAll('.plan-star').forEach(star => {
        const r = parseInt(star.dataset.rating);
        star.classList.toggle('active', r <= rating);
    });
}

// ---------- R:R CALCULATOR ---------- //
function calculateRR() {
    const entry = parseFloat(document.getElementById('trade-entry').value);
    const sl = parseFloat(document.getElementById('trade-sl').value);
    const tp = parseFloat(document.getElementById('trade-tp').value);
    const closePrice = parseFloat(document.getElementById('trade-close-price').value);
    const lotSize = parseFloat(document.getElementById('trade-lot-size').value);
    const dir = journalState.direction;

    const rrEl = document.getElementById('calc-rr');
    const pnlEl = document.getElementById('calc-pnl');
    const returnREl = document.getElementById('calc-return-r');

    // Risk in pips
    if (isNaN(entry) || isNaN(sl) || entry === sl) {
        rrEl.textContent = '—';
        rrEl.className = 'rr-value';
        pnlEl.textContent = '—';
        pnlEl.className = 'rr-value';
        returnREl.textContent = '—';
        returnREl.className = 'rr-value';
        return;
    }

    const risk = Math.abs(entry - sl);

    // R:R Ratio
    if (!isNaN(tp) && tp !== 0) {
        const reward = Math.abs(tp - entry);
        const rr = reward / risk;
        rrEl.textContent = `1:${rr.toFixed(2)}`;
        rrEl.className = 'rr-value ' + (rr >= 2 ? 'positive' : rr >= 1 ? 'neutral' : 'negative');
    } else {
        rrEl.textContent = '—';
        rrEl.className = 'rr-value';
    }

    // P&L and Return R
    if (!isNaN(closePrice)) {
        let pnlPips;
        if (dir === 'BUY') {
            pnlPips = closePrice - entry;
        } else {
            pnlPips = entry - closePrice;
        }

        const returnR = pnlPips / risk;
        returnREl.textContent = `${returnR >= 0 ? '+' : ''}${returnR.toFixed(2)}R`;
        returnREl.className = 'rr-value ' + (returnR > 0 ? 'positive' : returnR < 0 ? 'negative' : 'neutral');

        // Estimate P&L in $ (simplified: use lot size * pip value approximation)
        if (!isNaN(lotSize) && lotSize > 0) {
            // Rough estimation: for forex standard lot, 1 pip ≈ $10
            // We'll use pnl = pnlPips * lotSize * pipMultiplier
            const asset = document.getElementById('trade-asset').value.toUpperCase();
            let pipMultiplier = 100000; // forex default

            if (asset.includes('XAU') || asset.includes('GOLD')) {
                pipMultiplier = 100;
            } else if (asset.includes('US100') || asset.includes('NAS') || asset.includes('US500') || asset.includes('US30') || asset.includes('GER')) {
                pipMultiplier = 1;
            } else if (asset.includes('BTC') || asset.includes('ETH')) {
                pipMultiplier = 1;
            } else if (asset.includes('JPY')) {
                pipMultiplier = 1000;
            }

            const dollarPnl = pnlPips * lotSize * pipMultiplier;
            const formattedPnl = dollarPnl.toFixed(2);
            pnlEl.textContent = `${dollarPnl >= 0 ? '+' : ''}$${Math.abs(dollarPnl).toFixed(2)}`;
            pnlEl.className = 'rr-value ' + (dollarPnl > 0 ? 'positive' : dollarPnl < 0 ? 'negative' : 'neutral');
        } else {
            pnlEl.textContent = '—';
            pnlEl.className = 'rr-value';
        }
    } else {
        pnlEl.textContent = '—';
        pnlEl.className = 'rr-value';
        returnREl.textContent = '—';
        returnREl.className = 'rr-value';
    }
}

// ---------- SCREENSHOTS ---------- //
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleScreenshotDrop(e, zone) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        processScreenshotFile(files[0], zone);
    }
}

function handleScreenshotFile(e, zone) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processScreenshotFile(file, zone);
    }
}

function processScreenshotFile(file, zone) {
    const reader = new FileReader();
    reader.onload = function(e) {
        journalState.screenshots[zone] = e.target.result;
        showScreenshotPreview(zone, e.target.result);
    };
    reader.readAsDataURL(file);
}

function showScreenshotPreview(zone, src) {
    const content = document.getElementById(`dropzone-content-${zone}`);
    const preview = document.getElementById(`dropzone-preview-${zone}`);
    const img = document.getElementById(`preview-img-${zone}`);

    img.src = src;
    content.classList.add('hidden');
    preview.classList.remove('hidden');
}

function removeScreenshot(zone) {
    journalState.screenshots[zone] = null;
    const content = document.getElementById(`dropzone-content-${zone}`);
    const preview = document.getElementById(`dropzone-preview-${zone}`);
    const img = document.getElementById(`preview-img-${zone}`);
    const input = document.getElementById(`screenshot-input-${zone}`);

    img.src = '';
    content.classList.remove('hidden');
    preview.classList.add('hidden');
    if (input) input.value = '';
}

// ---------- TRADE SUBMIT ---------- //
function handleTradeSubmit(e) {
    e.preventDefault();

    const accountId = document.getElementById('trade-account').value;
    const account = state.accounts.find(a => a.id === accountId);

    if (!account) {
        showToast('Veuillez sélectionner un compte valide.', 'error');
        return;
    }

    const entry = parseFloat(document.getElementById('trade-entry').value);
    const sl = parseFloat(document.getElementById('trade-sl').value);
    const tp = parseFloat(document.getElementById('trade-tp').value) || null;
    const closePrice = parseFloat(document.getElementById('trade-close-price').value) || null;
    const lotSize = parseFloat(document.getElementById('trade-lot-size').value) || null;
    const dir = journalState.direction;
    const risk = Math.abs(entry - sl);

    // Calculate R:R
    let rr = null;
    if (tp) {
        rr = Math.abs(tp - entry) / risk;
    }

    // Calculate Return R and PnL
    let returnR = 0;
    let pnl = 0;

    if (closePrice) {
        const pnlPips = dir === 'BUY' ? (closePrice - entry) : (entry - closePrice);
        returnR = pnlPips / risk;

        if (lotSize) {
            const asset = document.getElementById('trade-asset').value.toUpperCase();
            let pipMultiplier = 100000;
            if (asset.includes('XAU') || asset.includes('GOLD')) pipMultiplier = 100;
            else if (asset.includes('US100') || asset.includes('NAS') || asset.includes('US500') || asset.includes('US30') || asset.includes('GER')) pipMultiplier = 1;
            else if (asset.includes('BTC') || asset.includes('ETH')) pipMultiplier = 1;
            else if (asset.includes('JPY')) pipMultiplier = 1000;

            pnl = pnlPips * lotSize * pipMultiplier;
        }
    }

    // Collect screenshot URLs
    const screenshotUrls = {};
    for (let i = 1; i <= 3; i++) {
        const url = document.getElementById(`screenshot-url-${i}`).value.trim();
        if (url) screenshotUrls[i] = url;
    }

    // Build trade object
    const trade = {
        id: journalState.editingTradeId || Date.now().toString() + Math.random().toString(36).substr(2, 5),
        accountId,
        asset: document.getElementById('trade-asset').value.trim(),
        date: document.getElementById('trade-date').value,
        direction: dir,
        model: document.getElementById('trade-model').value,
        session: document.getElementById('trade-session').value,
        tradeType: document.getElementById('trade-type').value,
        tfExec: journalState.selectedTF,
        entryPrice: entry,
        sl,
        tp,
        lotSize,
        closePrice,
        rr: rr ? parseFloat(rr.toFixed(2)) : null,
        returnR: parseFloat(returnR.toFixed(4)),
        pnl: parseFloat(pnl.toFixed(2)),
        profit: pnl,

        // Step 2
        structure: document.getElementById('trade-structure').value,
        htf: document.getElementById('trade-htf').value,
        pois: [...journalState.selectedPOIs],
        confluence: document.getElementById('trade-confluence').value,

        // Step 3
        emotion: journalState.selectedEmotion,
        context: document.getElementById('trade-context').value,
        management: document.getElementById('trade-management').value,
        planRating: journalState.planRating,
        outcome: document.getElementById('trade-outcome-select').value,

        // Step 4
        screenshots: { ...journalState.screenshots },
        screenshotUrls,
        lessons: document.getElementById('trade-lessons').value,

        updatedAt: new Date().toISOString()
    };

    // Save to account
    if (!account.trades) account.trades = [];

    if (journalState.editingTradeId) {
        const idx = account.trades.findIndex(t => t.id === journalState.editingTradeId);
        if (idx !== -1) {
            account.trades[idx] = trade;
        } else {
            account.trades.push(trade);
        }
    } else {
        account.trades.push(trade);
    }

    // Update account balance
    if (closePrice && lotSize) {
        account.currentBalance = account.initialCapital + account.trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    }

    saveAccountsToStorage();
    saveState();

    closeTradeModal();
    renderTradesTable();
    updateJournalSummary();
    renderDashboard();

    showToast(
        journalState.editingTradeId ? 'Trade mis à jour avec succès ! ✅' : 'Trade enregistré avec succès ! ✅',
        'success'
    );
}


// ============================================== //
// ÉVOLUTION & PERFORMANCE — Ajoutez à app.js     //
// ============================================== //

// ---------- CHART.JS CDN LOADER ---------- //
(function loadChartJS() {
    if (window.Chart) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
    s.onload = () => {
        Chart.defaults.color = '#9999CC';
        Chart.defaults.borderColor = 'rgba(108,92,231,0.1)';
        Chart.defaults.font.family = "'Inter','Segoe UI',system-ui,sans-serif";
    };
    document.head.appendChild(s);
})();

// ---------- EVO STATE ---------- //
const evoState = {
    equityMode: 'dollar',
    charts: {
        equity: null,
        pnlBar: null,
        modelDoughnut: null,
        poiDoughnut: null,
        sessionDoughnut: null
    }
};

const EVO_PALETTE = [
    '#6C5CE7', '#00e676', '#0984E3', '#ff5252',
    '#FDCB6E', '#A29BFE', '#00CEC9', '#E84393',
    '#F97316', '#14B8A6', '#8B5CF6', '#EC4899'
];

// ---------- INIT ---------- //
function initEvolution() {
    populateEvoFilters();
    applyEvoFilters();
}

// Extend tab switching
const _origSwitchTab2 = switchDashboardTab;
switchDashboardTab = function (tab, navItem) {
    _origSwitchTab2(tab, navItem);
    if (tab === 'evolution') {
        setTimeout(initEvolution, 60);
    }
};

// ---------- FILTER POPULATION ---------- //
function populateEvoFilters() {
    const accountSel = document.getElementById('evo-filter-account');
    const assetSel = document.getElementById('evo-filter-asset');

    const currentAcc = accountSel.value;
    const currentAsset = assetSel.value;

    accountSel.innerHTML = '<option value="all">Tous les comptes</option>';
    state.accounts.forEach(a => {
        const o = document.createElement('option');
        o.value = a.id;
        o.textContent = a.name;
        accountSel.appendChild(o);
    });

    const allTrades = getEvoAllTrades();
    const assets = [...new Set(allTrades.map(t => t.asset).filter(Boolean))].sort();
    assetSel.innerHTML = '<option value="all">Tous les actifs</option>';
    assets.forEach(a => {
        const o = document.createElement('option');
        o.value = a;
        o.textContent = a;
        assetSel.appendChild(o);
    });

    accountSel.value = currentAcc || 'all';
    assetSel.value = currentAsset || 'all';
}

// ---------- GATHER TRADES ---------- //
function getEvoAllTrades() {
    const trades = [];
    if (!state.currentUser) return trades;
    state.accounts.forEach(acc => {
        if (acc.trades) {
            acc.trades.forEach(t => {
                trades.push({
                    ...t,
                    accountId: acc.id,
                    accountName: acc.name,
                    currency: acc.currency,
                    accountInitialCapital: acc.initialCapital
                });
            });
        }
    });
    return trades.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ---------- FILTER LOGIC ---------- //
function getEvoFilteredTrades() {
    const accVal = document.getElementById('evo-filter-account').value;
    const assetVal = document.getElementById('evo-filter-asset').value;
    const periodVal = document.getElementById('evo-filter-period').value;
    const now = new Date();

    return getEvoAllTrades().filter(t => {
        if (accVal !== 'all' && t.accountId !== accVal) return false;
        if (assetVal !== 'all' && t.asset !== assetVal) return false;

        if (periodVal !== 'all') {
            const d = new Date(t.date);
            switch (periodVal) {
                case 'year':
                    if (d.getFullYear() !== now.getFullYear()) return false;
                    break;
                case 'quarter': {
                    const qNow = Math.floor(now.getMonth() / 3);
                    const qT = Math.floor(d.getMonth() / 3);
                    if (d.getFullYear() !== now.getFullYear() || qT !== qNow) return false;
                    break;
                }
                case 'month':
                    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
                    break;
                case 'week': {
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
                    startOfWeek.setHours(0, 0, 0, 0);
                    if (d < startOfWeek) return false;
                    break;
                }
            }
        }
        return true;
    });
}

function applyEvoFilters() {
    if (!window.Chart) {
        setTimeout(applyEvoFilters, 200);
        return;
    }
    const trades = getEvoFilteredTrades();
    updateEvoSummary(trades);
    updateEvoMetrics(trades);
    renderEquityChart(trades);
    renderPnlBarChart(trades);
    renderModelDoughnut(trades);
    renderPOIDoughnut(trades);
    renderSessionDoughnut(trades);
}

function resetEvoFilters() {
    document.getElementById('evo-filter-account').value = 'all';
    document.getElementById('evo-filter-asset').value = 'all';
    document.getElementById('evo-filter-period').value = 'all';
    applyEvoFilters();
}

// ---------- SUMMARY LINE ---------- //
function updateEvoSummary(trades) {
    const total = trades.length;
    const wins = trades.filter(t => (t.returnR || 0) > 0).length;
    const wr = total > 0 ? Math.round((wins / total) * 100) : 0;
    const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);

    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    document.getElementById('evo-summary-text').textContent = `${total} trade(s) sélectionné(s)`;

    const pnlEl = document.getElementById('evo-summary-pnl');
    pnlEl.textContent = `${pnl >= 0 ? '+' : '-'}${cs}${Math.abs(pnl).toFixed(2)}`;
    pnlEl.style.color = pnl >= 0 ? '#00e676' : '#ff5252';

    const wrEl = document.getElementById('evo-summary-wr');
    wrEl.textContent = `${wr}%`;
}

// ---------- METRICS ---------- //
function updateEvoMetrics(trades) {
    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    // Capital initial & solde
    const accFilter = document.getElementById('evo-filter-account').value;
    let capital = 0;
    let balance = 0;
    if (accFilter === 'all') {
        capital = state.accounts.reduce((s, a) => s + (a.initialCapital || 0), 0);
        balance = state.accounts.reduce((s, a) => s + (a.currentBalance || a.initialCapital || 0), 0);
    } else {
        const acc = state.accounts.find(a => a.id === accFilter);
        if (acc) {
            capital = acc.initialCapital || 0;
            balance = acc.currentBalance || acc.initialCapital || 0;
        }
    }

    const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalR = trades.reduce((s, t) => s + (t.returnR || 0), 0);

    const wins = trades.filter(t => (t.returnR || 0) > 0);
    const losses = trades.filter(t => (t.returnR || 0) < 0);
    const total = trades.length;
    const wr = total > 0 ? Math.round((wins.length / total) * 100) : 0;

    const grossProfit = wins.reduce((s, t) => s + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0));
    const pf = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 999 : 0;

    // Drawdown calculations (in R)
    let peak = 0;
    let cumR = 0;
    let maxDD = 0;
    const drawdowns = [];
    trades.forEach(t => {
        cumR += (t.returnR || 0);
        if (cumR > peak) peak = cumR;
        const dd = peak - cumR;
        if (dd > 0) drawdowns.push(dd);
        if (dd > maxDD) maxDD = dd;
    });
    const avgDD = drawdowns.length > 0 ? drawdowns.reduce((s, d) => s + d, 0) / drawdowns.length : 0;

    // Expectancy
    const expectancy = total > 0 ? totalR / total : 0;

    // Set values
    setMetricVal('evo-m-capital', `${cs}${formatNumber(capital)}`);
    setMetricVal('evo-m-balance', `${cs}${formatNumber(balance)}`, balance >= capital ? 'positive' : 'negative');
    setMetricVal('evo-m-pnl', `${pnl >= 0 ? '+' : '-'}${cs}${Math.abs(pnl).toFixed(2)}`, pnl >= 0 ? 'positive' : 'negative');
    setMetricVal('evo-m-returnr', `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, totalR >= 0 ? 'positive' : 'negative');
    setMetricVal('evo-m-winrate', `${wr}%`, wr >= 50 ? 'positive' : wr > 0 ? 'negative' : '');
    setMetricVal('evo-m-pf', pf >= 999 ? '∞' : pf.toFixed(2), pf >= 1 ? 'positive' : 'negative');
    setMetricVal('evo-m-ddmax', `-${maxDD.toFixed(2)}R`, maxDD > 0 ? 'negative' : '');
    setMetricVal('evo-m-ddavg', `-${avgDD.toFixed(2)}R`, avgDD > 0 ? 'negative' : '');
    setMetricVal('evo-m-expect', `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`, expectancy >= 0 ? 'positive' : 'negative');
    setMetricVal('evo-m-closed', `${total}`);
}

function setMetricVal(id, text, colorClass) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'evo-metric-value' + (colorClass ? ` ${colorClass}` : '');
}

// ---------- EQUITY CHART ---------- //
function toggleEquityMode(mode, btn) {
    evoState.equityMode = mode;
    document.querySelectorAll('.evo-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderEquityChart(getEvoFilteredTrades());
}

function renderEquityChart(trades) {
    const ctx = document.getElementById('equity-chart');
    if (!ctx) return;

    if (evoState.charts.equity) {
        evoState.charts.equity.destroy();
        evoState.charts.equity = null;
    }

    if (trades.length === 0) {
        showChartEmpty(ctx);
        return;
    }
    clearChartEmpty(ctx);

    const isDollar = evoState.equityMode === 'dollar';
    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    let startValue = 0;
    if (isDollar) {
        const accFilter = document.getElementById('evo-filter-account').value;
        if (accFilter === 'all') {
            startValue = state.accounts.reduce((s, a) => s + (a.initialCapital || 0), 0);
        } else {
            const acc = state.accounts.find(a => a.id === accFilter);
            startValue = acc ? acc.initialCapital || 0 : 0;
        }
    }

    const labels = ['Start'];
    const data = [startValue];
    let cum = startValue;

    trades.forEach((t, i) => {
        const d = new Date(t.date);
        labels.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
        cum += isDollar ? (t.pnl || 0) : (t.returnR || 0);
        data.push(parseFloat(cum.toFixed(2)));
    });

    const isPositive = data[data.length - 1] >= data[0];
    const lineColor = isPositive ? '#00e676' : '#ff5252';
    const fillColor = isPositive ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)';

    evoState.charts.equity = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: isDollar ? `Capital (${cs})` : 'Cumul (R)',
                data,
                borderColor: lineColor,
                backgroundColor: fillColor,
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: trades.length > 40 ? 0 : 3,
                pointBackgroundColor: lineColor,
                pointBorderColor: 'transparent',
                pointHoverRadius: 5,
                pointHoverBackgroundColor: lineColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1A1A3E',
                    borderColor: 'rgba(108,92,231,0.3)',
                    borderWidth: 1,
                    titleFont: { weight: '600' },
                    callbacks: {
                        label: ctx2 => isDollar ? `${cs}${ctx2.parsed.y.toFixed(2)}` : `${ctx2.parsed.y.toFixed(2)}R`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, maxTicksLimit: 12 }
                },
                y: {
                    grid: { color: 'rgba(108,92,231,0.06)' },
                    ticks: {
                        font: { size: 11 },
                        callback: v => isDollar ? `${cs}${v}` : `${v}R`
                    }
                }
            }
        }
    });
}

// ---------- PNL BAR CHART ---------- //
function renderPnlBarChart(trades) {
    const ctx = document.getElementById('pnl-bar-chart');
    if (!ctx) return;

    if (evoState.charts.pnlBar) {
        evoState.charts.pnlBar.destroy();
        evoState.charts.pnlBar = null;
    }

    if (trades.length === 0) {
        showChartEmpty(ctx);
        return;
    }
    clearChartEmpty(ctx);

    const labels = trades.map((t, i) => {
        const d = new Date(t.date);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    });

    const data = trades.map(t => parseFloat((t.returnR || 0).toFixed(2)));
    const colors = data.map(v => v >= 0 ? '#00e676' : '#ff5252');

    evoState.charts.pnlBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Return R',
                data,
                backgroundColor: colors.map(c => c === '#00e676' ? 'rgba(0,230,118,0.7)' : 'rgba(255,82,82,0.7)'),
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 3,
                maxBarThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1A1A3E',
                    borderColor: 'rgba(108,92,231,0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx2 => {
                            const v = ctx2.parsed.y;
                            return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, maxTicksLimit: 15 }
                },
                y: {
                    grid: { color: 'rgba(108,92,231,0.06)' },
                    ticks: {
                        font: { size: 11 },
                        callback: v => `${v}R`
                    }
                }
            }
        }
    });
}

// ---------- DOUGHNUT CHARTS ---------- //
function renderModelDoughnut(trades) {
    renderDistributionDoughnut(
        trades,
        'model',
        t => t.model,
        'model-doughnut',
        'model-legend'
    );
}

function renderPOIDoughnut(trades) {
    renderDistributionDoughnut(
        trades,
        'pois',
        null,
        'poi-doughnut',
        'poi-legend'
    );
}

function renderSessionDoughnut(trades) {
    renderDistributionDoughnut(
        trades,
        'session',
        t => t.session,
        'session-doughnut',
        'session-legend'
    );
}

function renderDistributionDoughnut(trades, field, accessor, canvasId, legendId) {
    const ctx = document.getElementById(canvasId);
    const legendEl = document.getElementById(legendId);
    if (!ctx || !legendEl) return;

    const chartKey = field === 'model' ? 'modelDoughnut' : field === 'pois' ? 'poiDoughnut' : 'sessionDoughnut';
    if (evoState.charts[chartKey]) {
        evoState.charts[chartKey].destroy();
        evoState.charts[chartKey] = null;
    }
    legendEl.innerHTML = '';

    // Winning trades only
    const winningTrades = trades.filter(t => (t.returnR || 0) > 0);

    if (winningTrades.length === 0) {
        showChartEmpty(ctx);
        return;
    }
    clearChartEmpty(ctx);

    // Count occurrences
    const counts = {};

    if (field === 'pois') {
        winningTrades.forEach(t => {
            if (t.pois && Array.isArray(t.pois)) {
                t.pois.forEach(p => {
                    if (p) counts[p] = (counts[p] || 0) + 1;
                });
            }
        });
    } else {
        winningTrades.forEach(t => {
            const val = accessor(t);
            if (val) counts[val] = (counts[val] || 0) + 1;
        });
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        showChartEmpty(ctx);
        return;
    }

    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => e[1]);
    const total = data.reduce((s, v) => s + v, 0);
    const colors = labels.map((_, i) => EVO_PALETTE[i % EVO_PALETTE.length]);

    evoState.charts[chartKey] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c + '99'),
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1A1A3E',
                    borderColor: 'rgba(108,92,231,0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx2 => {
                            const pct = ((ctx2.parsed / total) * 100).toFixed(1);
                            return ` ${ctx2.label}: ${ctx2.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // Build legend
    sorted.forEach(([name, count], i) => {
        const pct = ((count / total) * 100).toFixed(0);
        const item = document.createElement('div');
        item.className = 'evo-legend-item';
        item.innerHTML = `
            <div class="evo-legend-left">
                <span class="evo-legend-dot" style="background:${colors[i]}"></span>
                <span class="evo-legend-name">${escapeHTML(name)}</span>
            </div>
            <span class="evo-legend-value">${count} (${pct}%)</span>
        `;
        legendEl.appendChild(item);
    });
}

// ---------- EMPTY CHART STATE ---------- //
function showChartEmpty(canvas) {
    const wrapper = canvas.parentElement;
    canvas.style.display = 'none';

    if (wrapper.querySelector('.evo-chart-empty')) return;

    const empty = document.createElement('div');
    empty.className = 'evo-chart-empty';
    empty.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <span>Aucune donnée disponible pour ces filtres</span>
    `;
    wrapper.appendChild(empty);
}

function clearChartEmpty(canvas) {
    const wrapper = canvas.parentElement;
    canvas.style.display = '';
    const empty = wrapper.querySelector('.evo-chart-empty');
    if (empty) empty.remove();
}


// ============================================== //
// ANALYSE & STATISTIQUES — Ajoutez à app.js      //
// ============================================== //

// ---------- STATS STATE ---------- //
const statsState = {
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    annualYear: new Date().getFullYear(),
    charts: {
        portfolio: null
    }
};

// ---------- INIT ---------- //
function initStats() {
    populateStatsFilters();
    applyStatsFilters();
}

// Hook into tab switching
const _origSwitchTab3 = switchDashboardTab;
switchDashboardTab = function (tab, navItem) {
    _origSwitchTab3(tab, navItem);
    if (tab === 'analysis') {
        setTimeout(initStats, 80);
    }
};

// ---------- POPULATE FILTERS ---------- //
function populateStatsFilters() {
    const accSel = document.getElementById('stats-filter-account');
    const assetSel = document.getElementById('stats-filter-asset');

    const curAcc = accSel.value;
    const curAsset = assetSel.value;

    accSel.innerHTML = '<option value="all">Tous les comptes</option>';
    state.accounts.forEach(a => {
        const o = document.createElement('option');
        o.value = a.id;
        o.textContent = a.name;
        accSel.appendChild(o);
    });

    const all = getStatsAllTrades();
    const assets = [...new Set(all.map(t => t.asset).filter(Boolean))].sort();
    assetSel.innerHTML = '<option value="all">Tous les actifs</option>';
    assets.forEach(a => {
        const o = document.createElement('option');
        o.value = a;
        o.textContent = a;
        assetSel.appendChild(o);
    });

    accSel.value = curAcc || 'all';
    assetSel.value = curAsset || 'all';
}

// ---------- TRADE GATHERING ---------- //
function getStatsAllTrades() {
    const trades = [];
    if (!state.currentUser) return trades;
    state.accounts.forEach(acc => {
        if (acc.trades) {
            acc.trades.forEach(t => {
                trades.push({
                    ...t,
                    accountId: acc.id,
                    accountName: acc.name,
                    currency: acc.currency,
                    accountInitialCapital: acc.initialCapital
                });
            });
        }
    });
    return trades.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getStatsFilteredTrades() {
    const accVal = document.getElementById('stats-filter-account').value;
    const assetVal = document.getElementById('stats-filter-asset').value;
    const sessVal = document.getElementById('stats-filter-session').value;
    const dirVal = document.getElementById('stats-filter-direction').value;
    const typeVal = document.getElementById('stats-filter-type').value;

    return getStatsAllTrades().filter(t => {
        if (accVal !== 'all' && t.accountId !== accVal) return false;
        if (assetVal !== 'all' && t.asset !== assetVal) return false;
        if (sessVal !== 'all' && t.session !== sessVal) return false;
        if (dirVal !== 'all' && t.direction !== dirVal) return false;
        if (typeVal !== 'all' && t.tradeType !== typeVal) return false;
        return true;
    });
}

function applyStatsFilters() {
    if (typeof Chart === 'undefined') {
        setTimeout(applyStatsFilters, 250);
        return;
    }
    const trades = getStatsFilteredTrades();
    updateStatsSummary(trades);
    updateStatsKPIs(trades);
    updateGauges(trades);
    renderPortfolioChart(trades);
    renderPerfTables(trades);
    renderCalendar(trades);
    renderAnnualTable();
}

function resetStatsFilters() {
    document.getElementById('stats-filter-account').value = 'all';
    document.getElementById('stats-filter-asset').value = 'all';
    document.getElementById('stats-filter-session').value = 'all';
    document.getElementById('stats-filter-direction').value = 'all';
    document.getElementById('stats-filter-type').value = 'all';
    applyStatsFilters();
}

// ---------- SUMMARY LINE ---------- //
function updateStatsSummary(trades) {
    const n = trades.length;
    const wins = trades.filter(t => (t.returnR || 0) > 0).length;
    const wr = n > 0 ? Math.round((wins / n) * 100) : 0;
    const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    document.getElementById('stats-summary-count').textContent = `${n} trade(s)`;

    const pnlEl = document.getElementById('stats-summary-pnl');
    pnlEl.textContent = `${pnl >= 0 ? '+' : '-'}${cs}${Math.abs(pnl).toFixed(2)}`;
    pnlEl.style.color = pnl >= 0 ? '#00e676' : '#ff5252';

    document.getElementById('stats-summary-wr').textContent = `${wr}%`;
}

// ---------- KPI CARDS ---------- //
function updateStatsKPIs(trades) {
    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';
    const n = trades.length;
    const wins = trades.filter(t => (t.returnR || 0) > 0);
    const losses = trades.filter(t => (t.returnR || 0) < 0);
    const wr = n > 0 ? Math.round((wins.length / n) * 100) : 0;
    const totalR = trades.reduce((s, t) => s + (t.returnR || 0), 0);
    const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const expectancy = n > 0 ? totalR / n : 0;

    const grossProfit = wins.reduce((s, t) => s + Math.abs(t.pnl || 0), 0);
    const grossLoss = losses.reduce((s, t) => s + Math.abs(t.pnl || 0), 0);
    const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    let peak = 0, cumR = 0, maxDD = 0;
    trades.forEach(t => {
        cumR += (t.returnR || 0);
        if (cumR > peak) peak = cumR;
        const dd = peak - cumR;
        if (dd > maxDD) maxDD = dd;
    });

    setKPI('kpi-val-reliability', `${wr}%`, wr >= 50 ? 'positive' : n > 0 ? 'negative' : '');
    document.getElementById('kpi-sub-reliability').textContent = `${n} trades`;

    setKPI('kpi-val-return-r', `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, totalR >= 0 ? 'positive' : 'negative');
    setKPI('kpi-val-expectancy', `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`, expectancy >= 0 ? 'positive' : 'negative');
    setKPI('kpi-val-drawdown', `-${maxDD.toFixed(2)}R`, maxDD > 0 ? 'negative' : '');
    setKPI('kpi-val-profit-net', `${pnl >= 0 ? '+' : '-'}${cs}${Math.abs(pnl).toFixed(2)}`, pnl >= 0 ? 'positive' : 'negative');
    setKPI('kpi-val-profit-factor', pf >= 999 ? '∞' : pf.toFixed(2), pf >= 1.5 ? 'positive' : pf > 0 ? 'negative' : '');
}

function setKPI(id, text, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'kpi-value' + (cls ? ` ${cls}` : '');
}

// ---------- GAUGES ---------- //
function updateGauges(trades) {
    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';
    const n = trades.length;
    const wins = trades.filter(t => (t.returnR || 0) > 0);
    const losses = trades.filter(t => (t.returnR || 0) < 0);
    const wr = n > 0 ? (wins.length / n) * 100 : 0;

    // Win Rate Ring
    const circumference = 314.16;
    const offset = circumference - (circumference * wr / 100);
    const fillEl = document.getElementById('gauge-winrate-fill');
    if (fillEl) {
        fillEl.style.strokeDashoffset = offset;
        fillEl.style.stroke = wr >= 50 ? '#00e676' : '#ff5252';
    }
    document.getElementById('gauge-winrate-val').textContent = `${Math.round(wr)}%`;
    document.getElementById('gauge-wins-count').textContent = wins.length;
    document.getElementById('gauge-losses-count').textContent = losses.length;

    // Profit / Loss Bars
    const grossProfit = wins.reduce((s, t) => s + Math.abs(t.pnl || 0), 0);
    const grossLoss = losses.reduce((s, t) => s + Math.abs(t.pnl || 0), 0);
    const maxPL = Math.max(grossProfit, grossLoss, 1);
    const net = grossProfit - grossLoss;

    document.getElementById('gauge-profit-bar').style.width = `${(grossProfit / maxPL) * 100}%`;
    document.getElementById('gauge-loss-bar').style.width = `${(grossLoss / maxPL) * 100}%`;
    document.getElementById('gauge-profit-val').textContent = `${cs}${grossProfit.toFixed(0)}`;
    document.getElementById('gauge-loss-val').textContent = `${cs}${grossLoss.toFixed(0)}`;

    const netEl = document.getElementById('gauge-net-val');
    netEl.textContent = `${net >= 0 ? '+' : '-'}${cs}${Math.abs(net).toFixed(2)}`;
    netEl.style.color = net >= 0 ? '#00e676' : '#ff5252';

    // Sharpe Ratio
    const returns = trades.map(t => t.returnR || 0);
    const meanR = returns.length > 0 ? returns.reduce((s, v) => s + v, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((s, v) => s + Math.pow(v - meanR, 2), 0) / (returns.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? meanR / stdDev : 0;

    document.getElementById('sharpe-value').textContent = sharpe.toFixed(2);
    document.getElementById('sharpe-value').style.color =
        sharpe >= 2 ? '#0984E3' : sharpe >= 1 ? '#00e676' : sharpe >= 0.5 ? '#FDCB6E' : '#ff5252';

    const ratingLabels = sharpe >= 2 ? 'Excellent' : sharpe >= 1 ? 'Bon' : sharpe >= 0.5 ? 'Moyen' : 'Faible';
    document.getElementById('sharpe-rating').textContent = ratingLabels;

    const pct = Math.min(Math.max(sharpe / 3 * 100, 0), 100);
    document.getElementById('sharpe-marker').style.left = `${pct}%`;
}

// ---------- PORTFOLIO CHART ---------- //
function renderPortfolioChart(trades) {
    const ctx = document.getElementById('analyticsPortfolioChart');
    if (!ctx) return;

    if (statsState.charts.portfolio) {
        statsState.charts.portfolio.destroy();
        statsState.charts.portfolio = null;
    }

    if (trades.length === 0) {
        showStatsChartEmpty(ctx);
        return;
    }
    clearStatsChartEmpty(ctx);

    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';
    const accFilter = document.getElementById('stats-filter-account').value;
    let startCap = 0;
    if (accFilter === 'all') {
        startCap = state.accounts.reduce((s, a) => s + (a.initialCapital || 0), 0);
    } else {
        const acc = state.accounts.find(a => a.id === accFilter);
        startCap = acc ? acc.initialCapital || 0 : 0;
    }

    const labels = ['Start'];
    const dataLine = [startCap];
    const dataBars = [0];
    let cum = startCap;

    trades.forEach(t => {
        const d = new Date(t.date);
        labels.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
        cum += (t.pnl || 0);
        dataLine.push(parseFloat(cum.toFixed(2)));
        dataBars.push(parseFloat((t.pnl || 0).toFixed(2)));
    });

    const barColors = dataBars.map(v => v >= 0 ? 'rgba(0,230,118,0.5)' : 'rgba(255,82,82,0.5)');
    const barBorders = dataBars.map(v => v >= 0 ? '#00e676' : '#ff5252');
    const isUp = dataLine[dataLine.length - 1] >= dataLine[0];

    statsState.charts.portfolio = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Capital',
                    data: dataLine,
                    borderColor: isUp ? '#00e676' : '#ff5252',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: trades.length > 30 ? 0 : 3,
                    pointBackgroundColor: isUp ? '#00e676' : '#ff5252',
                    yAxisID: 'y',
                    order: 1
                },
                {
                    type: 'bar',
                    label: 'PnL',
                    data: dataBars,
                    backgroundColor: barColors,
                    borderColor: barBorders,
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y1',
                    maxBarThickness: 16,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1A1A3E',
                    borderColor: 'rgba(108,92,231,0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, maxTicksLimit: 12 }
                },
                y: {
                    position: 'left',
                    grid: { color: 'rgba(108,92,231,0.06)' },
                    ticks: {
                        font: { size: 11 },
                        callback: v => `${cs}${v}`
                    }
                },
                y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { size: 10 },
                        callback: v => `${cs}${v}`
                    }
                }
            }
        }
    });
}

function showStatsChartEmpty(canvas) {
    canvas.style.display = 'none';
    const w = canvas.parentElement;
    if (w.querySelector('.stats-chart-empty-msg')) return;
    const d = document.createElement('div');
    d.className = 'evo-chart-empty stats-chart-empty-msg';
    d.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <span>Aucune donnée pour ces filtres</span>`;
    w.appendChild(d);
}

function clearStatsChartEmpty(canvas) {
    canvas.style.display = '';
    const e = canvas.parentElement.querySelector('.stats-chart-empty-msg');
    if (e) e.remove();
}

// ---------- PERFORMANCE TABLES ---------- //
function renderPerfTables(trades) {
    renderPerfTable(trades, 'asset', t => t.asset, 'perf-tbody-asset');
    renderPerfTable(trades, 'session', t => t.session, 'perf-tbody-session');
    renderPerfTable(trades, 'direction', t => t.direction, 'perf-tbody-direction');
    renderPerfTable(trades, 'tradeType', t => t.tradeType, 'perf-tbody-tradetype');
    renderPerfTable(trades, 'model', t => t.model, 'perf-tbody-model');
    renderPerfTable(trades, 'structure', t => t.structure, 'perf-tbody-structure');
}

function renderPerfTable(trades, field, accessor, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';
    const groups = {};

    trades.forEach(t => {
        const key = accessor(t);
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
    });

    const entries = Object.entries(groups).sort((a, b) => {
        const ra = a[1].reduce((s, t) => s + (t.returnR || 0), 0);
        const rb = b[1].reduce((s, t) => s + (t.returnR || 0), 0);
        return rb - ra;
    });

    if (entries.length === 0) {
        tbody.innerHTML = '<tr class="stats-row-empty"><td colspan="5">Aucune donnée</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    entries.forEach(([name, arr]) => {
        const n = arr.length;
        const wins = arr.filter(t => (t.returnR || 0) > 0).length;
        const wr = Math.round((wins / n) * 100);
        const pnl = arr.reduce((s, t) => s + (t.pnl || 0), 0);
        const totalR = arr.reduce((s, t) => s + (t.returnR || 0), 0);

        const pnlClass = pnl >= 0 ? 'stats-cell-pos' : 'stats-cell-neg';
        const rClass = totalR >= 0 ? 'stats-cell-pos' : 'stats-cell-neg';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHTML(name)}</td>
            <td>${n}</td>
            <td>${wr}%</td>
            <td class="${pnlClass}">${pnl >= 0 ? '+' : ''}${cs}${Math.abs(pnl).toFixed(0)}</td>
            <td class="${rClass}">${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R</td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------- CALENDAR ---------- //
function changeCalMonth(delta) {
    statsState.calMonth += delta;
    if (statsState.calMonth > 11) { statsState.calMonth = 0; statsState.calYear++; }
    if (statsState.calMonth < 0) { statsState.calMonth = 11; statsState.calYear--; }
    renderCalendar(getStatsFilteredTrades());
}

function renderCalendar(trades) {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    const m = statsState.calMonth;
    const y = statsState.calYear;

    document.getElementById('cal-month-title').textContent = `${monthNames[m]} ${y}`;

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    // Daily PnL map
    const dailyPnl = {};
    trades.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === m && d.getFullYear() === y) {
            const key = d.getDate();
            dailyPnl[key] = (dailyPnl[key] || 0) + (t.pnl || 0);
        }
    });

    const firstDay = new Date(y, m, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // Monday=0

    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getMonth() === m && today.getFullYear() === y;

    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day empty';
        grid.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const pnl = dailyPnl[d] || 0;
        let cls = 'cal-day';
        if (pnl > 0) cls += ' positive';
        else if (pnl < 0) cls += ' negative';
        if (isCurrentMonth && d === today.getDate()) cls += ' today';

        cell.className = cls;
        cell.innerHTML = `
            <span class="cal-day-number">${d}</span>
            ${pnl !== 0 ? `<span class="cal-day-pnl">${pnl > 0 ? '+' : ''}${cs}${Math.abs(pnl).toFixed(0)}</span>` : ''}
        `;
        grid.appendChild(cell);
    }
}

// ---------- ANNUAL TABLE ---------- //
function changeAnnualYear(delta) {
    statsState.annualYear += delta;
    document.getElementById('annual-year-label').textContent = statsState.annualYear;
    renderAnnualTable();
}

function renderAnnualTable() {
    const y = statsState.annualYear;
    const allTrades = getStatsFilteredTrades();
    const cs = state.accounts.length > 0 ? getCurrencySymbol(state.accounts[0].currency) : '$';

    let yearPnl = 0;
    let yearTrades = 0;
    let yearWins = 0;

    for (let m = 0; m < 12; m++) {
        const monthTrades = allTrades.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === y && d.getMonth() === m;
        });

        const mPnl = monthTrades.reduce((s, t) => s + (t.pnl || 0), 0);
        const mTotal = monthTrades.length;
        const mWins = monthTrades.filter(t => (t.returnR || 0) > 0).length;
        const mWr = mTotal > 0 ? Math.round((mWins / mTotal) * 100) : 0;

        yearPnl += mPnl;
        yearTrades += mTotal;
        yearWins += mWins;

        const pnlCell = document.getElementById(`annual-pnl-${m}`);
        const statCell = document.getElementById(`annual-stat-${m}`);

        if (mTotal === 0) {
            pnlCell.textContent = '—';
            pnlCell.className = '';
            statCell.textContent = '—';
            statCell.className = '';
        } else {
            pnlCell.textContent = `${mPnl >= 0 ? '+' : '-'}${cs}${Math.abs(mPnl).toFixed(0)}`;
            pnlCell.className = mPnl >= 0 ? 'stats-cell-pos' : 'stats-cell-neg';
            statCell.textContent = `${mTotal} / ${mWr}%`;
            statCell.className = '';
        }
    }

    const yrWr = yearTrades > 0 ? Math.round((yearWins / yearTrades) * 100) : 0;

    const totalPnl = document.getElementById('annual-pnl-total');
    totalPnl.textContent = yearTrades > 0 ? `${yearPnl >= 0 ? '+' : '-'}${cs}${Math.abs(yearPnl).toFixed(0)}` : '—';
    totalPnl.className = 'annual-total-cell' + (yearPnl >= 0 ? ' stats-cell-pos' : ' stats-cell-neg');

    const totalStat = document.getElementById('annual-stat-total');
    totalStat.textContent = yearTrades > 0 ? `${yearTrades} / ${yrWr}%` : '—';
    totalStat.className = 'annual-total-cell';
}


// ============================================== //
// CALENDRIER + BILAN MENSUEL — Fonctions mises   //
// à jour avec couleurs conditionnelles.          //
// Remplacez renderCalendar() et renderAnnualTable() //
// dans app.js                                    //
// ============================================== //

/**
 * Utilitaire : retourne la classe CSS de couleur
 * selon la valeur du PnL.
 */
function getPnlClass(value) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'be';
}

/**
 * CALENDRIER MENSUEL
 * - Cases compactes (hauteur gérée par CSS)
 * - Classes positive / negative / be sur chaque jour
 */
function renderCalendar(trades) {
    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril',
        'Mai', 'Juin', 'Juillet', 'Août',
        'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const m = statsState.calMonth;
    const y = statsState.calYear;

    document.getElementById('cal-month-title').textContent = `${monthNames[m]} ${y}`;

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    // Agréger le PnL par jour du mois
    const dailyPnl = {};
    trades.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === m && d.getFullYear() === y) {
            const day = d.getDate();
            dailyPnl[day] = (dailyPnl[day] || 0) + (t.pnl || 0);
        }
    });

    const firstDay = new Date(y, m, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // Lundi = 0

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getMonth() === m && today.getFullYear() === y;
    const cs = state.accounts.length > 0
        ? getCurrencySymbol(state.accounts[0].currency)
        : '$';

    // Cellules vides avant le 1er jour
    for (let i = 0; i < startDow; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day empty';
        grid.appendChild(cell);
    }

    // Jours du mois
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const pnl = dailyPnl[d];
        const hasTrades = pnl !== undefined;
        const pnlValue = hasTrades ? pnl : 0;

        let cls = 'cal-day';

        if (hasTrades) {
            cls += ` ${getPnlClass(pnlValue)}`;
        }

        if (isCurrentMonth && d === today.getDate()) {
            cls += ' today';
        }

        cell.className = cls;

        let pnlHTML = '';
        if (hasTrades) {
            const sign = pnlValue > 0 ? '+' : '';
            const formatted = Math.abs(pnlValue) >= 1000
                ? `${sign}${cs}${(pnlValue / 1000).toFixed(1)}k`
                : `${sign}${cs}${Math.abs(pnlValue).toFixed(0)}`;
            pnlHTML = `<span class="cal-day-pnl">${formatted}</span>`;
        }

        cell.innerHTML = `<span class="cal-day-number">${d}</span>${pnlHTML}`;
        grid.appendChild(cell);
    }
}

/**
 * BILAN MENSUEL & ANNUEL
 * - Classes positive / negative / be sur chaque cellule
 * - Coloration du total annuel
 */
function renderAnnualTable() {
    const y = statsState.annualYear;
    const allTrades = getStatsFilteredTrades();
    const cs = state.accounts.length > 0
        ? getCurrencySymbol(state.accounts[0].currency)
        : '$';

    let yearPnl = 0;
    let yearTrades = 0;
    let yearWins = 0;

    for (let m = 0; m < 12; m++) {
        const monthTrades = allTrades.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === y && d.getMonth() === m;
        });

        const mPnl = monthTrades.reduce((s, t) => s + (t.pnl || 0), 0);
        const mTotal = monthTrades.length;
        const mWins = monthTrades.filter(t => (t.returnR || 0) > 0).length;
        const mWr = mTotal > 0 ? Math.round((mWins / mTotal) * 100) : 0;

        yearPnl += mPnl;
        yearTrades += mTotal;
        yearWins += mWins;

        // --- Cellule PnL ---
        const pnlCell = document.getElementById(`annual-pnl-${m}`);
        if (mTotal === 0) {
            pnlCell.textContent = '—';
            pnlCell.className = '';
        } else {
            const sign = mPnl > 0 ? '+' : '';
            pnlCell.textContent = `${sign}${cs}${Math.abs(mPnl).toFixed(0)}`;
            pnlCell.className = getPnlClass(mPnl);
        }

        // --- Cellule Trades / Win% ---
        const statCell = document.getElementById(`annual-stat-${m}`);
        if (mTotal === 0) {
            statCell.textContent = '—';
            statCell.className = '';
        } else {
            statCell.textContent = `${mTotal} / ${mWr}%`;
            // Couleur selon winrate
            statCell.className = mWr >= 50 ? 'positive' : mWr > 0 ? 'negative' : 'be';
        }
    }

    // --- Total Annuel PnL ---
    const totalPnlEl = document.getElementById('annual-pnl-total');
    if (yearTrades === 0) {
        totalPnlEl.textContent = '—';
        totalPnlEl.className = 'annual-total-cell';
    } else {
        const sign = yearPnl > 0 ? '+' : '';
        totalPnlEl.textContent = `${sign}${cs}${Math.abs(yearPnl).toFixed(0)}`;
        totalPnlEl.className = `annual-total-cell ${getPnlClass(yearPnl)}`;
    }

    // --- Total Annuel Stats ---
    const totalStatEl = document.getElementById('annual-stat-total');
    if (yearTrades === 0) {
        totalStatEl.textContent = '—';
        totalStatEl.className = 'annual-total-cell';
    } else {
        const yrWr = Math.round((yearWins / yearTrades) * 100);
        totalStatEl.textContent = `${yearTrades} / ${yrWr}%`;
        totalStatEl.className = `annual-total-cell ${yrWr >= 50 ? 'positive' : 'negative'}`;
    }
}

// ============================================== //
// CALENDRIER — Format référence (screenshot)     //
// Remplacez getPnlClass(), renderCalendar()      //
// et changeCalMonth() dans app.js                //
// ============================================== //

/**
 * Classe CSS selon le PnL
 */
function getPnlClass(value) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'be';
}

/**
 * Navigation mois
 */
function changeCalMonth(delta) {
    statsState.calMonth += delta;
    if (statsState.calMonth > 11) {
        statsState.calMonth = 0;
        statsState.calYear++;
    }
    if (statsState.calMonth < 0) {
        statsState.calMonth = 11;
        statsState.calYear--;
    }
    renderCalendar(getStatsFilteredTrades());
}

/**
 * Rendu calendrier — format :
 * ┌─────────────┐
 * │ 18          │  ← numéro en haut à gauche
 * │  +$400.00   │  ← PnL centré, coloré
 * │  2 trade(s) │  ← compteur de trades
 * └─────────────┘
 * Bordure verte / rouge / bleue selon le PnL
 */
function renderCalendar(trades) {
    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril',
        'Mai', 'Juin', 'Juillet', 'Août',
        'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const m = statsState.calMonth;
    const y = statsState.calYear;

    // Titre mois
    const titleEl = document.getElementById('cal-month-title');
    if (titleEl) titleEl.textContent = `${monthNames[m]} ${y}`;

    // Badge filtré
    const badge = document.getElementById('cal-filtered-badge');
    if (badge) {
        const hasFilter =
            document.getElementById('stats-filter-account').value !== 'all' ||
            document.getElementById('stats-filter-asset').value !== 'all' ||
            document.getElementById('stats-filter-session').value !== 'all' ||
            document.getElementById('stats-filter-direction').value !== 'all' ||
            document.getElementById('stats-filter-type').value !== 'all';
        badge.textContent = hasFilter ? '(filtré)' : '';
    }

    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Agrégation journalière : { day: { pnl, count } }
    const daily = {};
    trades.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === m && d.getFullYear() === y) {
            const day = d.getDate();
            if (!daily[day]) daily[day] = { pnl: 0, count: 0 };
            daily[day].pnl += (t.pnl || 0);
            daily[day].count += 1;
        }
    });

    // Résumé mensuel (toolbar droite)
    let monthPnl = 0;
    let monthTrades = 0;
    Object.values(daily).forEach(v => {
        monthPnl += v.pnl;
        monthTrades += v.count;
    });

    const cs = state.accounts.length > 0
        ? getCurrencySymbol(state.accounts[0].currency)
        : '$';

    const summaryTrades = document.getElementById('cal-summary-trades');
    const summaryPnl = document.getElementById('cal-summary-pnl');

    if (summaryTrades) {
        summaryTrades.textContent = `${monthTrades} trade(s) clôturé(s)`;
    }
    if (summaryPnl) {
        const sign = monthPnl > 0 ? '+' : monthPnl < 0 ? '-' : '';
        summaryPnl.textContent = `${sign}${cs}${Math.abs(monthPnl).toFixed(2)}`;
        summaryPnl.className = getPnlClass(monthPnl);
    }

    // Positionnement Lundi = 0
    const firstDay = new Date(y, m, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getMonth() === m && today.getFullYear() === y;

    // Cellules vides avant le 1er
    for (let i = 0; i < startDow; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day empty';
        grid.appendChild(cell);
    }

    // Jours du mois
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const info = daily[d];
        const hasTrades = !!info;

        let cls = 'cal-day';
        if (hasTrades) cls += ` ${getPnlClass(info.pnl)}`;
        if (isCurrentMonth && d === today.getDate()) cls += ' today';
        cell.className = cls;

        // Numéro du jour
        let html = `<span class="cal-day-number">${d}</span>`;

        // Contenu central si trades
        if (hasTrades) {
            const sign = info.pnl > 0 ? '+' : info.pnl < 0 ? '-' : '';
            const pnlStr = `${sign}${cs}${Math.abs(info.pnl).toFixed(2)}`;
            const countLabel = info.count <= 1
                ? `${info.count} trade`
                : `${info.count} trade(s)`;

            html += `
                <div class="cal-day-content">
                    <span class="cal-day-pnl">${pnlStr}</span>
                    <span class="cal-day-count">${countLabel}</span>
                </div>
            `;
        }

        cell.innerHTML = html;
        grid.appendChild(cell);
    }
}


// ============================================== //
// PROFIL & IDENTITÉ — Ajouts                     //
// ============================================== //

let _pendingAvatar = null;

function openEditProfileModal() {
    if (!state.currentUser) return;

    document.getElementById('edit-profile-name').value = state.currentUser.name || '';
    document.getElementById('edit-profile-email').value = state.currentUser.email || '';

    _pendingAvatar = state.currentUser.avatar || null;
    refreshAvatarUploadPreview();

    document.getElementById('edit-profile-message').textContent = '';
    document.getElementById('edit-profile-message').className = 'form-message';
    document.getElementById('edit-profile-modal').classList.add('active');
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.remove('active');
    _pendingAvatar = null;
}

function handleAvatarFile(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('Image trop volumineuse (max 2 Mo).', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
        _pendingAvatar = ev.target.result;
        refreshAvatarUploadPreview();
    };
    reader.readAsDataURL(file);
}

function removeAvatar() {
    _pendingAvatar = null;
    document.getElementById('avatar-file-input').value = '';
    refreshAvatarUploadPreview();
}

function refreshAvatarUploadPreview() {
    const preview = document.getElementById('avatar-upload-preview');
    const initialsEl = document.getElementById('avatar-upload-initials');
    const removeBtn = document.getElementById('avatar-remove-btn');

    const initials = (document.getElementById('edit-profile-name').value ||
                      state.currentUser?.name || 'U')
                      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    initialsEl.textContent = initials;

    if (_pendingAvatar) {
        preview.style.backgroundImage = `url("${_pendingAvatar}")`;
        preview.classList.add('has-photo');
        removeBtn.style.display = '';
    } else {
        preview.style.backgroundImage = '';
        preview.classList.remove('has-photo');
        removeBtn.style.display = 'none';
    }
}

function handleEditProfile(e) {
    e.preventDefault();
    const newName = document.getElementById('edit-profile-name').value.trim();
    const newEmail = document.getElementById('edit-profile-email').value.trim();
    const msgEl = document.getElementById('edit-profile-message');

    if (!newName || !newEmail) {
        msgEl.textContent = 'Tous les champs sont obligatoires.';
        msgEl.className = 'form-message error';
        return;
    }

    const users = JSON.parse(localStorage.getItem('yjournal_users') || '[]');
    const oldEmail = state.currentUser.email;

    // Vérifier collision d'email
    if (newEmail !== oldEmail && users.some(u => u.email === newEmail)) {
        msgEl.textContent = 'Cet email est déjà utilisé.';
        msgEl.className = 'form-message error';
        return;
    }

    const idx = users.findIndex(u => u.email === oldEmail);
    if (idx !== -1) {
        users[idx].name = newName;
        users[idx].email = newEmail;
        users[idx].avatar = _pendingAvatar || null;
        localStorage.setItem('yjournal_users', JSON.stringify(users));

        // Migrer les comptes si l'email change
        if (newEmail !== oldEmail) {
            const accKey = `yjournal_accounts_${oldEmail}`;
            const accs = localStorage.getItem(accKey);
            if (accs) {
                localStorage.setItem(`yjournal_accounts_${newEmail}`, accs);
                localStorage.removeItem(accKey);
            }
        }
    }

    state.currentUser.name = newName;
    state.currentUser.email = newEmail;
    state.currentUser.avatar = _pendingAvatar || null;
    saveState();

    closeEditProfileModal();
    renderDashboard();
    applyUserAvatar();
    showToast('Profil mis à jour.', 'success');
}

/**
 * Applique la photo de profil aux avatars visibles
 */
function applyUserAvatar() {
    const url = state.currentUser?.avatar;
    const targets = [
        document.getElementById('profile-avatar'),
        document.getElementById('sidebar-avatar')
    ];

    targets.forEach(el => {
        if (!el) return;
        if (url) {
            el.style.backgroundImage = `url("${url}")`;
            el.classList.add('has-photo');
        } else {
            el.style.backgroundImage = '';
            el.classList.remove('has-photo');
        }
    });
}

// Hook non-destructif sur renderDashboard existant
const _origRenderDashboard = typeof renderDashboard === 'function' ? renderDashboard : null;
if (_origRenderDashboard) {
    renderDashboard = function () {
        _origRenderDashboard.apply(this, arguments);
        applyUserAvatar();
    };
}
// ============================================== //
// SUPPRESSION D'UN TRADE INDIVIDUEL              //
// ============================================== //

/**
 * Affiche/masque le bouton Supprimer selon le mode
 */
function _updateDeleteBtnVisibility() {
    const btn = document.getElementById('trade-delete-btn');
    if (btn) btn.style.display = journalState.editingTradeId ? '' : 'none';
}

/**
 * Supprime le trade en cours d'édition
 */
function deleteCurrentTrade() {
    if (!journalState.editingTradeId) return;
    if (!confirm('Supprimer définitivement ce trade ? Cette action est irréversible.')) return;

    const tradeId = journalState.editingTradeId;
    let deleted = false;

    state.accounts.forEach(acc => {
        if (!acc.trades) return;
        const before = acc.trades.length;
        acc.trades = acc.trades.filter(t => t.id !== tradeId);
        if (acc.trades.length < before) {
            deleted = true;
            // Recalculer le solde
            acc.currentBalance = acc.initialCapital +
                acc.trades.reduce((s, t) => s + (t.pnl || 0), 0);
        }
    });

    if (deleted) {
        saveAccountsToStorage();
        saveState();
        closeTradeModal();

        // Rafraîchir les vues actives
        if (typeof renderTradesTable === 'function') renderTradesTable();
        if (typeof updateJournalSummary === 'function') updateJournalSummary();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof applyEvoFilters === 'function') applyEvoFilters();
        if (typeof applyStatsFilters === 'function') applyStatsFilters();

        showToast('Trade supprimé.', 'info');
    }
}

// Hook non-destructif sur openTradeModal pour afficher le bouton
const _origOpenTradeModal = typeof openTradeModal === 'function' ? openTradeModal : null;
if (_origOpenTradeModal) {
    openTradeModal = function () {
        _origOpenTradeModal.apply(this, arguments);
        setTimeout(_updateDeleteBtnVisibility, 20);
    };
}
