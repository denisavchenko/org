// Конфигурация приложения
const Config = {
    mapCenter: [64.0, 34.0],
    mapZoom: 5
};

// Модуль работы с изображениями
const ImageManager = {
    imageFolder: 'crs/',
    extensions: ['.jpg', '.webp', '.png'],
    
    // Получение пути к изображению по названию объекта
    // Пробуем разные расширения, начиная с .jpg
    getImagePath(name) {
        // Возвращаем массив путей для попытки загрузки
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

// Модуль работы с картой
const MapManager = {
    map: null,
    markers: [],
    
    // Цвета для категорий
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
        
        this.map = L.map('map', {
            zoomControl: false,
            maxBounds: kareliaBounds,
            maxBoundsViscosity: 1.0 // Полностью ограничивает перемещение за границы
        }).setView(Config.mapCenter, Config.mapZoom);
        
        const Stadia_AlidadeSmooth = L.tileLayer('https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png', {
            minZoom: 5,
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            ext: 'png'
        });
        
        Stadia_AlidadeSmooth.addTo(this.map);
    },
    
    // Создание квадратного маркера для категории
    createSquareIcon(theme) {
        const color = this.themeColors[theme] || '#1976d2';
        
        // Пробуем использовать PNG файл, если он есть
        const pngPath = `markers/${theme}.png`;
        
        // Создаем иконку с PNG (если файл не загрузится, будет использован fallback)
        return L.icon({
            iconUrl: pngPath,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
            // Fallback на программно созданный квадратик
            className: 'custom-square-marker'
        });
    },
    
    // Создание fallback квадратного маркера (если PNG нет)
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
        
        // Создаем маркер с квадратной иконкой
        // Сначала пробуем PNG, если не загрузится - используем fallback
        let icon = this.createSquareIcon(theme);
        const marker = L.marker([lat, lng], { icon: icon }).addTo(this.map);
        
        // Проверяем, загрузилась ли PNG иконка, если нет - используем fallback
        const img = new Image();
        img.onerror = () => {
            // Если PNG не загрузился, заменяем на fallback
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

    showMarkersByTheme(theme) {
        this.markers.forEach(({ marker }) => {
            this.map.removeLayer(marker);
        });

        if (theme === 'all') {
            this.markers.forEach(({ marker }) => {
                marker.addTo(this.map);
            });
        } else {
            this.markers.forEach(({ marker, feature }) => {
                if (feature.properties.theme === theme) {
                    marker.addTo(this.map);
                }
            });
        }
    },

    focusOnFeature(feature) {
        const [lng, lat] = feature.geometry.coordinates;
        this.map.setView([lat, lng], 12);
        
        const markerData = this.markers.find(m => m.feature === feature);
        if (markerData) {
            markerData.marker.openPopup();
        }
    }
};

// Модуль работы с карточками
const CardManager = {
    cardsPerPage: 15,
    currentIndex: 0,
    allFeaturesToShow: [],
    
    createCard(feature) {
        const { name, description, theme } = feature.properties;
        const themeIcon = ThemeManager.getIcon(theme);
        const themeName = ThemeManager.getName(theme);

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.theme = theme;
        
        // Получаем возможные пути к изображению
        const imagePaths = ImageManager.getImagePath(name);
        
        // Проверяем, находится ли объект в избранном
        const isFavorite = FavoritesManager.isFavorite(name);
        
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
                // Если все расширения не подошли, оставляем плейсхолдер
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
        
        // Начинаем загрузку с первого пути
        tryLoadImage();

        // Обработчик клика на карточку (но не на сердечко)
        card.addEventListener('click', (e) => {
            // Если клик был на сердечко, не переходим на детальную страницу
            if (!e.target.closest('.card-favorite')) {
                // Переход на детальную страницу
                const objectName = encodeURIComponent(name);
                window.location.href = `detail.html?name=${objectName}`;
            }
        });

        // Обработчик клика на сердечко
        const favoriteBtn = card.querySelector('.card-favorite');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события
            
            if (FavoritesManager.isFavorite(name)) {
                FavoritesManager.removeFromFavorites(name);
                favoriteBtn.classList.remove('active');
                favoriteBtn.querySelector('.heart-icon').textContent = '🤍';
                favoriteBtn.setAttribute('aria-label', 'Добавить в избранное');
            } else {
                FavoritesManager.addToFavorites(feature);
                favoriteBtn.classList.add('active');
                favoriteBtn.querySelector('.heart-icon').textContent = '❤️';
                favoriteBtn.setAttribute('aria-label', 'Удалить из избранного');
            }
        });

        return card;
    },

    displayCards(features, containerId = 'cards-grid', resetPagination = true) {
        const grid = document.getElementById(containerId);
        if (!grid) return;
        
        // Сохраняем все карточки для пагинации
        if (resetPagination) {
            this.allFeaturesToShow = features;
            this.currentIndex = 0;
            grid.innerHTML = '';
        }
        
        // Определяем, сколько карточек показать
        const endIndex = Math.min(this.currentIndex + this.cardsPerPage, this.allFeaturesToShow.length);
        const featuresToShow = this.allFeaturesToShow.slice(this.currentIndex, endIndex);
        
        // Добавляем карточки
        featuresToShow.forEach(feature => {
            const card = this.createCard(feature);
            grid.appendChild(card);
        });
        
        // Обновляем индекс
        this.currentIndex = endIndex;
        
        // Показываем/скрываем кнопку "Загрузить еще"
        this.updateLoadMoreButton(containerId);
    },
    
    updateLoadMoreButton(containerId) {
        const loadMoreContainer = document.getElementById('load-more-container');
        
        // Для галереи избранного не показываем кнопку
        if (containerId === 'favorites-grid') {
            if (loadMoreContainer) {
                loadMoreContainer.style.display = 'none';
            }
            return;
        }
        
        if (this.currentIndex >= this.allFeaturesToShow.length) {
            // Все карточки показаны
            if (loadMoreContainer) {
                loadMoreContainer.style.display = 'none';
            }
        } else {
            // Есть еще карточки
            if (loadMoreContainer) {
                loadMoreContainer.style.display = 'flex';
            }
        }
    },
    
    loadMore(containerId = 'cards-grid') {
        // Загружаем еще карточки без сброса пагинации
        this.displayCards(this.allFeaturesToShow, containerId, false);
    },
    
    // Обновление состояния сердечек во всех карточках
    updateFavoriteButtons() {
        const allCards = document.querySelectorAll('.card-favorite');
        allCards.forEach(btn => {
            const name = btn.getAttribute('data-name');
            const isFavorite = FavoritesManager.isFavorite(name);
            
            if (isFavorite) {
                btn.classList.add('active');
                btn.querySelector('.heart-icon').textContent = '❤️';
                btn.setAttribute('aria-label', 'Удалить из избранного');
            } else {
                btn.classList.remove('active');
                btn.querySelector('.heart-icon').textContent = '🤍';
                btn.setAttribute('aria-label', 'Добавить в избранное');
            }
        });
    }
};

