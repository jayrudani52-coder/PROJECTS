function markSessionActive(email) {
  let activeSessions = JSON.parse(localStorage.getItem('activeSessions') || '{}');
  activeSessions[email] = Date.now();
  localStorage.setItem('activeSessions', JSON.stringify(activeSessions));
}

function unmarkSessionActive(email) {
  let activeSessions = JSON.parse(localStorage.getItem('activeSessions') || '{}');
  delete activeSessions[email];
  localStorage.setItem('activeSessions', JSON.stringify(activeSessions));
}

function isEmailActive(email) {

  let activeSessions = JSON.parse(localStorage.getItem('activeSessions') || '{}');
  if (activeSessions[email]) {
    const lastActive = activeSessions[email];
    if (Date.now() - lastActive < 60000) {
      return true;
    }
  }
  return false;
}

setInterval(() => {
  const user = sessionStorage.getItem('user');
  if (user) {
    const userData = JSON.parse(user);
    markSessionActive(userData.email);
  }
}, 30000);

window.addEventListener('beforeunload', function () {
  const user = sessionStorage.getItem('user');
  if (user) {
    const userData = JSON.parse(user);
    unmarkSessionActive(userData.email);
  }
});

const activeOtps = {};

function validateLoginFields() {
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  let isValid = true;
  let firstInvalid = null;

  if (!emailInput || !passwordInput) return false;

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  emailInput.classList.remove('is-invalid');
  passwordInput.classList.remove('is-invalid');

  if (email === 'admin@tripzy.com') return true;

  if (!email || !email.endsWith('@gmail.com')) {
    emailInput.classList.add('is-invalid');
    isValid = false;
    if (!firstInvalid) firstInvalid = emailInput;
  }
  if (!password) {
    passwordInput.classList.add('is-invalid');
    isValid = false;
    if (!firstInvalid) firstInvalid = passwordInput;
  }

  if (!isValid) {
    showToast('Please enter a valid @gmail.com and password.', 'warning');
    if (firstInvalid) firstInvalid.focus();
  }

  return isValid;
}

function updateValidationUI(input, isValid, errorMsg = '') {
  if (isValid) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
  } else {
    input.classList.remove('is-valid');
    input.classList.add('is-invalid');
    const feedback = input.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback') && errorMsg) {
      feedback.textContent = errorMsg;
    }
  }
}

function validateSignupFields() {
  const nameInput = document.getElementById('signupName');
  const emailInput = document.getElementById('signupEmail');
  const phoneInput = document.getElementById('signupPhone');
  const dobInput = document.getElementById('signupDob');
  const genderInput = document.getElementById('signupGender');
  const passwordInput = document.getElementById('signupPassword');
  const confirmPasswordInput = document.getElementById('signupConfirmPassword');

  if (!nameInput || !emailInput || !phoneInput || !dobInput || !genderInput || !passwordInput || !confirmPasswordInput) return false;

  let isValid = true;
  let firstInvalid = null;

  const showError = (input, msg) => {
    input.classList.add('is-invalid');
    const feedback = input.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
      feedback.textContent = msg;
    }
    isValid = false;
    if (!firstInvalid) firstInvalid = input;
  };

  [nameInput, emailInput, phoneInput, dobInput, genderInput, passwordInput, confirmPasswordInput].forEach(el => el.classList.remove('is-invalid'));

  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const dob = dobInput.value;
  const gender = genderInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!name) showError(nameInput, 'Full name is required.');

  if (email === 'admin@tripzy.com') {
  } else {
    if (!email || !email.endsWith('@gmail.com')) {
      showError(emailInput, 'Email must be a valid @gmail.com address.');
    } else {
      const emailPrefix = email.split('@')[0];
      if (!/\d/.test(emailPrefix)) {
        showError(emailInput, 'Email must contain at least one digit before @gmail.com.');
      } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const existingUser = users.find(user => user.email.toLowerCase() === email);
        if (existingUser) {
          showError(emailInput, 'An account with this email already exists.');
        }
      }
    }
  }

  if (email !== 'admin@tripzy.com') {
    if (!phone || !/^\d{10}$/.test(phone)) {
      showError(phoneInput, 'Mobile number must be exactly 10 digits.');
    } else if (/^(\d)\1{9}$/.test(phone)) {
      showError(phoneInput, 'Mobile number cannot consist of repeated numbers (e.g., 111...1).');
    } else if ("01234567890".includes(phone) || "9876543210".includes(phone)) {
      showError(phoneInput, 'Mobile number cannot be a simple sequence.');
    }
  }

  if (!dob) {
    showError(dobInput, 'Date of birth is required.');
  } else {
    const dobDate = new Date(dob);
    const today = new Date();
    if (dobDate > today) showError(dobInput, 'Date of birth cannot be in the future.');
  }

  if (!gender) showError(genderInput, 'Gender is required.');

  if (email !== 'admin@tripzy.com') {
    if (!password) {
      showError(passwordInput, 'Password is required.');
    } else {
      if (!/^[A-Z]/.test(password)) showError(passwordInput, 'Password must start with an uppercase letter.');
      else if (password.length <= 8) showError(passwordInput, 'Password must be greater than 8 characters.');
      else if (!/[0-9]/.test(password)) showError(passwordInput, 'Password must contain at least one digit.');
      else if (!/[!@#$%^&*(),.?":{}|<> ]/.test(password)) showError(passwordInput, 'Password must contain at least one special character.');
    }
    if (password !== confirmPassword) showError(confirmPasswordInput, 'Passwords do not match.');
  }

  if (firstInvalid) {
    firstInvalid.focus();
  }

  return isValid;
}

function handleSendOTP(type) {
  if (type === 'login') {
    if (!validateLoginFields()) return;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      updateValidationUI(document.getElementById('loginEmail'), false, 'Email is not registered yet.');
      showToast('This email is not registered yet.', 'danger');
      return;
    }
    if (user.password !== password) {
      updateValidationUI(document.getElementById('loginPassword'), false, 'Password is not matching.');
      showToast('Password is not matching.', 'danger');
      return;
    }
    updateValidationUI(document.getElementById('loginEmail'), true);
    updateValidationUI(document.getElementById('loginPassword'), true);
  } else if (type === 'signup') {
    if (!validateSignupFields()) return;
  } else if (type === 'reset') {
    const resetEmailInput = document.getElementById('resetEmail');
    if (!resetEmailInput || !resetEmailInput.value.includes('@gmail.com')) {
      showToast('Please enter a valid @gmail.com address.', 'warning');
      return;
    }
  }

  const emailInput = document.getElementById(`${type}Email`);
  if (!emailInput) return;
  const email = emailInput.value.trim();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtps[email] = otp;

  const otpSection = document.getElementById(`${type}OtpSection`);
  const submitBtn = document.getElementById(`${type}SubmitBtn`);
  const sendBtn = document.getElementById(`send${type.charAt(0).toUpperCase() + type.slice(1)}OtpBtn`);

  if (otpSection) otpSection.classList.remove('d-none');
  if (submitBtn) submitBtn.classList.remove('d-none');
  if (sendBtn) sendBtn.classList.add('d-none');

  showToast(`DEMO OTP for ${email}: ${otp}`, 'info', 15000);
  console.log(`OTP for ${email}: ${otp}`);
}

function resetOtpUI(type) {
  const otpSection = document.getElementById(`${type}OtpSection`);
  const submitBtn = document.getElementById(`${type}SubmitBtn`);
  const sendBtn = document.getElementById(`send${type.charAt(0).toUpperCase() + type.slice(1)}OtpBtn`);
  const otpInput = document.getElementById(`${type}Otp`);

  if (otpSection) otpSection.classList.add('d-none');
  if (submitBtn) submitBtn.classList.add('d-none');
  if (sendBtn) sendBtn.classList.remove('d-none');
  if (otpInput) otpInput.value = '';
}

document.addEventListener('DOMContentLoaded', function () {
  ensureAdminRegistered();
  initUsers();
  initHotels();
  initDestinations();
  initBookings();
  updateLoginUI();
  checkLoginStatus();
  setupFormListeners();
  setupNavigationGuard();
  setupBackToTop();
});

function ensureAdminRegistered() {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const adminExists = users.find(u => u.email.toLowerCase() === 'admin@tripzy.com');

  if (!adminExists) {
    const adminUser = {
      name: 'System Administrator',
      email: 'admin@tripzy.com',
      phone: '9999999999',
      dob: '1990-01-01',
      gender: 'Male',
      password: 'Admin@123',
      createdAt: new Date().toISOString()
    };
    users.push(adminUser);
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Admin account pre-registered: admin@tripzy.com / Admin@123');
  }
}

function setupBackToTop() {
  if (!document.getElementById('backToTop')) {
    const btn = document.createElement('button');
    btn.id = 'backToTop';
    btn.className = 'back-to-top';
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    btn.setAttribute('title', 'Back to Top');
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    });
  }
}

