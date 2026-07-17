const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminStudio.tsx', 'utf8');

// Add syncSettings function
const syncSettingsFunc = `
  const syncSettingsToApi = async (settingsObj: Record<string, any>) => {
    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/v1/admin/studio-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify(settingsObj)
      });
    } catch (e) {
      console.warn("Failed to sync settings to API", e);
    }
  };
`;

code = code.replace(/const handleSelectUser = \(user: string\) => \{/, syncSettingsFunc + "\n  const handleSelectUser = (user: string) => {");

// Add useEffect to fetch settings on mount
const fetchSettingsEffect = `
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch("/api/v1/admin/studio-settings", {
          headers: { "Authorization": \`Bearer \${token}\` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.studio_connected_platforms) {
            setConnectedPlatforms(data.studio_connected_platforms);
            localStorage.setItem('studio_connected_platforms', JSON.stringify(data.studio_connected_platforms));
          }
          if (data.studio_platform_configs) {
            setPlatformConfigs(data.studio_platform_configs);
            localStorage.setItem('studio_platform_configs', JSON.stringify(data.studio_platform_configs));
          }
          if (data.dejavu_studio_custom_replies) {
            setCustomReplies(data.dejavu_studio_custom_replies);
            localStorage.setItem('dejavu_studio_custom_replies', JSON.stringify(data.dejavu_studio_custom_replies));
          }
          if (data.studio_pinned_threads) {
            setPinnedThreads(data.studio_pinned_threads);
            localStorage.setItem('studio_pinned_threads', JSON.stringify(data.studio_pinned_threads));
          }
        }
      } catch (err) {
        console.error("Failed to load studio settings from API", err);
      }
    };
    fetchSettings();
  }, []);
`;

code = code.replace(/useEffect\(\(\) => \{\n    try \{\n      localStorage.setItem\('dejavu_studio_threads'/, fetchSettingsEffect + "\n  useEffect(() => {\n    try {\n      localStorage.setItem('dejavu_studio_threads'");

// Add sync to handleTogglePlatform
code = code.replace(/localStorage.setItem\('studio_connected_platforms', JSON.stringify\(updated\)\);/g, "localStorage.setItem('studio_connected_platforms', JSON.stringify(updated)); syncSettingsToApi({ studio_connected_platforms: updated });");

// Add sync to handleSavePlatformConfig
code = code.replace(/localStorage.setItem\('studio_platform_configs', JSON.stringify\(updated\)\);/g, "localStorage.setItem('studio_platform_configs', JSON.stringify(updated)); syncSettingsToApi({ studio_platform_configs: updated });");

// Add sync to useEffects
code = code.replace(/localStorage.setItem\('studio_pinned_threads', JSON.stringify\(pinnedThreads\)\);/g, "localStorage.setItem('studio_pinned_threads', JSON.stringify(pinnedThreads)); syncSettingsToApi({ studio_pinned_threads: pinnedThreads });");

code = code.replace(/localStorage.setItem\('dejavu_studio_custom_replies', JSON.stringify\(customReplies\)\);/g, "localStorage.setItem('dejavu_studio_custom_replies', JSON.stringify(customReplies)); syncSettingsToApi({ dejavu_studio_custom_replies: customReplies });");

fs.writeFileSync('src/pages/admin/AdminStudio.tsx', code);
