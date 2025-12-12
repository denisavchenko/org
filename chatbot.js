// Модуль чат-бота для планирования маршрутов
const ChatBot = {
    isOpen: false,
    allFeatures: [],
    
    // Ключевые слова для определения категорий
    themeKeywords: {
        'architecture': ['архитектура', 'архитектурный', 'архитектур', 'здание', 'постройка', 'церковь', 'храм', 'собор', 'часовня'],
        'museum': ['музей', 'музеи', 'музе', 'экспозиция', 'выставка', 'коллекция'],
        'nature': ['природа', 'природу', 'природы', 'природе', 'природой', 'природный', 'природн', 'природные', 'природных', 'озеро', 'озера', 'озер', 'озеру', 'озером', 'лес', 'леса', 'лесу', 'лесом', 'парк', 'парки', 'заповедник', 'заповедники', 'водопад', 'водопады', 'скала', 'скалы', 'ландшафт', 'пейзаж', 'природ'],
        'monastery': ['монастырь', 'монастыри', 'монастыр', 'скит', 'скиты', 'обитель', 'лавра', 'монастырский'],
        'culture': ['культура', 'культурный', 'культур', 'фестиваль', 'традиция', 'обычай'],
        'archaeology': ['археология', 'археологический', 'археолог', 'раскопки', 'древний', 'исторический'],
        'settlement': ['поселение', 'деревня', 'село', 'поселок'],
        'urban': ['город', 'городской', 'городск', 'площадь', 'улица', 'центр'],
        'monument': ['памятник', 'мемориал', 'обелиск'],
        'industrial': ['промышленность', 'завод', 'фабрика', 'производство'],
        'institution': ['учреждение', 'библиотека', 'школа', 'театр']
    },
    
    // Ключевые слова для определения количества дней
    dayKeywords: {
        '1': ['1 день', 'один день', 'на день', 'дневной'],
        '2': ['2 дня', 'два дня', 'на выходные', 'выходные'],
        '3': ['3 дня', 'три дня'],
        '4': ['4 дня', 'четыре дня'],
        '5': ['5 дней', 'пять дней', 'неделя', 'на неделю']
    },
    
    init() {
        // Получаем все объекты из AppData
        if (typeof AppData !== 'undefined' && AppData.allFeatures) {
            this.allFeatures = AppData.allFeatures;
        }
        
        // Инициализация UI
        const toggle = document.getElementById('chatbot-toggle');
        const close = document.getElementById('chatbot-close');
        const send = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');
        
        if (toggle) {
            toggle.addEventListener('click', () => this.toggle());
        }
        
        if (close) {
            close.addEventListener('click', () => this.close());
        }
        
        if (send) {
            send.addEventListener('click', () => this.sendMessage());
        }
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
        
        // Загружаем данные, если они еще не загружены
        if (this.allFeatures.length === 0) {
            this.loadFeatures();
        }
    },
    
    async loadFeatures() {
        try {
            const response = await fetch('karelia_cultural_75.geojson');
            const data = await response.json();
            this.allFeatures = data.features;
        } catch (error) {
            console.error('Ошибка загрузки данных для бота:', error);
        }
    },
    
    toggle() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chatbot-window');
        const container = document.getElementById('chatbot-container');
        
        if (this.isOpen) {
            window.style.display = 'flex';
            container.classList.add('open');
            // Фокус на input
            setTimeout(() => {
                const input = document.getElementById('chatbot-input');
                if (input) input.focus();
            }, 100);
        } else {
            window.style.display = 'none';
            container.classList.remove('open');
        }
    },
    
    close() {
        this.isOpen = false;
        const window = document.getElementById('chatbot-window');
        const container = document.getElementById('chatbot-container');
        window.style.display = 'none';
        container.classList.remove('open');
    },
    
    sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Добавляем сообщение пользователя
        this.addMessage(message, 'user');
        input.value = '';
        
        // Обрабатываем запрос
        setTimeout(() => {
            this.processMessage(message);
        }, 500);
    },
    
    addMessage(text, type = 'bot') {
        const messages = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `<p>${text}</p>`;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    },
    
    processMessage(message) {
        const lowerMessage = message.toLowerCase().trim();
        
        // Обработка благодарностей и вежливых фраз
        if (this.isThankYouMessage(lowerMessage)) {
            this.handleThankYou();
            return;
        }
        
        // Обработка приветствий
        if (this.isGreeting(lowerMessage)) {
            this.handleGreeting();
            return;
        }
        
        // Обработка прощаний
        if (this.isGoodbye(lowerMessage)) {
            this.handleGoodbye();
            return;
        }
        
        // Определяем количество дней
        let days = this.extractDays(lowerMessage);
        
        // Определяем интересующие категории
        const themes = this.extractThemes(lowerMessage);
        
        // Если не найдено категорий, используем все
        const selectedThemes = themes.length > 0 ? themes : Object.keys(this.themeKeywords);
        
        // Фильтруем объекты по найденным категориям
        let filteredFeatures = this.allFeatures.filter(f => {
            return selectedThemes.includes(f.properties.theme);
        });
        
        // Если объектов слишком много, ограничиваем
        const maxObjects = days ? days * 5 : 10; // ~5 объектов в день
        
        // Распределяем объекты равномерно по категориям, если их несколько
        if (filteredFeatures.length > maxObjects && themes.length > 1) {
            filteredFeatures = this.distributeByThemes(filteredFeatures, themes, maxObjects);
        } else if (filteredFeatures.length > maxObjects) {
            // Если категория одна, просто берем первые
            filteredFeatures = filteredFeatures.slice(0, maxObjects);
        }
        
        // Формируем ответ
        this.generateResponse(filteredFeatures, days, selectedThemes);
    },
    
    isThankYouMessage(message) {
        const thankYouPhrases = [
            'спасибо', 'благодарю', 'благодарность', 'благодарна', 'благодарен',
            'спасибо большое', 'большое спасибо', 'огромное спасибо',
            'благодарю вас', 'спасибо вам', 'отлично', 'супер', 'классно',
            'замечательно', 'прекрасно', 'отличная работа', 'хорошо', 'понятно'
        ];
        
        return thankYouPhrases.some(phrase => message.includes(phrase));
    },
    
    isGreeting(message) {
        const greetings = [
            'привет', 'здравствуй', 'здравствуйте', 'добрый день', 'добрый вечер',
            'доброе утро', 'добро пожаловать', 'хай', 'hi', 'hello'
        ];
        
        return greetings.some(phrase => message.includes(phrase));
    },
    
    isGoodbye(message) {
        const goodbyes = [
            'пока', 'до свидания', 'до встречи', 'увидимся', 'прощай', 'прощайте',
            'bye', 'goodbye', 'see you'
        ];
        
        return goodbyes.some(phrase => message.includes(phrase));
    },
    
    handleThankYou() {
        const responses = [
            'Пожалуйста! Рад был помочь! Если нужна еще помощь с планированием маршрута, обращайтесь! 😊',
            'Всегда пожалуйста! Удачного путешествия по Карелии! 🗺️',
            'Не за что! Надеюсь, маршрут вам понравится. Приятных впечатлений! ✨',
            'Пожалуйста! Если понадобится что-то еще, я всегда готов помочь! 🎯',
            'Рад помочь! Желаю незабываемого путешествия по Карелии! 🌲'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage(randomResponse);
    },
    
    handleGreeting() {
        const responses = [
            'Привет! Я помогу вам спланировать маршрут по Карелии. Что вас интересует?',
            'Здравствуйте! Расскажите, какой маршрут вы хотели бы составить?',
            'Привет! Готов помочь с планированием вашего путешествия. Что вы хотите посмотреть?'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage(randomResponse);
    },
    
    handleGoodbye() {
        const responses = [
            'До свидания! Удачного путешествия по Карелии! 🗺️',
            'Пока! Надеюсь, маршрут вам понравится. Приятных впечатлений! ✨',
            'До встречи! Желаю незабываемого путешествия! 🌲',
            'Увидимся! Если понадобится помощь, обращайтесь! 😊'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage(randomResponse);
    },
    
    extractDays(message) {
        for (const [days, keywords] of Object.entries(this.dayKeywords)) {
            for (const keyword of keywords) {
                if (message.includes(keyword)) {
                    return parseInt(days);
                }
            }
        }
        return null;
    },
    
    extractThemes(message) {
        const foundThemes = [];
        const lowerMessage = message.toLowerCase();
        
        for (const [theme, keywords] of Object.entries(this.themeKeywords)) {
            // Проверяем каждое ключевое слово
            for (const keyword of keywords) {
                const lowerKeyword = keyword.toLowerCase();
                // Ищем подстроку в сообщении
                if (lowerMessage.includes(lowerKeyword)) {
                    if (!foundThemes.includes(theme)) {
                        foundThemes.push(theme);
                    }
                    break; // Нашли ключевое слово для этой категории, переходим к следующей
                }
            }
        }
        
        return foundThemes;
    },
    
    distributeByThemes(features, themes, maxObjects) {
        // Распределяем объекты равномерно по категориям
        const featuresByTheme = {};
        themes.forEach(theme => {
            featuresByTheme[theme] = features.filter(f => f.properties.theme === theme);
        });
        
        const objectsPerTheme = Math.floor(maxObjects / themes.length);
        const result = [];
        
        // Берем объекты из каждой категории
        themes.forEach(theme => {
            const themeFeatures = featuresByTheme[theme] || [];
            const count = Math.min(objectsPerTheme, themeFeatures.length);
            result.push(...themeFeatures.slice(0, count));
        });
        
        // Если осталось место, добавляем объекты из всех категорий
        if (result.length < maxObjects) {
            const remaining = maxObjects - result.length;
            const allRemaining = features.filter(f => !result.includes(f));
            result.push(...allRemaining.slice(0, remaining));
        }
        
        return result;
    },
    
    generateResponse(features, days, themes) {
        if (features.length === 0) {
            this.addMessage('К сожалению, я не нашел подходящих объектов. Попробуйте изменить критерии поиска.');
            return;
        }
        
        let response = '';
        
        if (days) {
            response += `Отлично! Я подготовил маршрут на ${days} ${this.getDayWord(days)}. `;
        } else {
            response += 'Вот подборка интересных объектов для вас. ';
        }
        
        if (themes.length > 0 && themes.length < Object.keys(this.themeKeywords).length) {
            const themeNames = themes.map(t => ThemeManager.getName(t)).join(', ');
            response += `Учитывая ваши интересы (${themeNames}), рекомендую посетить:\n\n`;
        } else {
            response += 'Рекомендую посетить:\n\n';
        }
        
        // Сохраняем features для использования в кнопках
        this.lastRecommendedFeatures = features;
        
        // Группируем по дням, если указано количество дней
        if (days && days > 1) {
            const objectsPerDay = Math.ceil(features.length / days);
            for (let day = 1; day <= days; day++) {
                const startIdx = (day - 1) * objectsPerDay;
                const endIdx = Math.min(day * objectsPerDay, features.length);
                const dayFeatures = features.slice(startIdx, endIdx);
                
                if (dayFeatures.length > 0) {
                    response += `<strong>День ${day}:</strong>\n`;
                    dayFeatures.forEach((feature, idx) => {
                        const { name, description, theme } = feature.properties;
                        const themeName = ThemeManager.getName(theme);
                        const encodedName = encodeURIComponent(name);
                        response += `${idx + 1}. <a href="detail.html?name=${encodedName}" class="chatbot-link">${name}</a> (${themeName})\n`;
                        if (description) {
                            response += `   ${description.substring(0, 80)}${description.length > 80 ? '...' : ''}\n`;
                        }
                    });
                    response += '\n';
                }
            }
        } else {
            // Просто список объектов
            features.forEach((feature, idx) => {
                const { name, description, theme } = feature.properties;
                const themeName = ThemeManager.getName(theme);
                const encodedName = encodeURIComponent(name);
                response += `${idx + 1}. <a href="detail.html?name=${encodedName}" class="chatbot-link">${name}</a> (${themeName})\n`;
                if (description) {
                    response += `   ${description.substring(0, 80)}${description.length > 80 ? '...' : ''}\n`;
                }
            });
        }
        
        response += '\n💡 Вы можете кликнуть на объект в списке, чтобы посмотреть его на карте, или добавить в избранное!';
        
        this.addMessage(response);
        
        // Добавляем кнопки для действий
        this.addActionButtons(features);
    },
    
    getDayWord(days) {
        if (days === 1) return 'день';
        if (days >= 2 && days <= 4) return 'дня';
        return 'дней';
    },
    
    addActionButtons(features) {
        const messages = document.getElementById('chatbot-messages');
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'message bot-message chatbot-actions';
        
        let buttonsHTML = '<div class="chatbot-buttons">';
        buttonsHTML += `<button class="chatbot-btn" onclick="ChatBot.showOnMap(${JSON.stringify(features.map(f => f.properties.name)).replace(/"/g, '&quot;')})">Показать на карте</button>`;
        buttonsHTML += `<button class="chatbot-btn" onclick="ChatBot.addToFavorites(${JSON.stringify(features.map(f => f.properties.name)).replace(/"/g, '&quot;')})">Добавить в избранное</button>`;
        buttonsHTML += '</div>';
        
        buttonDiv.innerHTML = buttonsHTML;
        messages.appendChild(buttonDiv);
        messages.scrollTop = messages.scrollHeight;
    },
    
    showOnMap(objectNames) {
        if (typeof MapManager === 'undefined') {
            this.addMessage('Карта недоступна на этой странице.');
            return;
        }
        
        // Фильтруем объекты по именам
        const featuresToShow = this.allFeatures.filter(f => 
            objectNames.includes(f.properties.name)
        );
        
        if (featuresToShow.length === 0) {
            this.addMessage('Не удалось найти объекты на карте.');
            return;
        }
        
        // Скрываем все маркеры
        MapManager.markers.forEach(({ marker }) => {
            MapManager.map.removeLayer(marker);
        });
        
        // Показываем только выбранные маркеры
        featuresToShow.forEach(feature => {
            const markerData = MapManager.markers.find(m => {
                const [lng, lat] = m.feature.geometry.coordinates;
                const [fLng, fLat] = feature.geometry.coordinates;
                return m.feature.properties.name === feature.properties.name ||
                       (Math.abs(lat - fLat) < 0.0001 && Math.abs(lng - fLng) < 0.0001);
            });
            
            if (markerData) {
                markerData.marker.addTo(MapManager.map);
            } else {
                // Если маркер не найден, создаем новый
                MapManager.addMarker(feature);
            }
        });
        
        // Фокусируемся на первом объекте
        if (featuresToShow.length > 0) {
            MapManager.focusOnFeature(featuresToShow[0]);
        }
        
        // Фильтруем карточки
        if (typeof CardManager !== 'undefined') {
            CardManager.displayCards(featuresToShow, 'cards-grid', false);
        }
        
        // Прокручиваем к карте
        const mapSection = document.getElementById('map-section');
        if (mapSection) {
            mapSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        this.addMessage(`Показал ${featuresToShow.length} объектов на карте!`);
    },
    
    addToFavorites(objectNames) {
        if (typeof FavoritesManager === 'undefined') {
            this.addMessage('Функция избранного недоступна на этой странице.');
            return;
        }
        
        const featuresToAdd = this.allFeatures.filter(f => 
            objectNames.includes(f.properties.name)
        );
        
        featuresToAdd.forEach(feature => {
            FavoritesManager.addToFavorites(feature);
        });
        
        this.addMessage(`Добавил ${featuresToAdd.length} объектов в избранное! ❤️`);
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    ChatBot.init();
    
    // Обновляем данные после загрузки AppData
    const checkDataLoaded = setInterval(() => {
        if (typeof AppData !== 'undefined' && AppData.allFeatures && AppData.allFeatures.length > 0) {
            ChatBot.allFeatures = AppData.allFeatures;
            clearInterval(checkDataLoaded);
        }
    }, 100);
    
    // Останавливаем проверку через 5 секунд
    setTimeout(() => clearInterval(checkDataLoaded), 5000);
});

