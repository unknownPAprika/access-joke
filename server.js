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
                        content: `Ты — продвинутый ИИ-компилятор, работающий строго по правилам СУБД Microsoft Access (Jet SQL). 
                        Твоя цель — создавать 100% валидные скрипты CREATE TABLE и SELECT без синтаксических ошибок.

                        ПРАВИЛА ОГРАНИЧЕНИЙ ЦЕЛОСТНОСТИ ДЛЯ ACCESS SQL (CREATE TABLE):
                        1. В Access КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО объявлять составные PRIMARY KEY или любые FOREIGN KEY на уровне таблицы напрямую (например, нельзя писать "FOREIGN KEY (поле) REFERENCES..."). Это вызывает ошибку синтаксиса!
                        2. Любое табличное ограничение ОБЯЗАНО объявляться строго через ключевое слово 'CONSTRAINT' с уникальным именем связи.
                           - Правильный составной PK: CONSTRAINT [PK_ИмяТаблицы] PRIMARY KEY ([Поле1], [Поле2])
                           - Правильный внешний ключ: CONSTRAINT [FK_ИмяСвязи] FOREIGN KEY ([ЛокальноеПоле]) REFERENCES [ВнешняяТаблица]([ВнешнееПоле])

                        ОСТАЛЬНЫЕ ПРАВИЛА ACCESS SQL:
                        1. В SELECT для связи таблиц запрещены JOIN-ы и круглые скобки. Перечисляй таблицы через запятую в FROM, а связи пиши в WHERE через AND (стандарт ANSI-89).
                        2. В Access КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНА конструкция COUNT(DISTINCT [Поле]). Используй подзапрос: SELECT COUNT(*) FROM (SELECT DISTINCT [Поле] FROM [Таблица]);
                        3. Все типы данных — строго по стандарту Access: автоинкремент — COUNTER, целое число — INT или LONG, текст — TEXT(255).
                        4. Все имена таблиц и полей всегда оборачивай в квадратные скобки: [Таблица].[Поле].

                        ФОРМАТ ВЫВОДА:
                        Сначала краткая структура, затем чистый, гарантированно рабочий SQL-код. Без приветствий.` 
                    },
                    // Few-Shot пример создания связующей таблицы "многие-ко-многим" строго по правилам Access
                    { 
                        role: 'user', 
                        content: 'Создай связующую таблицу [РаботаНаСтанке] между таблицами [Рабочие] и [Станки] с составным первичным ключом и внешними ключами.' 
                    },
                    { 
                        role: 'assistant', 
                        content: `### Структура таблицы [РаботаНаСтанке]
Таблица содержит составной первичный ключ и внешние ключи, оформленные строго по синтаксису CONSTRAINT MS Access.

### Финальный SQL (MS Access)
\`\`\`sql
CREATE TABLE [РаботаНаСтанке] (
    [IDРабочего] LONG NOT NULL,
    [IDСтанка] LONG NOT NULL,
    CONSTRAINT [PK_РаботаНаСтанке] PRIMARY KEY ([IDРабочего], [IDСтанка]),
    CONSTRAINT [FK_РаботаНаСтанке_Рабочие] FOREIGN KEY ([IDРабочего]) REFERENCES [Рабочие]([ID]),
    CONSTRAINT [FK_РаботаНаСтанке_Станки] FOREIGN KEY ([IDСтанка]) REFERENCES [Станки]([ID])
);
\`\`\`
` 
                    },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 1800,
                temperature: 0.0 // Полная стабильность без отклонений от правил
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
