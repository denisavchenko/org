// Модуль работы с изображениями
const ImageManager = {
    imageFolder: 'crs/',
    extensions: ['.jpg', '.webp', '.png'],
    
    getImagePath(name) {
        return this.extensions.map(ext => `${this.imageFolder}${name}${ext}`);
    }
};

// Модуль работы с темами
const ThemeManager = {
    names: {
        'architecture': 'Архитектура',
        'museum': 'Музеи',
        'nature': 'Природа',
        'monastery': 'Монастыри',
        'culture': 'Культура',
        'archaeology': 'Археология',
        'settlement': 'Поселения',
        'urban': 'Городское',
        'monument': 'Памятники',
        'industrial': 'Промышленность',
        'institution': 'Учреждения'
    },
    icons: {
        'architecture': '🏛️',
        'museum': '🏛️',
        'nature': '🌲',
        'monastery': '⛪',
        'culture': '🎭',
        'archaeology': '🔍',
        'settlement': '🏘️',
        'urban': '🏙️',
        'monument': '🗿',
        'industrial': '🏭',
        'institution': '📚'
    },
    getName(theme) {
        return this.names[theme] || theme;
    },
    getIcon(theme) {
        return this.icons[theme] || '📍';
    }
};

// Модуль управления избранным
const FavoritesManager = {
    storageKey: 'karelia_favorites',
    favorites: [],
    
    init() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                this.favorites = JSON.parse(stored);
            } catch (e) {
                this.favorites = [];
            }
        } else {
            this.favorites = [];
        }
    },
    
    isFavorite(name) {
        return this.favorites.includes(name);
    },
    
    addToFavorites(feature) {
        const name = feature.properties.name;
        if (!this.isFavorite(name)) {
            this.favorites.push(name);
            localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
            this.onFavoritesChange();
        }
    },
    
    removeFromFavorites(name) {
        this.favorites = this.favorites.filter(fav => fav !== name);
        localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
        this.onFavoritesChange();
    },
    
    getFavoriteFeatures(allFeatures) {
        return allFeatures.filter(feature => 
            this.isFavorite(feature.properties.name)
        );
    },
    
    onFavoritesChange() {
        // Обновляем отображение карточек
        if (typeof loadFavoritesPage !== 'undefined') {
            loadFavoritesPage();
        }
    }
};

// Модуль работы с карточками
const CardManager = {
    createCard(feature) {
        const { name, description, theme } = feature.properties;
        const themeIcon = ThemeManager.getIcon(theme);
        const themeName = ThemeManager.getName(theme);

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.theme = theme;
        
        // Проверяем, находится ли объект в избранном
        const isFavorite = FavoritesManager.isFavorite(name);
        
        // Получаем возможные пути к изображению
        const imagePaths = ImageManager.getImagePath(name);
        
        // Создаем HTML карточки
        card.innerHTML = `
            <div class="card-image theme-${theme}">
                <img src="" alt="${name}" class="card-image-img" style="display: none;">
                <div class="image-placeholder">${themeIcon}</div>
                <button class="card-favorite ${isFavorite ? 'active' : ''}" 
                        data-name="${name}" 
                        aria-label="${isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}">
                    <span class="heart-icon">${isFavorite ? '❤️' : '🤍'}</span>
                </button>
            </div>
            <div class="card-content">
                <h3 class="card-title">${name}</h3>
                <p class="card-description">${description}</p>
                <div class="card-categories">
                    <span class="category-tag">${themeName}</span>
                </div>
            </div>
        `;

        // Загружаем изображение с обработкой ошибок
        const img = card.querySelector('.card-image-img');
        const placeholder = card.querySelector('.image-placeholder');
        let currentIndex = 0;
        
        const tryLoadImage = () => {
            if (currentIndex < imagePaths.length) {
                img.src = imagePaths[currentIndex];
            } else {
                img.style.display = 'none';
                placeholder.style.display = 'flex';
            }
        };
        
        img.addEventListener('error', () => {
            currentIndex++;
            tryLoadImage();
        });
        
        img.addEventListener('load', () => {
            img.style.display = 'block';
            placeholder.style.display = 'none';
        });
        
        tryLoadImage();

        // Обработчик клика на карточку (но не на сердечко)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-favorite')) {
                const objectName = encodeURIComponent(name);
                window.location.href = `detail.html?name=${objectName}`;
            }
        });

        // Обработчик клика на сердечко
        const favoriteBtn = card.querySelector('.card-favorite');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (FavoritesManager.isFavorite(name)) {
                FavoritesManager.removeFromFavorites(name);
                // Удаляем карточку из DOM
                card.remove();
                // Обновляем карту с оставшимися объектами
                const remainingFavorites = FavoritesManager.getFavoriteFeatures(allFeaturesData);
                FavoritesMapManager.updateMarkers(remainingFavorites);
                // Если карточек не осталось, показываем сообщение
                checkEmptyFavorites();
            } else {
                FavoritesManager.addToFavorites(feature);
                favoriteBtn.classList.add('active');
                favoriteBtn.querySelector('.heart-icon').textContent = '❤️';
                favoriteBtn.setAttribute('aria-label', 'Удалить из избранного');
            }
        });

        return card;
    },
    
    displayCards(features) {
        const grid = document.getElementById('favorites-grid');
        if (!grid) return;
        
        grid.innerHTML = '';

        if (features.length === 0) {
            grid.innerHTML = `
                <div class="favorites-empty" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <p style="font-size: 18px; color: #666; margin-bottom: 8px;">У вас пока нет избранных объектов</p>
                    <p style="font-size: 14px; color: #999;">Нажмите на сердечко на карточке, чтобы добавить объект в избранное</p>
                    <a href="index.html" style="display: inline-block; margin-top: 20px; color: #1976d2; text-decoration: none; font-weight: 500;">Перейти к достопримечательностям →</a>
                </div>
            `;
            return;
        }

        features.forEach(feature => {
            const card = this.createCard(feature);
            grid.appendChild(card);
        });
    }
};

