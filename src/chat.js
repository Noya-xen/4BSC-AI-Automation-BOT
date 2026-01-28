import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


const agent = `You are an AI agent generator.
Your task is to create an random agent and short description.
You MUST respond with valid JSON only.
The JSON schema must be exactly:
{
  "name_agent": string, (must no spaces),
  "description": string string 120 – 200 characters
}
Do not include explanations, markdown, or extra text.
`;
const requestAgent = `You are an AI request generator.
Your task is to create an random request title.
You MUST respond with valid JSON only.
The JSON schema must be exactly:
{
  "title": string with spaces,
  "description": string 120 – 200 characters
}
`;
export async function generateAIResponse(prompt, systemPrompt) {
    const options = {
        method: 'POST',
        url: 'https://gen.pollinations.ai/v1/chat/completions',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.API_KEY}`
        },
        data: {
            messages: [
                {
                    role: "system",
                    name: "system",
                    content: systemPrompt === 'createAgent' ? agent : requestAgent,
                    cache_control: {
                        type: "ephemeral",
                    },
                },
                {
                    role: "user",
                    content: prompt || "hi",
                },
            ],
            model: 'nova-fast',
            response_format: { type: 'text' },
            seed: -1,
            stop: '',
            stream: false,
            thinking: { type: 'disabled', budget_tokens: 1 },
            temperature: 0.8,
            top_p: 1,
            user: '',
        }
    };
    try {
        const { data } = await axios.request(options);
        const responseContent = data.choices?.[0]?.message?.content ?? "";
        //console.log(responseContent);
        return responseContent;
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        return null;
    }
}


