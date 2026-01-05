import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-3-flash-preview';

export const generateLyricsOrInfo = async (songName: string, artistName: string): Promise<string> => {
  if (!process.env.API_KEY) return "AI 功能需要 API Key。";
  
  try {
    const prompt = `请为歌曲 "${songName}" (歌手: "${artistName}") 提供歌词（如果受版权保护，请提供详细的歌曲含义、背景故事或情感解读）。
    请使用中文回答，格式要优美，分段清晰。如果无法提供歌词，请介绍关于这首歌的有趣冷知识。`;
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "无法生成信息。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "无法加载 AI 内容，请检查网络或 API Key。";
  }
};

export const getSmartRecommendations = async (userQuery: string): Promise<{ searchTerm: string, reason: string }> => {
  if (!process.env.API_KEY) return { searchTerm: userQuery, reason: "直接搜索 (AI 未启用)" };

  try {
    const prompt = `你是一位专业的音乐 DJ。用户输入: "${userQuery}"。
    请将其转化为一个最适合在 iTunes Music API 搜索的英文或中文关键词（例如：'Jay Chou', 'Eason Chan', 'Lo-fi beats'）。
    同时用一句简短的中文解释为什么选择这个关键词。
    
    请返回 JSON 格式: { "searchTerm": "...", "reason": "..." }`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            searchTerm: { type: Type.STRING },
            reason: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (text) {
        return JSON.parse(text);
    }
    return { searchTerm: userQuery, reason: "AI 无法处理，使用原始查询。" };

  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return { searchTerm: userQuery, reason: "直接搜索模式。" };
  }
};