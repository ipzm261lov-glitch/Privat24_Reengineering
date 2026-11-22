
const API_URL = '';

let authToken = sessionStorage.getItem('privat24_token');
let currentUser = null;
let accounts = [];
let transactions = [];
let activeAccount = null;

const $ = (selector) => document.querySelector(selector);

function formatMoney(value) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('uk-UA', {
        style: 'currency',
        currency: 'UAH',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function apiRequest(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}/api${path}`, {
        ...options,
        headers
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error('Сервер повернув некоректну відповідь.');
    }

    if (!response.ok || result.status === 'error') {
        throw new Error(
            result.message ||
            result.error ||
            'Не вдалося виконати запит.'
        );
    }

    return result.data;
}

function showMessage(element, message, type = 'error') {
    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
}

function showLogin() {
    $('#login-view').hidden = false;
    $('#app-view').hidden = true;
}

function showApplication() {
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
}

function getUserName(user) {
    return user?.firstName ||
        user?.name ||
        user?.username ||
        'Користувач';
}

function getAccountNumber(account) {
    return account.accountNumber || account.id;
}

/* Login */

async function handleLogin(event) {
    event.preventDefault();

    const username = $('#username')?.value.trim();
    const password = $('#password')?.value;

    const errorElement = $('#login-error');

    if (!username || !password) {
        showMessage(errorElement, 'Введіть логін і пароль.');
        return;
    }

    const button = $('#login-form button[type="submit"]');

    if (button) {
        button.disabled = true;
        button.textContent = 'Виконується вхід...';
    }

    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        authToken = data.token;
        sessionStorage.setItem('privat24_token', authToken);

        currentUser = data.user;

        await initializeApplication();

        $('#password').value = '';
        showMessage(errorElement, '');
    } catch (error) {
        showMessage(errorElement, error.message);
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = 'Увійти <span>→</span>';
        }
    }
}

/* Application initialization */

async function initializeApplication() {
    try {
        if (!currentUser) {
            const profile = await apiRequest('/auth/me');
            currentUser = profile.user;
        }

        showApplication();

        renderProfile();
        await loadAccounts();
        await loadTransactions();

        showSection('dashboard');
    } catch (error) {
        console.error('Application initialization:', error);

        if (
            error.message.toLowerCase().includes('token') ||
            error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('unauthenticated')
        ) {
            logout();
            return;
        }

        showMessage(
            $('#transfer-message'),
            `Не вдалося завантажити дані: ${error.message}`
        );
    }
}

function renderProfile() {
    const name = getUserName(currentUser);

    const profileName = $('#profile-name');
    const welcomeHeading = $('#welcome-heading');

    if (profileName) profileName.textContent = name;
    if (welcomeHeading) welcomeHeading.textContent = `Вітаємо, ${name}!`;
}

/* Accounts */

async function loadAccounts() {
    const data = await apiRequest('/accounts/user');

    accounts = Array.isArray(data) ? data : [];

    activeAccount = accounts.find(
        account => account.status === 'ACTIVE'
    ) || accounts[0] || null;

    renderAccounts();
    renderAccountSelects();
    renderBalance();
}

function renderBalance() {
    const balanceElement = $('#account-balance');
    const numberElement = $('#account-number');

    if (balanceElement) {
        balanceElement.textContent = formatMoney(
            activeAccount?.balance || 0
        );
    }

    if (numberElement) {
        numberElement.textContent = activeAccount
            ? getAccountNumber(activeAccount)
            : 'Рахунок відсутній';
    }
}

function createAccountCard(account) {
    const card = document.createElement('article');
    card.className = 'account-card';

    const title = document.createElement('h3');
    title.textContent = 'Банківський рахунок';

    const number = document.createElement('p');
    number.textContent = getAccountNumber(account);

    const status = document.createElement('span');
    status.className = 'status-pill';
    status.textContent = account.status || 'ACTIVE';

    const balance = document.createElement('strong');
    balance.textContent = formatMoney(account.balance);

    card.append(title, number, status, balance);

    return card;
}

function renderAccounts() {
    const dashboardContainer = $('#dashboard-accounts');
    const allAccountsContainer = $('#all-accounts');

    if (dashboardContainer) dashboardContainer.replaceChildren();
    if (allAccountsContainer) allAccountsContainer.replaceChildren();

    if (accounts.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'У вас поки немає відкритих рахунків.';

        dashboardContainer?.append(empty.cloneNode(true));
        allAccountsContainer?.append(empty);
        return;
    }

    accounts.forEach(account => {
        const card = createAccountCard(account);

        if (dashboardContainer) {
            const row = document.createElement('div');
            row.className = 'account-row';

            const info = document.createElement('div');
            info.className = 'account-info';

            const icon = document.createElement('span');
            icon.className = 'account-icon';
            icon.textContent = '₴';

            const details = document.createElement('div');

            const name = document.createElement('strong');
            name.textContent = 'Основний рахунок';

            const number = document.createElement('small');
            number.textContent = getAccountNumber(account);

            details.append(name, number);
            info.append(icon, details);

            const balance = document.createElement('strong');
            balance.textContent = formatMoney(account.balance);

            row.append(info, balance);
            dashboardContainer.append(row);
        }

        allAccountsContainer?.append(card);
    });
}

function renderAccountSelects() {
    const fromSelect = $('#from-account');
    const toField = $('#to-account');

    if (fromSelect) {
        fromSelect.replaceChildren();

        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent =
                `${getAccountNumber(account)} — ${formatMoney(account.balance)}`;

            fromSelect.append(option);
        });
    }

    /*
     * Backend очікує ID рахунку отримувача (toAccountId),
     * а не його номер. Тому замінюємо початковий select
     * на текстове поле для введення ID.
     */
    if (toField && toField.tagName === 'SELECT') {
        const input = document.createElement('input');

        input.type = 'text';
        input.id = 'to-account';
        input.placeholder = 'Введіть ID рахунку отримувача';
        input.required = true;
        input.autocomplete = 'off';

        toField.replaceWith(input);
    }
}

/* Transactions */

async function loadTransactions() {
    transactions = [];

    for (const account of accounts) {
        try {
            const data = await apiRequest(
                `/transactions/account/${encodeURIComponent(account.id)}`
            );

            if (Array.isArray(data)) {
                transactions.push(...data);
            }
        } catch (error) {
            console.error(
                `Не вдалося завантажити операції рахунку ${account.id}:`,
                error
            );
        }
    }

    transactions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    renderTransactions();
    renderStatistics();
}

function createTransactionRow(transaction) {
    const row = document.createElement('div');
    row.className = 'transaction-row';

    const info = document.createElement('div');
    info.className = 'transaction-info';

    const icon = document.createElement('span');
    icon.className = 'transaction-icon';

    const isCredit = transaction.type === 'CREDIT';
    icon.textContent = isCredit ? '↓' : '↑';

    const details = document.createElement('div');

    const title = document.createElement('strong');
    title.textContent = isCredit ? 'Зарахування' : 'Переказ';

    const date = document.createElement('small');
    date.textContent = formatDate(transaction.createdAt);

    details.append(title, date);
    info.append(icon, details);

    const amount = document.createElement('strong');
    amount.className = `transaction-amount ${isCredit ? 'credit' : 'debit'}`;
    amount.textContent =
        `${isCredit ? '+' : '−'}${formatMoney(transaction.amount)}`;

    row.append(info, amount);

    return row;
}

function renderTransactions() {
    const recentContainer = $('#recent-transactions');
    const allContainer = $('#all-transactions');

    recentContainer?.replaceChildren();
    allContainer?.replaceChildren();

    if (transactions.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Операцій поки немає.';

        recentContainer?.append(empty.cloneNode(true));
        allContainer?.append(empty);
        return;
    }

    transactions.forEach((transaction, index) => {
        const row = createTransactionRow(transaction);

        if (index < 5) {
            recentContainer?.append(row.cloneNode(true));
        }

        allContainer?.append(row);
    });
}

function renderStatistics() {
    const income = transactions
        .filter(item => item.type === 'CREDIT')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = transactions
        .filter(item => item.type === 'DEBIT')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const incomeElement = $('#income-total');
    const expenseElement = $('#expense-total');

    if (incomeElement) incomeElement.textContent = formatMoney(income);
    if (expenseElement) expenseElement.textContent = formatMoney(expenses);
}

/* Transfers */

async function handleTransfer(event) {
    event.preventDefault();

    const messageElement = $('#transfer-message');

    const fromAccountId = $('#from-account')?.value;
    const toAccountId = $('#to-account')?.value.trim();
    const amount = Number($('#transfer-amount')?.value);
    const description = $('#transfer-description')?.value.trim();

    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
        showMessage(
            messageElement,
            'Перевірте рахунки та введіть коректну суму.'
        );
        return;
    }

    if (accounts.some(account => account.id === toAccountId)) {
        showMessage(
            messageElement,
            'Оберіть рахунок іншого отримувача.'
        );
        return;
    }

    const button = $('#transfer-form button[type="submit"]');

    if (button) {
        button.disabled = true;
        button.textContent = 'Виконується переказ...';
    }

    try {
        await apiRequest('/transfers', {
            method: 'POST',
            body: JSON.stringify({
                fromAccountId,
                toAccountId,
                amount,
                description
            })
        });

        showMessage(
            messageElement,
            'Переказ успішно виконано!',
            'success'
        );

        $('#transfer-form').reset();

        await loadAccounts();
        await loadTransactions();
    } catch (error) {
        showMessage(messageElement, error.message);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Підтвердити переказ';
        }
    }
}

/* Navigation */

function showSection(sectionName) {
    const sections = [
        'dashboard',
        'accounts',
        'transfer',
        'transactions'
    ];

    if (!sections.includes(sectionName)) return;

    sections.forEach(name => {
        const section = $(`#section-${name}`);

        if (section) {
            section.hidden = name !== sectionName;
        }
    });

    document.querySelectorAll('.nav-item[data-section]').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.section === sectionName
        );
    });

    const titles = {
        dashboard: 'Огляд',
        accounts: 'Мої рахунки',
        transfer: 'Переказ коштів',
        transactions: 'Історія операцій'
    };

    const titleElement = $('#page-title');

    if (titleElement) {
        titleElement.textContent = titles[sectionName];
    }
}