function checkEmptyFavorites() {
    const grid = document.getElementById('favorites-grid');
    if (grid && grid.children.length === 0) {
        CardManager.displayCards([]);
    }
}

// Модуль работы с картой для избранного
const FavoritesMapManager = {
    map: null,
    markers: [],
    
    themeColors: {
        'architecture': '#1976d2',
        'museum': '#7b1fa2',
        'nature': '#388e3c',
        'monastery': '#c2185b',
        'culture': '#f57c00',
        'archaeology': '#d32f2f',
        'settlement': '#00796b',
        'urban': '#455a64',
        'monument': '#5d4037',
        'industrial': '#616161',
        'institution': '#0288d1'
    },
    
    init() {
        // Границы Республики Карелия
        const kareliaBounds = [[60.0, 28.0], [67.0, 38.0]];
        
        this.map = L.map('favorites-map', {
            zoomControl: false,
            maxBounds: kareliaBounds,
            maxBoundsViscosity: 1.0 // Полностью ограничивает перемещение за границы
        }).setView([62.0, 34.0], 7);
        
        const Stadia_AlidadeSmooth = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
            minZoom: 0,
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            ext: 'png'
        });
        
        Stadia_AlidadeSmooth.addTo(this.map);
    },
    
    createSquareIcon(theme) {
        const color = this.themeColors[theme] || '#1976d2';
        const pngPath = `markers/${theme}.png`;
        
        return L.icon({
            iconUrl: pngPath,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
            className: 'custom-square-marker'
        });
    },
    
    createSquareIconFallback(theme) {
        const color = this.themeColors[theme] || '#1976d2';
        
        return L.divIcon({
            className: 'custom-square-marker',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border: 2px solid white; border-radius: 3px;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    },
    
    addMarker(feature) {
        const [lng, lat] = feature.geometry.coordinates;
        const { name, description, theme } = feature.properties;
        
        let icon = this.createSquareIcon(theme);
        const marker = L.marker([lat, lng], { icon: icon }).addTo(this.map);
        
        // Проверяем, загрузилась ли PNG иконка
        const img = new Image();
        img.onerror = () => {
            const fallbackIcon = this.createSquareIconFallback(theme);
            marker.setIcon(fallbackIcon);
        };
        img.src = `markers/${theme}.png`;
        
        // Получаем возможные пути к изображению
        const imagePaths = ImageManager.getImagePath(name);
        const themeIcon = ThemeManager.getIcon(theme);
        
        // Создаем popup с изображением
        const popupContent = document.createElement('div');
        popupContent.style.maxWidth = '280px';
        popupContent.innerHTML = `
            <div style="margin-bottom: 12px; border-radius: 8px; overflow: hidden; background: #f5f5f5; min-height: 150px; display: flex; align-items: center; justify-content: center;">
                <img src="" alt="${name}" style="width: 100%; height: auto; display: none; max-height: 200px; object-fit: cover;">
                <div class="popup-image-placeholder" style="font-size: 48px; color: #ccc;">${themeIcon}</div>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${name}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; line-height: 1.4;">${description}</p>
            <span style="font-size: 12px; color: #1976d2; background: #e3f2fd; padding: 4px 8px; border-radius: 4px; display: inline-block;">${ThemeManager.getName(theme)}</span>
        `;
        
        // Загружаем изображение
        const popupImg = popupContent.querySelector('img');
        const popupPlaceholder = popupContent.querySelector('.popup-image-placeholder');
        let currentIndex = 0;
        
        const tryLoadImage = () => {
            if (currentIndex < imagePaths.length) {
                popupImg.src = imagePaths[currentIndex];
            } else {
                popupImg.style.display = 'none';
                popupPlaceholder.style.display = 'flex';
            }
        };
        
        popupImg.addEventListener('error', () => {
            currentIndex++;
            tryLoadImage();
        });
        
        popupImg.addEventListener('load', () => {
            popupImg.style.display = 'block';
            popupPlaceholder.style.display = 'none';
        });
        
        tryLoadImage();
        
        marker.bindPopup(popupContent);
        
        this.markers.push({ marker, feature });
        return marker;
    },
    
    clearMarkers() {
        this.markers.forEach(({ marker }) => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    },
    
    updateMarkers(features) {
        this.clearMarkers();
        
        if (features.length === 0) {
            return;
        }
        
        // Добавляем маркеры для всех объектов
        features.forEach(feature => {
            this.addMarker(feature);
        });
        
        // Подстраиваем карту под все маркеры
        if (features.length > 0) {
            const group = new L.featureGroup(this.markers.map(m => m.marker));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
};

// Глобальная переменная для хранения всех features
let allFeaturesData = [];

// Загрузка страницы избранного
async function loadFavoritesPage() {
    try {
        const response = await fetch('karelia_cultural_75.geojson');
        const data = await response.json();
        allFeaturesData = data.features;
        
        const favorites = FavoritesManager.getFavoriteFeatures(data.features);
        
        // Обновляем карту
        FavoritesMapManager.updateMarkers(favorites);
        
        // Обновляем карточки
        CardManager.displayCards(favorites);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Обновление иконки избранного в шапке
const updateHeaderFavoritesIcon = () => {
    const favoritesBtn = document.getElementById('header-favorites-btn');
    const favoritesIcon = document.getElementById('header-favorites-icon');
    const favoritesCountEl = document.getElementById('header-favorites-count');
    
    if (favoritesBtn && favoritesIcon) {
        const favoritesCount = FavoritesManager.favorites.length;
        if (favoritesCount > 0) {
            favoritesIcon.textContent = '❤️';
            favoritesBtn.classList.add('active');
            if (favoritesCountEl) {
                favoritesCountEl.textContent = favoritesCount;
                favoritesCountEl.style.display = 'flex';
            }
        } else {
            favoritesIcon.textContent = '🤍';
            favoritesBtn.classList.remove('active');
            if (favoritesCountEl) {
                favoritesCountEl.textContent = '';
                favoritesCountEl.style.display = 'none';
            }
        }
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    FavoritesManager.init();
    FavoritesMapManager.init();
    updateHeaderFavoritesIcon();
    loadFavoritesPage();
    
    // Обновляем счетчик при изменении избранного
    const originalOnChange = FavoritesManager.onFavoritesChange;
    FavoritesManager.onFavoritesChange = function() {
        originalOnChange.call(this);
        updateHeaderFavoritesIcon();
        // Перезагружаем страницу избранного, чтобы обновить карту и карточки
        loadFavoritesPage();
    };
});

