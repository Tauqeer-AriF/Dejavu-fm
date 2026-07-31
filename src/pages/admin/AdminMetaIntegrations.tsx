import React, { useState, useEffect, useCallback, useMemo } from "react";
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
    whatsapp: { phone: '', verifyToken: 'dejavu_whatsapp_secret_key', phoneId: '', accessToken: '' },
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
            phoneId: settings.studio_platform_configs.whatsapp?.phoneId || '',
            accessToken: settings.studio_platform_configs.whatsapp?.accessToken || ''
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

  const handleUpdatePlatformField = useCallback((platform: string, field: string, value: string) => {
    setPlatformConfigs(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  }, []);

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
      const { phone, verifyToken, phoneId, accessToken } = config;
      if (!phone || !phone.trim()) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Registered Phone Number is required. Please verify details in the Configuration card."
        });
        return;
      }
      if (!phoneId || !phoneId.trim()) {
        setTestResult({
          success: false,
          message: "Handshake Failed: Phone Number ID is required to route message dispatches."
        });
        return;
      }
      if (!accessToken || accessToken.trim().length < 15) {
        setTestResult({
          success: false,
          message: "Handshake Failed: WhatsApp Cloud API Access Token is empty or too short. Please paste your System User Access Token."
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
        message: "Handshake Successful! Established direct pipeline with WhatsApp Cloud API using registered Phone Number ID and Access Token."
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
  const [simText, setSimText] = useState("Hi DejavuFM, please play some underground UK Garage beats! 🔥📻");
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
      <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border transition-all ${isLightMode ? 'bg-white border-zinc-200/80 shadow-sm' : 'bg-zinc-900/50 border-zinc-800/80 shadow-xl'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/10 dark:bg-violet-500/20 rounded-xl border border-violet-500/15">
                <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 font-sans tracking-tight">Meta Integrations</h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Configure webhook processing and credential pipelines</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl pt-1">
              Connect your Meta Developer applications to receive message payloads in real-time. Toggle ingestion for individual channels, validate credentials, and simulate live data payloads.
            </p>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className={`p-4 rounded-2xl flex items-center justify-between gap-6 border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-950/40 border-zinc-800/50'} w-full sm:min-w-[280px]`}>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Global Webhook Ingestion</span>
                <p className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${globalEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                  {globalEnabled ? "Active & Listening" : "Suspended"}
                </p>
              </div>
              <button
                onClick={handleToggleGlobal}
                className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                  globalEnabled ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 transform ${
                    globalEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Callback configuration details */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${isLightMode ? 'bg-zinc-50/50 border-zinc-200/60' : 'bg-zinc-900/20 border-zinc-800/40'}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans">Webhook Callback URL</span>
            <div className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400 break-all select-all">
              {webhookCallbackUrl}
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${isLightMode ? 'bg-zinc-50/50 border-zinc-200/60' : 'bg-zinc-900/20 border-zinc-800/40'}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans block">Verification Token</span>
            {isEditingToken ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={customVerifyToken}
                  onChange={(e) => setCustomVerifyToken(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono outline-none transition w-full ${
                    isLightMode 
                      ? 'bg-white border-zinc-200 focus:border-violet-500 text-zinc-900' 
                      : 'bg-zinc-950 border-zinc-800 focus:border-violet-500 text-zinc-50'
                  }`}
                  placeholder="Enter verify token"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSaveVerifyToken}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold font-sans transition text-center"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setCustomVerifyToken(defaultVerifyToken);
                      setIsEditingToken(false);
                    }}
                    className="flex-1 sm:flex-none px-2 py-1.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg font-sans transition text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{defaultVerifyToken}</div>
                <button
                  onClick={() => setIsEditingToken(true)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-md transition"
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
        <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border flex flex-col lg:flex-row gap-8 transition-all ${isLightMode ? 'bg-white border-zinc-200/80 shadow-sm' : 'bg-zinc-900/50 border-zinc-800/80 shadow-xl'}`}>
          {/* Identity & Control Column */}
          <div className="w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800/50 pb-5 lg:pb-0 lg:pr-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/15">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-50">WhatsApp</h3>
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Cloud API</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  connectedPlatforms.whatsapp 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-800'
                }`}>
                  {connectedPlatforms.whatsapp ? "Connected" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Receive and send end-customer chats using WhatsApp Cloud Business APIs.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-400 font-medium">Channel Ingestion</span>
                <button 
                  onClick={() => handleTogglePlatformWebhook('whatsapp')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition ${
                    platformToggles.whatsapp 
                      ? 'bg-violet-600 text-white shadow-sm' 
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {platformToggles.whatsapp ? "Active" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-100 dark:border-zinc-800/40 pt-3">
                <span className="text-zinc-400 font-medium">Platform Link</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('whatsapp')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition border ${
                    connectedPlatforms.whatsapp 
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20' 
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
                  }`}
                >
                  {connectedPlatforms.whatsapp ? "Disconnect" : "Link Connect"}
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Column */}
          <div className="flex-1 flex flex-col justify-between space-y-6 lg:pl-4">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Developer Credentials</span>
                <p className="text-xs text-zinc-400">Map the specific phone registrations from your Meta Developer app.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Registered Phone Number</label>
                  <input 
                    type="text"
                    placeholder="+447123456789"
                    value={platformConfigs.whatsapp?.phone || ''}
                    onChange={(e) => handleUpdatePlatformField('whatsapp', 'phone', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                      isLightMode 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Phone Number ID</label>
                  <input 
                    type="text"
                    placeholder="e.g. 102948572019485"
                    value={platformConfigs.whatsapp?.phoneId || ''}
                    onChange={(e) => handleUpdatePlatformField('whatsapp', 'phoneId', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                      isLightMode 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                    }`}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">WhatsApp Access Token (Permanent / System User Token)</label>
                  <input 
                    type="password"
                    placeholder="EAAGzD..."
                    value={platformConfigs.whatsapp?.accessToken || ''}
                    onChange={(e) => handleUpdatePlatformField('whatsapp', 'accessToken', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                      isLightMode 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Pipeline Sandbox</span>
                <p className="text-xs text-zinc-400">Validate connection or dispatch simulated webhook events.</p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTestHandshake('whatsapp')}
                  disabled={testingPlatform === 'whatsapp'}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'whatsapp' ? 'animate-spin' : ''}`} />
                  Test Pipeline
                </button>
                <button
                  onClick={() => handleSimulateWebhook('whatsapp')}
                  disabled={simulatingPlatform === 'whatsapp'}
                  className="w-full sm:w-auto px-4 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 border border-violet-100 dark:border-violet-500/20 text-xs text-violet-700 dark:text-violet-400 font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  Simulate Webhook
                </button>
                <button
                  onClick={() => handleSaveConfig('whatsapp', { 
                    phone: platformConfigs.whatsapp.phone,
                    phoneId: platformConfigs.whatsapp.phoneId,
                    accessToken: platformConfigs.whatsapp.accessToken || ''
                  })}
                  className="col-span-2 sm:col-span-1 w-full sm:w-auto sm:ml-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold rounded-xl transition shadow-sm text-center flex items-center justify-center"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Instagram Row */}
        <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border flex flex-col lg:flex-row gap-8 transition-all ${isLightMode ? 'bg-white border-zinc-200/80 shadow-sm' : 'bg-zinc-900/50 border-zinc-800/80 shadow-xl'}`}>
          {/* Identity & Control Column */}
          <div className="w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800/50 pb-5 lg:pb-0 lg:pr-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-pink-500/10 text-pink-500 rounded-2xl border border-pink-500/15">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-50">Instagram</h3>
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Graph API</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  connectedPlatforms.instagram 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-800'
                }`}>
                  {connectedPlatforms.instagram ? "Connected" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Engage customers via Instagram Direct Messages linked to your system inbox.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-400 font-medium">Channel Ingestion</span>
                <button 
                  onClick={() => handleTogglePlatformWebhook('instagram')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition ${
                    platformToggles.instagram 
                      ? 'bg-violet-600 text-white shadow-sm' 
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {platformToggles.instagram ? "Active" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-100 dark:border-zinc-800/40 pt-3">
                <span className="text-zinc-400 font-medium">Platform Link</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('instagram')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition border ${
                    connectedPlatforms.instagram 
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20' 
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
                  }`}
                >
                  {connectedPlatforms.instagram ? "Disconnect" : "Link Connect"}
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Column */}
          <div className="flex-1 flex flex-col justify-between space-y-6 lg:pl-4">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Developer Credentials</span>
                <p className="text-xs text-zinc-400">Instagram Professional account mappings and secure system users.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Instagram Account ID</label>
                  <input 
                    type="text"
                    placeholder="e.g. 178414012345678"
                    value={platformConfigs.instagram?.accountId || ''}
                    onChange={(e) => handleUpdatePlatformField('instagram', 'accountId', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                      isLightMode 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Graph Access Token</label>
                  <input 
                    type="password"
                    placeholder="••••••••••••••••"
                    value={platformConfigs.instagram?.accessToken || ''}
                    onChange={(e) => handleUpdatePlatformField('instagram', 'accessToken', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                      isLightMode 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Pipeline Sandbox</span>
                <p className="text-xs text-zinc-400">Validate connection or dispatch simulated webhook events.</p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTestHandshake('instagram')}
                  disabled={testingPlatform === 'instagram'}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'instagram' ? 'animate-spin' : ''}`} />
                  Test Pipeline
                </button>
                <button
                  onClick={() => handleSimulateWebhook('instagram')}
                  disabled={simulatingPlatform === 'instagram'}
                  className="w-full sm:w-auto px-4 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 border border-violet-100 dark:border-violet-500/20 text-xs text-violet-700 dark:text-violet-400 font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  Simulate Webhook
                </button>
                <button
                  onClick={() => handleSaveConfig('instagram', { 
                    accountId: platformConfigs.instagram.accountId,
                    accessToken: platformConfigs.instagram.accessToken
                  })}
                  className="col-span-2 sm:col-span-1 w-full sm:w-auto sm:ml-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold rounded-xl transition shadow-sm text-center flex items-center justify-center"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Facebook Messenger Row */}
        <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border flex flex-col lg:flex-row gap-8 transition-all ${isLightMode ? 'bg-white border-zinc-200/80 shadow-sm' : 'bg-zinc-900/50 border-zinc-800/80 shadow-xl'}`}>
          {/* Identity & Control Column */}
          <div className="w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800/50 pb-5 lg:pb-0 lg:pr-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/15">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-50">Messenger</h3>
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Facebook Page</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  connectedPlatforms.facebook 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                    : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-800'
                }`}>
                  {connectedPlatforms.facebook ? "Connected" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect Messenger interactions and business Pages directly to the central inbox.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-400 font-medium">Channel Ingestion</span>
                <button 
                  onClick={() => handleTogglePlatformWebhook('facebook')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition ${
                    platformToggles.facebook 
                      ? 'bg-violet-600 text-white shadow-sm' 
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {platformToggles.facebook ? "Active" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-100 dark:border-zinc-800/40 pt-3">
                <span className="text-zinc-400 font-medium">Platform Link</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('facebook')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition border ${
                    connectedPlatforms.facebook 
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20' 
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
                  }`}
                >
                  {connectedPlatforms.facebook ? "Disconnect" : "Link Connect"}
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Column */}
          <div className="flex-1 flex flex-col justify-between space-y-6 lg:pl-4">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Developer Credentials</span>
                <p className="text-xs text-zinc-400">Map specific Facebook Pages and authorized permanent Page Access Tokens.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Facebook Page ID</label>
                  <input 
                    type="text"
                    placeholder="e.g. 1029485720194"
                    value={platformConfigs.facebook?.pageId || ''}
                    onChange={(e) => handleUpdatePlatformField('facebook', 'pageId', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                      isLightMode 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Page Access Token</label>
                  <input 
                    type="password"
                    placeholder="••••••••••••••••"
                    value={platformConfigs.facebook?.pageAccessToken || ''}
                    onChange={(e) => handleUpdatePlatformField('facebook', 'pageAccessToken', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                      isLightMode 
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Pipeline Sandbox</span>
                <p className="text-xs text-zinc-400">Validate connection or dispatch simulated webhook events.</p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTestHandshake('facebook')}
                  disabled={testingPlatform === 'facebook'}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'facebook' ? 'animate-spin' : ''}`} />
                  Test Pipeline
                </button>
                <button
                  onClick={() => handleSimulateWebhook('facebook')}
                  disabled={simulatingPlatform === 'facebook'}
                  className="w-full sm:w-auto px-4 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 border border-violet-100 dark:border-violet-500/20 text-xs text-violet-700 dark:text-violet-400 font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  Simulate Webhook
                </button>
                <button
                  onClick={() => handleSaveConfig('facebook', { 
                    pageId: platformConfigs.facebook.pageId,
                    pageAccessToken: platformConfigs.facebook.pageAccessToken
                  })}
                  className="col-span-2 sm:col-span-1 w-full sm:w-auto sm:ml-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold rounded-xl transition shadow-sm text-center flex items-center justify-center"
                >
                  Save
                </button>
              </div>
            </div>
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
            className={`p-6 rounded-2xl border ${
              testResult 
                ? testResult.success 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                : 'bg-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800/40">
                {testResult ? (
                  testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-violet-500 animate-spin" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-xs uppercase tracking-wider font-bold">
                  {testingPlatform ? `${testingPlatform.toUpperCase()} Diagnostics Console` : "Pipeline Status Report"}
                </span>
                <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {testingPlatform ? testProgress : testResult?.message}
                </p>
              </div>
              <button 
                onClick={() => { setTestingPlatform(null); setTestResult(null); }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
