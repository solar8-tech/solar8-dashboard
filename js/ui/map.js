// ui/map.js

const _TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const _TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

const _MARKER_CLASSES = ["pulse-marker", "pulse-marker blue", "pulse-marker purple", "pulse-marker green"];

window.initMap = function initMap() {
    const isLight = document.documentElement.getAttribute("data-theme") === "light" || document.body.classList.contains("light-mode");
    const tileUrl = isLight ? _TILE_LIGHT : _TILE_DARK;

    if (!window.App.map.instance) {
        window.App.map.instance = L.map("map-container", {
            zoomControl       : false,
            attributionControl: false,
            fadeAnimation     : true,
            zoomAnimation     : true
        }).setView([39.5, 34.0], 6);

        window.App.map.tileLayer = L.tileLayer(tileUrl, {
            maxZoom  : 19,
            className: "map-tiles"
        }).addTo(window.App.map.instance);
    } else {
        window.App.map.tileLayer?.setUrl(tileUrl);
    }

    // Mevcut markerları temizleyecek kod
    window.App.map.instance.eachLayer(layer => {
        if (layer instanceof L.Marker) window.App.map.instance.removeLayer(layer);
    });

    const plants  = window.App.data.plants ?? [];
    const btnText = window.TRANSLATIONS[window.App.lang]?.map_open_panel ?? "OPEN PANEL";

    if (plants.length === 0) return;

    plants.forEach((plant, i) => {
        const lat  = plant.lat ?? 0;
        const lon  = plant.lon ?? 0;
        const name = window.localise(plant.name) ?? plant.name ?? "--";
        const cls  = _MARKER_CLASSES[i % _MARKER_CLASSES.length];

        const colors = ["var(--clr-energy)", "var(--clr-env)", "var(--clr-predict)", "var(--clr-success)"];
        const btnColor = colors[i % colors.length];

        const icon    = L.divIcon({ className: cls, iconSize: [16, 16] });
        const marker  = L.marker([lat, lon], { icon }).addTo(window.App.map.instance);

        marker.bindPopup(`
            <div style="text-align:center; font-family:'Inter'">
                <strong style="font-size:13px; display:block; margin-bottom:8px; color:var(--txt-strong);">${name}</strong>
                <button
                    onclick="window.selectPlant(window.App.data.plants[${i}])" 
                    style="background:${btnColor}; color:#ffffff; border:none; padding:6px 14px;
                        border-radius:6px; font-size:11px; cursor:pointer; font-weight:600; transition:opacity 0.2s;"
                    onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
                    ${btnText}
                </button>
            </div>
        `);
        marker.on("mouseover", function() { this.openPopup(); });
    });

    if (plants.length > 1) {
        const bounds = L.latLngBounds(plants.map(p => [p.lat, p.lon]));
        window.App.map.instance.fitBounds(bounds, { padding: [60, 60] });
    } else if (plants.length === 1) {
        window.App.map.instance.setView([plants[0].lat, plants[0].lon], 8);
    }
};

window.updateMapTheme = function updateMapTheme(isLight) {
    window.App.map.tileLayer?.setUrl(isLight ? _TILE_LIGHT : _TILE_DARK);
};