function setupFormListeners() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      login(e);
    });

    const loginInputs = loginForm.querySelectorAll('input');
    loginInputs.forEach(input => {
      input.addEventListener('input', function () {
        const val = this.value.trim().toLowerCase();
        if (this.id === 'loginEmail') {
          if (val === 'admin@tripzy.com') {
            updateValidationUI(this, true);
            return;
          }
          const isValid = val.endsWith('@gmail.com');
          updateValidationUI(this, isValid, 'Valid @gmail.com required.');
        } else if (this.id === 'loginPassword') {
          updateValidationUI(this, this.value.length > 0);
        } else {
          this.classList.remove('is-invalid');
          this.classList.remove('is-valid');
        }
      });
    });
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      signup(e);
    });

    const inputs = signupForm.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('input', function () {
        const val = this.value.trim().toLowerCase();
        if (this.id === 'signupEmail') {
          if (val === 'admin@tripzy.com') {
            updateValidationUI(this, true);
            return;
          }
          const isValid = val.endsWith('@gmail.com') && /\d/.test(val.split('@')[0]);
          updateValidationUI(this, isValid, 'Must be @gmail.com and contain a digit.');
        } else if (this.id === 'signupPhone') {
          const isValid = /^\d{10}$/.test(this.value.trim()) && !/^(\d)\1{9}$/.test(this.value.trim());
          updateValidationUI(this, isValid, '10 unique digits required.');
        } else if (this.id === 'signupPassword' || this.id === 'signupConfirmPassword') {
          const pw = document.getElementById('signupPassword').value;
          const cpw = document.getElementById('signupConfirmPassword').value;
          const isValid = pw.length > 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[!@#$%^&*]/.test(pw);
          updateValidationUI(document.getElementById('signupPassword'), isValid, 'Min 8 chars, A-Z, 0-9, special.');
          if (this.id === 'signupConfirmPassword') {
            updateValidationUI(this, pw === cpw && cpw !== '', 'Passwords do not match.');
          }
        } else {
          updateValidationUI(this, this.value.trim() !== '');
        }
      });
    });
  }

  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleResetPassword();
    });
  }
}

function handleResetPassword() {
  const email = document.getElementById('resetEmail').value.trim();
  const otpInput = document.getElementById('resetOtp').value.trim();

  if (activeOtps[email] === otpInput) {
    showToast('OTP Verified! A password reset link has been sent to your email (Demo).', 'success');
    const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
    if (modal) modal.hide();
    delete activeOtps[email];
  } else {
    showToast('Invalid OTP. Please try again.', 'danger');
  }
}

