import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  // Sử dụng gemini-2.0-flash-exp vì khả năng nhìn (Vision) tốt nhất hiện nay cho bảng biểu phức tạp
  const modelId = 'gemini-2.0-flash-exp';

  const prompt = `
    You are an intelligent assistant extracting data from a Vietnamese School Timetable (Thời Khóa Biểu).
    
    --- 1. ANALYZE USER REQUEST ---
    User Instruction: "${userInstruction}"
    
    * Task: Interpret the User Instruction to find the TARGET COLUMN HEADER.
    * Example: If user says "lấy lịch lớp 12a1" or "xem 12A1", the Target Header is "12A1" (or similar like "12 A1", "Lớp 12A1").
    * If User Instruction is empty, default to the FIRST column containing subject data.
    
    --- 2. ANALYZE IMAGE STRUCTURE ---
    * Look for the Header Row containing Class Names (e.g., 12E1, 12E2, 12A1...).
    * Locate the column that matches the Target Header found in Step 1.
    * Locate the "Thứ" (Day) and "Tiết" (Period) / "TG" (Time) columns on the far left.
    * NOTE: The "Thứ" column uses MERGED CELLS. If a row has no "Thứ", use the value from the row above it.

    --- 3. EXTRACT DATA ---
    Scan the TARGET COLUMN row by row:
    * If the cell has text (Subject Name):
      1. Map it to the corresponding "Thứ" (Day) on the left.
      2. Map it to the "Tiết" (Period) or "TG" (Time).
      3. Extract Subject Name.

    --- 4. DATA CLEANING & FORMATTING ---
    * Time: Convert "7g10" to "07:10". If only Period (Tiết) is shown:
      - Morning: 1(07:00-07:45), 2(07:50-08:35), 3(08:45-09:30), 4(09:40-10:25), 5(10:30-11:15).
      - Afternoon: 1(12:45-13:30), 2(13:35-14:20), 3(14:25-15:10), 4(15:20-16:05), 5(16:10-16:55).
    * Day: Format as "Thứ 2", "Thứ 3", etc.

    --- 5. OUTPUT ---
    Return STRICTLY a JSON Array. No markdown, no explanations.
    [
      { "subject": "Toán", "day": "Thứ 2", "startTime": "07:10", "endTime": "07:55" }
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
          temperature: 0.2, // Tăng nhẹ temperature để AI "hiểu" ngôn ngữ tự nhiên linh hoạt hơn
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
        if (jsonMatch) cleanText = jsonMatch[0];
        else cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');

        try {
            const parsed = JSON.parse(cleanText);
            
            if (!Array.isArray(parsed) || parsed.length === 0) {
               console.warn("AI trả về mảng rỗng:", response.text);
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
            throw new Error("Lỗi cấu trúc dữ liệu AI.");
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
         let msg = "Không thể đọc lịch từ ảnh này.";
         if (error.message?.includes('404')) msg = "Dịch vụ AI đang gián đoạn.";
         throw new Error(msg);
      }
    }
  }
  return [];
};

export const geminiService = {
  parseScheduleImage
};