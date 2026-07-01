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
                        content: `Ты — продвинутый ИИ-компилятор, работающий по принципу "Сначала думай, потом кодируй". Твоя цель — выдать 100% рабочий, синтаксически идеальный SQL-код для Microsoft Access (Jet SQL).

                        КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ MS ACCESS SQL:
                        1. В Access КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать COUNT(DISTINCT [Поле]). Такой конструкции не существует, она вызывает ошибку синтаксиса!
                           Чтобы посчитать количество уникальных значений в Access, ты ОБЯЗАН использовать вложенный подзапрос с SELECT DISTINCT.
                           ПРИМЕР: SELECT COUNT(*) FROM (SELECT DISTINCT [Поле] FROM [Таблица]);

                        2. Для связывания таблиц используй классический стандарт ANSI-89 через WHERE. Перечисляй таблицы через запятую в FROM, а связи пиши в WHERE через AND.
                        3. Никаких операторов JOIN (INNER, LEFT) и круглых скобок в секции FROM, чтобы исключить ошибки "пропущен оператор".
                        4. Все имена полей и таблиц ОБЯЗАТЕЛЬНО оборачивай в квадратные скобки: [Таблица].[Поле].
                        5. Автоинкремент при создании: строго COUNTER. Текст: строго TEXT(255).

                        ФОРМАТ ВЫВОДА:
                        Выводи ответ сразу, четко и по делу: сначала графическую схему, затем готовый SQL-блок. Никаких приветствий и лишнего текста.` 
                    },
                    // Шаблон-пример, обучающий модель обходить баг с COUNT DISTINCT
                    { 
                        role: 'user', 
                        content: 'Посчитай количество уникальных клиентов, сделавших заказы.' 
                    },
                    { 
                        role: 'assistant', 
                        content: `### Результат расчета
Запрос на подсчет уникальных записей оптимизирован под требования СУБД MS Access.

### Финальный SQL (MS Access)
\`\`\`sql
SELECT COUNT(*) AS [КоличествоУникальныхКлиентов]
FROM (SELECT DISTINCT [КодКлиента] FROM [Заказы]);
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