function switchHelpTab(tag) {
  const contentArea = document.getElementById('helpContentArea');
  const tabs = document.querySelectorAll('#helpTabs button');

  tabs.forEach(tab => {
    if (tab.getAttribute('onclick').includes(tag)) tab.classList.add('active');
    else tab.classList.remove('active');
  });

  let content = '';
  if (tag === 'booking') {
    content = `
      <div class="faq-content">
        <h6 class="fw-bold mb-3">Booking Help</h6>
        <div class="accordion accordion-flush" id="helpAccordion">
          <div class="accordion-item border-bottom">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed px-0" type="button" data-bs-toggle="collapse" data-bs-target="#help1">
                How do I book a destination?
              </button>
            </h2>
            <div id="help1" class="accordion-collapse collapse show" data-bs-parent="#helpAccordion">
              <div class="accordion-body px-0">
                Browse our destinations, click "Book Now", fill in the traveler details, and confirm your booking. You'll receive an invoice immediately.
              </div>
            </div>
          </div>
          <div class="accordion-item border-bottom">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed px-0" type="button" data-bs-toggle="collapse" data-bs-target="#help2">
                What documents are needed for international trips?
              </button>
            </h2>
            <div id="help2" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
              <div class="accordion-body px-0">
                International trips require a valid Passport and Visa. Our system will prompt you for these details during booking.
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } else if (tag === 'refund') {
    content = `
      <div class="faq-content">
        <h6 class="fw-bold mb-3">Refund Policy</h6>
        <div class="accordion accordion-flush" id="helpAccordion">
          <div class="accordion-item border-bottom">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed px-0" type="button" data-bs-toggle="collapse" data-bs-target="#ref1">
                What is the cancellation window?
              </button>
            </h2>
            <div id="ref1" class="accordion-collapse collapse show" data-bs-parent="#helpAccordion">
              <div class="accordion-body px-0">
                Cancellations made 15+ days before departure are eligible for an 80% refund. 7-14 days receive 50%. Less than 7 days are non-refundable.
              </div>
            </div>
          </div>
          <div class="accordion-item border-bottom">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed px-0" type="button" data-bs-toggle="collapse" data-bs-target="#ref2">
                How long does the refund take?
              </button>
            </h2>
            <div id="ref2" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
              <div class="accordion-body px-0">
                Once approved, refunds are processed within 5-7 business days to your original payment method.
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } else if (tag === 'security') {
    content = `
      <div class="faq-content">
        <h6 class="fw-bold mb-3">Account Security</h6>
        <div class="accordion accordion-flush" id="helpAccordion">
          <div class="accordion-item border-bottom">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed px-0" type="button" data-bs-toggle="collapse" data-bs-target="#sec1">
                How do I reset my password?
              </button>
            </h2>
            <div id="sec1" class="accordion-collapse collapse show" data-bs-parent="#helpAccordion">
              <div class="accordion-body px-0">
                Use the "Forgot Password" link on the login modal. Enter your email to receive a demo OTP for verification.
              </div>
            </div>
          </div>
          <div class="accordion-item border-bottom">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed px-0" type="button" data-bs-toggle="collapse" data-bs-target="#sec2">
                Is my personal data safe?
              </button>
            </h2>
            <div id="sec2" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
              <div class="accordion-body px-0">
                We use industry-standard encryption for all traveler documents (ID/Passport) and handle your data according to our Privacy Policy.
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  if (contentArea) contentArea.innerHTML = content;
}

window.switchHelpTab = switchHelpTab;

function login(event) {
  event.preventDefault();

  if (!validateLoginFields()) return false;

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  // Check if OTP was entered or if this is an OTP-based login attempt
  const enteredOtp = document.getElementById('loginOtp').value.trim();
  let isOtpLogin = false;

  // If OTP field has value, or if we have an active OTP for this email and the password field is empty (implying OTP login),
  // then we validate OTP.
  // However, simpler logic: If enteredOtp is provided, validate it.
  if (enteredOtp) {
    if (!activeOtps[email] || activeOtps[email] !== enteredOtp) {
      showToast('Invalid OTP. Please try again.', 'danger');
      const otpInput = document.getElementById('loginOtp');
      if (otpInput) {
        otpInput.classList.add('is-invalid');
        otpInput.value = '';
        otpInput.focus();
      }
      return false;
    }
    isOtpLogin = true;
  }

  const users = JSON.parse(localStorage.getItem('users') || '[]');

  // Find user
  let user;
  if (isOtpLogin) {
    // If OTP matched, we just need to find the user by email
    user = users.find(u => u.email === email);
  } else {
    // Standard password check (Admin now has a valid password in the database)
    user = users.find(u => u.email === email && u.password === password);
  }

  if (!user) {
    // If not found, show error.
    // Use different messages depending on login type?
    document.getElementById('loginEmail').classList.add('is-invalid');
    if (!isOtpLogin) document.getElementById('loginPassword').classList.add('is-invalid');

    showToast('Invalid email or password. Please try again.', 'danger');
    return false;
  }

  if (isEmailActive(email)) {
    showToast('This account is already logged in on another device or tab.', 'warning');
    return false;
  }

  const userData = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    gender: user.gender,
    role: user.email.toLowerCase() === 'admin@tripzy.com' ? 'admin' : 'user'
  };

  sessionStorage.setItem('user', JSON.stringify(userData));
  markSessionActive(email);

  if (userData.role === 'admin') {
    showToast(`Welcome back, Administrator ${user.name}! Access the Admin Panel from your profile menu.`, 'primary', 7000);
  } else {
    showToast(`Welcome back, ${user.name}!`, 'success');
  }

  if (userData.role === 'admin') {
    showToast('Admin Logged In Successfully!', 'success');
    setTimeout(() => {
      window.location.href = 'Admin.html';
    }, 1500);
  } else {
    showToast('Login Successful!', 'success');
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) loginModal.hide();
    updateLoginUI();
  }

  return true;
}

function signup(event) {
  event.preventDefault();

  if (!validateSignupFields()) return false;

  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const dob = document.getElementById('signupDob').value;
  const gender = document.getElementById('signupGender').value;
  const password = document.getElementById('signupPassword').value;

  const enteredOtp = document.getElementById('signupOtp').value.trim();
  if (!activeOtps[email] || activeOtps[email] !== enteredOtp) {
    showToast('Invalid OTP. Please try again.', 'danger');
    const otpInput = document.getElementById('signupOtp');
    if (otpInput) {
      otpInput.classList.add('is-invalid');
      otpInput.value = '';
      otpInput.focus();
    }
    return false;
  }

  const users = JSON.parse(localStorage.getItem('users') || '[]');

  const newUser = {
    name: name,
    email: email,
    phone: phone,
    dob: dob,
    gender: gender,
    password: password,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));

  const userData = {
    name: name,
    email: email,
    phone: phone,
    dob: dob,
    gender: gender,
    role: email.toLowerCase() === 'admin@tripzy.com' ? 'admin' : 'user'
  };
  sessionStorage.setItem('user', JSON.stringify(userData));
  markSessionActive(email);

  if (userData.role === 'admin') {
    showToast(`Welcome Administrator ${name}! Your account is ready. Access the Admin Panel from your profile menu.`, 'primary', 7000);
  } else {
    showToast(`Welcome ${name}! Your account has been created successfully.`, 'success');
  }

  if (typeof bootstrap !== 'undefined') {
    const modalEl = document.getElementById('signupModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
  }

  initHotels();
  updateLoginUI();

  return true;
}

function initHotels() {
  if (localStorage.getItem('hotels')) return;

  const initialHotels = [
    { id: 'HOT-1001', name: 'The Celestial Palace', location: 'Paris, France', price: 5000, image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80', description: 'Luxury palace with Eiffel View.', rating: 4.9 },
    { id: 'HOT-1002', name: 'Sapphire Ocean Villas', location: 'Noonu Atoll, Maldives', price: 7500, image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80', description: 'Overwater villas in paradise.', rating: 4.8 },
    { id: 'HOT-1003', name: 'Monarch Alpine Lodge', location: 'Zermatt, Switzerland', price: 3000, image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80', description: 'Cozy lodge with Matterhorn view.', rating: 4.7 },
    { id: 'HOT-1004', name: 'Emerald Sky Towers', location: 'Dubai, UAE', price: 1500, image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=80', description: 'Modern skyline luxury.', rating: 4.6 },
    { id: 'HOT-1005', name: 'White Pearl Sanctuary', location: 'Santorini, Greece', price: 2500, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80', description: 'Iconic white and blue vistas.', rating: 4.9 },
    { id: 'HOT-1006', name: 'Zen Imperial Garden', location: 'Kyoto, Japan', price: 3000, image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80', description: 'Traditional serenity.', rating: 4.8 },
    { id: 'HOT-1007', name: 'Royal Rajasthan Palace', location: 'Jaipur, Rajasthan', price: 4500, image: 'https://images.weserv.nl/?url=images.pexels.com/photos/3581368/pexels-photo-3581368.jpeg&w=1920&q=80', description: 'Live like royalty.', rating: 4.7 },
    { id: 'HOT-1008', name: 'Aurora Glass Igloos', location: 'Lapland, Finland', price: 8000, image: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1000&q=80', description: 'Sleep under Northern Lights.', rating: 4.9 },
    { id: 'HOT-1009', name: 'Grand Venetian Manor', location: 'Venice, Italy', price: 5500, image: 'https://images.unsplash.com/photo-1560624052-449f5ddf0c31?auto=format&fit=crop&w=1000&q=80', description: 'Canal-side historic elegance.', rating: 4.8 },
    { id: 'HOT-1010', name: 'Safari Serenity Lodge', location: 'Serengeti, Tanzania', price: 6500, image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1000&q=80', description: 'Wilderness luxury.', rating: 4.7 },
    { id: 'HOT-1011', name: 'Manhattan Sky Suites', location: 'New York, USA', price: 9500, image: 'https://images.unsplash.com/photo-1522911715181-6ce196f07c76?auto=format&fit=crop&w=1000&q=80', description: 'Heart of the city luxury.', rating: 4.8 },
    { id: 'HOT-1012', name: 'Tropical Bali Retreat', location: 'Bali, Indonesia', price: 4000, image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80', description: 'Jungle and beach bliss.', rating: 4.7 }
  ];

  localStorage.setItem('hotels', JSON.stringify(initialHotels));
}

const defaultUsers = [];

const DATA_VERSION = '6.1';

function initUsers() {
  const existingVersion = localStorage.getItem('users_version');
  const existing = localStorage.getItem('users');

  if (!existing || existing === '[]' || existingVersion !== DATA_VERSION) {
    let newList = [...defaultUsers];

    // Ensure admin exists
    const hasAdmin = newList.some(u => u.email === 'admin@tripzy.com');
    if (!hasAdmin) {
      newList.unshift({
        name: 'Admin User',
        email: 'admin@tripzy.com',
        phone: '9999999999',
        dob: '1990-01-01',
        gender: 'Other',
        password: 'Admin@123',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
    }

    localStorage.setItem('users', JSON.stringify(newList));
    localStorage.setItem('users_version', DATA_VERSION);
    console.log('Users data synchronized to version ' + DATA_VERSION);
  }
}

const defaultDestinations = [
  { id: 1, name: 'Amritsar', price: 8500, duration: 3, category: 'culture', type: 'domestic', rating: 4.8, month: 'winter', image: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=800&q=80', description: 'Visit the Golden Temple, Wagah Border, and experience the rich culture of Punjab.' },
  { id: 2, name: 'Canada', price: 120000, duration: 8, category: 'nature', type: 'international', rating: 4.2, month: 'summer', image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80', description: 'Explore the breathtaking landscapes of Canada, from the Rocky Mountains to Niagara Falls.' },
  { id: 3, name: 'France', price: 180000, duration: 10, category: 'culture', type: 'international', rating: 3.7, month: 'summer', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/532826/pexels-photo-532826.jpeg&w=1920&q=80', description: 'Discover the art, history, and cuisine of France. Visit Paris, Provence, and the Riviera.' },
  { id: 4, name: 'Taj Mahal', price: 7500, duration: 5, category: 'culture', type: 'domestic', rating: 4.8, month: 'winter', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/1603650/pexels-photo-1603650.jpeg&w=1920&q=80', description: 'Visit the iconic Taj Mahal, one of the Seven Wonders of the World in Agra.' },
  { id: 5, name: 'Switzerland', price: 210000, duration: 7, category: 'nature', type: 'international', rating: 4.9, month: 'summer', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/417074/pexels-photo-417074.jpeg&w=1920&q=80', description: 'Experience the pristine beauty of the Swiss Alps, lakes, and charming villages.' },
  { id: 6, name: 'Italy', price: 155000, duration: 6, category: 'culture', type: 'international', rating: 4.6, month: 'summer', image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80', description: 'Explore the romantic streets of Italy, world-class museums, and exquisite cuisine.' },
  { id: 7, name: 'Japan', price: 245000, duration: 10, category: 'culture', type: 'international', rating: 4.9, month: 'summer', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', description: 'Discover the unique blend of ancient traditions and modern technology in Japan.' },
  { id: 8, name: 'Maldives', price: 115000, duration: 5, category: 'beach', type: 'international', rating: 4.9, month: 'winter', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80', description: 'Relax in overwater villas, crystal clear turquoise waters, and coral reefs.' },
  { id: 9, name: 'Greece', price: 120000, duration: 8, category: 'culture', type: 'international', rating: 4.7, month: 'summer', image: 'https://images.unsplash.com/photo-1507501336603-6e31db2be093?auto=format&fit=crop&w=800&q=80', description: 'Visit ancient ruins, stunning islands like Santorini, and enjoy Mediterranean food.' },
  { id: 10, name: 'Bali', price: 72000, duration: 7, category: 'beach', type: 'international', rating: 4.8, month: 'summer', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80', description: 'Tropical paradise with beautiful beaches, temples, and vibrant culture.' },
  { id: 11, name: 'Thailand', price: 52000, duration: 7, category: 'beach', type: 'international', rating: 4.6, month: 'winter', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/457882/pexels-photo-457882.jpeg&w=1920&q=80', description: 'Siam amazing kingdom! Explore Bangkok, Phuket, and ancient Thai culture.' },
  { id: 12, name: 'Egypt', price: 96000, duration: 8, category: 'culture', type: 'international', rating: 4.5, month: 'winter', image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80', description: 'The land of Pharaohs! Visit the Great Pyramids, Sphinx, and the Nile river.' },
  { id: 13, name: 'Spain', price: 112000, duration: 7, category: 'culture', type: 'international', rating: 4.7, month: 'summer', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/672532/pexels-photo-672532.jpeg&w=1920&q=80', description: 'Vibrant culture, historic architecture, and beautiful beaches in Barcelona/Madrid.' },
  { id: 14, name: 'Dubai', price: 68000, duration: 5, category: 'adventure', type: 'international', rating: 4.8, month: 'winter', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/325191/pexels-photo-325191.jpeg&w=1920&q=80', description: 'Experience luxury, Burj Khalifa, desert safari, and world-class shopping.' },
  { id: 15, name: 'Australia', price: 320000, duration: 12, category: 'nature', type: 'international', rating: 4.8, month: 'winter', image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=800&q=80', description: 'Explore Sydney Opera House, Great Barrier Reef, and Australian wildlife.' },
  { id: 16, name: 'Singapore', price: 48000, duration: 4, category: 'adventure', type: 'international', rating: 4.7, month: 'summer', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', description: 'The Garden City! Visit Marina Bay Sands, Universal Studios, and diverse food.' },
  { id: 17, name: 'Lakshadweep', price: 50000, duration: 5, category: 'beach', type: 'domestic', rating: 4.6, month: 'winter', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/2403203/pexels-photo-2403203.jpeg&w=1920&q=80', description: 'Pristine beaches, coral reefs, and water sports in this tropical archipelago.' },
  { id: 18, name: 'Manali', price: 32000, duration: 5, category: 'nature', type: 'domestic', rating: 4.9, month: 'winter', image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80', description: 'Experience snow-capped mountains, adventure sports, and scenic beauty.' },
  { id: 19, name: 'China', price: 105000, duration: 7, category: 'culture', type: 'international', rating: 4.0, month: 'summer', image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80', description: 'Walk on the ancient Great Wall and discover the rich history of China.' },
  { id: 20, name: 'Ooty', price: 12500, duration: 4, category: 'nature', type: 'domestic', rating: 4.7, month: 'summer', image: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80', description: 'Enjoy the scenic beauty of Nilgiri mountains, tea gardens, and Ooty lake.' },
  { id: 21, name: 'Kerala', price: 28000, duration: 6, category: 'nature', type: 'domestic', rating: 4.8, month: 'winter', image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80', description: 'God\'s Own Country! Experience backwaters, tea plantations, and Ayurvedic wellness.' },
  { id: 22, name: 'Ladakh', price: 56000, duration: 8, category: 'nature', type: 'domestic', rating: 4.9, month: 'summer', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg&w=1920&q=80', description: 'The Land of High Passes! Discover monasteries, Pangong Lake, and rugged mountains.' },
  { id: 23, name: 'Jaipur', price: 11000, duration: 5, category: 'city', type: 'domestic', rating: 4.6, month: 'winter', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/3581368/pexels-photo-3581368.jpeg&w=1920&q=80', description: 'Explore the spiritual capital of India, the holy Ganges, and ancient evening rituals.' },
  { id: 24, name: 'Shimla', price: 14500, duration: 5, category: 'nature', type: 'domestic', rating: 4.8, month: 'winter', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/931018/pexels-photo-931018.jpeg&w=1920&q=80', description: 'Enjoy the Queen of Hills with its colonial charm and Kalka-Shimla toy train.' },
  { id: 25, name: 'Munnar', price: 15500, duration: 5, category: 'nature', type: 'domestic', rating: 4.7, month: 'summer', image: 'https://images.weserv.nl/?url=images.unsplash.com/photo-1530263503756-b382295fd927?auto=format&fit=crop&w=1920&q=80', description: 'Relax in the rolling hills and sprawling tea plantations of Munnar.' },
  { id: 26, name: 'New Zealand', price: 250000, duration: 10, category: 'nature', type: 'international', rating: 4.8, month: 'winter', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80', description: 'Explore the stunning natural beauty of New Zealand, from glaciers to beaches.' },
  { id: 27, name: 'USA', price: 280000, duration: 12, category: 'adventure', type: 'international', rating: 4.7, month: 'summer', image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=800&q=80', description: 'Explore the diverse attractions of the USA, from bustling cities to national parks.' },
  { id: 28, name: 'South Korea', price: 145000, duration: 8, category: 'culture', type: 'international', rating: 4.8, month: 'summer', image: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=800&q=80', description: 'Experience the unique blend of ancient palaces and ultra-modern cities in South Korea.' },
  { id: 29, name: 'Chardham Yatra', price: 15000, duration: 6, category: 'culture', type: 'domestic', rating: 4.9, month: 'summer', image: 'https://images.unsplash.com/photo-1544198365-f5d60b6d8190?auto=format&fit=crop&w=800&q=80', description: 'A spiritual journey to the four sacred shrines in the Himalayas.' },
  { id: 30, name: 'Andaman Islands', price: 42000, duration: 7, category: 'beach', type: 'domestic', rating: 4.9, month: 'winter', image: 'https://images.weserv.nl/?url=images.pexels.com/photos/2034335/pexels-photo-2034335.jpeg&w=1920&q=80', description: 'Discover pristine beaches, coral reefs, and water sports in the Andaman islands.' }
];

function initDestinations() {
  const existing = localStorage.getItem('destinations');
  if (!existing || existing === '[]' || localStorage.getItem('destinations_version') !== '2.5') {
    localStorage.setItem('destinations', JSON.stringify(defaultDestinations));
    localStorage.setItem('destinations_version', '2.5');
  }
}

const defaultBookings = [];

function initBookings() {
  const existingVersion = localStorage.getItem('bookings_version');
  const existing = localStorage.getItem('bookings');

  if (!existing || existing === '[]' || existingVersion !== DATA_VERSION) {
    localStorage.setItem('bookings', JSON.stringify(defaultBookings));
    localStorage.setItem('bookings_version', DATA_VERSION);
    console.log('Bookings data synchronized to version ' + DATA_VERSION);
  }
}

function logout() {
  const profileModalEl = document.getElementById('profileModal');
  if (profileModalEl && profileModalEl.classList.contains('show')) {
    const modal = bootstrap.Modal.getInstance(profileModalEl);
    if (modal) modal.hide();
  }

  showCustomConfirm(
    'Are you sure you want to logout?',
    (confirmed) => {
      if (confirmed) {
        const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
        unmarkSessionActive(userData.email);
        sessionStorage.removeItem('user');
        showToast('Logged out successfully.', 'info');
        updateLoginUI();
        window.location.href = 'index.html';
      }
    },
    'Logout Confirmation',
    'Yes',
    'No',
    'primary'
  );
}

function updateLoginUI() {
  const userStr = sessionStorage.getItem('user');
  const authButtons = document.getElementById('authButtons');
  const userDropdown = document.getElementById('userDropdown');
  const welcomeUser = document.getElementById('welcomeUser');
  const userAvatar = document.getElementById('userAvatar');
  const navLoginBtn = document.getElementById('loginBtn');
  const adminLink = document.getElementById('adminPanelLink');

  if (userStr) {
    let userData;
    try {
      userData = JSON.parse(userStr);
    } catch (e) {
      console.error("Failed to parse user data", e);
      return;
    }

    if (welcomeUser) welcomeUser.textContent = userData.name;
    if (userAvatar) {
      if (userAvatar.tagName === 'IMG') {
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`;
      } else {
        userAvatar.textContent = userData.name.charAt(0).toUpperCase();
      }
    }
    if (authButtons) authButtons.classList.add('d-none');
    if (navLoginBtn) navLoginBtn.classList.add('d-none');
    if (userDropdown) userDropdown.classList.remove('d-none');

    populateProfile();
    loadUserBookings();

    if (userData.role === 'admin') {
      if (adminLink) adminLink.classList.remove('d-none');


      document.querySelectorAll('.btn-book, .book-now, .btn-reserve, .btn-primary, [onclick*="bookDestination"], [onclick*="bookHotel"]')
        .forEach(btn => {
          const btnText = btn.innerText.toLowerCase();
          if (btnText.includes('book') || btnText.includes('reserve')) {
            btn.classList.add('admin-edit-btn');
            btn.innerHTML = '<i class="fas fa-edit me-1"></i> Edit';
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const card = btn.closest('.destination-card, .hotel-card, .package-card, .col-md-4, .col-lg-3');

              let id = card?.dataset.id;
              let name = '';

              if (card?.classList.contains('package-card')) {
                const onclickAttr = btn.getAttribute('onclick') || '';
                const match = onclickAttr.match(/bookDestination\(['"]([^'"]+)['"]/);
                if (match) name = match[1];
              }

              if (!id && card) {
                const title = card.querySelector('.card-title');
                if (title) name = title.innerText.trim();
              }

              const finalId = id || name || card?.querySelector('img')?.alt;
              const type = (card?.classList.contains('hotel-card') || window.location.href.includes('Hotels')) ? 'hotel' : 'destination';

              window.location.href = `Admin.html?editType=${type}&editId=${encodeURIComponent(finalId)}`;
            };
          }
        });


      document.querySelectorAll('[data-bs-target="#bookingsModal"], [data-bs-target="#likedBookingsModal"]')
        .forEach(item => {
          if (!item.id?.includes('adminPanelLink')) {
            item.parentElement.classList.add('d-none');
          }
        });


      document.querySelectorAll('.fa-heart').forEach(icon => {
        const btn = icon.closest('button');
        if (btn) btn.classList.add('d-none');
      });


      const contactForms = document.querySelectorAll('#contactForm, .reservation-form form');
      contactForms.forEach(form => {
        form.querySelectorAll('input, textarea, button, select').forEach(el => {
          el.disabled = true;
          if (el.tagName === 'BUTTON') {
            el.innerText = 'Disabled for Admins';
            el.classList.remove('btn-primary', 'btn-reserve');
            el.classList.add('btn-secondary');
          }
        });
      });
    } else {
      if (adminLink) adminLink.classList.add('d-none');

      document.querySelectorAll('[data-bs-target="#bookingsModal"], [data-bs-target="#likedBookingsModal"]')
        .forEach(item => item.parentElement.classList.remove('d-none'));
    }

    if (typeof updateHeartIcons === 'function') updateHeartIcons();
  } else {
    if (authButtons) authButtons.classList.remove('d-none');
    if (navLoginBtn) navLoginBtn.classList.remove('d-none');
    if (userDropdown) userDropdown.classList.add('d-none');
    if (adminLink) adminLink.classList.add('d-none');
  }
}

