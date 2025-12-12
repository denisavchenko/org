// Модуль работы с темами (копия из основного файла)
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

// Модуль работы с изображениями
const ImageManager = {
    imageFolder: 'crs/',
    extensions: ['.jpg', '.webp', '.png'],
    getImagePath(name) {
        return this.extensions.map(ext => `${this.imageFolder}${name}${ext}`);
    },
    async getImageUrl(name) {
        const paths = this.getImagePath(name);
        for (const path of paths) {
            const exists = await this.checkImageExists(path);
            if (exists) return path;
        }
        return null;
    },
    async checkImageExists(path) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = path;
        });
    }
};

// Модуль управления рейтингами
const RatingManager = {
    storageKey: 'karelia_ratings',
    ratings: {},
    
    init() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                this.ratings = JSON.parse(stored);
            } catch (e) {
                this.ratings = {};
            }
        }
    },
    
    saveRatings() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.ratings));
    },
    
    addRating(name, rating) {
        if (!this.ratings[name]) {
            this.ratings[name] = { total: 0, count: 0, userRating: null };
        }
        this.ratings[name].userRating = rating;
        this.ratings[name].total += rating;
        this.ratings[name].count += 1;
        this.saveRatings();
    },
    
    getUserRating(name) {
        return this.ratings[name]?.userRating || null;
    },
    
    getAverageRating(name) {
        if (!this.ratings[name] || this.ratings[name].count === 0) {
            return null;
        }
        return (this.ratings[name].total / this.ratings[name].count).toFixed(1);
    },
    
    getRatingCount(name) {
        return this.ratings[name]?.count || 0;
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
        }
    },
    
    isFavorite(name) {
        return this.favorites.includes(name);
    },
    
    addToFavorites(name) {
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
    
    onFavoritesChange() {
        // Обновляем счетчик в шапке
        if (typeof updateHeaderFavoritesIcon === 'function') {
            updateHeaderFavoritesIcon();
        }
    }
};

