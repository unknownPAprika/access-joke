document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-query-btn');
    const outputField = document.getElementById('output-field');

    async function sendToAI() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // Визуальный статус загрузки внутри "белого листа" программы
        outputField.innerText = "Выполнение SQL-запроса к локальной базе данных... Пожалуйста, подождите.";
        promptInput.value = '';

        try {
            const response = await fetch('/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: prompt })
            });

            const data = await response.json();
            
            if (data && data.text) {
                outputField.innerText = data.text;
            } else {
                outputField.innerText = "Ошибка СУБД: Сервер вернул пустую структуру данных.";
            }

        } catch (networkError) {
            outputField.innerText = "Ошибка подключения: Не удалось установить физическую связь с ядром базы данных.";
            console.error(networkError);
        }
    }

    sendBtn.addEventListener('click', sendToAI);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendToAI();
        }
    });
});