function populateProfile() {
  const user = sessionStorage.getItem('user');
  if (!user) return;
  let userData = JSON.parse(user);

  if (!userData.dob || !userData.gender) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const match = users.find(u => u.email === userData.email);
    if (match) {
      userData.dob = userData.dob || match.dob;
      userData.gender = userData.gender || match.gender;
      sessionStorage.setItem('user', JSON.stringify(userData));
    }
  }

  let formattedDob = 'Not provided';
  if (userData.dob) {
    try {
      const date = new Date(userData.dob);
      if (!isNaN(date.getTime())) {
        formattedDob = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else {
        formattedDob = userData.dob;
      }
    } catch (e) {
      formattedDob = userData.dob;
    }
  }

  const elements = {
    'profileName': userData.name,
    'profileEmail': userData.email,
    'profilePhone': userData.phone,
    'profileDob': formattedDob,
    'profileGender': userData.gender || 'Not provided'
  };

  for (const [id, value] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  const avatar = document.getElementById('profileModalAvatar');
  if (avatar) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&size=100`;

  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const userBookings = bookings.filter(b => b.email === userData.email);
  const countEl = document.getElementById('totalBookingsCount');
  if (countEl) countEl.textContent = userBookings.length;

  if (userData.role === 'admin') {
    document.querySelectorAll('#profileModal .btn').forEach(btn => {
      if (btn.innerText.toLowerCase().includes('booking')) {
        btn.classList.add('d-none');
      }
    });
    const bookingStats = document.querySelector('.fa-suitcase-rolling')?.closest('.col-6')?.parentElement;
    if (bookingStats) bookingStats.classList.add('d-none');
  }
}

function loadUserBookings(isReadOnly = false) {
  const user = sessionStorage.getItem('user');
  if (!user) return;
  const userData = JSON.parse(user);

  const bookingsList = document.getElementById('bookingsList');
  if (!bookingsList) return;

  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const userBookings = bookings.filter(b => b.email === userData.email);

  if (userBookings.length === 0) {
    bookingsList.innerHTML = '<div class="text-center py-5"><i class="fas fa-suitcase-rolling fa-3x text-muted mb-3"></i><p class="text-muted">No upcoming trips. Book your dream destination now!</p></div>';
    return;
  }

  const destinations = JSON.parse(localStorage.getItem('destinations') || '[]');

  const destinationBookings = userBookings.filter(b => b.category !== 'Hotel');
  const hotelBookings = userBookings.filter(b => b.category === 'Hotel');

  const renderCard = (b) => {
    let targetImage = b.image;
    if (!targetImage) {
      const match = destinations.find(d => d.name === b.destination);
      if (match) targetImage = match.image;
    }
    const safeImagePath = targetImage ? targetImage.replace(/\\/g, '/') : '';
    const bgImage = safeImagePath ? `style="background-image: url('${safeImagePath}'); background-size: cover; background-position: center;"` : 'style="background-color: #f8f9fa;"';

    let displayPrice = b.totalAmount;
    if (typeof displayPrice === 'number') {
      displayPrice = '₹' + Math.round(displayPrice).toLocaleString('en-IN');
    } else if (typeof displayPrice === 'string' && !displayPrice.startsWith('₹')) {
      displayPrice = '₹' + displayPrice;
    }

    const bookingDateObj = new Date(b.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = bookingDateObj - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isPast = diffDays < 0;
    const isToday = diffDays === 0;
    const canEdit = diffDays >= 5;
    const canCancel = diffDays > 0;

    const statusBadge = isPast
      ? '<span class="badge bg-secondary shadow-sm">Completed</span>'
      : (isToday ? '<span class="badge bg-warning text-dark shadow-sm">Starting Today</span>' : '<span class="badge bg-success shadow-sm">Confirmed</span>');

    let actionButtons = '';
    if (!isReadOnly && !isPast) {
      const editButton = canEdit ? `
        <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="handleEditClick('${b.bookingId}')" title="Edit Booking">
            <i class="fas fa-edit"></i>
        </button>` : `
        <button class="btn btn-sm btn-light rounded-pill border text-muted cursor-not-allowed" disabled title="Modification allowed only 5 days prior to booking">
            <i class="fas fa-edit"></i>
        </button>`;

      const cancelButton = canCancel ? `
        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteBooking('${b.bookingId}', ${b.totalAmount})" title="Cancel & Refund">
            <i class="fas fa-trash"></i>
        </button>` : `
        <button class="btn btn-sm btn-light rounded-pill border text-muted cursor-not-allowed" disabled title="Cancellation not possible on the day of trip/stay">
            <i class="fas fa-trash"></i>
        </button>`;

      actionButtons = `
        <div class="d-flex gap-2 align-items-center">
            <button class="btn btn-sm btn-primary px-3 rounded-pill" onclick='viewReceipt(${JSON.stringify(b)})'>
                <i class="fas fa-file-invoice me-1"></i> Receipt
            </button>
            ${editButton}
            ${cancelButton}
        </div>
      `;
    }

    return `
        <div class="card mb-3 border-0 shadow-sm overflow-hidden hover-shadow transition-all ${isPast ? 'opacity-75' : ''}">
            <div class="row g-0">
                <div class="col-md-4 position-relative" ${bgImage} style="min-height: 160px;">
                    <div class="position-absolute top-0 start-0 m-2">
                        ${statusBadge}
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold text-primary mb-0">${b.destination}</h5>
                            <div class="text-end">
                                <span class="badge bg-light text-dark border d-block mb-1">${b.category || 'Trip'}</span>
                                <small class="text-danger fw-bold" style="font-size: 0.65rem;">50% Refund Policy Applied</small>
                            </div>
                        </div>
                        <p class="card-text small text-muted mb-3">
                            <i class="fas fa-calendar-alt me-1 text-primary"></i> ${new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; 
                            <i class="fas fa-clock me-1 text-primary"></i> ${b.duration} ${b.category === 'Hotel' ? (b.duration == 1 ? 'Night' : 'Nights') : 'Days'} &bull; 
                            <i class="fas fa-user-friends me-1 text-primary"></i> ${b.persons} Person(s)
                        </p>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <p class="card-text fw-bold mb-0 text-dark fs-5">${displayPrice}</p>
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
  };

  let html = '';
  if (destinationBookings.length > 0) {
    html += '<h6 class="fw-bold mb-3 mt-2 text-primary border-bottom pb-2"><i class="fas fa-map-marked-alt me-2"></i>Destination Bookings</h6>';
    html += destinationBookings.map(renderCard).join('');
  }

  if (hotelBookings.length > 0) {
    html += `<h6 class="fw-bold mb-3 ${destinationBookings.length > 0 ? 'mt-4' : 'mt-2'} text-success border-bottom pb-2"><i class="fas fa-hotel me-2"></i>Hotel Bookings</h6>`;
    html += hotelBookings.map(renderCard).join('');
  }

  bookingsList.innerHTML = html;

  const modalTitle = document.querySelector('#bookingsModal .modal-title');
  if (modalTitle) {
    modalTitle.innerHTML = isReadOnly
      ? '<i class="fas fa-history me-2"></i>My Trip History'
      : '<i class="fas fa-edit me-2"></i>Manage Your Bookings';
  }
}

function deleteBooking(bookingId, totalAmount) {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const booking = bookings.find(b => b.bookingId === bookingId);

  if (!booking) {
    showToast('Booking not found!', 'danger');
    return;
  }

  const travelDate = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = travelDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    showToast('Cannot cancel a past booking.', 'warning');
    return;
  }

  const isDestination = booking.category !== 'Hotel';

  if (isDestination && diffDays <= 2) {
    showCustomConfirm(
      `Evaluation Date (Today): ${todayStr}\n` +
      `Scheduled Trip Date: ${tripDateStr}\n\n` +
      `Policy Note: Cancellation is restricted for international/domestic trips within 48 hours of travel.`,
      () => { },
      'Cancellation Restricted',
      'Understood',
      '',
      'warning'
    );
    return;
  }

  let refundPercent = 0;
  let conditionText = "";
  let refundAmount = 0;
  let refundType = "danger";

  if (diffDays >= 10) {
    refundPercent = 100;
    conditionText = "10+ days notice applied";
    refundAmount = totalAmount;
    refundType = "success";
  } else if (diffDays === 0) {
    refundPercent = 0;
    conditionText = "Same-day cancellation policy";
    refundAmount = 0;
    refundType = "danger";
  } else if (isDestination) {
    if (diffDays >= 5) {
      refundPercent = 70;
      conditionText = "5-9 days notice applied";
      refundAmount = Math.round(totalAmount * 0.7);
      refundType = "warning";
    } else {
      refundPercent = 50;
      conditionText = "2-4 days notice applied";
      refundAmount = Math.round(totalAmount * 0.5);
      refundType = "danger";
    }
  } else {

    refundPercent = 50;
    conditionText = "1-9 days notice applied";
    refundAmount = Math.round(totalAmount * 0.5);
    refundType = "danger";
  }

  policyMessage = `Evaluation Date (Today): ${todayStr}\n` +
    `Scheduled Trip Date: ${tripDateStr}\n` +
    `Condition: ${conditionText}\n\n` +
    `Refund Calculation:\n` +
    `Total Paid: ₹${Math.round(totalAmount).toLocaleString()}\n` +
    `Refund Percentage: ${refundPercent}%\n` +
    `---------------------------\n` +
    `Final Refund Amount: ₹${refundAmount.toLocaleString()}`;

  showCustomConfirm(
    `Confirm Cancellation for ${booking.destination}?\n\n${policyMessage}`,
    (confirmed) => {
      if (confirmed) {
        let updatedBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        updatedBookings = updatedBookings.filter(b => b.bookingId !== bookingId);
        localStorage.setItem('bookings', JSON.stringify(updatedBookings));

        showToast(`Booking cancelled. ₹${refundAmount.toLocaleString()} will be credited back within 3-5 days.`, 'success');
        loadUserBookings();
        populateProfile();
      }
    },
    'Cancel Trip?',
    'Yes, Cancel',
    'No, Keep It',
    refundType
  );
}

