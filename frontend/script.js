const button = document.getElementById("predictionBtn");
const currentPm = document.getElementById("currentPm");
const currentAqi = document.getElementById("currentAqi");
const forecastContainer = document.getElementById("forecastContainer");
const advisoryText = document.getElementById("advisoryText");

/* =========================
   MAP INITIALIZATION
========================= */

let aqiMap = L.map("aqiMap", { zoomControl: true }).setView(
    [28.6139, 77.2090],
    11
);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(aqiMap);

let aqiCircle = null;
let markersLayer = L.layerGroup().addTo(aqiMap);
let centerMarker = null;

let stations = [];
let stationMarkers = [];

/* =========================
   LOAD STATIONS
========================= */

async function loadStations() {
    if (stations.length) return stations;

    try {
        const resp = await fetch("stations.json");
        stations = await resp.json();
        return stations;
    } catch (e) {
        console.error("Failed to load stations.json", e);
        return [];
    }
}

/* =========================
   HELPERS
========================= */

function getHealthAdvisory(category) {
    const advisories = {
        "Good": "Air quality is satisfactory. Enjoy outdoor activities!",
        "Moderate":
            "Air quality is acceptable. Sensitive individuals should limit prolonged outdoor activity.",
        "Unhealthy for Sensitive Groups":
            "Sensitive groups may experience health effects. Reduce prolonged outdoor exertion.",
        "Unhealthy":
            "Everyone may begin to experience health effects. Limit outdoor activities.",
        "Very Unhealthy":
            "Health alert. Everyone should avoid outdoor activities.",
        "Hazardous":
            "Health warning. Stay indoors and keep activity levels low."
    };
    return advisories[category] || "No advisory available";
}

function getDayName(dayNumber) {
    const days = [
        "Tomorrow",
        "Day 2",
        "Day 3",
        "Day 4",
        "Day 5",
        "Day 6",
        "Day 7"
    ];
    return days[dayNumber - 1] || `Day ${dayNumber}`;
}

function aqiColor(category) {
    switch (category) {
        case "Good":
            return "#23bf57";
        case "Moderate":
            return "#f1c40f";
        case "Unhealthy for Sensitive Groups":
            return "#f39c12";
        case "Unhealthy":
            return "#e67e22";
        case "Very Unhealthy":
            return "#d35400";
        case "Hazardous":
            return "#c0392b";
        default:
            return "#777";
    }
}

/* =========================
   MAIN BUTTON ACTION
========================= */

