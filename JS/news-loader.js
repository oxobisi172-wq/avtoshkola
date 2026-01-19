// Кэш объявляется СНАРУЖИ функции (глобально)
let newsCache = null;

// Вспомогательная функция для открытия новости в модальном окне
function openNewsFromData(title, content, date = '', category = '') {
    // Проверяем, существует ли функция модального окна
    if (typeof window.openNewsModal === 'function') {
        // Формируем HTML для модального окна
        const modalContent = `
            <div class="space-y-6">
                ${date || category ? `
                <div class="flex flex-wrap items-center gap-3 mb-4">
                    ${date ? `<span class="text-sm text-gray-500">${date}</span>` : ''}
                    ${category ? `<span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">${category}</span>` : ''}
                </div>
                ` : ''}
                <div class="prose prose-blue max-w-none">
                    ${content}
                </div>
            </div>
        `;
        window.openNewsModal(title, modalContent);
    } else {
        console.warn('Функция модального окна не найдена. Переходим по ссылке.');
        // Если модального окна нет, открываем страницу новости
        window.location.href = `news-single.html?title=${encodeURIComponent(title)}`;
    }
}

async function loadNews(containerId, isHomePage = false) {
    const container = document.getElementById(containerId);
    
    // Проверка: существует ли контейнер
    if (!container) {
        console.warn(`Контейнер с id="${containerId}" не найден!`);
        return;
    }

    // Показываем индикатор загрузки
    container.innerHTML = `
        <div class="md:col-span-3 text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p class="mt-2 text-gray-600">Загружаем новости...</p>
        </div>
    `;

    try {
        // Загружаем данные только если кэш пуст
        if (!newsCache) {
            const response = await fetch('news.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }
            
            newsCache = await response.json();
            console.log('Новости загружены:', newsCache); // Для отладки
        }

        // Проверяем, что данные - это массив
        if (!Array.isArray(newsCache)) {
            throw new Error('Данные должны быть массивом');
        }

        // Если главная страница — берем только первые 3 новости
        const newsToShow = isHomePage ? newsCache.slice(0, 3) : newsCache;

        // Проверка: есть ли новости
        if (newsToShow.length === 0) {
            container.innerHTML = `
                <div class="md:col-span-3 text-center py-8 text-gray-500">
                    <p>Новостей пока нет</p>
                </div>
            `;
            return;
        }

        // Рендерим карточки
        const html = newsToShow.map((item, index) => {
            const delay = index * 0.1;
            
            // Безопасное получение текста превью
            let previewText = '';
            if (item.excerpt) {
                previewText = item.excerpt;
            } else if (item.text && item.text.length > 0) {
                // Берем только первые 120 символов для превью
                previewText = item.text.length > 120 
                    ? item.text.substring(0, 120) + '...' 
                    : item.text;
            }
            
            // Подготавливаем данные для модального окна
            const modalTitle = item.title || 'Новость';
            // Используем полный текст для модального окна
            const modalContent = item.text || '';
            
            // Экранируем специальные символы для корректной работы в onclick
            const safeTitle = modalTitle.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeContent = modalContent.replace(/`/g, '\\`').replace(/'/g, "\\'");
            
            return `
            <article class="bg-white rounded-2xl overflow-hidden shadow-sm card-hover animate-fade-up flex flex-col h-full" 
                     style="animation-delay: ${delay}s">
                ${item.image ? `
                <img src="${item.image}" 
                     alt="${item.title || 'Новость'}" 
                     class="w-full h-48 object-cover"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/500x300?text=No+Image'">
                ` : ''}
                <div class="p-6 flex flex-col flex-grow">
                    <div class="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <span>${item.date || 'Недавно'}</span>
                        ${item.category ? `<span class="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">${item.category}</span>` : ''}
                    </div>
                    <h3 class="font-bold text-gray-900 text-lg mb-3">${item.title || 'Без заголовка'}</h3>
                    <p class="text-gray-600 text-sm mb-4 flex-grow">${previewText}</p>
                    
                    <!-- Кнопка для открытия модального окна -->
                    <button 
                        onclick="openNewsFromData('${safeTitle}', \`${safeContent}\`, '${item.date || ''}', '${item.category || ''}')"
                        class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm cursor-pointer mt-auto self-start"
                        aria-label="Читать новость '${item.title}' полностью"
                    >
                        Читать далее
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </button>
                </div>
            </article>
            `;
        }).join('');

        container.innerHTML = html;

        // Запускаем анимации с небольшой задержкой
        setTimeout(() => {
            container.querySelectorAll('.animate-fade-up').forEach(el => {
                el.classList.add('visible');
            });
        }, 50);

        // Перезапускаем наблюдатель, если он существует
        if (typeof observer !== 'undefined' && observer) {
            container.querySelectorAll('.animate-fade-up').forEach(el => {
                observer.observe(el);
            });
        }

    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
        container.innerHTML = `
            <div class="md:col-span-3 text-center py-8 text-gray-500">
                <p>Не удалось загрузить новости.</p>
                <p class="text-sm mt-2">Ошибка: ${error.message}</p>
                <button onclick="newsCache = null; loadNews('${containerId}', ${isHomePage})" 
                        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    Попробовать снова
                </button>
            </div>
        `;
    }
}