function handleEditClick(bookingId) {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const booking = bookings.find(b => b.bookingId === bookingId);

  if (!booking) {
    showToast('Booking not found!', 'danger');
    return;
  }


  const bookingDateObj = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = bookingDateObj - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 5) {
    alert("Modification restricted: Bookings can only be edited at least 5 days prior to the check-in/travel date.");
    return;
  }

  const currentPage = window.location.pathname.split('/').pop();
  const isHotel = booking.category === 'Hotel';

  if (isHotel) {
    if (currentPage.includes('Hotels_Premium.html')) {
      if (typeof window.editHotelBooking === 'function') {
        window.editHotelBooking(bookingId);
      } else if (typeof window.editBooking === 'function') {
        window.editBooking(bookingId);
      } else {
        // If function not found on page, reload with param
        window.location.href = `Hotels_Premium.html?editId=${bookingId}`;
      }
    } else {
      window.location.href = `Hotels_Premium.html?editId=${bookingId}`;
    }
  } else {
    // Destination Booking
    if (currentPage.includes('Explore1.html')) {
      if (typeof window.editBooking === 'function') {
        window.editBooking(bookingId);
      } else {
        window.location.href = `Explore1.html?editId=${bookingId}`;
      }
    } else {
      window.location.href = `Explore1.html?editId=${bookingId}`;
    }
  }
}

