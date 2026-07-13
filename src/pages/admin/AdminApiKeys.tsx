import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdmin } from "./adminApi";
import { useModal } from "../../context/ModalContext";
import { Key, Plus, Trash2, Copy, Code, Terminal, Send, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function AdminApiKeys() {
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
    <div className="relative bg-black/80 rounded-xl p-4 my-2">
      <button
        onClick={() => copyToClipboard(code)}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
        title="Copy code"
      >
        <Copy className="w-4 h-4" />
      </button>
      <pre><code className={`language-${language} text-xs`}>{code}</code></pre>
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
// });
`;

  const socketIoListenExample = `const { io } = require("socket.io-client");

const API_KEY = "${generatedKey || 'YOUR_API_KEY'}";
const SOCKET_URL = "${window.location.origin}";

const socket = io(SOCKET_URL, {
  auth: { apiKey: API_KEY }
});

socket.on('connect', () => {
  console.log('Connected to chat stream via API key!');
});

socket.on('message', (message) => {
  // Receives all public chat messages
  console.log('New Message:', message);
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat stream.');
});`;

  return (
    <div className="space-y-8">
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
              className="relative w-full max-w-md bg-dark-bg border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">Generate API Key</h3>
                    <p className="text-sm text-white/50 mt-1">Provide a description to help you identify this key later.</p>
                  </div>
                  <button onClick={() => setIsPromptOpen(false)} className="p-1.5 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/5">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., My External App"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsPromptOpen(false)} className="px-6 py-2 rounded-xl bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors">Cancel</button>
                  <button onClick={handleConfirmGeneration} disabled={!description.trim()} className="px-6 py-2 rounded-xl bg-neon-purple text-white text-xs font-bold uppercase tracking-widest hover:bg-neon-blue transition-colors disabled:opacity-50">Generate</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display font-black uppercase text-neon-purple tracking-wider flex items-center">
          <Key className="w-8 h-8 mr-3" /> API Access
        </h2>
        <button
          onClick={handleGenerateKey}
          disabled={generateKeyMutation.isPending}
          className="bg-neon-purple text-white font-bold py-2 px-4 rounded hover:bg-neon-blue transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Generate New Key
        </button>
      </div>

      {generatedKey && (
        <div ref={newKeySectionRef} className="bg-green-900/50 border border-green-500/50 rounded-2xl p-6 space-y-2 animate-in fade-in">
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

      <div className="bg-dark-bg/50 border border-white/10 rounded-2xl p-6">
        <div className="space-y-4">
          {isLoading && <p>Loading keys...</p>}
          {error && <p className="text-red-500">Error: {error.message}</p>}
          {!isLoading && !error && Array.isArray(apiKeys) && apiKeys.length === 0 && (
            <p className="text-center text-white/50 py-4">No API keys have been generated yet.</p>
          )}
          
          {Array.isArray(apiKeys) && apiKeys.length > 0 && apiKeys.map((apiKey: any) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div>
                <p className="font-mono text-sm text-white/80 flex items-center gap-2">
                  <Key className="w-4 h-4 text-neon-blue/50" />
                  {apiKey.key_prefix}
                  ...
                </p>
                <p className="text-xs text-white/50">{apiKey.description}</p>
                <p className="text-[10px] text-white/40 mt-1">
                  Created: {new Date(apiKey.created_at).toLocaleDateString()} | Last Used: {apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleString() : 'Never'}
                </p>
              </div>
              <button
                onClick={() => handleDeleteKey(apiKey.id)}
                className="text-red-500 hover:text-red-400 p-2"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {generatedKey && (
        <div className="bg-dark-bg/50 border border-white/10 rounded-2xl p-6 space-y-6 animate-in fade-in">
          <h3 className="text-2xl font-display font-black uppercase text-neon-blue tracking-wider flex items-center">
            <Code className="w-7 h-7 mr-3" /> API Usage Examples
          </h3>

          <div className="space-y-2">
            <h4 className="font-bold text-lg flex items-center gap-2"><Send className="w-5 h-5 text-neon-purple" /> Sending Messages (Node.js)</h4>
            <p className="text-sm text-white/60">
              Make a <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-xs">POST</code> request to <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-xs">/api/v1/chat/messages</code> with your key in the <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-xs">X-API-Key</code> header.
            </p>
            <CodeBlock code={nodeJsSendExample} language="javascript" />
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-lg flex items-center gap-2"><Wifi className="w-5 h-5 text-neon-blue" /> Receiving Messages (Node.js)</h4>
            <p className="text-sm text-white/60">
              Connect to the Socket.IO server and provide your API key in the <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-xs">auth</code> object to subscribe to the real-time message stream.
            </p>
            <CodeBlock code={socketIoListenExample} language="javascript" />
          </div>
        </div>
      )}
    </div>
  );
}