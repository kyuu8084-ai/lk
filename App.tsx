import React, { useState, useEffect } from 'react';
import { AppView, User, Schedule } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BubbleBackground from './components/BubbleBackground';
import NotificationSystem from './components/NotificationSystem';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('studyWithMeCurrentUser');
    if (savedUser) {
      const allUsers = JSON.parse(localStorage.getItem('studyWithMeUsers') || '{}');
      if (allUsers[savedUser]) {
        setCurrentUser(allUsers[savedUser]);
        setView(AppView.DASHBOARD);
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setView(AppView.DASHBOARD);
    localStorage.setItem('studyWithMeCurrentUser', user.username);
    
    // Initialize audio context on user interaction (login)
    audioService.init();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView(AppView.LOGIN);
    localStorage.removeItem('studyWithMeCurrentUser');
  };

  const handleUpdateSchedules = (newSchedules: Schedule[]) => {
    if (!currentUser) return;
    
    // Create new object, preserving exams
    const updatedUser = { 
      ...currentUser, 
      schedules: newSchedules,
      // Exams are mutated inside Dashboard for now, or preserved here.
      // If Dashboard passed a mutated currentUser ref, this is fine.
      // But safer is:
      exams: currentUser.exams 
    };

    setCurrentUser(updatedUser);
    
    // Persist to local storage
    const allUsers = JSON.parse(localStorage.getItem('studyWithMeUsers') || '{}');
    // Ensure we merge with what's in storage to not lose exams if they were updated separately
    // Actually, since this is the single source of truth save:
    allUsers[updatedUser.username] = updatedUser;
    localStorage.setItem('studyWithMeUsers', JSON.stringify(allUsers));
  };

  return (
    <>
      <BubbleBackground />
      
      {view === AppView.LOGIN && (
        <Login onLogin={handleLogin} />
      )}

      {view === AppView.DASHBOARD && currentUser && (
        <>
          <NotificationSystem schedules={currentUser.schedules} />
          <Dashboard 
            user={currentUser} 
            onLogout={handleLogout}
            onUpdateSchedules={handleUpdateSchedules}
          />
        </>
      )}

      {/* Persistent Audio Reminder / "App Active" Indicator */}
      {view === AppView.DASHBOARD && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur p-3 rounded-full shadow-lg border border-primary/20 animate-pulse-slow flex items-center gap-2 cursor-pointer hover:bg-white transition-colors" title="Hệ thống thông báo đang chạy">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <i className="fas fa-bell text-primary"></i>
          </div>
        </div>
      )}
    </>
  );
};

export default App;