document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-query-btn');
    const outputField = document.getElementById('output-field');

    // Имитация системных уведомлений MS Access для верхних кнопок
    function showAccessAlert(buttonName) {
        outputField.innerText = `[Система]: Функция "${buttonName}" активна, но текущая таблица "Товары" заблокирована для редактирования в режиме конструктора.`;
    }

    // Привязка обработчиков к верхнему ряду кнопок
    document.getElementById('btn-view').addEventListener('click', () => showAccessAlert('Режим'));
    document.getElementById('btn-cut').addEventListener('click', () => showAccessAlert('Вырезать'));
    document.getElementById('btn-copy').addEventListener('click', () => showAccessAlert('Копировать'));
    document.getElementById('btn-filter').addEventListener('click', () => showAccessAlert('Фильтр'));
    document.getElementById('btn-sort').addEventListener('click', () => showAccessAlert('Сортировка'));

    // Функция отправки запроса к нейросети
    async function sendToAI() {
        const prompt = promptInput.value.trim();
        
        if (!prompt) return;

        // Показываем статус загрузки, как в Access
        outputField.innerText = "Выполнение SQL-запроса к локальной базе данных... Пожалуйста, подождите.";
        promptInput.value = '';

        try {
            // Запрос к серверному скрипту
            const response = await fetch('/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: prompt })
            });

            // Читаем ответ как обычный текст, чтобы избежать сбоя Unexpected token '<'
            const rawResponseText = await response.text();

            try {
                // Пытаемся распарсить текст в правильный JSON формат
                const data = JSON.parse(rawResponseText);
                
                if (data && data.text) {
                    outputField.innerText = data.text; // Успешный ответ от Mistral AI
                } else {
                    outputField.innerText = "Ошибка СУБД: Сервер вернул пустую структуру данных.";
                }
            } catch (parseError) {
                // Если пришел не JSON, а ошибка PHP (теги <br> и <b>) — выводим её на экран
                outputField.innerHTML = `<b style="color: #a30000;">Критический сбой ядра базы данных (PHP Error):</b><br><br>${rawResponseText}`;
                console.warn("Событие системы: Сервер вернул HTML вместо JSON. Текст ошибки выше.");
            }

        } catch (networkError) {
            outputField.innerText = "Ошибка подключения: Не удалось установить физическую связь с файлом api.php.";
            console.error("Сетевая ошибка:", networkError);
        }
    }

    // Обработчики клика и нажатия Enter
    sendBtn.addEventListener('click', sendToAI);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendToAI();
        }
    });
});
