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
                model: 'mistral-large-latest', 
                messages: [
                    { 
                        role: 'system', 
                        content: `Ты — продвинутый ИИ-генератор SQL-кода для СУБД Microsoft Access.
                        Твоя цель — выдавать 100% рабочий SQL-код без синтаксических ошибок.

                        УЛЬТИМАТИВНОЕ ПРАВИЛО ДЛЯ СВЯЗИ ТАБЛИЦ (ЗАПРЕТ НА INNER JOIN):
                        Тебе КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать операторы 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN' и круглые скобки в секции FROM. Из-за них Access постоянно выдает ошибку "пропущен оператор".
                        
                        Вместо этого ты ОБЯЗАН использовать классический синтаксис связей через WHERE (стандарт ANSI-89):
                        1. В секции FROM просто перечисляй ВСЕ необходимые таблицы через запятую: FROM [Таблица1], [Таблица2], [Таблица3]
                        2. Все условия соединения таблиц (первичные и внешние ключи) переноси в секцию WHERE, объединяя их через оператор AND.

                        ПРАВИЛА ДЛЯ ПОЛЕЙ И ТИПОВ ДАННЫХ:
                        - Автоинкремент при создании таблиц: строго COUNTER. Текст: строго TEXT(255).
                        - ВСЕ имена таблиц и полей ВСЕГДА оборачивай в квадратные скобки: [Таблица].[Поле].

                        ФОРМАТ ВЫВОДА:
                        Сначала краткая структура, затем чистый, гарантированно рабочий SQL-код. Без приветствий.` 
                    },
                    // Обновляем Few-Shot пример, чтобы модель скопировала этот стиль
                    { 
                        role: 'user', 
                        content: 'Свяжи таблицы: Продажи, Клиенты, Товары, Менеджеры. Выведи их ID и ФИО.' 
                    },
                    { 
                        role: 'assistant', 
                        content: `### Структура таблиц
- [Продажи], [Клиенты], [Товары], [Менеджеры]

### Финальный SQL (MS Access — ANSI-89)
\`\`\`sql
SELECT [Продажи].[ID], [Клиенты].[ФИО], [Товары].[Название], [Менеджеры].[Имя]
FROM [Продажи], [Клиенты], [Товары], [Менеджеры]
WHERE [Продажи].[КодКлиента] = [Клиенты].[ID]
  AND [Продажи].[КодТовара] = [Товары].[ID]
  AND [Продажи].[КодМенеджера] = [Менеджеры].[ID];
\`\`\`
` 
                    },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 1800,
                temperature: 0.0 // Полный отказ от фантазий
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