/* Logout */

function logout() {
    sessionStorage.removeItem('privat24_token');

    authToken = null;
    currentUser = null;
    accounts = [];
    transactions = [];
    activeAccount = null;

    showLogin();
}

/* Subtle parallax */

function initializeParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    if (window.matchMedia('(max-width: 760px)').matches) {
        return;
    }

    const card = $('.floating-card');
    const balanceCard = $('.balance-card');

    document.addEventListener('mousemove', event => {
        const x = (event.clientX / window.innerWidth - 0.5);
        const y = (event.clientY / window.innerHeight - 0.5);

        document.querySelectorAll('.ambient-orb').forEach((orb, index) => {
            const factor = (index + 1) * 9;

            orb.style.marginLeft = `${x * factor}px`;
            orb.style.marginTop = `${y * factor}px`;
        });

        if (card && !$('#login-view').hidden) {
            card.style.transform =
                `rotateY(${-13 + x * 8}deg) rotateX(${7 - y * 7}deg)`;
        }

        if (balanceCard && !$('#app-view').hidden) {
            balanceCard.style.transform =
                `perspective(900px) rotateY(${x * 2.5}deg) rotateX(${-y * 2}deg)`;
        }
    });
}

/* Event listeners */

function initializeEventListeners() {
    $('#login-form')?.addEventListener('submit', handleLogin);
    $('#transfer-form')?.addEventListener('submit', handleTransfer);

    document.querySelectorAll('.nav-item[data-section]').forEach(button => {
        button.addEventListener('click', () => {
            showSection(button.dataset.section);
        });
    });

    document.querySelectorAll('[data-section]').forEach(button => {
        if (button.classList.contains('nav-item')) return;

        button.addEventListener('click', () => {
            showSection(button.dataset.section);
        });
    });

    $('#logout-button')?.addEventListener('click', logout);
}

/* Start */

document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    initializeParallax();

    if (authToken) {
        await initializeApplication();
    } else {
        showLogin();
    }
});
