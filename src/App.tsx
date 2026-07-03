import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DiscordMessage, WebhookInfo, SavedTemplate, AppTheme } from './types';
import { WebhookBar } from './components/WebhookBar';
import { MessageEditor } from './components/MessageEditor';
import { DiscordPreview } from './components/DiscordPreview';
import { 
  createDefaultMessage, 
  createDefaultEmbed,
  createDefaultField,
  createDefaultActionRow,
  createDefaultButton,
  buildDiscordPayload, 
  encodeData, 
  decodeData, 
  drawAvatar,
  colorDecimalToHex,
  genId,
  playDiscordPing,
  parseImportedJSON
} from './utils';
import { 
  Folder, Share2, Trash2, Disc, Play, AlertCircle, FileText, CheckCircle2,
  X, Moon, Sun, Download, Sparkles, Send, Copy, AlertTriangle, Info, MessageSquare,
  Volume2, VolumeX, Clock, Calendar, Braces
} from 'lucide-react';

export default function App() {
  // --- States ---
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light' | 'amoled'>('dark');
  const [sidebarWidth, setSidebarWidth] = useState<number>(440);
  const [autosaveIndicator, setAutosaveIndicator] = useState<boolean>(false);

  // Modal open states
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  // Webhook form states
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookError, setWebhookError] = useState('');
  const [isWebhookVerifying, setIsWebhookVerifying] = useState(false);

  // Raw JSON state
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Raw Import states
  const [isImportRawModalOpen, setIsImportRawModalOpen] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [rawJsonError, setRawJsonError] = useState('');

  // Send progress states
  const [selectedSendIds, setSelectedSendIds] = useState<Record<string, boolean>>({});
  const [sendLogs, setSendLogs] = useState<Record<string, { status: 'pending' | 'sending' | 'ok' | 'error'; detail?: string }>>({});
  const [isSendingInProgress, setIsSendingInProgress] = useState(false);

  // Avatar Generator State
  const [avatarLetter, setAvatarLetter] = useState('W');
  const [avatarColorStart, setAvatarColorStart] = useState('#6b4fbf');
  const [avatarColorEnd, setAvatarColorEnd] = useState('#150e40');
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Save/Load Templates States
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateTab, setTemplateTab] = useState<'saved' | 'community' | 'history'>('saved');
  const [playPingSound, setPlayPingSound] = useState<boolean>(true);
  const [dispatchHistory, setDispatchHistory] = useState<Array<{
    id: string;
    timestamp: number;
    messageCount: number;
    status: 'success' | 'failed';
    payloadSummary: string;
    messagesSnapshot: DiscordMessage[];
  }>>([]);

  // Toast System State
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([]);

  // Sidebar drag reference
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // --- Show Toast Notification ---
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = genId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isOut: true } as any : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  // --- Theme Controller ---
  const applyTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    const html = document.documentElement;
    // Remove old theme classes
    html.classList.remove('dark', 'light', 'blurple', 'forest', 'cyberpunk', 'ocean');
    // Apply current theme
    if (newTheme !== 'light') {
      html.classList.add(newTheme);
    } else {
      html.classList.add('light');
    }
    localStorage.setItem('wp_theme', newTheme);
  };

  // --- Initial Mount / Load parameters ---
  useEffect(() => {
    // Load Saved Theme
    const savedTheme = localStorage.getItem('wp_theme') as AppTheme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // Check query params for shared data
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');

    if (dataParam) {
      const decoded = decodeData(dataParam);
      if (decoded) {
        setMessages(decoded.messages);
        setWebhook(decoded.webhook);
        showToast('Loaded configuration from shared link!', 'success');
        return;
      } else {
        showToast('Shared configuration could not be loaded.', 'warning');
      }
    }

    // Fallback: Check local autosave
    const autosave = localStorage.getItem('wp_autosave');
    if (autosave) {
      try {
        const parsed = JSON.parse(autosave);
        if (parsed && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
          if (parsed.webhook) setWebhook(parsed.webhook);
          return;
        }
      } catch (err) {
        console.error('Failed to parse local autosave', err);
      }
    }

    // Default: Initial setup
    setMessages([createDefaultMessage(true)]);
  }, [showToast]);

  // --- Sync State to URL & Auto-save ---
  useEffect(() => {
    if (messages.length === 0) return;

    const timeout = setTimeout(() => {
      try {
        const encoded = encodeData(messages, webhook);
        if (encoded) {
          const url = new URL(window.location.href);
          url.searchParams.set('data', encoded);
          window.history.replaceState({}, '', url.toString());
        }

        // Write to LocalStorage
        localStorage.setItem('wp_autosave', JSON.stringify({
          version: 'd2',
          messages,
          webhook,
          savedAt: Date.now()
        }));

        setAutosaveIndicator(true);
        setTimeout(() => setAutosaveIndicator(false), 1500);
      } catch (err) {
        console.error('Autosave error', err);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [messages, webhook]);

  // --- Load Templates & History & Settings ---
  useEffect(() => {
    const savedTemplates = localStorage.getItem('wp_templates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (err) {
        console.error('Failed to load saved templates', err);
      }
    }

    const savedHistory = localStorage.getItem('wp_history');
    if (savedHistory) {
      try {
        setDispatchHistory(JSON.parse(savedHistory));
      } catch (err) {
        console.error('Failed to load dispatch history', err);
      }
    }

    const savedSoundSetting = localStorage.getItem('wp_ping_sound');
    if (savedSoundSetting !== null) {
      setPlayPingSound(savedSoundSetting === 'true');
    }
  }, []);

  // --- Draw Avatar canvas when open or parameters change ---
  useEffect(() => {
    if (isAvatarModalOpen && avatarCanvasRef.current) {
      const canvas = avatarCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawAvatar(ctx, avatarLetter, avatarColorStart, avatarColorEnd);
      }
    }
  }, [isAvatarModalOpen, avatarLetter, avatarColorStart, avatarColorEnd]);

  // --- Sidebar panel resizer mouse listeners ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const resizer = document.getElementById('resizer');
    if (resizer) resizer.classList.add('dragging');
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 300), 720);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const resizer = document.getElementById('resizer');
      if (resizer) resizer.classList.remove('dragging');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarWidth]);

  // --- Handle Webhook Configuration Confirm ---
  const handleVerifyAndAddWebhook = async () => {
    setWebhookError('');
    const url = webhookUrlInput.trim();

    if (!url) {
      setWebhookError('Please input a valid Discord webhook URL.');
      return;
    }

    if (!url.match(/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/.+/)) {
      setWebhookError("This doesn't match standard Discord webhook format.");
      return;
    }

    setIsWebhookVerifying(true);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const info = await res.json();

      const avatarUrl = info.avatar
        ? `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png`
        : null;

      const newWebhook: WebhookInfo = {
        url,
        name: info.name || 'Webhook',
        avatar: avatarUrl,
        channelId: info.channel_id,
        guildId: info.guild_id
      };

      setWebhook(newWebhook);
      setIsWebhookModalOpen(false);
      showToast(`Webhook "${newWebhook.name}" added successfully!`, 'success');
    } catch (err) {
      console.error(err);
      setWebhookError('Failed to fetch Webhook details. Verify URL is correct and online.');
    } finally {
      setIsWebhookVerifying(false);
    }
  };

  const handleRemoveWebhook = () => {
    setWebhook(null);
    showToast('Webhook integration removed.', 'info');
  };

  // --- Handle Share Link Generation ---
  const handleShareConfig = () => {
    try {
      const urlStr = window.location.href;
      navigator.clipboard.writeText(urlStr)
        .then(() => showToast('Shareable link copied to clipboard!', 'success'))
        .catch(() => {
          // Fallback copy paste
          const tempInput = document.createElement('textarea');
          tempInput.value = urlStr;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          showToast('Shareable link copied!', 'success');
        });
    } catch (err) {
      showToast('Failed to copy share link.', 'error');
    }
  };

  // --- Handle JSON Configuration Loading ---
  const handleOpenJsonModal = () => {
    const jsonStr = JSON.stringify({
      version: 'd2',
      messages: messages.map(m => ({
        _id: m.id,
        data: buildDiscordPayload(m, webhook)
      }))
    }, null, 2);
    setJsonText(jsonStr);
    setJsonError('');
    setIsJsonModalOpen(true);
  };

  const handleApplyJsonConfig = () => {
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonText.trim());
      if (!parsed || !Array.isArray(parsed.messages)) {
        throw new Error('Invalid JSON schema - expected root messages array');
      }

      // Reconstruct state objects from imported payload
      const reconstructed: DiscordMessage[] = parsed.messages.map((m: any) => {
        const d = m.data || {};
        
        const embeds = (d.embeds || []).map((e: any) => {
          const fields = (e.fields || []).map((f: any) => ({
            id: genId(),
            name: f.name || '',
            value: f.value || '',
            inline: !!f.inline
          }));

          return {
            id: genId(),
            title: e.title || '',
            titleUrl: e.url || '',
            description: e.description || '',
            color: colorDecimalToHex(e.color) || '#5865f2',
            authorName: (e.author && e.author.name) || '',
            authorUrl: (e.author && e.author.url) || '',
            authorIconUrl: (e.author && e.author.icon_url) || '',
            thumbnail: (e.thumbnail && e.thumbnail.url) || '',
            image: (e.image && e.image.url) || '',
            footerText: (e.footer && e.footer.text) || '',
            footerIconUrl: (e.footer && e.footer.icon_url) || '',
            timestamp: !!e.timestamp,
            fields
          };
        });

        const components = (d.components || []).map((row: any) => {
          const buttons = (row.components || []).map((b: any) => ({
            id: genId(),
            style: (b.style || 5),
            label: b.label || '',
            url: b.url || '',
            emoji: (b.emoji && b.emoji.name) || ''
          }));

          return {
            id: genId(),
            buttons
          };
        });

        return {
          id: m._id || genId(),
          content: d.content || '',
          username: d.username || '',
          avatarUrl: d.avatar_url || '',
          embeds,
          components
        };
      });

      setMessages(reconstructed);
      setIsJsonModalOpen(false);
      showToast('JSON Configuration applied successfully!', 'success');
    } catch (err: any) {
      setJsonError(`JSON Syntax/Format Error: ${err.message}`);
    }
  };

  // --- Send Webhook Flow ---
  const handleOpenSendModal = () => {
    if (!webhook) {
      showToast('You must add a webhook URL before sending messages.', 'warning');
      setIsWebhookModalOpen(true);
      return;
    }
    
    // Set initially checked send ids
    const initialChecked: Record<string, boolean> = {};
    const logs: typeof sendLogs = {};
    messages.forEach(m => {
      initialChecked[m.id] = true;
      logs[m.id] = { status: 'pending' };
    });

    setSelectedSendIds(initialChecked);
    setSendLogs(logs);
    setIsSendingInProgress(false);
    setIsSendModalOpen(true);
  };

  const executeSendSelected = async () => {
    const targetMessages = messages.filter(m => selectedSendIds[m.id]);

    if (targetMessages.length === 0) {
      showToast('Please select at least one message queue to execute.', 'warning');
      return;
    }

    setIsSendingInProgress(true);
    let allSucceeded = true;

    // Run sequentially with slight delay to obey standard rate limits
    for (const msg of targetMessages) {
      setSendLogs(prev => ({
        ...prev,
        [msg.id]: { status: 'sending' }
      }));

      try {
        const payload = buildDiscordPayload(msg, webhook);
        
        // Ensure some contents exist to avoid empty payload response
        const hasContent = payload.content && payload.content.trim().length > 0;
        const hasEmbeds = payload.embeds && payload.embeds.length > 0;
        const hasComponents = payload.components && payload.components.length > 0;

        if (!hasContent && !hasEmbeds && !hasComponents) {
          setSendLogs(prev => ({
            ...prev,
            [msg.id]: { status: 'error', detail: 'Empty content payload. Needs text content, an embed panel, or interactive buttons.' }
          }));
          allSucceeded = false;
          continue;
        }

        const res = await fetch(webhook!.url + '?wait=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setSendLogs(prev => ({
            ...prev,
            [msg.id]: { status: 'ok' }
          }));
        } else {
          let errorDetail = `Status: ${res.status}`;
          try {
            const apiErr = await res.json();
            if (apiErr.message) errorDetail += ` - ${apiErr.message}`;
            if (apiErr.code) errorDetail += ` (Discord API Code ${apiErr.code})`;
          } catch {}

          setSendLogs(prev => ({
            ...prev,
            [msg.id]: { status: 'error', detail: errorDetail }
          }));
          allSucceeded = false;
        }
      } catch (err: any) {
        setSendLogs(prev => ({
          ...prev,
          [msg.id]: { status: 'error', detail: `Network error: ${err.message || 'CORS blocking / offline status'}` }
        }));
        allSucceeded = false;
      }

      // Small cooldown delay between requests
      await new Promise(r => setTimeout(r, 450));
    }

    setIsSendingInProgress(false);

    // Save to history log
    const newHistoryItem = {
      id: genId(),
      timestamp: Date.now(),
      messageCount: targetMessages.length,
      status: allSucceeded ? 'success' as const : 'failed' as const,
      payloadSummary: targetMessages.map(m => m.username || 'Webhook Bot').join(', '),
      messagesSnapshot: JSON.parse(JSON.stringify(messages))
    };

    setDispatchHistory(prev => {
      const updated = [newHistoryItem, ...prev].slice(0, 30); // Store up to 30 histories
      localStorage.setItem('wp_history', JSON.stringify(updated));
      return updated;
    });

    if (allSucceeded) {
      if (playPingSound) {
        playDiscordPing();
      }
      showToast(`Successfully dispatched ${targetMessages.length} message(s)!`, 'success');
      setTimeout(() => setIsSendModalOpen(false), 1200);
    } else {
      showToast('Some message dispatches encountered issues. View details.', 'error');
    }
  };

  // --- Avatar Gen export PNG downloader ---
  const handleDownloadAvatarPng = () => {
    if (avatarCanvasRef.current) {
      const link = document.createElement('a');
      const letterChar = (avatarLetter.trim() || 'W').charAt(0).toUpperCase();
      link.download = `avatar_${letterChar}.png`;
      link.href = avatarCanvasRef.current.toDataURL('image/png');
      link.click();
      showToast('Avatar PNG file downloaded! Host on Imgur/Discord for a URL.', 'success');
    }
  };

  // --- Local templates manipulation ---
  const handleSaveCurrentAsTemplate = () => {
    const name = templateNameInput.trim();
    if (!name) {
      showToast('Please type a descriptive name for your template saving.', 'warning');
      return;
    }

    const newTemplate: SavedTemplate = {
      id: genId(),
      name,
      messages: JSON.parse(JSON.stringify(messages)),
      savedAt: Date.now()
    };

    const updated = [newTemplate, ...templates];
    setTemplates(updated);
    localStorage.setItem('wp_templates', JSON.stringify(updated));
    setTemplateNameInput('');
    showToast(`Saved template "${name}"!`, 'success');
  };

  const handleLoadTemplate = (t: SavedTemplate) => {
    setMessages(JSON.parse(JSON.stringify(t.messages)));
    setIsTemplatesModalOpen(false);
    showToast(`Loaded Template: "${t.name}"`, 'success');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('wp_templates', JSON.stringify(updated));
    showToast('Template deleted.', 'info');
  };

  const handleImportRawJSON = () => {
    try {
      setRawJsonError('');
      const cleanInput = rawJsonInput.trim();
      if (!cleanInput) {
        setRawJsonError('Vui lòng dán dữ liệu JSON tin nhắn Discord hợp lệ.');
        return;
      }
      const parsedMsgs = parseImportedJSON(cleanInput);
      if (!parsedMsgs || parsedMsgs.length === 0) {
        setRawJsonError('Không thể tìm thấy hoặc phân tích dữ liệu tin nhắn nào.');
        return;
      }

      setMessages(parsedMsgs);
      setIsImportRawModalOpen(false);
      setRawJsonInput('');
      showToast(`Đã nhập thành công ${parsedMsgs.length} tin nhắn từ JSON raw!`, 'success');
    } catch (err: any) {
      console.error(err);
      setRawJsonError(err.message || 'Lỗi phân tích cú pháp JSON. Vui lòng kiểm tra lại định dạng.');
    }
  };

  const handleLoadCommunityPreset = (presetName: string) => {
    let presetMessages: DiscordMessage[] = [];
    if (presetName === 'rules') {
      const embed = createDefaultEmbed();
      embed.title = '📜 Server Guidelines & Rules';
      embed.description = 'Welcome to the community! Following these rules helps keep the space safe, fun, and productive for everyone:\n\n1. **Be respectful** of other members. No hate speech, harassment, or flame wars.\n2. **No spamming** or unsolicited promotional links in channels.\n3. **Keep discussions on topic** - use channels according to their names.\n4. **No NSFW content** in general channels.\n5. **Listen to moderators** - they are here to keep the peace.';
      embed.color = '#23a55a';
      embed.footerText = 'Thank you for cooperating with our staff!';
      embed.timestamp = true;
      
      presetMessages = [{
        id: genId(),
        content: '👋 Welcome to our Discord server! Please read and adhere to our server rules below.',
        username: 'Server Rules',
        avatarUrl: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=256&auto=format&fit=crop&q=80',
        embeds: [embed],
        components: []
      }];
    } else if (presetName === 'status') {
      const embed = createDefaultEmbed();
      embed.title = '⚠️ Operational Status: Partial Degraded State';
      embed.description = 'We are currently experiencing degradation across our secondary database cluster. Some user profiles and statistics might take longer to load or sync.';
      embed.color = '#f0b232';
      
      const f1 = createDefaultField();
      f1.name = 'Database Nodes';
      f1.value = '🟠 Degraded Performance';
      f1.inline = true;
      
      const f2 = createDefaultField();
      f2.name = 'API Restoral ETA';
      f2.value = 'Within 1-2 Hours';
      f2.inline = true;
      
      const f3 = createDefaultField();
      f3.name = 'Impacted Services';
      f3.value = 'Statistics tracking, Matchmaking queues, Achievement rewards';
      f3.inline = false;
      
      embed.fields = [f1, f2, f3];
      embed.timestamp = true;

      const row = createDefaultActionRow();
      const btn1 = createDefaultButton();
      btn1.style = 5;
      btn1.label = 'Status Dashboard';
      btn1.url = 'https://status.discord.com';
      btn1.emoji = '📊';
      row.buttons = [btn1];
      
      presetMessages = [{
        id: genId(),
        content: '📢 **Operations Update Alert**',
        username: 'Status Operations Bot',
        avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80',
        embeds: [embed],
        components: [row]
      }];
    } else if (presetName === 'gaming') {
      const embed = createDefaultEmbed();
      embed.title = '🎮 Friday Night Community Gaming Night!';
      embed.description = 'Attention players! Friday Community Night is back. Bring your friends, coordinate your squad, and prepare for some light-hearted multiplayer tournament lobbies. Awesome custom server roles for the top participants!';
      embed.color = '#5865f2';
      embed.authorName = 'Events Coordination Team';
      
      const f1 = createDefaultField();
      f1.name = 'Scheduled Game';
      f1.value = 'Valorant / Minecraft Lobbies';
      f1.inline = true;
      
      const f2 = createDefaultField();
      f2.name = 'Session Begins';
      f2.value = 'Friday @ 8:00 PM EST';
      f2.inline = true;
      
      embed.fields = [f1, f2];
      embed.image = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=520&auto=format&fit=crop&q=80';
      embed.timestamp = true;

      const row = createDefaultActionRow();
      const btn1 = createDefaultButton();
      btn1.style = 1;
      btn1.label = 'RSVP / Register';
      btn1.emoji = '📝';
      
      const btn2 = createDefaultButton();
      btn2.style = 5;
      btn2.label = 'Join Lobby Chat';
      btn2.url = 'https://discord.gg';
      btn2.emoji = '🔊';

      row.buttons = [btn1, btn2];
      
      presetMessages = [{
        id: genId(),
        content: '🎉 @everyone **Friday Community Night is here!** RSVP below to secure your spot.',
        username: 'Event Organizer',
        avatarUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=256&auto=format&fit=crop&q=80',
        embeds: [embed],
        components: [row]
      }];
    } else if (presetName === 'support') {
      const embed = createDefaultEmbed();
      embed.title = '🎫 Help & Support Ticket Portal';
      embed.description = 'Need assistance? You\'ve come to the right place!\n\nClick the button below to open a private, secure support ticket. Our server staff and moderators will be notified and will assist you as soon as possible.\n\n**Before opening a ticket:**\n• Check out the <#1234567890> channel for quick FAQ answers.\n• Keep your issue description concise and prepare screenshots if applicable.\n• Do not direct message staff members directly.';
      embed.color = '#248046'; // Dark green
      
      const f1 = createDefaultField();
      f1.name = 'Current Response Time';
      f1.value = '🟢 Fast (Within 15-30 mins)';
      f1.inline = true;

      const f2 = createDefaultField();
      f2.name = 'Operational Hours';
      f2.value = '24/7 Global Staff Network';
      f2.inline = true;

      embed.fields = [f1, f2];
      embed.footerText = 'Abusing the ticket system will lead to moderation actions.';
      embed.timestamp = true;

      const row = createDefaultActionRow();
      const btn1 = createDefaultButton();
      btn1.style = 3; // Success Green
      btn1.label = 'Open Support Ticket';
      btn1.emoji = '🎫';
      
      const btn2 = createDefaultButton();
      btn2.style = 2; // Secondary / Grey
      btn2.label = 'Read FAQ Guidelines';
      btn2.emoji = '📖';

      row.buttons = [btn1, btn2];

      presetMessages = [{
        id: genId(),
        content: '✉️ **Support Desk Online**',
        username: 'Support Desk Portal',
        avatarUrl: 'https://images.unsplash.com/photo-1521737711867-e3b90473bd58?w=256&auto=format&fit=crop&q=80',
        embeds: [embed],
        components: [row]
      }];
    } else if (presetName === 'giveaway') {
      const embed = createDefaultEmbed();
      embed.title = '🎉 Server Milestone Mega Giveaway!';
      embed.description = 'To celebrate reaching our milestone, we are hosting a premium giveaway for all active community members!\n\n**Prize:** 🚀 Discord Nitro Premium (1 Month)\n**Winners:** 2 Lucky Entrants\n**Hosted by:** <@1234567890>\n\nClick the **Enter Giveaway** button below to participate. Good luck to everyone!';
      embed.color = '#f47fff'; // Pink / purple
      
      const f1 = createDefaultField();
      f1.name = 'Requirements';
      f1.value = '• Member of the server for 24 hours\n• No active warnings';
      f1.inline = false;

      const f2 = createDefaultField();
      f2.name = 'Entries Counter';
      f2.value = '👥 1,248 Entrants so far!';
      f2.inline = true;

      const f3 = createDefaultField();
      f3.name = 'Time Remaining';
      f3.value = '⏰ Ending in 2 Days (July 5th)';
      f3.inline = true;

      embed.fields = [f1, f2, f3];
      embed.footerText = 'Winner selected automatically via randomized scheduler.';
      embed.timestamp = true;

      const row = createDefaultActionRow();
      const btn1 = createDefaultButton();
      btn1.style = 1; // Blurple
      btn1.label = 'Enter Giveaway';
      btn1.emoji = '🎁';

      const btn2 = createDefaultButton();
      btn2.style = 5; // Link
      btn2.label = 'View Giveaway Terms';
      btn2.url = 'https://discord.com';
      btn2.emoji = '⚖️';

      row.buttons = [btn1, btn2];

      presetMessages = [{
        id: genId(),
        content: '🎁 @everyone **A wild giveaway has appeared!** Participate below.',
        username: 'Giveaway Coordinator',
        avatarUrl: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=256&auto=format&fit=crop&q=80',
        embeds: [embed],
        components: [row]
      }];
    }
    setMessages(presetMessages);
    setIsTemplatesModalOpen(false);
    showToast('Successfully loaded community template preset!', 'success');
  };

  const handleExportWorkspace = () => {
    try {
      const dataStr = JSON.stringify({
        version: 'd2_export',
        messages,
        webhook
      }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `webhook_workspace_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Successfully exported workspace to JSON file!', 'success');
    } catch (err) {
      showToast('Failed to export workspace.', 'error');
    }
  };

  const handleImportWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
          if (parsed.webhook) {
            setWebhook(parsed.webhook);
          }
          showToast('Successfully imported workspace from JSON file!', 'success');
          setIsTemplatesModalOpen(false);
        } else {
          showToast('Invalid workspace file structure.', 'error');
        }
      } catch (err) {
        showToast('Failed to parse JSON workspace file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAllQueues = () => {
    if (messages.length === 0) return;
    if (confirm('Are you sure you want to delete all messages? This action cannot be undone.')) {
      setMessages([]);
      showToast('Cleared all message items.', 'info');
    }
  };

  // Theme constants
  const themeOpts = [
    { key: 'dark', color: '#1a1a2e', name: 'Midnight Dark' },
    { key: 'light', color: '#f0f0f5', name: 'Alabaster Light' },
    { key: 'blurple', color: '#5865F2', name: 'Classic Blurple' },
    { key: 'forest', color: '#1a4a2e', name: 'Deep Forest' },
    { key: 'cyberpunk', color: '#ff007f', name: 'Neon Cyberpunk' },
    { key: 'ocean', color: '#0077b6', name: 'Aquatic Ocean' },
  ];

  // Open/Close theme dropdown manually
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[15px] select-none text-[var(--text-0)] bg-[var(--bg-1)] select-none">
      {/* Dynamic top bar */}
      <header id="topbar" className="fixed top-0 left-0 right-0 h-[var(--topbar-height)] bg-[var(--bg-0)] border-b border-[var(--border)] flex items-center justify-between px-4 z-50 gap-3">
        <div className="flex items-center gap-2">
          {/* Logo icon branding */}
          <div className="logo flex items-center gap-2 select-none">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="flex-shrink-0">
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#5865F2" />
                  <stop offset="1" stopColor="#EB459E" />
                </linearGradient>
              </defs>
              <circle cx="15" cy="15" r="15" fill="url(#logo-grad)" />
              <path d="M9 11.5C9 10.67 9.67 10 10.5 10H19.5C20.33 10 21 10.67 21 11.5V18C21 18.83 20.33 19.5 19.5 19.5H13L9.5 22L10 19.5H10.5C9.67 19.5 9 18.83 9 18V11.5Z" fill="white" />
            </svg>
            <span className="logo-text text-[16px] font-bold tracking-tight text-[var(--text-0)]">
              Webhook<span className="logo-accent bg-gradient-to-r from-[#5865f2] to-[#eb459e] bg-clip-text text-transparent">Panel</span>
            </span>
          </div>

          <nav className="flex items-center gap-0.5 ml-4">
            <button
              onClick={() => setIsJsonModalOpen(false)}
              className="px-3 py-1 text-[13px] font-medium rounded-[var(--radius-sm)] bg-[var(--brand)] text-white select-none border-none cursor-pointer"
            >
              Editor
            </button>
            <button
              onClick={handleOpenJsonModal}
              className="px-3 py-1 text-[13px] font-medium rounded-[var(--radius-sm)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-4)] hover:text-[var(--text-0)] select-none border-none transition-all cursor-pointer"
            >
              JSON Raw
            </button>
          </nav>

          {autosaveIndicator && (
            <div className="flex items-center gap-1 text-[var(--text-3)] text-xs animate-fade-in pl-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-ping" />
              <span>autosaved</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Templates load */}
          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            title="Templates & Presets"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-4)] hover:text-[var(--text-0)] transition-all cursor-pointer"
          >
            <Folder className="w-4 h-4" />
            <span className="hidden lg:inline">Templates</span>
          </button>

          {/* Import Raw JSON */}
          <button
            onClick={() => {
              setRawJsonError('');
              setRawJsonInput('');
              setIsImportRawModalOpen(true);
            }}
            title="Import Raw Discord Message JSON (Webhooks / Client raw JSON)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-4)] hover:text-[var(--text-0)] transition-all cursor-pointer"
          >
            <Braces className="w-4 h-4 text-[var(--brand-light)]" />
            <span className="hidden lg:inline">Import Raw</span>
          </button>

          {/* Ping Sound Toggle */}
          <button
            onClick={() => {
              const newVal = !playPingSound;
              setPlayPingSound(newVal);
              localStorage.setItem('wp_ping_sound', String(newVal));
              if (newVal) {
                playDiscordPing();
              }
              showToast(newVal ? 'Notification chime enabled' : 'Notification chime muted', 'info');
            }}
            title={playPingSound ? 'Mute notification sound' : 'Unmute notification sound'}
            className="flex items-center justify-center w-8.5 h-8.5 text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-4)] border border-[var(--border-strong)] rounded-[var(--radius-sm)] transition-all cursor-pointer bg-transparent"
          >
            {playPingSound ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5 text-[var(--danger)] animate-pulse" />}
          </button>

          {/* Share */}
          <button
            onClick={handleShareConfig}
            title="Share Configuration link"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-4)] hover:text-[var(--text-0)] transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden lg:inline">Share</span>
          </button>

          {/* Reset all message queues */}
          <button
            onClick={handleClearAllQueues}
            disabled={messages.length === 0}
            title="Clear workspace"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-transparent text-[var(--text-2)] hover:bg-[rgba(242,63,66,0.1)] hover:text-[var(--danger)] hover:border-[rgba(242,63,66,0.2)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden xl:inline">Clear</span>
          </button>

          {/* Add Webhook URL configure */}
          <button
            onClick={() => {
              setWebhookUrlInput(webhook ? webhook.url : '');
              setWebhookError('');
              setIsWebhookModalOpen(true);
            }}
            title={webhook ? 'Manage Webhook connection' : 'Add Discord Webhook link'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-sm)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white border-none cursor-pointer transition-colors shadow-sm"
          >
            <Disc className="w-4 h-4" />
            <span className="hidden md:inline">
              {webhook ? 'Manage Webhook' : 'Add Webhook'}
            </span>
          </button>

          {/* Send dispatches */}
          <button
            onClick={handleOpenSendModal}
            disabled={messages.length === 0}
            title="Dispatch payloads via webhook"
            className="flex items-center gap-1.5 px-4 py-1.5 text-[13.5px] font-bold rounded-[var(--radius-sm)] bg-[var(--success)] hover:bg-[var(--success-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm border-none"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>

          {/* Custom Theme selection dropdown container */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-2 text-[var(--text-2)] hover:text-white rounded-[var(--radius-sm)] hover:bg-[var(--bg-4)] transition-colors cursor-pointer flex items-center bg-transparent border-none"
              title="Change Editor Theme"
            >
              {theme === 'light' ? (
                <Sun className="w-4.5 h-4.5" />
              ) : (
                <Moon className="w-4.5 h-4.5" />
              )}
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-[180px] bg-[var(--bg-2)] border border-[var(--border-strong)] rounded-[var(--radius)] shadow-[var(--shadow-lg)] p-1 z-50 flex flex-col">
                {themeOpts.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      applyTheme(opt.key as AppTheme);
                      setThemeDropdownOpen(false);
                    }}
                    className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-[13px] rounded-[var(--radius-sm)] cursor-pointer transition-colors border-none bg-transparent ${
                      theme === opt.key 
                        ? 'bg-[var(--brand)] text-white' 
                        : 'text-[var(--text-1)] hover:bg-[var(--bg-4)]'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-[rgba(255,255,255,0.2)] flex-shrink-0"
                      style={{ background: opt.color }}
                    />
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Webhook active info banner bar */}
      {webhook && (
        <div className="fixed top-[var(--topbar-height)] left-0 right-0 z-40">
          <WebhookBar
            webhook={webhook}
            onEditClick={() => {
              setWebhookUrlInput(webhook.url);
              setWebhookError('');
              setIsWebhookModalOpen(true);
            }}
            onRemoveClick={handleRemoveWebhook}
          />
        </div>
      )}

      {/* Primary Split Panel Layout workspace */}
      <div 
        id="appLayout" 
        className={`flex-1 flex overflow-hidden mt-[var(--topbar-height)] ${webhook ? 'pt-[var(--webhookbar-height)]' : ''}`}
      >
        {/* Left message builder editor panel */}
        <aside 
          id="editorPanel" 
          className="flex-shrink-0 bg-[var(--bg-1)] border-r border-[var(--border)] relative flex flex-col h-full overflow-hidden"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div id="editorScroll" className="flex-1 overflow-y-auto px-3.5 pt-3 pb-24">
            <MessageEditor
              messages={messages}
              onUpdateMessages={setMessages}
              onOpenAvatarGen={() => setIsAvatarModalOpen(true)}
            />
          </div>
        </aside>

        {/* Resizer grab bar */}
        <div
          id="resizer"
          className="w-[5px] bg-transparent hover:bg-[var(--brand)] cursor-col-resize flex-shrink-0 relative transition-colors h-full select-none"
          onMouseDown={handleMouseDown}
        />

        {/* Right Simulated Discord Preview Panel */}
        <main 
          id="previewPanel" 
          className="flex-1 flex flex-col h-full overflow-hidden transition-colors duration-200"
          style={{
            background: previewTheme === 'light' ? '#ffffff' : (previewTheme === 'amoled' ? '#000000' : '#313338'),
            '--dc-bg': previewTheme === 'light' ? '#ffffff' : (previewTheme === 'amoled' ? '#000000' : '#313338'),
            '--dc-chat': previewTheme === 'light' ? '#f2f3f5' : (previewTheme === 'amoled' ? '#050505' : '#36393f'),
            '--dc-code-bg': previewTheme === 'light' ? '#e3e5e8' : (previewTheme === 'amoled' ? '#1e1f22' : '#2b2d31'),
            '--dc-blockquote': previewTheme === 'light' ? '#d4d6db' : '#4e5058',
            '--text-0': previewTheme === 'light' ? '#060607' : '#f2f3f5',
            '--text-1': previewTheme === 'light' ? '#2e3338' : '#dbdee1',
            '--text-2': previewTheme === 'light' ? '#4e5058' : '#b5bac1',
            '--text-3': '#80848e',
            '--text-4': previewTheme === 'light' ? '#b5bac1' : '#5c5f66',
          } as React.CSSProperties}
        >
          <div id="previewScroll" className="flex-1 overflow-y-auto p-4 select-text">
            <div id="previewHeader" className="flex justify-between items-center mb-3.5 select-none">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.8px] text-[var(--text-3)] select-none">
                <MessageSquare className="w-4 h-4 text-[var(--brand)]" />
                Discord Preview Live Simulator
              </span>
              <div className="flex items-center gap-1 bg-[var(--bg-0)] p-0.5 rounded-full border border-[var(--border)] select-none">
                <button
                  type="button"
                  onClick={() => setPreviewTheme('dark')}
                  className={`px-2.5 py-1 text-[10.5px] font-bold rounded-full transition-all border-none cursor-pointer ${
                    previewTheme === 'dark'
                      ? 'bg-[var(--brand)] text-white shadow-sm'
                      : 'text-[var(--text-3)] hover:text-[var(--text-1)] bg-transparent'
                  }`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme('light')}
                  className={`px-2.5 py-1 text-[10.5px] font-bold rounded-full transition-all border-none cursor-pointer ${
                    previewTheme === 'light'
                      ? 'bg-[var(--brand)] text-white shadow-sm'
                      : 'text-[var(--text-3)] hover:text-[var(--text-1)] bg-transparent'
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme('amoled')}
                  className={`px-2.5 py-1 text-[10.5px] font-bold rounded-full transition-all border-none cursor-pointer ${
                    previewTheme === 'amoled'
                      ? 'bg-[var(--brand)] text-white shadow-sm'
                      : 'text-[var(--text-3)] hover:text-[var(--text-1)] bg-transparent'
                  }`}
                >
                  AMOLED
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 select-text">
              <DiscordPreview
                messages={messages}
                webhook={webhook}
              />
            </div>
          </div>
        </main>
      </div>

      {/* --- MODAL 1: WEBHOOK URL MODAL --- */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[rgba(0,0,0,0.65)] backdrop-blur-[3px] animate-fade-in"
            onClick={() => setIsWebhookModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-2)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] w-full max-w-[440px] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-[17px] font-bold text-[var(--text-0)]">Configure Webhook URL</h3>
              <button 
                onClick={() => setIsWebhookModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-5)] text-[var(--text-3)] hover:text-[var(--text-0)] transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-[0.4px] text-[var(--text-2)]">
                  Webhook URL <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] focus:ring-3 focus:ring-[rgba(88,101,242,0.2)] transition-all placeholder-[var(--input-placeholder)]"
                />
                <p className="text-[11px] text-[var(--text-3)] leading-normal mt-1">
                  ⚠️ Discord Webhook URLs hold authentication privileges. Do not share your URL with untrusted sources.
                </p>
              </div>

              {webhookError && (
                <div className="text-[12px] text-[var(--danger)] bg-[rgba(242,63,66,0.1)] border border-[rgba(242,63,66,0.3)] rounded-[var(--radius-sm)] p-2.5 flex items-start gap-1.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{webhookError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 my-1">
                <span className="flex-1 h-[1px] bg-[var(--border-strong)]" />
                <span className="text-xs text-[var(--text-4)] uppercase font-semibold">How to get URL?</span>
                <span className="flex-1 h-[1px] bg-[var(--border-strong)]" />
              </div>

              <ol className="text-xs text-[var(--text-2)] flex flex-col gap-2 list-decimal pl-4.5 leading-normal">
                <li>Navigate to your Discord Server settings, or a specific channel.</li>
                <li>Go to <strong className="text-[var(--text-0)] font-semibold">Integrations</strong> &rarr; <strong className="text-[var(--text-0)] font-semibold">Webhooks</strong>.</li>
                <li>Click <strong className="text-[var(--text-0)] font-semibold">Create Webhook</strong>, assign channel target.</li>
                <li>Click <strong className="text-[var(--text-0)] font-semibold">Copy Webhook URL</strong> and paste into input above.</li>
              </ol>
            </div>
            <div className="px-5 py-3.5 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--bg-3)]">
              <button
                onClick={() => setIsWebhookModalOpen(false)}
                className="px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-2)] bg-transparent hover:bg-[var(--bg-4)] rounded-[var(--radius-sm)] cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyAndAddWebhook}
                disabled={isWebhookVerifying}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-sm)] disabled:opacity-50 cursor-pointer border-none"
              >
                {isWebhookVerifying ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spinner-anim" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: RAW JSON CODE VIEW/EDIT --- */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[rgba(0,0,0,0.65)] backdrop-blur-[3px]"
            onClick={() => setIsJsonModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-2)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] w-full max-w-[660px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-[17px] font-bold text-[var(--text-0)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--brand)]" />
                Raw JSON Schema Builder
              </h3>
              <button 
                onClick={() => setIsJsonModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-5)] text-[var(--text-3)] hover:text-[var(--text-0)] border-none bg-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3 text-left">
              <p className="text-xs text-[var(--text-3)] leading-relaxed">
                Directly paste, edit, or copy the Discord JSON payload parameters structure. Edits can be compiled and applied back to the canvas list items.
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                placeholder='{"version": "d2", "messages": [...] }'
                className="w-full min-h-[320px] bg-[var(--bg-0)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[#7ec8e3] outline-none focus:border-[var(--brand)] resize-y"
              />

              {jsonError && (
                <div className="text-[12px] text-[var(--danger)] bg-[rgba(242,63,66,0.1)] border border-[rgba(242,63,66,0.3)] rounded-[var(--radius-sm)] p-2.5 flex items-start gap-1.5 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 border-t border-[var(--border)] flex justify-between bg-[var(--bg-3)]">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText)
                    .then(() => showToast('Copied JSON payload code to clipboard!', 'success'));
                }}
                className="flex items-center gap-1 px-3.5 py-1.5 text-[13px] font-semibold text-[var(--brand-light)] hover:text-white hover:bg-[var(--bg-4)] rounded-[var(--radius-sm)] border-none bg-transparent cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsJsonModalOpen(false)}
                  className="px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-2)] bg-transparent hover:bg-[var(--bg-4)] rounded-[var(--radius-sm)] border-none cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleApplyJsonConfig}
                  className="px-4 py-1.5 text-[13px] font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-sm)] border-none cursor-pointer"
                >
                  Compile & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: DISPATCH SENT MODAL --- */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[rgba(0,0,0,0.65)] backdrop-blur-[3px]"
            onClick={() => { if (!isSendingInProgress) setIsSendModalOpen(false); }}
          />
          <div className="relative bg-[var(--bg-2)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] w-full max-w-[460px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-[17px] font-bold text-[var(--text-0)] flex items-center gap-2">
                <Send className="w-4.5 h-4.5 text-[var(--success)]" />
                Select Messages to Dispatch
              </h3>
              <button 
                onClick={() => { if (!isSendingInProgress) setIsSendModalOpen(false); }}
                disabled={isSendingInProgress}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-5)] text-[var(--text-3)] hover:text-[var(--text-0)] disabled:opacity-30 border-none bg-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3.5 text-left max-h-[360px] overflow-y-auto">
              <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                <p className="text-xs text-[var(--text-3)] leading-normal">
                  Verify message selection to send via webhook to channel <strong className="text-[var(--text-0)]">{webhook?.name}</strong>:
                </p>
                <div className="flex gap-2 items-center text-[11px] font-bold">
                  <button
                    type="button"
                    disabled={isSendingInProgress}
                    onClick={(e) => {
                      e.stopPropagation();
                      const allChecked: Record<string, boolean> = {};
                      messages.forEach(m => { allChecked[m.id] = true; });
                      setSelectedSendIds(allChecked);
                    }}
                    className="text-[var(--brand-light)] hover:text-white bg-transparent border-none cursor-pointer disabled:opacity-40"
                  >
                    Select All
                  </button>
                  <span className="text-[var(--text-4)] select-none">|</span>
                  <button
                    type="button"
                    disabled={isSendingInProgress}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSendIds({});
                    }}
                    className="text-[var(--text-3)] hover:text-white bg-transparent border-none cursor-pointer disabled:opacity-40"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {messages.map((m, mIdx) => {
                  const isChecked = selectedSendIds[m.id] ?? false;
                  const log = sendLogs[m.id];
                  const previewStr = m.content || (m.embeds.length ? `${m.embeds.length} embed panels` : 'Empty message queue');

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (isSendingInProgress) return;
                        setSelectedSendIds(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                      }}
                      className={`flex items-start gap-3 p-3 border rounded-[var(--radius-sm)] transition-colors ${
                        isSendingInProgress ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        isChecked 
                          ? 'border-[var(--brand)] bg-[rgba(88,101,242,0.08)]' 
                          : 'border-[var(--border)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isSendingInProgress}
                        onChange={() => {}} // Controlled by outer div click
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded mt-0.5 accent-[var(--brand)] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[13.5px] font-semibold text-[var(--text-0)]">
                            Message Queue {mIdx + 1}
                          </span>
                          
                          {/* Status indicators */}
                          {log?.status === 'sending' && (
                            <span className="text-xs text-[var(--warning)] flex items-center gap-1 font-semibold animate-pulse">
                              <span className="w-2.5 h-2.5 rounded-full border border-[var(--warning)] border-t-transparent spinner-anim flex-shrink-0" />
                              Sending
                            </span>
                          )}
                          {log?.status === 'ok' && (
                            <span className="text-xs text-[var(--success)] flex items-center gap-1 font-semibold">
                              ✓ Dispatched
                            </span>
                          )}
                          {log?.status === 'error' && (
                            <span className="text-xs text-[var(--danger)] flex items-center gap-1 font-semibold">
                              ⚠ Failed
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[var(--text-3)] truncate">{previewStr}</p>
                        
                        {log?.status === 'error' && log.detail && (
                          <div className="mt-1.5 p-1.5 rounded-[var(--radius-xs)] bg-[rgba(242,63,66,0.1)] border border-[rgba(242,63,66,0.2)] text-[11px] text-[var(--danger)] font-mono leading-relaxed break-words">
                            {log.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--bg-3)]">
              <button
                onClick={() => setIsSendModalOpen(false)}
                disabled={isSendingInProgress}
                className="px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-2)] bg-transparent hover:bg-[var(--bg-4)] disabled:opacity-45 rounded-[var(--radius-sm)] border-none cursor-pointer"
              >
                {isSendingInProgress ? 'Executing...' : 'Cancel'}
              </button>
              <button
                onClick={executeSendSelected}
                disabled={isSendingInProgress}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold text-white bg-[var(--success)] hover:bg-[var(--success-hover)] disabled:opacity-50 rounded-[var(--radius-sm)] cursor-pointer border-none shadow-sm"
              >
                {isSendingInProgress ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spinner-anim" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Dispatch Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: GRADIENT AVATAR BUILDER --- */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[rgba(0,0,0,0.65)] backdrop-blur-[3px]"
            onClick={() => setIsAvatarModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-2)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] w-full max-w-[420px] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-[17px] font-bold text-[var(--text-0)] flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-[var(--brand-light)]" />
                Gradient Avatar Generator
              </h3>
              <button 
                onClick={() => setIsAvatarModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-5)] text-[var(--text-3)] hover:text-[var(--text-0)] border-none bg-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-center">
              <p className="text-xs text-[var(--text-3)] leading-normal text-left">
                Design custom gradient avatars with stylized drop shadow effects, download as high-quality PNGs, then upload to image hosts like Imgur/Discord for override URLs!
              </p>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wide">
                  Avatar Initials / Letter (Max 2 chars)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={avatarLetter}
                  onChange={(e) => setAvatarLetter(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-center font-bold text-[var(--input-text)] outline-none focus:border-[var(--brand)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-left">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wide">
                    Gradient Start Color
                  </label>
                  <input
                    type="color"
                    value={avatarColorStart}
                    onChange={(e) => setAvatarColorStart(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] h-9 p-0.5 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wide">
                    Gradient End Color
                  </label>
                  <input
                    type="color"
                    value={avatarColorEnd}
                    onChange={(e) => setAvatarColorEnd(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] h-9 p-0.5 cursor-pointer"
                  />
                </div>
              </div>

              {/* Live HTML canvas renders in background */}
              <div className="my-3 flex justify-center">
                <canvas 
                  ref={avatarCanvasRef} 
                  width={256} 
                  height={256} 
                  className="w-32 h-32 rounded-full shadow-[var(--shadow-lg)]"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--bg-3)]">
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-2)] bg-transparent hover:bg-[var(--bg-4)] rounded-[var(--radius-sm)] border-none cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleDownloadAvatarPng}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-sm)] border-none cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download PNG File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: SAVED TEMPLATES & COMMUNITY PRESETS --- */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[rgba(0,0,0,0.65)] backdrop-blur-[3px]"
            onClick={() => setIsTemplatesModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-2)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] w-full max-w-[450px] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-[17px] font-bold text-[var(--text-0)] flex items-center gap-1.5">
                <Folder className="w-4.5 h-4.5 text-[var(--brand-light)]" />
                Templates & Presets
              </h3>
              <button 
                onClick={() => setIsTemplatesModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-5)] text-[var(--text-3)] hover:text-[var(--text-0)] border-none bg-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-3.5 text-left font-sans">
              {/* Tab Selector */}
              <div className="flex gap-1 bg-[var(--bg-1)] p-0.5 rounded-[var(--radius-sm)]">
                <button
                  onClick={() => setTemplateTab('saved')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-xs)] border-none cursor-pointer transition-all ${
                    templateTab === 'saved' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                  }`}
                >
                  My Templates ({templates.length})
                </button>
                <button
                  onClick={() => setTemplateTab('community')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-xs)] border-none cursor-pointer transition-all ${
                    templateTab === 'community' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                  }`}
                >
                  🎭 Presets
                </button>
                <button
                  onClick={() => setTemplateTab('history')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-xs)] border-none cursor-pointer transition-all ${
                    templateTab === 'history' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                  }`}
                >
                  📜 History ({dispatchHistory.length})
                </button>
              </div>

              {templateTab === 'saved' ? (
                <div className="flex flex-col gap-4 animate-fade-in">
                  {/* Save current config builder */}
                  <div className="bg-[var(--bg-3)] border border-[var(--border)] p-3 rounded-[var(--radius)] flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider block">
                      Save Current Workspace Layout
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={50}
                        value={templateNameInput}
                        onChange={(e) => setTemplateNameInput(e.target.value)}
                        placeholder="E.g., Welcome Announcement"
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)] placeholder-[var(--input-placeholder)]"
                      />
                      <button
                        onClick={handleSaveCurrentAsTemplate}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-sm)] border-none cursor-pointer whitespace-nowrap"
                      >
                        💾 Save Layout
                      </button>
                    </div>
                  </div>

                  {/* Template list directory */}
                  <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto mt-1">
                    <span className="text-[11px] font-bold text-[var(--text-4)] uppercase tracking-wider">
                      Select Template to Load ({templates.length})
                    </span>

                    {templates.length === 0 ? (
                      <p className="text-center text-xs text-[var(--text-4)] py-6 bg-[rgba(255,255,255,0.01)] border border-dashed border-[var(--border)] rounded-[var(--radius-sm)] select-none">
                        No custom saved templates yet. Create one above!
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {templates.map(t => (
                          <div
                            key={t.id}
                            onClick={() => handleLoadTemplate(t)}
                            className="flex items-center justify-between p-2.5 bg-[var(--bg-3)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-[var(--radius)] cursor-pointer hover:bg-[var(--bg-4)] transition-colors group/item select-none"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[var(--text-0)] truncate pr-1">
                                {t.name}
                              </p>
                              <span className="text-[10px] text-[var(--text-4)] block">
                                Saved on {new Date(t.savedAt).toLocaleDateString()} at {new Date(t.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteTemplate(t.id, e)}
                              className="w-6 h-6 flex items-center justify-center bg-transparent hover:bg-[rgba(242,63,66,0.15)] text-[var(--text-4)] hover:text-[var(--danger)] border-none rounded-[var(--radius-xs)] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Import/Export Workspace File */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={handleExportWorkspace}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[var(--text-1)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)] border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer"
                    >
                      📤 Export File (.json)
                    </button>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[var(--text-1)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)] border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer text-center">
                      📥 Import File (.json)
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportWorkspace}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : templateTab === 'community' ? (
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 animate-fade-in">
                  <span className="text-[11px] font-bold text-[var(--text-4)] uppercase tracking-wider block mb-1">
                    Premium Discord Layout Presets
                  </span>

                  {/* Rules Preset */}
                  <div 
                    onClick={() => handleLoadCommunityPreset('rules')}
                    className="p-3 bg-[var(--bg-3)] border border-[var(--border)] hover:border-[var(--brand)] rounded-[var(--radius)] cursor-pointer hover:bg-[var(--bg-4)] transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">📜 Rules & Server Guidelines</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--success)] text-white rounded-full">Highly Recommended</span>
                    </div>
                    <p className="text-xs text-[var(--text-3)] leading-relaxed">
                      Elegant rules sheet structured with custom green borders, markdown emphasis list, and cooperations block.
                    </p>
                  </div>

                  {/* System Status Alert Preset */}
                  <div 
                    onClick={() => handleLoadCommunityPreset('status')}
                    className="p-3 bg-[var(--bg-3)] border border-[var(--border)] hover:border-[var(--brand)] rounded-[var(--radius)] cursor-pointer hover:bg-[var(--bg-4)] transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">⚠️ Service Operations Alert</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--warning)] text-white rounded-full">Operations</span>
                    </div>
                    <p className="text-xs text-[var(--text-3)] leading-relaxed">
                      Operational incident status report featuring Degraded Database alerts, metadata fields and a Status link button.
                    </p>
                  </div>

                  {/* Community Event Invite Preset */}
                  <div 
                    onClick={() => handleLoadCommunityPreset('gaming')}
                    className="p-3 bg-[var(--bg-3)] border border-[var(--border)] hover:border-[var(--brand)] rounded-[var(--radius)] cursor-pointer hover:bg-[var(--bg-4)] transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">🎮 Friday Community Gaming Night</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--brand-light)] text-white rounded-full">Interactive Event</span>
                    </div>
                    <p className="text-xs text-[var(--text-3)] leading-relaxed">
                      Premium Friday night community gaming card featuring event scheduling, customized rich banner image, and RSVP buttons.
                    </p>
                  </div>

                  {/* Support Ticket Desk Preset */}
                  <div 
                    onClick={() => handleLoadCommunityPreset('support')}
                    className="p-3 bg-[var(--bg-3)] border border-[var(--border)] hover:border-[var(--brand)] rounded-[var(--radius)] cursor-pointer hover:bg-[var(--bg-4)] transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">🎫 Support Helpdesk Portal</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--success)] text-white rounded-full">Moderation</span>
                    </div>
                    <p className="text-xs text-[var(--text-3)] leading-relaxed">
                      Official helpdesk portal embedding operational hours, quick guideline lists, and styled green Support buttons.
                    </p>
                  </div>

                  {/* Mega Community Giveaway Preset */}
                  <div 
                    onClick={() => handleLoadCommunityPreset('giveaway')}
                    className="p-3 bg-[var(--bg-3)] border border-[var(--border)] hover:border-[var(--brand)] rounded-[var(--radius)] cursor-pointer hover:bg-[var(--bg-4)] transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text-1)]">🎉 Mega Milestone Giveaway</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#f47fff] text-white rounded-full">Giveaway</span>
                    </div>
                    <p className="text-xs text-[var(--text-3)] leading-relaxed">
                      Milestone reward announcement layout containing prize descriptions, entrant stats, countdown timers, and premium interactive action buttons.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 animate-fade-in">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[var(--text-4)] uppercase tracking-wider block">
                      Dispatched Webhooks History Log
                    </span>
                    {dispatchHistory.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete all send history logs?')) {
                            setDispatchHistory([]);
                            localStorage.removeItem('wp_history');
                            showToast('Cleared dispatch history log.', 'info');
                          }
                        }}
                        className="text-[11px] text-[var(--danger)] hover:underline border-none bg-transparent cursor-pointer font-bold font-sans"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {dispatchHistory.length === 0 ? (
                    <div className="text-center py-10 text-xs text-[var(--text-4)] bg-[var(--bg-3)] border border-dashed border-[var(--border)] rounded-[var(--radius-sm)] flex flex-col items-center justify-center gap-2 select-none">
                      <Clock className="w-8 h-8 text-[var(--text-4)] opacity-50" />
                      <p className="font-semibold">No dispatches recorded yet.</p>
                      <p className="text-[10px] max-w-[220px] leading-normal">
                        Send messages using your webhooks, and secure snapshots will be stored here for easy recovery!
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {dispatchHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-[var(--bg-3)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-[var(--radius)] flex flex-col gap-1.5 text-xs transition-colors group/history"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--text-1)] flex items-center gap-1.5">
                              {item.status === 'success' ? (
                                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
                              )}
                              Dispatched {item.messageCount} Message{item.messageCount > 1 ? 's' : ''}
                            </span>
                            <span className="text-[10px] text-[var(--text-4)] font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>

                          <div className="text-[11px] text-[var(--text-3)] bg-[var(--bg-1)] p-1.5 rounded-[var(--radius-xs)] border border-[var(--border)] leading-relaxed truncate">
                            <span className="font-mono text-[10px] uppercase text-[var(--text-4)] mr-1">Bots:</span>
                            {item.payloadSummary}
                          </div>

                          <div className="flex gap-1.5 justify-end items-center mt-1 pt-1.5 border-t border-[rgba(255,255,255,0.03)]">
                            <button
                              onClick={() => {
                                setMessages(item.messagesSnapshot);
                                showToast('Restored full message snapshot from dispatch history!', 'success');
                                setIsTemplatesModalOpen(false);
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-[var(--brand-light)] bg-[rgba(88,101,242,0.1)] hover:bg-[rgba(88,101,242,0.18)] rounded-[var(--radius-xs)] border-none cursor-pointer transition-colors"
                            >
                              Restore Layout
                            </button>
                            <button
                              onClick={() => {
                                setDispatchHistory(prev => {
                                  const filtered = prev.filter(h => h.id !== item.id);
                                  localStorage.setItem('wp_history', JSON.stringify(filtered));
                                  return filtered;
                                });
                                showToast('Deleted history log item.', 'info');
                              }}
                              className="p-1 text-[var(--text-4)] hover:text-[var(--danger)] bg-transparent hover:bg-[rgba(242,63,66,0.1)] rounded-[var(--radius-xs)] border-none cursor-pointer transition-colors"
                              title="Delete history entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-5 py-3.5 border-t border-[var(--border)] flex justify-end bg-[var(--bg-3)]">
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="px-4 py-1.5 text-[13px] font-semibold text-[var(--text-1)] bg-[var(--bg-4)] hover:bg-[var(--bg-5)] rounded-[var(--radius-sm)] border-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 6: IMPORT RAW DISCORD JSON --- */}
      {isImportRawModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[rgba(0,0,0,0.65)] backdrop-blur-[3px]"
            onClick={() => setIsImportRawModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-2)] border border-[var(--border-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] w-full max-w-[550px] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-[17px] font-bold text-[var(--text-0)] flex items-center gap-1.5">
                <Braces className="w-4.5 h-4.5 text-[var(--brand-light)]" />
                Nhập Raw Discord Message JSON
              </h3>
              <button 
                onClick={() => setIsImportRawModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-5)] text-[var(--text-3)] hover:text-[var(--text-0)] border-none bg-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4 text-left font-sans">
              <p className="text-xs text-[var(--text-3)] leading-relaxed">
                Dán chuỗi dữ liệu JSON thô của tin nhắn Discord (nhận từ webhook, API hoặc các plugin client thô của Discord như Vencord). Hệ thống sẽ tự động chuyển đổi các trường dữ liệu, embeds, tác giả và các component tùy biến thành mẫu có thể chỉnh sửa và gửi đi.
              </p>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-4)] uppercase tracking-wider">
                  Nội dung JSON raw
                </label>
                <textarea
                  value={rawJsonInput}
                  onChange={(e) => setRawJsonInput(e.target.value)}
                  placeholder='Ví dụ: &#10;{&#10;  "content": "Hello World",&#10;  "embeds": [...],&#10;  "author": { "username": "Bot" }&#10;}'
                  rows={10}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] p-3 text-xs text-[var(--input-text)] font-mono outline-none focus:border-[var(--brand)] placeholder-[var(--input-placeholder)] resize-none"
                />
              </div>

              {rawJsonError && (
                <div className="flex items-start gap-2 p-3 bg-[rgba(242,63,66,0.1)] border border-[rgba(242,63,66,0.2)] rounded-[var(--radius-sm)] text-[11px] text-[var(--danger)]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="leading-normal">{rawJsonError}</span>
                </div>
              )}
            </div>
            
            <div className="px-5 py-3.5 border-t border-[var(--border)] flex justify-end gap-2 bg-[var(--bg-3)]">
              <button
                onClick={() => setIsImportRawModalOpen(false)}
                className="px-4 py-1.5 text-[13px] font-semibold text-[var(--text-2)] bg-[var(--bg-4)] hover:bg-[var(--bg-5)] hover:text-[var(--text-0)] rounded-[var(--radius-sm)] border-none cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleImportRawJSON}
                className="px-4 py-1.5 text-[13px] font-bold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-sm)] border-none cursor-pointer transition-colors"
              >
                Nhập Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIVE TOAST FLYOUT CONTAINER SYSTEM --- */}
      <div id="toastContainer" className="fixed bottom-6 right-6 z-150 flex flex-col gap-2 pointer-events-none select-none max-w-[340px] w-full">
        {toasts.map(t => {
          const typeClasses = {
            success: 'border-l-4 border-[var(--success)]',
            error: 'border-l-4 border-[var(--danger)]',
            info: 'border-l-4 border-[var(--brand)]',
            warning: 'border-l-4 border-[var(--warning)]'
          };

          return (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 p-3.5 bg-[var(--bg-3)] border border-[var(--border-strong)] rounded-[var(--radius)] shadow-[var(--shadow-lg)] text-xs font-semibold text-[var(--text-0)] pointer-events-auto animate-slide-in ${(t as any).isOut ? 'animate-slide-out' : ''} ${typeClasses[t.type] || typeClasses.info}`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--success)] flex-shrink-0 mt-0.5" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-[var(--brand-light)] flex-shrink-0 mt-0.5" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />}
              <span className="leading-normal">{t.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