button.addEventListener("click", async () => {
    advisoryText.innerText = "Loading...";

    try {
        const response = await fetch("http://127.0.0.1:8000/predict");
        const data = await response.json();

        /* CURRENT VALUES */
        currentPm.innerText = `PM2.5: ${data.current_pm25} µg/m³`;
        currentAqi.innerText = `AQI: ${data.current_aqi_category}`;

        /* FORECAST */
        forecastContainer.innerHTML = "";
        markersLayer.clearLayers();

        data.forecast_7day.forEach((day, idx) => {
            const badgeColor = aqiColor(day.aqi_category);

            const dayCard = document.createElement("div");
            dayCard.className = "day-card";
            dayCard.dataset.index = idx;

            dayCard.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-weight:700">${getDayName(day.day)}</div>
                    <div class="aqi-badge" style="background:${badgeColor}">
                        ${day.aqi_category}
                    </div>
                </div>
                <div style="margin-top:6px;font-weight:600">
                    ${day.pm25} µg/m³
                </div>
                <div class="small">Tap for details</div>
            `;

            dayCard.addEventListener("click", () =>
                selectDay(idx, day)
            );

            forecastContainer.appendChild(dayCard);
            setTimeout(() => dayCard.classList.add("enter"), 80 * idx);
        });

        /* STATIONS */
        const loadedStations = await loadStations();
        stationMarkers = [];

        loadedStations.forEach((st) => {
            const color = aqiColor(data.current_aqi_category);

            const iconHtml = `<span class="aqi-dot" style="background:${color}"></span>`;
            const divIcon = L.divIcon({
                className: "aqi-marker",
                html: iconHtml,
                iconSize: [18, 18]
            });

            const marker = L.marker([st.lat, st.lon], {
                icon: divIcon
            }).bindPopup(
                `<strong>${st.name}</strong><br>
                 PM2.5: ${data.current_pm25} µg/m³<br>
                 AQI: ${data.current_aqi_category}`
            );

            markersLayer.addLayer(marker);
            stationMarkers.push({ marker, meta: st });
        });

        /* AUTO SELECT FIRST DAY */
        selectDay(0, data.forecast_7day[0]);

        /* CENTER CIRCLE */
        const centerColor = aqiColor(data.current_aqi_category);
        const centerRadius =
            Math.min(Math.max(data.current_pm25, 20), 600) * 45;

        if (!aqiCircle) {
            aqiCircle = L.circle([28.6139, 77.2090], {
                color: centerColor,
                fillColor: centerColor,
                fillOpacity: 0.28,
                radius: centerRadius
            }).addTo(aqiMap);
        } else {
            aqiCircle.setStyle({
                color: centerColor,
                fillColor: centerColor
            });
            aqiCircle.setRadius(centerRadius);
        }

        aqiCircle.bindPopup(
            `PM2.5: ${data.current_pm25} µg/m³<br>
             AQI: ${data.current_aqi_category}`
        );

        /* PULSING CENTER MARKER */
        const centerHtml = `
            <div class="center-pulse">
                <div class="pulse-ring pulse-anim"
                     style="background:${centerColor}"></div>
                <div class="pulse-core"
                     style="border-color:${centerColor}"></div>
            </div>
        `;

        const centerIcon = L.divIcon({
            html: centerHtml,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
            className: ""
        });

        if (!centerMarker) {
            centerMarker = L.marker(
                [28.6139, 77.2090],
                { icon: centerIcon, interactive: false }
            ).addTo(aqiMap);
        } else {
            centerMarker.setIcon(centerIcon);
        }

        /* LEGEND */
        const legend = document.getElementById("aqiLegend");
        if (legend) {
            legend.innerHTML = `
                <div class="item"><div class="swatch" style="background:#23bf57"></div>Good</div>
                <div class="item"><div class="swatch" style="background:#f1c40f"></div>Moderate</div>
                <div class="item"><div class="swatch" style="background:#f39c12"></div>Unhealthy-SG</div>
                <div class="item"><div class="swatch" style="background:#e67e22"></div>Unhealthy</div>
                <div class="item"><div class="swatch" style="background:#d35400"></div>Very Unhealthy</div>
                <div class="item"><div class="swatch" style="background:#c0392b"></div>Hazardous</div>
            `;
        }
    } catch (err) {
        advisoryText.innerText = "Error connecting to backend";
        console.error(err);
    }
});

/* =========================
   DAY SELECTION
========================= */

function selectDay(index, day) {
    document
        .querySelectorAll(".day-card")
        .forEach((el) => el.classList.remove("selected"));

    const el = document.querySelector(
        `.day-card[data-index='${index}']`
    );
    if (el) el.classList.add("selected");

    advisoryText.innerText = `${getDayName(day.day)} (${day.aqi_category}): ${getHealthAdvisory(day.aqi_category)}`;

    stationMarkers.forEach((s) => {
        const color = aqiColor(day.aqi_category);

        const iconHtml = `<span class="aqi-dot" style="background:${color}"></span>`;
        const divIcon = L.divIcon({
            className: "aqi-marker",
            html: iconHtml,
            iconSize: [18, 18]
        });

        s.marker.setIcon(divIcon);
        s.marker.setPopupContent(
            `<strong>${s.meta.name}</strong><br>
             ${getDayName(day.day)}: ${day.pm25} µg/m³<br>
             AQI: ${day.aqi_category}`
        );
    });

    aqiMap.flyTo([28.6139, 77.2090], 11, { duration: 0.6 });
}
