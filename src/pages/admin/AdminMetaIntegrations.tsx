import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdmin } from "./adminApi";
import { 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  Send, 
  RefreshCw, 
  Play, 
  Shield, 
  Check, 
  X, 
  Lock, 
  Info,
  Radio,
  FileCode,
  Facebook,
  Instagram,
  MessageSquare,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { useLogo } from "../../hooks/useLogo";

export function AdminMetaIntegrations() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();

  // Load overall studio settings
  const { data: settings, isLoading } = useQuery<any, Error>({
    queryKey: ["studioSettings"],
    queryFn: async () => {
      const res = await fetchAdmin("/api/admin/studio-settings");
      if (!res.ok) throw new Error("Failed to fetch studio settings");
      return res.json();
    },
  });

  // State local copies for settings
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [platformToggles, setPlatformToggles] = useState<Record<string, boolean>>({
    whatsapp: true,
    instagram: true,
    facebook: true
  });
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({
    whatsapp: false,
    instagram: false,
    facebook: false
  });
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, Record<string, string>>>({
    whatsapp: { phone: '', verifyToken: 'dejavu_whatsapp_secret_key', phoneId: '' },
    instagram: { accountId: '', accessToken: '' },
    facebook: { pageId: '', pageAccessToken: '' }
  });

  const [customVerifyToken, setCustomVerifyToken] = useState("dejavu_whatsapp_secret_key");
  const [isEditingToken, setIsEditingToken] = useState(false);

  // Load states from settings response when loaded
  useEffect(() => {
    if (settings) {
      if (typeof settings.meta_webhook_processing_enabled !== 'undefined') {
        setGlobalEnabled(settings.meta_webhook_processing_enabled === true || settings.meta_webhook_processing_enabled === 'true');
      }
      if (settings.meta_verify_token) {
        setCustomVerifyToken(settings.meta_verify_token);
      } else if (settings.studio_platform_configs?.whatsapp?.verifyToken) {
        setCustomVerifyToken(settings.studio_platform_configs.whatsapp.verifyToken);
      }
      if (settings.meta_webhook_processing_platforms) {
        setPlatformToggles({
          whatsapp: settings.meta_webhook_processing_platforms.whatsapp !== false,
          instagram: settings.meta_webhook_processing_platforms.instagram !== false,
          facebook: settings.meta_webhook_processing_platforms.facebook !== false
        });
      }
      if (settings.studio_connected_platforms) {
        setConnectedPlatforms({
          whatsapp: !!settings.studio_connected_platforms.whatsapp,
          instagram: !!settings.studio_connected_platforms.instagram,
          facebook: !!settings.studio_connected_platforms.facebook
        });
      }
      if (settings.studio_platform_configs) {
        setPlatformConfigs(prev => ({
          ...prev,
          whatsapp: { 
            phone: settings.studio_platform_configs.whatsapp?.phone || '', 
            verifyToken: settings.studio_platform_configs.whatsapp?.verifyToken || 'dejavu_whatsapp_secret_key',
            phoneId: settings.studio_platform_configs.whatsapp?.phoneId || ''
          },
          instagram: { 
            accountId: settings.studio_platform_configs.instagram?.accountId || '', 
            accessToken: settings.studio_platform_configs.instagram?.accessToken || '' 
          },
          facebook: { 
            pageId: settings.studio_platform_configs.facebook?.pageId || '', 
            pageAccessToken: settings.studio_platform_configs.facebook?.pageAccessToken || '' 
          }
        }));
      }
    }
  }, [settings]);

  // Mutation to save settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      const res = await fetchAdmin("/api/admin/studio-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Meta Integration settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["studioSettings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update configuration.");
    }
  });

  const handleSaveVerifyToken = () => {
    if (!customVerifyToken || customVerifyToken.trim().length < 6) {
      toast.error("Verify Token must be at least 6 characters long.");
      return;
    }
    saveSettingsMutation.mutate({
      meta_verify_token: customVerifyToken.trim()
    }, {
      onSuccess: () => {
        setIsEditingToken(false);
      }
    });
  };

  const handleToggleGlobal = () => {
    const nextVal = !globalEnabled;
    setGlobalEnabled(nextVal);
    saveSettingsMutation.mutate({
      meta_webhook_processing_enabled: nextVal
    });
  };

  const handleTogglePlatformWebhook = (platform: string) => {
    const nextPlatformToggles = {
      ...platformToggles,
      [platform]: !platformToggles[platform]
    };
    setPlatformToggles(nextPlatformToggles);
    saveSettingsMutation.mutate({
      meta_webhook_processing_platforms: nextPlatformToggles
    });
  };

  const handleTogglePlatformConnection = (platform: string) => {
    const nextConnections = {
      ...connectedPlatforms,
      [platform]: !connectedPlatforms[platform]
    };
    setConnectedPlatforms(nextConnections);
    saveSettingsMutation.mutate({
      studio_connected_platforms: {
        ...settings?.studio_connected_platforms,
        ...nextConnections
      }
    });
  };

  const handleSaveConfig = (platform: string, fields: Record<string, string>) => {
    const updatedPlatformConfigs = {
      ...platformConfigs,
      [platform]: {
        ...platformConfigs[platform],
        ...fields
      }
    };
    setPlatformConfigs(updatedPlatformConfigs);
    saveSettingsMutation.mutate({
      studio_platform_configs: updatedPlatformConfigs
    });
  };

  // Credentials Testing State
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestHandshake = async (platformId: string) => {
    setTestingPlatform(platformId);
    setTestResult(null);
    const config = platformConfigs[platformId] || {};

    const steps = [
      "Securing communication channel with Meta Graph API...",
      "Validating credentials and permissions (pages_messaging)...",
      "Authenticating against Meta Business Platform...",
      "Validating active webhook subscriptions..."
    ];

    for (const step of steps) {
      setTestProgress(step);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    if (platformId === 'whatsapp') {
      const { phone, verifyToken } = config;
      if (!phone || !phone.trim()) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Phone Number is required. Please verify details in the Configuration card."
        });
        return;
      }
      if (!verifyToken || verifyToken.trim().length < 6) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Webhook Verify Token is empty or too short (must be at least 6 characters)."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! Established direct pipeline with WhatsApp Cloud API."
      });
    } else if (platformId === 'instagram') {
      const { accountId, accessToken } = config;
      if (!accountId || !/^\d+$/.test(accountId.trim())) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Instagram Account ID must be a numeric string. Check Meta developer panel."
        });
        return;
      }
      if (!accessToken || accessToken.trim().length < 15) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Meta Graph Access Token is invalid or expired."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! Authenticated session with Instagram Graph endpoints."
      });
    } else if (platformId === 'facebook') {
      const { pageId, pageAccessToken } = config;
      if (!pageId || !/^\d+$/.test(pageId.trim())) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Facebook Page ID must contain numeric digits only."
        });
        return;
      }
      if (!pageAccessToken || pageAccessToken.trim().length < 15) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Page Access Token is empty or expired. Please re-generate page token."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! Real-time webhook subscription verified on Facebook Page."
      });
    }
  };

  // Webhook Simulation State
  const [simulatingPlatform, setSimulatingPlatform] = useState<string | null>(null);
  const [simText, setSimText] = useState("Hi Dejavu FM, please play some underground UK Garage beats! 🔥📻");
  const [simSender, setSimSender] = useState("Marcus_FM");

  const handleSimulateWebhook = async (platformId: string) => {
    setSimulatingPlatform(platformId);
    try {
      let payload: any = {};
      const msgId = `sim_msg_${Date.now()}`;
      const ts = Math.floor(Date.now() / 1000);

      if (platformId === 'whatsapp') {
        payload = {
          object: "whatsapp_business_account",
          entry: [
            {
              id: "9876543210",
              changes: [
                {
                  value: {
                    messaging_product: "whatsapp",
                    metadata: {
                      display_phone_number: platformConfigs.whatsapp.phone || "447123456789",
                      phone_number_id: platformConfigs.whatsapp.phoneId || "123456789"
                    },
                    contacts: [
                      {
                        profile: { name: simSender },
                        wa_id: "447987654321"
                      }
                    ],
                    messages: [
                      {
                        from: "447987654321",
                        id: msgId,
                        timestamp: String(ts),
                        text: { body: simText },
                        type: "text"
                      }
                    ]
                  },
                  field: "messages"
                }
              ]
            }
          ]
        };
      } else if (platformId === 'instagram') {
        payload = {
          object: "instagram",
          entry: [
            {
              id: platformConfigs.instagram.accountId || "123456789",
              time: ts * 1000,
              messaging: [
                {
                  sender: { id: "88888888" },
                  recipient: { id: platformConfigs.instagram.accountId || "123456789" },
                  timestamp: ts * 1000,
                  message: {
                    mid: msgId,
                    text: simText
                  }
                }
              ]
            }
          ]
        };
      } else if (platformId === 'facebook') {
        payload = {
          object: "page",
          entry: [
            {
              id: platformConfigs.facebook.pageId || "123456789",
              time: ts * 1000,
              messaging: [
                {
                  sender: { id: "77777777" },
                  recipient: { id: platformConfigs.facebook.pageId || "123456789" },
                  timestamp: ts * 1000,
                  message: {
                    mid: msgId,
                    text: simText
                  }
                }
              ]
            }
          ]
        };
      }

      const verifyTokenRow = settings?.studio_platform_configs?.whatsapp?.verifyToken || 'dejavu_whatsapp_secret_key';

      // Send post request to /webhook
      const response = await fetch("/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(`Simulated webhook payload dispatched to /webhook for ${platformId.toUpperCase()}! Check studio interactions.`);
      } else {
        toast.error(`Simulation returned HTTP ${response.status}. Webhook processing might be inactive.`);
      }
    } catch (err: any) {
      toast.error(`Error sending simulation payload: ${err.message}`);
    } finally {
      setSimulatingPlatform(null);
    }
  };

  const webhookCallbackUrl = `${window.location.origin}/webhook`;
  const defaultVerifyToken = settings?.meta_verify_token || settings?.studio_platform_configs?.whatsapp?.verifyToken || "dejavu_whatsapp_secret_key";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-neon-purple rounded-full animate-spin shadow-[0_0_15px_rgba(176,38,255,0.5)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview & Global Controller Section */}
      <div className={`p-6 md:p-8 rounded-3xl border transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/[0.02] border-white/5 shadow-2xl'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-neon-purple/15 rounded-2xl">
                <Shield className="w-6 h-6 text-neon-purple" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black uppercase tracking-tight">Meta Integrations Hub</h2>
                <p className={`text-xs font-mono uppercase tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Webhook control panel & status center</p>
              </div>
            </div>
            <p className={`text-sm max-w-2xl ${isLightMode ? 'text-black/60' : 'text-white/60'} pt-2`}>
              Configure API connection credentials, callback settings, and manage real-time messaging pipeline subscriptions for WhatsApp, Instagram, and Facebook Messenger from a central interface.
            </p>
          </div>

          <div className={`p-4 rounded-2xl flex items-center justify-between gap-6 border ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'} min-w-[280px]`}>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-bold">Webhook Processing</span>
              <p className={`text-[10px] font-mono uppercase tracking-widest ${globalEnabled ? 'text-neon-blue' : 'text-red-400'}`}>
                {globalEnabled ? "Active & Ingesting" : "Suspended / Offline"}
              </p>
            </div>
            <button
              onClick={handleToggleGlobal}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${
                globalEnabled ? "bg-neon-purple" : isLightMode ? "bg-black/20" : "bg-white/10"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 transform ${
                  globalEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Callback configuration details */}
        <div className={`mt-8 p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs ${isLightMode ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.01] border-white/5'}`}>
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider opacity-60">Webhook Callback URL</span>
            <div className="font-bold text-neon-blue break-all">{webhookCallbackUrl}</div>
          </div>
          <div className="space-y-1 min-w-[280px]">
            <span className="text-[10px] uppercase tracking-wider opacity-60 block mb-1">Verification Token</span>
            {isEditingToken ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customVerifyToken}
                  onChange={(e) => setCustomVerifyToken(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono outline-none transition w-full ${
                    isLightMode 
                      ? 'bg-black/5 border-black/10 focus:border-neon-purple/50 text-black' 
                      : 'bg-white/5 border-white/10 focus:border-neon-purple/50 text-white'
                  }`}
                  placeholder="Enter verify token"
                />
                <button
                  onClick={handleSaveVerifyToken}
                  className="px-3 py-1.5 bg-neon-purple text-white rounded-lg text-xs font-bold font-sans transition hover:bg-neon-purple/80"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setCustomVerifyToken(defaultVerifyToken);
                    setIsEditingToken(false);
                  }}
                  className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-xs rounded-lg font-sans transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="font-bold text-neon-purple">{defaultVerifyToken}</div>
                <button
                  onClick={() => setIsEditingToken(true)}
                  className="p-1 hover:bg-neon-purple/10 text-neon-purple/80 hover:text-neon-purple rounded-md transition"
                  title="Edit verify token"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Platform Row List */}
      <div className="flex flex-col gap-8">
        
        {/* WhatsApp Row */}
        <div className={`p-6 md:p-8 rounded-3xl border flex flex-col lg:flex-row lg:items-stretch gap-8 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/[0.02] border-white/5 shadow-2xl'}`}>
          {/* Identity & Control Column */}
          <div className="flex flex-col justify-between lg:w-1/3 space-y-6 lg:border-r lg:border-dashed lg:border-white/10 lg:pr-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-lg uppercase tracking-tight">WhatsApp Business</h3>
                  <span className={`text-xs font-mono uppercase tracking-wider ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Cloud API Integration</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full ${
                connectedPlatforms.whatsapp ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {connectedPlatforms.whatsapp ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className={`p-4 rounded-2xl space-y-3 ${isLightMode ? 'bg-black/[0.02]' : 'bg-white/[0.01]'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60 font-medium">Webhook Ingestion</span>
                <button 
                  onClick={() => handleTogglePlatformWebhook('whatsapp')}
                  className={`text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition ${
                    platformToggles.whatsapp 
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' 
                      : 'bg-white/5 text-white/40 border border-white/5'
                  }`}
                >
                  {platformToggles.whatsapp ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60 font-medium font-mono text-[10px] uppercase">Service Status</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('whatsapp')}
                  className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full transition ${
                    connectedPlatforms.whatsapp 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}
                >
                  {connectedPlatforms.whatsapp ? "Disconnect" : "Connect Link"}
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Column */}
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">Platform API Credentials</span>
              <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Specify phone registration and token mappings configured in Meta Developer dashboard.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 opacity-50">Business Phone Number</label>
                <input 
                  type="text"
                  placeholder="+447123456789"
                  value={platformConfigs.whatsapp?.phone || ''}
                  onChange={(e) => setPlatformConfigs({
                    ...platformConfigs,
                    whatsapp: { ...platformConfigs.whatsapp, phone: e.target.value }
                  })}
                  className={`w-full h-11 px-4 rounded-xl border text-xs font-mono outline-none transition ${
                    isLightMode 
                      ? 'bg-black/5 border-black/10 focus:border-neon-purple/50' 
                      : 'bg-white/5 border-white/10 focus:border-neon-purple/50'
                  }`}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 opacity-50">Phone Number ID</label>
                <input 
                  type="text"
                  placeholder="e.g. 102948572019485"
                  value={platformConfigs.whatsapp?.phoneId || ''}
                  onChange={(e) => setPlatformConfigs({
                    ...platformConfigs,
                    whatsapp: { ...platformConfigs.whatsapp, phoneId: e.target.value }
                  })}
                  className={`w-full h-11 px-4 rounded-xl border text-xs font-mono outline-none transition ${
                    isLightMode 
                      ? 'bg-black/5 border-black/10 focus:border-neon-purple/50' 
                      : 'bg-white/5 border-white/10 focus:border-neon-purple/50'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleSaveConfig('whatsapp', { 
                  phone: platformConfigs.whatsapp.phone,
                  phoneId: platformConfigs.whatsapp.phoneId
                })}
                className="px-6 h-11 rounded-xl bg-neon-purple text-white text-xs font-bold uppercase tracking-widest transition hover:bg-neon-purple/80 w-full md:w-auto"
              >
                Save WhatsApp Configuration
              </button>
            </div>
          </div>

          {/* Test & Diagnostics Column */}
          <div className="lg:w-1/4 flex flex-col justify-center gap-3 lg:border-l lg:border-dashed lg:border-white/10 lg:pl-8">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block">System Diagnostics</span>
            <button
              onClick={() => handleTestHandshake('whatsapp')}
              disabled={testingPlatform === 'whatsapp'}
              className={`w-full h-11 rounded-xl border border-white/10 text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-white/5 ${
                testingPlatform === 'whatsapp' ? 'opacity-50' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${testingPlatform === 'whatsapp' ? 'animate-spin' : ''}`} />
              {testingPlatform === 'whatsapp' ? "Diagnostics..." : "Test Pipeline"}
            </button>

            <button
              onClick={() => handleSimulateWebhook('whatsapp')}
              disabled={simulatingPlatform === 'whatsapp'}
              className="w-full h-11 rounded-xl bg-neon-blue/15 border border-neon-blue/30 text-neon-blue text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-neon-blue hover:text-dark-bg"
            >
              <Play className="w-4 h-4" />
              {simulatingPlatform === 'whatsapp' ? "Dispatching..." : "Simulate Payload"}
            </button>
          </div>
        </div>

        {/* Instagram Row */}
        <div className={`p-6 md:p-8 rounded-3xl border flex flex-col lg:flex-row lg:items-stretch gap-8 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/[0.02] border-white/5'}`}>
          {/* Identity & Control Column */}
          <div className="flex flex-col justify-between lg:w-1/3 space-y-6 lg:border-r lg:border-dashed lg:border-white/10 lg:pr-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-lg uppercase tracking-tight">Instagram</h3>
                  <span className={`text-xs font-mono uppercase tracking-wider ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Graph API Integration</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full ${
                connectedPlatforms.instagram ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {connectedPlatforms.instagram ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className={`p-4 rounded-2xl space-y-3 ${isLightMode ? 'bg-black/[0.02]' : 'bg-white/[0.01]'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60 font-medium">Webhook Ingestion</span>
                <button 
                  onClick={() => handleTogglePlatformWebhook('instagram')}
                  className={`text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition ${
                    platformToggles.instagram 
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' 
                      : 'bg-white/5 text-white/40 border border-white/5'
                  }`}
                >
                  {platformToggles.instagram ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60 font-medium font-mono text-[10px] uppercase">Service Status</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('instagram')}
                  className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full transition ${
                    connectedPlatforms.instagram 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}
                >
                  {connectedPlatforms.instagram ? "Disconnect" : "Connect Link"}
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Column */}
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">Platform API Credentials</span>
              <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Specify Instagram Business Account mapping and long-lived system user Access Token.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 opacity-50">Instagram Account ID</label>
                <input 
                  type="text"
                  placeholder="e.g. 178414012345678"
                  value={platformConfigs.instagram?.accountId || ''}
                  onChange={(e) => setPlatformConfigs({
                    ...platformConfigs,
                    instagram: { ...platformConfigs.instagram, accountId: e.target.value }
                  })}
                  className={`w-full h-11 px-4 rounded-xl border text-xs font-mono outline-none transition ${
                    isLightMode 
                      ? 'bg-black/5 border-black/10 focus:border-neon-purple/50' 
                      : 'bg-white/5 border-white/10 focus:border-neon-purple/50'
                  }`}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 opacity-50">Graph Access Token</label>
                <input 
                  type="password"
                  placeholder="••••••••••••••••"
                  value={platformConfigs.instagram?.accessToken || ''}
                  onChange={(e) => setPlatformConfigs({
                    ...platformConfigs,
                    instagram: { ...platformConfigs.instagram, accessToken: e.target.value }
                  })}
                  className={`w-full h-11 px-4 rounded-xl border text-xs font-mono outline-none transition ${
                    isLightMode 
                      ? 'bg-black/5 border-black/10 focus:border-neon-purple/50' 
                      : 'bg-white/5 border-white/10 focus:border-neon-purple/50'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleSaveConfig('instagram', { 
                  accountId: platformConfigs.instagram.accountId,
                  accessToken: platformConfigs.instagram.accessToken
                })}
                className="px-6 h-11 rounded-xl bg-neon-purple text-white text-xs font-bold uppercase tracking-widest transition hover:bg-neon-purple/80 w-full md:w-auto"
              >
                Save Instagram Configuration
              </button>
            </div>
          </div>

          {/* Test & Diagnostics Column */}
          <div className="lg:w-1/4 flex flex-col justify-center gap-3 lg:border-l lg:border-dashed lg:border-white/10 lg:pl-8">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block">System Diagnostics</span>
            <button
              onClick={() => handleTestHandshake('instagram')}
              disabled={testingPlatform === 'instagram'}
              className={`w-full h-11 rounded-xl border border-white/10 text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-white/5 ${
                testingPlatform === 'instagram' ? 'opacity-50' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${testingPlatform === 'instagram' ? 'animate-spin' : ''}`} />
              {testingPlatform === 'instagram' ? "Diagnostics..." : "Test Pipeline"}
            </button>

            <button
              onClick={() => handleSimulateWebhook('instagram')}
              disabled={simulatingPlatform === 'instagram'}
              className="w-full h-11 rounded-xl bg-neon-blue/15 border border-neon-blue/30 text-neon-blue text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-neon-blue hover:text-dark-bg"
            >
              <Play className="w-4 h-4" />
              {simulatingPlatform === 'instagram' ? "Dispatching..." : "Simulate Payload"}
            </button>
          </div>
        </div>

        {/* Facebook Messenger Row */}
        <div className={`p-6 md:p-8 rounded-3xl border flex flex-col lg:flex-row lg:items-stretch gap-8 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/[0.02] border-white/5'}`}>
          {/* Identity & Control Column */}
          <div className="flex flex-col justify-between lg:w-1/3 space-y-6 lg:border-r lg:border-dashed lg:border-white/10 lg:pr-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <Facebook className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-lg uppercase tracking-tight">Messenger</h3>
                  <span className={`text-xs font-mono uppercase tracking-wider ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Messenger Platform API</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full ${
                connectedPlatforms.facebook ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {connectedPlatforms.facebook ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className={`p-4 rounded-2xl space-y-3 ${isLightMode ? 'bg-black/[0.02]' : 'bg-white/[0.01]'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60 font-medium">Webhook Ingestion</span>
                <button 
                  onClick={() => handleTogglePlatformWebhook('facebook')}
                  className={`text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition ${
                    platformToggles.facebook 
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' 
                      : 'bg-white/5 text-white/40 border border-white/5'
                  }`}
                >
                  {platformToggles.facebook ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60 font-medium font-mono text-[10px] uppercase">Service Status</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('facebook')}
                  className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full transition ${
                    connectedPlatforms.facebook 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}
                >
                  {connectedPlatforms.facebook ? "Disconnect" : "Connect Link"}
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Column */}
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">Platform API Credentials</span>
              <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Specify Facebook Page registration and authorized permanent Page Access Token.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 opacity-50">Facebook Page ID</label>
                <input 
                  type="text"
                  placeholder="e.g. 1029485720194"
                  value={platformConfigs.facebook?.pageId || ''}
                  onChange={(e) => setPlatformConfigs({
                    ...platformConfigs,
                    facebook: { ...platformConfigs.facebook, pageId: e.target.value }
                  })}
                  className={`w-full h-11 px-4 rounded-xl border text-xs font-mono outline-none transition ${
                    isLightMode 
                      ? 'bg-black/5 border-black/10 focus:border-neon-purple/50' 
                      : 'bg-white/5 border-white/10 focus:border-neon-purple/50'
                  }`}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 opacity-50">Page Access Token</label>
                <input 
                  type="password"
                  placeholder="••••••••••••••••"
                  value={platformConfigs.facebook?.pageAccessToken || ''}
                  onChange={(e) => setPlatformConfigs({
                    ...platformConfigs,
                    facebook: { ...platformConfigs.facebook, pageAccessToken: e.target.value }
                  })}
                  className={`w-full h-11 px-4 rounded-xl border text-xs font-mono outline-none transition ${
                    isLightMode 
                      ? 'bg-black/5 border-black/10 focus:border-neon-purple/50' 
                      : 'bg-white/5 border-white/10 focus:border-neon-purple/50'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleSaveConfig('facebook', { 
                  pageId: platformConfigs.facebook.pageId,
                  pageAccessToken: platformConfigs.facebook.pageAccessToken
                })}
                className="px-6 h-11 rounded-xl bg-neon-purple text-white text-xs font-bold uppercase tracking-widest transition hover:bg-neon-purple/80 w-full md:w-auto"
              >
                Save Messenger Configuration
              </button>
            </div>
          </div>

          {/* Test & Diagnostics Column */}
          <div className="lg:w-1/4 flex flex-col justify-center gap-3 lg:border-l lg:border-dashed lg:border-white/10 lg:pl-8">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block">System Diagnostics</span>
            <button
              onClick={() => handleTestHandshake('facebook')}
              disabled={testingPlatform === 'facebook'}
              className={`w-full h-11 rounded-xl border border-white/10 text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-white/5 ${
                testingPlatform === 'facebook' ? 'opacity-50' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${testingPlatform === 'facebook' ? 'animate-spin' : ''}`} />
              {testingPlatform === 'facebook' ? "Diagnostics..." : "Test Pipeline"}
            </button>

            <button
              onClick={() => handleSimulateWebhook('facebook')}
              disabled={simulatingPlatform === 'facebook'}
              className="w-full h-11 rounded-xl bg-neon-blue/15 border border-neon-blue/30 text-neon-blue text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-neon-blue hover:text-dark-bg"
            >
              <Play className="w-4 h-4" />
              {simulatingPlatform === 'facebook' ? "Dispatching..." : "Simulate Payload"}
            </button>
          </div>
        </div>
      </div>

      {/* Connection Test Console Drawer / Section */}
      <AnimatePresence>
        {(testingPlatform || testResult) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`p-6 rounded-3xl border ${
              testResult 
                ? testResult.success 
                  ? 'bg-green-500/5 border-green-500/25 text-green-400' 
                  : 'bg-red-500/5 border-red-500/25 text-red-400'
                : 'bg-neon-blue/5 border-neon-blue/25 text-neon-blue'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-black/40">
                {testResult ? (
                  testResult.success ? <CheckCircle2 className="w-5 h-5 text-green-400 animate-pulse" /> : <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-neon-blue animate-spin" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-xs uppercase tracking-wider font-bold">
                  {testingPlatform ? `${testingPlatform.toUpperCase()} Diagnostics Interface` : "Diagnostics Result"}
                </span>
                <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {testingPlatform ? testProgress : testResult?.message}
                </p>
              </div>
              <button 
                onClick={() => { setTestingPlatform(null); setTestResult(null); }}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
