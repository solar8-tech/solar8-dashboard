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
        const t = window.TRANSLATIONS[window.App.lang];
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
        _setImpactState(isLowImpact, cloudiness);
    } catch (err) {
        console.error("[Weather]", err);
        _setText("w-city", window.App.data.context.plant?.city ?? "--");
        _setText("w-desc", window.App.lang === "tr" ? "Servis Dışı" : "Service Unavailable");
        _setText("w-sunrise", "--");
        _setText("w-sunset", "--");
        _setImpactFallback();
    }
};

window.startWeatherRefresh = function startWeatherRefresh() {
    const { lat, lon } = window.App.data.context?.plant ?? {};
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    window.fetchWeather(lat, lon);

    if (window.App.weatherIntervalId !== null) {
        clearInterval(window.App.weatherIntervalId);
        window.App.weatherIntervalId = null;
    }
    window.App.weatherIntervalId = setInterval(() => window.fetchWeather(lat, lon), 5 * 60 * 1000);
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

function _setImpactState(isLowImpact, cloudiness) {
    const impactEl = document.getElementById("w-impact");
    const impactTextEl = impactEl?.querySelector("span");
    const impactTooltipEl = document.getElementById("w-impact-tooltip");
    if (!impactEl || !impactTextEl) return;

    impactTextEl.innerText = window.App.lang === "tr"
        ? (isLowImpact ? "Etki: Düşük" : "Etki: Normal")
        : (isLowImpact ? "Impact: Low" : "Impact: Normal");

    impactEl.className = isLowImpact
        ? "inline-flex items-center gap-1 max-w-full text-[7px] sm:text-[8px] lg:text-[10px] uppercase tracking-[0.16em] px-1.5 sm:px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 whitespace-nowrap transition-colors"
        : "inline-flex items-center gap-1 max-w-full text-[7px] sm:text-[8px] lg:text-[10px] uppercase tracking-[0.16em] px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap transition-colors";

    if (impactTooltipEl) {
        impactTooltipEl.innerText = window.App.lang === "tr"
            ? `Bulutluluk oranı %${cloudiness}. Bu seviye güneşlenmeyi ${isLowImpact ? "daha fazla baskıladığı için üretime etkisi düşük" : "çok sınırlı etkilediği için üretime etkisi normal"} görünüyor.`
            : `Cloud cover is ${cloudiness}%. At this level, solar exposure is ${isLowImpact ? "reduced enough to lower production impact" : "still strong enough that production impact remains normal"}.`;
    }
}

function _setImpactFallback() {
    const impactTextEl = document.getElementById("w-impact")?.querySelector("span");
    const impactTooltipEl = document.getElementById("w-impact-tooltip");

    if (impactTextEl) impactTextEl.innerText = "--";
    if (impactTooltipEl) {
        impactTooltipEl.innerText = window.App.lang === "tr"
            ? "Bulutluluk verisi alınamadı. Üretime etki hesabı hava servisi yanıtına göre gösterilir."
            : "Cloud cover data is unavailable. Production impact is shown when the weather service responds.";
    }
}
