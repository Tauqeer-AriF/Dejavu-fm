import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Sparkles,
  Radio,
  MessageSquare,
  Music,
  Calendar,
  Users,
  Settings,
  Video,
  FileText,
  Globe,
  Layers,
  BarChart3,
  Shield,
  Mail,
  Ticket,
  Image as ImageIcon,
  Search,
  X,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Headphones,
  Mic,
  Volume2,
  CheckCircle2,
  HelpCircle,
  Megaphone,
  User,
  Database,
  Facebook,
  RotateCcw,
  Sparkle,
  Sliders,
  Ghost
} from "lucide-react";
import { useLogo } from "../../hooks/useLogo";

export interface AdminGuideWidgetProps {
  userRole: string | null;
  adminBasePath: string;
}

type GuideTab = "features" | "studio-inbox" | "ai-studio" | "quick-start" | "pro-tips";
type CategoryFilter = "all" | "studio-live" | "ai-automation" | "community" | "programming" | "station-ops";

interface FeatureGuideItem {
  id: string;
  title: string;
  category: "studio-live" | "ai-automation" | "community" | "programming" | "station-ops";
  icon: React.ElementType;
  routePath?: string;
  roles: ("admin" | "dj")[];
  summary: string;
  capabilities: string[];
  proTip: string;
}

