exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { 
            statusCode: 405, 
            headers: { "Allow": "POST" },
            body: "Method Not Allowed" 
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { messages, model, temperature, max_tokens } = body;

        // Fetch your API Key from Netlify Environment Variables
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            console.error("GROQ_API_KEY is missing in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "API Key not configured in Netlify." })
            };
        }

        // Use built-in fetch (Node 18+)
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages,
                model: model || "llama-3.3-70b-versatile",
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 1000
            })
        });

        const data = await response.json();

        return {
            statusCode: response.status,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error("Proxy Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to communicate with Groq AI." })
        };
    }
};
