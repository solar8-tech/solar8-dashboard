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
        const t    = window.TRANSLATIONS[window.App.lang];

        const city = data.name || window.App.data.context.plant?.city || "--";
        _setText("w-city", city);
        _setText("w-temp", `${Math.round(data.main.temp)}°C`);
        _setText("w-wind", `${Math.round((data.wind?.speed ?? 0) * 3.6)} km/h`);
        _setText("w-hum",  `%${data.main.humidity}`);

        const main = data.weather?.[0]?.main?.toLowerCase() ?? "";
        let descKey = "data_weather_default";
        if      (main.includes("clear"))                            descKey = "data_weather_clear";
        else if (main.includes("cloud"))                            descKey = "data_weather_clouds";
        else if (main.includes("rain") || main.includes("drizzle")) descKey = "data_weather_rain";
        else if (main.includes("snow"))                             descKey = "data_weather_snow";

        _setText("w-desc", t[descKey] ?? "--");

        const impactEl = document.getElementById("w-impact");
        if (impactEl) {
            const isLow = (data.clouds?.all ?? 0) > 70;
            impactEl.innerText = window.App.lang === "tr"
                ? (isLow ? "Üretime Etki: Düşük" : "Üretime Etki: Normal")
                : (isLow ? "Impact: Low"          : "Impact: Normal");
            impactEl.className = isLow
                ? "inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-danger/10 text-danger"
                : "inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-green-500/10 text-green-400";
        }
    } catch (err) {
        console.error("[Weather]", err);
        _setText("w-city", window.App.data.context.plant?.city ?? "--");
        _setText("w-desc", window.App.lang === "tr" ? "Servis Dışı" : "Service Unavailable");
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
