import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const modelId = 'gemini-2.0-flash-exp';

  // Prompt chuyên dụng cho thời khóa biểu dạng lưới (Matrix) Việt Nam
  const prompt = `
    You are a data entry engine. Your job is to extract school schedule from an image of a Grid/Matrix Timetable.

    --- USER INSTRUCTION ---
    Target Class/Column: "${userInstruction ? userInstruction : "AUTO DETECT (Find the most populated column)"}"
    
    --- IMAGE STRUCTURE ---
    1. The Left-most columns are usually: "Thứ" (Day), "Buổi" (Session), "Tiết" (Period), "TG" (Time).
    2. The Header Row contains Class Names (e.g., 12E1, 12E2, 12A1...).
    3. The "Thứ" (Day) column uses MERGED CELLS. It implies the day applies to all rows until the text changes (e.g., "2" covers all rows until "3").
    
    --- ALGORITHM TO EXECUTE ---
    1. Identify the specific column index for the Target Class requested by User (e.g., "12A1"). If user didn't specify, use the first column with data.
    2. Scan that specific column row by row.
    3. IF a cell in that column contains a Subject (text is not empty):
       a. LOOK LEFT all the way to the first column to find the "Thứ" (Day). Handle merged cells (carry over previous value).
       b. LOOK LEFT to find "TG" or "Tiết".
       c. Extract Subject, Day, StartTime, EndTime.
    
    --- DATA CLEANING RULES ---
    1. Time Format: Convert "7g10" -> "07:10", "12g30" -> "12:30". 
    2. If only "Tiết" is available:
       - Morning (Sáng): T1=07:00, T2=07:50, T3=08:45, T4=09:35, T5=10:25.
       - Afternoon (Chiều): T1=12:45, T2=13:35, T3=14:30, T4=15:20, T5=16:10.
    3. Day Format: Return "Thứ 2", "Thứ 3", ..., "Chủ nhật".

    --- OUTPUT ---
    Return ONLY a valid JSON Array. Do not explain.
    [
      { "subject": "Toán", "day": "Thứ 2", "startTime": "07:10", "endTime": "07:55" },
      { "subject": "Lý", "day": "Thứ 2", "startTime": "08:00", "endTime": "08:45" }
    ]
  `;

  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  ];

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } },
            { text: prompt }
          ]
        },
        config: {
          safetySettings: safetySettings as any, 
          temperature: 0.1, // Cực kỳ quan trọng để AI không "sáng tạo" lung tung
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        
        // Dùng Regex để bắt chính xác mảng JSON, bỏ qua mọi lời dẫn
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        } else {
             cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }

        try {
            const parsed = JSON.parse(cleanText);
            
            if (!Array.isArray(parsed) || parsed.length === 0) {
               if (attempts < 2) throw new Error("Empty Array");
            }

            return parsed.map((item: any) => ({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              subject: item.subject || "Môn học",
              day: item.day || "Thứ 2",
              startTime: item.startTime || "07:00",
              endTime: item.endTime || "07:45"
            }));
        } catch (parseError) {
            console.error("JSON Error:", response.text);
            throw new Error("Lỗi đọc dữ liệu.");
        }
      }
      return [];

    } catch (error: any) {
      console.error(`Retry ${attempts + 1}...`, error);
      attempts++;
      
      if (error.message?.includes('503') || error.message?.includes('429')) {
        await delay(2000 * attempts); 
        continue;
      }

      if (attempts === 3) {
         let msg = "Không thể nhận dạng.";
         if (error.message?.includes('404')) msg = "Lỗi kết nối AI.";
         throw new Error(msg);
      }
    }
  }
  return [];
};

export const geminiService = {
  parseScheduleImage
};