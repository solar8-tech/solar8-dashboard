const API_BASE = "https://o66ehjhmy5.execute-api.eu-central-1.amazonaws.com/prod";
const DASHBOARD_REFRESH_MS = 30000;
const DEVICE_DATA_STALE_MS = 4 * 60 * 1000;
const AUTH_STORAGE_KEY = "solar8.auth.session";
const EPIAS_BASE_URL = "https://jf9xwpexhf.execute-api.eu-central-1.amazonaws.com/epias";
const EPIAS_CACHE_MS = 15 * 60 * 1000;

const ENDPOINTS = {
    me: `${API_BASE}/me`,
    sites: `${API_BASE}/sites`,
    dashboardSummary: (siteId) => `${API_BASE}/sites/${encodeURIComponent(siteId)}/dashboard-summary`
};

async function _apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const token = _getIdToken();
    const shouldAttachAuth = options.attachAuth ?? url.startsWith(API_BASE);

    try {
        const res = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            ...options,
            headers: {
                ...(shouldAttachAuth && token ? { Authorization: `Bearer ${token}` } : {}),
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
    const siteId = _getSelectedSiteId();
    if (siteId === null) {
        await window.fetchPlants?.();
        return;
    }

    const requestId = ++window.App.dashboardRequestSeq;
    const requestedSiteId = String(siteId);
    window.App.dashboardPendingCount += 1;
    window.App.isRefreshing = true;
    window.setLoadingState?.(true);

    try {
        const [json, epias] = await Promise.all([
            _apiFetch(ENDPOINTS.dashboardSummary(siteId)),
            _fetchEpiasBasePrice()
        ]);

        const activeSiteId = String(_getSelectedSiteId() ?? "");
        if (requestId !== window.App.dashboardRequestSeq || activeSiteId !== requestedSiteId) {
            return;
        }

        _mapDashboardSummaryPayload(json);
        _applyEpiasBasePrice(epias);

        _renderContextHeader();
        window.renderApp?.();

        if (localStorage.getItem("activeTab") === "dashboard") {
            window.initCharts?.();
        }
    } catch (err) {
        if (requestId === window.App.dashboardRequestSeq) {
            window.handleApiError("dashboard-summary", err);
        }
    } finally {
        window.App.dashboardPendingCount = Math.max(0, window.App.dashboardPendingCount - 1);
        if (window.App.dashboardPendingCount === 0) {
            window.App.isRefreshing = false;
            window.setLoadingState?.(false);
        }
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

    const currentPlant = window.App.data.context.plant || {};
    const apiSite = api.site ? _normaliseSite(api.site) : null;
    const selectedPlant = {
        ...currentPlant,
        ...(apiSite || {})
    };

    if (!Number.isFinite(selectedPlant.lat) && Number.isFinite(currentPlant.lat)) {
        selectedPlant.lat = currentPlant.lat;
    }
    if (!Number.isFinite(selectedPlant.lon) && Number.isFinite(currentPlant.lon)) {
        selectedPlant.lon = currentPlant.lon;
    }

    if (selectedPlant?.id !== undefined) {
        window.App.data.context.plant = selectedPlant;
        localStorage.setItem("selectedPlant", JSON.stringify(selectedPlant));
    }

    const cards = api.cards || api.summary || api.dashboard || api.metrics || api;
    const instantPowerKw = _number(cards.instant_power_kw ?? cards.instantPowerKw);
    const instantPowerMw = _number(cards.instant_power_mw ?? cards.instantPowerMw);
    const instantPowerW = _number(cards.instant_power_w ?? cards.instantPowerW);
    const dailyProductionMwh = _number(cards.daily_production_mwh ?? cards.dailyProductionMwh);
    const dailyProductionKwh = _number(cards.daily_production_kwh ?? cards.dailyProductionKwh);
    const revenue = _number(
        cards.daily_revenue_try ??
        cards.dailyRevenueTry ??
        cards.daily_revenue_tl ??
        cards.dailyRevenueTl ??
        cards.daily_revenue ??
        cards.dailyRevenue ??
        cards.revenue
    );
    const activeFaultCount = _number(cards.active_fault_count ?? cards.activeFaultCount) || 0;
    const apiRiskTitle = _pickLocalizedValue(
        cards.risk_title ?? cards.riskTitle ?? api.risk_title ?? api.riskTitle
    );
    const apiRiskDesc = _pickLocalizedValue(
        cards.risk_desc ?? cards.riskDesc ?? api.risk_desc ?? api.riskDesc
    );
    const apiAlertMsg = _pickLocalizedValue(
        cards.alert_message ??
        cards.alertMessage ??
        cards.alert_msg ??
        cards.alertMsg ??
        api.alert_message ??
        api.alertMessage ??
        api.alert_msg ??
        api.alertMsg
    );

    const instantPower = instantPowerKw ?? (instantPowerW !== null ? instantPowerW / 1000 : (instantPowerMw !== null ? instantPowerMw * 1000 : null));
    const dailyProduction = dailyProductionKwh ?? (dailyProductionMwh !== null ? dailyProductionMwh * 1000 : null);
    const basePrice = _toFiniteNumber(
        cards.base_price ??
        cards.basePrice ??
        cards.epias_ptf ??
        cards.epiasPtf
    );
    const basePriceUnit = cards.base_price_unit ?? cards.basePriceUnit ?? "TL/MWh";
    const dataFreshness = _resolveDataFreshness(api, cards);

    window.App.data.live = {
        instantPower,
        dailyProduction,
        revenue,
        deviceActive: dataFreshness.isActive,
        dataFreshness,
        basePrice,
        basePriceLabel: Number.isFinite(basePrice) ? _formatEpiasPrice(basePrice, basePriceUnit) : null,
        hourlyLabels: [],
        hourlyData: [],
        riskTitle: apiRiskTitle ?? { tr: "Stabil", en: "Stable" },
        riskLevel: activeFaultCount > 0 ? Math.min(activeFaultCount * 20, 100) : 0,
        riskDesc: apiRiskDesc ?? { tr: "Aktif arıza kaydı bulunmuyor.", en: "No active fault records." },
        alertMsg: apiAlertMsg ?? { tr: "Santral için kritik alarm bulunmuyor.", en: "No critical alarm for this site." },
        monthlyProduction: _number(cards.monthly_production_mwh ?? cards.monthlyProductionMwh),
        monthlyRevenue: _number(cards.monthly_revenue_try ?? cards.monthlyRevenueTry ?? cards.monthly_revenue ?? cards.monthlyRevenue),
        carbonOffset: _number(cards.carbon_offset ?? cards.carbonOffset),
        collectionRate: _number(cards.collection_rate ?? cards.collectionRate),
        treesEquivalent: _number(cards.trees_equivalent ?? cards.treesEquivalent),
        efficiency: _number(cards.efficiency ?? api.efficiency),
        riskyDevices: _number(cards.risky_devices ?? cards.riskyDevices),
        faultyPanels: activeFaultCount,
        totalPanels: _number(cards.total_panels ?? cards.totalPanels),
        detectTime: _number(cards.detect_time ?? cards.detectTime),
        predictions: Array.isArray(api.predictions) ? api.predictions : [],
        activeFaults: Array.isArray(api.activeFaults) ? api.activeFaults : [],
        projection: api.projection ?? { labels: [], p50: [], p10: [] }
    };

    window.App.data.reports = api.reports ?? window.App.data.reports ?? null;
    window.App.data.history = api.history ?? api.activeFaults ?? window.App.data.history ?? [];

    window.syncWeatherToActivePlant?.();
}

function _normaliseSites(sites) {
    return (Array.isArray(sites) ? sites : []).map(_normaliseSite);
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

function _pickLocalizedValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "object") {
        const tr = _cleanText(value.tr);
        const en = _cleanText(value.en);
        if (tr || en) return { tr: tr ?? en, en: en ?? tr };
        return null;
    }

    const cleaned = _cleanText(value);
    return cleaned ? { tr: cleaned, en: cleaned } : null;
}

function _cleanText(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function _normaliseSite(site, index = 0) {
    const capacityKwp = _number(site.installed_capacity_kwp ?? site.installedCapacityKwp);
    const capacityW = _number(site.installed_capacity_w ?? site.installedCapacityW);
    const capacityMw = _number(site.capacity ?? site.capacityMw);
    const lat = _number(
        site.latitude ??
        site.lat ??
        site.site_latitude ??
        site.siteLatitude ??
        site.coordinate_latitude ??
        site.coordinateLatitude ??
        site.location_lat ??
        site.locationLat ??
        site.coords?.lat ??
        site.coordinates?.lat ??
        site.coordinates?.latitude
    );
    const lon = _number(
        site.longitude ??
        site.lon ??
        site.lng ??
        site.site_longitude ??
        site.siteLongitude ??
        site.coordinate_longitude ??
        site.coordinateLongitude ??
        site.location_lon ??
        site.locationLon ??
        site.location_lng ??
        site.locationLng ??
        site.coords?.lon ??
        site.coords?.lng ??
        site.coordinates?.lon ??
        site.coordinates?.lng ??
        site.coordinates?.longitude
    );

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
        lat,
        lon,
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
    const parsed = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function _resolveDataFreshness(api, cards) {
    const timestampValue = _pickFirstPresent([
        api.timestamp_utc,
        api.inverter_telemetry_data?.meta?.timestamp_utc,
        cards.timestamp_utc,
        cards.inverter_telemetry_data?.meta?.timestamp_utc
    ]);

    const telemetryOk = _pickFirstPresent([
        api.telemetry?.is_data_read_successful,
        api.http?.is_last_http_send_successful,
        api.network?.is_connected,
        api.wifi?.is_wifi_connected
    ]);

    const lastSeenAt = _parseApiTimestamp(timestampValue);
    const ageMs = lastSeenAt ? Date.now() - lastSeenAt.getTime() : null;
    const isStale = Number.isFinite(ageMs) && ageMs > DEVICE_DATA_STALE_MS;

    if (isStale) {
        return { isActive: false, reason: "stale", telemetryOk: telemetryOk ?? null, lastSeenAt: lastSeenAt.toISOString(), rawTimestamp: timestampValue ?? null, ageMs };
    }

    if (timestampValue !== undefined && timestampValue !== null && timestampValue !== "" && !lastSeenAt) {
        return { isActive: false, reason: "invalid_timestamp", telemetryOk: telemetryOk ?? null, lastSeenAt: null, rawTimestamp: timestampValue, ageMs: null };
    }

    if (lastSeenAt) {
        return { isActive: true, reason: "fresh", telemetryOk: telemetryOk ?? null, lastSeenAt: lastSeenAt.toISOString(), rawTimestamp: timestampValue ?? null, ageMs };
    }

    return { isActive: true, reason: "missing_timestamp", telemetryOk: telemetryOk ?? null, lastSeenAt: null, rawTimestamp: null, ageMs: null };
}

function _pickFirstPresent(values) {
    return values.find((value) => value !== null && value !== undefined && value !== "");
}

function _parseApiTimestamp(value) {
    if (value === null || value === undefined || value === "") return null;

    const text = String(value).trim();
    const date = new Date(text);
    return Number.isFinite(date.getTime()) ? date : null;
}

function _renderContextHeader() {
    const user = window.App.data.context.user || {};
    const plant = window.App.data.context.plant || {};

    _setText("user-name", user.name || user.fullName || user.email || "--");
    _setText("user-status", user.status || "--");
    _setText("plant-title", window.localise(plant.name) || plant.name || "--");
}

window.renderContextHeader = _renderContextHeader;

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

async function _fetchEpiasBasePrice() {
    const cached = window.App.epiasCache;
    if (cached?.fetchedAt && Date.now() - cached.fetchedAt < EPIAS_CACHE_MS) {
        return cached.data;
    }

    try {
        const payload = _buildEpiasPayload();
        const data = await _apiFetch(EPIAS_BASE_URL, {
            method: "POST",
            attachAuth: false,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const parsed = _normaliseEpiasResponse(data);
        window.App.epiasCache = { fetchedAt: Date.now(), data: parsed };
        return parsed;
    } catch (error) {
        console.warn("[API:epias]", error);
        return cached?.data ?? null;
    }
}

function _buildEpiasPayload() {
    const today = _getIstanbulDateParts();
    return {
        startDate: `${today}T00:00:00+03:00`,
        endDate: `${today}T23:59:59+03:00`,
        page: {
            number: 1,
            size: 100,
            sort: { direction: "ASC", field: "date" }
        }
    };
}

function _getIstanbulDateParts() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
}

function _normaliseEpiasResponse(raw) {
    const root = raw?.data ?? raw?.body ?? raw;
    const items = Array.isArray(root?.items) ? root.items : Array.isArray(root) ? root : [];
    const stats = root?.statistic ?? root?.statistics ?? root?.summary ?? {};

    const numericCandidates = [
        stats.ptfWeightedAvg,
        stats.priceAvg,
        root?.ptfWeightedAvg,
        root?.priceAvg,
        _averageEpiasPrices(items),
        items[items.length - 1]?.price,
        items[items.length - 1]?.ptf
    ];

    const basePrice = numericCandidates
        .map(_toFiniteNumber)
        .find((value) => Number.isFinite(value)) ?? null;

    return {
        basePrice,
        unit: root?.unit ?? stats?.unit ?? "TL/MWh",
        items
    };
}

function _averageEpiasPrices(items) {
    const prices = items
        .map((item) => _toFiniteNumber(item?.price ?? item?.ptf))
        .filter((value) => Number.isFinite(value));

    if (prices.length === 0) return null;
    return prices.reduce((sum, value) => sum + value, 0) / prices.length;
}

function _toFiniteNumber(value) {
    const parsed = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function _applyEpiasBasePrice(epias) {
    if (!window.App.data.live || !Number.isFinite(epias?.basePrice)) return;

    window.App.data.live.basePrice = epias.basePrice;
    window.App.data.live.basePriceLabel = _formatEpiasPrice(epias.basePrice, epias.unit);
}

function _formatEpiasPrice(value, unit) {
    const formatted = Number(value).toLocaleString("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    return `${formatted} ${unit ?? "TL/MWh"}`;
}
