// js/auth/cognito.js
//
// This file connects the custom HTML login form to AWS Cognito.
// We use direct HTTPS calls to Cognito so the app does not depend on
// an extra browser SDK script just to test username/password login.

(function initCognitoModule() {
    const AUTH_STORAGE_KEY = "solar8.auth.session";

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

    function getLoginElements() {
        return {
            usernameInput: document.getElementById("login-email") || document.getElementById("inp-id"),
            passwordInput: document.getElementById("login-pass") || document.getElementById("inp-pass"),
            errorBox: document.getElementById("login-error"),
            loginButton: document.getElementById("btn-login")
        };
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

    function mapAuthError(error) {
        const message = error instanceof Error ? error.message : String(error);
        const name = error?.name || "";

        if (/UserNotFound/i.test(name) || /UserNotFound/i.test(message)) return "Bu kullanici bulunamadi.";
        if (/NotAuthorized/i.test(name) || /Incorrect username or password/i.test(message)) return "Kullanici adi veya parola hatali.";
        if (/UserNotConfirmed/i.test(name) || /UserNotConfirmed/i.test(message)) return "Bu kullanici henuz dogrulanmamis.";
        if (/PasswordResetRequired/i.test(name) || /PasswordResetRequired/i.test(message)) return "Sifre sifirlama gerekiyor.";
        if (/Network/i.test(message) || /Failed to fetch/i.test(message)) return "Cognito servisine ulasilamadi. Ag veya CORS problemi olabilir.";

        return message || "Giris sirasinda beklenmeyen bir hata olustu.";
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
            showLoginError("Kullanici adi ve parola gerekli.");
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
            showLoginError(mapAuthError(error));
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
})();
