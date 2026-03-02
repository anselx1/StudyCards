const API = (typeof STUDYCARDS_API_URL !== 'undefined')
    ? STUDYCARDS_API_URL
    : 'http://localhost:3001';

// If already logged in, skip to app
const token = localStorage.getItem('sc_token');
if (token) window.location.href = 'index.html';

// =============================================
// Tab switching
// =============================================
const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const formSignin = document.getElementById('form-signin');
const formSignup = document.getElementById('form-signup');
const switchText = document.getElementById('auth-switch-text');
const switchToSignup = document.getElementById('switch-to-signup');

function showSignIn() {
    tabSignin.classList.add('active');
    tabSignup.classList.remove('active');
    formSignin.classList.remove('hidden');
    formSignup.classList.add('hidden');
    switchText.innerHTML = `Don't have an account? <button class="link-btn" id="switch-to-signup">Sign up free</button>`;
    document.getElementById('switch-to-signup').addEventListener('click', showSignUp);
    clearBanner();
}

function showSignUp() {
    tabSignup.classList.add('active');
    tabSignin.classList.remove('active');
    formSignup.classList.remove('hidden');
    formSignin.classList.add('hidden');
    switchText.innerHTML = `Already have an account? <button class="link-btn" id="switch-to-signin">Sign in</button>`;
    document.getElementById('switch-to-signin').addEventListener('click', showSignIn);
    clearBanner();
}

tabSignin.addEventListener('click', showSignIn);
tabSignup.addEventListener('click', showSignUp);
switchToSignup.addEventListener('click', showSignUp);

// =============================================
// Banner helpers
// =============================================
const banner = document.getElementById('auth-banner');

function showBanner(message, type = 'error') {
    banner.textContent = message;
    banner.className = `auth-banner ${type}`;
}

function clearBanner() {
    banner.className = 'auth-banner hidden';
}

// =============================================
// Password visibility toggle
// =============================================
document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// =============================================
// Set button loading state
// =============================================
function setLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-sm"></div>';
    } else {
        btn.disabled = false;
    }
}

// =============================================
// Sign In
// =============================================
formSignin.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearBanner();
    const btn = document.getElementById('btn-signin');
    setLoading(btn, true);

    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    try {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showBanner(data.error || 'Login failed.');
            return;
        }

        localStorage.setItem('sc_token', data.token);
        localStorage.setItem('sc_user', JSON.stringify(data.user));
        window.location.href = 'index.html';

    } catch (err) {
        showBanner('Could not reach the server. Is it running?');
    } finally {
        btn.innerHTML = '<span>Sign In</span><i class="fa-solid fa-arrow-right"></i>';
        btn.disabled = false;
    }
});

// =============================================
// Sign Up
// =============================================
formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearBanner();
    const btn = document.getElementById('btn-signup');
    setLoading(btn, true);

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
        const res = await fetch(`${API}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showBanner(data.error || 'Registration failed.');
            return;
        }

        localStorage.setItem('sc_token', data.token);
        localStorage.setItem('sc_user', JSON.stringify(data.user));
        window.location.href = 'index.html';

    } catch (err) {
        showBanner('Could not reach the server. Is it running?');
    } finally {
        btn.innerHTML = '<span>Create Account</span><i class="fa-solid fa-arrow-right"></i>';
        btn.disabled = false;
    }
});