window.handleEditClick = handleEditClick;
window.deleteBooking = deleteBooking;
window.loadUserBookings = loadUserBookings;
window.populateProfile = populateProfile;
window.updateLoginUI = updateLoginUI;
window.checkLoginStatus = checkLoginStatus;
window.showToast = showToast;
window.handleSendOTP = handleSendOTP;
window.setupNavigationGuard = setupNavigationGuard;

function setupNavigationGuard() {
  const navLinks = document.querySelectorAll('header a.fw-bold, footer a');
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const user = sessionStorage.getItem('user');
      const targetHref = this.getAttribute('href') || '';

      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (user || targetHref === 'index.html' || targetHref === '#' || targetHref === '' || targetHref.startsWith('mailto:') || targetHref.startsWith('tel:') || targetHref.startsWith('http')) {
        return;
      }

      const protectedPages = ['index.html', 'Explore1.html', 'Hotels_Premium.html', 'Tasty_Bites.html'];
      const isProtected = protectedPages.some(page => targetHref.includes(page));

      if (isProtected) {
        e.preventDefault();

        if (currentPage !== 'index.html' && currentPage !== '') {
          showToast('Please login to access this section.', 'warning');
          window.location.href = 'index.html';
        } else {
          showToast('Please login to continue.', 'info');
          const loginModalEl = document.getElementById('loginModal');
          if (loginModalEl) {
            const loginModal = new bootstrap.Modal(loginModalEl);
            loginModal.show();
          }
        }
      }
    });
  });
}

function viewReceipt(bookingData) {
  showReceiptModal(bookingData);

  const historyModal = bootstrap.Modal.getInstance(document.getElementById('bookingsModal'));
  if (historyModal) historyModal.hide();
}

