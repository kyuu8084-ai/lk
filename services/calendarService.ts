import { Schedule, Exam } from '../types';

export const calendarService = {
  generateICS: (schedules: Schedule[], exams: Exam[]): string => {
    const now = new Date();
    // Helper to format date for ICS (YYYYMMDDTHHmmSSZ)
    const formatTime = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudyWithMe//Schedule//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    // Helper to get next occurrence of a day
    const getNextDayOfWeek = (dayName: string, timeStr: string) => {
      // Map Vietnamese days to 0-6 (Sun-Sat)
      const dayMap: {[key: string]: number} = {
        'Chủ nhật': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6
      };
      
      const targetDay = dayMap[dayName];
      if (targetDay === undefined) return new Date(); // Fallback

      const d = new Date();
      const [hh, mm] = timeStr.split(':').map(Number);
      d.setHours(hh, mm, 0, 0);

      const currentDay = d.getDay();
      let distance = (targetDay + 7 - currentDay) % 7;
      
      // If distance is 0, it means it's today. 
      // If the time has already passed today, we might want to schedule for next week, 
      // but for a generic start date, today is fine.
      
      d.setDate(d.getDate() + distance);
      return d;
    };

    // Process Schedules (Weekly Events)
    schedules.forEach(sch => {
      const startDate = getNextDayOfWeek(sch.day, sch.startTime);
      const endDate = new Date(startDate);
      const [endH, endM] = sch.endTime.split(':').map(Number);
      endDate.setHours(endH, endM, 0, 0);

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${sch.id}@studywithme.app`);
      icsContent.push(`DTSTAMP:${formatTime(now)}`);
      icsContent.push(`DTSTART:${formatTime(startDate)}`);
      icsContent.push(`DTEND:${formatTime(endDate)}`);
      icsContent.push(`SUMMARY:${sch.subject}`);
      icsContent.push('RRULE:FREQ=WEEKLY'); 
      icsContent.push('END:VEVENT');
    });

    // Process Exams (One-time Events)
    if (exams) {
      exams.forEach(exam => {
        if (!exam.date) return;
        const [y, m, d] = exam.date.split('-').map(Number);
        // Default exam time: 08:00 AM - 10:00 AM
        const startDate = new Date(y, m - 1, d, 8, 0, 0);
        const endDate = new Date(y, m - 1, d, 10, 0, 0);

        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:${exam.id}@studywithme.app`);
        icsContent.push(`DTSTAMP:${formatTime(now)}`);
        icsContent.push(`DTSTART:${formatTime(startDate)}`);
        icsContent.push(`DTEND:${formatTime(endDate)}`);
        icsContent.push(`SUMMARY:Lịch Thi: ${exam.subject}`);
        icsContent.push(`DESCRIPTION:${exam.description || ''}`);
        icsContent.push('END:VEVENT');
      });
    }

    icsContent.push('END:VCALENDAR');
    return icsContent.join('\r\n');
  },

  downloadICS: (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};