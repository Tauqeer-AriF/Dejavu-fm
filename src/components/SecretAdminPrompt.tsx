import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SecretAdminPromptProps {
  isOpen: boolean;
  onClose: () => void;
  isLightMode: boolean;
}

export function SecretAdminPrompt({ isOpen, onClose, isLightMode }: SecretAdminPromptProps) {
  const [answer, setAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!answer.trim()) return;

    setIsVerifying(true);
    try {
      const res = await fetch("/api/public/admin-challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });

      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        toast.success("Identity confirmed.");
        sessionStorage.setItem('admin_secret_passed', 'true');
        onClose();
        fetch("/api/public/settings")
          .then(r => r.json())
          .then(settings => {
            const path = settings?.admin_custom_path || "/admin";
            navigate(path);
          })
          .catch(() => navigate("/admin"));
      } else {
        toast.error("Incorrect name. Access denied.");
        setAnswer("");
      }
    } catch (err) {
      toast.error("Verification failed. Try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`absolute inset-0 backdrop-blur-xl ${isLightMode ? 'bg-[#ffffff]/80' : 'bg-black/80'}`}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md glass-panel rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 rounded-full blur-[50px] pointer-events-none" />
            
            <button 
              onClick={onClose}
              className={`absolute top-6 right-6 p-2 transition-colors ${isLightMode ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white'}`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                  <Shield className="w-8 h-8 text-neon-purple" />
                </div>
                <div className="space-y-2">
                  <h2 className={`text-2xl font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Security Check</h2>
                  <p className={`text-sm font-medium ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>To proceed to the control center, please identify yourself.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-black tracking-widest ml-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Secret Access Answer</label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className={`w-full border focus:border-neon-purple focus:ring-1 focus:ring-neon-purple rounded-2xl px-6 py-4 transition-all outline-none ${isLightMode ? 'bg-black/5 border-black/10 text-black placeholder:text-black/30' : 'bg-white/5 border-white/10 text-white placeholder:text-white/10'}`}
                    />
                    <button
                      type="submit"
                      disabled={isVerifying || !answer.trim()}
                      className={`absolute right-2 top-2 bottom-2 px-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${isLightMode ? 'bg-[#ffffff] text-black border border-black/10 shadow-sm hover:bg-gray-50' : 'bg-white text-dark-bg disabled:grayscale'}`}
                      style={isLightMode ? { backgroundColor: '#ffffff' } : {}}
                    >
                      {isVerifying ? (
                        <Loader2 className={`w-5 h-5 animate-spin ${isLightMode ? 'text-black' : ''}`} />
                      ) : (
                        <ArrowRight className={`w-5 h-5 ${isLightMode ? 'text-black/80' : ''}`} />
                      )}
                    </button>
                  </div>
                </div>
              </form>

              <div className="flex justify-center">
                <p className={`text-[9px] uppercase tracking-[0.2em] font-medium ${isLightMode ? 'text-black/20' : 'text-white/20'}`}>
                  Authorised Access Only
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
