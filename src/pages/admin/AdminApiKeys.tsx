import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdmin } from "./adminApi";
import { useModal } from "../../context/ModalContext";
import { Key, Plus, Trash2, Copy, Code, Terminal, Send, Wifi, X, Mic2, Play, Cpu, Sparkles, Image as ImageIcon, Music as MusicIcon, Video as VideoIcon, Upload, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLogo } from "../../hooks/useLogo";

export function AdminApiKeys() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const { showAlert, showConfirm } = useModal();
  const newKeySectionRef = useRef<HTMLDivElement>(null);

  const { data: apiKeys, isLoading, error } = useQuery<any[], Error>({
    queryKey: ["apiKeys"],
    queryFn: async () => {
      const res = await fetchAdmin("/api/admin/api-keys");
      if (!res.ok) throw new Error('Failed to fetch API keys');
      return res.json();
    },
  });

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [description, setDescription] = useState("");

  // API Key Testing and Validation Panel State
  const [testKey, setTestKey] = useState("");
  const [showTestKey, setShowTestKey] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState<"chat" | "shoutout">("chat");
  const [testSender, setTestSender] = useState("API Tester");
  const [testText, setTestText] = useState("Checking the API key and media file delivery! 🔥🎧");
  const [testImageUrl, setTestImageUrl] = useState("");
  const [testAudioUrl, setTestAudioUrl] = useState("");
  const [testVideoUrl, setTestVideoUrl] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Retro Console Logs State
  const [testConsoleLogs, setTestConsoleLogs] = useState<{
    id: string;
    type: "request" | "response" | "error" | "system";
    timestamp: string;
    message: string;
    details?: any;
  }[]>([]);

  // Sync test key with newly generated key automatically
  useEffect(() => {
    if (generatedKey) {
      setTestKey(generatedKey);
    }
  }, [generatedKey]);

  useEffect(() => {
    if (generatedKey && newKeySectionRef.current) {
      newKeySectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [generatedKey]);

  const generateKeyMutation = useMutation({
    mutationFn: (description: string) =>
      fetchAdmin("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      }).then(res => res.json()),
    onSuccess: (newKeyData: any) => {
      if (newKeyData.error) throw new Error(newKeyData.error);
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setGeneratedKey(newKeyData.key);
      showAlert({
        title: "API Key Generated",
        message: `Your new key is ready. Please copy it from the section below, you won't be able to see it again.`,
        style: "success",
      });
    },
    onError: () => {
      showAlert({
        title: "Error",
        message: "Failed to generate API key. The key may already exist or the server is unavailable.",
        style: "danger",
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: number) =>
      fetchAdmin(`/api/admin/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("API Key revoked.");
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const handleGenerateKey = async () => {
    setIsPromptOpen(true);
  };

  const handleConfirmGeneration = () => {
    if (description) {
      generateKeyMutation.mutate(description);
      setIsPromptOpen(false);
      setDescription("");
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }, (err) => {
      toast.error("Failed to copy.");
      console.error('Could not copy text: ', err);
    });
  };

  const handleDeleteKey = async (id: number) => {
    const confirmed = await showConfirm({
      title: "Revoke API Key",
      message: "Are you sure you want to permanently revoke this API key?",
      style: "danger",
      confirmText: "Revoke Key",
    });
    if (confirmed) {
      deleteKeyMutation.mutate(id);
    }
  };

  const CodeBlock = ({ code, language }: { code: string, language: string }) => (
    <div className="relative bg-[#0c0d12] border border-white/10 rounded-xl p-4 my-2 overflow-x-auto shadow-inner text-gray-200">
      <button
        onClick={() => copyToClipboard(code)}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
        title="Copy code"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      <pre><code className={`language-${language} text-[11px] font-mono leading-relaxed`}>{code}</code></pre>
    </div>
  );

  const nodeJsSendExample = `const fetch = require('node-fetch');

const API_KEY = "${generatedKey || 'YOUR_API_KEY'}";
const API_URL = "${window.location.origin}/api/v1/chat/messages";

async function sendMessage(messagePayload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify(messagePayload)
  });
  console.log(await response.json());
}

// Example 1: Sending a text message
sendMessage({ text: "Hello from my external app!" });

// Example 2: Sending a message with an image
// sendMessage({ 
//   text: "Check out this picture!",
//   imageUrl: "https://example.com/image.jpg" 
// });`
  
  const nodeJsShoutoutExample = `const fetch = require('node-fetch');

const API_KEY = "${generatedKey || 'YOUR_API_KEY'}";
const API_URL = "${window.location.origin}/api/v1/shoutouts";

async function sendShoutout(message, from) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ message: message, listener_name: from })
  });
  console.log(await response.json());
}

// Example 1: Sending a text shoutout
sendShoutout("This is a test shoutout from my app!", "App User");

// Example 2: Sending a shoutout with an image
// sendShoutout({
//   message: "Check out this pic!",
//   listener_name: "VisualVibes",
//   imageUrl: "https://example.com/shoutout.jpg"
// });`;

  const chatReceiveExample = `const { io } = require("socket.io-client");

const API_KEY = "${generatedKey || 'YOUR_API_KEY'}";
const SOCKET_URL = "${window.location.origin}";

const socket = io(SOCKET_URL, {
  auth: { apiKey: API_KEY }
});

socket.on('connect', () => console.log('Connected to API stream!'));

// Listen for new chat messages
socket.on('chatMessage', (message) => {
  console.log('New Chat Message Received:', message);
});

socket.on('disconnect', () => console.log('Disconnected.'));`;

  const shoutoutReceiveExample = `const { io } = require("socket.io-client");

const API_KEY = "${generatedKey || 'YOUR_API_KEY'}";
const SOCKET_URL = "${window.location.origin}";

const socket = io(SOCKET_URL, {
  auth: { apiKey: API_KEY }
});

socket.on('connect', () => console.log('Connected to API stream!'));

// Listen for new shoutouts
socket.on('new_shoutout', (shoutout) => {
  console.log('New Shoutout Received:', shoutout);
});

socket.on('disconnect', () => console.log('Disconnected.'));`;

const SkeletonKey = () => (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border animate-pulse gap-4 ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
      <div className="space-y-2 w-full">
        <div className={`h-4 rounded w-32 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
        <div className={`h-3 rounded w-48 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
        <div className={`h-2 rounded w-40 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
      </div>
      <div className={`w-8 h-8 rounded-lg ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <SkeletonKey />
      <SkeletonKey />
    </div>
  );

  // Helper for Retro Logs
  const addLog = (type: "request" | "response" | "error" | "system", message: string, details?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestConsoleLogs(prev => [
      {
        id: Math.random().toString(),
        type,
        timestamp,
        message,
        details
      },
      ...prev
    ].slice(0, 50)); // Limit to 50 logs
  };

  const handleClearLogs = () => {
    setTestConsoleLogs([]);
    toast.success("Console cleared.");
  };

  const handleLoadPresets = () => {
    setTestImageUrl("https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800");
    setTestAudioUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    setTestVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    addLog("system", "Premium sample media presets loaded successfully.", {
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800",
      audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    });
    toast.success("Sample media URLs loaded!");
  };

  const handleUploadLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!testKey || !testKey.startsWith("djfm_")) {
      showAlert({
        title: "API Key Required",
        message: "Please enter or select a valid API Key (starting with 'djfm_') before uploading files.",
        style: "danger"
      });
      return;
    }

    setUploadingMedia(true);
    setUploadProgress("Preparing upload...");
    addLog("system", `Starting file upload via API endpoint: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // We make a real client-side post to our external api's media upload route
      const response = await fetch("/api/v1/media/upload", {
        method: "POST",
        headers: {
          "X-API-Key": testKey
        },
        body: formData
      });

      setUploadProgress("Processing response...");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      // Map the returned URL to make it relative/local if it has '/uploads/' to prevent loading failures
      let finalUrl = data.url;
      if (finalUrl && finalUrl.includes("/uploads/")) {
        const filename = finalUrl.substring(finalUrl.indexOf("/uploads/"));
        finalUrl = `${window.location.origin}${filename}`;
      }

      addLog("response", "File uploaded successfully via API!", { responseStatus: response.status, data, resolvedUrl: finalUrl });

      // Detect file type and assign to appropriate state
      if (file.type.startsWith("image/")) {
        setTestImageUrl(finalUrl);
        toast.success("Image uploaded & assigned!");
      } else if (file.type.startsWith("audio/")) {
        setTestAudioUrl(finalUrl);
        toast.success("Audio uploaded & assigned!");
      } else if (file.type.startsWith("video/")) {
        setTestVideoUrl(finalUrl);
        toast.success("Video uploaded & assigned!");
      } else {
        // Fallback
        setTestImageUrl(finalUrl);
        toast.success("File uploaded & assigned to Image field!");
      }
    } catch (err: any) {
      console.error("[Tester] Upload failed:", err);
      addLog("error", "API media upload failed!", { error: err.message || err });
      showAlert({
        title: "Upload Failed",
        message: err.message || "An error occurred during API media upload. Verify your API Key.",
        style: "danger"
      });
    } finally {
      setUploadingMedia(false);
      setUploadProgress(null);
      // Reset input value to allow uploading same file again
      e.target.value = "";
    }
  };

  const handleSendTest = async () => {
    if (!testKey || !testKey.trim().startsWith("djfm_")) {
      showAlert({
        title: "API Key Required",
        message: "A valid API Key (starting with 'djfm_') is required to test media transmission.",
        style: "danger"
      });
      return;
    }

    if (!testText.trim() && !testImageUrl && !testAudioUrl && !testVideoUrl) {
      showAlert({
        title: "Payload Empty",
        message: "You must supply either a message text, or at least one media link (image, audio, or video) to send.",
        style: "danger"
      });
      return;
    }

    setIsSendingTest(true);
    const endpointUrl = testEndpoint === "chat" ? "/api/v1/chat/messages" : "/api/v1/shoutouts";
    
    // Mask API Key for console log
    const maskedKey = testKey.substring(0, 8) + "..." + testKey.substring(testKey.length - 4);
    
    // Build Payload
    const payload: any = {};
    if (testEndpoint === "chat") {
      payload.text = testText || null;
      payload.sender = testSender || "API Tester";
      if (testImageUrl) payload.imageUrl = testImageUrl;
      if (testAudioUrl) payload.audioUrl = testAudioUrl;
      if (testVideoUrl) payload.videoUrl = testVideoUrl;
    } else {
      payload.message = testText || null;
      payload.listener_name = testSender || "API Tester";
      payload.type = "text";
      if (testImageUrl) payload.imageUrl = testImageUrl;
      if (testAudioUrl) payload.audioUrl = testAudioUrl;
      if (testVideoUrl) payload.videoUrl = testVideoUrl;
    }

    addLog("request", `POST ${endpointUrl}`, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": maskedKey
      },
      body: payload
    });

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": testKey
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status} Error`);
      }

      addLog("response", `HTTP ${response.status} OK - Accepted for Delivery`, data);
      toast.success(`${testEndpoint === "chat" ? "Chat message" : "Shoutout"} broadcasted live! Check the sidebar/widget.`);
    } catch (err: any) {
      console.error("[Tester] Send failed:", err);
      addLog("error", "API Transmission Failed!", { error: err.message || err });
      showAlert({
        title: "Transmission Failed",
        message: err.message || "Verify your API Key or connection stability.",
        style: "danger"
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <AnimatePresence>
        {isPromptOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsPromptOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-md border rounded-3xl shadow-2xl overflow-hidden z-10 transition-colors ${
                isLightMode ? 'bg-white border-black/10 text-black' : 'bg-[#0f1015] border-white/10 text-white'
              }`}
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Generate API Key</h3>
                    <p className={`text-sm mt-1 ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Provide a description to help you identify this key later.</p>
                  </div>
                  <button 
                    onClick={() => setIsPromptOpen(false)} 
                    className={`p-1.5 transition-colors rounded-full ${
                      isLightMode ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., My External App"
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all border ${
                      isLightMode ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'
                    }`}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => setIsPromptOpen(false)} 
                    className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${
                      isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/80' : 'bg-white/10 hover:bg-white/20 text-white/80'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmGeneration} 
                    disabled={!description.trim()} 
                    className="px-6 py-2 rounded-xl bg-neon-purple text-white text-xs font-bold uppercase tracking-widest hover:bg-neon-blue transition-colors disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className={`text-2xl sm:text-3xl font-display font-black uppercase text-neon-purple tracking-wider flex items-center ${isLightMode ? 'text-black' : 'text-white'}`}>
          <Key className="w-7 h-7 sm:w-8 sm:h-8 mr-3" /> API Access
        </h2>
        <button
          onClick={handleGenerateKey}
          disabled={generateKeyMutation.isPending}
          className="bg-neon-purple text-white font-bold py-2.5 px-5 rounded-xl hover:bg-neon-blue transition-all flex items-center justify-center gap-2 w-full sm:w-auto uppercase tracking-wider text-xs font-mono shadow-md shadow-neon-purple/15 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> Generate New Key
        </button>
      </div>

      {generatedKey && (
        <div ref={newKeySectionRef} className="bg-green-900/40 border border-green-500/50 rounded-2xl p-6 space-y-2 animate-in fade-in">
          <h3 className="text-lg font-bold text-green-300">Your New API Key</h3>
          <p className="text-sm text-green-300/80">Copy this key and store it securely. You will not be able to see it again after leaving this page.</p>
          <div className="flex items-center gap-2 bg-black/50 p-3 rounded-lg">
            <input
              type="text"
              readOnly
              value={generatedKey}
              className="flex-1 bg-transparent text-green-200 font-mono text-sm outline-none"
            />
            <button onClick={() => copyToClipboard(generatedKey)} className="p-2 rounded-md bg-green-500/20 text-green-300 hover:bg-green-500/40 transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className={`border rounded-2xl p-6 ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
        <div className="space-y-4">
          {isLoading && <LoadingSkeleton />}
          {error && <p className="text-red-500">Error: {error.message}</p>}
          {!isLoading && !error && Array.isArray(apiKeys) && apiKeys.length === 0 && (
            <p className={`text-center py-4 text-sm ${isLightMode ? 'text-black/40' : 'text-white/50'}`}>No API keys have been generated yet.</p>
          )}
          
          {Array.isArray(apiKeys) && apiKeys.length > 0 && apiKeys.map((apiKey: any) => (
            <div
              key={apiKey.id}
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border gap-4 transition-colors ${
                isLightMode ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div>
                <p className={`font-mono text-sm flex items-center gap-2 ${isLightMode ? 'text-black font-semibold' : 'text-white/80'}`}>
                  <Key className="w-4 h-4 text-neon-blue/50" />
                  {apiKey.key_prefix}
                  ...
                </p>
                <p className={`text-xs mt-1 ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>{apiKey.description}</p>
                <p className={`text-[10px] mt-1.5 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                  Created: {new Date(apiKey.created_at).toLocaleDateString()} | Last Used: {apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleString() : 'Never'}
                </p>
              </div>
              <button
                onClick={() => handleDeleteKey(apiKey.id)}
                className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 self-end sm:self-auto"
                title="Revoke Key"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {generatedKey && (
        <div className={`border rounded-2xl p-6 space-y-6 animate-in fade-in ${
          isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'
        }`}>
          <h3 className="text-2xl font-display font-black uppercase text-neon-blue tracking-wider flex items-center">
            <Code className="w-7 h-7 mr-3" /> API Usage Examples
          </h3>

          <div className="space-y-2">
            <h4 className={`font-bold text-lg flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}><Wifi className="w-5 h-5 text-neon-blue" /> 1. Chat Room Receiving</h4>
            <p className={`text-sm ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
              Connect to the Socket.IO server to subscribe to the real-time public chat message stream.
            </p>
            <CodeBlock code={chatReceiveExample} language="javascript" />
          </div>

          <div className="space-y-2">
            <h4 className={`font-bold text-lg flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}><Send className="w-5 h-5 text-neon-purple" /> 2. Chat Room Sending</h4>
            <p className={`text-sm ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
              Make a <code className={`${isLightMode ? 'bg-black/10' : 'bg-white/10'} px-1.5 py-0.5 rounded-md font-mono text-xs`}>POST</code> request to <code className={`${isLightMode ? 'bg-black/10' : 'bg-white/10'} px-1.5 py-0.5 rounded-md font-mono text-xs`}>/api/v1/chat/messages</code> with your key in the <code className={`${isLightMode ? 'bg-black/10' : 'bg-white/10'} px-1.5 py-0.5 rounded-md font-mono text-xs`}>X-API-Key</code> header.
            </p>
            <CodeBlock code={nodeJsSendExample} language="javascript" />
          </div>

          <div className="space-y-2">
            <h4 className={`font-bold text-lg flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}><Wifi className="w-5 h-5 text-neon-blue" /> 3. Shout Out Receiving</h4>
            <p className={`text-sm ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
              Connect to the Socket.IO server to subscribe to the real-time shoutout stream.
            </p>
            <CodeBlock code={shoutoutReceiveExample} language="javascript" />
          </div>

          <div className="space-y-2">
            <h4 className={`font-bold text-lg flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}><Mic2 className="w-5 h-5 text-neon-purple" /> 4. Shout Out Sending</h4>
            <p className={`text-sm ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
              Make a <code className={`${isLightMode ? 'bg-black/10' : 'bg-white/10'} px-1.5 py-0.5 rounded-md font-mono text-xs`}>POST</code> request to <code className={`${isLightMode ? 'bg-black/10' : 'bg-white/10'} px-1.5 py-0.5 rounded-md font-mono text-xs`}>/api/v1/shoutouts</code> with your key in the <code className={`${isLightMode ? 'bg-black/10' : 'bg-white/10'} px-1.5 py-0.5 rounded-md font-mono text-xs`}>X-API-Key</code> header.
            </p>
            <CodeBlock code={nodeJsShoutoutExample} language="javascript" />
          </div>
        </div>
      )}

      {/* Real-time API Key Media Validator Panel */}
      <div className={`border rounded-2xl p-6 md:p-8 space-y-8 mt-8 ${
        isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-5 gap-4">
          <div>
            <h3 className="text-2xl font-display font-black uppercase tracking-wider text-neon-purple flex items-center gap-2.5">
              <Cpu className="w-7 h-7 text-neon-purple animate-pulse" /> Live API Media Validator
            </h3>
            <p className={`text-xs mt-1 uppercase tracking-widest font-bold ${isLightMode ? 'text-black/45' : 'text-white/40'}`}>
              End-to-End Media Broadcast Sandbox
            </p>
          </div>
          <button
            onClick={handleLoadPresets}
            className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple text-neon-purple hover:text-white border border-neon-purple/30 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 self-start md:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Premium Presets
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Form Settings */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                1. X-API-Key (Verify / Paste)
              </label>
              <div className="relative">
                <input
                  type={showTestKey ? "text" : "password"}
                  value={testKey}
                  onChange={e => setTestKey(e.target.value)}
                  placeholder="djfm_..."
                  className={`w-full font-mono text-xs rounded-xl pl-4 pr-12 py-3.5 border focus:outline-none focus:border-neon-purple transition-all ${
                    isLightMode ? 'bg-black/5 border-black/15 text-black' : 'bg-white/5 border-white/10 text-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowTestKey(!showTestKey)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${
                    isLightMode ? 'text-black/50 hover:text-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {showTestKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className={`text-[10px] ${isLightMode ? 'text-black/40' : 'text-white/35'}`}>
                {generatedKey ? "✅ Automatically matched with your newly generated API Key." : "ℹ️ Paste a generated API Key (starting with 'djfm_') to begin."}
              </p>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                2. Target Destination
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTestEndpoint("chat")}
                  className={`py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    testEndpoint === "chat"
                      ? "bg-neon-blue/20 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,194,255,0.15)]"
                      : isLightMode
                      ? "bg-black/5 border-black/10 text-black/60 hover:bg-black/10"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  Chat Sidebar
                </button>
                <button
                  type="button"
                  onClick={() => setTestEndpoint("shoutout")}
                  className={`py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    testEndpoint === "shoutout"
                      ? "bg-neon-purple/20 border-neon-purple text-neon-purple shadow-[0_0_15px_rgba(186,104,200,0.15)]"
                      : isLightMode
                      ? "bg-black/5 border-black/10 text-black/60 hover:bg-black/10"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <Mic2 className="w-4 h-4" />
                  Live Shoutout
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  3. Transmitter Identity
                </label>
                <input
                  type="text"
                  value={testSender}
                  onChange={e => setTestSender(e.target.value)}
                  placeholder="e.g. API Broadcaster"
                  className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:border-neon-purple transition-all ${
                    isLightMode ? 'bg-black/5 border-black/15 text-black' : 'bg-white/5 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  4. Message Text
                </label>
                <input
                  type="text"
                  value={testText}
                  onChange={e => setTestText(e.target.value)}
                  placeholder="e.g. Broadcasting media stream!"
                  className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:border-neon-purple transition-all ${
                    isLightMode ? 'bg-black/5 border-black/15 text-black' : 'bg-white/5 border-white/10 text-white'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  5. Attached Media Channels (URLs)
                </label>
                <span className="text-[9px] font-black uppercase tracking-wider text-neon-blue bg-neon-blue/10 px-2 py-0.5 rounded">
                  Supported Types: mp3, mp4, png, jpg, gif
                </span>
              </div>

              <div className="space-y-3">
                {/* Image URL */}
                <div className="flex gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${testImageUrl ? 'bg-neon-blue/20 text-neon-blue' : 'bg-white/5 text-white/30'}`}>
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={testImageUrl}
                    onChange={e => setTestImageUrl(e.target.value)}
                    placeholder="Attached Image URL (http/https)"
                    className={`flex-1 text-xs rounded-xl px-4 py-2 border focus:outline-none focus:border-neon-purple transition-all ${
                      isLightMode ? 'bg-black/5 border-black/15 text-black' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  />
                  {testImageUrl && (
                    <button onClick={() => setTestImageUrl("")} className="px-3 hover:bg-red-500/10 rounded-xl text-red-400 text-xs font-bold uppercase">Clear</button>
                  )}
                </div>

                {/* Audio URL */}
                <div className="flex gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${testAudioUrl ? 'bg-neon-purple/20 text-neon-purple' : 'bg-white/5 text-white/30'}`}>
                    <MusicIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={testAudioUrl}
                    onChange={e => setTestAudioUrl(e.target.value)}
                    placeholder="Attached Audio URL (http/https)"
                    className={`flex-1 text-xs rounded-xl px-4 py-2 border focus:outline-none focus:border-neon-purple transition-all ${
                      isLightMode ? 'bg-black/5 border-black/15 text-black' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  />
                  {testAudioUrl && (
                    <button onClick={() => setTestAudioUrl("")} className="px-3 hover:bg-red-500/10 rounded-xl text-red-400 text-xs font-bold uppercase">Clear</button>
                  )}
                </div>

                {/* Video URL */}
                <div className="flex gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${testVideoUrl ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/30'}`}>
                    <VideoIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={testVideoUrl}
                    onChange={e => setTestVideoUrl(e.target.value)}
                    placeholder="Attached Video URL (http/https)"
                    className={`flex-1 text-xs rounded-xl px-4 py-2 border focus:outline-none focus:border-neon-purple transition-all ${
                      isLightMode ? 'bg-black/5 border-black/15 text-black' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  />
                  {testVideoUrl && (
                    <button onClick={() => setTestVideoUrl("")} className="px-3 hover:bg-red-500/10 rounded-xl text-red-400 text-xs font-bold uppercase">Clear</button>
                  )}
                </div>
              </div>
            </div>

            {/* Local file uploader testing /media/upload */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                6. Test File Upload Endpoint (/api/v1/media/upload)
              </label>
              <div className={`border-2 border-dashed rounded-2xl p-5 text-center relative transition-all ${
                uploadingMedia ? 'border-neon-purple bg-neon-purple/5' : 'border-white/10 hover:border-white/20 bg-black/15'
              }`}>
                {uploadingMedia ? (
                  <div className="space-y-2 py-2">
                    <div className="w-6 h-6 border-2 border-neon-purple border-t-transparent animate-spin rounded-full mx-auto" />
                    <p className="text-xs font-bold text-neon-purple">{uploadProgress}</p>
                    <p className="text-[10px] text-white/40">Uploading binary chunk payload...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-white/70">
                      Drag & Drop or Click to Upload Local Media
                    </p>
                    <p className="text-[10px] text-white/40">
                      This will run a real binary request to the media uploader using the chosen API key.
                    </p>
                    <div className="flex justify-center gap-2">
                      <label className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all">
                        <Upload className="w-3 h-3 inline mr-1" /> Choose File
                        <input
                          type="file"
                          accept="image/*,audio/*,video/*"
                          onChange={handleUploadLocalFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSendTest}
              disabled={isSendingTest || uploadingMedia}
              className="w-full bg-neon-purple text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_30px_rgba(186,104,200,0.3)] hover:shadow-[0_10px_35px_rgba(186,104,200,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50"
            >
              {isSendingTest ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  <span>Transmitting Media Payload...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white shrink-0 fill-current" />
                  <span>Transmit Live API Payload</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Console terminal + visual preview */}
          <div className="flex flex-col gap-6">
            {/* Console Log Terminal */}
            <div className="flex flex-col h-[280px] bg-black border border-white/15 rounded-2xl overflow-hidden font-mono text-[11px]">
              <div className="bg-[#121212] border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span className="text-[10px] font-bold text-white/60 ml-2 uppercase tracking-wider">Live API console debugger</span>
                </div>
                <button
                  onClick={handleClearLogs}
                  className="text-[9px] font-bold text-white/35 hover:text-white uppercase transition-colors"
                >
                  Clear Console
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {testConsoleLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 text-center select-none py-10">
                    <Terminal className="w-10 h-10 mb-2 opacity-50" />
                    <p className="font-bold uppercase tracking-widest text-[9px]">Awaiting media transmission...</p>
                    <p className="text-[9px] mt-1">Ready to inspect API packages, uploads & replies</p>
                  </div>
                ) : (
                  testConsoleLogs.map(log => (
                    <div key={log.id} className="space-y-1 animate-in fade-in duration-200 border-l border-white/10 pl-3 ml-1.5 font-mono">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-white/30">[{log.timestamp}]</span>
                        {log.type === "request" && (
                          <span className="text-cyan-400 font-bold uppercase tracking-wide bg-cyan-950 px-1.5 py-0.5 rounded text-[8px]">OUTBOUND</span>
                        )}
                        {log.type === "response" && (
                          <span className="text-green-400 font-bold uppercase tracking-wide bg-green-950 px-1.5 py-0.5 rounded text-[8px]">INCOMING</span>
                        )}
                        {log.type === "error" && (
                          <span className="text-red-400 font-bold uppercase tracking-wide bg-red-950 px-1.5 py-0.5 rounded text-[8px]">FAILURE</span>
                        )}
                        {log.type === "system" && (
                          <span className="text-purple-400 font-bold uppercase tracking-wide bg-purple-950 px-1.5 py-0.5 rounded text-[8px]">SYS INFO</span>
                        )}
                        <span className={`font-bold ${
                          log.type === "error" ? "text-red-400" : log.type === "request" ? "text-cyan-400" : log.type === "response" ? "text-green-400" : "text-purple-300"
                        }`}>
                          {log.message}
                        </span>
                      </div>
                      {log.details && (
                        <pre className="text-white/60 text-[10px] leading-relaxed overflow-x-auto bg-white/5 p-2 rounded-lg max-w-full font-mono whitespace-pre-wrap text-left">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Visual Live Preview Rendering Panel */}
            <div className={`border rounded-2xl p-5 space-y-4 ${
              isLightMode ? 'bg-black/5 border-black/10' : 'bg-black/25 border-white/10'
            }`}>
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  🎨 Front-end Render Preview
                </span>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                  testEndpoint === "chat" ? 'bg-neon-blue/20 text-neon-blue' : 'bg-neon-purple/20 text-neon-purple'
                }`}>
                  {testEndpoint} mode
                </span>
              </div>

              <div className="bg-[#0b0c10]/95 rounded-2xl border border-white/10 p-4 font-sans text-white text-left shadow-lg">
                <div className="flex items-center space-x-3 mb-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    testEndpoint === 'chat' ? 'bg-neon-blue/25 text-neon-blue' : 'bg-neon-purple/25 text-neon-purple'
                  }`}>
                    {testSender.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h5 className={`font-bold text-xs ${testEndpoint === 'chat' ? 'text-neon-blue' : 'text-neon-purple'}`}>
                      {testSender || "API Tester"}
                    </h5>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Transmitted Live</p>
                  </div>
                </div>

                <p className="text-xs text-white/90 italic font-medium mb-3">
                  "{testText || "No text payload"}"
                </p>

                {/* Media Output Previews */}
                <div className="space-y-3 mt-2 pt-2.5 border-t border-white/5">
                  {testImageUrl && (
                    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                      <p className="absolute top-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded text-[8px] font-bold text-neon-blue/80 uppercase z-10 font-sans">Image Preview</p>
                      <img
                        src={testImageUrl}
                        alt="Preview attached"
                        className="max-h-32 w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594434530870-df22116a45e9?w=300&auto=format&fit=crop";
                        }}
                      />
                    </div>
                  )}

                  {testVideoUrl && (
                    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                      <p className="absolute top-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded text-[8px] font-bold text-orange-400 uppercase z-10 font-sans font-sans">Video Preview</p>
                      <video
                        src={testVideoUrl}
                        className="max-h-32 w-full object-cover bg-black"
                        controls
                        muted
                        playsInline
                      />
                    </div>
                  )}

                  {testAudioUrl && (
                    <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-white/50 uppercase tracking-wider mb-1 font-sans">🎵 Audio Preview</span>
                      <audio
                        src={testAudioUrl}
                        controls
                        className="w-full h-8 accent-neon-purple rounded"
                      />
                    </div>
                  )}

                  {!testImageUrl && !testAudioUrl && !testVideoUrl && (
                    <p className="text-[10px] text-white/20 text-center py-2 italic font-medium">No media channels attached yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}