// Основной модуль детальной страницы
const DetailPage = {
    currentFeature: null,
    currentRating: 0,
    
    async init() {
        // Инициализация модулей
        RatingManager.init();
        FavoritesManager.init();
        
        // Получение параметра из URL
        const urlParams = new URLSearchParams(window.location.search);
        const objectName = decodeURIComponent(urlParams.get('name'));
        
        if (!objectName) {
            this.showError('Объект не найден');
            return;
        }
        
        // Загрузка данных
        await this.loadFeatureData(objectName);
        
        // Инициализация элементов страницы
        this.initMap();
        this.initRating();
        this.initFavorite();
        this.initActions();
    },
    
    async loadFeatureData(name) {
        try {
            const response = await fetch('karelia_cultural_75.geojson');
            const data = await response.json();
            
            const feature = data.features.find(f => f.properties.name === name);
            
            if (!feature) {
                this.showError('Объект не найден');
                return;
            }
            
            this.currentFeature = feature;
            this.renderFeature();
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showError('Ошибка загрузки данных');
        }
    },
    
    renderFeature() {
        const { name, description, theme } = this.currentFeature.properties;
        const [lng, lat] = this.currentFeature.geometry.coordinates;
        
        // Заголовок
        document.getElementById('detail-title').textContent = name;
        
        // Расширенное описание
        const extendedDescription = this.getExtendedDescription(name, description);
        document.getElementById('detail-description').textContent = extendedDescription;
        
        // Категория
        document.getElementById('detail-category').textContent = ThemeManager.getName(theme);
        
        // Время в пути (генерируем на основе местоположения)
        const travelTime = this.getTravelTime(lat, lng);
        document.getElementById('detail-travel-time').textContent = travelTime;
        
        // Рейтинг - показываем только реальные оценки пользователей
        const avgRating = RatingManager.getAverageRating(name);
        const ratingCount = RatingManager.getRatingCount(name);
        
        // Всегда очищаем контейнер звезд перед отрисовкой
        const starsContainer = document.getElementById('rating-stars');
        starsContainer.innerHTML = '';
        
        if (avgRating && ratingCount > 0) {
            // Показываем реальный рейтинг, если есть оценки
            document.getElementById('rating-value').textContent = avgRating;
            this.renderStars(parseFloat(avgRating));
            document.getElementById('rating-count').textContent = `(${ratingCount} ${this.getRatingWord(ratingCount)})`;
        } else {
            // Если оценок нет, показываем сообщение
            document.getElementById('rating-value').textContent = '';
            starsContainer.innerHTML = '<span style="font-size: 14px; color: #999;">Пока нет оценок</span>';
            document.getElementById('rating-count').textContent = '(0 отзывов)';
        }
        
        // Изображение
        this.loadImage(name);
        
        // Карта
        this.updateMap(lat, lng, name);
        
        // Обновление избранного
        this.updateFavoriteButton(name);
        
        // Очищаем звезды для оценки пользователя при загрузке нового объекта
        this.resetRatingStars();
    },
    
    getExtendedDescription(name, baseDescription) {
        // Расширенные описания для популярных объектов
        const extendedDescriptions = {
            'Кижский погост': 'Кижский погост — уникальный архитектурный ансамбль деревянного зодчества, объект Всемирного наследия ЮНЕСКО. Расположен на острове Кижи в Онежском озере. Ансамбль включает в себя 22-главую Преображенскую церковь (1714 год), 9-главую Покровскую церковь (1764 год) и шатровую колокольню (1874 год). Это выдающийся памятник русской деревянной архитектуры, демонстрирующий мастерство древних зодчих.',
            'Мраморный карьер Рускеала': 'Горный парк "Рускеала" — бывший мраморный карьер, превращенный в уникальный туристический объект. Карьер заполнен чистейшей водой изумрудного цвета. Здесь можно прогуляться по оборудованным тропам, покататься на лодке, посетить подземные гроты. В вечернее время карьер подсвечивается, создавая невероятно красивое зрелище. Мрамор из этого карьера использовался при строительстве многих известных зданий Санкт-Петербурга.',
            'Валаамский Спасо-Преображенский монастырь': 'Валаамский монастырь — один из древнейших монастырей России, расположенный на острове Валаам в Ладожском озере. Основан в X-XI веках. Монастырь известен своей уникальной архитектурой, строгим уставом и красотой природы. Здесь сохранились древние храмы, скиты и монашеские кельи. Валаам привлекает паломников и туристов со всего мира.',
            'Водопад Кивач': 'Водопад Кивач — второй по величине равнинный водопад Европы после Рейнского. Высота падения воды составляет около 11 метров. Водопад расположен в заповеднике "Кивач" и является одной из главных достопримечательностей Карелии. Особенно красив водопад весной во время половодья, когда река Суна полноводна.',
            'Петроглифы Онежского озера': 'Петроглифы Онежского озера — наскальные рисунки эпохи неолита, возраст которых составляет около 5-6 тысяч лет. Рисунки выбиты на скалах мыса Бесов Нос и других местах восточного берега Онежского озера. Изображены сцены охоты, животные, лодки, люди. Это уникальный памятник древнего искусства, дающий представление о жизни первобытных людей.'
        };
        
        return extendedDescriptions[name] || baseDescription + ' Это уникальный объект культурного и исторического наследия Республики Карелия, привлекающий туристов со всего мира своей красотой и исторической ценностью.';
    },
    
    getTravelTime(lat, lng) {
        // Примерная оценка времени в пути от Петрозаводска
        // Петрозаводск примерно на координатах [61.79, 34.36]
        const petrozavodskLat = 61.79;
        const petrozavodskLng = 34.36;
        
        // Простая оценка расстояния
        const distance = Math.sqrt(
            Math.pow(lat - petrozavodskLat, 2) + 
            Math.pow(lng - petrozavodskLng, 2)
        ) * 111; // Примерно км
        
        if (distance < 50) {
            return '1-2 часа';
        } else if (distance < 150) {
            return '2-3 часа';
        } else if (distance < 250) {
            return '3-4 часа';
        } else {
            return '4-6 часов';
        }
    },
    
    getBaseRating(name) {
        // Базовые рейтинги для популярных объектов (для демонстрации)
        const baseRatings = {
            'Кижский погост': '4.7',
            'Мраморный карьер Рускеала': '4.4',
            'Валаамский Спасо-Преображенский монастырь': '4.6',
            'Водопад Кивач': '4.5',
            'Петроглифы Онежского озера': '4.3'
        };
        
        return baseRatings[name] || '4.0';
    },
    
    renderStars(rating) {
        const starsContainer = document.getElementById('rating-stars');
        starsContainer.innerHTML = '';
        
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating - fullStars >= 0.5;
        
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('div');
            star.className = 'rating-star';
            if (i < fullStars) {
                // Полная звезда
            } else if (i === fullStars && hasHalfStar) {
                star.style.background = 'linear-gradient(90deg, #1976d2 50%, #e0e0e0 50%)';
            } else {
                star.classList.add('empty');
            }
            starsContainer.appendChild(star);
        }
    },
    
    async loadImage(name) {
        const imageUrl = await ImageManager.getImageUrl(name);
        const mainImage = document.getElementById('main-image');
        
        if (imageUrl) {
            mainImage.innerHTML = `<img src="${imageUrl}" alt="${name}">`;
        } else {
            mainImage.innerHTML = `<div class="image-placeholder" style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 48px;">${ThemeManager.getIcon(this.currentFeature.properties.theme)}</div>`;
        }
    },
    
    map: null,
    
    initMap() {
        // Инициализация карты будет выполнена после загрузки данных
    },
    
    createSquareIcon(theme) {
        // Пробуем использовать PNG файл
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
        const themeColors = {
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
        };
        
        const color = themeColors[theme] || '#1976d2';
        
        return L.divIcon({
            className: 'custom-square-marker',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border: 1.5px solid white; border-radius: 3px;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    },
    
    updateMap(lat, lng, name) {
        // Инициализируем карту при первом вызове
        if (!this.map) {
            // Границы Республики Карелия
            const kareliaBounds = [[60.0, 28.0], [67.0, 38.0]];
            
            this.map = L.map('detail-map', {
                zoomControl: false,
                maxBounds: kareliaBounds,
                maxBoundsViscosity: 1.0 // Полностью ограничивает перемещение за границы
            }).setView([lat, lng], 13);
            
            const Stadia_AlidadeSmooth = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
                minZoom: 0,
                maxZoom: 20,
                attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                ext: 'png'
            });
            
            Stadia_AlidadeSmooth.addTo(this.map);
        } else {
            this.map.setView([lat, lng], 13);
        }
        
        // Добавляем маркер с квадратной иконкой
        const theme = this.currentFeature ? this.currentFeature.properties.theme : 'architecture';
        const description = this.currentFeature ? this.currentFeature.properties.description : '';
        let icon = this.createSquareIcon(theme);
        const marker = L.marker([lat, lng], { icon: icon }).addTo(this.map);
        
        // Проверяем, загрузилась ли PNG иконка, если нет - используем fallback
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
    },
    
    resetRatingStars() {
        // Очищаем звезды для оценки пользователя
        const stars = document.querySelectorAll('.star-rating .star');
        const submitBtn = document.getElementById('submit-rating-btn');
        
        stars.forEach(s => s.classList.remove('active'));
        submitBtn.disabled = true;
        this.currentRating = 0;
    },
    
    initRating() {
        const stars = document.querySelectorAll('.star-rating .star');
        const submitBtn = document.getElementById('submit-rating-btn');
        
        // Очищаем звезды при инициализации
        this.resetRatingStars();
        
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                this.currentRating = index + 1;
                
                // Обновление визуального состояния звезд
                stars.forEach((s, i) => {
                    if (i <= index) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
                
                submitBtn.disabled = false;
            });
        });
        
        submitBtn.addEventListener('click', () => {
            if (this.currentRating > 0 && this.currentFeature) {
                RatingManager.addRating(this.currentFeature.properties.name, this.currentRating);
                alert('Спасибо за вашу оценку!');
                this.renderFeature(); // Обновляем отображение рейтинга
            }
        });
    },
    
    initFavorite() {
        const favoriteBtn = document.getElementById('detail-favorite-btn');
        favoriteBtn.addEventListener('click', () => {
            if (!this.currentFeature) return;
            
            const name = this.currentFeature.properties.name;
            if (FavoritesManager.isFavorite(name)) {
                FavoritesManager.removeFromFavorites(name);
                this.updateFavoriteButton(name);
            } else {
                FavoritesManager.addToFavorites(name);
                this.updateFavoriteButton(name);
            }
        });
    },
    
    updateFavoriteButton(name) {
        const favoriteBtn = document.getElementById('detail-favorite-btn');
        const heartIcon = document.getElementById('detail-heart-icon');
        
        if (FavoritesManager.isFavorite(name)) {
            favoriteBtn.classList.add('active');
            heartIcon.textContent = '❤️';
        } else {
            favoriteBtn.classList.remove('active');
            heartIcon.textContent = '🤍';
        }
    },
    
    initActions() {
        // Кнопка "Поделиться"
        document.getElementById('share-btn').addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: this.currentFeature.properties.name,
                    text: this.currentFeature.properties.description,
                    url: window.location.href
                });
            } else {
                // Fallback - копирование ссылки
                navigator.clipboard.writeText(window.location.href);
                alert('Ссылка скопирована в буфер обмена!');
            }
        });
        
    },
    
    getRatingWord(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return 'отзывов';
        }
        
        if (lastDigit === 1) {
            return 'отзыв';
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            return 'отзыва';
        } else {
            return 'отзывов';
        }
    },
    
    showError(message) {
        document.querySelector('.detail-container').innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <h2>${message}</h2>
                <a href="index.html" class="back-link">Вернуться на главную</a>
            </div>
        `;
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    FavoritesManager.init();
    updateHeaderFavoritesIcon();
    DetailPage.init();
});

