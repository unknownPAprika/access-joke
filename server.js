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
                model: 'mistral-small-latest', 
                messages: [
                    { 
                        role: 'system', 
                        content: `Ты — элитный инструмент автоматической генерации SQL-кода, запрограммированный ИСКЛЮЧИТЕЛЬНО под строгие стандарты СУБД Microsoft Access.
                        Твоя главная задача — обойти ограничение Access на множественные JOIN, используя математически точную расстановку круглых скобок.

                        ЖЕСТКАЯ МАТЕМАТИЧЕСКАЯ ФОРМУЛА ACCESS JOIN:
                        В Access количество открывающихся круглых скобок в секции FROM должно быть ровно на 1 МЕНЬШЕ, чем общее количество таблиц в связке (N - 1).
                        Каждая скобка открывается в самом начале строки FROM, а закрывается сразу после завершения текущего оператора ON.

                        Шаблон для 3 таблиц (2 скобки):
                        FROM ((Таблица1 INNER JOIN Таблица2 ON ...) INNER JOIN Таблица3 ON ...)
                        
                        Шаблон для 4 таблиц (3 скобки):
                        FROM (((Таблица1 INNER JOIN Таблица2 ON ...) INNER JOIN Таблица3 ON ...) INNER JOIN Таблица4 ON ...)

                        Если ты забудешь открыть скобки в самом начале FROM или пропустишь закрывающую скобку перед следующим INNER JOIN, система выдаст ошибку синтаксиса "пропущен оператор".

                        ТВОЙ АЛГОРИТМ ПЕРЕД ВЫВОДОМ (Размышление вслух):
                        1. Посчитай, сколько таблиц нужно связать.
                        2. Напиши черновик: 'Мне нужно связать Х таблиц, значит, в начале FROM я обязан поставить ровно (Х - 1) открывающихся скобок'.
                        3. Собери конструкцию, поочередно закрывая скобки после каждого ON.
                        4. Выведи итоговый SQL.` 
                    },
                    // Развернутый Few-Shot пример с "черновиком" для закрепления логики
                    { 
                        role: 'user', 
                        content: 'Выведи данные из таблиц Продажи, Клиенты, Товары, Сотрудники.' 
                    },
                    { 
                        role: 'assistant', 
                        content: `### Черновик рассуждений:
Мне нужно связать 4 таблицы (Продажи, Клиенты, Товары, Сотрудники). 
Следовательно, по формуле (N - 1) я должен открыть ровно 3 скобки в самом начале секции FROM: \`FROM (((\`
После первого ON я закрываю одну скобку, после второго — вторую, после третьего — третью.

### Итоговый SQL Запрос (Синтаксис MS Access)
\`\`\`sql
SELECT [Продажи].[ID], [Клиенты].[ФИО], [Товары].[Название], [Сотрудники].[Имя]
FROM ((([Продажи]
INNER JOIN [Клиенты] ON [Продажи].[КодКлиента] = [Клиенты].[КодКлиента])
INNER JOIN [Товары] ON [Продажи].[КодТовара] = [Товары].[КодТовара])
INNER JOIN [Сотрудники] ON [Продажи].[КодСотрудника] = [Сотрудники].[ID]);
\`\`\`
` 
                    },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 1500,
                temperature: 0.0 // Абсолютный ноль во избежание любых отклонений от формулы
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
