// js/auth/cognito.js
//
// Connects the custom auth UI to AWS Cognito using direct HTTPS calls.

(function initCognitoModule() {
    const AUTH_STORAGE_KEY = "solar8.auth.session";
    const PENDING_SIGNUP_KEY = "solar8.auth.pendingSignup";
    const PENDING_RESET_KEY = "solar8.auth.pendingReset";
    const CODE_RESEND_COOLDOWN_SECONDS = 60;
    const REGISTER_PROFILE_ENDPOINT = "https://o66ehjhmy5.execute-api.eu-central-1.amazonaws.com/prod/register-profile";

    const defaultConfig = {
        region: "eu-central-1",
        userPoolId: "eu-central-1_t9Q84vBs2",
        userPoolClientId: "1lddm78eieupm2vhlpd368uadu"
    };

    const state = {
        config: { ...defaultConfig },
        initialized: false
    };

    const authMessages = {
        tr: {
            loginRequired: "Kullanıcı adı ve parola gerekli.",
            userNotFound: "Bu kullanıcı bulunamadı.",
            usernameExists: "Bu e-posta adresiyle zaten bir hesap var.",
            notAuthorized: "Kullanıcı adı veya parola hatalı.",
            userNotConfirmed: "Bu hesap henüz doğrulanmamış.",
            passwordResetRequired: "Şifre sıfırlama gerekiyor.",
            codeMismatch: "Doğrulama kodu hatalı.",
            expiredCode: "Doğrulama kodunun süresi dolmuş.",
            attemptLimitExceeded: "Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.",
            invalidPassword: "Şifre güvenlik gereksinimlerini karşılamıyor.",
            invalidParameter: "Gönderilen bilgiler geçersiz görünüyor.",
            networkError: "Cognito servisine ulaşılamadı. Ağ veya CORS problemi olabilir.",
            unexpectedError: "Beklenmeyen bir hata oluştu.",
            unconfirmedLogin: "Hesabınız henüz doğrulanmamış. Devam etmek için e-postanıza gelen kodu girin.",
            registerRequired: "Lütfen tüm alanları doldurun.",
            registerInvalidEmail: "Geçerli bir e-posta adresi girin.",
            registerPasswordMismatch: "Parolalar birbiriyle aynı değil.",
            registerVerifySent: "Doğrulama kodu e-posta adresinize gönderildi.",
            verifySignupFirst: "Doğrulama için önce kayıt olmanız gerekiyor.",
            verifyCodeRequired: "Lütfen doğrulama kodunu girin.",
            verifySuccess: "Hesabınız doğrulandı. Şimdi giriş yapabilirsiniz.",
            verifyProfileSyncFailed: "Hesap doğrulandı ancak profil verisi kaydedilemedi. Lütfen tekrar deneyin.",
            resendSignupFirst: "Kodu tekrar göndermek için önce kayıt olmanız gerekiyor.",
            resendSuccess: "Doğrulama kodu tekrar gönderildi.",
            forgotEmailRequired: "Lütfen kayıtlı e-posta adresinizi girin.",
            forgotInvalidEmail: "Geçerli bir e-posta adresi girin.",
            forgotRequestSuccess: "Şifre sıfırlama kodu e-posta adresinize gönderildi.",
            forgotCodeRequired: "Lütfen doğrulama kodunu girin.",
            forgotPasswordRequired: "Lütfen yeni parolanızı girin.",
            forgotPasswordMismatch: "Yeni parola alanları birbiriyle aynı değil.",
            forgotResetSuccess: "Şifreniz güncellendi. Şimdi giriş yapabilirsiniz.",
            forgotSubmitRequest: "DOĞRULAMA KODU GÖNDER",
            forgotSubmitConfirm: "ŞİFREYİ GÜNCELLE",
            forgotCodePlaceholder: "Doğrulama Kodu",
            forgotNewPasswordPlaceholder: "Yeni Parola",
            forgotConfirmPasswordPlaceholder: "Yeni Parola (tekrar)",
            resetVerifyTitle: "Doğrulama Kodunu Girin",
            resetVerifyDesc: "Lütfen şifre sıfırlama için e-posta adresinize gönderilen 6 haneli doğrulama kodunu giriniz.",
            resetPasswordTitle: "Yeni Şifrenizi Belirleyin",
            resetPasswordDesc: "Doğrulama kodunu girdiniz. Şimdi yeni şifrenizi oluşturun.",
            resetCodeAccepted: "Kod girildi. Şimdi yeni şifrenizi belirleyin.",
            resendAvailableIn: "Tekrar gönderim için kalan süre: {time}"
        },
        en: {
            loginRequired: "Username and password are required.",
            userNotFound: "This user could not be found.",
            usernameExists: "An account already exists with this email address.",
            notAuthorized: "Incorrect username or password.",
            userNotConfirmed: "This account has not been verified yet.",
            passwordResetRequired: "A password reset is required.",
            codeMismatch: "The verification code is incorrect.",
            expiredCode: "The verification code has expired.",
            attemptLimitExceeded: "Too many attempts were made. Please wait a bit and try again.",
            invalidPassword: "Your password does not meet the security requirements.",
            invalidParameter: "The submitted information appears to be invalid.",
            networkError: "The Cognito service could not be reached. There may be a network or CORS issue.",
            unexpectedError: "An unexpected error occurred.",
            unconfirmedLogin: "Your account has not been verified yet. Enter the code sent to your email to continue.",
            registerRequired: "Please fill in all fields.",
            registerInvalidEmail: "Enter a valid email address.",
            registerPasswordMismatch: "The passwords do not match.",
            registerVerifySent: "A verification code has been sent to your email address.",
            verifySignupFirst: "You need to sign up before completing verification.",
            verifyCodeRequired: "Please enter the verification code.",
            verifySuccess: "Your account has been verified. You can now sign in.",
            verifyProfileSyncFailed: "Your account was verified, but the profile record could not be saved. Please try again.",
            resendSignupFirst: "You need to sign up before requesting another code.",
            resendSuccess: "The verification code has been sent again.",
            forgotEmailRequired: "Please enter your registered email address.",
            forgotInvalidEmail: "Enter a valid email address.",
            forgotRequestSuccess: "A password reset code has been sent to your email address.",
            forgotCodeRequired: "Please enter the verification code.",
            forgotPasswordRequired: "Please enter your new password.",
            forgotPasswordMismatch: "The new password fields do not match.",
            forgotResetSuccess: "Your password has been updated. You can now sign in.",
            forgotSubmitRequest: "SEND VERIFICATION CODE",
            forgotSubmitConfirm: "UPDATE PASSWORD",
            forgotCodePlaceholder: "Verification Code",
            forgotNewPasswordPlaceholder: "New Password",
            forgotConfirmPasswordPlaceholder: "Confirm New Password",
            resetVerifyTitle: "Enter Verification Code",
            resetVerifyDesc: "Enter the 6-digit verification code sent to your email to reset your password.",
            resetPasswordTitle: "Set Your New Password",
            resetPasswordDesc: "Your verification code has been entered. Now create your new password.",
            resetCodeAccepted: "Code entered. Now set your new password.",
            resendAvailableIn: "Resend available in: {time}"
        }
    };

    let verifyTimerIntervalId = null;

    function t(key) {
        const lang = window.App?.lang === "en" ? "en" : "tr";
        return authMessages[lang]?.[key] || authMessages.tr[key] || key;
    }

    function tf(key, replacements = {}) {
        let text = t(key);

        Object.entries(replacements).forEach(([name, value]) => {
            text = text.replace(`{${name}}`, String(value));
        });

        return text;
    }

    function getLoginElements() {
        return {
            usernameInput: document.getElementById("login-email") || document.getElementById("inp-id"),
            passwordInput: document.getElementById("login-pass") || document.getElementById("inp-pass"),
            errorBox: document.getElementById("login-error"),
            loginButton: document.getElementById("btn-login")
        };
    }

    function getRegisterElements() {
        return {
            nameInput: document.getElementById("reg-name"),
            emailInput: document.getElementById("reg-email"),
            passwordInput: document.getElementById("reg-pass"),
            confirmInput: document.getElementById("reg-pass-confirm"),
            tooltipEl: document.getElementById("register-password-tooltip"),
            errorBox: document.getElementById("register-error"),
            successBox: document.getElementById("register-success")
        };
    }

    function getVerifyElements() {
        return {
            codeInput: document.getElementById("inp-verify-code"),
            errorBox: document.getElementById("verify-error"),
            successBox: document.getElementById("verify-success")
        };
    }

    function getForgotElements() {
        return {
            emailInput: document.getElementById("forgot-email"),
            errorBox: document.getElementById("forgot-error"),
            successBox: document.getElementById("forgot-success"),
            submitLabel: document.getElementById("forgot-submit-label")
        };
    }

    function getVerifyFlowElements() {
        return {
            titleEl: document.querySelector('#view-verify [data-key="verify_title"]'),
            descEl: document.querySelector('#view-verify [data-key="verify_desc"]'),
            codeGroup: document.getElementById("verify-code-group"),
            codeInput: document.getElementById("inp-verify-code"),
            resetFields: document.getElementById("verify-reset-fields"),
            passwordInput: document.getElementById("verify-new-pass"),
            confirmInput: document.getElementById("verify-new-pass-confirm"),
            tooltipEl: document.getElementById("reset-password-tooltip"),
            errorBox: document.getElementById("verify-error"),
            successBox: document.getElementById("verify-success"),
            validityBox: document.getElementById("verify-validity"),
            metaBox: document.getElementById("verify-meta"),
            cooldownBox: document.getElementById("verify-cooldown"),
            submitLabel: document.getElementById("verify-submit-label"),
            backButton: document.querySelector("#view-verify .absolute.top-8.left-8 button"),
            resendGroup: document.getElementById("verify-resend-group"),
            resendLink: document.querySelector('#view-verify [data-key="btn_resend"]')
        };
    }

    function showMessage(box, message) {
        if (!box) {
            console.warn("[Auth]", message);
            return;
        }

        box.textContent = message;
        box.classList.remove("hidden");
    }

    function hideMessage(box) {
        if (!box) return;
        box.textContent = "";
        box.classList.add("hidden");
    }

    function setTextVisibility(element, text) {
        if (!element) return;
        element.textContent = text || "";
        element.classList.toggle("hidden", !text);
    }

    function formatCountdown(totalSeconds) {
        const safeSeconds = Math.max(0, totalSeconds);
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function getEpochSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    function withCodeTiming(data) {
        const sentAt = getEpochSeconds();
        return {
            ...data,
            codeSentAt: sentAt,
            resendAvailableAt: sentAt + CODE_RESEND_COOLDOWN_SECONDS
        };
    }

    function setResendEnabled(isEnabled) {
        const { resendLink } = getVerifyFlowElements();
        if (!resendLink) return;

        resendLink.classList.toggle("pointer-events-none", !isEnabled);
        resendLink.classList.toggle("opacity-50", !isEnabled);
        resendLink.setAttribute("aria-disabled", String(!isEnabled));
    }

    function stopVerifyTimer() {
        if (!verifyTimerIntervalId) return;
        clearInterval(verifyTimerIntervalId);
        verifyTimerIntervalId = null;
    }

    function setButtonBusy(button, isBusy) {
        if (!button) return;
        button.disabled = isBusy;
        button.setAttribute("aria-busy", String(isBusy));
        button.classList.toggle("opacity-60", isBusy);
        button.classList.toggle("pointer-events-none", isBusy);
    }

    function showLoginError(message) {
        hideMessage(getLoginElements().errorBox);
        window.showToast?.(message, { title: window.App?.lang === "tr" ? "Giriş Hatası" : "Login Error" });
    }

    function clearLoginError() {
        hideMessage(getLoginElements().errorBox);
    }

    function setLoginBusy(isBusy) {
        setButtonBusy(getLoginElements().loginButton, isBusy);
    }

    function showRegisterError(message) {
        const { errorBox, successBox } = getRegisterElements();
        hideMessage(successBox);
        hideMessage(errorBox);
        window.showToast?.(message, { title: window.App?.lang === "tr" ? "Kayıt Hatası" : "Registration Error" });
    }

    function showRegisterSuccess(message) {
        const { errorBox, successBox } = getRegisterElements();
        hideMessage(errorBox);
        showMessage(successBox, message);
    }

    function clearRegisterMessages() {
        const { errorBox, successBox } = getRegisterElements();
        hideMessage(errorBox);
        hideMessage(successBox);
    }

    function showVerifyError(message) {
        const { errorBox, successBox } = getVerifyElements();
        hideMessage(successBox);
        hideMessage(errorBox);
        window.showToast?.(message, { title: window.App?.lang === "tr" ? "Doğrulama Hatası" : "Verification Error" });
    }

    function showVerifySuccess(message) {
        const { errorBox, successBox } = getVerifyElements();
        hideMessage(errorBox);
        showMessage(successBox, message);
    }

    function clearVerifyMessages() {
        const { errorBox, successBox } = getVerifyElements();
        hideMessage(errorBox);
        hideMessage(successBox);
    }

    function showForgotError(message) {
        const { errorBox, successBox } = getForgotElements();
        hideMessage(successBox);
        hideMessage(errorBox);
        window.showToast?.(message, { title: window.App?.lang === "tr" ? "Sıfırlama Hatası" : "Reset Error" });
    }

    function showForgotSuccess(message) {
        const { errorBox, successBox } = getForgotElements();
        hideMessage(errorBox);
        showMessage(successBox, message);
    }

    function clearForgotMessages() {
        const { errorBox, successBox } = getForgotElements();
        hideMessage(errorBox);
        hideMessage(successBox);
    }

    function clearInputValue(input) {
        if (!input) return;
        input.value = "";
    }

    window.resetRegisterForm = function resetRegisterForm() {
        const { nameInput, emailInput, passwordInput, confirmInput, tooltipEl } = getRegisterElements();
        clearInputValue(nameInput);
        clearInputValue(emailInput);
        clearInputValue(passwordInput);
        clearInputValue(confirmInput);
        clearRegisterMessages();
        updatePasswordTooltip(tooltipEl, "", false);
    };

    window.resetLoginForm = function resetLoginForm(options = {}) {
        const { usernameInput, passwordInput } = getLoginElements();
        if (!options.keepUsername) clearInputValue(usernameInput);
        clearInputValue(passwordInput);
        clearLoginError();
    };

    window.resetForgotForm = function resetForgotForm() {
        const { emailInput, submitLabel } = getForgotElements();
        clearInputValue(emailInput);
        clearForgotMessages();
        if (submitLabel) submitLabel.textContent = t("forgotSubmitRequest");
    };

    window.resetVerifyForm = function resetVerifyForm() {
        const verifyElements = getVerifyElements();
        const verifyFlowElements = getVerifyFlowElements();

        clearInputValue(verifyElements.codeInput);
        clearInputValue(verifyFlowElements.passwordInput);
        clearInputValue(verifyFlowElements.confirmInput);
        clearVerifyMessages();
        updatePasswordTooltip(verifyFlowElements.tooltipEl, "", false);
    };

    function getPasswordRuleState(password) {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
    }

    function isPasswordPolicySatisfied(password) {
        return Object.values(getPasswordRuleState(password)).every(Boolean);
    }

    function updatePasswordTooltip(tooltipEl, password, isVisible) {
        if (!tooltipEl) return;

        tooltipEl.classList.toggle("is-visible", Boolean(isVisible));

        const state = getPasswordRuleState(password || "");
        tooltipEl.querySelectorAll("[data-password-rule]").forEach((ruleEl) => {
            const key = ruleEl.getAttribute("data-password-rule");
            const isValid = Boolean(state[key]);
            ruleEl.classList.toggle("is-valid", isValid);

            const icon = ruleEl.querySelector("i");
            if (icon) {
                icon.className = isValid ? "fa-solid fa-circle-check" : "fa-solid fa-circle";
            }
        });
    }

    function bindPasswordTooltip(input, tooltipEl) {
        if (!input || !tooltipEl) return;
        if (input.dataset.passwordTooltipBound === "true") return;

        input.dataset.passwordTooltipBound = "true";

        const sync = () => updatePasswordTooltip(tooltipEl, input.value || "", document.activeElement === input);
        input.addEventListener("focus", sync);
        input.addEventListener("input", sync);
        input.addEventListener("blur", () => updatePasswordTooltip(tooltipEl, input.value || "", false));
        sync();
    }


    function updateForgotSubmitLabel(isConfirmStep) {
        const { submitLabel } = getForgotElements();
        if (submitLabel) {
            submitLabel.textContent = isConfirmStep ? t("forgotSubmitConfirm") : t("forgotSubmitRequest");
        }
    }

    function setForgotMode(isConfirmStep) {
        const { emailInput } = getForgotElements();

        if (emailInput) {
            emailInput.readOnly = isConfirmStep;
            emailInput.classList.toggle("opacity-70", isConfirmStep);
        }

        updateForgotSubmitLabel(isConfirmStep);
    }

    function syncForgotPasswordUI() {
        const pendingReset = readPendingReset();
        const { emailInput } = getForgotElements();

        if (emailInput && pendingReset?.email) {
            emailInput.value = pendingReset.email;
        }

        setForgotMode(false);
    }

    function getPendingCodeState() {
        const pendingReset = readPendingReset();
        if (pendingReset?.email) return pendingReset;

        const pendingSignup = readPendingSignup();
        if (pendingSignup?.email) return pendingSignup;

        return null;
    }

    function renderVerifyMeta() {
        const { validityBox, cooldownBox } = getVerifyFlowElements();
        const pending = getPendingCodeState();

        setTextVisibility(validityBox, "");

        if (!pending?.codeSentAt) {
            setTextVisibility(cooldownBox, "");
            setResendEnabled(true);
            return;
        }

        const now = getEpochSeconds();
        const remainingCooldown = Math.max(0, (pending.resendAvailableAt || 0) - now);

        if (remainingCooldown > 0) {
            setTextVisibility(cooldownBox, tf("resendAvailableIn", { time: formatCountdown(remainingCooldown) }));
            setResendEnabled(false);
            return;
        }

        setTextVisibility(cooldownBox, "");
        setResendEnabled(true);
    }

    function startVerifyTimer() {
        stopVerifyTimer();
        renderVerifyMeta();

        if (!getPendingCodeState()?.codeSentAt) return;

        verifyTimerIntervalId = window.setInterval(() => {
            renderVerifyMeta();

            const pending = getPendingCodeState();
            if (!pending?.codeSentAt) {
                stopVerifyTimer();
                return;
            }

            const now = getEpochSeconds();
            if ((pending.resendAvailableAt || 0) <= now) {
                stopVerifyTimer();
            }
        }, 1000);
    }

    function setVerifyMode(mode) {
        const {
            titleEl,
            descEl,
            codeGroup,
            codeInput,
            resetFields,
            passwordInput,
            confirmInput,
            metaBox,
            submitLabel,
            backButton,
            resendGroup
        } = getVerifyFlowElements();
        const lang = window.App?.lang === "en" ? "en" : "tr";
        const appCopy = window.TRANSLATIONS?.[lang] || {};

        const isResetVerify = mode === "reset-verify";
        const isResetPassword = mode === "reset-password";

        if (titleEl) {
            titleEl.textContent = isResetPassword
                ? t("resetPasswordTitle")
                : isResetVerify
                    ? t("resetVerifyTitle")
                    : (appCopy.verify_title || "Kodu Doğrula");
        }

        if (descEl) {
            descEl.textContent = isResetPassword
                ? t("resetPasswordDesc")
                : isResetVerify
                    ? t("resetVerifyDesc")
                    : (appCopy.verify_desc || "Lütfen doğrulama kodunu giriniz.");
        }

        if (resetFields) {
            resetFields.classList.toggle("hidden", !isResetPassword);
        }

        if (codeGroup) {
            codeGroup.classList.toggle("hidden", isResetPassword);
        }

        if (metaBox) {
            metaBox.classList.toggle("hidden", isResetPassword);
        }

        if (resendGroup) {
            resendGroup.classList.toggle("hidden", isResetPassword);
        }

        if (codeInput) {
            codeInput.readOnly = isResetPassword;
            codeInput.classList.toggle("opacity-70", isResetPassword);
            if (!isResetPassword) {
                codeInput.value = "";
            }
        }

        if (!isResetPassword) {
            if (passwordInput) passwordInput.value = "";
            if (confirmInput) confirmInput.value = "";
        }

        if (passwordInput) {
            passwordInput.placeholder = t("forgotNewPasswordPlaceholder");
        }

        if (confirmInput) {
            confirmInput.placeholder = t("forgotConfirmPasswordPlaceholder");
        }

        if (submitLabel) {
            submitLabel.textContent = isResetPassword
                ? t("forgotSubmitConfirm")
                : (appCopy.btn_verify || "ONAYLA");
        }

        if (backButton) {
            const pendingSignup = readPendingSignup();
            const backTarget = pendingSignup?.sourceView === "login" ? window.navToLogin : window.navToRegister;
            backButton.onclick = isResetVerify || isResetPassword ? window.navToForgot : backTarget;
        }
        updatePasswordTooltip(getVerifyFlowElements().tooltipEl, passwordInput?.value || "", isResetPassword && document.activeElement === passwordInput);
    }

    function syncVerifyFlowUI() {
        const pendingReset = readPendingReset();
        const { codeInput } = getVerifyFlowElements();

        if (pendingReset?.email && pendingReset?.stage === "set-password") {
            if (codeInput) codeInput.value = pendingReset.code || "";
            setVerifyMode("reset-password");
            startVerifyTimer();
            return;
        }

        if (pendingReset?.email) {
            setVerifyMode("reset-verify");
            startVerifyTimer();
            return;
        }

        setVerifyMode("signup-verify");
        startVerifyTimer();
    }

    function persistJson(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
    }

    function readJson(key) {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch {
            sessionStorage.removeItem(key);
            return null;
        }
    }

    function clearJson(key) {
        sessionStorage.removeItem(key);
    }

    function persistSession(session) {
        persistJson(AUTH_STORAGE_KEY, session);
    }

    function readPersistedSession() {
        return readJson(AUTH_STORAGE_KEY);
    }

    function clearPersistedSession() {
        clearJson(AUTH_STORAGE_KEY);
    }

    function persistPendingSignup(data) {
        persistJson(PENDING_SIGNUP_KEY, data);
    }

    function readPendingSignup() {
        return readJson(PENDING_SIGNUP_KEY);
    }

    function clearPendingSignup() {
        clearJson(PENDING_SIGNUP_KEY);
        renderVerifyMeta();
    }

    function persistPendingReset(data) {
        persistJson(PENDING_RESET_KEY, data);
    }

    function readPendingReset() {
        return readJson(PENDING_RESET_KEY);
    }

    function clearPendingReset() {
        clearJson(PENDING_RESET_KEY);
        renderVerifyMeta();
    }

    function getConfigFromWindow() {
        const incoming = window.COGNITO_CONFIG;
        return incoming && typeof incoming === "object" ? incoming : {};
    }

    function validateConfig(config) {
        const requiredKeys = ["region", "userPoolId", "userPoolClientId"];
        const missing = requiredKeys.filter((key) => !config[key]);
        return { ok: missing.length === 0, missing };
    }

    function ensureInitialized() {
        if (!state.initialized) {
            state.config = {
                ...defaultConfig,
                ...getConfigFromWindow()
            };
            state.initialized = true;
        }

        const validation = validateConfig(state.config);
        if (!validation.ok) {
            throw new Error(`Cognito config is incomplete. Missing: ${validation.missing.join(", ")}`);
        }
    }

    function routeToVerifyForEmail(email, message) {
        if (!email) return;

        clearPendingReset();
        persistPendingSignup(withCodeTiming({ email, sourceView: "login" }));
        window.navToVerify?.();
        syncVerifyFlowUI();
        clearVerifyMessages();

        if (message) {
            showVerifyError(message);
        }
    }

    function getCognitoEndpoint() {
        return `https://cognito-idp.${state.config.region}.amazonaws.com/`;
    }

    async function postToCognito(target, body) {
        const response = await fetch(getCognitoEndpoint(), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-amz-json-1.1",
                "X-Amz-Target": target
            },
            body: JSON.stringify(body)
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(json.message || json.Message || response.statusText);
            error.name = json.__type || json.code || "CognitoError";
            throw error;
        }

        return json;
    }

    async function syncRegisterProfile(payload) {
        const response = await fetch(REGISTER_PROFILE_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok || json?.ok === false) {
            const detail = json?.error || json?.message || response.statusText;
            throw new Error(detail || "Register profile sync failed");
        }

        return json;
    }

    function decodeJwtPayload(token) {
        if (!token) return null;

        const parts = token.split(".");
        if (parts.length < 2) return null;

        try {
            const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
            return JSON.parse(atob(padded));
        } catch {
            return null;
        }
    }

    function isTokenExpired(token) {
        const payload = decodeJwtPayload(token);
        if (!payload?.exp) return true;
        return payload.exp <= Math.floor(Date.now() / 1000);
    }

    function buildUserFromIdToken(idToken, usernameFallback) {
        const payload = decodeJwtPayload(idToken) || {};
        const username = payload["cognito:username"] || payload.username || usernameFallback || "unknown";

        return {
            cognitoSub: payload.sub || null,
            username,
            name: payload.name || payload.email || username,
            email: payload.email || null,
            status: "Authenticated"
        };
    }

    function buildSessionFromAuthResult(authResult, username) {
        const idToken = authResult?.IdToken || null;
        const accessToken = authResult?.AccessToken || null;
        const refreshToken = authResult?.RefreshToken || null;

        return {
            tokens: {
                idToken,
                accessToken,
                refreshToken
            },
            user: buildUserFromIdToken(idToken, username)
        };
    }

    function syncUserToApp(user) {
        if (!window.App?.data?.context) return user;

        window.App.data.context.user = {
            ...(window.App.data.context.user ?? {}),
            ...user
        };

        return user;
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function isUserNotConfirmed(error) {
        return /UserNotConfirmed/i.test(error?.name || "") || /UserNotConfirmed/i.test(error?.message || "");
    }

    function getAuthErrorMessage(error) {
        const message = error instanceof Error ? error.message : String(error);
        const name = error?.name || "";

        if (/UserNotFound/i.test(name) || /UserNotFound/i.test(message)) return t("userNotFound");
        if (/UsernameExists/i.test(name) || /UsernameExists/i.test(message)) return t("usernameExists");
        if (/NotAuthorized/i.test(name) || /Incorrect username or password/i.test(message)) return t("notAuthorized");
        if (/UserNotConfirmed/i.test(name) || /UserNotConfirmed/i.test(message)) return t("userNotConfirmed");
        if (/PasswordResetRequired/i.test(name) || /PasswordResetRequired/i.test(message)) return t("passwordResetRequired");
        if (/CodeMismatch/i.test(name) || /CodeMismatch/i.test(message)) return t("codeMismatch");
        if (/ExpiredCode/i.test(name) || /ExpiredCode/i.test(message)) return t("expiredCode");
        if (/LimitExceeded/i.test(name) || /TooManyRequests/i.test(name) || /Attempt limit exceeded/i.test(message)) return t("attemptLimitExceeded");
        if (/InvalidPassword/i.test(name) || /InvalidPassword/i.test(message)) return t("invalidPassword");
        if (/InvalidParameter/i.test(name) || /InvalidParameter/i.test(message)) return t("invalidParameter");
        if (/Network/i.test(message) || /Failed to fetch/i.test(message)) return t("networkError");

        return message || t("unexpectedError");
    }

    async function signInWithPassword(username, password) {
        const result = await postToCognito("AWSCognitoIdentityProviderService.InitiateAuth", {
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: state.config.userPoolClientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        });

        if (result.ChallengeName) {
            throw new Error(`Additional auth step required: ${result.ChallengeName}`);
        }

        return buildSessionFromAuthResult(result.AuthenticationResult, username);
    }

    async function refreshSession(refreshToken) {
        if (!refreshToken) return null;

        const result = await postToCognito("AWSCognitoIdentityProviderService.InitiateAuth", {
            AuthFlow: "REFRESH_TOKEN_AUTH",
            ClientId: state.config.userPoolClientId,
            AuthParameters: {
                REFRESH_TOKEN: refreshToken
            }
        });

        const session = buildSessionFromAuthResult(result.AuthenticationResult, null);
        session.tokens.refreshToken = refreshToken;
        return session;
    }

    async function fetchUserFromAccessToken(accessToken, idToken, fallbackUser) {
        if (!accessToken) return fallbackUser;

        const result = await postToCognito("AWSCognitoIdentityProviderService.GetUser", {
            AccessToken: accessToken
        });

        const attrs = Object.fromEntries((result.UserAttributes || []).map((item) => [item.Name, item.Value]));
        const baseUser = buildUserFromIdToken(idToken, result.Username);

        return {
            ...baseUser,
            name: attrs.name || attrs.email || baseUser.name,
            email: attrs.email || baseUser.email
        };
    }

    async function signUpUser(name, email, password) {
        return postToCognito("AWSCognitoIdentityProviderService.SignUp", {
            ClientId: state.config.userPoolClientId,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: "email", Value: email },
                { Name: "name", Value: name }
            ]
        });
    }

    async function confirmUserSignUp(email, code) {
        return postToCognito("AWSCognitoIdentityProviderService.ConfirmSignUp", {
            ClientId: state.config.userPoolClientId,
            Username: email,
            ConfirmationCode: code
        });
    }

    async function resendConfirmation(email) {
        return postToCognito("AWSCognitoIdentityProviderService.ResendConfirmationCode", {
            ClientId: state.config.userPoolClientId,
            Username: email
        });
    }

    async function forgotPassword(email) {
        return postToCognito("AWSCognitoIdentityProviderService.ForgotPassword", {
            ClientId: state.config.userPoolClientId,
            Username: email
        });
    }

    async function confirmForgotPassword(email, code, password) {
        return postToCognito("AWSCognitoIdentityProviderService.ConfirmForgotPassword", {
            ClientId: state.config.userPoolClientId,
            Username: email,
            ConfirmationCode: code,
            Password: password
        });
    }

    function bindEnterSubmit(element, handler) {
        if (!element || typeof handler !== "function") return;
        if (element.dataset.enterBound === "true") return;

        element.dataset.enterBound = "true";
        element.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            if (event.defaultPrevented) return;
            event.preventDefault();
            handler();
        });
    }

    function bindGlobalEnterSubmit(element, handler) {
        if (!element || typeof handler !== "function") return;
        if (element.dataset.globalEnterBound === "true") return;

        element.dataset.globalEnterBound = "true";
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            if (event.defaultPrevented) return;
            if (element.classList.contains("view-hidden")) return;

            const target = event.target;
            if (target instanceof HTMLElement) {
                const tagName = target.tagName;
                if (tagName === "TEXTAREA" || tagName === "SELECT") return;
                if (target.isContentEditable) return;
            }

            event.preventDefault();
            handler();
        });
    }

    function bindNumericOnly(element, maxLength) {
        if (!element) return;
        if (element.dataset.numericBound === "true") return;

        element.dataset.numericBound = "true";
        element.addEventListener("input", () => {
            const digits = element.value.replace(/\D+/g, "");
            element.value = typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
        });
    }

    function setupEnterKeyHandlers() {
        const registerButton = document.getElementById("btn-register");
        const forgotButton = document.getElementById("btn-forgot");
        const verifyButton = document.getElementById("btn-verify");

        bindGlobalEnterSubmit(document.getElementById("view-login"), () => window.handleLogin?.());
        bindGlobalEnterSubmit(document.getElementById("view-register"), () => window.handleRegister?.(registerButton));
        bindGlobalEnterSubmit(document.getElementById("view-forgot"), () => window.handleForgotPass?.(forgotButton));
        bindGlobalEnterSubmit(document.getElementById("view-verify"), () => window.handleVerify?.(verifyButton));

        bindEnterSubmit(document.getElementById("login-email"), () => window.handleLogin?.());
        bindEnterSubmit(document.getElementById("login-pass"), () => window.handleLogin?.());

        bindEnterSubmit(document.getElementById("reg-name"), () => window.handleRegister?.(registerButton));
        bindEnterSubmit(document.getElementById("reg-email"), () => window.handleRegister?.(registerButton));
        bindEnterSubmit(document.getElementById("reg-pass"), () => window.handleRegister?.(registerButton));
        bindEnterSubmit(document.getElementById("reg-pass-confirm"), () => window.handleRegister?.(registerButton));

        bindEnterSubmit(document.getElementById("forgot-email"), () => window.handleForgotPass?.(forgotButton));
        bindEnterSubmit(document.getElementById("inp-verify-code"), () => window.handleVerify?.(verifyButton));
        bindEnterSubmit(document.getElementById("verify-new-pass"), () => window.handleVerify?.(verifyButton));
        bindEnterSubmit(document.getElementById("verify-new-pass-confirm"), () => window.handleVerify?.(verifyButton));

        bindNumericOnly(document.getElementById("inp-verify-code"), 6);
    }

    function setupPasswordTooltips() {
        const registerElements = getRegisterElements();
        const verifyElements = getVerifyFlowElements();

        bindPasswordTooltip(registerElements.passwordInput, registerElements.tooltipEl);
        bindPasswordTooltip(verifyElements.passwordInput, verifyElements.tooltipEl);
    }

    window.initAuth = async function initAuth() {
        ensureInitialized();
        return { ...state.config };
    };

    window.restoreSession = async function restoreSession() {
        ensureInitialized();

        const session = readPersistedSession();
        if (!session?.tokens) return null;

        try {
            let activeSession = session;

            if (isTokenExpired(activeSession.tokens.accessToken)) {
                activeSession = await refreshSession(activeSession.tokens.refreshToken);
                if (!activeSession) {
                    clearPersistedSession();
                    return null;
                }
            }

            activeSession.user = await fetchUserFromAccessToken(
                activeSession.tokens.accessToken,
                activeSession.tokens.idToken,
                activeSession.user
            );

            persistSession(activeSession);
            return syncUserToApp(activeSession.user);
        } catch (error) {
            console.warn("[Auth]", error);
            clearPersistedSession();
            return null;
        }
    };

    window.handleLogin = async function handleLogin() {
        ensureInitialized();

        const { usernameInput, passwordInput } = getLoginElements();
        const username = usernameInput?.value.trim() || "";
        const password = passwordInput?.value || "";

        clearLoginError();

        if (!username || !password) {
            showLoginError(t("loginRequired"));
            return null;
        }

        setLoginBusy(true);

        try {
            const session = await signInWithPassword(username, password);
            session.user = await fetchUserFromAccessToken(
                session.tokens.accessToken,
                session.tokens.idToken,
                session.user
            );

            persistSession(session);
            syncUserToApp(session.user);
            await window.navToSelection?.();
            return session.user;
        } catch (error) {
            if (isUserNotConfirmed(error)) {
                routeToVerifyForEmail(username, t("unconfirmedLogin"));
                return null;
            }

            showLoginError(getAuthErrorMessage(error));
            return null;
        } finally {
            setLoginBusy(false);
        }
    };

    window.handleLogout = async function handleLogout() {
        clearPersistedSession();
        clearPendingSignup();
        clearPendingReset();
        localStorage.removeItem("selectedPlant");
        localStorage.removeItem("activeTab");
        clearLoginError();
        clearRegisterMessages();
        clearForgotMessages();
        clearVerifyMessages();
        stopVerifyTimer();
        window.stopDashboardRefresh?.();

        if (window.App?.weatherIntervalId !== null) {
            clearInterval(window.App.weatherIntervalId);
            window.App.weatherIntervalId = null;
        }

        if (window.App?.data?.context) {
            window.App.data.context.user = {};
            window.App.data.context.plant = {};
        }

        if (window.App?.data) {
            window.App.data.live = null;
            window.App.data.history = null;
            window.App.data.reports = null;
        }

        if (typeof window.navToLogin === "function") {
            window.navToLogin();
            return;
        }

        window.location.reload();
    };

    window.handleRegister = async function handleRegister(buttonEl) {
        ensureInitialized();
        clearRegisterMessages();

        const { nameInput, emailInput, passwordInput, confirmInput } = getRegisterElements();
        const name = nameInput?.value.trim() || "";
        const email = emailInput?.value.trim().toLowerCase() || "";
        const password = passwordInput?.value || "";
        const confirmPassword = confirmInput?.value || "";

        if (!name || !email || !password || !confirmPassword) {
            showRegisterError(t("registerRequired"));
            return null;
        }

        if (!isValidEmail(email)) {
            showRegisterError(t("registerInvalidEmail"));
            return null;
        }

        if (password !== confirmPassword) {
            showRegisterError(t("registerPasswordMismatch"));
            return null;
        }

        if (!isPasswordPolicySatisfied(password)) {
            showRegisterError(t("invalidPassword"));
            updatePasswordTooltip(getRegisterElements().tooltipEl, password, true);
            return null;
        }

        setButtonBusy(buttonEl, true);

        try {
            const result = await signUpUser(name, email, password);
            clearPendingReset();
            persistPendingSignup(withCodeTiming({
                name,
                email,
                sourceView: "register",
                cognitoSub: result?.UserSub || null
            }));
            showRegisterSuccess(t("registerVerifySent"));

            if (result?.UserSub) {
                console.info("[Auth] Signup created:", result.UserSub);
            }

            window.navToVerify?.();
            syncVerifyFlowUI();
            return result;
        } catch (error) {
            showRegisterError(getAuthErrorMessage(error));
            return null;
        } finally {
            setButtonBusy(buttonEl, false);
        }
    };

    window.handleVerify = async function handleVerify(buttonEl) {
        ensureInitialized();
        clearVerifyMessages();

        const pendingSignup = readPendingSignup();
        const pendingReset = readPendingReset();
        const code = (getVerifyElements().codeInput?.value || "").replace(/\D+/g, "").slice(0, 6);

        if (pendingReset?.email) {
            const { passwordInput, confirmInput } = getVerifyFlowElements();

            if (pendingReset.stage === "set-password") {
                const password = passwordInput?.value || "";
                const confirmPassword = confirmInput?.value || "";

                if (!password || !confirmPassword) {
                    showVerifyError(t("forgotPasswordRequired"));
                    return null;
                }

                if (password !== confirmPassword) {
                    showVerifyError(t("forgotPasswordMismatch"));
                    return null;
                }

                if (!isPasswordPolicySatisfied(password)) {
                    showVerifyError(t("invalidPassword"));
                    updatePasswordTooltip(getVerifyFlowElements().tooltipEl, password, true);
                    return null;
                }

                setButtonBusy(buttonEl, true);

                try {
                    const result = await confirmForgotPassword(pendingReset.email, pendingReset.code, password);
                    clearPendingReset();
                    syncVerifyFlowUI();
                    showVerifySuccess(t("forgotResetSuccess"));

                    const loginInput = document.getElementById("login-email");
                    if (loginInput) loginInput.value = pendingReset.email;

                    setTimeout(() => {
                        window.navToLogin?.();
                    }, 900);

                    return result;
                } catch (error) {
                    showVerifyError(getAuthErrorMessage(error));
                    return null;
                } finally {
                    setButtonBusy(buttonEl, false);
                }
            }

            if (!code) {
                showVerifyError(t("forgotCodeRequired"));
                return null;
            }

            persistPendingReset({
                ...pendingReset,
                code,
                stage: "set-password"
            });
            clearVerifyMessages();
            syncVerifyFlowUI();
            showVerifySuccess(t("resetCodeAccepted"));
            return { next: "set-password" };
        }

        if (!pendingSignup?.email) {
            showVerifyError(t("verifySignupFirst"));
            return null;
        }

        if (!code) {
            showVerifyError(t("verifyCodeRequired"));
            return null;
        }

        setButtonBusy(buttonEl, true);

        try {
            const result = await confirmUserSignUp(pendingSignup.email, code);
            if (pendingSignup.cognitoSub) {
                await syncRegisterProfile({
                    cognito_sub: pendingSignup.cognitoSub,
                    email: pendingSignup.email,
                    full_name: pendingSignup.name || ""
                });
            }
            clearPendingSignup();
            showVerifySuccess(t("verifySuccess"));

            const loginInput = document.getElementById("login-email");
            if (loginInput) loginInput.value = pendingSignup.email;

            setTimeout(() => {
                window.navToLogin?.();
            }, 700);

            return result;
        } catch (error) {
            const message = /Register profile sync failed|cognito_sub is required|email is required/i.test(error?.message || "")
                ? `${t("verifyProfileSyncFailed")} (${error.message})`
                : getAuthErrorMessage(error);
            showVerifyError(message);
            return null;
        } finally {
            setButtonBusy(buttonEl, false);
        }
    };

    window.resendCode = async function resendCode() {
        ensureInitialized();
        clearVerifyMessages();

        const pendingReset = readPendingReset();
        if (pendingReset?.email) {
            if ((pendingReset.resendAvailableAt || 0) > getEpochSeconds()) {
                renderVerifyMeta();
                return null;
            }

            try {
                const result = await forgotPassword(pendingReset.email);
                persistPendingReset(withCodeTiming({ email: pendingReset.email, stage: "verify" }));
                syncVerifyFlowUI();
                showVerifySuccess(t("forgotRequestSuccess"));
                return result;
            } catch (error) {
                showVerifyError(getAuthErrorMessage(error));
                return null;
            }
        }

        const pendingSignup = readPendingSignup();
        if (!pendingSignup?.email) {
            showVerifyError(t("resendSignupFirst"));
            return null;
        }

        if ((pendingSignup.resendAvailableAt || 0) > getEpochSeconds()) {
            renderVerifyMeta();
            return null;
        }

        try {
            const result = await resendConfirmation(pendingSignup.email);
            persistPendingSignup(withCodeTiming({ ...pendingSignup }));
            syncVerifyFlowUI();
            showVerifySuccess(t("resendSuccess"));
            return result;
        } catch (error) {
            showVerifyError(getAuthErrorMessage(error));
            return null;
        }
    };

    window.handleForgotPass = async function handleForgotPass(buttonEl) {
        ensureInitialized();
        clearForgotMessages();

        const { emailInput } = getForgotElements();
        const email = (emailInput?.value || "").trim().toLowerCase();

        if (!email) {
            showForgotError(t("forgotEmailRequired"));
            return null;
        }

        if (!isValidEmail(email)) {
            showForgotError(t("forgotInvalidEmail"));
            return null;
        }

        setButtonBusy(buttonEl, true);

        try {
            const result = await forgotPassword(email);
            clearPendingSignup();
            persistPendingReset(withCodeTiming({ email, stage: "verify" }));
            clearVerifyMessages();
            syncVerifyFlowUI();
            window.navToVerify?.();
            return result;
        } catch (error) {
            showForgotError(getAuthErrorMessage(error));
            return null;
        } finally {
            setButtonBusy(buttonEl, false);
        }
    };

    window.syncForgotPasswordUI = syncForgotPasswordUI;
    window.syncVerifyFlowUI = syncVerifyFlowUI;
    syncForgotPasswordUI();
    syncVerifyFlowUI();
    setupEnterKeyHandlers();
    setupPasswordTooltips();
})();
