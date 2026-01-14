import React, { useState, useRef, useEffect } from 'react';
import { User, Schedule, Exam, DAYS_OF_WEEK, AlarmSoundType, ThemeConfig, FontPair, ColorTheme } from '../types';
import Clock from './Clock';
import WeeklySchedule from './WeeklySchedule';
import ExamCountdown from './ExamCountdown';
import ExamManager from './ExamManager'; 
import NotificationSystem from './NotificationSystem';
import { geminiService } from '../services/geminiService';
import { calendarService } from '../services/calendarService';
import { audioService } from '../services/audioService';

interface Props {
  user: User;
  onLogout: () => void;
  onUpdateSchedules: (schedules: Schedule[]) => void;
}

const Dashboard: React.FC<Props> = ({ user, onLogout, onUpdateSchedules }) => {
  const [activeTab, setActiveTab] = useState<'single' | 'quick' | 'image'>('image'); 
  const [viewMode, setViewMode] = useState<'schedule' | 'exams'>('schedule'); 
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [alarmSound, setAlarmSound] = useState<AlarmSoundType>('standard');
  const [showSettings, setShowSettings] = useState(false); // Combined settings modal
  const [settingsTab, setSettingsTab] = useState<'audio' | 'theme'>('theme');
  
  // Theme State
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    font: 'modern',
    color: 'default'
  });

  const [singleForm, setSingleForm] = useState({
    subject: '',
    day: 'Thứ 2',
    startTime: '',
    endTime: ''
  });

  const [quickText, setQuickText] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load Dark Mode
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
    
    // Load Alarm Sound
    const savedSound = localStorage.getItem('studyWithMeAlarmSound');
    if (savedSound) {
      setAlarmSound(savedSound as AlarmSoundType);
    }

    // Load Theme
    const savedTheme = localStorage.getItem('studyWithMeTheme');
    if (savedTheme) {
      setThemeConfig(JSON.parse(savedTheme));
    }
  }, []);

  // Apply Theme Changes
  useEffect(() => {
    const root = document.documentElement;

    // Apply Fonts
    switch (themeConfig.font) {
      case 'classic':
        root.style.setProperty('--font-sans', 'Roboto');
        root.style.setProperty('--font-serif', 'Merriweather');
        break;
      case 'clean':
        root.style.setProperty('--font-sans', 'Inter');
        root.style.setProperty('--font-serif', 'Lora');
        break;
      case 'modern':
      default:
        root.style.setProperty('--font-sans', 'Montserrat');
        root.style.setProperty('--font-serif', 'Playfair Display');
        break;
    }

    // Apply Colors (RGB format for Tailwind opacity support)
    switch (themeConfig.color) {
      case 'nature': // Emerald/Teal/Lime
        root.style.setProperty('--color-primary', '16 185 129'); // Emerald-500
        root.style.setProperty('--color-secondary', '20 184 166'); // Teal-500
        root.style.setProperty('--color-accent', '132 204 22');   // Lime-500
        break;
      case 'sunset': // Orange/Red/Yellow
        root.style.setProperty('--color-primary', '249 115 22');  // Orange-500
        root.style.setProperty('--color-secondary', '239 68 68'); // Red-500
        root.style.setProperty('--color-accent', '234 179 8');    // Yellow-500
        break;
      case 'ocean': // Blue/Cyan/Sky
        root.style.setProperty('--color-primary', '59 130 246');  // Blue-500
        root.style.setProperty('--color-secondary', '6 182 212'); // Cyan-500
        root.style.setProperty('--color-accent', '14 165 233');   // Sky-500
        break;
      case 'monochrome': // Slate/Gray
        root.style.setProperty('--color-primary', '71 85 105');   // Slate-600
        root.style.setProperty('--color-secondary', '100 116 139'); // Slate-500
        root.style.setProperty('--color-accent', '30 41 59');     // Slate-800
        break;
      case 'default':
      default: // Indigo/Purple/Pink
        root.style.setProperty('--color-primary', '99 102 241');
        root.style.setProperty('--color-secondary', '168 85 247');
        root.style.setProperty('--color-accent', '236 72 153');
        break;
    }

    localStorage.setItem('studyWithMeTheme', JSON.stringify(themeConfig));
  }, [themeConfig]);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  const handleSoundChange = (type: AlarmSoundType) => {
    setAlarmSound(type);
    localStorage.setItem('studyWithMeAlarmSound', type);
    audioService.playAlarm(type); // Preview
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.subject || !singleForm.startTime || !singleForm.endTime) return;
    const newSchedule: Schedule = { id: Date.now().toString(), ...singleForm };
    onUpdateSchedules([...user.schedules, newSchedule]);
    setSingleForm({ ...singleForm, subject: '', startTime: '', endTime: '' });
    alert('Đã thêm môn học thành công!');
  };

  const handleQuickSubmit = () => {
    const lines = quickText.split('\n');
    const newItems: Schedule[] = [];
    lines.forEach(line => {
      const parts = line.split('-').map(s => s.trim());
      if (parts.length >= 4) {
        newItems.push({
          id: Date.now() + Math.random().toString(),
          subject: parts[0],
          day: parts[1],
          startTime: parts[2],
          endTime: parts[3]
        });
      }
    });
    if (newItems.length > 0) {
      onUpdateSchedules([...user.schedules, ...newItems]);
      setQuickText('');
      alert(`Đã thêm nhanh ${newItems.length} môn học!`);
    } else {
      alert('Định dạng không đúng (Môn - Thứ - Bắt đầu - Kết thúc)');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoadingAI(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Extract correct MIME type (e.g., image/png or image/jpeg)
        const mimeType = base64String.split(';')[0].split(':')[1];
        const base64Data = base64String.split(',')[1];
        
        try {
          // Pass MIME type to service
          const parsedSchedules = await geminiService.parseScheduleImage(base64Data, mimeType, aiInstruction);
          if (parsedSchedules.length > 0) {
            onUpdateSchedules([...user.schedules, ...parsedSchedules]);
            alert(`AI đã thêm thành công ${parsedSchedules.length} môn học!`);
          } else {
            alert('AI không tìm thấy lịch học. Hãy thử mô tả kỹ hơn hoặc crop ảnh chỉ lấy phần bảng.');
          }
        } catch (err: any) {
          alert(`Lỗi: ${err.message}`);
        } finally {
          setIsLoadingAI(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsLoadingAI(false);
      alert("Lỗi khi đọc file ảnh.");
    }
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa môn này?')) {
      onUpdateSchedules(user.schedules.filter(s => s.id !== id));
    }
  };

  const handleAddExam = (newExam: Exam) => {
    user.exams = [...(user.exams || []), newExam];
    onUpdateSchedules([...user.schedules]);
  };

  const handleDeleteExam = (id: string) => {
    if (!user.exams) return;
    user.exams = user.exams.filter(e => e.id !== id);
    onUpdateSchedules([...user.schedules]);
  };

  const handleSyncCalendar = () => {
    if (user.schedules.length === 0 && (!user.exams || user.exams.length === 0)) {
      alert('Chưa có lịch để đồng bộ!');
      return;
    }
    const icsContent = calendarService.generateICS(user.schedules, user.exams || []);
    calendarService.downloadICS(icsContent, 'MySchedule.ics');
    alert('Đã tải xuống file lịch (.ics). Bạn có thể mở file này bằng Google Calendar hoặc Outlook để đồng bộ.');
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-7xl animate-fadeIn pb-24 relative">
      <NotificationSystem schedules={user.schedules} alarmSound={alarmSound} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
         <div className="text-center md:text-left w-full">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <div className="bg-white/90 text-primary p-2 md:p-3 rounded-2xl shadow-lg border border-white/50">
                <i className="fas fa-graduation-cap text-2xl md:text-3xl"></i>
              </div>
              <h1 className="text-2xl md:text-4xl font-serif font-black text-slate-800 dark:text-white tracking-tight">StudyWithMe</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-300 text-sm md:text-base font-medium pl-1">Trợ lý học tập thông minh 4.0</p>
         </div>
         
         <div className="flex gap-3 items-center w-full md:w-auto justify-center md:justify-end">
            <button
              onClick={() => {
                setSettingsTab('theme');
                setShowSettings(true);
              }}
              className="glass-panel text-slate-600 dark:text-slate-200 hover:text-secondary dark:hover:text-secondary w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm"
              title="Giao diện"
            >
              <i className="fas fa-paint-brush"></i>
            </button>
            <button
              onClick={() => {
                setSettingsTab('audio');
                setShowSettings(true);
              }}
              className="glass-panel text-slate-600 dark:text-slate-200 hover:text-secondary dark:hover:text-secondary w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm"
              title="Cài đặt chuông báo"
            >
              <i className="fas fa-volume-up"></i>
            </button>
            <button
              onClick={handleSyncCalendar}
              className="glass-panel text-slate-600 dark:text-slate-200 hover:text-primary dark:hover:text-primary w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm"
              title="Đồng bộ lịch (Tải file .ics)"
            >
              <i className="fas fa-calendar-check"></i>
            </button>
            <div className="flex items-center gap-3 glass-panel px-4 py-2 rounded-full shadow-sm">
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-xs">
                 {user.username.charAt(0).toUpperCase()}
               </div>
               <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm hidden md:inline">{user.username}</span>
               <button 
                onClick={onLogout}
                className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                title="Đăng xuất"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
            <button 
              onClick={toggleTheme}
              className="glass-panel text-yellow-500 hover:text-yellow-600 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
         </div>
      </div>

      <Clock />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
          <div className="glass-panel rounded-[2rem] shadow-glass overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-secondary p-4 text-white flex items-center gap-2">
              <i className="fas fa-layer-group"></i>
              <h2 className="font-bold font-sans tracking-wide">Quản Lý Môn Học</h2>
            </div>
            
            <div className="p-5">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-5">
                {[
                  { id: 'image', icon: 'fa-magic', label: 'AI Scan' },
                  { id: 'single', icon: 'fa-pen', label: 'Thủ công' },
                  { id: 'quick', icon: 'fa-bolt', label: 'Nhanh' }
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <i className={`fas ${tab.icon}`}></i> {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'single' && (
                <form onSubmit={handleSingleSubmit} className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tên môn</label>
                    <input type="text" value={singleForm.subject} onChange={e => setSingleForm({...singleForm, subject: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none dark:text-white" placeholder="VD: Toán Cao Cấp" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Thứ</label>
                    <select value={singleForm.day} onChange={e => setSingleForm({...singleForm, day: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none dark:text-white">
                      {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Bắt đầu</label><input type="time" value={singleForm.startTime} onChange={e => setSingleForm({...singleForm, startTime: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 outline-none dark:text-white" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Kết thúc</label><input type="time" value={singleForm.endTime} onChange={e => setSingleForm({...singleForm, endTime: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 outline-none dark:text-white" /></div>
                  </div>
                  <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow hover:bg-indigo-600 transition-colors">Thêm vào lịch</button>
                </form>
              )}

              {activeTab === 'quick' && (
                <div className="space-y-4 animate-fadeIn">
                  <textarea rows={6} value={quickText} onChange={e => setQuickText(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none font-mono text-sm dark:text-white" placeholder={`Toán - Thứ 2 - 07:00 - 08:30`} />
                  <button onClick={handleQuickSubmit} className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl shadow hover:bg-emerald-600 transition-colors">Thêm Nhanh</button>
                </div>
              )}

              {activeTab === 'image' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Yêu cầu cho AI</label>
                    <textarea rows={2} value={aiInstruction} onChange={e => setAiInstruction(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-sm dark:text-white" placeholder="VD: Lấy lịch lớp 12A..." />
                  </div>
                  <div className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${isLoadingAI ? 'bg-slate-100 border-slate-300' : 'border-primary/30 hover:bg-primary/5 hover:border-primary'}`} onClick={() => !isLoadingAI && fileInputRef.current?.click()}>
                    {isLoadingAI ? (
                      <div className="text-primary animate-pulse"><i className="fas fa-spinner fa-spin text-3xl mb-2"></i><p>Đang phân tích...</p></div>
                    ) : (
                      <div className="text-slate-400 group-hover:text-primary transition-colors"><i className="fas fa-cloud-upload-alt text-4xl mb-2"></i><p className="font-bold">Tải ảnh lên</p><p className="text-xs">JPG, PNG</p></div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isLoadingAI} />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Exam Widget */}
          <ExamCountdown exams={user.exams || []} onAddExam={handleAddExam} onDeleteExam={handleDeleteExam} />
        </div>

        {/* Right Content */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="glass-panel rounded-[2rem] shadow-glass overflow-hidden h-full flex flex-col min-h-[500px]">
             {/* Dynamic Header */}
             <div className="p-6 border-b border-white/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-center bg-white/30 dark:bg-slate-800/30 gap-4">
                <h2 className="text-xl font-bold font-serif text-slate-800 dark:text-white flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-md text-white ${viewMode === 'schedule' ? 'bg-accent' : 'bg-pink-500'}`}>
                    <i className={`fas ${viewMode === 'schedule' ? 'fa-calendar-day' : 'fa-stopwatch'}`}></i>
                  </span>
                  {viewMode === 'schedule' ? 'Thời Khóa Biểu' : 'Quản Lý Lịch Thi'}
                </h2>
                
                {/* View Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl shadow-inner">
                  <button 
                    onClick={() => setViewMode('schedule')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'schedule' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <i className="fas fa-table"></i> Lịch Học
                  </button>
                  <button 
                    onClick={() => setViewMode('exams')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'exams' ? 'bg-white dark:bg-slate-700 text-pink-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <i className="fas fa-hourglass-half"></i> Lịch Thi
                  </button>
                </div>
             </div>
             
             <div className="p-4 flex-1 overflow-hidden">
                {viewMode === 'schedule' ? (
                  user.schedules.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                      <i className="fas fa-calendar-plus text-7xl mb-4 text-slate-300 dark:text-slate-600"></i>
                      <p className="font-medium">Lịch trống! Thêm môn học để bắt đầu.</p>
                    </div>
                  ) : (
                    <WeeklySchedule schedules={user.schedules} onDelete={handleDeleteSchedule} />
                  )
                ) : (
                  // Exam View
                  <ExamManager 
                    exams={user.exams || []} 
                    onAddExam={handleAddExam} 
                    onDeleteExam={handleDeleteExam} 
                  />
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Settings Modal (Theme & Audio) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-white">Cài Đặt</h3>
               <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-red-500">
                 <i className="fas fa-times text-xl"></i>
               </button>
             </div>

             {/* Tab Navigation */}
             <div className="flex mb-4 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
               <button 
                 onClick={() => setSettingsTab('theme')}
                 className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${settingsTab === 'theme' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <i className="fas fa-paint-brush mr-2"></i> Giao diện
               </button>
               <button 
                 onClick={() => setSettingsTab('audio')}
                 className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${settingsTab === 'audio' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <i className="fas fa-volume-up mr-2"></i> Âm thanh
               </button>
             </div>
             
             <div className="overflow-y-auto pr-1 custom-scrollbar">
               {/* THEME SETTINGS */}
               {settingsTab === 'theme' && (
                 <div className="space-y-6">
                   {/* Font Selection */}
                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase">Phông chữ (Font Pairing)</label>
                     {[
                       { id: 'modern', name: 'Modern Sans', sub: 'Hiện đại & Sang trọng', desc: 'Montserrat + Playfair', class: 'font-sans' },
                       { id: 'clean', name: 'Clean Sans', sub: 'Tối giản & Gọn gàng', desc: 'Inter + Lora', class: 'font-[Inter]' },
                       { id: 'classic', name: 'Classic Serif', sub: 'Cổ điển & Trang trọng', desc: 'Roboto + Merriweather', class: 'font-[Roboto]' }
                     ].map((font) => (
                       <button
                         key={font.id}
                         onClick={() => setThemeConfig({ ...themeConfig, font: font.id as FontPair })}
                         className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${themeConfig.font === font.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}
                       >
                         <div className="text-left">
                           <div className={`font-bold text-slate-800 dark:text-white ${font.class}`}>{font.name}</div>
                           <div className="text-[10px] text-primary font-semibold uppercase">{font.sub}</div>
                           <div className="text-xs text-slate-400 mt-1">{font.desc}</div>
                         </div>
                         {themeConfig.font === font.id && <i className="fas fa-check-circle text-primary text-xl"></i>}
                       </button>
                     ))}
                   </div>

                   {/* Color Selection */}
                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase">Chủ đề màu sắc</label>
                     <div className="grid grid-cols-2 gap-3">
                       {[
                         { id: 'default', name: 'Lavender', color: 'bg-indigo-500' },
                         { id: 'nature', name: 'Nature', color: 'bg-emerald-500' },
                         { id: 'sunset', name: 'Sunset', color: 'bg-orange-500' },
                         { id: 'ocean', name: 'Ocean', color: 'bg-blue-500' },
                         { id: 'monochrome', name: 'Mono', color: 'bg-slate-600' },
                       ].map((theme) => (
                         <button
                           key={theme.id}
                           onClick={() => setThemeConfig({ ...themeConfig, color: theme.id as ColorTheme })}
                           className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${themeConfig.color === theme.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}
                         >
                           <div className={`w-8 h-8 rounded-full shadow-md ${theme.color} border-2 border-white dark:border-slate-800`}></div>
                           <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{theme.name}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>
               )}

               {/* AUDIO SETTINGS */}
               {settingsTab === 'audio' && (
                 <div className="space-y-3">
                   {[
                     { id: 'standard', label: 'Tiêu chuẩn (Beep)', icon: 'fa-bell' },
                     { id: 'gentle', label: 'Nhẹ nhàng (Sine)', icon: 'fa-feather' },
                     { id: 'digital', label: 'Điện tử (8-bit)', icon: 'fa-gamepad' },
                     { id: 'intense', label: 'Cấp bách (Sawtooth)', icon: 'fa-exclamation-triangle' },
                   ].map((sound) => (
                     <button
                       key={sound.id}
                       onClick={() => handleSoundChange(sound.id as AlarmSoundType)}
                       className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition-all ${alarmSound === sound.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:text-slate-300'}`}
                     >
                       <div className="flex items-center gap-3 font-bold">
                         <i className={`fas ${sound.icon} w-6 text-center`}></i>
                         {sound.label}
                       </div>
                       {alarmSound === sound.id && <i className="fas fa-check-circle"></i>}
                     </button>
                   ))}
                   <div className="mt-4 text-center text-xs text-slate-400">
                     *Âm thanh sẽ phát khi đến giờ học hoặc hết giờ Pomodoro.
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;