// Модуль управления избранным
const FavoritesManager = {
    storageKey: 'karelia_favorites',
    favorites: [],
    
    init() {
        // Загружаем избранное из localStorage
        this.loadFavorites();
    },
    
    loadFavorites() {
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
    
    saveFavorites() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
    },
    
    // Добавление в избранное по названию объекта
    addToFavorites(feature) {
        const name = feature.properties.name;
        if (!this.isFavorite(name)) {
            this.favorites.push(name);
            this.saveFavorites();
            this.onFavoritesChange();
        }
    },
    
    // Удаление из избранного
    removeFromFavorites(name) {
        this.favorites = this.favorites.filter(fav => fav !== name);
        this.saveFavorites();
        this.onFavoritesChange();
    },
    
    // Проверка, находится ли объект в избранном
    isFavorite(name) {
        return this.favorites.includes(name);
    },
    
    // Получение всех объектов избранного из общего списка
    getFavoriteFeatures(allFeatures) {
        return allFeatures.filter(feature => 
            this.isFavorite(feature.properties.name)
        );
    },
    
    // Обработчик изменения избранного (для обновления UI)
    onFavoritesChange() {
        // Обновляем состояние сердечек во всех карточках
        CardManager.updateFavoriteButtons();
    }
};

// Модуль фильтров
const FilterManager = {
    isDragging: false,
    
    init() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const filtersContainer = document.querySelector('.filters');
        
        // Добавляем возможность перетаскивания для прокрутки
        if (filtersContainer) {
            let startX;
            let scrollLeft;

            filtersContainer.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                filtersContainer.style.cursor = 'grabbing';
                startX = e.pageX - filtersContainer.offsetLeft;
                scrollLeft = filtersContainer.scrollLeft;
            });

            filtersContainer.addEventListener('mouseleave', () => {
                this.isDragging = false;
                filtersContainer.style.cursor = 'grab';
            });

            filtersContainer.addEventListener('mouseup', () => {
                this.isDragging = false;
                filtersContainer.style.cursor = 'grab';
            });

            filtersContainer.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                e.preventDefault();
                const x = e.pageX - filtersContainer.offsetLeft;
                const walk = (x - startX) * 2; // Скорость прокрутки
                filtersContainer.scrollLeft = scrollLeft - walk;
            });

            // Для тач-устройств
            let touchStartX = 0;
            let scrollLeftTouch = 0;

            filtersContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].pageX - filtersContainer.offsetLeft;
                scrollLeftTouch = filtersContainer.scrollLeft;
            });

            filtersContainer.addEventListener('touchmove', (e) => {
                const x = e.touches[0].pageX - filtersContainer.offsetLeft;
                const walk = (x - touchStartX) * 2;
                filtersContainer.scrollLeft = scrollLeftTouch - walk;
            });

            // Устанавливаем курсор grab
            filtersContainer.style.cursor = 'grab';
        }
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Предотвращаем клик при перетаскивании
                if (this.isDragging) {
                    e.preventDefault();
                    return;
                }
                
                // Удаление активного класса со всех кнопок
                filterButtons.forEach(b => b.classList.remove('active'));
                // Добавление активного класса к нажатой кнопке
                btn.classList.add('active');

                const theme = btn.dataset.theme;
                this.applyFilter(theme);
            });
        });
    },

    applyFilter(theme) {
        if (theme === 'all') {
            CardManager.displayCards(AppData.allFeatures, 'cards-grid', true);
            MapManager.showMarkersByTheme('all');
        } else {
            const filtered = AppData.allFeatures.filter(f => f.properties.theme === theme);
            CardManager.displayCards(filtered, 'cards-grid', true);
            MapManager.showMarkersByTheme(theme);
        }
    }
};

// Модуль данных приложения
const AppData = {
    allFeatures: [],

    async loadData() {
        try {
            const response = await fetch('karelia_cultural_75.geojson');
            const data = await response.json();
            this.allFeatures = data.features;
            
            // Добавление маркеров на карту
            data.features.forEach(feature => {
                MapManager.addMarker(feature);
            });

            // Отображение карточек с пагинацией (первые 15)
            CardManager.displayCards(this.allFeatures, 'cards-grid', true);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }
};

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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    FavoritesManager.init();
    MapManager.init();
    FilterManager.init();
    AppData.loadData();
    
    // Обработчик кнопки "Загрузить еще"
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            CardManager.loadMore('cards-grid');
        });
    }
    
    // Обновляем иконку избранного в шапке
    updateHeaderFavoritesIcon();
    
    // Обновляем иконку при изменении избранного
    const originalOnChange = FavoritesManager.onFavoritesChange;
    FavoritesManager.onFavoritesChange = function() {
        originalOnChange.call(this);
        updateHeaderFavoritesIcon();
    };
});