function showReceiptModal(b) {
  const container = ensureModalContainer();
  const modalId = 'receiptModal';

  let targetImage = b.image;
  if (!targetImage) {
    const destinations = JSON.parse(localStorage.getItem('destinations') || '[]');
    const match = destinations.find(d => d.name === b.destination);
    if (match) targetImage = match.image;
  }
  if (!targetImage) targetImage = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80';

  const displayImage = targetImage.replace(/\\/g, '/');

  const checkInDate = new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  const bookingTimestamp = b.timestamp || new Date().toLocaleString();

  let displayPrice = b.totalAmount;
  if (typeof displayPrice === 'number') {
    displayPrice = '₹' + Math.round(displayPrice).toLocaleString('en-IN');
  } else if (typeof displayPrice === 'string' && !displayPrice.startsWith('₹')) {
    displayPrice = '₹' + displayPrice;
  }

  const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 20px;">
                    <div class="modal-header p-0 border-0 overflow-hidden" style="border-radius: 20px 20px 0 0;">
                        <div class="w-100 position-relative" style="height: 200px; background-image: url('${displayImage}'); background-size: cover; background-position: center;">
                            <div class="position-absolute bottom-0 start-0 w-100 p-4" style="background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                                <h3 class="modal-title fw-bold text-white mb-0">${b.destination}</h3>
                                <p class="text-white-50 small mb-0"><i class="fas fa-map-marker-alt me-1"></i> ${b.location || 'Premium Destination'}</p>
                            </div>
                            <button type="button" class="btn-close btn-close-white position-absolute top-0 end-0 m-3" data-bs-dismiss="modal"></button>
                        </div>
                    </div>
                    <div class="modal-body p-0">
                        <div class="p-4" id="receiptPrintArea">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h5 class="fw-bold mb-1">Booking Receipt</h5>
                                    <p class="text-muted small mb-0"><strong>ID:</strong> ${b.bookingId}</p>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-success-soft text-success border border-success px-3 py-2 rounded-pill">Payment Successful</span>
                                </div>
                            </div>

                            <div class="row g-3 mb-4">
                                <div class="col-6">
                                    <div class="bg-light p-3 rounded h-100">
                                        <h6 class="fw-bold small text-uppercase text-muted mb-2">Customer Details</h6>
                                        <p class="mb-1 fw-bold">${b.name}</p>
                                        <p class="small text-muted mb-0">${b.email}</p>
                                        <p class="small text-muted mb-0">${b.phone}</p>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="bg-light p-3 rounded h-100">
                                        <h6 class="fw-bold small text-uppercase text-muted mb-2">Stay Details</h6>
                                        <p class="mb-1"><strong>Check-in:</strong> ${checkInDate}</p>
                                        <p class="mb-1"><strong>Duration:</strong> ${b.duration} ${b.category === 'Hotel' ? (b.duration == 1 ? 'Night' : 'Nights') : 'Days'}</p>
                                        <p class="small mb-0"><strong>Guests:</strong> ${b.persons} Person(s)</p>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-4">
                                <h6 class="fw-bold border-bottom pb-2 mb-3">Billing Summary</h6>
                                <div class="d-flex justify-content-between mb-2">
                                    <span class="text-muted">Rate Calculation</span>
                                    <span>${b.category === 'Hotel' ? `₹${b.pricePerPerson.toLocaleString()} x ${b.duration} Night(s) x ${b.persons} Guest(s)` : `₹${b.pricePerPerson.toLocaleString()} x ${b.persons} Person(s)`}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2 text-success">
                                    <span class="text-muted">Discount (10% OFF)</span>
                                    <span>-₹${(b.discount || 0).toLocaleString()}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span class="text-muted">GST (18%)</span>
                                    <span>+₹${Math.round(b.gst || 0).toLocaleString('en-IN')}</span>
                                </div>
                                ${b.category !== 'Hotel' ? `
                                <div class="d-flex justify-content-between mb-2">
                                    <span class="text-muted">Service Fee</span>
                                    <span>+₹${b.serviceCharges || 500}</span>
                                </div>
                                ` : ''}
                                <div class="d-flex justify-content-between mb-2">
                                    <span class="text-muted">${b.category === 'Hotel' ? 'Hotel Booking Charge' : 'Airport Transfer Fee'}</span>
                                    <span>+₹${(b.category === 'Hotel' ? (b.hotelCharge || 500) : (b.transferFee || 5000)).toLocaleString('en-IN')}</span>
                                </div>
                                ${b.category !== 'Hotel' ? `
                                <div class="d-flex justify-content-between mb-2 text-info">
                                    <span class="text-muted">Transfer Discount</span>
                                    <span>-₹${(b.transferDiscount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                ` : ''}
                                <div class="d-flex justify-content-between border-top pt-2 mt-2">
                                    <span class="fw-bold fs-5">Total Amount Paid</span>
                                    <span class="fw-bold fs-5 text-success">${displayPrice}</span>
                                </div>
                            </div>

                            ${b.category !== 'Hotel' ? `
                            <div class="mb-4">
                                <h6 class="fw-bold small text-uppercase text-muted mb-2">Package Inclusions</h6>
                                <div class="d-flex flex-wrap gap-2">
                                    <span class="badge bg-light text-dark border"><i class="fas fa-plane me-1 text-primary"></i> Round Trip Flights</span>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-hotel me-1 text-primary"></i> Premium Stay</span>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-utensils me-1 text-primary"></i> All Meals Included</span>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-camera me-1 text-primary"></i> Guided Tours</span>
                                </div>
                            </div>
                            ` : `
                            <div class="mb-4">
                                <h6 class="fw-bold small text-uppercase text-muted mb-2">Hotel Amenities & Inclusions</h6>
                                <div class="d-flex flex-wrap gap-2">
                                    <span class="badge bg-light text-dark border"><i class="fas fa-bed me-1 text-success"></i> Luxury Room</span>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-wifi me-1 text-success"></i> High-speed Wi-Fi</span>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-coffee me-1 text-success"></i> Complimentary Breakfast</span>
                                    <span class="badge bg-light text-dark border"><i class="fas fa-swimming-pool me-1 text-success"></i> Pool Access</span>
                                </div>
                            </div>
                            `}

                            ${b.travelers ? `
                            <div class="mb-3">
                                <h6 class="fw-bold small text-uppercase text-muted mb-2">Traveler Documentation</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm table-borderless small mb-0">
                                        <thead class="bg-light">
                                            <tr>
                                                <th class="py-2">#</th>
                                                <th class="py-2">Name</th>
                                                <th class="py-2">ID / Passport No.</th>
                                                <th class="py-2 text-center">Documentation</th>
                                                <th class="py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${b.travelers.map((t, i) => `
                                                <tr>
                                                    <td>${i + 1}</td>
                                                    <td>${t.name}</td>
                                                    <td class="font-monospace">${t.passport || t.idNumber || t.idCard || 'N/A'}${t.visa ? `<br><small class="text-muted" style="font-size: 0.7rem;">Visa: ${t.visa}</small>` : ''}</td>
                                                    <td class="text-center">
                                                      ${t.document ?
      `<img src="${t.document}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">`
      : '<span class="text-muted">-</span>'}
                                                    </td>
                                                    <td class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i> Verified</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}

                            <div class="bg-light p-3 rounded text-center">
                                <p class="small text-muted mb-0">Booked on ${bookingTimestamp}</p>
                                <p class="small text-muted mb-0">Powered by Tripzy Tours & Travels</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary rounded-pill" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success px-4 rounded-pill" onclick="downloadReceiptPDF('${b.bookingId}')">
                            <i class="fas fa-download me-2"></i>Download Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = modalHTML;
  const modalEl = document.getElementById(modalId);
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    modal.dispose();
    container.innerHTML = '';
  });
}