export function AdminGuideWidget({ userRole, adminBasePath }: AdminGuideWidgetProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLightMode } = useLogo();

  const isActuallyAdmin = userRole === "admin" || userRole === "owner";
  // Admins can toggle between viewing the Admin Guide and previewing the DJ Guide
  const [activeRoleView, setActiveRoleView] = useState<"admin" | "dj">(isActuallyAdmin ? "admin" : "dj");

  // Keep activeRoleView updated if userRole changes
  useEffect(() => {
    if (!isActuallyAdmin) {
      setActiveRoleView("dj");
    }
  }, [isActuallyAdmin]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GuideTab>("features");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);

  // Determine current active section from location path with strict role isolation
  const currentSectionInfo = useMemo(() => {
    const path = location.pathname.toLowerCase();

    // STRICT DJ ACCESS BARRIER: If user is a DJ, only resolve DJ-accessible sections
    if (!isActuallyAdmin) {
      if (path.includes("/studio") && !path.includes("/social-studio") && !path.includes("/ai-studio")) {
        return { id: "studio-inbox", name: "Studio Inbox & Messaging", tab: "studio-inbox" as GuideTab, requiredRole: "dj" as const };
      }
      if (path.includes("/song-requests")) {
        return { id: "song-requests", name: "DJ Booth (Requests)", tab: "features" as GuideTab, requiredRole: "dj" as const };
      }
      if (path.includes("/shoutouts")) {
        return { id: "shoutouts", name: "Listener Interactions", tab: "features" as GuideTab, requiredRole: "dj" as const };
      }
      if (path.includes("/profile")) {
        return { id: "profile", name: "Presenter Profile", tab: "features" as GuideTab, requiredRole: "dj" as const };
      }
      // Default for DJ is Live Tools Desk
      return { id: "live-tools", name: "Live Tools Desk", tab: "features" as GuideTab, requiredRole: "dj" as const };
    }

    // 1. Studio Inbox
    if (path.includes("/studio") && !path.includes("/social-studio") && !path.includes("/ai-studio")) {
      return { id: "studio-inbox", name: "Studio Inbox & Messaging", tab: "studio-inbox" as GuideTab, requiredRole: "dj" as const };
    }
    // 2. AI Content Studio
    if (path.includes("/social-studio") || path.includes("/ai-studio")) {
      return { id: "ai-studio", name: "AI Content Studio", tab: "ai-studio" as GuideTab, requiredRole: "admin" as const };
    }
    // 3. Live Tools
    if (path.includes("/live-tools")) {
      return { id: "live-tools", name: "Live Tools Desk", tab: "features" as GuideTab, requiredRole: "dj" as const };
    }
    // 4. Song Requests
    if (path.includes("/song-requests")) {
      return { id: "song-requests", name: "DJ Booth (Requests)", tab: "features" as GuideTab, requiredRole: "dj" as const };
    }
    // 5. Interactions / Shoutouts
    if (path.includes("/shoutouts")) {
      return { id: "shoutouts", name: "Listener Interactions", tab: "features" as GuideTab, requiredRole: "dj" as const };
    }
    // 6. Presenter Profile
    if (path.includes("/profile")) {
      return { id: "profile", name: "Presenter Profile", tab: "features" as GuideTab, requiredRole: "dj" as const };
    }
    // 7. Schedule & Timetable
    if (path.includes("/schedule")) {
      return { id: "schedule", name: "Broadcast Timetable", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 8. DJs & Presenter Roster
    if (path.includes("/djs")) {
      return { id: "djs", name: "DJ & Presenter Roster", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 9. Special Events
    if (path.includes("/events")) {
      return { id: "events", name: "Special Events & Box Office", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 10. Agency Bookings
    if (path.includes("/bookings")) {
      return { id: "bookings", name: "Agency Bookings", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 11. Station Visual Branding
    if (path.includes("/branding")) {
      return { id: "branding", name: "Station Branding", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 12. CMS Custom Pages
    if (path.includes("/pages")) {
      return { id: "pages", name: "CMS Custom Pages", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 13. Navigation Menus
    if (path.includes("/menu")) {
      return { id: "menu", name: "Navigation Menus", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 14. Station Feature Toggles
    if (path.includes("/features")) {
      return { id: "features-toggle", name: "Station Feature Toggles", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 15. Promotional Pop-ups
    if (path.includes("/popup")) {
      return { id: "popup", name: "Promotional Pop-ups", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 16. Sponsor Ads
    if (path.includes("/ads")) {
      return { id: "ads", name: "Sponsor Advertisements", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 17. Staff Users & Roles
    if (path.includes("/users")) {
      return { id: "users", name: "Staff Users & Roles", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 18. Chat Users & Moderation
    if (path.includes("/chat-users")) {
      return { id: "chat-users", name: "Chatroom Moderation", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 19. Data Operations & Maintenance
    if (path.includes("/chat-room-setting")) {
      return { id: "chat-room-setting", name: "Data Operations", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 20. Backups & Archives
    if (path.includes("/backup")) {
      return { id: "backup", name: "Backups & Archives", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 21. Audit & Security Logs
    if (path.includes("/audit-logs")) {
      return { id: "audit-logs", name: "Audit & Security Logs", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 22. Email Suite & Newsletters
    if (path.includes("/email")) {
      return { id: "email", name: "Email Suite", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 23. Media Asset Library
    if (path.includes("/media")) {
      return { id: "media", name: "Media Asset Library", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 24. SEO Optimisation
    if (path.includes("/seo")) {
      return { id: "seo", name: "SEO Optimisation", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 25. Meta Integrations
    if (path.includes("/meta-integrations")) {
      return { id: "meta-integrations", name: "Meta Integrations", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 26. Advanced Technical Controls
    if (path.includes("/advanced")) {
      return { id: "advanced", name: "Advanced Developer Settings", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }
    // 27. System & Stream Settings
    if (path.includes("/settings")) {
      return { id: "settings", name: "System Settings", tab: "features" as GuideTab, requiredRole: "admin" as const };
    }

    // Default: Analytics Dashboard
    return { id: "analytics", name: "Analytics Dashboard", tab: "features" as GuideTab, requiredRole: "admin" as const };
  }, [location.pathname, isActuallyAdmin]);

  // Keep expanded feature aligned with route when location changes
  useEffect(() => {
    if (isOpen) {
      setExpandedFeatureId(currentSectionInfo.id);
    }
  }, [location.pathname]);

  // Intelligent Context jump function: opens guide, resets filters, sets active tab, expands card and scrolls smoothly
  const jumpToCurrentSection = (targetId?: string, targetTab?: GuideTab) => {
    let idToJump = targetId || currentSectionInfo.id;
    let tabToJump = targetTab || currentSectionInfo.tab;

    // Hard security enforcement for DJ role
    if (!isActuallyAdmin) {
      const isDjAllowed = ["studio-inbox", "live-tools", "song-requests", "shoutouts", "profile"].includes(idToJump);
      if (!isDjAllowed) {
        idToJump = "live-tools";
      }
      if (tabToJump === "ai-studio") {
        tabToJump = "features";
      }
      setActiveRoleView("dj");
    } else {
      // Switch to admin view if the feature is admin-only and user has admin privileges
      if (currentSectionInfo.requiredRole === "admin" && activeRoleView !== "admin") {
        setActiveRoleView("admin");
      }
    }

    setIsOpen(true);
    setSearchQuery("");
    setCategoryFilter("all");
    setActiveTab(tabToJump);
    setExpandedFeatureId(idToJump);

    // Scroll smoothly to target card after render
    setTimeout(() => {
      const el = document.getElementById(`feature-card-${idToJump}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  // Master catalog of accessible features (Strictly NO Owner Control anywhere)
  const allFeatures: FeatureGuideItem[] = useMemo(() => [
    // 1. Studio Inbox
    {
      id: "studio-inbox",
      title: "Studio Inbox & Multi-Channel Messaging",
      category: "studio-live",
      icon: MessageSquare,
      routePath: `${adminBasePath}/studio`,
      roles: ["admin", "dj"],
      summary: "Unified live broadcast communications desk synchronising listener chatrooms, WhatsApp feeds, Telegram queries, and TikTok Live comments into a consolidated presenter console.",
      capabilities: [
        "Real-time listener interaction threads with unread indicators and platform source badges (Web, WhatsApp, TikTok, Telegram).",
        "Rich media messaging allowing presenters to review listener audio clips, voicemails, track cover artwork, and photo attachments.",
        "Quick-reply templates for rapid on-air acknowledgements without breaking your broadcasting stride.",
        "Filterable conversation feeds by platform, archived state, or pending listener enquiries.",
        "Station broadcast dispatcher (Admin only) for issuing immediate push notifications and ticker headlines."
      ],
      proTip: "Keep the Studio Inbox docked on an auxiliary tablet or second monitor whilst on air to address song shoutouts and listener queries seamlessly between mixes."
    },

    // 2. AI Content Studio
    {
      id: "ai-studio",
      title: "AI Content Studio & Automated Social Reels",
      category: "ai-automation",
      icon: Sparkles,
      routePath: `${adminBasePath}/social-studio`,
      roles: ["admin"],
      summary: "Autonomous media production engine that analyses recorded shows, detects engaging speech moments, generates vertical video reels, and produces promotional copy tailored for social platforms.",
      capabilities: [
        "Automated clip generation with intelligent virality scoring and hook strength assessment.",
        "Speech transcription and automatic subtitle generation rendered directly onto 9:16 vertical video templates.",
        "Prompt engineering presets allowing customisation of caption styles, brand hashtags, and tone of voice.",
        "One-click export and workflow staging to review, approve, or reject generated content before public dispatch.",
        "Multi-stage background job queues with real-time progress telemetry and model execution status."
      ],
      proTip: "Run full-length weekend guest mixes through the AI Clipper on Monday morning to automatically generate a week's worth of short-form promotional reels for TikTok and Instagram."
    },

    // 3. Live Broadcast Tools
    {
      id: "live-tools",
      title: "Live Tools & Stream Control",
      category: "studio-live",
      icon: Radio,
      routePath: `${adminBasePath}/live-tools`,
      roles: ["admin", "dj"],
      summary: "Essential telemetry desk for live presenters to monitor stream health, toggle studio video feeds, and review on-air broadcast metrics.",
      capabilities: [
        "Real-time audio stream bitrate readout and transmission status.",
        "Studio camera feed control and visual broadcast preview.",
        "Rapid emergency announcement banner toggles to notify listeners immediately.",
        "Direct broadcast links for quick sharing across social platforms during live shows."
      ],
      proTip: "Always check the audio bitrate telemetry 5 minutes before your scheduled show begins to verify clean transmission before opening the studio microphones."
    },

    // 4. DJ Booth & Song Requests
    {
      id: "song-requests",
      title: "DJ Booth & Song Requests Queue",
      category: "studio-live",
      icon: Music,
      routePath: `${adminBasePath}/song-requests`,
      roles: ["admin", "dj"],
      summary: "Dedicated incoming music request desk where presenters can review track suggestions submitted by live listeners in real time.",
      capabilities: [
        "Live feed of listener track requests with artist name, song title, and personal dedications.",
        "One-click status updates: mark tracks as 'Played' (sending instant feedback to the listener) or 'Declined'.",
        "Instant search across historical requests to identify trending songs and crowd favourites.",
        "Show-specific filtering so DJs only view requests submitted during their scheduled broadcast slot."
      ],
      proTip: "Marking requested tracks as 'Played' creates an interactive loop that encourages listeners to tune in longer to hear their dedication acknowledged on air."
    },

    // 5. Listener Interactions & Shoutouts
    {
      id: "shoutouts",
      title: "Listener Interactions & Shoutouts",
      category: "community",
      icon: Headphones,
      routePath: `${adminBasePath}/shoutouts`,
      roles: ["admin", "dj"],
      summary: "Central repository for listener shoutouts, voice notes, and dedications awaiting on-air delivery or ticker publication.",
      capabilities: [
        "Review listener voice notes and written dedications submitted via the public website.",
        "Pin standout shoutouts directly to your presenter scratchpad for easy reference during mic breaks.",
        "Approve appropriate messages to scroll across the live website ticker banner.",
        "Archive past shoutouts to maintain an organised queue for subsequent broadcast shows."
      ],
      proTip: "Group shoutouts by location or theme during your set to create conversational segments that connect listeners across different regions."
    },

    // 6. Presenter Profile
    {
      id: "profile",
      title: "My Presenter Profile & Credentials",
      category: "community",
      icon: User,
      routePath: `${adminBasePath}/profile`,
      roles: ["admin", "dj"],
      summary: "Personal identity hub for station staff and resident DJs to maintain their public artist profile, biographies, and account security.",
      capabilities: [
        "Customise your on-air artist alias, biography, and resident presenter photography.",
        "Connect social profiles (SoundCloud, Mixcloud, Instagram, X/Twitter) displayed on the station website.",
        "Update account login credentials, contact email, and password securely.",
        "View personal show scheduling notes and assigned broadcast commitments."
      ],
      proTip: "Keep your Mixcloud and SoundCloud profile links updated so listeners visiting your presenter page can listen back to your previous archived programmes."
    },

    // 7. Executive Analytics & Telemetry
    {
      id: "analytics",
      title: "Audience Analytics & Telemetry",
      category: "programming",
      icon: BarChart3,
      routePath: `${adminBasePath}`,
      roles: ["admin"],
      summary: "Comprehensive broadcast intelligence dashboard charting live listener volumes, bandwidth consumption, geographical distribution, and historical retention curves.",
      capabilities: [
        "Real-time listener count and concurrent connection bandwidth telemetry.",
        "Geographical listener heatmap showing audience presence across the UK and international markets.",
        "Peak listening hours analysis to help programme directors schedule flagship shows at optimum times.",
        "Device breakdown metrics categorising traffic from iOS, Android, and Desktop browsers.",
        "Audio stream versus studio video engagement comparison reports."
      ],
      proTip: "Review weekly audience peak trends every Monday to schedule high-profile guest DJs during periods of naturally concentrated listener activity."
    },

    // 8. Broadcast Timetable & Schedule
    {
      id: "schedule",
      title: "Broadcast Schedule & Timetable",
      category: "programming",
      icon: Calendar,
      routePath: `${adminBasePath}/schedule`,
      roles: ["admin"],
      summary: "Interactive programme management calendar for organising weekly station broadcasts, assigning resident DJs, and publishing public show schedules.",
      capabilities: [
        "Intuitive weekly drag-and-drop timetable covering 24/7 station broadcast hours.",
        "Automated collision detection to prevent overlapping shows or conflicting presenter bookings.",
        "Designate live presenter shows versus syndicated recordings and automated playout rotations.",
        "Real-time synchronisation with the public station homepage and mobile programme guide.",
        "Custom show banners, genre tags, and recurring weekly time-slot rules."
      ],
      proTip: "Set recurring weekly slots for resident DJs to streamline schedule administration, then use one-off overrides for bank holiday specials and guest appearances."
    },

    // 9. DJ & Presenter Roster
    {
      id: "djs",
      title: "DJ & Presenter Roster Administration",
      category: "programming",
      icon: Users,
      routePath: `${adminBasePath}/djs`,
      roles: ["admin"],
      summary: "Comprehensive station directory for managing presenter rosters, resident artist bios, photo assets, and public profile visibility.",
      capabilities: [
        "Onboard new presenters and automatically link their profile to the broadcast timetable.",
        "Upload high-resolution artist photography, press kits, and promotional headshots.",
        "Associate podcast series and syndicated archives directly with resident profiles.",
        "Manage roster visibility to feature spotlight presenters on the website homepage."
      ],
      proTip: "Ensure every resident DJ has a high-contrast square press photo uploaded so their show card displays attractively on mobile devices."
    },

    // 10. Special Events & Box Office
    {
      id: "events",
      title: "Special Events & Ticket Box Office",
      category: "programming",
      icon: Ticket,
      routePath: `${adminBasePath}/events`,
      roles: ["admin"],
      summary: "Promotional events manager for publishing station club nights, festival takeovers, live studio audience sessions, and ticket sales.",
      capabilities: [
        "Publish upcoming station events with event dates, venue coordinates, and line-up details.",
        "Integrate external ticketing platforms (Skiddle, Resident Advisor, Eventbrite) with direct purchase buttons.",
        "Automated countdown timers displayed on the public event detail page.",
        "Upload event flyers and promotional posters optimised for web sharing."
      ],
      proTip: "Pin major upcoming station club nights to the top of the events listing at least 4 weeks in advance to drive maximum advance ticket presales."
    },

    // 11. DJ Agency & Talent Bookings
    {
      id: "bookings",
      title: "DJ Agency & Talent Bookings",
      category: "station-ops",
      icon: Calendar,
      routePath: `${adminBasePath}/bookings`,
      roles: ["admin"],
      summary: "Commercial agency management suite for managing external DJ booking enquiries, corporate gigs, wedding quotes, and talent representation.",
      capabilities: [
        "Track incoming booking enquiries submitted by event promoters and private clients.",
        "Record agreed performance fees, venue specifics, sound equipment requirements, and deposit statuses.",
        "Assign specific resident DJs to confirmed client dates.",
        "Export booking schedules and track completed gigs throughout the financial year."
      ],
      proTip: "Use the deposit tracking status to ensure all booking retainers are received into station accounts before locking resident DJs into client dates."
    },

    // 12. Station Branding & Visual Identity
    {
      id: "branding",
      title: "Station Branding & Visual Identity",
      category: "station-ops",
      icon: ImageIcon,
      routePath: `${adminBasePath}/branding`,
      roles: ["admin"],
      summary: "Creative identity control panel for updating station logos, brand marks, app icons, splash screens, and aesthetic theme styling.",
      capabilities: [
        "Upload primary station logos, header marks, and responsive mobile icons.",
        "Configure separate light-mode and dark-mode brand assets for optimal contrast.",
        "Customise station accent colours, neon highlights, and typography styles.",
        "Manage PWA splash screen assets and web application manifest icons."
      ],
      proTip: "Upload transparent SVG or high-resolution PNG logos with generous negative space to guarantee crisp rendering across 4K displays and mobile retina screens."
    },

    // 13. Content Management & CMS Pages
    {
      id: "pages",
      title: "Content Management & Custom Pages",
      category: "station-ops",
      icon: Layers,
      routePath: `${adminBasePath}/pages`,
      roles: ["admin"],
      summary: "Full-featured content management suite for creating bespoke editorial articles, static informational pages, and regulatory compliance documents.",
      capabilities: [
        "WYSIWYG rich text editor for writing station stories, history, and community guides.",
        "Manage mandatory legal pages such as Privacy Policy, Terms of Service, and Broadcast Licence details.",
        "Configure custom URL paths and dedicated SEO metadata for each page.",
        "Publish instant revisions without requiring any code alterations or redeployments."
      ],
      proTip: "Regularly audit your Privacy Policy and Contact pages to ensure station contact emails and regulatory disclosures remain completely accurate."
    },

    // 14. Navigation & Custom Menus
    {
      id: "menu",
      title: "Navigation & Custom Menus",
      category: "station-ops",
      icon: FileText,
      routePath: `${adminBasePath}/menu`,
      roles: ["admin"],
      summary: "Layout manager for arranging the station header navigation bar, mobile menu drawer, and footer directory links.",
      capabilities: [
        "Add, reorder, or remove navigation links across the desktop header and mobile drawer.",
        "Create links to internal pages (e.g. Schedule, DJs, Events) or external partner destinations.",
        "Configure station footer columns and social media link icon placements.",
        "Toggle menu item visibility instantly during special broadcast campaigns."
      ],
      proTip: "Keep the primary header navigation limited to no more than 6 core items to preserve clean visual hierarchy and prevent menu wrapping on tablet screens."
    },

    // 15. Promotional Pop-ups & Announcements
    {
      id: "popup",
      title: "Promotional Pop-ups & Banners",
      category: "community",
      icon: Megaphone,
      routePath: `${adminBasePath}/popup`,
      roles: ["admin"],
      summary: "High-impact modal announcement engine for promoting flagship shows, ticket sales, mobile app downloads, and emergency notices to site visitors.",
      capabilities: [
        "Customise modal headline copy, descriptive text, and call-to-action button links.",
        "Upload eye-catching promotional artwork and promotional event flyers.",
        "Set display frequency rules (e.g. show once per visitor session) to avoid visitor fatigue.",
        "Instant toggle switch to activate or deactivate campaigns on demand."
      ],
      proTip: "Pair a concise headline with an enticing call-to-action button (such as 'Get Tickets' or 'Listen Live') to achieve the highest conversion rate on pop-up promotions."
    },

    // 16. Sponsor Advertising & Campaigns
    {
      id: "ads",
      title: "Sponsor Advertising & Banner Campaigns",
      category: "station-ops",
      icon: ImageIcon,
      routePath: `${adminBasePath}/ads`,
      roles: ["admin"],
      summary: "Commercial revenue desk for scheduling sponsor display advertisements, banner placements, affiliate links, and campaign performance monitoring.",
      capabilities: [
        "Upload sponsor banners for header, sidebar, in-content, and player bar ad zones.",
        "Schedule campaign start and end dates with automated activation and expiry.",
        "Track click-throughs and impression counts for client advertising performance reports.",
        "Set client target URLs with secure outbound referral tracking."
      ],
      proTip: "Ensure sponsor banners adhere to standardised aspect ratios (728x90 leaderboards, 300x250 medium rectangles) for seamless integration into the layout."
    },

    // 17. Staff Accounts & Access Management
    {
      id: "users",
      title: "Staff Accounts & Role Permissions",
      category: "station-ops",
      icon: Users,
      routePath: `${adminBasePath}/users`,
      roles: ["admin"],
      summary: "Security and personnel administration for provisioning presenter logins, assigning administrator privileges, and managing staff access.",
      capabilities: [
        "Create dedicated user accounts for resident DJs, station managers, and content moderators.",
        "Enforce strict role-based access: Administrators receive full station oversight whilst DJs access their dedicated broadcast tools.",
        "Reset staff passwords and invalidate inactive sessions securely.",
        "Review account creation dates and last login activity stamps."
      ],
      proTip: "Always assign new resident presenters the 'DJ' role so they receive an uncluttered, focused workspace tailored specifically to live broadcasting."
    },

    // 18. Chatroom Community & Moderation
    {
      id: "chat-users",
      title: "Chatroom Community & Moderation",
      category: "community",
      icon: MessageSquare,
      routePath: `${adminBasePath}/chat-users`,
      roles: ["admin"],
      summary: "Live listener community desk for managing chatroom participants, awarding badges, and upholding station conduct standards.",
      capabilities: [
        "Inspect registered chatroom members, active listener pseudonyms, and join dates.",
        "Assign honorary VIP badges to loyal listeners and station supporters.",
        "Apply temporary user mutes or permanent account bans for disruptive behaviour.",
        "Review moderation histories and audit flags raised by automated filters."
      ],
      proTip: "Reward frequent, positive listeners with VIP badges to cultivate community pride and encourage helpful peer moderation in the chatroom."
    },

    // 19. Data Operations & Chat Settings
    {
      id: "chat-room-setting",
      title: "Data Operations & Chat Settings",
      category: "station-ops",
      icon: RotateCcw,
      routePath: `${adminBasePath}/chat-room-setting`,
      roles: ["admin"],
      summary: "Operational settings for automated profanity filtering, slow-mode flood prevention, guest message policies, and database retention rules.",
      capabilities: [
        "Configure custom word filters and automated profanity blocks.",
        "Enable slow-mode throttling (e.g. 5-second delay between messages) during heavily trafficked live events.",
        "Toggle whether unregistered guest listeners are permitted to post messages.",
        "Execute automated or manual message history purges to maintain optimal database speed."
      ],
      proTip: "Enable a 3-second slow-mode during peak festival broadcasts to keep the chat stream readable for both listeners and on-air presenters."
    },

    // 20. Email Suite & Subscriber Communications
    {
      id: "email",
      title: "Email Suite & Newsletters",
      category: "community",
      icon: Mail,
      routePath: `${adminBasePath}/email`,
      roles: ["admin"],
      summary: "Direct marketing desk for managing station newsletter subscribers, composing announcements, and dispatching mass email campaigns.",
      capabilities: [
        "Organise subscriber email lists collected via website sign-up forms.",
        "Compose rich HTML email campaigns for event announcements, new show launches, and station news.",
        "Configure SMTP transport servers and transactional delivery credentials.",
        "Review subscriber engagement, open metrics, and bounce logs."
      ],
      proTip: "Send out a concise 'Weekend Programming Preview' email every Thursday evening highlighting headline guest mixes and club events."
    },

    // 21. Media Asset Library
    {
      id: "media",
      title: "Media Asset Library",
      category: "station-ops",
      icon: Video,
      routePath: `${adminBasePath}/media`,
      roles: ["admin"],
      summary: "Centralised digital repository for station audio jingles, station IDs, artist press shots, show posters, and promotional video clips.",
      capabilities: [
        "Upload and catalogue digital assets with instant CDN links ready for embedding.",
        "Filter media by type: images, audio clips, videos, and PDF documents.",
        "Review total storage utilisation and clean up obsolete media files safely.",
        "One-click copy URL feature to easily reuse assets across CMS pages, ads, and schedule entries."
      ],
      proTip: "Compress promotional images before upload using modern WebP formats to maintain lightning-fast page loading speeds for mobile listeners."
    },

    // 22. System Backups & Data Archives
    {
      id: "backup",
      title: "System Backups & Data Archives",
      category: "station-ops",
      icon: Database,
      routePath: `${adminBasePath}/backup`,
      roles: ["admin"],
      summary: "Comprehensive station data protection suite for generating snapshot archives, database dumps, and schedule backups.",
      capabilities: [
        "Generate one-click SQLite database snapshots encapsulating schedule data, users, and CMS articles.",
        "Download portable JSON data archives for off-site disaster recovery storage.",
        "Schedule automated recurring backup tasks with retention rotation policies.",
        "Restore historical database snapshots safely in the event of accidental data modification."
      ],
      proTip: "Download a fresh manual backup archive prior to making sweeping timetable adjustments or performing major station reorganisations."
    },

    // 23. Security & Operational Audit Logs
    {
      id: "audit-logs",
      title: "Security & Operational Audit Logs",
      category: "station-ops",
      icon: Shield,
      routePath: `${adminBasePath}/audit-logs`,
      roles: ["admin"],
      summary: "Tamper-evident audit trail recording all staff logins, schedule changes, user permission updates, and administrative modifications.",
      capabilities: [
        "Chronological activity stream logging every administrative action with precise timestamps.",
        "Audit staff login events, failed authentication attempts, and IP addresses.",
        "Inspect before-and-after values for altered schedule entries, user roles, and feature flags.",
        "Filter logs by staff member or action category for rapid security investigations."
      ],
      proTip: "Check the audit log periodically to verify that schedule modifications and presenter credential changes were made by authorised personnel."
    },

    // 24. Search Engine Optimisation (SEO)
    {
      id: "seo",
      title: "Search Engine Optimisation (SEO)",
      category: "station-ops",
      icon: Globe,
      routePath: `${adminBasePath}/seo`,
      roles: ["admin"],
      summary: "Global discoverability control for configuring search metadata, Open Graph social share cards, and structured schema data.",
      capabilities: [
        "Set global meta titles and keyword descriptions optimised for search indexing.",
        "Configure custom social share cards for Facebook, X (Twitter), and WhatsApp link previews.",
        "Manage search crawler indexing instructions, sitemap generation, and robots directives.",
        "Implement structured schema markup (JSON-LD) for radio stations and live broadcast entities."
      ],
      proTip: "Craft a compelling 155-character meta description incorporating station genres and broadcast location to boost click-through rates from search results."
    },

    // 25. Meta & Social Integrations
    {
      id: "meta-integrations",
      title: "Meta & Social Integrations",
      category: "ai-automation",
      icon: Facebook,
      routePath: `${adminBasePath}/meta-integrations`,
      roles: ["admin"],
      summary: "Bridge for synchronising station broadcasts with Facebook Pages, Instagram feeds, and automated social marketing channels.",
      capabilities: [
        "Connect Facebook Graph API credentials and authorised station pages.",
        "Synchronise live broadcast status alerts directly to social newsfeeds.",
        "Automate show reminder posts when flagship programmes go on air.",
        "Review token expiry dates and refresh API connections seamlessly."
      ],
      proTip: "Keep your Meta access tokens refreshed every 60 days to prevent automated social broadcast alerts from failing during live shows."
    },

    // 26. System & Stream Configuration
    {
      id: "settings",
      title: "System & Stream Configuration",
      category: "station-ops",
      icon: Settings,
      routePath: `${adminBasePath}/settings`,
      roles: ["admin"],
      summary: "Core station infrastructure settings controlling audio stream endpoints, station metadata, contact details, and technical parameters.",
      capabilities: [
        "Manage primary radio stream URLs (High, Medium, and Low bitrate mount points for adaptive streaming).",
        "Set official station name, broadcast slogan, station timezone, and operational contact emails.",
        "Define default web audio playback volumes and fallback audio loop URLs.",
        "Inspect server runtime health, WebSocket connections, and real-time database state."
      ],
      proTip: "Always configure a secondary fallback stream URL so listeners automatically failover to a backup audio source if primary server maintenance occurs."
    },

    // 27. Station Feature Toggles & Capabilities
    {
      id: "features-toggle",
      title: "Station Feature Toggles & Capabilities",
      category: "station-ops",
      icon: Sliders,
      routePath: `${adminBasePath}/features`,
      roles: ["admin"],
      summary: "Centralised switchboard to activate or deactivate station modules including live audio streaming, studio camera feeds, song requests, listener chat, bookings, and automated AI tools.",
      capabilities: [
        "One-click master switches for station modules with immediate global propagation.",
        "Enable or disable public song requests, voice notes, and shoutout dedications.",
        "Control chatroom availability, guest nick permissions, and image upload toggles.",
        "Toggle public agency booking forms and live studio camera feeds."
      ],
      proTip: "Deactivating optional modules during low-moderation overnight hours keeps station maintenance streamlined and listener traffic focused on audio streaming."
    },

    // 28. Advanced Technical Parameters & Developer Controls
    {
      id: "advanced",
      title: "Advanced Technical Parameters & Developer Controls",
      category: "station-ops",
      icon: Ghost,
      routePath: `${adminBasePath}/advanced`,
      roles: ["admin"],
      summary: "Technical configuration panel for custom admin routing, WebSocket heartbeats, caching headers, audio buffer latencies, and diagnostic telemetry.",
      capabilities: [
        "Configure custom vanity routing paths for admin and presenter login portals.",
        "Fine-tune WebSocket reconnect intervals and real-time chat latency ceilings.",
        "Inspect database execution performance, active socket connections, and cache metrics.",
        "Purge system caches and trigger runtime diagnostic health sweeps."
      ],
      proTip: "Set a custom administration URL path to enhance security by obscuring default management routes from automated web scanners."
    }
  ], [adminBasePath]);

  // Filter features according to active role view with strict DJ restriction
  const visibleFeatures = useMemo(() => {
    return allFeatures.filter(item => {
      // STRICT SECURITY BARRIER: Non-admins can NEVER view admin-only features
      if (!isActuallyAdmin && !item.roles.includes("dj")) return false;

      // Role match
      if (!item.roles.includes(activeRoleView)) return false;

      // Category filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSummary = item.summary.toLowerCase().includes(query);
        const matchesCaps = item.capabilities.some(c => c.toLowerCase().includes(query));
        const matchesTip = item.proTip.toLowerCase().includes(query);
        return matchesTitle || matchesSummary || matchesCaps || matchesTip;
      }

      return true;
    });
  }, [allFeatures, activeRoleView, categoryFilter, searchQuery, isActuallyAdmin]);

  // Quick Start Checklist Items based on role
  const quickStartSteps = useMemo(() => {
    if (!isActuallyAdmin || activeRoleView === "dj") {
      return [
        {
          step: 1,
          title: "Complete Your Presenter Identity",
          desc: "Navigate to 'My Profile' to upload your high-resolution artist photo, craft your bio, and add your Mixcloud and Instagram links.",
          actionRoute: `${adminBasePath}/profile`
        },
        {
          step: 2,
          title: "Check Your Show Timetable",
          desc: "Review your scheduled broadcast hours and programme notes to ensure no clashes with upcoming guest shows.",
          actionRoute: `${adminBasePath}/live-tools`
        },
        {
          step: 3,
          title: "Verify Live Stream & Audio Bitrate",
          desc: "Open 'Live Tools' five minutes prior to your broadcast to confirm stable stream telemetry and verify webcam readiness.",
          actionRoute: `${adminBasePath}/live-tools`
        },
        {
          step: 4,
          title: "Dock Your Studio Inbox",
          desc: "Launch the 'Studio Inbox' console to monitor real-time listener chats, WhatsApp messages, and voice note attachments whilst on air.",
          actionRoute: `${adminBasePath}/studio`
        },
        {
          step: 5,
          title: "Work the DJ Booth & Shoutouts Queue",
          desc: "Check 'Song Requests' and 'Shoutouts' periodically during your set. Mark played requests so listeners receive live recognition.",
          actionRoute: `${adminBasePath}/song-requests`
        }
      ];
    } else {
      return [
        {
          step: 1,
          title: "Establish Station Visual Identity",
          desc: "Head to 'Branding' to upload your light and dark station logos, app icons, and configure primary accent colour palettes.",
          actionRoute: `${adminBasePath}/branding`
        },
        {
          step: 2,
          title: "Configure Live Stream Mount Points",
          desc: "In 'Settings', enter your Icecast or Shoutcast primary and fallback stream URLs across multiple audio qualities.",
          actionRoute: `${adminBasePath}/settings`
        },
        {
          step: 3,
          title: "Build the Weekly Programme Timetable",
          desc: "Access the 'Schedule' manager to populate your 24/7 broadcast timetable with resident presenters and automation blocks.",
          actionRoute: `${adminBasePath}/schedule`
        },
        {
          step: 4,
          title: "Provision Presenter & Staff Accounts",
          desc: "Open 'Staff Users' to create dedicated logins for your resident DJs, assigning them the streamlined DJ role.",
          actionRoute: `${adminBasePath}/users`
        },
        {
          step: 5,
          title: "Harness the AI Content Studio",
          desc: "Visit the 'AI Content Studio' to automatically detect viral broadcast moments, transcribe audio, and generate vertical social reels.",
          actionRoute: `${adminBasePath}/social-studio`
        },
        {
          step: 6,
          title: "Set Community Moderation & Create Backups",
          desc: "Configure chatroom profanity rules in 'Data Operations', then generate your first system snapshot in 'Backup'.",
          actionRoute: `${adminBasePath}/backup`
        }
      ];
    }
  }, [activeRoleView, isActuallyAdmin, adminBasePath]);

  // Professional Broadcasting Tips (UK English)
  const proTipsList = useMemo(() => {
    if (!isActuallyAdmin || activeRoleView === "dj") {
      return [
        {
          title: "Microphone Technique & Voice Projection",
          tip: "Maintain a steady distance of roughly 10 to 15 centimetres from the studio microphone at a slight 45-degree angle. This prevents harsh plosives ('P' and 'B' sounds) whilst keeping your vocal presence warm and authoritative."
        },
        {
          title: "Pacing Vocal Links Between Tracks",
          tip: "Keep spoken links punchy and engaging. State the station identity ('You're locked into the sound of Dejavu FM'), acknowledge your listener shoutouts, announce the incoming record, and return smoothly into the music within 30 to 45 seconds."
        },
        {
          title: "Leveraging the Studio Inbox On Air",
          tip: "Never let listener messages go unnoticed. Mentioning listener names and towns ('Big shout to Marcus tuning in from Hackney via the studio chat!') transforms passive listeners into dedicated advocates for your show."
        },
        {
          title: "Audio Headroom & Gain Structure",
          tip: "Avoid pushing your mixer channels into the red. Broadcast audio processors will squash oversaturated signals into harsh distortion. Keep your master output peaking comfortably between -3dB and 0dB."
        }
      ];
    } else {
      return [
        {
          title: "Maximising Social Reach with AI Studio",
          tip: "Extract short 30-second video clips featuring presenter banter or explosive track drops. Vertical reels with animated subtitles consistently achieve significantly higher algorithmic reach on Instagram Reels and TikTok."
        },
        {
          title: "Audience Retention & Show Transitions",
          tip: "Analyse drop-off trends in your Analytics dashboard. Ensure seamless transitions between successive DJs with co-hosted 2-minute handover segments rather than abrupt silence or jarring automated filler."
        },
        {
          title: "Data Safeguarding & Backup Cadence",
          tip: "Schedule regular snapshot exports every Monday morning. Storing local offline copies of your timetable, presenter database, and CMS records guarantees complete operational resilience against accidental loss."
        },
        {
          title: "Chatroom Moderation Etiquette",
          tip: "Apply brief 5-minute mutes rather than immediate permanent bans for minor listener infractions. De-escalating heated discussions whilst remaining firm creates a welcoming community environment for new listeners."
        }
      ];
    }
  }, [activeRoleView, isActuallyAdmin]);

  const handleNavigate = (path?: string) => {
    if (path) {
      navigate(path);
      // On mobile screens, close the widget so the user sees the page
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsOpen(false);
      }
    }
  };

  // Completely hide the station guide widget in Studio Inbox and AI Content Studio
  const isHiddenRoute = useMemo(() => {
    const path = location.pathname.toLowerCase();
    return (
      path.includes("/studio") ||
      path.includes("/social-studio") ||
      path.includes("/ai-studio") ||
      path.includes("/inbox") ||
      path.includes("studio-inbox") ||
      path.includes("ai-content")
    );
  }, [location.pathname]);

  if (isHiddenRoute) {
    return null;
  }

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-[60] pointer-events-auto select-none print:hidden">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (!isOpen) {
              jumpToCurrentSection();
            } else {
              setIsOpen(false);
            }
          }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border transition-all cursor-pointer ${
            isOpen
              ? "bg-neon-purple text-white border-neon-purple/80 shadow-[0_0_25px_rgba(168,85,247,0.45)]"
              : isLightMode
                ? "bg-white/95 hover:bg-white text-slate-800 border-slate-300/80 shadow-lg hover:shadow-xl hover:border-neon-purple/50"
                : "bg-[#0E101E]/95 hover:bg-[#14182b] text-white border-white/20 shadow-2xl hover:border-neon-purple/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]"
          }`}
          title="Open Station Operations Guide"
          aria-label="Open Station Operations Guide"
        >
          <div className="relative flex items-center justify-center">
            <BookOpen className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-12" : "text-neon-purple"}`} />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-purple" />
            </span>
          </div>

          <div className="flex flex-col text-left leading-none">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-xs uppercase tracking-wider">Station Guide</span>
              <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md ${
                activeRoleView === "dj"
                  ? "bg-neon-blue/20 text-[var(--color-neon-blue)] border border-neon-blue/30"
                  : "bg-neon-purple/20 text-[var(--color-neon-purple)] border border-neon-purple/30"
              }`}>
                {activeRoleView === "dj" ? "DJ" : "Admin"}
              </span>
            </div>
            <span className="text-[9px] opacity-70 font-mono tracking-tight mt-0.5 truncate max-w-[120px]">
              {currentSectionInfo.name}
            </span>
          </div>
        </motion.button>
      </div>

      {/* Slide-in / Popover Guide Drawer Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={`fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[580px] md:w-[680px] max-h-[85vh] h-[780px] z-[60] flex flex-col rounded-3xl shadow-2xl border backdrop-blur-2xl overflow-hidden ${
              isLightMode
                ? "bg-white/95 text-slate-900 border-slate-200/90 shadow-2xl"
                : "bg-[#090b14]/95 text-white border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            }`}
          >
            {/* Guide Header */}
            <div className={`p-4 sm:p-5 border-b flex flex-col gap-3 ${
              isLightMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-black/40"
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white shadow-md shadow-neon-purple/20 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-display font-black uppercase tracking-tight truncate flex items-center gap-2">
                      <span>Station Operations Guide</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase bg-neon-purple/15 text-neon-purple border border-neon-purple/30">
                        UK Edition
                      </span>
                    </h2>
                    <p className={`text-[11px] font-mono uppercase tracking-wider ${isLightMode ? "text-slate-500" : "text-white/40"}`}>
                      Handbook for broadcast creators & station managers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      isLightMode
                        ? "border-slate-200 hover:bg-slate-200 text-slate-700"
                        : "border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                    }`}
                    title="Close Guide"
                    aria-label="Close Guide"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Role Switcher (Admins can toggle view, DJs are locked) & Quick Jump */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {isActuallyAdmin ? (
                  <div className="flex items-center gap-1 p-1 rounded-xl border text-xs font-bold font-mono">
                    <span className="text-[10px] uppercase tracking-wider px-2 opacity-60">View as:</span>
                    <button
                      onClick={() => setActiveRoleView("admin")}
                      className={`px-3 py-1 rounded-lg transition text-[11px] uppercase tracking-wider cursor-pointer ${
                        activeRoleView === "admin"
                          ? "bg-neon-purple text-white shadow-sm"
                          : isLightMode
                            ? "hover:bg-slate-200 text-slate-700"
                            : "hover:bg-white/10 text-white/70"
                      }`}
                    >
                      Administrator
                    </button>
                    <button
                      onClick={() => setActiveRoleView("dj")}
                      className={`px-3 py-1 rounded-lg transition text-[11px] uppercase tracking-wider cursor-pointer ${
                        activeRoleView === "dj"
                          ? "bg-neon-blue text-white shadow-sm"
                          : isLightMode
                            ? "hover:bg-slate-200 text-slate-700"
                            : "hover:bg-white/10 text-white/70"
                      }`}
                    >
                      Resident DJ (Preview)
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-neon-blue/15 border border-neon-blue/30 text-neon-blue text-xs font-mono font-bold uppercase tracking-wider">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Resident Presenter & DJ Workspace</span>
                  </div>
                )}

                {/* Current Workspace Quick Jump */}
                <button
                  onClick={() => jumpToCurrentSection()}
                  className={`text-[11px] font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition active:scale-95 cursor-pointer shadow-sm ${
                    isLightMode
                      ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold"
                      : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300 font-bold"
                  }`}
                  title="Click to view guide for current screen"
                >
                  <Sparkle className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>Current: <strong>{currentSectionInfo.name}</strong></span>
                  <ChevronRight className="w-3 h-3 opacity-70" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs font-bold uppercase tracking-wider">
                <button
                  onClick={() => setActiveTab("features")}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "features"
                      ? "bg-neon-purple text-white shadow-sm"
                      : isLightMode
                        ? "bg-slate-200/70 hover:bg-slate-200 text-slate-700"
                        : "bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Feature Directory</span>
                </button>

                <button
                  onClick={() => setActiveTab("studio-inbox")}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "studio-inbox"
                      ? "bg-neon-purple text-white shadow-sm"
                      : isLightMode
                        ? "bg-slate-200/70 hover:bg-slate-200 text-slate-700"
                        : "bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Studio Inbox</span>
                </button>

                {isActuallyAdmin && activeRoleView === "admin" && (
                  <button
                    onClick={() => setActiveTab("ai-studio")}
                    className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                      activeTab === "ai-studio"
                        ? "bg-neon-purple text-white shadow-sm"
                        : isLightMode
                          ? "bg-slate-200/70 hover:bg-slate-200 text-slate-700"
                          : "bg-white/5 hover:bg-white/10 text-white/70"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-neon-blue" />
                    <span>AI Content Studio</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("quick-start")}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "quick-start"
                      ? "bg-neon-purple text-white shadow-sm"
                      : isLightMode
                        ? "bg-slate-200/70 hover:bg-slate-200 text-slate-700"
                        : "bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Quick Start</span>
                </button>

                <button
                  onClick={() => setActiveTab("pro-tips")}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "pro-tips"
                      ? "bg-neon-purple text-white shadow-sm"
                      : isLightMode
                        ? "bg-slate-200/70 hover:bg-slate-200 text-slate-700"
                        : "bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Pro Tips</span>
                </button>
              </div>
            </div>

            {/* Guide Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* TAB 1: ALL ACCESSIBLE FEATURES DIRECTORY */}
              {activeTab === "features" && (
                <div className="space-y-4">
                  {/* Search and Category Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeRoleView === "dj" ? "DJ" : "Admin"} features, tools & advice...`}
                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition ${
                          isLightMode
                            ? "bg-slate-100 border-slate-200 focus:border-neon-purple text-slate-900"
                            : "bg-white/5 border-white/10 focus:border-neon-purple text-white"
                        }`}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
                      <button
                        onClick={() => setCategoryFilter("all")}
                        className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                          categoryFilter === "all"
                            ? "bg-neon-purple/20 text-neon-purple font-bold"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        All ({visibleFeatures.length})
                      </button>
                      <button
                        onClick={() => setCategoryFilter("studio-live")}
                        className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                          categoryFilter === "studio-live"
                            ? "bg-neon-purple/20 text-neon-purple font-bold"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        Studio & Live
                      </button>
                      {activeRoleView === "admin" && (
                        <button
                          onClick={() => setCategoryFilter("ai-automation")}
                          className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                            categoryFilter === "ai-automation"
                              ? "bg-neon-purple/20 text-neon-purple font-bold"
                              : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          AI & Automation
                        </button>
                      )}
                      <button
                        onClick={() => setCategoryFilter("community")}
                        className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                          categoryFilter === "community"
                            ? "bg-neon-purple/20 text-neon-purple font-bold"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        Community
                      </button>
                      {activeRoleView === "admin" && (
                        <>
                          <button
                            onClick={() => setCategoryFilter("programming")}
                            className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                              categoryFilter === "programming"
                                ? "bg-neon-purple/20 text-neon-purple font-bold"
                                : "opacity-60 hover:opacity-100"
                            }`}
                          >
                            Programming
                          </button>
                          <button
                            onClick={() => setCategoryFilter("station-ops")}
                            className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                              categoryFilter === "station-ops"
                                ? "bg-neon-purple/20 text-neon-purple font-bold"
                                : "opacity-60 hover:opacity-100"
                            }`}
                          >
                            Station Ops
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Feature Cards Grid */}
                  <div className="space-y-3">
                    {visibleFeatures.length === 0 ? (
                      <div className="text-center py-12 opacity-60">
                        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">No features matched your search criteria.</p>
                        <p className="text-xs mt-1">Try clearing your search query or selecting another category.</p>
                      </div>
                    ) : (
                      visibleFeatures.map((item) => {
                        const IconComponent = item.icon;
                        const isExpanded = expandedFeatureId === item.id;
                        const isCurrentPage = currentSectionInfo.id === item.id;

                        return (
                          <div
                            key={item.id}
                            id={`feature-card-${item.id}`}
                            onClick={() => setExpandedFeatureId(isExpanded ? null : item.id)}
                            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                              isCurrentPage
                                ? isLightMode
                                  ? "bg-amber-50/80 border-amber-400 shadow-md ring-2 ring-amber-400/40"
                                  : "bg-amber-500/15 border-amber-400/80 shadow-lg ring-2 ring-amber-500/40"
                                : isLightMode
                                  ? "bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/90 shadow-sm hover:border-neon-purple/40"
                                  : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                                  isCurrentPage
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : isLightMode
                                      ? "bg-slate-200 text-slate-800"
                                      : "bg-white/10 text-white"
                                }`}>
                                  <IconComponent className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-display font-black text-sm uppercase tracking-tight">
                                      {item.title}
                                    </h3>
                                    {isCurrentPage && (
                                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold border border-amber-500/40 flex items-center gap-1">
                                        <Sparkle className="w-2.5 h-2.5 fill-amber-500" />
                                        <span>Viewing Now</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs mt-1 leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                                    {item.summary}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.routePath && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNavigate(item.routePath);
                                    }}
                                    className="p-2 rounded-xl border transition text-neon-purple hover:bg-neon-purple/10 border-neon-purple/30 cursor-pointer"
                                    title={`Open ${item.title}`}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedFeatureId(isExpanded ? null : item.id);
                                  }}
                                  className={`p-2 rounded-xl border transition text-xs font-mono font-bold cursor-pointer ${
                                    isLightMode ? "border-slate-300 hover:bg-slate-200" : "border-white/15 hover:bg-white/10"
                                  }`}
                                  title={isExpanded ? "Collapse Details" : "Expand Details"}
                                >
                                  {isExpanded ? "Less" : "Details"}
                                </button>
                              </div>
                            </div>

                            {/* Detailed Dropdown Content */}
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`mt-3 pt-3 border-t space-y-3 ${isLightMode ? "border-slate-200" : "border-white/10"}`}
                              >
                                <div>
                                  <h4 className="text-[11px] font-mono uppercase font-black tracking-wider text-neon-purple mb-1.5">
                                    Key Capabilities & Operations:
                                  </h4>
                                  <ul className="space-y-1.5 text-xs">
                                    {item.capabilities.map((cap, idx) => (
                                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                        <span className={isLightMode ? "text-slate-700" : "text-white/80"}>{cap}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                                  isLightMode ? "bg-amber-500/10 border-amber-500/20 text-amber-900" : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                                }`}>
                                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                  <div className="text-xs leading-relaxed">
                                    <strong className="font-black uppercase tracking-wider block text-[10px] text-amber-500">
                                      Broadcast Pro Tip:
                                    </strong>
                                    {item.proTip}
                                  </div>
                                </div>

                                {item.routePath && (
                                  <div className="pt-1 flex justify-end">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNavigate(item.routePath);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neon-purple text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-md transition cursor-pointer"
                                    >
                                      <span>Launch Workspace</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: STUDIO INBOX DEEP DIVE */}
              {activeTab === "studio-inbox" && (
                <div className="space-y-4">
                  <div className={`p-4 sm:p-5 rounded-2xl border ${
                    isLightMode ? "bg-purple-50/70 border-purple-200" : "bg-purple-950/20 border-purple-500/30"
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-xl bg-neon-purple text-white">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-black uppercase tracking-tight">
                          Studio Inbox Console Guide
                        </h3>
                        <p className={`text-xs ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                          Your real-time multi-channel broadcast communication desk
                        </p>
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-700" : "text-white/80"}`}>
                      The Studio Inbox aggregates messages from listeners across all platform channels (Web chatrooms, WhatsApp Business, Telegram bots, and TikTok Live comments) into an instant, prioritised presenter thread.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`p-4 rounded-2xl border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider text-neon-blue flex items-center gap-1.5 mb-2">
                        <Volume2 className="w-4 h-4" />
                        <span>Audio & Voicemails</span>
                      </h4>
                      <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                        Listeners can submit voice notes directly to the studio. Click the play button on incoming audio bubbles to preview them in your headphones prior to broadcasting on air.
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider text-neon-purple flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Quick-Reply Templates</span>
                      </h4>
                      <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                        Use predefined message snippets to acknowledge listener shoutouts instantly with a single tap, allowing you to maintain on-air focus without extensive typing.
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                        <Layers className="w-4 h-4" />
                        <span>Platform Filtering</span>
                      </h4>
                      <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                        Filter conversations by platform badges: isolatable feeds for TikTok comments during live video broadcasts, or WhatsApp for dedicated studio voice notes.
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
                        <Megaphone className="w-4 h-4" />
                        <span>Station Broadcasts</span>
                      </h4>
                      <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                        Station administrators can dispatch high-priority broadcast alerts and instant notifications across all listener chat windows simultaneously.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() => handleNavigate(`${adminBasePath}/studio`)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-xs font-display font-black uppercase tracking-wider shadow-lg hover:scale-105 transition"
                    >
                      Open Live Studio Inbox
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: AI CONTENT STUDIO DEEP DIVE (Admin Only) */}
              {activeTab === "ai-studio" && isActuallyAdmin && activeRoleView === "admin" && (
                <div className="space-y-4">
                  <div className={`p-4 sm:p-5 rounded-2xl border ${
                    isLightMode ? "bg-blue-50/70 border-blue-200" : "bg-blue-950/20 border-blue-500/30"
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-xl bg-neon-blue text-white">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-black uppercase tracking-tight">
                          AI Social Content Studio Guide
                        </h3>
                        <p className={`text-xs ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                          Automated video reel clipping, virality scoring & social publishing
                        </p>
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-700" : "text-white/80"}`}>
                      The AI Content Studio autonomously converts long broadcast recordings and guest DJ sets into viral, high-converting social reels formatted specifically for TikTok, Instagram Reels, and YouTube Shorts.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className={`p-4 rounded-2xl border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider text-neon-blue mb-1.5">
                        1. Job Transcription & Highlight Detection
                      </h4>
                      <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                        Submit an audio recording, stream mount point, or YouTube archive. The background worker transcribes the speech, analyses acoustic energy changes, and pinpoints emotional peaks or viral punchlines.
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider text-neon-purple mb-1.5">
                        2. Virality Scoring & Hook Analysis
                      </h4>
                      <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                        Every generated reel is rated on a 1-to-100 virality scale. The model evaluates hook strength, speaker emotion, and trend alignment so you can prioritise high-impact clips first.
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                      <h4 className="text-xs font-display font-black uppercase tracking-wider text-emerald-400 mb-1.5">
                        3. Review, Approve & Publish
                      </h4>
                      <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                        Preview the vertical video player complete with rendered subtitles. Edit the generated social captions and hashtags, then approve or download the reel for direct cross-platform distribution.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() => handleNavigate(`${adminBasePath}/social-studio`)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-neon-blue to-neon-purple text-white text-xs font-display font-black uppercase tracking-wider shadow-lg hover:scale-105 transition"
                    >
                      Open AI Content Studio
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: QUICK START CHECKLIST */}
              {activeTab === "quick-start" && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <h3 className="text-sm font-display font-black uppercase tracking-tight">
                      {activeRoleView === "dj" ? "Resident DJ Onboarding Checklist" : "Station Administrator Launch Checklist"}
                    </h3>
                    <p className={`text-xs ${isLightMode ? "text-slate-600" : "text-white/60"}`}>
                      Follow these essential steps to ensure seamless broadcast delivery.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {quickStartSteps.map((item) => (
                      <div
                        key={item.step}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 transition ${
                          isLightMode ? "bg-slate-50/90 border-slate-200 hover:bg-slate-100" : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-xl bg-neon-purple/20 text-neon-purple font-mono font-black text-xs flex items-center justify-center shrink-0 border border-neon-purple/30">
                          {item.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-black text-xs uppercase tracking-tight">
                            {item.title}
                          </h4>
                          <p className={`text-xs mt-0.5 leading-relaxed ${isLightMode ? "text-slate-600" : "text-white/70"}`}>
                            {item.desc}
                          </p>
                        </div>
                        {item.actionRoute && (
                          <button
                            onClick={() => handleNavigate(item.actionRoute)}
                            className="p-2 rounded-xl text-neon-purple hover:bg-neon-purple/10 border border-neon-purple/30 shrink-0 text-xs font-bold uppercase transition"
                            title="Go to step"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: BROADCAST PRO TIPS */}
              {activeTab === "pro-tips" && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <h3 className="text-sm font-display font-black uppercase tracking-tight">
                      {activeRoleView === "dj" ? "Presenter & DJ Production Advice" : "Executive Radio Management Insights"}
                    </h3>
                    <p className={`text-xs ${isLightMode ? "text-slate-600" : "text-white/60"}`}>
                      Professional recommendations for maintaining premier British broadcasting quality.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {proTipsList.map((tipItem, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border ${
                          isLightMode ? "bg-amber-50/70 border-amber-200/80" : "bg-amber-500/10 border-amber-500/20"
                        }`}
                      >
                        <h4 className="font-display font-black text-xs uppercase tracking-wider text-amber-500 flex items-center gap-2 mb-1.5">
                          <Lightbulb className="w-4 h-4 shrink-0" />
                          <span>{tipItem.title}</span>
                        </h4>
                        <p className={`text-xs leading-relaxed ${isLightMode ? "text-slate-700" : "text-amber-100/90"}`}>
                          {tipItem.tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Guide Footer */}
            <div className={`p-3 sm:px-6 border-t flex items-center justify-between text-[11px] font-mono ${
              isLightMode ? "border-slate-200 bg-slate-50 text-slate-500" : "border-white/10 bg-black/40 text-white/50"
            }`}>
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">
                  Role: <strong>{activeRoleView === "dj" ? "Resident DJ" : "Administrator"}</strong>
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:underline text-neon-purple font-bold shrink-0 uppercase tracking-wider"
              >
                Close Handbook
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AdminGuideWidget;
