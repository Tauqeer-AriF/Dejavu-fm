import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { fetchAdmin } from "./adminApi";

export function ImageUploadField({ 
  label, 
  value, 
  onChange, 
  description,
  placeholder = "URL or upload...",
  className = ""
}: { 
  label?: string; 
  value: string; 
  onChange: (val: string) => void; 
  description?: string;
  placeholder?: string;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useModal();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    
    // If current value is a local upload, tell the server to delete it
    if (value && value.startsWith('/uploads/')) {
      formData.append("oldUrl", value);
    }
    formData.append("image", file);

    setUploading(true);
    try {
      const res = await fetchAdmin("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        showAlert({ title: "Upload Error", message: err.error, style: "danger" });
      }
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to connect to upload server", style: "danger" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-xs uppercase mb-1 text-white/50 font-bold">{label}</label>}
      <div className="flex items-center gap-3">
        {value && (
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 relative">
          <input 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2 focus:border-neon-purple outline-none text-sm pr-10" 
            placeholder={placeholder} 
          />
          {value && (
            <button 
              type="button" 
              onClick={() => onChange("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center">
          {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Upload className="w-4 h-4 text-white/60" />}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
      {description && <p className="text-[10px] text-white/30 mt-1 italic">{description}</p>}
    </div>
  );
}

