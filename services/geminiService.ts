import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

// Helper for sleep/delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Dùng Gemini 2.0 Flash Exp để có vision tốt nhất.
  const modelId = 'gemini-2.0-flash-exp';

  const prompt = `
    Analyze this Vietnamese High School Timetable (Thời Khóa Biểu).
    
    CRITICAL: The table might contain multiple columns for different classes (e.g., 12E1, 12E2, 12A1...).
    
    --- EXTRACTION INSTRUCTIONS ---
    1. Identify the 'Thứ' (Day) column. Cells are often merged vertically. Apply the Day to all rows it spans.
    2. Identify the 'Tiết' (Period) and 'TG/Thời gian' column. 
       - TIME FORMAT: "7g10" means "07:10", "7g55" means "07:55". Convert to "HH:mm".
    3. Identify Class Columns. 
       - IF user instruction says "12A1", ONLY read the column for 12A1.
       - IF user instruction is empty, read the FIRST class column found, OR try to merge meaningful data.
    4. Ignore empty cells.
    
    --- USER INSTRUCTION ---
    "${userInstruction ? userInstruction : "Read the schedule for the most prominent class or the first column."}"

    --- OUTPUT FORMAT ---
    Return strictly a valid JSON Array. NO markdown code blocks.
    [
      { "subject": "Toán - Thầy A", "day": "Thứ 2", "startTime": "07:10", "endTime": "07:55" },
      ...
    ]
    
    * StartTime/EndTime Calculation:
      - If "TG" column exists: Use it. "7g10" -> 07:10.
      - If only "Tiết" exists: 
        Morning: 1=07:00, 2=07:50, 3=08:45, 4=09:35, 5=10:25.
        Afternoon: 1=12:45, 2=13:35, 3=14:30, 4=15:20, 5=16:10.
      - Duration is usually 45 mins per period.
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
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        
        // Robust JSON cleaning
        const firstOpen = cleanText.indexOf('[');
        const lastClose = cleanText.lastIndexOf(']');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            cleanText = cleanText.substring(firstOpen, lastClose + 1);
        } else {
             // Try to remove markdown wrapper
             cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }

        try {
            const parsed = JSON.parse(cleanText);
            
            if (!Array.isArray(parsed) || parsed.length === 0) {
               console.warn("AI returned valid JSON but empty array or invalid structure.", response.text);
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
            console.error("JSON Parse Error. Raw AI text:", response.text);
            throw new Error("Lỗi cấu trúc dữ liệu từ AI.");
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
         if (error.message?.includes('404')) msg = "Model AI đang bảo trì. Thử lại sau.";
         if (error.message?.includes('400')) msg = "Ảnh lỗi. Vui lòng thử ảnh khác.";
         throw new Error(msg);
      }
    }
  }
  return [];
};

export const geminiService = {
  parseScheduleImage
};