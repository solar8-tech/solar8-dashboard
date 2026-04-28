const API_BASE = "https://0uxb8wh1x8.execute-api.eu-central-1.amazonaws.com/dev";
const LIVE_REFRESH_MS = 5000;
const EPIAS_BASE_URL = "https://jf9xwpexhf.execute-api.eu-central-1.amazonaws.com/epias";
const EPIAS_CACHE_MS = 15 * 60 * 1000;

const ENDPOINTS = {
    live: `${API_BASE}/live`
};

async function _apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(url, {
            method: "GET",
            signal: controller.signal,
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
        const [json, epias] = await Promise.all([
            _apiFetch(ENDPOINTS.live),
            _fetchEpiasBasePrice()
        ]);
        _mapLivePayload(json);
        _applyEpiasBasePrice(epias);

        _setText("user-name", window.App.data.context.user?.name ?? "--");
        _setText("user-status", window.App.data.context.user?.status ?? "--");

        const pName = window.App.data.context.plant?.name;
        _setText("plant-title", typeof pName === "object"
            ? (pName[window.App.lang] || pName.tr || "--")
            : (pName ?? "--"));

        window.renderApp?.();
        window.renderPlantList?.();

        if (localStorage.getItem("activeTab") === "dashboard") {
            window.initCharts?.();
        }
    } catch (err) {
        window.handleApiError("live", err);
    } finally {
        window.App.isRefreshing = false;
        window.setLoadingState?.(false);
    }
};

window.fetchPlants = async function fetchPlants() {
    await window.fetchDashboardFromAWS?.();
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
    }, LIVE_REFRESH_MS);
};

window.stopDashboardRefresh = function stopDashboardRefresh() {
    if (window.App.dashboardIntervalId === null) return;
    clearInterval(window.App.dashboardIntervalId);
    window.App.dashboardIntervalId = null;
};

function _mapLivePayload(api) {
    if (!api || typeof api !== "object") {
        console.warn("[API:live] Beklenmeyen yanit formati:", api);
        return;
    }

    const toCoord = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const plants = _normalisePlants(api, toCoord);
    const selectedPlant = _pickSelectedPlant(plants);
    const liveSource = _pickLiveSource(api, selectedPlant);

    window.App.data.plants = plants;
    window.App.data.context = {
        user: {
            name: api.user?.name ?? api.userName ?? window.App.data.context.user?.name ?? null,
            status: api.user?.status ?? api.userStatus ?? window.App.data.context.user?.status ?? null
        },
        plant: selectedPlant
    };

    window.App.data.live = {
        instantPower: liveSource.instantPower ?? api.instantPower ?? null,
        dailyProduction: liveSource.dailyProduction ?? api.dailyProduction ?? null,
        revenue: liveSource.revenue ?? api.revenue ?? null,
        basePrice: liveSource.basePrice ?? api.basePrice ?? null,
        basePriceLabel: liveSource.basePriceLabel ?? api.basePriceLabel ?? null,
        hourlyLabels: Array.isArray(liveSource.hourlyLabels) ? liveSource.hourlyLabels : [],
        hourlyData: Array.isArray(liveSource.hourlyData) ? liveSource.hourlyData : [],
        riskTitle: liveSource.riskTitle ?? null,
        riskLevel: typeof liveSource.riskLevel === "number" ? liveSource.riskLevel : 0,
        riskDesc: liveSource.riskDesc ?? null,
        alertMsg: liveSource.alertMsg ?? null,
        monthlyProduction: liveSource.monthlyProduction ?? null,
        monthlyRevenue: liveSource.monthlyRevenue ?? null,
        carbonOffset: liveSource.carbonOffset ?? null,
        collectionRate: liveSource.collectionRate ?? null,
        treesEquivalent: liveSource.treesEquivalent ?? null,
        efficiency: liveSource.efficiency ?? api.efficiency ?? null,
        riskyDevices: liveSource.riskyDevices ?? null,
        faultyPanels: liveSource.faultyPanels ?? null,
        totalPanels: liveSource.totalPanels ?? null,
        detectTime: liveSource.detectTime ?? null,
        predictions: Array.isArray(liveSource.predictions) ? liveSource.predictions : [],
        activeFaults: Array.isArray(liveSource.activeFaults) ? liveSource.activeFaults : [],
        projection: liveSource.projection ?? { labels: [], p50: [], p10: [] }
    };

    const mappedBasePrice = _toFiniteNumber(window.App.data.live.basePrice);
    if (Number.isFinite(mappedBasePrice) && !window.App.data.live.basePriceLabel) {
        window.App.data.live.basePrice = mappedBasePrice;
        window.App.data.live.basePriceLabel = _formatEpiasPrice(mappedBasePrice, api.basePriceUnit ?? liveSource.basePriceUnit);
    }

    window.App.data.reports = _normaliseReports(api, selectedPlant);
    window.App.data.history = _normaliseHistory(api, selectedPlant);

    if (!window.App.weatherStarted) {
        const { lat, lon } = window.App.data.context.plant;
        if (lat !== null && lon !== null) {
            window.startWeatherRefresh?.();
            window.App.weatherStarted = true;
        }
    }
}

