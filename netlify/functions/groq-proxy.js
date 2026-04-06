exports.handler = async (event, context) => {
    // --- CORS Headers (for local development with netlify dev) ---
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    // Handle preflight requests
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: { ...corsHeaders, "Allow": "POST" },
            body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
        };
    }

    try {
        // --- Input Validation ---
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Request body is empty." }),
            };
        }

        const body = JSON.parse(event.body);
        const { messages, model, temperature, max_tokens } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Missing or invalid 'messages' array in request body." }),
            };
        }

        // --- API Key Check ---
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            console.error("GROQ_API_KEY is missing in environment variables.");
            return {
                statusCode: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                    error: "API Key not configured.",
                    detail: "The GROQ_API_KEY environment variable is not set. If you are the site owner, add it in Netlify Dashboard > Site configuration > Environment variables."
                }),
            };
        }

        // --- Call Groq API ---
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages,
                model: model || "llama-3.3-70b-versatile",
                temperature: temperature ?? 0.7,
                max_tokens: max_tokens || 1000,
            }),
        });

        const data = await response.json();

        // --- Forward Errors from Groq ---
        if (!response.ok) {
            console.error(`Groq API returned ${response.status}:`, JSON.stringify(data));

            let userMessage = "Failed to communicate with Groq AI.";
            if (response.status === 429) {
                userMessage = "Rate limit exceeded. Please wait a moment and try again.";
            } else if (response.status === 401) {
                userMessage = "Invalid API key. The site owner needs to update the GROQ_API_KEY.";
            } else if (response.status >= 500) {
                userMessage = "Groq AI server is temporarily unavailable. Try again in a few minutes.";
            }

            return {
                statusCode: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ error: userMessage, groq_error: data }),
            };
        }

        return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error("Proxy Error:", error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Internal proxy error. Failed to communicate with Groq AI." }),
        };
    }
};
