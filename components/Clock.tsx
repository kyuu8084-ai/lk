import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';

type ClockMode = 'clock' | 'pomodoro' | 'stopwatch';

const Clock: React.FC = () => {
  const [mode, setMode] = useState<ClockMode>('clock');
  const [time, setTime] = useState(new Date());

  // Pomodoro State
  const [pomoTime, setPomoTime] = useState(25 * 60); // 25 mins
  const [isPomoRunning, setIsPomoRunning] = useState(false);
  // Fixed: NodeJS.Timeout -> any to avoid namespace errors in browser environment
  const pomoInterval = useRef<any>(null);

  // Stopwatch State
  const [swTime, setSwTime] = useState(0);
  const [isSwRunning, setIsSwRunning] = useState(false);
  // Fixed: NodeJS.Timeout -> any to avoid namespace errors in browser environment
  const swInterval = useRef<any>(null);

  // Normal Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pomodoro Logic
  useEffect(() => {
    if (isPomoRunning && pomoTime > 0) {
      pomoInterval.current = setInterval(() => {
        setPomoTime(prev => {
          if (prev <= 1) {
            audioService.playAlarm();
            setIsPomoRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomoInterval.current) clearInterval(pomoInterval.current);
    }
    return () => { if (pomoInterval.current) clearInterval(pomoInterval.current); };
  }, [isPomoRunning, pomoTime]);

  const formatPomo = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Stopwatch Logic
  useEffect(() => {
    if (isSwRunning) {
      const startTime = Date.now() - swTime;
      swInterval.current = setInterval(() => {
        setSwTime(Date.now() - startTime);
      }, 10); // Update every 10ms
    } else {
      if (swInterval.current) clearInterval(swInterval.current);
    }
    return () => { if (swInterval.current) clearInterval(swInterval.current); };
  }, [isSwRunning]);

  const formatStopwatch = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 mb-8 border border-white/20 relative overflow-hidden">
      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button 
          onClick={() => setMode('clock')}
          className={`px-4 py-1 rounded-full text-sm font-bold transition-all ${mode === 'clock' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          Đồng hồ
        </button>
        <button 
          onClick={() => setMode('pomodoro')}
          className={`px-4 py-1 rounded-full text-sm font-bold transition-all ${mode === 'pomodoro' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          Pomodoro
        </button>
        <button 
          onClick={() => setMode('stopwatch')}
          className={`px-4 py-1 rounded-full text-sm font-bold transition-all ${mode === 'stopwatch' ? 'bg-indigo-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          Bấm giờ
        </button>
      </div>

      <div className="text-center min-h-[120px] flex flex-col justify-center">
        {mode === 'clock' && (
          <div className="animate-fadeIn">
            <div className="text-5xl md:text-6xl font-black font-mono text-primary dark:text-accent tracking-widest drop-shadow-sm mb-2">
              {time.toLocaleTimeString('vi-VN', { hour12: false })}
            </div>
            <div className="text-xl md:text-2xl font-serif text-gray-500 dark:text-gray-300 font-bold">
              {time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}
            </div>
          </div>
        )}

        {mode === 'pomodoro' && (
          <div className="animate-fadeIn">
            <div className="text-6xl font-black font-mono text-orange-500 tracking-widest mb-4">
              {formatPomo(pomoTime)}
            </div>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsPomoRunning(!isPomoRunning)}
                className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all ${isPomoRunning ? 'bg-red-500' : 'bg-green-500'}`}
              >
                {isPomoRunning ? 'Tạm dừng' : 'Bắt đầu'}
              </button>
              <button 
                onClick={() => { setIsPomoRunning(false); setPomoTime(25 * 60); }}
                className="px-6 py-2 rounded-xl font-bold bg-gray-200 text-gray-600 hover:bg-gray-300 shadow-lg"
              >
                Đặt lại (25p)
              </button>
            </div>
          </div>
        )}

        {mode === 'stopwatch' && (
          <div className="animate-fadeIn">
            <div className="text-6xl font-black font-mono text-indigo-500 tracking-widest mb-4">
              {formatStopwatch(swTime)}
            </div>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsSwRunning(!isSwRunning)}
                className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all ${isSwRunning ? 'bg-red-500' : 'bg-green-500'}`}
              >
                {isSwRunning ? 'Dừng' : 'Chạy'}
              </button>
              <button 
                onClick={() => { setIsSwRunning(false); setSwTime(0); }}
                className="px-6 py-2 rounded-xl font-bold bg-gray-200 text-gray-600 hover:bg-gray-300 shadow-lg"
              >
                Đặt lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clock;