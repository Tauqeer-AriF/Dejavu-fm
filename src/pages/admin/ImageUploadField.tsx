import React, { useState, useRef, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { UploadCloud, X, Image, Link, Loader2, Library } from "lucide-react";
import { MediaPickerModal } from "./MediaPickerModal";
import { AnimatePresence } from "motion/react";
import { useLogo } from "../../hooks/useLogo";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  className?: string;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = "https://...",
  description,
  className = "space-y-2",
}: ImageUploadFieldProps) {
  const { isLightMode } = useLogo();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [hasError, setHasError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasError(false);
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      const errMsg = "File is too large. Max size is 10MB";
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);
    // Include old URL so server can clean it up if needed
    if (value) {
      formData.append("oldUrl", value);
    }

    try {
      const res = await fetchAdmin("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          onChange(data.url);
        } else {
          setError("Upload response did not contain image URL");
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to upload image");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload due to network error");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        const errMsg = "File is too large. Max size is 10MB";
        setError(errMsg);
        toast.error(errMsg);
        return;
      }
      await uploadFile(file);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className={`block text-[10px] uppercase font-black tracking-widest mb-1 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
          {label}
        </label>
      )}

      <div className="space-y-3">
        {/* URL Input Row - Full Width */}
        <div className="relative">
          <Link className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-white/30'}`} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full border rounded-xl pl-10 pr-10 py-3 text-sm focus:border-neon-purple focus:outline-none transition-all ${
              isLightMode ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-black/40 border-white/10 text-white placeholder-white/20'
            }`}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-white/30 hover:text-white'}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Drag & Drop Upload Zone + Live Preview Pane - Flex Wrap */}
        <div className="flex flex-wrap gap-3 items-stretch">
          <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group/zone ${
                isLightMode ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-neon-purple' : 'border-white/10 hover:border-neon-purple/40 hover:bg-white/[0.02]'
              } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 text-neon-purple animate-spin" />
                  <span className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Optimising & Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full min-w-0 justify-center px-1">
                  <div className={`p-2 border rounded-xl group-hover/zone:bg-neon-blue/10 group-hover/zone:border-neon-blue/20 transition-all duration-300 flex-shrink-0 ${
                    isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-white/[0.04] border-white/5'
                  }`}>
                    <UploadCloud className="w-5 h-5 text-neon-blue group-hover/zone:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className={`text-xs font-semibold truncate transition-colors duration-300 ${
                      isLightMode ? 'text-slate-800 group-hover/zone:text-slate-900' : 'text-white/70 group-hover/zone:text-white'
                    }`}>
                      Click or drag image here to upload
                    </p>
                    <p className={`text-[10px] truncate transition-colors duration-300 ${
                      isLightMode ? 'text-slate-400 group-hover/zone:text-slate-500' : 'text-white/30 group-hover/zone:text-white/40'
                    }`}>PNG, JPG, WEBP, GIF up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className={`flex items-center justify-center gap-2 w-full py-2.5 border rounded-xl text-xs font-semibold transition-all ${
                isLightMode ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-white/70 hover:text-white'
              }`}
            >
              <Library className="w-4 h-4" />
              Select from Media Library
            </button>
          </div>

          {/* Live Preview Pane */}
          <div className={`w-20 h-20 border rounded-2xl flex items-center justify-center overflow-hidden relative group/preview flex-shrink-0 self-center sm:self-auto ${
            isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-white/10'
          }`}>
            {value && !hasError ? (
              <>
                <img
                  src={value}
                  alt="Upload preview"
                  className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={() => setHasError(true)}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className={`flex flex-col items-center gap-1 p-2 text-center ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>
                <Image className="w-5 h-5 opacity-40" />
                <span className="text-[8px] uppercase font-black tracking-widest leading-none">
                  {hasError ? "Invalid URL" : "No Preview"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {description && <p className={`text-[10px] italic leading-normal mt-1 ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>{description}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      <AnimatePresence>
        {showPicker && (
          <MediaPickerModal 
            isOpen={showPicker} 
            onClose={() => setShowPicker(false)} 
            onSelect={(url) => onChange(url)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
