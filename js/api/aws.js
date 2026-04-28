const API_BASE = "https://o66ehjhmy5.execute-api.eu-central-1.amazonaws.com/prod";
const DASHBOARD_REFRESH_MS = 30000;
const AUTH_STORAGE_KEY = "solar8.auth.session";

const ENDPOINTS = {
    me: `${API_BASE}/me`,
    sites: `${API_BASE}/sites`,
    dashboardSummary: (siteId) => `${API_BASE}/sites/${encodeURIComponent(siteId)}/dashboard-summary`
};

async function _apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const token = _getIdToken();

    try {
        const res = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            ...options,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
            const detail = body?.error || body?.message || res.statusText;
            throw new Error(`HTTP ${res.status}: ${detail}`);
        }

        return _unwrapPayload(body);
    } finally {
        clearTimeout(timeout);
    }
}

window.fetchCurrentUser = async function fetchCurrentUser() {
    const json = await _apiFetch(ENDPOINTS.me);
    const user = _normaliseUser(json?.user || json);

    window.App.data.context.user = {
        ...(window.App.data.context.user || {}),
        ...user
    };

    _setText("user-name", user.name || "--");
    _setText("user-status", user.status || "--");

    return user;
};

window.fetchPlants = async function fetchPlants() {
    try {
        if (!window.App.data.context.user?.id) {
            await window.fetchCurrentUser?.();
        }

        const json = await _apiFetch(ENDPOINTS.sites);
        const plants = _normaliseSites(json?.sites || []);
        window.App.data.plants = plants;

        const selectedPlant = _pickSelectedPlant(plants);
        if (selectedPlant?.id !== undefined) {
            window.App.data.context.plant = selectedPlant;
        }

        _renderContextHeader();
        window.renderPlantList?.();
        return plants;
    } catch (err) {
        window.handleApiError("sites", err);
        _renderPlantLoadError(err);
        return [];
    }
};

window.fetchDashboardFromAWS = async function fetchDashboardFromAWS() {
    if (window.App.isRefreshing) return;

    const siteId = _getSelectedSiteId();
    if (siteId === null) {
        await window.fetchPlants?.();
        return;
    }

    window.App.isRefreshing = true;
    window.setLoadingState?.(true);

    try {
        const json = await _apiFetch(ENDPOINTS.dashboardSummary(siteId));
        _mapDashboardSummaryPayload(json);

        _renderContextHeader();
        window.renderApp?.();

        if (localStorage.getItem("activeTab") === "dashboard") {
            window.initCharts?.();
        }
    } catch (err) {
        window.handleApiError("dashboard-summary", err);
    } finally {
        window.App.isRefreshing = false;
        window.setLoadingState?.(false);
    }
};

window.fetchReports = async function fetchReports() {
    await window.fetchDashboardFromAWS?.();
    const lastId = localStorage.getItem("lastReportId") || Object.keys(window.App.data.reports ?? {})[0];
    if (lastId) window.loadReport?.(lastId);
};

window.fetchHistory = async function fetchHistory() {
    await window.fetchDashboardFromAWS?.();
};

window.startDashboardRefresh = function startDashboardRefresh() {
    if (window.App.dashboardIntervalId !== null) {
        clearInterval(window.App.dashboardIntervalId);
        window.App.dashboardIntervalId = null;
    }

    window.App.dashboardIntervalId = setInterval(() => {
        window.fetchDashboardFromAWS?.();
    }, DASHBOARD_REFRESH_MS);
};

window.stopDashboardRefresh = function stopDashboardRefresh() {
    if (window.App.dashboardIntervalId === null) return;
    clearInterval(window.App.dashboardIntervalId);
    window.App.dashboardIntervalId = null;
};

