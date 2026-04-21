// js/auth/cognito.js
//
// This file connects the custom HTML login form to AWS Cognito.
// We use direct HTTPS calls to Cognito so the app does not depend on
// an extra browser SDK script just to test username/password login.

(function initCognitoModule() {
    const AUTH_STORAGE_KEY = "solar8.auth.session";
    const PENDING_SIGNUP_KEY = "solar8.auth.pendingSignup";

    // Cognito app settings:
    // These values tell the frontend which User Pool and App Client to use.
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
            loginRequired: "Kullan\u0131c\u0131 ad\u0131 ve parola gerekli.",
            userNotFound: "Bu kullan\u0131c\u0131 bulunamad\u0131.",
            usernameExists: "Bu e-posta adresiyle zaten bir hesap var.",
            notAuthorized: "Kullan\u0131c\u0131 ad\u0131 veya parola hatal\u0131.",
            userNotConfirmed: "Bu hesap hen\u00fcz do\u011frulanmam\u0131\u015f.",
            passwordResetRequired: "\u015eifre s\u0131f\u0131rlama gerekiyor.",
            codeMismatch: "Do\u011frulama kodu hatal\u0131.",
            expiredCode: "Do\u011frulama kodunun s\u00fcresi dolmu\u015f.",
            invalidPassword: "\u015eifre Cognito kurallar\u0131yla e\u015fle\u015fmiyor.",
            invalidParameter: "G\u00f6nderilen bilgiler ge\u00e7ersiz g\u00f6r\u00fcn\u00fcyor.",
            networkError: "Cognito servisine ula\u015f\u0131lamad\u0131. A\u011f veya CORS problemi olabilir.",
            unexpectedError: "Giri\u015f s\u0131ras\u0131nda beklenmeyen bir hata olu\u015ftu.",
            unconfirmedLogin: "Hesab\u0131n\u0131z hen\u00fcz do\u011frulanmam\u0131\u015f. Devam etmek i\u00e7in e-postan\u0131za gelen kodu girin.",
            registerRequired: "L\u00fctfen t\u00fcm alanlar\u0131 doldurun.",
            registerInvalidEmail: "Ge\u00e7erli bir e-posta adresi girin.",
            registerPasswordMismatch: "Parolalar birbiriyle ayn\u0131 de\u011fil.",
            registerVerifySent: "Do\u011frulama kodu e-posta adresinize g\u00f6nderildi.",
            verifySignupFirst: "Do\u011frulama i\u00e7in \u00f6nce kay\u0131t olman\u0131z gerekiyor.",
            verifyCodeRequired: "L\u00fctfen do\u011frulama kodunu girin.",
            verifySuccess: "Hesab\u0131n\u0131z do\u011fruland\u0131. \u015eimdi giri\u015f yapabilirsiniz.",
            resendSignupFirst: "Kodu tekrar g\u00f6ndermek i\u00e7in \u00f6nce kay\u0131t olman\u0131z gerekiyor.",
            resendSuccess: "Do\u011frulama kodu tekrar g\u00f6nderildi."
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
            invalidPassword: "Your password does not meet the Cognito password policy.",
            invalidParameter: "The submitted information appears to be invalid.",
            networkError: "The Cognito service could not be reached. There may be a network or CORS issue.",
            unexpectedError: "An unexpected error occurred during sign-in.",
            unconfirmedLogin: "Your account has not been verified yet. Enter the code sent to your email to continue.",
            registerRequired: "Please fill in all fields.",
            registerInvalidEmail: "Enter a valid email address.",
            registerPasswordMismatch: "The passwords do not match.",
            registerVerifySent: "A verification code has been sent to your email address.",
            verifySignupFirst: "You need to sign up before completing verification.",
            verifyCodeRequired: "Please enter the verification code.",
            verifySuccess: "Your account has been verified. You can now sign in.",
            resendSignupFirst: "You need to sign up before requesting another code.",
            resendSuccess: "The verification code has been sent again."
        }
    };

    function t(key) {
        const lang = window.App?.lang === "en" ? "en" : "tr";
        return authMessages[lang]?.[key] || authMessages.tr[key] || key;
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

    function bindEnterSubmit(element, handler) {
        if (!element || typeof handler !== "function") return;
        if (element.dataset.enterBound === "true") return;

        element.dataset.enterBound = "true";
        element.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            handler();
        });
    }

    function setupEnterKeyHandlers() {
        bindEnterSubmit(document.getElementById("login-email"), () => window.handleLogin?.());
        bindEnterSubmit(document.getElementById("login-pass"), () => window.handleLogin?.());

        bindEnterSubmit(document.getElementById("reg-name"), () => window.handleRegister?.(document.getElementById("btn-register")));
        bindEnterSubmit(document.getElementById("reg-email"), () => window.handleRegister?.(document.getElementById("btn-register")));
        bindEnterSubmit(document.getElementById("reg-pass"), () => window.handleRegister?.(document.getElementById("btn-register")));
        bindEnterSubmit(document.getElementById("reg-pass-confirm"), () => window.handleRegister?.(document.getElementById("btn-register")));
    }

    // Small UI helpers:
    // These only control feedback on the login screen.
    function showLoginError(message) {
        const { errorBox } = getLoginElements();
        if (!errorBox) {
            console.warn("[Auth]", message);
            return;
        }

        errorBox.textContent = message;
        errorBox.classList.remove("hidden");
    }

    function clearLoginError() {
        const { errorBox } = getLoginElements();
        if (!errorBox) return;

        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    function setLoginBusy(isBusy) {
        const { loginButton } = getLoginElements();
        if (!loginButton) return;

        loginButton.disabled = isBusy;
        loginButton.setAttribute("aria-busy", String(isBusy));
        loginButton.classList.toggle("opacity-60", isBusy);
        loginButton.classList.toggle("pointer-events-none", isBusy);
    }

    function setButtonBusy(button, isBusy) {
        if (!button) return;
        button.disabled = isBusy;
        button.setAttribute("aria-busy", String(isBusy));
        button.classList.toggle("opacity-60", isBusy);
        button.classList.toggle("pointer-events-none", isBusy);
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

    function showRegisterError(message) {
        const { errorBox, successBox } = getRegisterElements();
        hideMessage(successBox);
        showMessage(errorBox, message);
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
        showMessage(errorBox, message);
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

    function routeToVerifyForEmail(email, message) {
        if (!email) return;

        persistPendingSignup({ email });

        if (typeof window.navToVerify === "function") {
            window.navToVerify();
        }

        clearVerifyMessages();
        if (message) {
            showVerifyError(message);
        }
    }

    function getConfigFromWindow() {
        const incoming = window.COGNITO_CONFIG;
        return incoming && typeof incoming === "object" ? incoming : {};
    }

    function validateConfig(config) {
        const requiredKeys = ["region", "userPoolId", "userPoolClientId"];
        const missing = requiredKeys.filter((key) => !config[key]);
        return {
            ok: missing.length === 0,
            missing
        };
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
            throw new Error(
                `Cognito config is incomplete. Missing: ${validation.missing.join(", ")}`
            );
        }
    }

    // Session helpers:
    // We keep tokens and basic user info in sessionStorage for this browser tab.
    function persistSession(session) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }

    function readPersistedSession() {
        const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch {
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
        }
    }

    function clearPersistedSession() {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }

    function persistPendingSignup(data) {
        sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(data));
    }

    function readPendingSignup() {
        const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch {
            sessionStorage.removeItem(PENDING_SIGNUP_KEY);
            return null;
        }
    }

    function clearPendingSignup() {
        sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    }

    function syncUserToApp(user) {
        if (!window.App?.data?.context) return user;

        window.App.data.context.user = {
            ...(window.App.data.context.user ?? {}),
            ...user
        };

        return user;
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

    function decodeJwtPayload(token) {
        if (!token) return null;

        const parts = token.split(".");
        if (parts.length < 2) return null;

        try {
            const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
            const json = atob(padded);
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    function isTokenExpired(token) {
        const payload = decodeJwtPayload(token);
        if (!payload?.exp) return true;

        const now = Math.floor(Date.now() / 1000);
        return payload.exp <= now;
    }

    function buildUserFromIdToken(idToken, usernameFallback) {
        const payload = decodeJwtPayload(idToken) || {};
        const username = payload["cognito:username"] || payload.username || usernameFallback || "unknown";

        return {
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

    async function signInWithPassword(username, password) {
        const result = await postToCognito(
            "AWSCognitoIdentityProviderService.InitiateAuth",
            {
                AuthFlow: "USER_PASSWORD_AUTH",
                ClientId: state.config.userPoolClientId,
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password
                }
            }
        );

        if (result.ChallengeName) {
            throw new Error(`Bu kullanici icin ek auth adimi gerekiyor: ${result.ChallengeName}`);
        }

        return buildSessionFromAuthResult(result.AuthenticationResult, username);
    }

    async function refreshSession(refreshToken) {
        if (!refreshToken) return null;

        const result = await postToCognito(
            "AWSCognitoIdentityProviderService.InitiateAuth",
            {
                AuthFlow: "REFRESH_TOKEN_AUTH",
                ClientId: state.config.userPoolClientId,
                AuthParameters: {
                    REFRESH_TOKEN: refreshToken
                }
            }
        );

        const session = buildSessionFromAuthResult(result.AuthenticationResult, null);
        session.tokens.refreshToken = refreshToken;
        return session;
    }

    async function fetchUserFromAccessToken(accessToken, idToken, fallbackUser) {
        if (!accessToken) return fallbackUser;

        const result = await postToCognito(
            "AWSCognitoIdentityProviderService.GetUser",
            {
                AccessToken: accessToken
            }
        );

        const attrs = Object.fromEntries((result.UserAttributes || []).map((item) => [item.Name, item.Value]));
        const baseUser = buildUserFromIdToken(idToken, result.Username);

        return {
            ...baseUser,
            name: attrs.name || attrs.email || baseUser.name,
            email: attrs.email || baseUser.email
        };
    }

    async function signUpUser(name, email, password) {
        return postToCognito(
            "AWSCognitoIdentityProviderService.SignUp",
            {
                ClientId: state.config.userPoolClientId,
                Username: email,
                Password: password,
                UserAttributes: [
                    { Name: "email", Value: email },
                    { Name: "name", Value: name }
                ]
            }
        );
    }

    async function confirmUserSignUp(email, code) {
        return postToCognito(
            "AWSCognitoIdentityProviderService.ConfirmSignUp",
            {
                ClientId: state.config.userPoolClientId,
                Username: email,
                ConfirmationCode: code
            }
        );
    }

    async function resendConfirmation(email) {
        return postToCognito(
            "AWSCognitoIdentityProviderService.ResendConfirmationCode",
            {
                ClientId: state.config.userPoolClientId,
                Username: email
            }
        );
    }

    function mapAuthError(error) {
        const message = error instanceof Error ? error.message : String(error);
        const name = error?.name || "";

        if (/UserNotFound/i.test(name) || /UserNotFound/i.test(message)) return "Bu kullanici bulunamadi.";
        if (/UsernameExists/i.test(name) || /UsernameExists/i.test(message)) return "Bu e-posta adresiyle zaten bir hesap var.";
        if (/NotAuthorized/i.test(name) || /Incorrect username or password/i.test(message)) return "Kullanici adi veya parola hatali.";
        if (/UserNotConfirmed/i.test(name) || /UserNotConfirmed/i.test(message)) return "Bu kullanici henuz dogrulanmamis.";
        if (/PasswordResetRequired/i.test(name) || /PasswordResetRequired/i.test(message)) return "Sifre sifirlama gerekiyor.";
        if (/CodeMismatch/i.test(name) || /CodeMismatch/i.test(message)) return "Doğrulama kodu hatalı.";
        if (/ExpiredCode/i.test(name) || /ExpiredCode/i.test(message)) return "Doğrulama kodunun süresi dolmuş.";
        if (/InvalidPassword/i.test(name) || /InvalidPassword/i.test(message)) return "Şifre Cognito kurallarını karşılamıyor.";
        if (/InvalidParameter/i.test(name) || /InvalidParameter/i.test(message)) return "Gönderilen bilgiler geçersiz görünüyor.";
        if (/Network/i.test(message) || /Failed to fetch/i.test(message)) return "Cognito servisine ulasilamadi. Ag veya CORS problemi olabilir.";

        return message || "Giris sirasinda beklenmeyen bir hata olustu.";
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
        if (/InvalidPassword/i.test(name) || /InvalidPassword/i.test(message)) return t("invalidPassword");
        if (/InvalidParameter/i.test(name) || /InvalidParameter/i.test(message)) return t("invalidParameter");
        if (/Network/i.test(message) || /Failed to fetch/i.test(message)) return t("networkError");

        return message || t("unexpectedError");
    }

    // Public auth API:
    // Other files can call these directly from the window object.
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

            if (typeof window.navToSelection === "function") {
                await window.navToSelection();
            }

            return session.user;
        } catch (error) {
            const authError = getAuthErrorMessage(error);

            if (
                /UserNotConfirmed/i.test(error?.name || "") ||
                /UserNotConfirmed/i.test(error?.message || "")
            ) {
                routeToVerifyForEmail(
                    username,
                    "Hesabiniz henüz doğrulanmamis. Devam etmek için mailinize gelen kodu girin."
                );
                return null;
            }

            showLoginError(authError);
            return null;
        } finally {
            setLoginBusy(false);
        }
    };

    window.handleLogout = async function handleLogout() {
        clearPersistedSession();

        if (window.App?.data?.context?.user) {
            window.App.data.context.user = {};
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

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showRegisterError(t("registerInvalidEmail"));
            return null;
        }

        if (password !== confirmPassword) {
            showRegisterError(t("registerPasswordMismatch"));
            return null;
        }

        setButtonBusy(buttonEl, true);

        try {
            const result = await signUpUser(name, email, password);
            persistPendingSignup({ name, email });
            showRegisterSuccess("Doğrulama kodu e-posta adresinize gönderildi.");

            if (result?.UserSub) {
                console.info("[Auth] Signup created:", result.UserSub);
            }

            if (typeof window.navToVerify === "function") {
                window.navToVerify();
            }

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
        const code = getVerifyElements().codeInput?.value.trim() || "";

        if (!pendingSignup?.email) {
            showVerifyError("Doğrulama için önce kayıt olmanız gerekiyor.");
            return null;
        }

        if (!code) {
            showVerifyError("Lutfen doğrulama kodunu girin.");
            return null;
        }

        setButtonBusy(buttonEl, true);

        try {
            const result = await confirmUserSignUp(pendingSignup.email, code);
            clearPendingSignup();
            showVerifySuccess("Hesabiniz doğrulandı. Şimdi giriş yapabilirsiniz.");

            const loginInput = document.getElementById("login-email");
            if (loginInput) loginInput.value = pendingSignup.email;

            setTimeout(() => {
                if (typeof window.navToLogin === "function") {
                    window.navToLogin();
                }
            }, 700);

            return result;
        } catch (error) {
            showVerifyError(getAuthErrorMessage(error));
            return null;
        } finally {
            setButtonBusy(buttonEl, false);
        }
    };

    window.resendCode = async function resendCode() {
        ensureInitialized();
        clearVerifyMessages();

        const pendingSignup = readPendingSignup();
        if (!pendingSignup?.email) {
            showVerifyError("Kod tekrar göndermek için önce kayıt olmanız gerekiyor.");
            return null;
        }

        try {
            const result = await resendConfirmation(pendingSignup.email);
            showVerifySuccess("Doğrulama kodu tekrar gönderildi.");
            return result;
        } catch (error) {
            showVerifyError(getAuthErrorMessage(error));
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

            if (typeof window.navToSelection === "function") {
                await window.navToSelection();
            }

            return session.user;
        } catch (error) {
            if (
                /UserNotConfirmed/i.test(error?.name || "") ||
                /UserNotConfirmed/i.test(error?.message || "")
            ) {
                routeToVerifyForEmail(username, t("unconfirmedLogin"));
                return null;
            }

            showLoginError(getAuthErrorMessage(error));
            return null;
        } finally {
            setLoginBusy(false);
        }
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

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showRegisterError(t("registerInvalidEmail"));
            return null;
        }

        if (password !== confirmPassword) {
            showRegisterError(t("registerPasswordMismatch"));
            return null;
        }

        setButtonBusy(buttonEl, true);

        try {
            const result = await signUpUser(name, email, password);
            persistPendingSignup({ name, email });
            showRegisterSuccess(t("registerVerifySent"));

            if (result?.UserSub) {
                console.info("[Auth] Signup created:", result.UserSub);
            }

            if (typeof window.navToVerify === "function") {
                window.navToVerify();
            }

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
        const code = getVerifyElements().codeInput?.value.trim() || "";

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
            clearPendingSignup();
            showVerifySuccess(t("verifySuccess"));

            const loginInput = document.getElementById("login-email");
            if (loginInput) loginInput.value = pendingSignup.email;

            setTimeout(() => {
                if (typeof window.navToLogin === "function") {
                    window.navToLogin();
                }
            }, 700);

            return result;
        } catch (error) {
            showVerifyError(getAuthErrorMessage(error));
            return null;
        } finally {
            setButtonBusy(buttonEl, false);
        }
    };

    window.resendCode = async function resendCode() {
        ensureInitialized();
        clearVerifyMessages();

        const pendingSignup = readPendingSignup();
        if (!pendingSignup?.email) {
            showVerifyError(t("resendSignupFirst"));
            return null;
        }

        try {
            const result = await resendConfirmation(pendingSignup.email);
            showVerifySuccess(t("resendSuccess"));
            return result;
        } catch (error) {
            showVerifyError(getAuthErrorMessage(error));
            return null;
        }
    };

    window.handleForgotPass = async function handleForgotPass() {
        console.warn("[Auth] Forgot password flow is not wired yet.");
    };

    setupEnterKeyHandlers();
})();
