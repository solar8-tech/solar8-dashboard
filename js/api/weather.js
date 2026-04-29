// weather.js

window.fetchWeather = async function fetchWeather(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.warn("[Weather] Geçersiz koordinat:", lat, lon);
        return;
    }

    try {
        if (!window.OPEN_WEATHER_KEY) throw new Error("OpenWeather API key eksik");

        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=en&appid=${window.OPEN_WEATHER_KEY}`
        );
        if (!res.ok) throw new Error(`Weather API: HTTP ${res.status}`);

        const data = await res.json();
        const t = window.TRANSLATIONS[window.App.lang] ?? {};
        const cloudiness = Math.round(data.clouds?.all ?? 0);
        const isLowImpact = cloudiness > 70;

        const city = data.name || window.App.data.context.plant?.city || "--";
        _setText("w-city", city);
        _setText("w-temp", `${Math.round(data.main.temp)}°C`);
        _setText("w-wind", `${Math.round((data.wind?.speed ?? 0) * 3.6)} km/h`);
        _setText("w-hum", `%${data.main.humidity}`);
        _setText("w-sunrise", _formatLocalTime(data.sys?.sunrise, data.timezone));
        _setText("w-sunset", _formatLocalTime(data.sys?.sunset, data.timezone));

        const main = data.weather?.[0]?.main?.toLowerCase() ?? "";
        let descKey = "data_weather_default";
        if (main.includes("clear")) descKey = "data_weather_clear";
        else if (main.includes("cloud")) descKey = "data_weather_clouds";
        else if (main.includes("rain") || main.includes("drizzle")) descKey = "data_weather_rain";
        else if (main.includes("snow")) descKey = "data_weather_snow";

        _setText("w-desc", t[descKey] ?? "--");
        _setImpactState(isLowImpact, cloudiness, t);
    } catch (err) {
        console.error("[Weather] Fetch failed:", err);
        const t = window.TRANSLATIONS[window.App.lang] ?? {};

        _setText("w-city", window.App.data.context.plant?.city ?? "--");
        _setText("w-temp", "--°C");
        _setText("w-wind", "--");
        _setText("w-hum", "--");
        _setText("w-desc", t.weather_service_unavailable ?? "Service Unavailable");
        _setText("w-sunrise", "--");
        _setText("w-sunset", "--");
        _setImpactFallback(t);
    }
};

window.startWeatherRefresh = function startWeatherRefresh() {
    const { lat, lon } = window.App.data.context?.plant ?? {};
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.warn("[Weather] Refresh skipped due to invalid plant coordinates:", window.App.data.context?.plant);
        return;
    }

    window.App.weatherCoordsKey = `${lat},${lon}`;
    window.fetchWeather(lat, lon);

    if (window.App.weatherIntervalId !== null) {
        clearInterval(window.App.weatherIntervalId);
        window.App.weatherIntervalId = null;
    }
    window.App.weatherIntervalId = setInterval(() => window.fetchWeather(lat, lon), 5 * 60 * 1000);
};

window.syncWeatherToActivePlant = function syncWeatherToActivePlant(force = false) {
    const { lat, lon } = window.App.data.context?.plant ?? {};
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.warn("[Weather] Sync skipped due to invalid plant coordinates:", window.App.data.context?.plant);
        return;
    }

    const nextCoordsKey = `${lat},${lon}`;
    if (!force && window.App.weatherCoordsKey === nextCoordsKey && window.App.weatherIntervalId !== null) {
        return;
    }

    window.startWeatherRefresh();
};

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function _formatLocalTime(unixSeconds, timezoneOffsetSeconds = 0) {
    if (!Number.isFinite(unixSeconds)) return "--";

    const localDate = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
    const hours = String(localDate.getUTCHours()).padStart(2, "0");
    const minutes = String(localDate.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function _setImpactState(isLowImpact, cloudiness, t) {
    const impactEl = document.getElementById("w-impact");
    const impactTextEl = impactEl?.querySelector("span");
    const impactTooltipEl = document.getElementById("w-impact-tooltip");
    if (!impactEl || !impactTextEl) return;

    impactTextEl.innerText = isLowImpact
        ? (t.weather_impact_low ?? "Impact: Low")
        : (t.weather_impact_normal ?? "Impact: Normal");

    impactEl.className = isLowImpact
        ? "inline-flex items-center gap-0.5 sm:gap-1 max-w-full text-[6px] sm:text-[8px] lg:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] px-1 sm:px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 whitespace-nowrap transition-colors"
        : "inline-flex items-center gap-0.5 sm:gap-1 max-w-full text-[6px] sm:text-[8px] lg:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] px-1 sm:px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap transition-colors";

    if (impactTooltipEl) {
        const template = isLowImpact
            ? (t.weather_impact_tooltip_low ?? "Cloud cover is %{cloudiness}.")
            : (t.weather_impact_tooltip_normal ?? "Cloud cover is %{cloudiness}.");
        impactTooltipEl.innerText = _formatTranslation(template, { cloudiness: `%${cloudiness}` });
    }
}

function _setImpactFallback(t) {
    const impactTextEl = document.getElementById("w-impact")?.querySelector("span");
    const impactTooltipEl = document.getElementById("w-impact-tooltip");

    if (impactTextEl) impactTextEl.innerText = "--";
    if (impactTooltipEl) {
        impactTooltipEl.innerText = t.weather_impact_tooltip_fallback
            ?? "Cloud cover data is unavailable. Production impact is shown when the weather service responds.";
    }
}

function _formatTranslation(template, values = {}) {
    return Object.entries(values).reduce(
        (result, [key, value]) => result.replaceAll(`%{${key}}`, String(value)),
        template
    );
}