function _mapDashboardSummaryPayload(api) {
    if (!api || typeof api !== "object") {
        console.warn("[API:dashboard-summary] Beklenmeyen yanit formati:", api);
        return;
    }

    const apiSite = api.site ? _normaliseSite(api.site) : null;
    const selectedPlant = {
        ...(window.App.data.context.plant || {}),
        ...(apiSite || {})
    };

    if (selectedPlant?.id !== undefined) {
        window.App.data.context.plant = selectedPlant;
        localStorage.setItem("selectedPlant", JSON.stringify(selectedPlant));
    }

    const cards = api.cards || api.summary || api.dashboard || api.metrics || api;
    const instantPowerMw = _number(cards.instant_power_mw ?? cards.instantPowerMw);
    const instantPowerW = _number(cards.instant_power_w ?? cards.instantPowerW);
    const dailyProductionMwh = _number(cards.daily_production_mwh ?? cards.dailyProductionMwh);
    const dailyProductionKwh = _number(cards.daily_production_kwh ?? cards.dailyProductionKwh);
    const revenueUsd = _number(cards.daily_revenue_usd ?? cards.dailyRevenueUsd ?? cards.revenue);
    const activeFaultCount = _number(cards.active_fault_count ?? cards.activeFaultCount) || 0;

    const instantPower = instantPowerMw ?? (instantPowerW !== null ? instantPowerW / 1000000 : null);
    const dailyProduction = dailyProductionMwh ?? (dailyProductionKwh !== null ? dailyProductionKwh / 1000 : null);

    window.App.data.live = {
        instantPower,
        dailyProduction,
        revenue: revenueUsd,
        hourlyLabels: [],
        hourlyData: [],
        riskTitle: activeFaultCount > 0
            ? { tr: "Aktif Ariza", en: "Active Fault" }
            : { tr: "Stabil", en: "Stable" },
        riskLevel: activeFaultCount > 0 ? Math.min(activeFaultCount * 20, 100) : 0,
        riskDesc: activeFaultCount > 0
            ? { tr: `${activeFaultCount} aktif ariza kaydi var.`, en: `${activeFaultCount} active fault records.` }
            : { tr: "Aktif ariza kaydi bulunmuyor.", en: "No active fault records." },
        alertMsg: activeFaultCount > 0
            ? { tr: "Santral icin aktif ariza kontrolu gerekli.", en: "Active fault review is required for this site." }
            : { tr: "Santral icin kritik alarm bulunmuyor.", en: "No critical alarm for this site." },
        monthlyProduction: null,
        monthlyRevenue: null,
        carbonOffset: null,
        collectionRate: null,
        treesEquivalent: null,
        efficiency: null,
        riskyDevices: null,
        faultyPanels: activeFaultCount,
        totalPanels: null,
        detectTime: null,
        predictions: [],
        activeFaults: [],
        projection: { labels: [], p50: [], p10: [] }
    };

    window.App.data.reports = window.App.data.reports || null;
    window.App.data.history = window.App.data.history || [];

    if (!window.App.weatherStarted) {
        const { lat, lon } = window.App.data.context.plant || {};
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            window.startWeatherRefresh?.();
            window.App.weatherStarted = true;
        }
    }
}

function _normaliseSites(sites) {
    return (Array.isArray(sites) ? sites : [])
        .map(_normaliseSite);
}

function _unwrapPayload(payload) {
    if (!payload || typeof payload !== "object") return payload;

    if (typeof payload.body === "string") {
        try {
            return JSON.parse(payload.body);
        } catch {
            return payload;
        }
    }

    return payload;
}

function _normaliseSite(site, index = 0) {
    const capacityKwp = _number(site.installed_capacity_kwp ?? site.installedCapacityKwp);
    const capacityW = _number(site.installed_capacity_w ?? site.installedCapacityW);
    const capacityMw = _number(site.capacity ?? site.capacityMw);

    return {
        ...site,
        id: site.site_id ?? site.siteId ?? site.id ?? index,
        siteId: site.site_id ?? site.siteId ?? site.id ?? index,
        siteUuid: site.site_uuid ?? site.siteUuid ?? null,
        siteCodePrefix: site.site_code_prefix ?? site.siteCodePrefix ?? null,
        name: site.name ?? site.title ?? `Plant ${index + 1}`,
        city: site.city ?? null,
        address: site.address ?? null,
        timezone: site.timezone ?? null,
        status: site.status ?? null,
        lat: _number(site.latitude ?? site.lat),
        lon: _number(site.longitude ?? site.lon ?? site.lng),
        capacity: capacityMw ?? (capacityKwp !== null ? capacityKwp / 1000 : (capacityW !== null ? capacityW / 1000000 : null))
    };
}

function _normaliseUser(user) {
    const name = user.full_name || user.fullName || user.name || user.email || "--";
    const status = user.role_name || user.role || user.company_name || user.companyName || (user.is_active === false ? "Pasif" : "Aktif");

    return {
        ...user,
        id: user.id ?? null,
        companyId: user.company_id ?? user.companyId ?? null,
        roleId: user.role_id ?? user.roleId ?? null,
        cognitoSub: user.cognito_sub ?? user.cognitoSub ?? null,
        fullName: user.full_name ?? user.fullName ?? name,
        companyName: user.company_name ?? user.companyName ?? null,
        name,
        email: user.email ?? null,
        status
    };
}

function _pickSelectedPlant(plants) {
    const current = window.App.data.context.plant || {};
    const selected = plants.find((plant) =>
        String(plant.id) === String(current.id) ||
        String(plant.siteId) === String(current.siteId) ||
        String(plant.siteCodePrefix || "") === String(current.siteCodePrefix || "")
    );

    return selected || plants[0] || null;
}

function _getSelectedSiteId() {
    const plant = window.App.data.context.plant || {};
    const siteId = plant.siteId ?? plant.site_id ?? plant.id;
    return siteId === undefined || siteId === null || siteId === "" ? null : siteId;
}

function _getIdToken() {
    const session = _readAuthSession();
    return session?.tokens?.idToken || null;
}

function _readAuthSession() {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function _number(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function _renderContextHeader() {
    const user = window.App.data.context.user || {};
    const plant = window.App.data.context.plant || {};

    _setText("user-name", user.name || user.fullName || user.email || "--");
    _setText("user-status", user.status || "--");
    _setText("plant-title", window.localise(plant.name) || plant.name || "--");
}

function _renderPlantLoadError(error) {
    console.error("[API:sites]", error);
    window.App.data.plants = [];

    const container = document.getElementById("plant-list-container");
    if (!container) return;

    const t = window.TRANSLATIONS?.[window.App.lang] || {};
    container.innerHTML = `
        <div class="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 leading-relaxed">
            ${t.error_data_source || "Veri kaynagina ulasilamiyor"}
        </div>
    `;
}

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
