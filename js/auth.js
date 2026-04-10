/**
 * SuperFight — Authentication Module
 * Handles local user registration and login simulated via LocalStorage.
 */

const Auth = {
  SESSION_KEY: 'superpunch_session',
  USERS_KEY: 'superpunch_users',

  init() {
    console.log('Auth System Initialized');
    this.updateUI();
  },

  /**
   * Register a new user
   */
  register(username, password) {
    if (!username || !password) return { success: false, message: 'Missing fields' };
    if (username.length < 3) return { success: false, message: 'Username too short' };
    if (password.length < 4) return { success: false, message: 'Password too short' };

    const users = this._getUsers();
    if (users[username]) return { success: false, message: 'Username already taken' };

    // Simple simulated hashing (Base64 + salt for mock purposes)
    const hashedPassword = btoa('SP_SALT_' + password);

    users[username] = {
      username,
      password: hashedPassword,
      createdAt: Date.now(),
      stats: { wins: 0, losses: 0, level: 1 }
    };

    this._saveUsers(users);
    return { success: true, message: 'Registration successful!' };
  },

  /**
   * Login a user
   */
  login(username, password) {
    const users = this._getUsers();
    const user = users[username];

    if (!user) return { success: false, message: 'Invalid credentials' };

    const hashedPassword = btoa('SP_SALT_' + password);
    if (user.password !== hashedPassword) return { success: false, message: 'Invalid credentials' };

    // Set session
    const sessionData = {
      username: user.username,
      loginTime: Date.now(),
      stats: user.stats
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    
    this.updateUI();
    return { success: true, message: 'Login successful!', user: sessionData };
  },

  /**
   * Logout the current user
   */
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    this.updateUI();
    // Redirect if on protected page
    if (window.location.pathname.includes('boxing.html')) {
        window.location.href = 'index.html';
    }
  },

  /**
   * Get current logged-in user
   */
  getUser() {
    const session = localStorage.getItem(this.SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  /**
   * Update UI elements based on auth state
   */
  updateUI() {
    const user = this.getUser();
    const loginBtn = document.getElementById('btn-auth-login');
    const playBtn = document.getElementById('btn-play');
    const navCta = document.querySelector('.nav-cta');
    const userDisplay = document.getElementById('user-display');

    if (user) {
      if (loginBtn) loginBtn.textContent = 'LOGOUT (' + user.username.toUpperCase() + ')';
      if (loginBtn) loginBtn.onclick = () => this.logout();
      if (userDisplay) {
          userDisplay.style.display = 'flex';
          userDisplay.querySelector('.user-name').textContent = user.username;
      }
      // Allow play
      document.querySelectorAll('.btn-play, .nav-cta').forEach(el => {
          el.classList.remove('disabled');
          el.title = '';
      });
    } else {
      if (loginBtn) loginBtn.textContent = 'LOGIN / REGISTER';
      if (loginBtn) loginBtn.onclick = () => window.openAuthModal();
      if (userDisplay) userDisplay.style.display = 'none';

      // Disable play buttons with tooltip
      document.querySelectorAll('.btn-play, .nav-cta').forEach(el => {
          el.href = 'javascript:void(0)';
          el.onclick = (e) => {
              e.preventDefault();
              window.openAuthModal();
          };
      });
    }
  },

  // Private helpers
  _getUsers() {
    const data = localStorage.getItem(this.USERS_KEY);
    return data ? JSON.parse(data) : {};
  },

  _saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }
};

// Global hooks for index.html
Auth.init();
window.Auth = Auth;
