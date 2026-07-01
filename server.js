const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Раздача статических файлов
app.use(express.static(path.join(__dirname)));

// Отправка главного HTML файла (проверяем оба варианта имени для надежности)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'home.html'));
        }
    });
});

// Роут для связи с Mistral AI
app.post('/api', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ text: "Пустой запрос к БД" });

    // Чтение ключа из настроек Render
    const apiKey = process.env.MISTRAL_API_KEY; 

    if (!apiKey) {
        return res.json({ text: "Ошибка конфигурации: Переменная среды MISTRAL_API_KEY не найдена на Render." });
    }

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
                                                                        body: JSON.stringify({
                model: 'mistral-large-latest', // ВКЛЮЧАЕМ САМЫЙ ТОПОВЫЙ ИНТЕЛЛЕКТ ФЛАГМАНСКОГО УРОВНЯ
                messages: [
                    { 
                        role: 'system', 
                        content: `Ты — самый продвинутый искусственный интеллект, глубоко интегрированный в ядро СУБД Microsoft Access.
                        Твоя цель — генерировать безупречный, 100% рабочий SQL-код, строго соответствующий капризному стандарту Jet SQL (MS Access).

                        ЖЕСТКИЙ СТАНДАРТ MS ACCESS SQL ДЛЯ ОБЪЕДИНЕНИЯ ТАБЛИЦ:
                        1. В Access НЕЛЬЗЯ писать множественные JOIN подряд без скобок (как в MySQL). Это вызовет ошибку синтаксиса "пропущен оператор".
                        2. Количество открывающих скобок перед первой таблицей в FROM должно строго равняться числу операторов JOIN.
                        3. Каждый оператор JOIN вместе со своим условием ON должен быть изолирован правой закрывающей скобкой.
                        
                        МАТЕМАТИЧЕСКИЙ ШАБЛОН ДЛЯ 3 ТАБЛИЦ (2 скобки):
                        FROM ([Таблица1] INNER JOIN [Таблица2] ON ...) INNER JOIN [Таблица3] ON ...
                        
                        МАТЕМАТИЧЕСКИЙ ШАБЛОН ДЛЯ 4 ТАБЛИЦ (3 скобки):
                        FROM (([Таблица1] INNER JOIN [Таблица2] ON ...) INNER JOIN [Таблица3] ON ...) INNER JOIN [Таблица4] ON ...

                        ПРАВИЛА ДЛЯ ПОЛЕЙ И ТИПОВ ДАННЫХ:
                        - Автоинкремент: строго COUNTER. Текст: строго TEXT(255).
                        - ВСЕ имена таблиц и полей ВСЕГДА оборачивай в квадратные скобки: [Таблица].[Поле].

                        ИНСТРУКЦИЯ ПО ВЫВОДУ:
                        Перед тем как выдать финальный SQL, ты обязан провести внутреннюю валидацию. Напиши строчку "Валидация синтаксиса: ОК", посчитав скобки. Отвечай коротко, выводи сначала структуру, затем чистый код.` 
                    },
                    // Идеальный Few-Shot пример для модели уровня Large
                    { 
                        role: 'user', 
                        content: 'Свяжи таблицы: Продажи, Клиенты, Товары, Менеджеры. Выведи их ID и ФИО.' 
                    },
                    { 
                        role: 'assistant', 
                        content: `### Структура связей
- [Продажи].[КодКлиента] -> [Клиенты].[ID]
- [Продажи].[КодТовара] -> [Товары].[ID]
- [Продажи].[КодМенеджера] -> [Менеджеры].[ID]

Валидация синтаксиса: Обнаружено 4 таблицы и 3 оператора JOIN. Требуется открыть ровно 2 уровня вложенных скобок для изоляции левых соединений.

### Финальный SQL (MS Access)
\`\`\`sql
SELECT [Продажи].[ID], [Клиенты].[ФИО], [Товары].[Название], [Менеджеры].[Имя]
FROM (([Продажи]
INNER JOIN [Клиенты] ON [Продажи].[КодКлиента] = [Клиенты].[ID])
INNER JOIN [Товары] ON [Продажи].[КодТовара] = [Товары].[ID])
INNER JOIN [Менеджеры] ON [Продажи].[КодМенеджера] = [Менеджеры].[ID];
\`\`\`
` 
                    },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 1800,
                temperature: 0.0 // Полностью отключаем креатив. Только сухой, математический разбор синтаксиса.
            })


        });

        if (!response.ok) {
            return res.json({ text: `Ошибка API Mistral: Сервер вернул статус ${response.status}. Проверьте баланс.` });
        }

        const data = await response.json();
        
        // Исправленный и безопасный разбор ответа нейросети
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            const aiText = data.choices[0].message.content;
            res.json({ text: aiText.trim() });
        } else {
            res.json({ text: "Ошибка: Сервер ИИ прислал некорректный формат ответа." });
        }

    } catch (error) {
        console.error("Критическая ошибка:", error);
        res.status(500).json({ text: "Ошибка: Не удалось выполнить сетевой запрос к шлюзу Mistral AI." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
