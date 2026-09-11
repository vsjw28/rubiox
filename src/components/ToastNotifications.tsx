import React from 'react';

export interface ToastItem {
  id: string;
  type: 'xp' | 'item' | 'highfive' | 'checkpoint' | 'shield';
  text: string;
  subtext?: string;
  icon: string;
}

interface ToastNotificationsProps {
  toasts: ToastItem[];
}

export const ToastNotifications: React.FC<ToastNotificationsProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none max-w-xs select-none">
      {toasts.map(toast => {
        let bgStyle = 'bg-slate-900/90 border-slate-700 text-white';
        if (toast.type === 'xp') {
          bgStyle = 'bg-amber-950/90 border-amber-400/50 text-amber-200';
        } else if (toast.type === 'item') {
          bgStyle = 'bg-blue-950/90 border-blue-400/50 text-blue-200';
        } else if (toast.type === 'highfive') {
          bgStyle = 'bg-purple-950/90 border-purple-400/50 text-purple-200';
        } else if (toast.type === 'checkpoint') {
          bgStyle = 'bg-emerald-950/90 border-emerald-400/50 text-emerald-200';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-xl animate-in slide-in-from-top-2 fade-in duration-200 ${bgStyle}`}
          >
            <span className="text-2xl">{toast.icon}</span>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wide">{toast.text}</span>
              {toast.subtext && <span className="text-[11px] opacity-80">{toast.subtext}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