function downloadReceiptPDF(bookingId) {
  const element = document.getElementById('receiptPrintArea');
  if (!element) return;

  const opt = {
    margin: [0.3, 0.3],
    filename: `Tripzy_Receipt_${bookingId}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 3, useCORS: true, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save();
  } else {
    window.print();
  }
}

function showToast(message, type = 'primary', duration = 3000) {
  const toastEl = document.getElementById('welcomeToast');
  const toastMessage = document.getElementById('toastMessage');

  if (toastEl && toastMessage) {
    toastMessage.textContent = message;

    toastEl.classList.remove('bg-primary', 'bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'bg-soft-primary');
    toastEl.classList.add(`bg-${type}`);

    if (typeof bootstrap !== 'undefined') {
      const toast = new bootstrap.Toast(toastEl, { delay: duration });
      toast.show();
    }
  }
}

function checkLoginStatus() {
  const user = sessionStorage.getItem('user');
  if (!user) {
    const p = window.location.pathname;
    if (p.includes('Explore1.html') || p.includes('Hotels_Premium.html') || p.includes('Tasty_Bites.html')) {
      showToast('Please login to access this session.', 'warning');
      window.location.href = 'index.html';
      return false;
    }
    return false;
  }
  return true;
}

function bookTrip() {
  const user = sessionStorage.getItem('user');
  if (!user) {
    sessionStorage.setItem('pendingBooking', 'true');

    if (document.getElementById('signupForm')) {
      document.getElementById('signupForm').reset();
    }
    if (document.getElementById('loginForm')) {
      document.getElementById('loginForm').reset();
    }

    const loginModalEl = document.getElementById('loginModal');
    if (loginModalEl && typeof bootstrap !== 'undefined') {
      const loginModal = new bootstrap.Modal(loginModalEl);
      loginModal.show();
    }
    return;
  }
  window.location.href = 'Explore1.html';
}

window.bookTrip = bookTrip;
window.logout = logout;
window.loadUserBookings = loadUserBookings;
window.populateProfile = populateProfile;
window.updateLoginUI = updateLoginUI;
window.checkLoginStatus = checkLoginStatus;
window.showToast = showToast;
window.handleSendOTP = handleSendOTP;

function ensureModalContainer() {
  let container = document.getElementById('customModalContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'customModalContainer';
    document.body.appendChild(container);
  }
  return container;
}
window.ensureModalContainer = ensureModalContainer;

function showCustomAlert(message, type = 'info', title = null) {
  const container = ensureModalContainer();
  const modalId = 'customAlertModal';

  if (!title) {
    if (type === 'danger') title = 'Error';
    else if (type === 'success') title = 'Success';
    else if (type === 'warning') title = 'Warning';
    else title = 'Information';
  }

  const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-${type} text-white">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 text-center">
                        <div class="mb-3">
                            ${getIconForType(type)}
                        </div>
                        <p class="fs-5 mb-0">${message}</p>
                    </div>
                    <div class="modal-footer justify-content-center border-0">
                        <button type="button" class="btn btn-${type} px-4 rounded-pill" data-bs-dismiss="modal">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = modalHTML;

  const modalEl = document.getElementById(modalId);
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    modal.dispose();
    container.innerHTML = '';
  });
}

function showCustomConfirm(message, callback, title = 'Confirmation', confirmText = 'Yes', cancelText = 'No', type = 'primary') {
  const container = ensureModalContainer();
  const modalId = 'customConfirmModal';

  const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-${type} text-white">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 text-center">
                        <div class="mb-3">
                            ${getIconForType(type)}
                        </div>
                        <p class="fs-5 mb-0" style="white-space: pre-line;">${message}</p>
                    </div>
                    <div class="modal-footer justify-content-center border-0">
                        <button type="button" class="btn btn-outline-secondary px-4 rounded-pill me-2" data-bs-dismiss="modal">${cancelText}</button>
                        <button type="button" class="btn btn-${type} px-4 rounded-pill" id="${modalId}ConfirmBtn">${confirmText}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = modalHTML;

  const modalEl = document.getElementById(modalId);
  const modal = new bootstrap.Modal(modalEl);

  const confirmBtn = document.getElementById(`${modalId}ConfirmBtn`);
  confirmBtn.onclick = () => {
    modal.hide();
    if (callback) callback(true);
  };

  modalEl.addEventListener('hidden.bs.modal', () => {
    modal.dispose();
    container.innerHTML = '';
  });

  modal.show();
}

function getIconForType(type) {
  if (type === 'success') return '<i class="fas fa-check-circle fa-4x text-success"></i>';
  if (type === 'danger') return '<i class="fas fa-times-circle fa-4x text-danger"></i>';
  if (type === 'warning') return '<i class="fas fa-exclamation-triangle fa-4x text-warning"></i>';
  return '<i class="fas fa-info-circle fa-4x text-info"></i>';
}

window.showCustomAlert = showCustomAlert;
window.showCustomConfirm = showCustomConfirm;
window.loadBookings = loadUserBookings;

function deleteBooking(bookingId, totalAmount) {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const booking = bookings.find(b => b.bookingId === bookingId);

  if (!booking) {
    showToast('Booking not found.', 'danger');
    return;
  }

  const bookingDateObj = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = bookingDateObj - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let refundPercentage = 0;
  let policyText = "";

  if (diffDays >= 10) {
    refundPercentage = 100;
    policyText = "More than 10 days before trip (100% Refund)";
  } else if (diffDays >= 7) {
    refundPercentage = 70;
    policyText = "7-10 days before trip (70% Refund)";
  } else if (diffDays >= 3) {
    refundPercentage = 50;
    policyText = "3-6 days before trip (50% Refund)";
  } else {
    refundPercentage = 0;
    policyText = "Less than 48-72 hours before trip (No Refund)";
  }

  const refundAmount = (totalAmount * refundPercentage) / 100;

  showCustomConfirm(
    `Cancellation Policy: ${policyText}\n\nrefund Amount: ₹${refundAmount.toLocaleString('en-IN')}\n\nAre you sure you want to cancel?`,
    (confirmed) => {
      if (confirmed) {
        const updatedBookings = bookings.filter(b => b.bookingId !== bookingId);
        localStorage.setItem('bookings', JSON.stringify(updatedBookings));

        showToast(`Booking cancelled. Refund of ₹${refundAmount.toLocaleString('en-IN')} initiated.`, 'success');
        loadUserBookings();
      }
    },
    'Cancel Booking',
    'Yes, Cancel',
    'No, Keep it',
    'danger'
  );
}


function toggleLike(destId) {
  const user = sessionStorage.getItem('user');
  if (!user) {
    showToast('Please login to like destinations.', 'warning');
    const loginModalEl = document.getElementById('loginModal');
    if (loginModalEl) {
      new bootstrap.Modal(loginModalEl).show();
    }
    return;
  }

  const userData = JSON.parse(user);
  const email = userData.email;
  let likedData = JSON.parse(localStorage.getItem('likedDestinations') || '{}');

  if (!likedData[email]) {
    likedData[email] = [];
  }

  const index = likedData[email].indexOf(destId);
  if (index === -1) {
    likedData[email].push(destId);
    showToast('Added to Liked Bookings!', 'success');
  } else {
    likedData[email].splice(index, 1);
    showToast('Removed from Liked Bookings.', 'info');
  }

  localStorage.setItem('likedDestinations', JSON.stringify(likedData));

  const destCards = document.querySelectorAll(`.destination-card[data-id="${destId}"], .package-card[data-id="${destId}"]`);
  destCards.forEach(card => {
    const heartIcon = card.querySelector('.fa-heart');
    if (heartIcon) {
      if (index === -1) {
        heartIcon.className = 'fas fa-heart fs-5 text-danger';
      } else {
        heartIcon.className = 'far fa-heart fs-5';
      }
    }
  });

  if (document.getElementById('likedBookingsModal')?.classList.contains('show')) {
    loadLikedBookings();
  }
}

function updateHeartIcons() {
  const userStr = sessionStorage.getItem('user');
  const isAdmin = userStr && JSON.parse(userStr).role === 'admin';

  document.querySelectorAll('.package-card, .destination-card').forEach(card => {
    const heartBtn = card.querySelector('.fa-heart')?.closest('button');
    if (heartBtn) {
      if (isAdmin) {
        heartBtn.classList.add('d-none');
      } else {
        heartBtn.classList.remove('d-none');
        const destId = parseInt(card.dataset.id);
        if (!isNaN(destId)) {
          const heartIcon = card.querySelector('.fa-heart');
          if (heartIcon) {
            if (typeof isLiked === 'function' && isLiked(destId)) {
              heartIcon.className = 'fas fa-heart fs-5 text-danger';
            } else {
              heartIcon.className = 'far fa-heart fs-5';
            }
          }
        }
      }
    }
  });
}

function isLiked(destId) {
  const user = sessionStorage.getItem('user');
  if (!user) return false;

  const userData = JSON.parse(user);
  const email = userData.email;
  const likedData = JSON.parse(localStorage.getItem('likedDestinations') || '{}');

  return likedData[email] ? likedData[email].includes(destId) : false;
}

function loadLikedBookings() {
  const user = sessionStorage.getItem('user');
  if (!user) return;
  const userData = JSON.parse(user);

  const likedList = document.getElementById('likedBookingsList');
  if (!likedList) return;

  const likedData = JSON.parse(localStorage.getItem('likedDestinations') || '{}');
  const userLikedIds = likedData[userData.email] || [];

  if (userLikedIds.length === 0) {
    likedList.innerHTML = '<div class="text-center py-5"><i class="fas fa-heart-broken fa-3x text-muted mb-3"></i><p class="text-muted">You haven\'t liked any destinations yet.</p></div>';
    return;
  }

  const allDestinations = JSON.parse(localStorage.getItem('destinations') || '[]');
  const userLikedDestinations = allDestinations.filter(d => userLikedIds.includes(d.id));

  likedList.innerHTML = userLikedDestinations.map(dest => `
    <div class="card mb-3 border-0 shadow-sm overflow-hidden hover-shadow transition-all">
        <div class="row g-0">
            <div class="col-md-4" style="background-image: url('${dest.image}'); background-size: cover; background-position: center; min-height: 120px;">
            </div>
            <div class="col-md-8">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="card-title fw-bold text-primary mb-1">${dest.name}</h6>
                        <button class="btn btn-sm text-danger p-0" onclick="toggleLike(${dest.id})" title="Remove from Liked">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <p class="card-text small text-muted mb-2">${dest.description.substring(0, 60)}...</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-dark">₹${dest.price.toLocaleString('en-IN')}</span>
                        <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="bookFromLiked(${dest.id})">Book Now</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `).join('');
}

function bookFromLiked(destId) {
  const allDestinations = JSON.parse(localStorage.getItem('destinations') || '[]');
  const dest = allDestinations.find(d => d.id === destId);

  if (dest) {
    const modalEl = document.getElementById('likedBookingsModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    if (typeof bookDestination === 'function') {
      bookDestination(dest.name, dest.price, dest.description, dest.image, false, dest.type);
    } else {
      showToast('Booking service unavailable.', 'danger');
    }
  }
}

window.toggleLike = toggleLike;
window.isLiked = isLiked;
window.loadLikedBookings = loadLikedBookings;
window.bookFromLiked = bookFromLiked;

function handleNewsletterSignup() {
  const emailInput = document.getElementById('newsletterEmail');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    showToast('Please enter your email address.', 'warning');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Please enter a valid email address.', 'danger');
    return;
  }

  showToast('Subscribed successfully! Thank you for joining Tripzy.', 'success');
  if (emailInput) emailInput.value = '';
}
window.handleNewsletterSignup = handleNewsletterSignup;

function initEnterKeyListeners() {
  const forms = [
    { id: 'loginForm', type: 'login' },
    { id: 'signupForm', type: 'signup' },
    { id: 'forgotPasswordForm', type: 'reset' }
  ];

  forms.forEach(formInfo => {
    const form = document.getElementById(formInfo.id);
    if (form) {
      const inputs = form.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const sendBtn = document.getElementById(`send${formInfo.type.charAt(0).toUpperCase() + formInfo.type.slice(1)}OtpBtn`);
            if (sendBtn && !sendBtn.classList.contains('d-none')) {
              handleSendOTP(formInfo.type);
            } else {
              const submitBtn = document.getElementById(`${formInfo.type}SubmitBtn`);
              if (submitBtn && !submitBtn.classList.contains('d-none')) {
                submitBtn.click();
              }
            }
          }
        });
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHotels();
  initDestinations();
  if (typeof updateLoginUI === 'function') updateLoginUI();
  updateHeartIcons();
  initEnterKeyListeners();
  if (typeof setupFormListeners === 'function') setupFormListeners();

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (user.role === 'admin') {
        showToast('Administrators are not allowed to submit the contact form.', 'warning');
        return;
      }

      const name = document.getElementById('contactName').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const message = document.getElementById('contactMessage').value.trim();

      if (!name || !email || !message) {
        showToast('Please fill all fields.', 'warning');
        return;
      }

      const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
      messages.unshift({
        name,
        email,
        message,
        timestamp: new Date().toLocaleString()
      });
      localStorage.setItem('contactMessages', JSON.stringify(messages));

      showToast('Thank you for reaching out! We will get back to you soon.', 'success');
      contactForm.reset();
    });
  }
});

function setupFormListeners() {
  const loginModalEl = document.getElementById('loginModal');
  if (loginModalEl) {
    loginModalEl.addEventListener('hidden.bs.modal', () => {
      const form = document.getElementById('loginForm');
      if (form) {
        form.reset();
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
      }
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', login);

  const signupForm = document.getElementById('signupForm');
  if (signupForm) signupForm.addEventListener('submit', signup);
}

