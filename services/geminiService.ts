import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

// Helper for sleep/delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Dùng model 2.0 Flash Exp vì khả năng nhìn bảng tốt nhất hiện nay
  const modelId = 'gemini-2.0-flash-exp';

  const prompt = `
    You are an expert OCR system for Vietnamese School Timetables.
    Analyze the image and extract the schedule into a strictly valid JSON array.

    --- IMAGE STRUCTURE ANALYSIS ---
    1. This is a grid table.
    2. Column 1 "Thứ": Day of week (2, 3, 4, 5, 6, 7). It uses MERGED CELLS (spans multiple rows). imply the day for all rows until it changes.
    3. Column "TG" or "Thời gian": Time format is often "7g10" (07:10), "12g30" (12:30). YOU MUST CONVERT THIS TO "HH:mm".
    4. Data Columns: There are columns for classes (e.g., 12E1, 12E2, 12A1).
    
    --- EXTRACTION RULES ---
    1. Iterate through every row representing a period (Tiết).
    2. Look at the data columns (subjects).
    3. If user provided instruction like "Lớp 12E1", only extract that column.
    4. IF NO INSTRUCTION is provided, extract ALL subjects found in ANY column for that time slot. If multiple columns have subjects, create multiple entries or combine them.
    5. Ignore empty cells.
    6. "S" column usually means Morning (Sáng), "C" usually means Afternoon (Chiều).
    
    --- OUTPUT FORMAT ---
    Return strictly a JSON Array of objects:
    [
      { "subject": "Toán - Thầy A", "day": "Thứ 2", "startTime": "07:10", "endTime": "07:55" },
      ...
    ]

    * IMPORTANT: Calculate endTime. usually a period is 45 minutes.
    * If only "Tiết 1" is found without time: 
      - Morning: 1(07:00), 2(07:50), 3(08:45), 4(09:35), 5(10:25).
      - Afternoon: 1(12:45), 2(13:35), 3(14:30), 4(15:20), 5(16:10).
    * If "7g10" is seen, start time is 07:10, end time is 07:55 (approx).
    
    --- USER INSTRUCTION ---
    ${userInstruction ? `FOCUS ON: ${userInstruction}` : "Extract all visible subjects."}
  `;

  // Sử dụng chuỗi thay vì Enum để tránh lỗi tương thích phiên bản
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
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Image
              }
            },
            { text: prompt }
          ]
        },
        config: {
          safetySettings: safetySettings as any, 
          temperature: 0.1, // Low temperature for precision
          responseMimeType: "application/json",
          // Removed strict schema to let the model handle flexible JSON generation better for complex tables
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        
        // --- IMPROVED JSON EXTRACTION ---
        const firstOpen = cleanText.indexOf('[');
        const lastClose = cleanText.lastIndexOf(']');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleanText = cleanText.substring(firstOpen, lastClose + 1);
        } else {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }

        try {
            const parsed = JSON.parse(cleanText);
            
            // Validate content
            if (!Array.isArray(parsed) || parsed.length === 0) {
               console.warn("AI returned valid JSON but empty array.", response.text);
               // If empty, force throw to retry or fail
               if (attempts < 2) throw new Error("Empty result");
            }

            return parsed.map((item: any) => ({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              subject: item.subject || "Môn học",
              day: item.day || "Thứ 2",
              startTime: item.startTime || "07:00",
              endTime: item.endTime || "07:45"
            }));
        } catch (parseError) {
            console.error("JSON Parse Error. Raw text:", response.text);
            throw new Error("Lỗi đọc dữ liệu từ AI.");
        }
      }
      return [];

    } catch (error: any) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
      attempts++;
      
      if (error.message?.includes('503') || error.message?.includes('429')) {
        await delay(2000 * attempts); 
        continue;
      }

      if (attempts === 3) {
         let msg = "Không thể nhận dạng ảnh.";
         if (error.message?.includes('404') || error.message?.includes('NOT_FOUND')) {
             msg = "Model AI đang bảo trì. Vui lòng thử lại sau.";
         } else if (error.message?.includes('400')) {
             msg = "Ảnh bị lỗi định dạng.";
         }
         throw new Error(msg);
      }
    }
  }
  return [];
};

export const geminiService = {
  parseScheduleImage
};