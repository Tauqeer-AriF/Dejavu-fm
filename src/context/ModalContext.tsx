import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useLogo } from '../hooks/useLogo';

type ModalType = 'alert' | 'confirm';
type ModalStyle = 'info' | 'success' | 'danger';

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  style?: ModalStyle;
  confirmText?: string;
  cancelText?: string;
}

interface ModalContextType {
  showAlert: (options: Omit<ModalOptions, 'type'>) => Promise<void>;
  showConfirm: (options: Omit<ModalOptions, 'type'>) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const { isLightMode } = useLogo();
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showAlert = (options: Omit<ModalOptions, 'type'>) => {
    return new Promise<void>((resolve) => {
      setModalOptions({ ...options, type: 'alert' });
      setIsOpen(true);
      setResolvePromise(() => () => resolve());
    });
  };

  const showConfirm = (options: Omit<ModalOptions, 'type'>) => {
    return new Promise<boolean>((resolve) => {
      setModalOptions({ ...options, type: 'confirm' });
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(value);
      setResolvePromise(null);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {isOpen && modalOptions && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 backdrop-blur-sm cursor-pointer transition-colors ${
                  isLightMode ? 'bg-slate-900/40' : 'bg-black/60'
                }`}
                onClick={() => handleClose(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-lg rounded-[32px] shadow-2xl p-8 sm:p-10 overflow-hidden border transition-colors ${
                  isLightMode 
                    ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60' 
                    : 'glass-panel border-white/5 text-white'
                }`}
              >
                {/* Optional background glow based on style */}
                <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[100px] pointer-events-none ${
                  isLightMode ? 'opacity-20' : 'opacity-40'
                } ${
                  modalOptions.style === 'danger' ? 'bg-red-500' :
                  modalOptions.style === 'success' ? 'bg-green-500' :
                  'bg-neon-blue'
                }`} />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 border-4 ${
                    modalOptions.style === 'danger' ? (isLightMode ? 'bg-red-50 text-red-500 border-red-200' : 'bg-red-500/5 text-red-500 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]') :
                    modalOptions.style === 'success' ? (isLightMode ? 'bg-green-50 text-green-600 border-green-200' : 'bg-green-500/5 text-green-500 border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.1)]') :
                    (isLightMode ? 'bg-blue-50 text-neon-blue border-blue-200' : 'bg-neon-blue/5 text-neon-blue border-neon-blue/20 shadow-[0_0_40px_rgba(0,210,255,0.1)]')
                  }`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                      modalOptions.style === 'danger' ? (isLightMode ? 'border-red-300' : 'border-red-500/40') :
                      modalOptions.style === 'success' ? (isLightMode ? 'border-green-300' : 'border-green-500/40') :
                      (isLightMode ? 'border-blue-300' : 'border-neon-blue/40')
                    }`}>
                      {modalOptions.style === 'danger' ? <AlertCircle className="w-8 h-8" /> :
                       modalOptions.style === 'success' ? <CheckCircle2 className="w-8 h-8" /> :
                       <Info className="w-8 h-8" />}
                    </div>
                  </div>
                  
                  <h3 className={`text-3xl sm:text-4xl font-black uppercase tracking-tight mb-4 ${
                    isLightMode ? 'text-slate-900' : 'text-white'
                  }`}>
                    {modalOptions.title}
                  </h3>
                  <p className={`mb-10 w-full font-medium text-base sm:text-lg leading-relaxed px-2 sm:px-4 ${
                    isLightMode ? 'text-slate-600' : 'text-white/60'
                  }`}>
                    {modalOptions.message}
                  </p>

                  <div className="flex gap-4 w-full">
                    {modalOptions.type === 'confirm' && (
                      <button
                        onClick={() => handleClose(false)}
                        className={`flex-1 py-4 px-6 rounded-full border font-bold transition-all text-sm uppercase tracking-widest ${
                          isLightMode 
                            ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700' 
                            : 'border-white/10 text-white/50 hover:bg-white/5'
                        }`}
                      >
                        {modalOptions.cancelText || 'Cancel'}
                      </button>
                    )}
                    <button
                      onClick={() => handleClose(true)}
                      className={`flex-1 py-4 px-6 rounded-full font-black transition-all text-sm uppercase tracking-widest shadow-lg ${
                        modalOptions.style === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40 text-white' :
                        modalOptions.style === 'success' ? 'bg-[#00c853] hover:bg-[#00e676] shadow-[#00c853]/40 text-white' :
                        'bg-neon-blue hover:bg-[#00b8e6] text-dark-bg shadow-neon-blue/40'
                      }`}
                    >
                      {modalOptions.confirmText || 'OK'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
