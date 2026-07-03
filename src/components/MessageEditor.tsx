import React, { useState } from 'react';
import { DiscordMessage, Embed, EmbedField, ActionRow, ButtonComponent, ButtonStyle } from '../types';
import { 
  Plus, Copy, Trash2, ChevronDown, Image, Sparkles, User, FileText, LayoutGrid, Palette, X, AlertTriangle,
  Calendar, Hash, Clock, Wrench, Check, ArrowUp, ArrowDown, Code, ChevronsDown, ChevronsUp
} from 'lucide-react';
import { 
  createDefaultEmbed, createDefaultField, createDefaultActionRow, createDefaultButton, genId, getMessageCharacterCount,
  buildDiscordPayload, parseDiscordPayload
} from '../utils';

interface MarkdownToolbarProps {
  onInsert: (tagStart: string, tagEnd?: string) => void;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onInsert }) => {
  const [showEmojis, setShowEmojis] = useState(false);
  const emojis = ['👋', '📜', '📢', '🎫', '⚠️', '✅', '❌', '🎮', '🚀', '✨', '🔥', '📌', '🔒', '💖', '🎁', '💎', '🎨', '⚙️', '💬', '🎉'];

  return (
    <div className="flex flex-col gap-1 mb-1.5 select-none relative">
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-4)] rounded-[var(--radius-xs)] border border-[var(--border)] max-w-max select-none">
        <button
          type="button"
          onClick={() => onInsert('**', '**')}
          title="Bold (**text**)"
          className="px-2 py-1 text-xs font-extrabold hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => onInsert('*', '*')}
          title="Italic (*text*)"
          className="px-2 py-1 text-xs italic font-semibold hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => onInsert('__', '__')}
          title="Underline (__text__)"
          className="px-2 py-1 text-xs underline hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => onInsert('~~', '~~')}
          title="Strikethrough (~~text~~)"
          className="px-2 py-1 text-xs line-through hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          S
        </button>
        <span className="w-[1px] h-3 bg-[var(--border-strong)] mx-0.5" />
        <button
          type="button"
          onClick={() => onInsert('`', '`')}
          title="Inline Code (`code`)"
          className="px-2 py-1 text-xs font-mono hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          onClick={() => onInsert('```\n', '\n```')}
          title="Code Block"
          className="px-1.5 py-1 text-xs font-mono hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          Code
        </button>
        <button
          type="button"
          onClick={() => onInsert('> ', '')}
          title="Blockquote"
          className="px-2 py-1 text-xs font-serif hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          ”
        </button>
        <button
          type="button"
          onClick={() => onInsert('[', '](url)')}
          title="Link ([title](url))"
          className="px-1.5 py-1 text-xs hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none bg-transparent cursor-pointer transition-colors text-[var(--text-2)]"
        >
          Link
        </button>
        <span className="w-[1px] h-3 bg-[var(--border-strong)] mx-0.5" />
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          title="Insert Emojis"
          className={`px-2 py-1 text-xs hover:bg-[var(--bg-5)] hover:text-white rounded-[var(--radius-xs)] border-none cursor-pointer transition-colors flex items-center gap-1 ${
            showEmojis ? 'bg-[var(--bg-5)] text-white' : 'bg-transparent text-[var(--text-2)]'
          }`}
        >
          😊 Emojis
        </button>
      </div>

      {showEmojis && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowEmojis(false)} 
          />
          <div className="absolute top-[32px] left-0 mt-1 p-2 bg-[var(--bg-3)] border border-[var(--border-strong)] rounded-[var(--radius-sm)] flex gap-1 flex-wrap max-w-[210px] z-50 shadow-[var(--shadow-lg)] animate-slide-down">
            {emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onInsert(emoji, '');
                  setShowEmojis(false);
                }}
                className="w-7 h-7 flex items-center justify-center text-sm rounded-[var(--radius-xs)] hover:bg-[var(--bg-5)] border-none bg-transparent cursor-pointer transition-all active:scale-90 hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface MessageEditorProps {
  messages: DiscordMessage[];
  onUpdateMessages: (updated: DiscordMessage[]) => void;
  onOpenAvatarGen: () => void;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  messages,
  onUpdateMessages,
  onOpenAvatarGen,
}) => {
  // Store expanded/collapsed state for messages
  const [collapsedMessages, setCollapsedMessages] = useState<Record<string, boolean>>({});
  // Store active tab per message (content, profile, embeds, components, json)
  const [activeTabs, setActiveTabs] = useState<Record<string, 'content' | 'profile' | 'embeds' | 'components' | 'json'>>({});
  // Store expanded/collapsed state for embeds
  const [collapsedEmbeds, setCollapsedEmbeds] = useState<Record<string, boolean>>({});
  // Local JSON text edit buffers and errors
  const [localJsonTexts, setLocalJsonTexts] = useState<Record<string, string>>({});
  const [jsonErrorTexts, setJsonErrorTexts] = useState<Record<string, string>>({});

  // --- Discord Special Formatting Helper Toolkit States ---
  const [isHelperExpanded, setIsHelperExpanded] = useState(false);
  const [helperDate, setHelperDate] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const offset = d.getTimezoneOffset();
    const adjusted = new Date(d.getTime() - offset * 60 * 1000);
    return adjusted.toISOString().slice(0, 16);
  });
  const [helperTimeFormat, setHelperTimeFormat] = useState<'R' | 'F' | 'd' | 'D' | 't' | 'T'>('R');
  const [helperMentionType, setHelperMentionType] = useState<'user' | 'channel' | 'role'>('user');
  const [helperMentionId, setHelperMentionId] = useState('');
  const [copiedTimestamp, setCopiedTimestamp] = useState(false);
  const [copiedMention, setCopiedMention] = useState(false);
  const [copiedPresetIndex, setCopiedPresetIndex] = useState<number | null>(null);

  const getTimestampTag = () => {
    const localDate = new Date(helperDate);
    const unix = Math.floor(localDate.getTime() / 1000) || 0;
    return `<t:${unix}:${helperTimeFormat}>`;
  };

  const getMentionTag = () => {
    const cleanId = helperMentionId.trim() || '123456789012345678';
    if (helperMentionType === 'channel') return `<#${cleanId}>`;
    if (helperMentionType === 'role') return `<@&${cleanId}>`;
    return `<@${cleanId}>`;
  };

  const handleCopyTag = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleMessageCollapse = (id: string) => {
    setCollapsedMessages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getMessageWarnings = (msg: DiscordMessage) => {
    const stats = getMessageCharacterCount(msg);
    const warnings: string[] = [];
    
    if (!msg.content && msg.embeds.length === 0) {
      warnings.push("Message is empty. Add message content or at least one embed to dispatch.");
    }
    
    if (stats.content > 2000) {
      warnings.push(`Message content exceeds 2000 characters limit (currently ${stats.content}).`);
    }
    
    if (msg.embeds.length > 10) {
      warnings.push(`Message has ${msg.embeds.length} embeds (Discord limit is 10).`);
    }
    
    msg.embeds.forEach((emb, eIdx) => {
      if (emb.title && emb.title.length > 256) {
        warnings.push(`Embed ${eIdx + 1} title exceeds 256 characters.`);
      }
      if (emb.description && emb.description.length > 4096) {
        warnings.push(`Embed ${eIdx + 1} description exceeds 4096 characters.`);
      }
      if (emb.fields.length > 25) {
        warnings.push(`Embed ${eIdx + 1} has ${emb.fields.length} fields (Discord limit is 25).`);
      }
      emb.fields.forEach((fld, fIdx) => {
        if (!fld.name.trim() && fld.value.trim()) {
          warnings.push(`Embed ${eIdx + 1} Field ${fIdx + 1} is missing a name.`);
        }
        if (fld.name.trim() && !fld.value.trim()) {
          warnings.push(`Embed ${eIdx + 1} Field ${fIdx + 1} is missing a value.`);
        }
        if (fld.name && fld.name.length > 256) {
          warnings.push(`Embed ${eIdx + 1} Field ${fIdx + 1} name exceeds 256 characters.`);
        }
        if (fld.value && fld.value.length > 1024) {
          warnings.push(`Embed ${eIdx + 1} Field ${fIdx + 1} value exceeds 1024 characters.`);
        }
      });
      if (emb.footerText && emb.footerText.length > 2048) {
        warnings.push(`Embed ${eIdx + 1} footer text exceeds 2048 characters.`);
      }
      if (emb.authorName && emb.authorName.length > 256) {
        warnings.push(`Embed ${eIdx + 1} author name exceeds 256 characters.`);
      }
    });
    
    if (stats.embedsTotal > 6000) {
      warnings.push(`Total embeds character length is ${stats.embedsTotal}/6000 (Discord limit is 6000).`);
    }
    
    if (msg.components.length > 5) {
      warnings.push(`Message has ${msg.components.length} Action Rows (Discord limit is 5).`);
    }
    msg.components.forEach((row, rIdx) => {
      if (row.buttons.length > 5) {
        warnings.push(`Action Row ${rIdx + 1} has ${row.buttons.length} buttons (Discord limit is 5).`);
      }
      row.buttons.forEach((btn, bIdx) => {
        if (btn.style === 5 && !btn.url.trim()) {
          warnings.push(`Action Row ${rIdx + 1} Button ${bIdx + 1} (Link style) is missing a destination URL.`);
        }
      });
    });
    
    return warnings;
  };

  const getMessageActiveTab = (msgId: string) => {
    return activeTabs[msgId] || 'content';
  };

  const setMessageActiveTab = (msgId: string, tab: 'content' | 'profile' | 'embeds' | 'components' | 'json') => {
    setActiveTabs(prev => ({ ...prev, [msgId]: tab }));
  };

  const handleSelectJsonTab = (msg: DiscordMessage) => {
    setMessageActiveTab(msg.id, 'json');
    if (!localJsonTexts[msg.id]) {
      setLocalJsonTexts(prev => ({
        ...prev,
        [msg.id]: JSON.stringify(buildDiscordPayload(msg, null), null, 2)
      }));
    }
  };

  const handleApplyMessageJson = (msgId: string) => {
    const text = localJsonTexts[msgId];
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      const updatedMsg = parseDiscordPayload(parsed, msgId);
      onUpdateMessages(messages.map(m => m.id === msgId ? updatedMsg : m));
      setJsonErrorTexts(prev => ({ ...prev, [msgId]: '' }));
    } catch (err: any) {
      setJsonErrorTexts(prev => ({ ...prev, [msgId]: err.message || 'Invalid JSON syntax' }));
    }
  };

  const toggleEmbedCollapse = (embedId: string) => {
    setCollapsedEmbeds(prev => ({ ...prev, [embedId]: !prev[embedId] }));
  };

  const handleInsertMarkdown = (msgId: string, field: 'content' | 'description', tagStart: string, tagEnd = tagStart, embedId?: string) => {
    const activeEl = document.activeElement as HTMLTextAreaElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      const text = activeEl.value;
      const selected = text.substring(start, end);
      const replacement = tagStart + (selected || '') + tagEnd;
      const newValue = text.substring(0, start) + replacement + text.substring(end);
      
      if (embedId) {
        updateEmbedField(msgId, embedId, field as keyof Embed, newValue);
      } else {
        updateMessageField(msgId, field as keyof DiscordMessage, newValue);
      }
      
      setTimeout(() => {
        activeEl.focus();
        activeEl.setSelectionRange(start + tagStart.length, start + tagStart.length + (selected || '').length);
      }, 0);
    } else {
      if (embedId) {
        const msgObj = messages.find(m => m.id === msgId);
        const emb = msgObj?.embeds.find(e => e.id === embedId);
        if (emb) {
          const current = (emb as any)[field] || '';
          updateEmbedField(msgId, embedId, field as keyof Embed, current + tagStart + tagEnd);
        }
      } else {
        const msgObj = messages.find(m => m.id === msgId);
        if (msgObj) {
          const current = (msgObj as any)[field] || '';
          updateMessageField(msgId, field as keyof DiscordMessage, current + tagStart + tagEnd);
        }
      }
    }
  };

  // --- Core CRUD Message actions ---
  const addMessage = () => {
    const newMessage: DiscordMessage = {
      id: genId(),
      content: '',
      username: '',
      avatarUrl: '',
      embeds: [],
      components: [],
    };
    onUpdateMessages([...messages, newMessage]);
    
    // Auto-focus/expand new message
    setCollapsedMessages(prev => ({ ...prev, [newMessage.id]: false }));
    setMessageActiveTab(newMessage.id, 'content');
  };

  const deleteMessage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateMessages(messages.filter(m => m.id !== id));
  };

  const duplicateMessage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIdx = messages.findIndex(m => m.id === id);
    if (targetIdx === -1) return;
    
    const original = messages[targetIdx];
    const clone: DiscordMessage = {
      ...JSON.parse(JSON.stringify(original)),
      id: genId()
    };
    
    // Regenerate unique IDs for child structures to prevent React key collision
    clone.embeds = clone.embeds.map(emb => ({
      ...emb,
      id: genId(),
      fields: emb.fields.map(fld => ({ ...fld, id: genId() }))
    }));
    clone.components = clone.components.map(row => ({
      ...row,
      id: genId(),
      buttons: row.buttons.map(btn => ({ ...btn, id: genId() }))
    }));

    const updated = [...messages];
    updated.splice(targetIdx + 1, 0, clone);
    onUpdateMessages(updated);
    
    setCollapsedMessages(prev => ({ ...prev, [clone.id]: false }));
  };

  const handleExpandAll = () => {
    const states: Record<string, boolean> = {};
    messages.forEach(msg => {
      states[msg.id] = false;
    });
    setCollapsedMessages(states);
  };

  const handleCollapseAll = () => {
    const states: Record<string, boolean> = {};
    messages.forEach(msg => {
      states[msg.id] = true;
    });
    setCollapsedMessages(states);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all messages from the current queue? This will reset the workspace with 1 empty message.')) {
      onUpdateMessages([
        {
          id: genId(),
          content: '',
          username: '',
          avatarUrl: '',
          embeds: [],
          components: []
        }
      ]);
    }
  };

  const updateMessageField = (msgId: string, field: keyof DiscordMessage, value: any) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  // --- Embed management ---
  const addEmbed = (msgId: string) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        if (m.embeds.length >= 10) return m;
        const newEmb = createDefaultEmbed();
        // Expand the new embed by default
        setCollapsedEmbeds(prev => ({ ...prev, [newEmb.id]: false }));
        return { ...m, embeds: [...m.embeds, newEmb] };
      }
      return m;
    }));
  };

  const deleteEmbed = (msgId: string, embedId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return { ...m, embeds: m.embeds.filter(emb => emb.id !== embedId) };
      }
      return m;
    }));
  };

  const updateEmbedField = (msgId: string, embedId: string, field: keyof Embed, value: any) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          embeds: m.embeds.map(emb => {
            if (emb.id === embedId) {
              return { ...emb, [field]: value };
            }
            return emb;
          })
        };
      }
      return m;
    }));
  };

  // --- Embed Fields management ---
  const addEmbedField = (msgId: string, embedId: string) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          embeds: m.embeds.map(emb => {
            if (emb.id === embedId) {
              if (emb.fields.length >= 25) return emb;
              return { ...emb, fields: [...emb.fields, createDefaultField()] };
            }
            return emb;
          })
        };
      }
      return m;
    }));
  };

  const deleteEmbedField = (msgId: string, embedId: string, fieldId: string) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          embeds: m.embeds.map(emb => {
            if (emb.id === embedId) {
              return { ...emb, fields: emb.fields.filter(fld => fld.id !== fieldId) };
            }
            return emb;
          })
        };
      }
      return m;
    }));
  };

  const updateEmbedFieldItem = (msgId: string, embedId: string, fieldId: string, key: keyof EmbedField, value: any) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          embeds: m.embeds.map(emb => {
            if (emb.id === embedId) {
              return {
                ...emb,
                fields: emb.fields.map(fld => {
                  if (fld.id === fieldId) {
                    return { ...fld, [key]: value };
                  }
                  return fld;
                })
              };
            }
            return emb;
          })
        };
      }
      return m;
    }));
  };

  const moveEmbedField = (msgId: string, embedId: string, fieldId: string, direction: 'up' | 'down') => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          embeds: m.embeds.map(emb => {
            if (emb.id === embedId) {
              const idx = emb.fields.findIndex(f => f.id === fieldId);
              if (idx === -1) return emb;
              const newFields = [...emb.fields];
              if (direction === 'up' && idx > 0) {
                [newFields[idx], newFields[idx - 1]] = [newFields[idx - 1], newFields[idx]];
              } else if (direction === 'down' && idx < newFields.length - 1) {
                [newFields[idx], newFields[idx + 1]] = [newFields[idx + 1], newFields[idx]];
              }
              return { ...emb, fields: newFields };
            }
            return emb;
          })
        };
      }
      return m;
    }));
  };

  const duplicateEmbedField = (msgId: string, embedId: string, fieldId: string) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          embeds: m.embeds.map(emb => {
            if (emb.id === embedId) {
              if (emb.fields.length >= 25) return emb;
              const idx = emb.fields.findIndex(f => f.id === fieldId);
              if (idx === -1) return emb;
              const original = emb.fields[idx];
              const clone: EmbedField = {
                ...original,
                id: genId()
              };
              const newFields = [...emb.fields];
              newFields.splice(idx + 1, 0, clone);
              return { ...emb, fields: newFields };
            }
            return emb;
          })
        };
      }
      return m;
    }));
  };

  // --- Component Actions Rows management ---
  const addActionRow = (msgId: string) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        if (m.components.length >= 5) return m;
        return { ...m, components: [...m.components, createDefaultActionRow()] };
      }
      return m;
    }));
  };

  const deleteActionRow = (msgId: string, rowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return { ...m, components: m.components.filter(row => row.id !== rowId) };
      }
      return m;
    }));
  };

  const addButtonToRow = (msgId: string, rowId: string) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          components: m.components.map(row => {
            if (row.id === rowId) {
              if (row.buttons.length >= 5) return row;
              return { ...row, buttons: [...row.buttons, createDefaultButton()] };
            }
            return row;
          })
        };
      }
      return m;
    }));
  };

  const deleteButtonFromRow = (msgId: string, rowId: string, btnId: string) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          components: m.components.map(row => {
            if (row.id === rowId) {
              return { ...row, buttons: row.buttons.filter(btn => btn.id !== btnId) };
            }
            return row;
          })
        };
      }
      return m;
    }));
  };

  const updateButtonField = (msgId: string, rowId: string, btnId: string, field: keyof ButtonComponent, value: any) => {
    onUpdateMessages(messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          components: m.components.map(row => {
            if (row.id === rowId) {
              return {
                ...row,
                buttons: row.buttons.map(btn => {
                  if (btn.id === btnId) {
                    return { ...btn, [field]: value };
                  }
                  return btn;
                })
              };
            }
            return row;
          })
        };
      }
      return m;
    }));
  };

  return (
    <div className="flex flex-col gap-3.5 pb-20 select-none">
      {/* --- PREMIUM COMPACT DISCORD FORMATTING TOOLKIT CARD --- */}
      <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden transition-all duration-[var(--normal)] flex flex-col mb-2">
        {/* Header Toggle */}
        <div
          onClick={() => setIsHelperExpanded(!isHelperExpanded)}
          className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--bg-3)] border-b border-[var(--border)] cursor-pointer select-none hover:bg-[var(--bg-4)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-[17px] h-[17px] text-[var(--brand-light)]" />
            <span className="text-[13px] font-bold text-[var(--text-1)]">
              Discord Special Formatting Toolkit
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-4)] bg-[var(--bg-1)] px-1.5 py-0.5 rounded-[var(--radius-xs)]">
              Mentions & Timestamps
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-3)] transition-transform duration-[var(--normal)] ${
                isHelperExpanded ? '' : '-rotate-90'
              }`}
            />
          </div>
        </div>

        {isHelperExpanded && (
          <div className="p-4 bg-transparent border-t border-[rgba(255,255,255,0.02)] flex flex-col gap-4 text-left animate-slide-down">
            {/* Two-Column Grid: Left for Timestamps, Right for Mentions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. Dynamic Timestamp Formatter */}
              <div className="flex flex-col gap-2.5 p-3.5 bg-[var(--bg-3)] border border-[var(--border)] rounded-[var(--radius)]">
                <span className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--brand-light)]" />
                  Interactive Timestamp Generator
                </span>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[var(--text-4)] uppercase">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    value={helperDate}
                    onChange={(e) => setHelperDate(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[var(--text-4)] uppercase">Display Format Style</label>
                  <select
                    value={helperTimeFormat}
                    onChange={(e: any) => setHelperTimeFormat(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)]"
                  >
                    <option value="R">Relative Time (e.g., "in 5 minutes", "2 hours ago")</option>
                    <option value="F">Long Date/Time (e.g., "Thursday, July 2, 2026 10:30 PM")</option>
                    <option value="f">Short Date/Time (e.g., "July 2, 2026 10:30 PM")</option>
                    <option value="D">Long Date (e.g., "July 2, 2026")</option>
                    <option value="d">Short Date (e.g., "07/02/2026")</option>
                    <option value="T">Long Time (e.g., "10:30:00 PM")</option>
                    <option value="t">Short Time (e.g., "10:30 PM")</option>
                  </select>
                </div>

                {/* Real-time Tag Code Display */}
                <div className="mt-1 flex flex-col gap-1 bg-[var(--bg-1)] border border-[var(--border)] p-2 rounded-[var(--radius-xs)]">
                  <span className="text-[9px] font-extrabold uppercase text-[var(--text-4)] tracking-wide">Ready-To-Paste Tag</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[var(--success)] truncate">{getTimestampTag()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyTag(getTimestampTag());
                        setCopiedTimestamp(true);
                        setTimeout(() => setCopiedTimestamp(false), 1500);
                      }}
                      className="px-2 py-1 text-[10px] font-bold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-xs)] border-none cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      {copiedTimestamp ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-white" />
                          Copy Tag
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Interactive Mention Generator */}
              <div className="flex flex-col gap-2.5 p-3.5 bg-[var(--bg-3)] border border-[var(--border)] rounded-[var(--radius)]">
                <span className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider block flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-[var(--brand-light)]" />
                  Smart Mentions Builder
                </span>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[var(--text-4)] uppercase">Mention Type</label>
                  <div className="grid grid-cols-3 gap-1 p-0.5 bg-[var(--bg-1)] rounded-[var(--radius-xs)] border border-[var(--border)]">
                    {(['user', 'channel', 'role'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setHelperMentionType(type)}
                        className={`py-1 text-[10px] font-bold uppercase rounded-[var(--radius-xs)] border-none cursor-pointer transition-colors ${
                          helperMentionType === type
                            ? 'bg-[var(--bg-4)] text-[var(--text-0)] font-extrabold shadow-sm'
                            : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[var(--text-4)] uppercase">ID (Snowflake)</label>
                  <input
                    type="text"
                    maxLength={22}
                    value={helperMentionId}
                    onChange={(e) => setHelperMentionId(e.target.value.replace(/\D/g, ''))}
                    placeholder="E.g., 112233445566778899"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--input-text)] font-mono outline-none focus:border-[var(--brand)] placeholder-[var(--input-placeholder)]"
                  />
                </div>

                {/* Quick Mention Presets */}
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-[var(--text-4)] uppercase select-none">Quick Role/Tag Presets</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '@everyone', tag: '@everyone' },
                      { label: '@here', tag: '@here' },
                      { label: '🛡️ Admin Role', tag: '<@&1234567890>' },
                      { label: '💬 Lounge Chat', tag: '<#1234567890>' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleCopyTag(preset.tag);
                          setCopiedPresetIndex(idx);
                          setTimeout(() => setCopiedPresetIndex(null), 1500);
                        }}
                        className="px-2 py-1 text-[10.5px] font-medium text-[var(--text-2)] hover:text-white bg-[var(--bg-1)] hover:bg-[var(--bg-4)] border border-[var(--border)] rounded-[var(--radius-xs)] cursor-pointer transition-all flex items-center gap-1 select-none"
                      >
                        {copiedPresetIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--success)]" />
                            Copied!
                          </>
                        ) : (
                          <span>{preset.label}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time Mention Tag Display */}
                <div className="mt-1 flex flex-col gap-1 bg-[var(--bg-1)] border border-[var(--border)] p-2 rounded-[var(--radius-xs)]">
                  <span className="text-[9px] font-extrabold uppercase text-[var(--text-4)] tracking-wide">Ready-To-Paste Tag</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[var(--success)] truncate">{getMentionTag()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyTag(getMentionTag());
                        setCopiedMention(true);
                        setTimeout(() => setCopiedMention(false), 1500);
                      }}
                      className="px-2 py-1 text-[10px] font-bold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-xs)] border-none cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      {copiedMention ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-white" />
                          Copy Tag
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
            
            <p className="text-[10.5px] text-[var(--text-4)] italic leading-relaxed text-center border-t border-[rgba(255,255,255,0.02)] pt-2.5">
              💡 Copy any formatted tag above and paste it directly into your Message Content, Embed Description, or Field Values!
            </p>
          </div>
        )}
      </div>

      {/* --- QUEUE CONTROL BOARD --- */}
      <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 flex flex-wrap items-center justify-between gap-3 mb-1 select-none">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-[var(--brand-light)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-1)]">
            Message Queue List ({messages.length})
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={addMessage}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] border-none rounded-[var(--radius-xs)] cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Message
          </button>
          
          <button
            type="button"
            onClick={handleExpandAll}
            title="Expand all messages"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-0)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)] border border-[var(--border)] rounded-[var(--radius-xs)] cursor-pointer transition-colors"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
            Expand All
          </button>

          <button
            type="button"
            onClick={handleCollapseAll}
            title="Collapse all messages"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-0)] bg-[var(--bg-3)] hover:bg-[var(--bg-4)] border border-[var(--border)] rounded-[var(--radius-xs)] cursor-pointer transition-colors"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
            Collapse All
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={messages.length <= 1 && !messages[0]?.content && messages[0]?.embeds.length === 0 && messages[0]?.components.length === 0}
            title="Clear entire queue"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[var(--danger)] hover:text-white bg-[rgba(242,63,66,0.06)] hover:bg-[var(--danger)] border border-[rgba(242,63,66,0.15)] rounded-[var(--radius-xs)] cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-colors ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {messages.map((msg, idx) => {
        const isCollapsed = collapsedMessages[msg.id] ?? false;
        const activeTab = getMessageActiveTab(msg.id);
        const charStats = getMessageCharacterCount(msg);
        const warnings = getMessageWarnings(msg);

        return (
          <div
            key={msg.id}
            id={`msg_card_${msg.id}`}
            className="group bg-[var(--bg-2)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden hover:shadow-[var(--shadow-sm)] transition-shadow duration-[var(--normal)] flex flex-col"
          >
            {/* Message Accordion Header */}
            <div
              onClick={() => toggleMessageCollapse(msg.id)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--bg-3)] border-b border-[var(--border)] cursor-pointer select-none hover:bg-[var(--bg-4)] transition-colors"
            >
              <ChevronDown
                className={`w-[18px] h-[18px] text-[var(--text-3)] transition-transform duration-[var(--normal)] flex-shrink-0 ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
              <span className="flex-1 text-[13.5px] font-semibold text-[var(--text-1)] flex items-center gap-2 truncate">
                Message {idx + 1}
                {warnings.length > 0 && (
                  <span title={`${warnings.length} Discord API warning(s) detected`}>
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] flex-shrink-0" />
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
                <span className="text-[11px] text-[var(--text-4)] bg-[var(--bg-5)] rounded-full px-2 py-0.5 max-w-[120px] truncate">
                  {msg.content ? msg.content.substring(0, 18) + (msg.content.length > 18 ? '…' : '') : 'Empty'}
                </span>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${charStats.total > 6000 ? 'bg-[rgba(242,63,66,0.15)] text-[var(--danger)]' : 'bg-[var(--bg-5)] text-[var(--text-3)]'}`} title="Message payload character size (Max 6000)">
                  {charStats.total}/6000
                </span>
              </div>
              
              {/* Message control action triggers */}
              <div className="flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 focus-within:opacity-100 message-card-actions ml-2">
                <button
                  type="button"
                  onClick={(e) => duplicateMessage(msg.id, e)}
                  title="Duplicate Message"
                  className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-3)] hover:bg-[var(--bg-5)] hover:text-[var(--text-0)] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => deleteMessage(msg.id, e)}
                  title="Delete Message"
                  className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-3)] hover:bg-[rgba(242,63,66,0.2)] hover:text-[var(--danger)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Message Card Body */}
            {!isCollapsed && (
              <div className="p-3 flex flex-col gap-3.5">
                {/* Horizontal Inner Tabs */}
                <div className="flex gap-1 bg-[var(--bg-1)] p-0.5 rounded-[var(--radius-sm)]">
                  <button
                    type="button"
                    onClick={() => setMessageActiveTab(msg.id, 'content')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-xs)] border-none transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'content' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageActiveTab(msg.id, 'profile')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-xs)] border-none transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'profile' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageActiveTab(msg.id, 'embeds')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-xs)] border-none transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'embeds' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Embeds
                    {msg.embeds.length > 0 && (
                      <span className="bg-[var(--brand)] text-white text-[10px] font-bold px-1.5 rounded-full select-none">
                        {msg.embeds.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageActiveTab(msg.id, 'components')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-xs)] border-none transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'components' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Buttons
                    {msg.components.length > 0 && (
                      <span className="bg-[var(--brand)] text-white text-[10px] font-bold px-1.5 rounded-full select-none">
                        {msg.components.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectJsonTab(msg)}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-xs)] border-none transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'json' ? 'bg-[var(--bg-4)] text-[var(--text-0)]' : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    JSON
                  </button>
                </div>

                {/* --- TAB PANEL: CONTENT --- */}
                {activeTab === 'content' && (
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                      <label className="text-[12px] font-bold uppercase tracking-[0.4px] text-[var(--text-2)]">
                        Message Content
                      </label>
                      <MarkdownToolbar onInsert={(ts, te) => handleInsertMarkdown(msg.id, 'content', ts, te)} />
                    </div>
                    <div className="relative">
                      <textarea
                        value={msg.content}
                        maxLength={2000}
                        onChange={(e) => updateMessageField(msg.id, 'content', e.target.value)}
                        placeholder="Type a message... Supports custom Discord formatting (e.g., **bold**, *italics*, `code`, [links](url))"
                        className="w-full min-h-[100px] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] p-2.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] focus:ring-3 focus:ring-[rgba(88,101,242,0.2)] transition-all resize-y placeholder-[var(--input-placeholder)]"
                      />
                      <span
                        className={`absolute right-2.5 bottom-2 text-[10px] pointer-events-none ${
                          msg.content.length >= 1900 ? (msg.content.length >= 2000 ? 'text-[var(--danger)] font-bold' : 'text-[var(--warning)]') : 'text-[var(--text-4)]'
                        }`}
                      >
                        {msg.content.length}/2000
                      </span>
                    </div>
                  </div>
                )}

                {/* --- TAB PANEL: PROFILE OVERRIDE --- */}
                {activeTab === 'profile' && (
                  <div className="flex flex-col gap-3.5 text-left">
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold uppercase tracking-[0.4px] text-[var(--text-2)]">
                        Username Override
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={msg.username}
                        onChange={(e) => updateMessageField(msg.id, 'username', e.target.value)}
                        placeholder="Default Webhook"
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] focus:ring-3 focus:ring-[rgba(88,101,242,0.2)] transition-all placeholder-[var(--input-placeholder)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[12px] font-bold uppercase tracking-[0.4px] text-[var(--text-2)]">
                          Avatar URL Override
                        </label>
                        <button
                          type="button"
                          onClick={onOpenAvatarGen}
                          className="flex items-center gap-1 text-[var(--brand-light)] hover:text-[var(--brand)] text-[12px] font-medium bg-transparent border-none p-0 cursor-pointer hover:underline transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Make Gradient Avatar
                        </button>
                      </div>
                      <input
                        type="url"
                        value={msg.avatarUrl}
                        onChange={(e) => updateMessageField(msg.id, 'avatarUrl', e.target.value)}
                        placeholder="https://i.imgur.com/image.png"
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] focus:ring-3 focus:ring-[rgba(88,101,242,0.2)] transition-all placeholder-[var(--input-placeholder)]"
                      />
                    </div>
                  </div>
                )}

                {/* --- TAB PANEL: EMBEDS --- */}
                {activeTab === 'embeds' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3.5">
                      {msg.embeds.map((emb, eIdx) => {
                        const isEmbCollapsed = collapsedEmbeds[emb.id] ?? true;
                        const embedColor = emb.color || '#4f545c';

                        return (
                          <div
                            key={emb.id}
                            id={`embed_card_${emb.id}`}
                            className="bg-[var(--bg-3)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden flex flex-col"
                          >
                            {/* Embed Accordion Header */}
                            <div
                              onClick={() => toggleEmbedCollapse(emb.id)}
                              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-4)] border-b border-[var(--border)] cursor-pointer hover:bg-[var(--bg-5)] transition-colors select-none"
                            >
                              <div
                                className="w-[4px] h-[18px] rounded-sm flex-shrink-0"
                                style={{ background: embedColor }}
                              />
                              <ChevronDown
                                className={`w-4 h-4 text-[var(--text-3)] transition-transform duration-[var(--normal)] flex-shrink-0 ${
                                  isEmbCollapsed ? '-rotate-90' : ''
                                }`}
                              />
                              <span className="flex-1 text-[12.5px] font-semibold text-[var(--text-1)] text-left truncate">
                                {emb.title ? emb.title.substring(0, 36) + (emb.title.length > 36 ? '…' : '') : `Embed ${eIdx + 1}`}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => deleteEmbed(msg.id, emb.id, e)}
                                className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-3)] hover:bg-[rgba(242,63,66,0.2)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Embed Content Form Inputs */}
                            {!isEmbCollapsed && (
                              <div className="p-3 flex flex-col gap-3.5 text-left">
                                {/* Color & Title */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                      Border Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-9 h-9 rounded-[var(--radius-sm)] border-2 border-[var(--border-strong)] relative overflow-hidden flex-shrink-0"
                                        style={{ background: embedColor }}
                                      >
                                        <input
                                          type="color"
                                          value={emb.color || '#5865f2'}
                                          onChange={(e) => updateEmbedField(msg.id, emb.id, 'color', e.target.value)}
                                          className="absolute -inset-1 cursor-pointer w-[calc(100%+8px)] h-[calc(100%+8px)] opacity-0"
                                        />
                                      </div>
                                      <input
                                        type="text"
                                        maxLength={7}
                                        value={emb.color || ''}
                                        onChange={(e) => updateEmbedField(msg.id, emb.id, 'color', e.target.value)}
                                        placeholder="#5865f2"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm font-mono text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors"
                                      />
                                      {emb.color && (
                                        <button
                                          type="button"
                                          onClick={() => updateEmbedField(msg.id, emb.id, 'color', null)}
                                          title="Clear color"
                                          className="p-1 text-[11px] hover:text-white bg-transparent border-none cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                    {/* Quick Discord Presets Palette */}
                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                      <span className="text-[10px] text-[var(--text-4)] uppercase font-bold tracking-wide mr-1 select-none">Presets:</span>
                                      {[
                                        { hex: '#5865F2', label: 'Blurple' },
                                        { hex: '#23a55a', label: 'Success Green' },
                                        { hex: '#f0b232', label: 'Warning Yellow' },
                                        { hex: '#f23f43', label: 'DND Red' },
                                        { hex: '#eb459e', label: 'Fuchsia' },
                                        { hex: '#4f545c', label: 'Steel Grey' },
                                        { hex: '#000000', label: 'AMOLED Black' }
                                      ].map(col => (
                                        <button
                                          key={col.hex}
                                          type="button"
                                          onClick={() => updateEmbedField(msg.id, emb.id, 'color', col.hex)}
                                          title={col.label}
                                          className="w-4.5 h-4.5 rounded-full border border-[rgba(255,255,255,0.15)] cursor-pointer hover:scale-115 active:scale-95 transition-all p-0 flex-shrink-0"
                                          style={{ background: col.hex }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                      Title
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={256}
                                      value={emb.title}
                                      onChange={(e) => updateEmbedField(msg.id, emb.id, 'title', e.target.value)}
                                      placeholder="Embed title"
                                      className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                    />
                                  </div>
                                </div>

                                {/* Title URL Link */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                    Title URL
                                  </label>
                                  <input
                                    type="url"
                                    value={emb.titleUrl}
                                    onChange={(e) => updateEmbedField(msg.id, emb.id, 'titleUrl', e.target.value)}
                                    placeholder="https://discord.com"
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                  />
                                </div>

                                {/* Description Textarea */}
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between items-center flex-wrap gap-1">
                                    <label className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                      Description
                                    </label>
                                    <MarkdownToolbar onInsert={(ts, te) => handleInsertMarkdown(msg.id, 'description', ts, te, emb.id)} />
                                  </div>
                                  <div className="relative">
                                    <textarea
                                      maxLength={4096}
                                      value={emb.description}
                                      onChange={(e) => updateEmbedField(msg.id, emb.id, 'description', e.target.value)}
                                      placeholder="Embed description text... Supports Discord formatting"
                                      className="w-full min-h-[70px] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] p-2.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors resize-y placeholder-[var(--input-placeholder)]"
                                    />
                                    <span className="absolute right-2 bottom-1.5 text-[9px] text-[var(--text-4)] select-none">
                                      {emb.description.length}/4096
                                    </span>
                                  </div>
                                </div>

                                {/* Author Profile Override Section */}
                                <div className="border-t border-[var(--border)] pt-2 mt-1">
                                  <span className="text-[11px] font-extrabold tracking-wide uppercase text-[var(--text-3)] mb-2 block">
                                    Author Details
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                        Author Name
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={256}
                                        value={emb.authorName}
                                        onChange={(e) => updateEmbedField(msg.id, emb.id, 'authorName', e.target.value)}
                                        placeholder="Author name override"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                        Author Icon URL
                                      </label>
                                      <input
                                        type="url"
                                        value={emb.authorIconUrl}
                                        onChange={(e) => updateEmbedField(msg.id, emb.id, 'authorIconUrl', e.target.value)}
                                        placeholder="https://i.imgur.com/author.png"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                      Author Link URL
                                    </label>
                                    <input
                                      type="url"
                                      value={emb.authorUrl}
                                      onChange={(e) => updateEmbedField(msg.id, emb.id, 'authorUrl', e.target.value)}
                                      placeholder="https://discord.com"
                                      className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                    />
                                  </div>
                                </div>

                                {/* Graphic URLs Section */}
                                <div className="border-t border-[var(--border)] pt-2 mt-1">
                                  <span className="text-[11px] font-extrabold tracking-wide uppercase text-[var(--text-3)] mb-2 block">
                                    Embed Imagery
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                        Thumbnail URL (Top-Right)
                                      </label>
                                      <input
                                        type="url"
                                        value={emb.thumbnail}
                                        onChange={(e) => updateEmbedField(msg.id, emb.id, 'thumbnail', e.target.value)}
                                        placeholder="https://i.imgur.com/thumb.png"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                        Image URL (Main bottom)
                                      </label>
                                      <input
                                        type="url"
                                        value={emb.image}
                                        onChange={(e) => updateEmbedField(msg.id, emb.id, 'image', e.target.value)}
                                        placeholder="https://i.imgur.com/image.png"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Footer details Section */}
                                <div className="border-t border-[var(--border)] pt-2 mt-1">
                                  <span className="text-[11px] font-extrabold tracking-wide uppercase text-[var(--text-3)] mb-2 block">
                                    Footer Details
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                        Footer Text
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={2048}
                                        value={emb.footerText}
                                        onChange={(e) => updateEmbedField(msg.id, emb.id, 'footerText', e.target.value)}
                                        placeholder="Footer text..."
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-[var(--text-2)] uppercase tracking-wide">
                                        Footer Icon URL
                                      </label>
                                      <input
                                        type="url"
                                        value={emb.footerIconUrl}
                                        onChange={(e) => updateEmbedField(msg.id, emb.id, 'footerIconUrl', e.target.value)}
                                        placeholder="https://i.imgur.com/footer.png"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--brand)] transition-colors placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                  </div>
                                  <label className="flex items-center gap-2 select-none cursor-pointer mt-1">
                                    <input
                                      type="checkbox"
                                      checked={emb.timestamp}
                                      onChange={(e) => updateEmbedField(msg.id, emb.id, 'timestamp', e.target.checked)}
                                      className="w-4 h-4 rounded border-[var(--border)] accent-[var(--brand)]"
                                    />
                                    <span className="text-[12px] text-[var(--text-2)] font-medium">
                                      Add current timestamp to footer
                                    </span>
                                  </label>
                                </div>

                                {/* Custom Fields Grid Builder */}
                                <div className="border-t border-[var(--border)] pt-2 mt-1">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] font-extrabold tracking-wide uppercase text-[var(--text-3)]">
                                      Embed Fields ({emb.fields.length}/25)
                                    </span>
                                  </div>
                                  
                                  <div id={`fields_${emb.id}`} className="flex flex-col gap-2.5">
                                    {emb.fields.map((fld, fldIdx) => (
                                      <div
                                        key={fld.id}
                                        id={`field_card_${fld.id}`}
                                        className="bg-[var(--bg-4)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5 flex flex-col gap-2 relative group/field"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-[var(--text-4)] font-bold">
                                            Field {fldIdx + 1}
                                          </span>
                                          <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 focus-within:opacity-100 transition-opacity">
                                            <button
                                              type="button"
                                              disabled={fldIdx === 0}
                                              onClick={() => moveEmbedField(msg.id, emb.id, fld.id, 'up')}
                                              title="Move Up"
                                              className="w-5 h-5 flex items-center justify-center bg-transparent border-none text-[var(--text-4)] hover:text-white hover:bg-[var(--bg-5)] rounded-[var(--radius-xs)] cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                            >
                                              <ArrowUp className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={fldIdx === emb.fields.length - 1}
                                              onClick={() => moveEmbedField(msg.id, emb.id, fld.id, 'down')}
                                              title="Move Down"
                                              className="w-5 h-5 flex items-center justify-center bg-transparent border-none text-[var(--text-4)] hover:text-white hover:bg-[var(--bg-5)] rounded-[var(--radius-xs)] cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                            >
                                              <ArrowDown className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={emb.fields.length >= 25}
                                              onClick={() => duplicateEmbedField(msg.id, emb.id, fld.id)}
                                              title="Duplicate Field"
                                              className="w-5 h-5 flex items-center justify-center bg-transparent border-none text-[var(--text-4)] hover:text-white hover:bg-[var(--bg-5)] rounded-[var(--radius-xs)] cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => deleteEmbedField(msg.id, emb.id, fld.id)}
                                              title="Delete Field"
                                              className="w-5 h-5 flex items-center justify-center bg-transparent border-none text-[var(--text-4)] hover:text-[var(--danger)] hover:bg-[rgba(242,63,66,0.1)] rounded-[var(--radius-xs)] cursor-pointer"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-bold text-[var(--text-3)] uppercase">
                                              Name
                                            </label>
                                            <input
                                              type="text"
                                              maxLength={256}
                                              value={fld.name}
                                              onChange={(e) => updateEmbedFieldItem(msg.id, emb.id, fld.id, 'name', e.target.value)}
                                              placeholder="Field name"
                                              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)]"
                                            />
                                          </div>
                                          <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-bold text-[var(--text-3)] uppercase">
                                              Value
                                            </label>
                                            <textarea
                                              maxLength={1024}
                                              rows={1}
                                              value={fld.value}
                                              onChange={(e) => updateEmbedFieldItem(msg.id, emb.id, fld.id, 'value', e.target.value)}
                                              placeholder="Field value text"
                                              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)] resize-y min-h-[30px]"
                                            />
                                          </div>
                                        </div>
                                        <label className="flex items-center gap-2 select-none cursor-pointer self-start mt-0.5">
                                          <input
                                            type="checkbox"
                                            checked={fld.inline}
                                            onChange={(e) => updateEmbedFieldItem(msg.id, emb.id, fld.id, 'inline', e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-[var(--border)] accent-[var(--brand)]"
                                          />
                                          <span className="text-[11px] text-[var(--text-3)]">
                                            Display inline (grid style)
                                          </span>
                                        </label>
                                      </div>
                                    ))}
                                  </div>

                                  {emb.fields.length < 25 && (
                                    <button
                                      type="button"
                                      onClick={() => addEmbedField(msg.id, emb.id)}
                                      className="w-full py-2.5 mt-2 text-xs font-semibold text-[var(--text-3)] hover:text-[var(--brand-light)] border border-dashed border-[var(--border-strong)] rounded-[var(--radius-sm)] flex items-center justify-center gap-1 bg-transparent cursor-pointer transition-colors hover:border-[var(--brand)]"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add Field
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {msg.embeds.length < 10 ? (
                      <button
                        type="button"
                        onClick={() => addEmbed(msg.id)}
                        className="w-full py-3 border-2 border-dashed border-[var(--border-strong)] rounded-[var(--radius-md)] flex items-center justify-center gap-1.5 text-sm text-[var(--text-3)] font-semibold bg-transparent hover:bg-[rgba(88,101,242,0.06)] hover:border-[var(--brand)] hover:text-[var(--brand-light)] cursor-pointer transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Embed Panel
                      </button>
                    ) : (
                      <p className="text-center text-xs text-[var(--text-4)]">
                        Maximum of 10 embeds reached.
                      </p>
                    )}
                  </div>
                )}

                {/* --- TAB PANEL: COMPONENTS (BUTTON BUILDER) --- */}
                {activeTab === 'components' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3.5">
                      {msg.components.map((row, rIdx) => (
                        <div
                          key={row.id}
                          id={`row_card_${row.id}`}
                          className="bg-[var(--bg-3)] border border-[var(--border)] rounded-[var(--radius)] p-3 flex flex-col gap-2.5 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                              Action Row {rIdx + 1}{' '}
                              <span className="font-medium lowercase text-[var(--text-4)]">
                                ({row.buttons.length}/5 buttons)
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => deleteActionRow(msg.id, row.id, e)}
                              className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-3)] hover:bg-[rgba(242,63,66,0.2)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Render Buttons configured in this row */}
                          <div id={`btns_${row.id}`} className="flex flex-col gap-2.5">
                            {row.buttons.map((btn) => (
                              <div
                                key={btn.id}
                                id={`btn_item_${btn.id}`}
                                className="bg-[var(--bg-4)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5 flex items-start gap-2.5 relative group/btn"
                              >
                                <div className="flex-1 flex flex-col gap-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[9px] font-bold text-[var(--text-3)] uppercase">
                                        Style
                                      </label>
                                      <select
                                        value={btn.style}
                                        onChange={(e) => updateButtonField(msg.id, row.id, btn.id, 'style', parseInt(e.target.value) as ButtonStyle)}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)]"
                                      >
                                        <option value={1}>Primary (Blurple)</option>
                                        <option value={2}>Secondary (Grey)</option>
                                        <option value={3}>Success (Green)</option>
                                        <option value={4}>Danger (Red)</option>
                                        <option value={5}>Link (Grey URL)</option>
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-0.5 sm:col-span-2">
                                      <label className="text-[9px] font-bold text-[var(--text-3)] uppercase">
                                        Label
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={80}
                                        value={btn.label}
                                        onChange={(e) => updateButtonField(msg.id, row.id, btn.id, 'label', e.target.value)}
                                        placeholder="Button display label"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)] placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[9px] font-bold text-[var(--text-3)] uppercase">
                                        Emoji
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={10}
                                        value={btn.emoji}
                                        onChange={(e) => updateButtonField(msg.id, row.id, btn.id, 'emoji', e.target.value)}
                                        placeholder="😀 or :smile:"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)] placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[9px] font-bold text-[var(--text-3)] uppercase">
                                        Link URL {btn.style === 5 && <span className="text-[var(--danger)]">*</span>}
                                      </label>
                                      <input
                                        type="url"
                                        disabled={btn.style !== 5}
                                        value={btn.style === 5 ? btn.url : ''}
                                        onChange={(e) => updateButtonField(msg.id, row.id, btn.id, 'url', e.target.value)}
                                        placeholder={btn.style === 5 ? "https://discord.com" : "(Disabled for actions)"}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-[var(--input-text)] outline-none focus:border-[var(--brand)] disabled:opacity-40 disabled:pointer-events-none transition-opacity placeholder-[var(--input-placeholder)]"
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => deleteButtonFromRow(msg.id, row.id, btn.id)}
                                  className="w-6 h-6 self-start mt-4 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-4)] hover:bg-[rgba(242,63,66,0.15)] hover:text-[var(--danger)] transition-all cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {row.buttons.length < 5 && (
                            <button
                              type="button"
                              onClick={() => addButtonToRow(msg.id, row.id)}
                              className="w-full py-2 text-xs font-semibold text-[var(--text-3)] hover:text-[var(--brand-light)] border border-dashed border-[var(--border-strong)] rounded-[var(--radius-sm)] flex items-center justify-center gap-1 bg-transparent cursor-pointer transition-colors hover:border-[var(--brand)]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Action Button
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {msg.components.length < 5 ? (
                      <button
                        type="button"
                        onClick={() => addActionRow(msg.id)}
                        className="w-full py-3 border-2 border-dashed border-[var(--border-strong)] rounded-[var(--radius-md)] flex items-center justify-center gap-1.5 text-sm text-[var(--text-3)] font-semibold bg-transparent hover:bg-[rgba(88,101,242,0.06)] hover:border-[var(--brand)] hover:text-[var(--brand-light)] cursor-pointer transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Component Row
                      </button>
                    ) : (
                      <p className="text-center text-xs text-[var(--text-4)]">
                        Maximum of 5 Action Rows reached.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'json' && (
                  <div className="flex flex-col gap-3 text-left animate-slide-down">
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                      <div>
                        <span className="text-[12px] font-bold uppercase tracking-[0.4px] text-[var(--text-2)] block">
                          Local Message Payload Developer Console
                        </span>
                        <span className="text-[11px] text-[var(--text-3)] leading-normal mt-0.5 block">
                          View the exact JSON payload structured for this single queue item, or paste custom webhook JSON schemas to import them.
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const payload = buildDiscordPayload(msg, null);
                            const json = JSON.stringify(payload, null, 2);
                            setLocalJsonTexts(prev => ({ ...prev, [msg.id]: json }));
                            setJsonErrorTexts(prev => ({ ...prev, [msg.id]: '' }));
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)] hover:text-[var(--text-0)] bg-[var(--bg-4)] hover:bg-[var(--bg-5)] rounded-[var(--radius-xs)] border-none cursor-pointer transition-colors"
                        >
                          Reset to Current UI State
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        value={localJsonTexts[msg.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalJsonTexts(prev => ({ ...prev, [msg.id]: val }));
                        }}
                        placeholder='{\n  "content": "Hello World",\n  "embeds": []\n}'
                        spellCheck={false}
                        className="w-full min-h-[220px] bg-[var(--bg-0)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[#7ec8e3] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(88,101,242,0.15)] resize-y"
                      />
                    </div>

                    {jsonErrorTexts[msg.id] && (
                      <div className="text-[11px] text-[var(--danger)] bg-[rgba(242,63,66,0.08)] border border-[rgba(242,63,66,0.2)] rounded-[var(--radius-sm)] p-2.5 flex items-start gap-1.5 leading-normal">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--danger)]" />
                        <span>{jsonErrorTexts[msg.id]}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center flex-wrap gap-2.5 bg-[var(--bg-4)] p-2.5 border border-[var(--border)] rounded-[var(--radius-sm)]">
                      <button
                        type="button"
                        onClick={() => {
                          const val = localJsonTexts[msg.id] || JSON.stringify(buildDiscordPayload(msg, null), null, 2);
                          navigator.clipboard.writeText(val);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[var(--text-2)] hover:text-[var(--text-0)] bg-transparent border-none cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Code Payload
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyMessageJson(msg.id)}
                        className="flex items-center gap-1 px-3.5 py-1.5 text-[11px] font-bold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded-[var(--radius-xs)] border-none cursor-pointer transition-all hover:shadow-sm active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Compile & Import Payload
                      </button>
                    </div>
                  </div>
                )}

                {/* Message character limits summary footer */}
                <div className="border-t border-[var(--border)] pt-2.5 mt-2 flex flex-col gap-2.5 text-left">
                  {/* Dynamic Payload Size Progress Bar */}
                  <div className="flex flex-col gap-1 select-none">
                    <div className="flex justify-between items-center text-[10px] text-[var(--text-3)] font-mono uppercase tracking-wide">
                      <span>Payload Character Usage</span>
                      <span>{Math.min(100, Math.round((charStats.total / 6000) * 100))}% used</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--bg-1)] border border-[var(--border)] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, (charStats.total / 6000) * 100)}%` }}
                        className={`h-full transition-all duration-300 ${
                          charStats.total > 6000 
                            ? 'bg-[var(--danger)] animate-pulse' 
                            : charStats.total > 4800 
                              ? 'bg-[var(--warning)]' 
                              : 'bg-[var(--success)]'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center text-[11px] text-[var(--text-3)] select-none gap-2">
                    <div className="flex gap-2.5 flex-wrap">
                      <span>Content: <strong className={charStats.content > 2000 ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-2)]'}>{charStats.content}/2000</strong></span>
                      <span>Embeds: <strong className={charStats.embedsTotal > 6000 ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-2)]'}>{charStats.embedsTotal}/6000</strong></span>
                      <span>Total characters: <strong className={charStats.total > 6000 ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-2)]'}>{charStats.total}/6000</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:ml-auto">
                      {warnings.length > 0 ? (
                        <span className="text-[var(--warning)] font-bold flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> {warnings.length} Issue{warnings.length > 1 ? 's' : ''} Detected
                        </span>
                      ) : (
                        <span className="text-[var(--success)] font-medium flex items-center gap-1 text-[11px]">
                          <Check className="w-3.5 h-3.5" /> Ready to Dispatch
                        </span>
                      )}
                    </div>
                  </div>

                  {warnings.length > 0 && (
                    <div className="flex flex-col gap-1.5 p-2.5 bg-[rgba(240,178,50,0.06)] border border-[rgba(240,178,50,0.2)] rounded-[var(--radius-sm)] animate-slide-down">
                      <span className="text-[10px] uppercase font-bold text-[var(--warning)] tracking-wider">Discord API Integrity Guard</span>
                      <ul className="list-none p-0 m-0 flex flex-col gap-1">
                        {warnings.map((warn, wIdx) => (
                          <li key={wIdx} className="text-[11px] text-[var(--text-1)] flex items-start gap-1.5 leading-relaxed">
                            <span className="text-[var(--warning)] select-none font-bold mt-0.5">•</span>
                            <span>{warn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addMessage}
        className="w-full py-3 border-2 border-dashed border-[var(--border-strong)] rounded-[var(--radius-md)] flex items-center justify-center gap-2 text-sm text-[var(--text-3)] font-semibold bg-transparent hover:bg-[rgba(88,101,242,0.06)] hover:border-[var(--brand)] hover:text-[var(--brand-light)] cursor-pointer transition-all mt-1"
      >
        <Plus className="w-4 h-4" />
        Add Message
      </button>
    </div>
  );
};
