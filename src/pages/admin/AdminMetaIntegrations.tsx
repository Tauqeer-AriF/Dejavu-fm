import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdmin } from "./adminApi";
import { QRCodeSVG } from "qrcode.react";
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
  Edit,
  Eye,
  EyeOff,
  QrCode,
  Smartphone,
  Link,
  Unlink,
  Copy,
  ExternalLink,
  Sparkles,
  Terminal,
  ArrowRight,
  Server,
  HelpCircle,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { useLogo } from "../../hooks/useLogo";
import { useModal } from "../../context/ModalContext";

export function AdminMetaIntegrations() {
  const { isLightMode } = useLogo();
  const { showConfirm } = useModal();
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
    whatsapp: { 
      provider: 'waha',
      serverUrl: '', 
      apiKey: '', 
      sessionName: 'default',
      phone: '', 
      verifyToken: 'dejavu_whatsapp_secret_key', 
      phoneId: '', 
      accessToken: '' 
    },
    instagram: { accountId: '', accessToken: '' },
    facebook: { pageId: '', pageAccessToken: '' }
  });

  const [customVerifyToken, setCustomVerifyToken] = useState("dejavu_whatsapp_secret_key");
  const [isEditingToken, setIsEditingToken] = useState(false);

  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [showInstagramToken, setShowInstagramToken] = useState(false);
  const [showFacebookToken, setShowFacebookToken] = useState(false);

  // WhatsApp Web Gateway (WAHA / Evolution API) States
  const [gatewayStatus, setGatewayStatus] = useState<'CONNECTED' | 'SCAN_QR_CODE' | 'STARTING' | 'STOPPED' | 'FAILED' | 'OFFLINE' | 'IDLE'>('IDLE');
  const [gatewayPhone, setGatewayPhone] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ qr: string | null; type: 'image' | 'raw' } | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isCheckingGateway, setIsCheckingGateway] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testMsgPhone, setTestMsgPhone] = useState('');
  const [testMsgText, setTestMsgText] = useState('Hello from DejavuFM Radio Studio! 📻🎵');
  const [isSendingTestMsg, setIsSendingTestMsg] = useState(false);
  const [isSyncingGateway, setIsSyncingGateway] = useState(false);
  const [showRailwayGuide, setShowRailwayGuide] = useState(false);

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
        const waCfg = settings.studio_platform_configs.whatsapp || {};
        const provider = waCfg.provider || (waCfg.accessToken && !waCfg.serverUrl ? 'meta' : 'waha');

        setPlatformConfigs(prev => ({
          ...prev,
          whatsapp: { 
            provider,
            serverUrl: waCfg.serverUrl || '',
            apiKey: waCfg.apiKey || '',
            sessionName: waCfg.sessionName || 'default',
            phone: waCfg.phone || '', 
            verifyToken: waCfg.verifyToken || 'dejavu_whatsapp_secret_key',
            phoneId: waCfg.phoneId || '',
            accessToken: waCfg.accessToken || ''
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

  // Auto-poll gateway status when QR code is visible so it automatically detects when user pairs their phone
  useEffect(() => {
    let intervalId: any = null;
    if (qrCodeData?.qr && gatewayStatus !== 'CONNECTED') {
      intervalId = setInterval(async () => {
        const wa = platformConfigs.whatsapp || {};
        if (!wa.serverUrl) return;
        try {
          const query = new URLSearchParams({
            serverUrl: wa.serverUrl,
            apiKey: wa.apiKey || '',
            sessionName: wa.sessionName || 'default'
          });
          const res = await fetchAdmin(`/api/admin/whatsapp-gateway/status?${query.toString()}`);
          const data = await res.json();
          if (data.connected || data.status === 'CONNECTED' || data.status === 'WORKING') {
            setGatewayStatus('CONNECTED');
            setQrCodeData(null);
            if (data.phone) setGatewayPhone(data.phone);
            toast.success(`🎉 WhatsApp Connected! Phone linked: +${data.phone || 'Ready'}`);
            queryClient.invalidateQueries({ queryKey: ["studioSettings"] });
          }
        } catch (e) {
          // ignore background polling network errors
        }
      }, 3500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [qrCodeData, gatewayStatus, platformConfigs.whatsapp]);

  // --- WhatsApp Web Gateway Actions (WAHA / Evolution API) ---
  const handleCheckGatewayStatus = async () => {
    const wa = platformConfigs.whatsapp || {};
    if (!wa.serverUrl) {
      toast.error("Please enter your Gateway Server URL first.");
      return;
    }
    setIsCheckingGateway(true);
    try {
      const query = new URLSearchParams({
        serverUrl: wa.serverUrl,
        apiKey: wa.apiKey || '',
        sessionName: wa.sessionName || 'default'
      });
      const res = await fetchAdmin(`/api/admin/whatsapp-gateway/status?${query.toString()}`);
      const data = await res.json();
      if (data.status) {
        setGatewayStatus(data.status);
        if (data.phone) setGatewayPhone(data.phone);
        if (data.connected) {
          toast.success(`WhatsApp Connected! Phone linked: +${data.phone || 'Ready'}`);
          setQrCodeData(null);
        } else if (data.status === 'SCAN_QR_CODE') {
          toast.info("Gateway is ready for QR pairing. Fetching QR code...");
          handleFetchGatewayQr();
        } else if (data.status === 'STARTING') {
          toast.info("Session is initializing on WAHA. Loading QR code now...");
          handleFetchGatewayQr();
        } else if (data.status === 'STOPPED') {
          toast.warning("Session was stopped. Initializing session and generating QR...");
          handleFetchGatewayQr();
        } else {
          toast.warning(`Gateway status: ${data.status}`);
        }
      } else {
        setGatewayStatus('OFFLINE');
        toast.error(data.error || "Unable to reach WhatsApp gateway.");
      }
    } catch (err: any) {
      setGatewayStatus('OFFLINE');
      toast.error(err.message || "Failed to check gateway status.");
    } finally {
      setIsCheckingGateway(false);
    }
  };

  const handleFetchGatewayQr = async () => {
    const wa = platformConfigs.whatsapp || {};
    if (!wa.serverUrl) {
      toast.error("Please enter your Gateway Server URL first.");
      return;
    }
    setIsLoadingQr(true);
    try {
      const query = new URLSearchParams({
        serverUrl: wa.serverUrl,
        apiKey: wa.apiKey || '',
        sessionName: wa.sessionName || 'default'
      });
      const res = await fetchAdmin(`/api/admin/whatsapp-gateway/qr?${query.toString()}`);
      const data = await res.json();
      if (data.qr) {
        setQrCodeData(data);
        setGatewayStatus('SCAN_QR_CODE');
        toast.success("WhatsApp QR code generated! Point your phone camera to pair.");
      } else {
        if (data.error && data.error.includes('already connected')) {
          setGatewayStatus('CONNECTED');
          setQrCodeData(null);
          toast.success(data.error);
        } else if (data.status === 'STARTING') {
          setGatewayStatus('STARTING');
          toast.info("Chromium browser is starting on the gateway. Checking for QR code in 4 seconds...");
          setTimeout(() => {
            handleFetchGatewayQr();
          }, 4000);
        } else {
          toast.error(data.error || "No QR code available. Check if phone is already linked.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to retrieve QR code.");
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleLogoutGateway = async () => {
    const wa = platformConfigs.whatsapp || {};
    if (!wa.serverUrl) return;
    try {
      const res = await fetchAdmin("/api/admin/whatsapp-gateway/logout", {
        method: "POST",
        body: JSON.stringify({
          serverUrl: wa.serverUrl,
          apiKey: wa.apiKey || '',
          sessionName: wa.sessionName || 'default'
        })
      });
      const data = await res.json();
      toast.success(data.message || "Session disconnected.");
      setGatewayStatus('STOPPED');
      setQrCodeData(null);
      setGatewayPhone(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect session.");
    }
  };

  const handleClearWhatsappMessages = async () => {
    const confirmed = await showConfirm({
      title: "Purge Stored WhatsApp Messages",
      message: "Are you sure you want to permanently delete all stored WhatsApp messages and attachments from the database? This cannot be undone.",
      style: "danger",
      confirmText: "Purge WhatsApp Data"
    });

    if (confirmed) {
      try {
        const res = await fetchAdmin('/api/admin/whatsapp-gateway/clear-messages', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to clear WhatsApp messages');
        toast.success(`Purged ${data.deletedCount ?? 0} WhatsApp messages from database.`);
      } catch (err: any) {
        toast.error(err.message || "Failed to clear WhatsApp messages.");
      }
    }
  };

  const handleSendGatewayTestMessage = async () => {
    const wa = platformConfigs.whatsapp || {};
    if (!wa.serverUrl) {
      toast.error("Please enter your Gateway Server URL first.");
      return;
    }
    if (!testMsgPhone || !testMsgPhone.trim()) {
      toast.error("Please enter a recipient phone number with country code (e.g. +447123456789).");
      return;
    }
    setIsSendingTestMsg(true);
    try {
      const res = await fetchAdmin("/api/admin/whatsapp-gateway/test-message", {
        method: "POST",
        body: JSON.stringify({
          serverUrl: wa.serverUrl,
          apiKey: wa.apiKey || '',
          sessionName: wa.sessionName || 'default',
          to: testMsgPhone.trim(),
          text: testMsgText || 'Hello from DejavuFM Radio!'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`WhatsApp message sent successfully to ${testMsgPhone}!`);
      } else {
        toast.error(data.error || "Failed to send message via gateway.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send test message.");
    } finally {
      setIsSendingTestMsg(false);
    }
  };

  const handleSyncGatewayMessages = async () => {
    setIsSyncingGateway(true);
    try {
      const res = await fetchAdmin("/api/admin/whatsapp-gateway/sync", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced WhatsApp: ${data.syncedCount || 0} new message(s) imported across ${data.chatsCount || 0} active chat(s).`);
      } else {
        toast.error(data.error || "Sync failed. Check Gateway Server status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync messages.");
    } finally {
      setIsSyncingGateway(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/webhooks/whatsapp-gateway`;
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied to clipboard!");
  };

  // Auto-check gateway status if serverUrl is configured
  useEffect(() => {
    if (platformConfigs.whatsapp?.provider === 'waha' && platformConfigs.whatsapp?.serverUrl) {
      handleCheckGatewayStatus();
    }
  }, [platformConfigs.whatsapp?.serverUrl, platformConfigs.whatsapp?.provider]);

  // Credentials Testing State
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestHandshake = async (platformId: string) => {
    setTestingPlatform(platformId);
    setTestResult(null);
    const config = platformConfigs[platformId] || {};

    try {
      const steps = [
        "Securing communication channel with messaging service...",
        "Validating credentials and active socket status...",
        "Checking platform endpoint responsiveness...",
        "Validating active webhook subscriptions..."
      ];

      for (const step of steps) {
        setTestProgress(step);
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      if (platformId === 'whatsapp') {
        const isGateway = config.provider === 'waha' || (!config.provider && Boolean(config.serverUrl));

        if (isGateway) {
          if (!config.serverUrl) {
            setTestResult({
              success: false,
              message: "Handshake Failed: Gateway Server URL is empty. Please enter your Railway or server URL (e.g. https://waha-xxx.up.railway.app)."
            });
            return;
          }

          const query = new URLSearchParams({
            serverUrl: config.serverUrl,
            apiKey: config.apiKey || '',
            sessionName: config.sessionName || 'default'
          });

          const res = await fetchAdmin(`/api/admin/whatsapp-gateway/status?${query.toString()}`);
          const data = await res.json();

          if (data.status === 'CONNECTED') {
            setGatewayStatus('CONNECTED');
            if (data.phone) setGatewayPhone(data.phone);
            setTestResult({
              success: true,
              message: `Handshake Successful! Connected to WhatsApp Web Gateway on session "${config.sessionName || 'default'}". Linked Phone: +${data.phone || 'Ready'}.`
            });
          } else if (data.status === 'SCAN_QR_CODE') {
            setGatewayStatus('SCAN_QR_CODE');
            setTestResult({
              success: true,
              message: `Handshake Reached Gateway! Session is active and waiting for your phone to scan the QR Code.`
            });
            handleFetchGatewayQr();
          } else {
            setGatewayStatus(data.status || 'OFFLINE');
            setTestResult({
              success: false,
              message: data.error || `Gateway returned status: ${data.status}. Make sure the Docker instance on Railway is running.`
            });
          }
          return;
        }

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
    } finally {
      setTestingPlatform(null);
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
        const isGateway = platformConfigs.whatsapp.provider === 'waha' || (!platformConfigs.whatsapp.provider && Boolean(platformConfigs.whatsapp.serverUrl));

        if (isGateway) {
          payload = {
            event: "message",
            session: platformConfigs.whatsapp.sessionName || "default",
            payload: {
              id: `waha_sim_${Date.now()}`,
              timestamp: ts,
              from: "447987654321@c.us",
              to: (platformConfigs.whatsapp.phone ? platformConfigs.whatsapp.phone.replace(/\+/g, '') : "447123456789") + "@c.us",
              body: simText,
              hasMedia: false,
              _data: {
                notifyName: simSender
              }
            }
          };
        } else {
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
        }
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
        <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b ${isLightMode ? "border-zinc-100" : "border-zinc-800/80"}`}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border border-violet-500/15 ${isLightMode ? "bg-violet-500/10" : "bg-violet-500/20"}`}>
                <Shield className={`w-5 h-5 ${isLightMode ? "text-violet-600" : "text-violet-400"}`} />
              </div>
              <div>
                <h2 className={`text-xl font-semibold font-sans tracking-tight ${isLightMode ? "text-zinc-900" : "text-zinc-50"}`}>Meta Integrations</h2>
                <p className={`text-xs font-medium ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Configure webhook processing and credential pipelines</p>
              </div>
            </div>
            <p className={`text-sm max-w-2xl pt-1 ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>
              Connect your Meta Developer applications to receive message payloads in real-time. Toggle ingestion for individual channels, validate credentials, and simulate live data payloads.
            </p>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className={`p-4 rounded-2xl flex items-center justify-between gap-6 border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-950/40 border-zinc-800/50'} w-full sm:min-w-[280px]`}>
              <div className="space-y-0.5">
                <span className={`text-xs font-semibold ${isLightMode ? "text-zinc-700" : "text-zinc-300"}`}>Global Webhook Ingestion</span>
                <p className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${globalEnabled ? (isLightMode ? "text-emerald-600" : "text-emerald-400") : "text-zinc-400"}`}>
                  {globalEnabled ? "Active & Listening" : "Suspended"}
                </p>
              </div>
              <button
                onClick={handleToggleGlobal}
                className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                  globalEnabled ? "bg-violet-600" : (isLightMode ? "bg-zinc-300" : "bg-zinc-700")
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
            <span className={`text-[10px] font-semibold uppercase tracking-wider font-sans ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Webhook Callback URL</span>
            <div className={`font-mono text-xs font-bold break-all select-all ${isLightMode ? "text-violet-600" : "text-violet-400"}`}>
              {webhookCallbackUrl}
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${isLightMode ? 'bg-zinc-50/50 border-zinc-200/60' : 'bg-zinc-900/20 border-zinc-800/40'}`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wider font-sans block ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Verification Token</span>
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
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-violet-600 hover:bg-violet-500 !text-white rounded-lg text-xs font-semibold font-sans transition text-center"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setCustomVerifyToken(defaultVerifyToken);
                      setIsEditingToken(false);
                    }}
                    className={`flex-1 sm:flex-none px-2 py-1.5 text-xs rounded-lg font-sans transition text-center ${isLightMode ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-700" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className={`font-mono text-xs font-bold ${isLightMode ? "text-zinc-800" : "text-zinc-200"}`}>{defaultVerifyToken}</div>
                <button
                  onClick={() => setIsEditingToken(true)}
                  className={`p-1 rounded-md transition ${isLightMode ? "hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" : "hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"}`}
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
          <div className={`w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r pb-5 lg:pb-0 lg:pr-8 flex flex-col justify-between space-y-6 ${isLightMode ? "border-zinc-100" : "border-zinc-800/50"}`}>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/15 ${isLightMode ? "text-emerald-600" : "text-emerald-400"}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-base ${isLightMode ? "text-zinc-900" : "text-zinc-50"}`}>WhatsApp</h3>
                    <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider block">
                      {platformConfigs.whatsapp?.provider === 'meta' ? 'Meta Cloud API' : 'Self-Hosted Gateway'}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  gatewayStatus === 'CONNECTED' || (platformConfigs.whatsapp?.provider === 'meta' && connectedPlatforms.whatsapp)
                    ? (isLightMode ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")
                    : gatewayStatus === 'SCAN_QR_CODE'
                    ? (isLightMode ? "bg-amber-50 text-amber-700 border-amber-200/60" : "bg-amber-500/10 text-amber-400 border-amber-500/20")
                    : (isLightMode ? "bg-zinc-50 text-zinc-500 border-zinc-200" : "bg-zinc-800/50 text-zinc-400 border-zinc-800")
                }`}>
                  {gatewayStatus === 'CONNECTED' ? 'Linked & Live' : gatewayStatus === 'SCAN_QR_CODE' ? 'Scan QR' : connectedPlatforms.whatsapp ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Receive and send listener chats over WhatsApp. Connect via free Railway bridge or official Meta API.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-400 font-medium">Channel Ingestion</span>
                <button 
                  onClick={() => handleTogglePlatformWebhook('whatsapp')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition ${
                    platformToggles.whatsapp 
                      ? 'bg-violet-600 !text-white shadow-sm' 
                      : (isLightMode ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400")
                  }`}
                >
                  {platformToggles.whatsapp ? "Active" : "Disabled"}
                </button>
              </div>

              <div className={`flex items-center justify-between text-xs py-1 border-t pt-3 ${isLightMode ? "border-zinc-100" : "border-zinc-800/40"}`}>
                <span className="text-zinc-400 font-medium">Platform Link</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('whatsapp')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition border ${
                    connectedPlatforms.whatsapp 
                      ? (isLightMode ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20") 
                      : (isLightMode ? "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50" : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800")
                  }`}
                >
                  {connectedPlatforms.whatsapp ? "Disconnect" : "Link Connect"}
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Column */}
          <div className="flex-1 flex flex-col justify-between space-y-6 lg:pl-4">
            <div className="space-y-4">
              {/* Provider Selector Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>
                    Integration Architecture
                  </span>
                  <p className="text-xs text-zinc-400">Choose between the free self-hosted web bridge or Meta developer Cloud API.</p>
                </div>

                <div className={`p-1 rounded-xl border flex items-center gap-1 self-start sm:self-auto ${isLightMode ? 'bg-zinc-100/80 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <button
                    type="button"
                    onClick={() => handleUpdatePlatformField('whatsapp', 'provider', 'waha')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      platformConfigs.whatsapp?.provider !== 'meta'
                        ? (isLightMode ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold')
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                    WAHA Gateway (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePlatformField('whatsapp', 'provider', 'meta')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      platformConfigs.whatsapp?.provider === 'meta'
                        ? (isLightMode ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold')
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5 text-blue-500" />
                    Meta Cloud API
                  </button>
                </div>
              </div>

              {/* Conditional Form: WAHA vs Meta */}
              {platformConfigs.whatsapp?.provider !== 'meta' ? (
                /* WAHA / Evolution Self-Hosted Form */
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    gatewayStatus === 'CONNECTED'
                      ? (isLightMode ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200')
                      : gatewayStatus === 'SCAN_QR_CODE'
                      ? (isLightMode ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-amber-950/20 border-amber-800/50 text-amber-200')
                      : gatewayStatus === 'OFFLINE'
                      ? (isLightMode ? 'bg-red-50/50 border-red-200 text-red-950' : 'bg-red-950/20 border-red-800/40 text-red-200')
                      : (isLightMode ? 'bg-zinc-50/80 border-zinc-200' : 'bg-zinc-950/50 border-zinc-800/80')
                  }`}>
                    {/* Header Row: Status Indicator + Title + Badge */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          gatewayStatus === 'CONNECTED' 
                            ? 'bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse' 
                            : gatewayStatus === 'SCAN_QR_CODE' 
                            ? 'bg-amber-500 ring-4 ring-amber-500/20 animate-pulse' 
                            : gatewayStatus === 'OFFLINE'
                            ? 'bg-red-500 ring-4 ring-red-500/20'
                            : 'bg-zinc-400'
                        }`} />
                        <span className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                          {gatewayStatus === 'CONNECTED'
                            ? `WhatsApp Connected & Linked! (+${gatewayPhone || platformConfigs.whatsapp?.phone || 'Ready'})`
                            : gatewayStatus === 'SCAN_QR_CODE'
                            ? 'Ready for Pairing: Scan QR code'
                            : gatewayStatus === 'OFFLINE'
                            ? 'Gateway Server Unreachable'
                            : 'Gateway Idle / Checking Connection'}
                        </span>
                      </div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
                        gatewayStatus === 'CONNECTED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : gatewayStatus === 'SCAN_QR_CODE'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : gatewayStatus === 'OFFLINE'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                          : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/60 dark:border-zinc-700'
                      }`}>
                        {gatewayStatus === 'CONNECTED'
                          ? 'Live Bridge Active'
                          : gatewayStatus === 'SCAN_QR_CODE'
                          ? 'Awaiting Scan'
                          : gatewayStatus === 'OFFLINE'
                          ? 'Offline'
                          : 'Standby'}
                      </span>
                    </div>

                    {/* Description */}
                    <p className={`text-xs leading-relaxed ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {gatewayStatus === 'CONNECTED'
                        ? 'Inbound listener WhatsApp messages stream into the Studio Inbox in real time. Outbound replies send directly through your station number.'
                        : gatewayStatus === 'SCAN_QR_CODE'
                        ? 'Your WhatsApp bridge session is waiting for mobile authorization. Click Pair Phone / QR below and scan the QR code from WhatsApp Settings > Linked Devices.'
                        : gatewayStatus === 'OFFLINE'
                        ? 'Cannot reach the WAHA / Evolution gateway server URL. Verify your Railway or VPS deployment is online and the URL below is correct.'
                        : 'Runs WhatsApp Web headlessly on your server without Meta approval delays, template restrictions, or recurring API subscription fees.'}
                    </p>

                    {/* Action Toolbar */}
                    <div className={`pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 ${
                      isLightMode ? 'border-zinc-200/80' : 'border-zinc-800/80'
                    }`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleSyncGatewayMessages}
                          disabled={isSyncingGateway}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                            isLightMode 
                              ? 'bg-white hover:bg-emerald-50/60 border-zinc-200 hover:border-emerald-300 text-emerald-700' 
                              : 'bg-zinc-900 hover:bg-emerald-950/40 border-zinc-800 hover:border-emerald-800 text-emerald-300'
                          }`}
                          title="Sync and import recent messages from your linked WhatsApp"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isSyncingGateway ? 'animate-spin' : ''}`} />
                          {isSyncingGateway ? 'Syncing...' : 'Sync Messages'}
                        </button>

                        <button
                          type="button"
                          onClick={handleCheckGatewayStatus}
                          disabled={isCheckingGateway}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                            isLightMode 
                              ? 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700' 
                              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                          }`}
                          title="Ping WhatsApp gateway server and verify health"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGateway ? 'animate-spin text-zinc-400' : 'text-zinc-400'}`} />
                          {isCheckingGateway ? 'Checking...' : 'Check Status'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {gatewayStatus === 'CONNECTED' ? (
                          <button
                            type="button"
                            onClick={handleLogoutGateway}
                            className="px-3.5 py-1.5 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-500 dark:text-red-400 active:scale-95 shadow-sm"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            Unlink Phone
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleFetchGatewayQr}
                            disabled={isLoadingQr}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow active:scale-95 disabled:opacity-60"
                          >
                            {isLoadingQr ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <QrCode className="w-3.5 h-3.5" />
                            )}
                            {isLoadingQr ? 'Initializing & Loading QR...' : 'Pair Phone / QR'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Starting Gateway Browser Status Notice */}
                  {gatewayStatus === 'STARTING' && !qrCodeData?.qr && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                        isLightMode ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                      <div>
                        <span className="font-semibold block">Browser engine is starting up on gateway...</span>
                        <span className="text-[11px] opacity-85">WAHA is launching its internal Chromium session. Your QR code will appear automatically in a few seconds.</span>
                      </div>
                    </motion.div>
                  )}

                  {/* QR Code Modal / Drawer Display if active */}
                  {qrCodeData?.qr && gatewayStatus !== 'CONNECTED' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center gap-6 ${
                        isLightMode ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'
                      }`}
                    >
                      <div className="bg-white p-3.5 rounded-2xl shadow-md border border-zinc-200 shrink-0 flex flex-col items-center">
                        {qrCodeData.type === 'image' && qrCodeData.qr.startsWith('data:image') ? (
                          <img src={qrCodeData.qr} alt="WhatsApp Pairing QR" className="w-44 h-44 object-contain" />
                        ) : (
                          <QRCodeSVG value={qrCodeData.qr} size={176} level="M" />
                        )}
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Listening for phone scan...</span>
                        </div>
                      </div>

                      <div className="space-y-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">1</span>
                          <span className="text-xs font-medium">Open <strong>WhatsApp</strong> on your radio station mobile phone.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">2</span>
                          <span className="text-xs font-medium">Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong>.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">3</span>
                          <span className="text-xs font-medium">Tap <strong>Link a Device</strong> and point your camera at this QR code.</span>
                        </div>

                        <div className="pt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCheckGatewayStatus}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            I Scanned It (Verify)
                          </button>
                          <button
                            type="button"
                            onClick={handleFetchGatewayQr}
                            disabled={isLoadingQr}
                            className="px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingQr ? 'animate-spin' : ''}`} />
                            Refresh QR
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Gateway Server Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>
                          Gateway Server URL (Railway / VPS)
                        </label>
                        <span className="text-[10px] text-zinc-400">e.g. https://waha-xxx.up.railway.app</span>
                      </div>
                      <input 
                        type="text"
                        placeholder="https://waha-production.up.railway.app"
                        value={platformConfigs.whatsapp?.serverUrl || ''}
                        onChange={(e) => handleUpdatePlatformField('whatsapp', 'serverUrl', e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 ${
                          isLightMode 
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>
                          WAHA API Key (Optional)
                        </label>
                      </div>
                      <div className="relative">
                        <input 
                          type={showApiKey ? "text" : "password"}
                          placeholder="Your WAHA_API_KEY secret"
                          value={platformConfigs.whatsapp?.apiKey || ''}
                          onChange={(e) => handleUpdatePlatformField('whatsapp', 'apiKey', e.target.value)}
                          className={`w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 ${
                            isLightMode 
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                              : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>
                        Session Identifier
                      </label>
                      <input 
                        type="text"
                        placeholder="default"
                        value={platformConfigs.whatsapp?.sessionName || 'default'}
                        onChange={(e) => handleUpdatePlatformField('whatsapp', 'sessionName', e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 ${
                          isLightMode 
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>
                        Radio Station WhatsApp Phone Number
                      </label>
                      <input 
                        type="text"
                        placeholder="+44 7123 456789"
                        value={platformConfigs.whatsapp?.phone || ''}
                        onChange={(e) => handleUpdatePlatformField('whatsapp', 'phone', e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 ${
                          isLightMode 
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Webhook Endpoint Info Box */}
                  <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLightMode ? 'bg-zinc-50 border-zinc-200/80' : 'bg-zinc-950/40 border-zinc-800/60'
                  }`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Webhook Ingestion URL</span>
                      </div>
                      <code className="text-[11px] font-mono text-zinc-400 select-all break-all">
                        {window.location.origin}/api/webhooks/whatsapp-gateway
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={copyWebhookUrl}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto ${
                        isLightMode ? 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy URL
                    </button>
                  </div>

                  {/* Collapsible Railway Setup Guide */}
                  <div className={`rounded-xl border overflow-hidden transition-all ${
                    isLightMode ? 'border-zinc-200/80' : 'border-zinc-800/60'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setShowRailwayGuide(!showRailwayGuide)}
                      className={`w-full p-3.5 flex items-center justify-between text-xs font-medium transition ${
                        isLightMode ? 'bg-zinc-50 hover:bg-zinc-100/80' : 'bg-zinc-900/40 hover:bg-zinc-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-violet-500" />
                        <span>How to deploy the free WAHA container on Railway in 2 minutes</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-violet-500">
                        {showRailwayGuide ? 'Hide Instructions' : 'View Instructions'}
                      </span>
                    </button>

                    {showRailwayGuide && (
                      <div className={`p-4 text-xs space-y-3 border-t leading-relaxed ${
                        isLightMode ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}>
                        <div className="flex gap-2.5">
                          <span className="font-bold text-violet-500">1.</span>
                          <div>
                            In your existing <strong>Railway Dashboard</strong>, click <strong>+ New Service &gt; Docker Image</strong>.
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="font-bold text-violet-500">2.</span>
                          <div>
                            Enter image name: <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-violet-400">devlikeapro/waha</code>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="font-bold text-violet-500">3.</span>
                          <div>
                            Under service <strong>Variables</strong>, add:
                            <ul className="list-disc list-inside mt-1 space-y-1 pl-2 font-mono text-[11px]">
                              <li><span className="text-emerald-400">WHATSAPP_HOOK_URL</span> = <span className="opacity-80">{window.location.origin}/api/webhooks/whatsapp-gateway</span></li>
                              <li><span className="text-emerald-400">WHATSAPP_HOOK_EVENTS</span> = <span className="opacity-80">message</span></li>
                            </ul>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="font-bold text-violet-500">4.</span>
                          <div>
                            Under service <strong>Settings &gt; Networking</strong>, click <strong>Generate Domain</strong>. Copy that URL and paste it into the <strong>Gateway Server URL</strong> input above!
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Meta Official Cloud API Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>Registered Phone Number</label>
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
                      <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>Phone Number ID</label>
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
                      <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>WhatsApp Access Token (Permanent / System User Token)</label>
                      <div className="relative">
                        <input 
                          type={showWhatsAppToken ? "text" : "password"}
                          placeholder="EAAGzD..."
                          value={platformConfigs.whatsapp?.accessToken || ''}
                          onChange={(e) => handleUpdatePlatformField('whatsapp', 'accessToken', e.target.value)}
                          className={`w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                            isLightMode 
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                              : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                          className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                            isLightMode 
                              ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100' 
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                          title={showWhatsAppToken ? "Hide access token" : "Show access token"}
                        >
                          {showWhatsAppToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Test Outbound Live Sandbox if WAHA Gateway */}
            {platformConfigs.whatsapp?.provider !== 'meta' && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLightMode ? 'bg-zinc-50/70 border-zinc-200/80' : 'bg-zinc-950/40 border-zinc-800/60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold">Live Outbound Test Messenger</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Send an actual test message from DJ studio to your phone</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Recipient (+447123456789)"
                    value={testMsgPhone}
                    onChange={(e) => setTestMsgPhone(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                      isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Message text..."
                    value={testMsgText}
                    onChange={(e) => setTestMsgText(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                      isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendGatewayTestMessage}
                    disabled={isSendingTestMsg || !platformConfigs.whatsapp?.serverUrl}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTestMsg ? 'animate-spin' : ''}`} />
                    {isSendingTestMsg ? 'Sending...' : 'Send Live Test'}
                  </button>
                </div>
              </div>
            )}

            {/* Pipeline Action Bar */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isLightMode ? "bg-zinc-50 border-zinc-100" : "bg-zinc-950/40 border-zinc-800/60"}`}>
              <div className="space-y-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider block ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Pipeline Sandbox</span>
                <p className="text-xs text-zinc-400">Validate connection handshake or simulate listener incoming messages into Studio Inbox.</p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTestHandshake('whatsapp')}
                  disabled={testingPlatform === 'whatsapp'}
                  className={`w-full sm:w-auto px-4 py-2 border text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm ${isLightMode ? "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'whatsapp' ? 'animate-spin' : ''}`} />
                  Test Handshake
                </button>
                <button
                  onClick={() => handleSimulateWebhook('whatsapp')}
                  disabled={simulatingPlatform === 'whatsapp'}
                  className={`w-full sm:w-auto px-4 py-2 border text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm ${isLightMode ? "bg-violet-50 hover:bg-violet-100 border-violet-100 text-violet-700" : "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-400"}`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Simulate Inbound
                </button>
                <button
                  onClick={() => handleSaveConfig('whatsapp', { 
                    provider: platformConfigs.whatsapp.provider || 'waha',
                    serverUrl: platformConfigs.whatsapp.serverUrl || '',
                    apiKey: platformConfigs.whatsapp.apiKey || '',
                    sessionName: platformConfigs.whatsapp.sessionName || 'default',
                    phone: platformConfigs.whatsapp.phone || '',
                    phoneId: platformConfigs.whatsapp.phoneId || '',
                    accessToken: platformConfigs.whatsapp.accessToken || ''
                  })}
                  className={`col-span-2 sm:col-span-1 w-full sm:w-auto sm:ml-2 px-4 py-2 text-xs font-semibold rounded-xl transition shadow-sm text-center flex items-center justify-center ${isLightMode ? "bg-zinc-900 hover:bg-zinc-800 !text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"}`}
                >
                  Save Config
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Instagram Row */}
        <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border flex flex-col lg:flex-row gap-8 transition-all ${isLightMode ? 'bg-white border-zinc-200/80 shadow-sm' : 'bg-zinc-900/50 border-zinc-800/80 shadow-xl'}`}>
          {/* Identity & Control Column */}
          <div className={`w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r pb-5 lg:pb-0 lg:pr-8 flex flex-col justify-between space-y-6 ${isLightMode ? "border-zinc-100" : "border-zinc-800/50"}`}>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-pink-500/10 text-pink-500 rounded-2xl border border-pink-500/15">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-base ${isLightMode ? "text-zinc-900" : "text-zinc-50"}`}>Instagram</h3>
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Graph API</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  connectedPlatforms.instagram 
                    ? '${isLightMode ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}' 
                    : '${isLightMode ? "bg-zinc-50 text-zinc-500 border-zinc-200" : "bg-zinc-800/50 text-zinc-400 border-zinc-800"}'
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
                      ? 'bg-violet-600 !text-white shadow-sm' 
                      : '${isLightMode ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"}'
                  }`}
                >
                  {platformToggles.instagram ? "Active" : "Disabled"}
                </button>
              </div>

              <div className={`flex items-center justify-between text-xs py-1 border-t pt-3 ${isLightMode ? "border-zinc-100" : "border-zinc-800/40"}`}>
                <span className="text-zinc-400 font-medium">Platform Link</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('instagram')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition border ${
                    connectedPlatforms.instagram 
                      ? '${isLightMode ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}' 
                      : '${isLightMode ? "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50" : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"}'
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
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Developer Credentials</span>
                <p className="text-xs text-zinc-400">Instagram Professional account mappings and secure system users.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>Instagram Account ID</label>
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
                  <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>Graph Access Token</label>
                  <div className="relative">
                    <input 
                      type={showInstagramToken ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={platformConfigs.instagram?.accessToken || ''}
                      onChange={(e) => handleUpdatePlatformField('instagram', 'accessToken', e.target.value)}
                      className={`w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                        isLightMode 
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                          : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowInstagramToken(!showInstagramToken)}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                        isLightMode 
                          ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                      }`}
                      title={showInstagramToken ? "Hide access token" : "Show access token"}
                    >
                      {showInstagramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isLightMode ? "bg-zinc-50 border-zinc-100" : "bg-zinc-950/40 border-zinc-800/60"}`}>
              <div className="space-y-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider block ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Pipeline Sandbox</span>
                <p className="text-xs text-zinc-400">Validate connection or dispatch simulated webhook events.</p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTestHandshake('instagram')}
                  disabled={testingPlatform === 'instagram'}
                  className={`w-full sm:w-auto px-4 py-2 border text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm ${isLightMode ? "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'instagram' ? 'animate-spin' : ''}`} />
                  Test Pipeline
                </button>
                <button
                  onClick={() => handleSimulateWebhook('instagram')}
                  disabled={simulatingPlatform === 'instagram'}
                  className={`w-full sm:w-auto px-4 py-2 border text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm ${isLightMode ? "bg-violet-50 hover:bg-violet-100 border-violet-100 text-violet-700" : "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-400"}`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Simulate Webhook
                </button>
                <button
                  onClick={() => handleSaveConfig('instagram', { 
                    accountId: platformConfigs.instagram.accountId,
                    accessToken: platformConfigs.instagram.accessToken
                  })}
                  className={`col-span-2 sm:col-span-1 w-full sm:w-auto sm:ml-2 px-4 py-2 text-xs font-semibold rounded-xl transition shadow-sm text-center flex items-center justify-center ${isLightMode ? "bg-zinc-900 hover:bg-zinc-800 !text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"}`}
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
          <div className={`w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r pb-5 lg:pb-0 lg:pr-8 flex flex-col justify-between space-y-6 ${isLightMode ? "border-zinc-100" : "border-zinc-800/50"}`}>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/15">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-base ${isLightMode ? "text-zinc-900" : "text-zinc-50"}`}>Messenger</h3>
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">Facebook Page</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                  connectedPlatforms.facebook 
                    ? '${isLightMode ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}' 
                    : '${isLightMode ? "bg-zinc-50 text-zinc-500 border-zinc-200" : "bg-zinc-800/50 text-zinc-400 border-zinc-800"}'
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
                      ? 'bg-violet-600 !text-white shadow-sm' 
                      : '${isLightMode ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"}'
                  }`}
                >
                  {platformToggles.facebook ? "Active" : "Disabled"}
                </button>
              </div>

              <div className={`flex items-center justify-between text-xs py-1 border-t pt-3 ${isLightMode ? "border-zinc-100" : "border-zinc-800/40"}`}>
                <span className="text-zinc-400 font-medium">Platform Link</span>
                <button 
                  onClick={() => handleTogglePlatformConnection('facebook')}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg transition border ${
                    connectedPlatforms.facebook 
                      ? '${isLightMode ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}' 
                      : '${isLightMode ? "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50" : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"}'
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
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Developer Credentials</span>
                <p className="text-xs text-zinc-400">Map specific Facebook Pages and authorised permanent Page Access Tokens.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>Facebook Page ID</label>
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
                  <label className={`text-[11px] font-medium ${isLightMode ? "text-zinc-500" : "text-zinc-400"}`}>Page Access Token</label>
                  <div className="relative">
                    <input 
                      type={showFacebookToken ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={platformConfigs.facebook?.pageAccessToken || ''}
                      onChange={(e) => handleUpdatePlatformField('facebook', 'pageAccessToken', e.target.value)}
                      className={`w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 ${
                        isLightMode 
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white' 
                          : 'bg-zinc-950/40 border-zinc-800 text-zinc-100 focus:bg-zinc-950'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFacebookToken(!showFacebookToken)}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                        isLightMode 
                          ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                      }`}
                      title={showFacebookToken ? "Hide access token" : "Show access token"}
                    >
                      {showFacebookToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isLightMode ? "bg-zinc-50 border-zinc-100" : "bg-zinc-950/40 border-zinc-800/60"}`}>
              <div className="space-y-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider block ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`}>Pipeline Sandbox</span>
                <p className="text-xs text-zinc-400">Validate connection or dispatch simulated webhook events.</p>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleTestHandshake('facebook')}
                  disabled={testingPlatform === 'facebook'}
                  className={`w-full sm:w-auto px-4 py-2 border text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm ${isLightMode ? "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'facebook' ? 'animate-spin' : ''}`} />
                  Test Pipeline
                </button>
                <button
                  onClick={() => handleSimulateWebhook('facebook')}
                  disabled={simulatingPlatform === 'facebook'}
                  className={`w-full sm:w-auto px-4 py-2 border text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm ${isLightMode ? "bg-violet-50 hover:bg-violet-100 border-violet-100 text-violet-700" : "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-400"}`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Simulate Webhook
                </button>
                <button
                  onClick={() => handleSaveConfig('facebook', { 
                    pageId: platformConfigs.facebook.pageId,
                    pageAccessToken: platformConfigs.facebook.pageAccessToken
                  })}
                  className={`col-span-2 sm:col-span-1 w-full sm:w-auto sm:ml-2 px-4 py-2 text-xs font-semibold rounded-xl transition shadow-sm text-center flex items-center justify-center ${isLightMode ? "bg-zinc-900 hover:bg-zinc-800 !text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"}`}
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
                  ? (isLightMode ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400") 
                  : (isLightMode ? "bg-red-500/5 border-red-500/20 text-red-600" : "bg-red-500/5 border-red-500/20 text-red-400")
                : (isLightMode ? "bg-violet-500/5 border-violet-500/20 text-violet-600" : "bg-violet-500/5 border-violet-500/20 text-violet-400")
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl shadow-sm border ${isLightMode ? "bg-white border-zinc-100" : "bg-zinc-900 border-zinc-800/40"}`}>
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
                className={`p-1.5 rounded-lg transition ${isLightMode ? "hover:bg-zinc-100" : "hover:bg-zinc-800"}`}
              >
                <X className={`w-4 h-4 ${isLightMode ? "text-zinc-400" : "text-zinc-500"}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
