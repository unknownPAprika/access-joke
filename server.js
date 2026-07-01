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
                model: 'open-mistral-7b',
                messages: [
                    { 
                        role: 'system', 
                        content: `Ты — встроенный инструмент генерации SQL-скриптов для СУБД Microsoft Access.
                        Ты выводишь ИСКЛЮЧИТЕЛЬНО валидный синтаксис MS Access SQL.

                        КРИТИЧЕСКИЕ ПРАВИЛА ACCESS SQL:
                        1. Автоинкремент пишется строго как 'COUNTER' или 'AUTOINCREMENT'.
                        2. Тип данных для текста — строго 'TEXT(255)' или 'MEMO' для длинного текста (никаких VARCHAR).
                        3. Имена полей со спецсимволами, пробелами или русскими буквами ОБЯЗАТЕЛЬНО оборачиваются в квадратные скобки (например, [ID клиента]).
                        4. В Access множественные JOIN-ы ВСЕГДА требуют круглых скобок! Каждый новый JOIN должен оборачивать предыдущую конструкцию.
                        
                        ФОРМАТ ВЫВОДА:
                        Сначала краткая Markdown-таблица со структурой, затем готовый к копированию блок кода SQL. Никаких приветствий.` 
                    },
                    // ПРИМЕР 1: Демонстрируем модели правильные типы данных и скобки в связях
                    { 
                        role: 'user', 
                        content: 'Сделай структуру Базы Данных Интернет-магазин: Клиенты, Товары, Заказы. И напиши запрос, который выведет ФИО клиента, название товара и дату заказа.' 
                    },
                    { 
                        role: 'assistant', 
                        content: `### Структура БД
1. **[Клиенты]**: [ID_клиента] (COUNTER, PK), [ФИО] (TEXT(255)), [Email] (TEXT(255))
2. **[Товары]**: [ID_товара] (COUNTER, PK), [Название] (TEXT(255)), [Цена] (CURRENCY)
3. **[Заказы]**: [ID_заказа] (COUNTER, PK), [Код_клиента] (INT), [Код_товара] (INT), [Дата_заказа] (DATETIME)

### SQL Скрипт создания таблиц
\`\`\`sql
CREATE TABLE [Клиенты] (
    [ID_клиента] COUNTER CONSTRAINT PK_Клиенты PRIMARY KEY,
    [ФИО] TEXT(255) NOT NULL,
    [Email] TEXT(255)
);

CREATE TABLE [Товары] (
    [ID_товара] COUNTER CONSTRAINT PK_Товары PRIMARY KEY,
    [Название] TEXT(255) NOT NULL,
    [Цена] CURRENCY
);

CREATE TABLE [Заказы] (
    [ID_заказа] COUNTER CONSTRAINT PK_Заказы PRIMARY KEY,
    [Код_клиента] INT,
    [Код_товара] INT,
    [Дата_заказа] DATETIME
);
\`\`\`

### SQL Запрос на выборку (Соблюдая синтаксис скобок Access)
\`\`\`sql
SELECT [Клиенты].[ФИО], [Товары].[Название], [Заказы].[Дата_заказа]
FROM ([Заказы] 
INNER JOIN [Клиенты] ON [Заказы].[Код_клиента] = [Клиенты].[ID_клиента]) 
INNER JOIN [Товары] ON [Заказы].[Код_товара] = [Товары].[ID_товара];
\`\`\`
` 
                    },
                    // Передаем реальный запрос пользователя
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 1500,
                temperature: 0.05 // Почти нулевая температура для максимальной жесткости ответов
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