function _normalisePlants(api, toCoord) {
    const rawPlants = [
        ...(Array.isArray(api.plants) ? api.plants : []),
        ...(Array.isArray(api.live?.plants) ? api.live.plants : []),
        ...(Array.isArray(api.data?.plants) ? api.data.plants : [])
    ];

    const plants = rawPlants.map((plant, index) => {
        const lat = toCoord(plant.lat ?? plant.latitude ?? plant.coords?.[0] ?? plant.location?.lat);
        const lon = toCoord(plant.lon ?? plant.lng ?? plant.longitude ?? plant.coords?.[1] ?? plant.location?.lon ?? plant.location?.lng);

        return {
            ...plant,
            id: plant.id ?? plant.plantId ?? index,
            name: plant.name ?? plant.plantName ?? plant.title ?? `Plant ${index + 1}`,
            city: plant.city ?? plant.location?.city ?? null,
            lat,
            lon,
            capacity: plant.capacity ?? plant.capacityMw ?? plant.installedPower ?? null,
            inverters: plant.inverters ?? plant.inverterCount ?? null
        };
    }).filter((plant) => Number.isFinite(plant.lat) && Number.isFinite(plant.lon));

    if (plants.length > 0) return plants;

    const fallbackPlant = {
        id: api.plant?.id ?? api.plantId ?? window.App.data.context.plant?.id ?? "live",
        name: api.plant?.name ?? api.plantName ?? window.App.data.context.plant?.name ?? null,
        city: api.plant?.city ?? api.city ?? window.App.data.context.plant?.city ?? null,
        lat: toCoord(api.plant?.lat ?? api.lat ?? window.App.data.context.plant?.lat),
        lon: toCoord(api.plant?.lon ?? api.lng ?? api.lon ?? window.App.data.context.plant?.lon)
    };

    return Number.isFinite(fallbackPlant.lat) && Number.isFinite(fallbackPlant.lon) ? [fallbackPlant] : [];
}

function _pickSelectedPlant(plants) {
    const current = window.App.data.context.plant ?? {};
    const currentName = _plantName(current.name);

    const selected = plants.find((plant) =>
        (current.id !== undefined && plant.id === current.id) ||
        (currentName && _plantName(plant.name) === currentName) ||
        (Number.isFinite(current.lat) && Number.isFinite(current.lon) && plant.lat === current.lat && plant.lon === current.lon)
    );

    return {
        ...(plants[0] ?? {}),
        ...current,
        ...(selected ?? plants[0] ?? {})
    };
}

function _pickLiveSource(api, selectedPlant) {
    const currentName = _plantName(selectedPlant?.name);
    const namedPlantPayload = (Array.isArray(api.plants) ? api.plants : []).find((plant) =>
        _plantName(plant?.name ?? plant?.plantName) === currentName
    );

    return namedPlantPayload ?? api.live ?? api.dashboard ?? api.metrics ?? api;
}

function _normaliseReports(api, selectedPlant) {
    if (api.reports && typeof api.reports === "object" && !Array.isArray(api.reports)) return api.reports;
    if (selectedPlant?.reports && typeof selectedPlant.reports === "object") return selectedPlant.reports;
    return window.App.data.reports ?? null;
}

function _normaliseHistory(api, selectedPlant) {
    if (Array.isArray(api.history)) return api.history;
    if (Array.isArray(selectedPlant?.history)) return selectedPlant.history;
    if (Array.isArray(api.activeFaults)) return api.activeFaults;
    return window.App.data.history ?? [];
}

function _plantName(value) {
    return String(window.localise(value) ?? value ?? "").trim().toLowerCase();
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
