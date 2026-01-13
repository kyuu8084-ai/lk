import React, { useEffect, useRef, useState } from 'react';
import { Schedule, DAYS_OF_WEEK, AlarmSoundType } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  schedules: Schedule[];
  alarmSound?: AlarmSoundType;
}

const NotificationSystem: React.FC<Props> = ({ schedules, alarmSound = 'standard' }) => {
  const lastNotifiedRef = useRef<Record<string, number>>({});
  const [activeAlert, setActiveAlert] = useState<{title: string, message: string} | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkSchedule = () => {
      if (!schedules.length) return;

      const now = new Date();
      const currentDayIndex = now.getDay(); 
      const vietnameseDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
      const currentDayName = DAYS_OF_WEEK[vietnameseDayIndex];
      
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      schedules.forEach(schedule => {
        const key = `${schedule.id}-${schedule.startTime}`;
        
        // Prevent duplicate alerts within 60 seconds
        if (lastNotifiedRef.current[key]) {
          const diff = now.getTime() - lastNotifiedRef.current[key];
          if (diff < 60000) return;
        }

        if (schedule.day !== currentDayName) return;

        // Calculate 5 mins before
        const [h, m] = schedule.startTime.split(':').map(Number);
        const startTimeDate = new Date(now);
        startTimeDate.setHours(h, m, 0, 0);
        
        const fiveMinBeforeDate = new Date(startTimeDate.getTime() - 5 * 60000);
        const fiveMinBeforeTime = `${String(fiveMinBeforeDate.getHours()).padStart(2,'0')}:${String(fiveMinBeforeDate.getMinutes()).padStart(2,'0')}`;

        let alertTitle = '';
        let alertMsg = '';
        
        if (currentTime === schedule.startTime) {
          alertTitle = "ĐÃ ĐẾN GIỜ HỌC!";
          alertMsg = `Môn học: ${schedule.subject} bắt đầu ngay bây giờ.`;
        } else if (currentTime === fiveMinBeforeTime) {
          alertTitle = "SẮP ĐẾN GIỜ HỌC";
          alertMsg = `Chuẩn bị: ${schedule.subject} sẽ bắt đầu trong 5 phút.`;
        }

        if (alertMsg) {
          lastNotifiedRef.current[key] = now.getTime();
          
          // 1. Trigger Visual Modal
          setActiveAlert({ title: alertTitle, message: alertMsg });

          // 2. Play Audio with selected sound
          audioService.playAlarm(alarmSound as AlarmSoundType);

          // 3. Browser Notification
          if (Notification.permission === "granted") {
             new Notification(alertTitle, {
               body: alertMsg,
               icon: "/favicon.ico",
               tag: key 
             });
          }
        }
      });
    };

    const intervalId = setInterval(checkSchedule, 1000);
    return () => clearInterval(intervalId);
  }, [schedules, alarmSound]);

  const handleDismiss = () => {
    setActiveAlert(null);
  };

  if (!activeAlert) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border-2 border-primary animate-bounce-gentle">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <i className="fas fa-bell text-4xl"></i>
        </div>
        <h3 className="text-2xl font-black font-serif text-slate-800 dark:text-white mb-2">{activeAlert.title}</h3>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 font-medium">{activeAlert.message}</p>
        
        <button 
          onClick={handleDismiss}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-primary/50 transform active:scale-95 transition-all"
        >
          Đã rõ, tắt chuông
        </button>
      </div>
    </div>
  );
};

export default NotificationSystem;