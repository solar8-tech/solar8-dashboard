// ui/aws.js

const API_BASE = //"https://0uxb8wh1x8.execute-api.eu-central-1.amazonaws.com/dev";

const ENDPOINTS = {
    live    : //"https://gist.githubusercontent.com/talhakocak/105539e0cfa7f8a11e9dd5ff90b1c7c1/raw/solar8-mock-data.json",
    plants  : //'data:application/json;charset=utf-8,{"plants":[{"name":{"tr":"Okan Üniversitesi Sahası","en":"Okan University Site"},"lat":40.9538,"lon":29.3923,"capacity":1.2,"inverters":12}]}',
    reports : `${API_BASE}/reports`,
    history : `${API_BASE}/history`
};

async function _apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(url, {
            method : "GET",
            signal : controller.signal,
            ...options
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    } finally {
        clearTimeout(timeout);
    }
}

window.fetchDashboardFromAWS = async function fetchDashboardFromAWS() {
    if (window.App.isRefreshing) return;
    window.App.isRefreshing = true;
    window.setLoadingState?.(true);

    try {
        const json = await _apiFetch(ENDPOINTS.live);
        _mapLiveData(json);
        _setText("user-name",   window.App.data.context.user?.name   ?? "--");
        _setText("user-status", window.App.data.context.user?.status ?? "--");

        const pName = window.App.data.context.plant?.name;
        _setText("plant-title", typeof pName === "object"
            ? (pName[window.App.lang] || pName.tr || "--")
            : (pName ?? "--")
        );

        if (typeof window.renderApp === "function") window.renderApp();

        if (!window.App.charts.main && localStorage.getItem("activeTab") === "dashboard") {
            if (typeof window.initCharts === "function") window.initCharts();
        }
    } catch (err) {
        window.handleApiError("live", err);
    } finally {
        window.App.isRefreshing = false;
        window.setLoadingState?.(false);
    }
};

window.fetchPlants = async function fetchPlants() {
    try {
        const json = await _apiFetch(ENDPOINTS.plants);
        window.App.data.plants = Array.isArray(json) ? json : (json.plants ?? []);
        if (typeof window.renderPlantList === "function") window.renderPlantList();
    } catch (err) {
        window.handleApiError("plants", err);
        window.App.data.plants = [];
        if (typeof window.renderPlantList === "function") window.renderPlantList();
    }
};

window.fetchReports = async function fetchReports() {
    try {
        const json = await _apiFetch(ENDPOINTS.reports);
        window.App.data.reports = json;
        const lastId = localStorage.getItem("lastReportId") || "monthly";
        if (typeof window.loadReport === "function") window.loadReport(lastId);
    } catch (err) {
        window.handleApiError("reports", err);
    }
};

window.fetchHistory = async function fetchHistory() {
    try {
        const json = await _apiFetch(ENDPOINTS.history);
        window.App.data.history = Array.isArray(json) ? json : (json.history ?? []);
    } catch (err) {
        window.handleApiError("history", err);
        window.App.data.history = [];
    }
};

function _mapLiveData(api) {
    if (!api || typeof api !== "object") {
        console.warn("[API:live] Beklenmeyen yanıt formatı:", api);
        return;
    }

    const _coord = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
    };

    window.App.data.context = {
        user : {
            name  : api.user?.name   ?? api.userName   ?? null,
            status: api.user?.status ?? api.userStatus ?? null
        },
        plant: {
            name: api.plant?.name ?? api.plantName ?? null,
            city: api.plant?.city ?? api.city      ?? null,
            lat : _coord(api.plant?.lat ?? api.lat),
            lon : _coord(api.plant?.lon ?? api.lon)
        }
    };

    window.App.data.live = {
        instantPower    : api.instantPower    ?? null,
        dailyProduction : api.dailyProduction ?? null,
        revenue         : api.revenue         ?? null,

        hourlyLabels    : Array.isArray(api.hourlyLabels) ? api.hourlyLabels : [],
        hourlyData      : Array.isArray(api.hourlyData)   ? api.hourlyData   : [],

        riskTitle       : api.riskTitle ?? null,
        riskLevel       : typeof api.riskLevel === "number" ? api.riskLevel : 0,
        riskDesc        : api.riskDesc  ?? null,
        alertMsg        : api.alertMsg  ?? null,

        monthlyProduction : api.monthlyProduction ?? null,
        monthlyRevenue    : api.monthlyRevenue    ?? null,
        carbonOffset      : api.carbonOffset      ?? null,
        collectionRate    : api.collectionRate    ?? null,
        treesEquivalent   : api.treesEquivalent   ?? null,

        efficiency    : api.efficiency    ?? null,
        riskyDevices  : api.riskyDevices  ?? null,
        faultyPanels  : api.faultyPanels  ?? null,
        totalPanels   : api.totalPanels   ?? null,
        detectTime    : api.detectTime    ?? null,

        predictions : Array.isArray(api.predictions)  ? api.predictions  : [],
        activeFaults: Array.isArray(api.activeFaults)  ? api.activeFaults : [],

        projection  : api.projection ?? { labels: [], p50: [], p10: [] }
    };

    if (!window.App.weatherStarted) {
        const { lat, lon } = window.App.data.context.plant;
        if (lat !== null && lon !== null) {
            if (typeof window.startWeatherRefresh === "function") window.startWeatherRefresh();
            window.App.weatherStarted = true;
        }
    }
}

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
