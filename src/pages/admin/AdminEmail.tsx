import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Sliders,
  FileText,
  Zap,
  History,
  Info,
  Key,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Copy,
  Sparkles,
  Server,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  Check,
  Search,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { toast } from "sonner";
import { useLogo } from "../../hooks/useLogo";
import { useModal } from "../../context/ModalContext";

export function AdminEmail() {
  const { isLightMode } = useLogo();
  const { showConfirm } = useModal();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'triggers' | 'broadcast' | 'logs'>('settings');

  // Helper parser
  const jsonFetch = async (url: string, init?: any) => {
    const res = await fetchAdmin(url, init);
    return res.json();
  };

  // 1. Fetch Email Stats & Overview
  const { data: stats, refetch: refetchStats, isFetching: isFetchingStats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: () => jsonFetch('/api/admin/email/stats'),
    refetchInterval: 10000
  });

  // 2. Fetch SMTP Settings
  const { data: settingsData, isLoading: isLoadingSettings, isFetching: isFetchingSettings } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => jsonFetch('/api/admin/email/settings')
  });

  // Refreshing state
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Settings local state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [senderName, setSenderName] = useState("dejavufm Radio Studio");
  const [senderEmail, setSenderEmail] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  // Test Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (settingsData) {
      setHost(settingsData.host || "smtp.gmail.com");
      setPort(String(settingsData.port || "587"));
      setSecure(Boolean(settingsData.secure));
      setAuthUser(settingsData.auth_user || "");
      setAuthPass(settingsData.auth_pass || "");
      setSenderName(settingsData.sender_name || "dejavufm Radio Studio");
      setSenderEmail(settingsData.sender_email || "");
      setIsEnabled(Boolean(settingsData.is_enabled));
    }
  }, [settingsData]);

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => jsonFetch('/api/admin/email/settings', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("SMTP Email configuration saved!");
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save settings");
    }
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate({
      host,
      port: Number(port),
      secure,
      auth_user: authUser,
      auth_pass: authPass,
      sender_name: senderName,
      sender_email: senderEmail,
      is_enabled: isEnabled
    });
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await jsonFetch('/api/admin/email/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          test_email: testEmailRecipient,
          host,
          port: Number(port),
          secure,
          auth_user: authUser,
          auth_pass: authPass,
          sender_name: senderName,
          sender_email: senderEmail
        })
      });
      setTestResult(res);
      if (res.success) {
        toast.success("SMTP connection verified successfully!");
        refetchStats();
      } else {
        toast.error(res.error || "SMTP test failed.");
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message || String(err) });
      toast.error(err?.message || "SMTP test failed.");
    } finally {
      setIsTesting(false);
    }
  };

  // Preset Auto-fill for non-technical users
  const applyPreset = (preset: 'gmail-ssl' | 'gmail-tls' | 'webmail' | 'outlook') => {
    if (preset === 'gmail-ssl') {
      setHost('smtp.gmail.com');
      setPort('465');
      setSecure(true);
      toast.info("Gmail SSL (Port 465) preset loaded. Recommended for Cloud hosting like Railway!");
    } else if (preset === 'gmail-tls') {
      setHost('smtp.gmail.com');
      setPort('587');
      setSecure(false);
      toast.info("Gmail TLS (Port 587) preset loaded. Use your 16-character App Password.");
    } else if (preset === 'outlook') {
      setHost('smtp.office365.com');
      setPort('587');
      setSecure(false);
      toast.info("Outlook/Office365 SMTP preset loaded.");
    } else if (preset === 'webmail') {
      setHost('mail.yourdomain.com');
      setPort('465');
      setSecure(true);
      toast.info("Webmail SSL preset loaded. Replace host with your domain's mail server.");
    }
  };

  // ----------------------------------------------------
  // Templates Tab State
  // ----------------------------------------------------
  const { data: rawTemplates = [], isFetching: isFetchingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => jsonFetch('/api/admin/email/templates')
  });

  const templates: any[] = Array.isArray(rawTemplates) ? rawTemplates : [];

  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [testTemplateEmail, setTestTemplateEmail] = useState("");
  const [isSendingTemplateTest, setIsSendingTemplateTest] = useState(false);

  const saveTemplateMutation = useMutation({
    mutationFn: (data: any) => jsonFetch('/api/admin/email/templates', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Email template saved!");
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save template")
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/admin/email/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success("Template deleted!");
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete template")
  });

  // ----------------------------------------------------
  // Triggers Tab State
  // ----------------------------------------------------
  const { data: rawTriggers = [], isFetching: isFetchingTriggers } = useQuery({
    queryKey: ['email-triggers'],
    queryFn: () => jsonFetch('/api/admin/email/triggers')
  });

  const triggers: any[] = Array.isArray(rawTriggers) ? rawTriggers : [];

  const updateTriggerMutation = useMutation({
    mutationFn: ({ id, template_slug, is_enabled }: any) =>
      jsonFetch(`/api/admin/email/triggers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ template_slug, is_enabled })
      }),
    onSuccess: () => {
      toast.success("Event trigger updated!");
      queryClient.invalidateQueries({ queryKey: ['email-triggers'] });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update trigger")
  });

  // ----------------------------------------------------
  // Broadcast Tab State
  // ----------------------------------------------------
  const [broadcastTemplateSlug, setBroadcastTemplateSlug] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastHtml, setBroadcastHtml] = useState("<p>Hello listeners!</p>");
  const [targetAudience, setTargetAudience] = useState<'all_users' | 'custom_list'>('all_users');
  const [customEmailsRaw, setCustomEmailsRaw] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<any>(null);

  const handleSendBroadcast = async () => {
    if (!broadcastSubject && !broadcastTemplateSlug) {
      toast.error("Please enter a subject or choose a template.");
      return;
    }

    const confirmed = await showConfirm({
      title: "Launch Broadcast Campaign",
      message: targetAudience === 'all_users'
        ? "Are you sure you want to dispatch this email broadcast campaign to ALL registered users?"
        : "Are you sure you want to dispatch this email broadcast campaign to the custom recipient list?",
      style: "info",
      confirmText: "Launch Campaign",
      cancelText: "Cancel"
    });

    if (!confirmed) return;

    setIsBroadcasting(true);
    setBroadcastProgress(null);

    try {
      const customEmails = customEmailsRaw.split('\n').map(e => e.trim()).filter(e => e.includes('@'));
      const res = await jsonFetch('/api/admin/email/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          template_slug: broadcastTemplateSlug || undefined,
          custom_subject: broadcastSubject,
          custom_html: broadcastHtml,
          target_audience: targetAudience,
          custom_emails: customEmails
        })
      });

      if (res.success) {
        setBroadcastProgress(res);
        toast.success(`Broadcast finished! Sent ${res.sentCount} / ${res.totalRecipients} emails.`);
        queryClient.invalidateQueries({ queryKey: ['email-logs'] });
        refetchStats();
      } else {
        toast.error(res.error || "Broadcast failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Broadcast error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // ----------------------------------------------------
  // Logs Tab State
  // ----------------------------------------------------
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');
  const [logPage, setLogPage] = useState(1);
  const [logLimit, setLogLimit] = useState(20);

  const { data: logsData, isFetching: isFetchingLogs } = useQuery({
    queryKey: ['email-logs', logFilterStatus, logPage, logLimit],
    queryFn: () => jsonFetch(`/api/admin/email/logs?status=${logFilterStatus}&page=${logPage}&limit=${logLimit}`)
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => jsonFetch('/api/admin/email/logs/clear', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Email history logs cleared.");
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      refetchStats();
    }
  });

  const isAnyFetching = isManualRefreshing || isFetchingStats || isFetchingSettings || isFetchingTemplates || isFetchingTriggers || isFetchingLogs;

  const handleRefreshAll = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['email-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['email-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['email-triggers'] }),
        queryClient.invalidateQueries({ queryKey: ['email-logs'] })
      ]);
      setLastRefreshedAt(new Date());
      toast.success("Email Suite Synchronized", {
        description: "Latest SMTP connection metrics, templates, and dispatch logs updated."
      });
    } catch (err: any) {
      toast.error("Failed to refresh Email Suite");
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  return (
    <div className={`p-3 sm:p-6 md:p-8 min-h-screen ${isLightMode ? 'bg-slate-50 text-slate-900' : 'bg-[#0A0C16] text-white'}`}>
      {/* Header Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8 border-b pb-6 ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/20 shrink-0">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider font-display">
                Centralized Email Suite
              </h1>
              <p className={`text-xs sm:text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Self-hosted SMTP dispatch engine, automated system notifications & broadcast manager
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Badge & Sync Action */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border font-bold text-xs shadow-sm ${
            stats?.status === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
              : stats?.status === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
          }`}>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
              stats?.status === 'connected' ? 'bg-emerald-500 animate-ping' : stats?.status === 'error' ? 'bg-rose-500' : 'bg-amber-500'
            }`} />
            <span className="uppercase tracking-wider text-[11px] sm:text-xs">
              {stats?.status === 'connected' ? 'SMTP Online' : stats?.status === 'error' ? 'SMTP Error' : 'Unconfigured'}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRefreshAll}
            disabled={isAnyFetching}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
              isAnyFetching
                ? 'opacity-80 bg-purple-500/10 border-purple-500/30 text-purple-600 cursor-wait'
                : isLightMode
                ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-purple-600 shadow-slate-200/50'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white shadow-black/20'
            }`}
            title="Refresh all Email Suite data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-500 transition-transform ${isAnyFetching ? 'animate-spin' : ''}`} />
            <span className="uppercase tracking-wider text-[11px]">
              {isAnyFetching ? 'Syncing...' : 'Sync Suite'}
            </span>
            <span className={`text-[10px] font-mono hidden md:inline border-l pl-2 ml-0.5 ${isLightMode ? 'text-slate-400 border-slate-200' : 'text-slate-400 border-white/10'}`}>
              {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </motion.button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className={`p-3.5 sm:p-4 rounded-2xl border ${isLightMode ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'}`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black">{stats?.totalSent || 0}</p>
          <span className="text-[10px] text-slate-400 block truncate">Successful dispatches</span>
        </div>

        <div className={`p-3.5 sm:p-4 rounded-2xl border ${isLightMode ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'}`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Failed</span>
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black">{stats?.totalFailed || 0}</p>
          <span className="text-[10px] text-slate-400 block truncate">Delivery errors</span>
        </div>

        <div className={`p-3.5 sm:p-4 rounded-2xl border ${isLightMode ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'}`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Active Triggers</span>
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black">{stats?.activeTriggers || 0}</p>
          <span className="text-[10px] text-slate-400 block truncate">Automated event listeners</span>
        </div>

        <div className={`p-3.5 sm:p-4 rounded-2xl border ${isLightMode ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white'}`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Templates</span>
            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black">{stats?.totalTemplates || 0}</p>
          <span className="text-[10px] text-slate-400 block truncate">HTML & Text layouts</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-3 mb-6 border-b no-scrollbar scroll-smooth ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
        {[
          { id: 'settings', label: 'SMTP Setup', icon: Sliders },
          { id: 'templates', label: 'Email Templates', icon: FileText },
          { id: 'triggers', label: 'System Triggers', icon: Zap },
          { id: 'broadcast', label: 'Broadcast Newsletter', icon: Send },
          { id: 'logs', label: 'Dispatch History Logs', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : isLightMode
                  ? 'bg-slate-200/60 text-slate-700 hover:bg-slate-200'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SMTP SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className={`lg:col-span-2 p-4 sm:p-6 rounded-3xl border ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 border-b ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
              <div>
                <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  <Server className="w-5 h-5 text-purple-500 shrink-0" />
                  SMTP Connection Credentials
                </h2>
                <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Connect any standard SMTP provider or webmail server. No third-party API keys required.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Quick Presets:</span>
                <button type="button" onClick={() => applyPreset('gmail-ssl')} className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                  isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  Gmail (SSL 465) ⭐
                </button>
                <button type="button" onClick={() => applyPreset('gmail-tls')} className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                  isLightMode ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                }`}>
                  Gmail (TLS 587)
                </button>
                <button type="button" onClick={() => applyPreset('outlook')} className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                  isLightMode ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}>
                  Outlook
                </button>
                <button type="button" onClick={() => applyPreset('webmail')} className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                  isLightMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                }`}>
                  cPanel / Custom
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 sm:space-y-5">
              <div className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border gap-3 ${
                isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
              }`}>
                <div>
                  <label className={`text-xs sm:text-sm font-bold block ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Enable Application Email Engine</label>
                  <p className={`text-[11px] sm:text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Turn on to allow sending transactional & broadcast emails</p>
                </div>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    SMTP Server Host
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="e.g. smtp.gmail.com"
                    required
                    className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-mono text-xs sm:text-sm ${
                      isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    Port
                  </label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="587 or 465"
                    required
                    className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-mono text-xs sm:text-sm ${
                      isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-start sm:items-center gap-2.5">
                <input
                  type="checkbox"
                  id="secure"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer mt-0.5 sm:mt-0 shrink-0"
                />
                <label htmlFor="secure" className={`text-xs font-medium cursor-pointer leading-snug ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  Use SSL/TLS Direct Encryption (Port 465). Uncheck for Port 587 (STARTTLS).
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    SMTP Auth Username / Email
                  </label>
                  <input
                    type="text"
                    value={authUser}
                    onChange={(e) => setAuthUser(e.target.value)}
                    placeholder="studio@dejavufm.com"
                    required
                    className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-mono text-xs sm:text-sm ${
                      isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    SMTP Auth Password / App Password
                  </label>
                  <input
                    type="password"
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    placeholder="••••••••••••••••"
                    required
                    className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-mono text-xs sm:text-sm ${
                      isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    From Display Name
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="dejavufm Radio Studio"
                    required
                    className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm ${
                      isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    From Reply Email Address
                  </label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="no-reply@dejavufm.com"
                    className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-mono text-xs sm:text-sm ${
                      isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-4 border-t ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
                <button
                  type="button"
                  onClick={() => setShowTestModal(true)}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                      : 'border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Test Connection Live</span>
                </button>

                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  {saveSettingsMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className={`p-4 sm:p-6 rounded-3xl border ${isLightMode ? 'bg-purple-50/80 border-purple-200' : 'bg-purple-950/20 border-purple-800/30'}`}>
              <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 mb-3 ${isLightMode ? 'text-purple-900' : 'text-purple-300'}`}>
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                How to setup Gmail in 3 Easy Steps
              </h3>
              <ol className={`text-xs space-y-2.5 list-decimal pl-4 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                <li>Log into your Google Account and turn on <strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-white'}>2-Step Verification</strong>.</li>
                <li>Search for <strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-white'}>"App Passwords"</strong> in your Google Account search bar.</li>
                <li>Create a password named <code className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold ${isLightMode ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-purple-900/40 text-purple-200 border border-purple-700/50'}`}>Application Mailer</code> and paste the code into <strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-white'}>Auth Password</strong> above.</li>
              </ol>
            </div>

            <div className={`p-4 sm:p-6 rounded-3xl border shadow-sm ${isLightMode ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <h3 className={`text-xs sm:text-sm font-bold flex items-center gap-2 mb-3 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                Webmail / cPanel Setup
              </h3>
              <ul className={`text-xs font-mono space-y-2 p-3 sm:p-3.5 rounded-2xl border break-all ${
                isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/40 border-white/10 text-slate-200'
              }`}>
                <div><strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-white'}>Host:</strong> mail.yourdomain.com</div>
                <div><strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-white'}>Port:</strong> 465 (SSL checked) or 587</div>
                <div><strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-white'}>User:</strong> studio@yourdomain.com</div>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className={`text-base sm:text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Email Templates Library</h2>
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Manage transactional templates and newsletter layouts with placeholder variables
              </p>
            </div>

            <button
              onClick={() => {
                setEditingTemplate({
                  id: '',
                  name: '',
                  slug: '',
                  category: 'transactional',
                  subject: 'New Update from {{site_name}}',
                  body_html: '<h2>Hello {{user_name}},</h2><p>Welcome to our platform!</p>',
                  body_text: 'Hello {{user_name}}, Welcome to our platform!',
                  variables: ['site_name', 'user_name']
                });
                setIsTemplateModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {templates.map((tpl: any) => (
              <div
                key={tpl.id}
                className={`p-4 sm:p-5 rounded-3xl border flex flex-col justify-between transition-all hover:border-purple-500/50 ${
                  isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      isLightMode ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                    }`}>
                      {tpl.category || 'transactional'}
                    </span>
                    {Number(tpl.is_system) === 1 && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        System Default
                      </span>
                    )}
                  </div>

                  <h3 className={`text-base font-bold mb-1 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{tpl.name}</h3>
                  <p className={`text-xs font-mono mb-3 truncate ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Subject: {tpl.subject}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {Array.isArray(tpl.variables) &&
                      tpl.variables.map((v: string) => (
                        <span key={v} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isLightMode ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/10 text-slate-300 border-white/5'
                        }`}>
                          &#123;&#123;{v}&#125;&#125;
                        </span>
                      ))}
                  </div>
                </div>

                <div className={`flex items-center gap-2 pt-3 border-t ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
                  <button
                    onClick={() => setPreviewTemplate(tpl)}
                    className={`flex-1 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isLightMode ? 'border-slate-300 hover:bg-slate-100 text-slate-700' : 'border-white/10 hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setIsTemplateModalOpen(true);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      isLightMode ? 'border-slate-300 hover:bg-slate-100 text-slate-700' : 'border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                    title="Edit Template"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {Number(tpl.is_system) !== 1 && (
                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm({
                          title: "Delete Email Template",
                          message: `Are you sure you want to permanently delete template '${tpl.name}' (${tpl.slug})?`,
                          style: "danger",
                          confirmText: "Delete Template",
                          cancelText: "Cancel"
                        });
                        if (confirmed) {
                          deleteTemplateMutation.mutate(tpl.id);
                        }
                      }}
                      className="p-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM TRIGGER MAPPINGS */}
      {activeTab === 'triggers' && (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className={`text-base sm:text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Automated Event Triggers</h2>
            <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Map application events (user registration, show reminders, password resets) to specific email templates
            </p>
          </div>

          <div className="space-y-3">
            {triggers.map((trg: any) => (
              <div
                key={trg.id}
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                  isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${Number(trg.is_enabled) === 1 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{trg.event_name}</h3>
                    <p className={`text-xs font-mono ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Event Key: {trg.event_key}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className={`text-xs shrink-0 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>Template:</span>
                    <select
                      value={trg.template_slug}
                      onChange={(e) => {
                        updateTriggerMutation.mutate({
                          id: trg.id,
                          template_slug: e.target.value,
                          is_enabled: trg.is_enabled
                        });
                      }}
                      className={`w-full sm:w-auto px-3 py-1.5 rounded-xl border text-xs font-mono min-w-0 ${
                        isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    >
                      {templates.map((tpl: any) => (
                        <option key={tpl.id} value={tpl.slug} className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>
                          {tpl.name} ({tpl.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={Number(trg.is_enabled) === 1}
                      onChange={(e) => {
                        updateTriggerMutation.mutate({
                          id: trg.id,
                          template_slug: trg.template_slug,
                          is_enabled: e.target.checked
                        });
                      }}
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>{Number(trg.is_enabled) === 1 ? 'Active' : 'Disabled'}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BROADCAST CAMPAIGN */}
      {activeTab === 'broadcast' && (
        <div className={`p-4 sm:p-6 rounded-3xl border ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'}`}>
          <div className="mb-5 sm:mb-6">
            <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              <Send className="w-5 h-5 text-purple-500 shrink-0" />
              Broadcast Newsletter & Announcement
            </h2>
            <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Send announcements to all registered listeners or a custom subscriber list in rate-limited sequential batches
            </p>
          </div>

          <div className="space-y-4 sm:space-y-5 max-w-3xl">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Target Audience
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audience"
                    value="all_users"
                    checked={targetAudience === 'all_users'}
                    onChange={() => setTargetAudience('all_users')}
                    className="accent-purple-600 cursor-pointer"
                  />
                  <span className={`text-xs sm:text-sm font-bold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>All Registered Users</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audience"
                    value="custom_list"
                    checked={targetAudience === 'custom_list'}
                    onChange={() => setTargetAudience('custom_list')}
                    className="accent-purple-600 cursor-pointer"
                  />
                  <span className={`text-xs sm:text-sm font-bold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>Custom Email List</span>
                </label>
              </div>
            </div>

            {targetAudience === 'custom_list' && (
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Custom Recipient Email Addresses (One per line)
                </label>
                <textarea
                  rows={4}
                  value={customEmailsRaw}
                  onChange={(e) => setCustomEmailsRaw(e.target.value)}
                  placeholder="listener1@example.com&#10;listener2@example.com"
                  className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-mono text-xs ${
                    isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                  }`}
                />
              </div>
            )}

            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Choose Template Preset (Optional)
              </label>
              <select
                value={broadcastTemplateSlug}
                onChange={(e) => {
                  setBroadcastTemplateSlug(e.target.value);
                  const sel = templates.find((t: any) => t.slug === e.target.value);
                  if (sel) {
                    setBroadcastSubject(sel.subject);
                    setBroadcastHtml(sel.body_html);
                  }
                }}
                className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm ${
                  isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                }`}
              >
                <option value="" className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>-- Custom Blank Broadcast --</option>
                {templates.map((tpl: any) => (
                  <option key={tpl.id} value={tpl.slug} className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>
                    {tpl.name} ({tpl.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Email Subject
              </label>
              <input
                type="text"
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="🎉 Big Friday Night Show Lineup!"
                required
                className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm ${
                  isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-black/30 border-white/10 text-white placeholder:text-slate-500'
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                HTML Content
              </label>
              <textarea
                rows={8}
                value={broadcastHtml}
                onChange={(e) => setBroadcastHtml(e.target.value)}
                className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-mono text-xs ${
                  isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                }`}
              />
            </div>

            <button
              onClick={handleSendBroadcast}
              disabled={isBroadcasting}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {isBroadcasting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isBroadcasting ? 'Dispatching Broadcast...' : 'Launch Broadcast Campaign'}</span>
            </button>

            {broadcastProgress && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                ✅ Campaign Dispatched successfully to {broadcastProgress.sentCount} / {broadcastProgress.totalRecipients} recipients!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DISPATCH LOGS */}
      {activeTab === 'logs' && (() => {
        const pagination = logsData?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };
        const totalLogs = pagination.total || 0;
        const totalPages = pagination.totalPages || 1;
        const currentPage = pagination.page || 1;
        const currentLimit = pagination.limit || 20;

        const startItem = totalLogs === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
        const endItem = Math.min(currentPage * currentLimit, totalLogs);

        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Email Dispatch Vault</h2>
                <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Audit trail of outbound emails and diagnostic errors</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <select
                  value={logFilterStatus}
                  onChange={(e) => {
                    setLogFilterStatus(e.target.value);
                    setLogPage(1);
                  }}
                  className={`w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl border text-xs ${
                    isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="ALL" className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>All Statuses</option>
                  <option value="sent" className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>Sent Successfully</option>
                  <option value="failed" className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>Delivery Failed</option>
                </select>

                <button
                  onClick={async () => {
                    const confirmed = await showConfirm({
                      title: "Clear Dispatch Logs",
                      message: "Are you sure you want to permanently delete all outbound email dispatch and audit logs?",
                      style: "danger",
                      confirmText: "Clear Logs",
                      cancelText: "Cancel"
                    });
                    if (confirmed) {
                      clearLogsMutation.mutate();
                    }
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Logs</span>
                </button>
              </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'}`}>
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className={`border-b ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-black/30 border-white/10 text-slate-300'}`}>
                    <tr>
                      <th className="p-3 font-bold uppercase tracking-wider">Timestamp</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Recipient</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Template</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Subject</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Status</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono ${isLightMode ? 'divide-slate-200 text-slate-800' : 'divide-white/5 text-slate-200'}`}>
                    {logsData?.logs?.map((log: any) => (
                      <tr key={log.id} className={isLightMode ? 'hover:bg-slate-50' : 'hover:bg-white/5'}>
                        <td className={`p-3 whitespace-nowrap ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(log.sent_at).toLocaleString()}
                        </td>
                        <td className={`p-3 font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{log.recipient_email}</td>
                        <td className="p-3 text-purple-500">{log.template_slug}</td>
                        <td className={`p-3 truncate max-w-xs ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>{log.subject}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.status === 'sent'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className={`p-3 truncate max-w-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {log.error_message ? (
                            <span className="text-rose-500 font-bold" title={log.error_message}>
                              {log.error_message}
                            </span>
                          ) : (
                            'OK'
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!logsData?.logs || logsData.logs.length === 0) && (
                      <tr>
                        <td colSpan={6} className={`p-8 text-center ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          No email history logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className={`p-3.5 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/10'
              }`}>
                <div className={`flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span>
                    Showing <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>{startItem}</strong> to <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>{endItem}</strong> of <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>{totalLogs}</strong> logs
                  </span>
                  <span className="hidden sm:inline">|</span>
                  <div className="flex items-center gap-1.5">
                    <span>Per page:</span>
                    <select
                      value={logLimit}
                      onChange={(e) => {
                        setLogLimit(Number(e.target.value));
                        setLogPage(1);
                      }}
                      className={`px-2 py-1 rounded-lg border text-xs font-mono ${
                        isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                      }`}
                    >
                      <option value={10} className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>10</option>
                      <option value={20} className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>20</option>
                      <option value={50} className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>50</option>
                      <option value={100} className={isLightMode ? 'bg-white text-slate-900' : 'bg-[#0F111A] text-white'}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isFetchingLogs}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                      currentPage <= 1 || isFetchingLogs
                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-white/10'
                        : isLightMode
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-1 px-2 text-xs">
                    <span className="font-mono font-bold text-purple-500">
                      {currentPage}
                    </span>
                    <span className={isLightMode ? 'text-slate-400' : 'text-slate-500'}>/</span>
                    <span className={`font-mono ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      {totalPages}
                    </span>
                  </div>

                  <button
                    onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isFetchingLogs}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                      currentPage >= totalPages || isFetchingLogs
                        ? `opacity-40 cursor-not-allowed ${isLightMode ? 'border-slate-200 text-slate-400' : 'border-white/10 text-slate-500'}`
                        : isLightMode
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEST CONNECTION MODAL */}
      {createPortal(
        <AnimatePresence>
          {showTestModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border shadow-2xl ${
                  isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0F111A] border-white/10 text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    <ShieldCheck className="w-5 h-5 text-purple-500 shrink-0" />
                    SMTP Diagnostics Test
                  </h3>
                  <button onClick={() => setShowTestModal(false)} className={`p-1.5 rounded-lg ${isLightMode ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className={`text-xs mb-4 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Enter a recipient email address to send a live diagnostic email and test the SMTP handshake.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      Test Recipient Email
                    </label>
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="devvnoxx@gmail.com"
                      className={`w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-mono ${
                        isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    />
                  </div>

                  {testResult && (
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-xs ${
                        testResult.success
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-600'
                      }`}
                    >
                      <div className="font-bold mb-1">{testResult.success ? '✅ Handshake Succeeded!' : '❌ Connection Failed'}</div>
                      <div className="font-mono text-[11px] break-words">{testResult.message || testResult.error}</div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
                    <button
                      onClick={() => setShowTestModal(false)}
                      className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                        isLightMode ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/20 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      Close
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex items-center justify-center gap-2"
                    >
                      {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isTesting ? 'Testing Handshake...' : 'Send Test Mail'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* EDIT TEMPLATE MODAL */}
      {createPortal(
        <AnimatePresence>
          {isTemplateModalOpen && editingTemplate && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border shadow-2xl ${
                  isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0F111A] border-white/10 text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                    {editingTemplate.id ? 'Edit Template' : 'New Custom Template'}
                  </h3>
                  <button onClick={() => setIsTemplateModalOpen(false)} className={`p-1.5 rounded-lg ${isLightMode ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        placeholder="Welcome Email"
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${
                          isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        Template Slug (Unique Key)
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.slug}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, slug: e.target.value })}
                        placeholder="welcome_email"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                          isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      placeholder="Welcome to {{site_name}}, {{user_name}}!"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      HTML Body Content
                    </label>
                    <textarea
                      rows={8}
                      value={editingTemplate.body_html}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, body_html: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                        isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
                    <button
                      onClick={() => setIsTemplateModalOpen(false)}
                      className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                        isLightMode ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/20 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveTemplateMutation.mutate(editingTemplate)}
                      className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-600 text-white shadow-lg"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* PREVIEW TEMPLATE MODAL */}
      {createPortal(
        <AnimatePresence>
          {previewTemplate && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border shadow-2xl ${
                  isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0F111A] border-white/10 text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    <Eye className="w-5 h-5 text-purple-500 shrink-0" />
                    Template Preview: {previewTemplate.name}
                  </h3>
                  <button onClick={() => setPreviewTemplate(null)} className={`p-1.5 rounded-lg ${isLightMode ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className={`p-3 rounded-xl text-xs font-mono ${isLightMode ? 'bg-slate-100 text-slate-800' : 'bg-black/40 text-slate-200'}`}>
                    <div><strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-white'}>Subject:</strong> {previewTemplate.subject}</div>
                  </div>

                  <div className={`p-4 rounded-2xl border min-h-[200px] overflow-auto ${
                    isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-white/10 text-slate-100'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: previewTemplate.body_html }} />
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <input
                      type="email"
                      value={testTemplateEmail}
                      onChange={(e) => setTestTemplateEmail(e.target.value)}
                      placeholder="Enter email to send live preview"
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono ${
                        isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    />
                    <button
                      onClick={async () => {
                        if (!testTemplateEmail) return toast.error("Enter test email recipient");
                        setIsSendingTemplateTest(true);
                        try {
                          const res = await jsonFetch('/api/admin/email/send-test-template', {
                            method: 'POST',
                            body: JSON.stringify({ recipient_email: testTemplateEmail, template_id: previewTemplate.id })
                          });
                          if (res.success) {
                            toast.success("Live preview email sent successfully!");
                          } else {
                            toast.error(res.error || "Failed to send preview");
                          }
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to send preview");
                        } finally {
                          setIsSendingTemplateTest(false);
                        }
                      }}
                      disabled={isSendingTemplateTest}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-600 text-white shadow flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {isSendingTemplateTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send Preview</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
