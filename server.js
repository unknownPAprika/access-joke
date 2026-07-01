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
                        content: `Ты — эксперт по СУБД Microsoft Access и сертифицированный администратор баз данных. 
                        Твоя задача — выдавать абсолютно точную структуру таблиц и идеальный SQL-код, строго соответствующий диалекту Access SQL.

                        ПРАВИЛА ДЛЯ ACCESS SQL:
                        1. Для автоинкремента всегда используй тип данных 'COUNTER' или 'AUTOINCREMENT' (а не SERIAL или INT AUTO_INCREMENT).
                        2. Для текста используй 'TEXT(255)' или 'MEMO' для длинных текстов (не VARCHAR).
                        3. Имена таблиц или полей, содержащие пробелы или спецсимволы, ВСЕГДА оборачивай в квадратные скобки: [Имя таблицы].
                        4. Если в запросе используется более одного JOIN, ОБЯЗАТЕЛЬНО используй круглые скобки для группировки JOIN-ов, иначе Access выдаст ошибку оператора (например: FROM (Табл1 INNER JOIN Табл2 ON ...) INNER JOIN Табл3 ON ...).
                        5. Для дат используй формат #гггг-мм-дд# или #мм/дд/гггг#.

                        ФОРМАТ ОТВЕТА:
                        Отвечай максимально коротко, без приветствий и лишних объяснений. Сначала выводи графическую схему (Markdown-таблицу), а затем — готовый, рабочий, чистый SQL-скрипт CREATE TABLE / INSERT / SELECT. Дважды проверь синтаксис на соответствие MS Access перед отправкой.`
                    },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 1500, // Запас токенов для больших SQL-скриптов
                temperature: 0.1  // Снизили до минимума, чтобы модель не "фантазировала", а писала строго по правилам
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
