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
                model: 'mistral-small-latest', // Переключили на более умную модель
                messages: [
                    { 
                        role: 'system', 
                        content: `Ты — встроенный инструмент генерации SQL-скриптов для СУБД Microsoft Access.
                        Ты выводишь ИСКЛЮЧИТЕЛЬНО валидный синтаксис MS Access SQL.

                        КРИТИЧЕСКИЕ ПРАВИЛА ACCESS SQL ДЛЯ МНОЖЕСТВЕННЫХ JOIN:
                        Если в запросе связываются 3 и более таблицы, ты ОБЯЗАТЕЛЬНО должен использовать круглые скобки в секции FROM. 
                        Для трех таблиц синтаксис ВСЕГДА должен выглядеть строго так:
                        FROM ([ПерваяТаблица] INNER JOIN [ВтораяТаблица] ON [ПерваяТаблица].[Ключ] = [ВтораяТаблица].[Ключ]) INNER JOIN [ТретьяТаблица] ON [ПерваяТаблица].[ДругойКлюч] = [ТретьяТаблица].[Ключ]
                        
                        Без правильной расстановки скобок Access выдает ошибку "пропущен оператор". Помни об этом и проверяй скобки перед выводом!

                        ФОРМАТ ВЫВОДА:
                        Сначала краткая Markdown-таблица со структурой, затем готовый к копированию блок кода SQL. Никаких приветствий.` 
                    },
                    // Шаблон-пример, чтобы модель скопировала идеальную расстановку скобок
                    { 
                        role: 'user', 
                        content: 'Сделай запрос для таблиц Продажи, Клиенты, Товары. Выведи ФИО и Название.' 
                    },
                    { 
                        role: 'assistant', 
                        content: `### SQL Запрос на выборку (Синтаксис MS Access)
\`\`\`sql
SELECT [Клиенты].[ФИО], [Товары].[Название]
FROM ([Продажи] 
INNER JOIN [Клиенты] ON [Продажи].[КодКлиента] = [Клиенты].[КодКлиента]) 
INNER JOIN [Товары] ON [Продажи].[КодТовара] = [Товары].[КодТовара];
\`\`\`
` 
                    },
                    // Передаем реальный запрос пользователя
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 1500,
                temperature: 0.01 // Максимально жесткая логика, без "фантазий"
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
