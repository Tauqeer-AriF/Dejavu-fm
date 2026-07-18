import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  showConfirm: (title: string, message: string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [, setConfirmState] = useState<any>(null);

  const showConfirm = async (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Implement confirmation logic here
      resolve(true);
    });
  };

  const value: ModalContextType = {
    showConfirm,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

