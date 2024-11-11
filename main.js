import { apiKey } from "./apikey.js";
const apiUrlByCoords = `https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&appid=${apiKey}`;
const apiUrlByCity = `https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&appid=${apiKey}&q=`;
const geocodingApiUrl = `https://api.openweathermap.org/geo/1.0/reverse?appid=${apiKey}&limit=1`;

// DOM элементы
const searchModeButtons = document.querySelectorAll(".mode-toggle");
const citySearch = document.querySelector(".city-search");
const coordsSearch = document.querySelector(".coords-search");
const cityInput = document.querySelector(".city-search input");
const latInput = document.querySelector(".lat-input");
const lonInput = document.querySelector(".lon-input");
const searchButton = document.querySelector(".search-box button");
const errorText = document.querySelector(".error");
const weatherCards = document.querySelector(".weather-cards");

// Обработчики для переключения режима поиска
searchModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        searchModeButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        if (button.dataset.mode === "city") {
            citySearch.classList.add("active");
            coordsSearch.classList.remove("active");
        } else {
            citySearch.classList.remove("active");
            coordsSearch.classList.add("active");
        }

        errorText.style.display = "none";
    });
});

function createWeatherCard(data) {
    const card = document.createElement("div");
    card.classList.add("weather-card");

    const weatherIcon = getWeatherIcon(data.weather[0].main);
    const locationName =
        data.name ||
        `Координаты: ${data.coord.lat.toFixed(2)}, ${data.coord.lon.toFixed(
            2
        )}`;

    card.innerHTML = generateCardHTML(data, weatherIcon, locationName);

    const removeButton = card.querySelector(".remove-card");
    removeButton.addEventListener("click", () => {
        card.remove();
    });

    // Add map to the card
    addMapToCard(card, data.coord.lat, data.coord.lon);

    return card;
}

function addMapToCard(card, lat, lon) {
    const mapContainer = document.createElement("div");
    mapContainer.style.height = "200px";
    mapContainer.style.marginTop = "12px";
    card.appendChild(mapContainer);
    
    const map = L.map(mapContainer, { attributionControl: false });
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
    }).addTo(map);
    
    const marker = L.marker([lat, lon]).addTo(map);
    
    map.setView(marker.getLatLng(), 13);
    
    setTimeout(() => {
        map.invalidateSize();
    }, 0);
}


function generateCardHTML(data, weatherIcon, locationName) {
    return `
        <button class="remove-card">
            <i class="fa-solid fa-times"></i>
        </button>
        <div class="weather-info">
            <i class="${weatherIcon}"></i>
            <h1 class="temp">${Math.round(data.main.temp)}°C</h1>
            <h2 class="city">${locationName}</h2>
            <p class="coordinates">
                ${data.coord.lat.toFixed(2)}°, ${data.coord.lon.toFixed(2)}°
            </p>
        </div>
        <div class="details">
            <div class="col">
                <i class="fa-solid fa-water"></i>
                <div>
                    <p>${data.main.humidity}%</p>
                    <p>Влажность</p>
                </div>
            </div>
            <div class="col">
                <i class="fa-solid fa-wind"></i>
                <div>
                    <p>${data.wind.speed} км/ч</p>
                    <p>Скорость ветра</p>
                </div>
            </div>
        </div>
    `;
}

function getWeatherIcon(weatherMain) {
    switch (weatherMain) {
        case "Clear":
            return "fa-solid fa-sun";
        case "Rain":
            return "fa-solid fa-cloud-rain";
        case "Snow":
            return "fa-solid fa-snowflake";
        case "Clouds":
            return "fa-solid fa-cloud";
        case "Mist":
        case "Fog":
            return "fa-solid fa-smog";
        default:
            return "fa-solid fa-cloud";
    }
}

function validateCoords(lat, lon) {
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    if (isNaN(lat) || isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    return !(lon < -180 || lon > 180);

    
}

async function getCityNameFromCoords(lat, lon) {
    try {
        const response = await fetch(
            `${geocodingApiUrl}&lat=${lat}&lon=${lon}`
        );
        const data = await response.json();
        if (data && data[0] && data[0].name) {
            return data[0].name;
        } else {
            return `Координаты: ${lat}, ${lon}`;
        }
    } catch (error) {
        console.error("Error fetching city name from coordinates:", error);
        return `Координаты: ${lat}, ${lon}`;
    }
}

async function addWeatherCard() {
    const activeMode = document.querySelector(".mode-toggle.active").dataset
        .mode;
    const url = constructApiUrl(activeMode);
    if (!url) return;

    try {
        const data = await fetchWeatherData(url);
        if (!data) return;

        if (activeMode === "coords" && !data.name) {
            data.name = await getCityNameFromCoords(
                data.coord.lat,
                data.coord.lon
            );
        }

        const card = createWeatherCard(data);
        weatherCards.appendChild(card);
        clearInputs(activeMode);
        errorText.style.display = "none";
    } catch (error) {
        handleFetchError(error);
    }
}

function constructApiUrl(activeMode) {
    if (activeMode === "city") {
        const cityValue = cityInput.value.trim();
        if (!cityValue) {
            displayError("Введите название города");
            return null;
        }
        return `${apiUrlByCity}${cityValue}`;
    } else {
        const lat = latInput.value.trim();
        const lon = lonInput.value.trim();
        if (!validateCoords(lat, lon)) {
            displayError("Некорректные координаты");
            return null;
        }
        return `${apiUrlByCoords}&lat=${lat}&lon=${lon}`;
    }
}

async function fetchWeatherData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        displayError("Ошибка при получении данных");
        return null;
    }
    return await response.json();
}

function displayError(message) {
    errorText.textContent = message;
    errorText.style.display = "block";
}

function clearInputs(activeMode) {
    if (activeMode === "city") {
        cityInput.value = "";
    } else {
        latInput.value = "";
        lonInput.value = "";
    }
}

function handleFetchError(error) {
    console.error("Error fetching weather data:", error);
    displayError("Ошибка при получении данных");
}

// Обработчики событий
searchButton.addEventListener("click", addWeatherCard);

cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        addWeatherCard();
    }
});

latInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        lonInput.focus();
    }
});

lonInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        addWeatherCard();
    }
});
