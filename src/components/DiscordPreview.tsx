import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { DiscordMessage, Embed, ButtonComponent, ActionRow, WebhookInfo } from '../types';
import { MessageSquare, ExternalLink, MessageCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface EmbedImagePreviewProps {
  url: string;
}

const EmbedImagePreview: React.FC<EmbedImagePreviewProps> = ({ url }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [url]);

  const cleanUrl = url.trim();
  if (!cleanUrl) return null;

  let filename = 'image.png';
  let domain = '';
  try {
    const parsed = new URL(cleanUrl);
    domain = parsed.hostname;
    filename = parsed.pathname.split('/').pop() || 'image';
    if (!filename.includes('.')) {
      filename += '.png';
    }
  } catch {
    filename = cleanUrl;
  }

  return (
    <div className="mt-2.5 rounded-[6px] overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.2)] p-2">
      <div className="flex items-center gap-3">
        {/* The thumbnail preview */}
        <div className="relative w-12 h-12 rounded-[4px] overflow-hidden bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.4)]">
              <div className="w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(242,63,66,0.1)] text-[var(--danger)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <img
            src={cleanUrl}
            alt="Preview Thumbnail"
            referrerPolicy="no-referrer"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            className={`w-full h-full object-cover transition-opacity duration-200 ${status === 'loaded' ? 'opacity-100' : 'opacity-0 absolute'}`}
          />
        </div>

        {/* Details & Status */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-[2px] rounded-[3px] bg-[rgba(88,101,242,0.15)] text-[var(--brand)] border border-[rgba(88,101,242,0.25)] select-none">
              Image URL Preview
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded-[3px] uppercase select-none ${
              status === 'loaded' ? 'bg-[rgba(35,165,90,0.15)] text-[var(--success)]' :
              status === 'error' ? 'bg-[rgba(242,63,66,0.15)] text-[var(--danger)]' :
              'bg-[rgba(255,255,255,0.1)] text-[var(--text-3)]'
            }`}>
              {status}
            </span>
          </div>
          <h5 className="text-[12.5px] font-bold text-[var(--text-1)] truncate leading-tight" title={filename}>
            {filename}
          </h5>
          {domain && (
            <p className="text-[11px] text-[var(--text-3)] truncate leading-none mt-1 select-none">
              Source: {domain}
            </p>
          )}
        </div>
      </div>

      {/* Actual Discord large image if loaded, otherwise a nice styled placeholder if broken */}
      {status === 'loaded' ? (
        <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)] rounded-[4px] max-h-[300px] overflow-hidden flex justify-center bg-[rgba(0,0,0,0.1)]">
          <img
            src={cleanUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[300px] object-contain rounded-[4px]"
          />
        </div>
      ) : status === 'error' ? (
        <div className="mt-2 p-2 rounded-[4px] bg-[rgba(242,63,66,0.05)] border border-[rgba(242,63,66,0.15)] flex items-start gap-2 text-xs text-[var(--text-2)]">
          <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[var(--danger)] block mb-0.5">Image Failed to Load!</strong>
            The URL may be invalid, blocking hotlinking, or experiencing a connection error. Verify the link is an active, direct image file.
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface DiscordPreviewProps {
  messages: DiscordMessage[];
  webhook: WebhookInfo | null;
}

export const DiscordPreview: React.FC<DiscordPreviewProps> = ({ messages, webhook }) => {
  if (messages.length === 0) {
    return (
      <div id="previewEmpty" className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--text-4)] p-10 text-center select-none">
        <div className="opacity-30">
          <MessageCircle className="w-14 h-14" strokeWidth={1} />
        </div>
        <p className="text-[17px] font-semibold text-[var(--text-3)]">No messages yet</p>
        <p className="text-[13.5px] text-[var(--text-4)] max-w-[240px]">
          Add a message in the editor to see a preview simulate in real time
        </p>
      </div>
    );
  }

  // Helper to format timestamps to mimic Discord (e.g., "Today at 5:30 PM")
  const getFormattedTime = () => {
    const now = new Date();
    return `Today at ${now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  };

  // Render markdown content using standard inline tokens & custom element overrides
  const renderMessageContent = (text: string) => {
    return (
      <div className="text-[15px] leading-[1.375] text-[var(--text-1)] dark:text-[#dcddde] break-words">
        <ReactMarkdown
          components={{
            p: ({ children }) => <span className="inline">{children}</span>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline font-medium">
                {children}
              </a>
            ),
            code: ({ children }) => (
              <code className="bg-[var(--dc-code-bg)] text-[#e3e5e8] px-1 py-0.5 rounded-[3px] text-[0.85em] font-mono">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-[var(--dc-code-bg)] text-[#e3e5e8] px-3 py-2.5 rounded-[var(--radius-sm)] my-1.5 overflow-x-auto font-mono text-[13px] leading-[1.45] max-w-full">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[var(--dc-blockquote)] pl-3 my-1 text-[var(--text-2)] italic bg-[rgba(255,255,255,0.01)] py-0.5 pr-2">
                {children}
              </blockquote>
            ),
            strong: ({ children }) => <strong className="font-bold text-[var(--text-0)]">{children}</strong>,
            em: ({ children }) => <em className="italic text-[var(--text-1)]">{children}</em>,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  // Render Embed Fields structured as inline/block columns
  const renderEmbedFields = (fields: Embed['fields']) => {
    if (!fields || fields.length === 0) return null;

    return (
      <div className="grid grid-cols-12 gap-x-2 gap-y-3 mt-2 select-text">
        {fields.map((f, i) => {
          // If inline, span 4 columns out of 12 (approx 1/3 width), else span 12 (full width)
          const colSpan = f.inline ? 'col-span-4 min-w-[100px]' : 'col-span-12';
          return (
            <div key={f.id || i} className={`${colSpan} flex flex-col min-w-0`}>
              <div className="text-[13px] font-bold text-[var(--text-0)] leading-[1.3] break-words mb-0.5">
                {f.name.trim() ? f.name : '\u200B'}
              </div>
              <div className="text-[14px] leading-[1.4] text-[var(--text-1)] break-words whitespace-pre-wrap font-sans">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <span className="inline">{children}</span>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline">{children}</a>,
                  }}
                >
                  {f.value.trim() ? f.value : '\u200B'}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render single Embed card
  const renderEmbed = (e: Embed) => {
    const borderColor = e.color || '#4f545c';
    const hasFooter = e.footerText.trim() || e.timestamp;

    return (
      <div
        key={e.id}
        className="flex max-w-[520px] rounded-[4px] bg-[var(--dc-code-bg)] border-l-4 overflow-hidden mt-1.5 select-text"
        style={{ borderLeftColor: borderColor }}
      >
        <div className="flex-1 p-[10px_12px_12px_12px] grid grid-cols-[1fr_auto] gap-x-4">
          {/* Main Embed content */}
          <div className="min-w-0 flex flex-col justify-between">
            {/* Embed Author */}
            {e.authorName.trim() ? (
              <div className="flex items-center gap-1.5 mb-1.5">
                {e.authorIconUrl.trim() ? (
                  <img
                    className="w-5 h-5 rounded-full object-cover"
                    src={e.authorIconUrl}
                    alt=""
                    onError={(el) => (el.currentTarget.style.display = 'none')}
                  />
                ) : null}
                <span className="text-[13px] font-semibold text-[var(--text-0)] leading-tight">
                  {e.authorUrl.trim() ? (
                    <a href={e.authorUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {e.authorName}
                    </a>
                  ) : (
                    e.authorName
                  )}
                </span>
              </div>
            ) : null}

            {/* Embed Title */}
            {e.title.trim() ? (
              <div className="text-[15px] font-bold text-[var(--text-0)] mb-1.5 leading-[1.3] break-words">
                {e.titleUrl.trim() ? (
                  <a href={e.titleUrl} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline">
                    {e.title}
                  </a>
                ) : (
                  e.title
                )}
              </div>
            ) : null}

            {/* Embed Description */}
            {e.description.trim() ? (
              <div className="text-[14px] leading-[1.45] text-[var(--text-1)] break-words whitespace-pre-wrap mb-1.5">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <span className="inline">{children}</span>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline">{children}</a>,
                  }}
                >
                  {e.description}
                </ReactMarkdown>
              </div>
            ) : null}

            {/* Embed Fields */}
            {renderEmbedFields(e.fields)}

            {/* Embed Image */}
            {e.image.trim() ? (
              <EmbedImagePreview url={e.image} />
            ) : null}

            {/* Embed Footer / Timestamps */}
            {hasFooter ? (
              <div className="flex items-center gap-1.5 mt-2">
                {e.footerIconUrl.trim() ? (
                  <img
                    className="w-[18px] h-[18px] rounded-full object-cover"
                    src={e.footerIconUrl}
                    alt=""
                    onError={(el) => (el.currentTarget.style.display = 'none')}
                  />
                ) : null}
                <span className="text-[12px] text-[var(--text-3)] leading-none">
                  {e.footerText.trim() ? e.footerText : ''}
                  {e.footerText.trim() && e.timestamp ? (
                    <span className="mx-1 text-[var(--text-4)] select-none">•</span>
                  ) : null}
                  {e.timestamp ? (
                    <span>
                      {new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>

          {/* Embed Thumbnail Column */}
          {e.thumbnail.trim() ? (
            <div className="flex-shrink-0 self-start">
              <img
                src={e.thumbnail}
                alt=""
                className="w-20 h-20 rounded-[4px] object-cover"
                onError={(el) => (el.currentTarget.style.display = 'none')}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  // Render components action row buttons
  const renderButton = (b: ButtonComponent) => {
    // Discord styles mapping:
    // 1 = Primary (Blurple), 2 = Secondary (Grey), 3 = Success (Green), 4 = Danger (Red), 5 = Link (Grey with link arrow)
    const styleClasses: Record<number, string> = {
      1: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]',
      2: 'bg-[#4e5058] text-white hover:bg-[#686a73]',
      3: 'bg-[var(--success)] text-white hover:bg-[var(--success-hover)]',
      4: 'bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)]',
      5: 'bg-[#4e5058] text-[#dbdee1] hover:bg-[#686a73]',
    };

    const cls = styleClasses[b.style] || styleClasses[5];
    const emojiElement = b.emoji.trim() ? (
      <span className="text-[18px] leading-none select-none">{b.emoji}</span>
    ) : null;
    const labelElement = b.label.trim() ? (
      <span className="text-[14px] font-medium leading-none">{b.label}</span>
    ) : null;

    // Render as anchor if link style
    if (b.style === 5) {
      return (
        <a
          key={b.id}
          href={b.url.trim() ? b.url : 'https://example.com'}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] transition-colors text-decoration-none shadow-[0_1px_2px_rgba(0,0,0,0.15)] hover:no-underline ${cls}`}
        >
          {emojiElement}
          {labelElement}
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      );
    }

    return (
      <button
        key={b.id}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.15)] ${cls}`}
        onClick={() => {}}
      >
        {emojiElement}
        {labelElement}
      </button>
    );
  };

  const renderActionRow = (row: ActionRow) => {
    const validButtons = row.buttons.filter(b => b.label.trim() || b.emoji.trim());
    if (validButtons.length === 0) return null;

    return (
      <div key={row.id} className="flex flex-wrap gap-1.5 mt-1.5">
        {validButtons.map(renderButton)}
      </div>
    );
  };

  const renderGuideButton = (b: any) => {
    if (!b || typeof b !== 'object') return null;

    // Discord styles mapping:
    // 1 = Primary (Blurple), 2 = Secondary (Grey), 3 = Success (Green), 4 = Danger (Red), 5 = Link (Grey with link arrow)
    const styleClasses: Record<number, string> = {
      1: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]',
      2: 'bg-[#4e5058] text-white hover:bg-[#686a73]',
      3: 'bg-[var(--success)] text-white hover:bg-[var(--success-hover)]',
      4: 'bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)]',
      5: 'bg-[rgba(78,80,88,0.4)] border border-[#4e5058] text-[#dbdee1] hover:bg-[rgba(78,80,88,0.8)]',
    };

    const cls = styleClasses[b.style] || styleClasses[5];

    let emojiElement = null;
    if (b.emoji) {
      if (typeof b.emoji === 'string' && b.emoji.trim()) {
        emojiElement = <span className="text-[18px] leading-none select-none">{b.emoji}</span>;
      } else if (typeof b.emoji === 'object') {
        if (b.emoji.id) {
          emojiElement = (
            <img 
              src={`https://cdn.discordapp.com/emojis/${b.emoji.id}.png`} 
              alt={b.emoji.name || ''} 
              className="w-5 h-5 object-contain flex-shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          );
        } else if (b.emoji.name) {
          emojiElement = <span className="text-[18px] leading-none select-none">{b.emoji.name}</span>;
        }
      }
    }

    const labelElement = b.label && b.label.trim() ? (
      <span className="text-[14px] font-semibold leading-none">{b.label}</span>
    ) : null;

    const key = b.id || Math.random().toString();

    // Render link button
    if (b.style === 5 || b.url) {
      return (
        <a
          key={key}
          href={b.url && b.url.trim() ? b.url : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[4px] transition-all text-decoration-none shadow-sm hover:no-underline hover:scale-[1.01] active:scale-[0.99] ${cls}`}
        >
          {emojiElement}
          {labelElement}
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      );
    }

    return (
      <button
        key={key}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[4px] transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] ${cls}`}
        onClick={() => {}}
      >
        {emojiElement}
        {labelElement}
      </button>
    );
  };

  const renderGuideComponent = (comp: any): React.ReactNode => {
    if (!comp || typeof comp !== 'object') return null;

    // Type 12: Banner Component
    if (comp.type === 12) {
      const item = comp.items?.[0];
      const url = item?.media?.url;
      if (!url) return null;
      return (
        <div key={comp.id || Math.random()} className="w-full rounded-[8px] overflow-hidden mb-4 shadow-sm border border-[rgba(255,255,255,0.06)]">
          <img src={url} alt="Banner" className="w-full h-auto object-cover max-h-[220px]" />
        </div>
      );
    }

    // Type 17: Container / Card Component
    if (comp.type === 17) {
      const childComponents = Array.isArray(comp.components) ? comp.components : [];
      return (
        <div 
          key={comp.id || Math.random()} 
          className="rounded-[8px] bg-[#2b2d31] border border-[#3f4147] p-5 mb-4 shadow-md flex flex-col gap-3 text-left w-full max-w-[620px]"
        >
          {childComponents.map((child: any) => renderGuideComponent(child))}
        </div>
      );
    }

    // Type 10: Text Component
    if (comp.type === 10) {
      return (
        <div key={comp.id || Math.random()} className="text-[15px] leading-[1.45] text-[#dbdee1] break-words whitespace-pre-wrap font-sans">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-[20px] font-bold text-white mb-2 mt-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-[17px] font-bold text-white mb-2 mt-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[15px] font-bold text-white mb-1">{children}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-[1.45] text-[#dbdee1]">{children}</p>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline">
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-[#1e1f22] text-[#e3e5e8] px-1 py-0.5 rounded-[3px] text-[0.85em] font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {comp.content || ''}
          </ReactMarkdown>
        </div>
      );
    }

    // Type 14: Divider
    if (comp.type === 14) {
      return (
        <hr key={comp.id || Math.random()} className="border-[#3f4147] border-t my-1.5" />
      );
    }

    // Type 9: Section block with left text and right media accessory
    if (comp.type === 9) {
      const subComps = Array.isArray(comp.components) ? comp.components : [];
      const accessory = comp.accessory;
      const imageUrl = accessory?.media?.url;

      return (
        <div key={comp.id || Math.random()} className="flex gap-4 items-start justify-between">
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {subComps.map((child: any) => renderGuideComponent(child))}
          </div>
          {imageUrl && (
            <div className="flex-shrink-0 self-center md:self-start w-16 h-16 md:w-20 md:h-20 rounded-[8px] overflow-hidden bg-[rgba(0,0,0,0.1)] flex items-center justify-center">
              <img 
                src={imageUrl} 
                alt="Accessory" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      );
    }

    // Type 1: Action Row / Row container
    if (comp.type === 1) {
      const buttons = Array.isArray(comp.components) ? comp.components : [];
      return (
        <div key={comp.id || Math.random()} className="flex flex-wrap gap-2 mt-1">
          {buttons.map((btn: any) => renderGuideButton(btn))}
        </div>
      );
    }

    return null;
  };

  return (
    <div id="discordPreview" className="flex flex-col gap-2 w-full">
      {messages.map((msg, index) => {
        const username = msg.username.trim() || (webhook ? webhook.name : 'Webhook');
        const avatarUrl = msg.avatarUrl.trim() || (webhook && webhook.avatar) || '';
        const initialLetter = username.charAt(0).toUpperCase() || 'W';

        return (
          <div
            key={msg.id}
            className="group flex gap-4 px-4 py-2 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.02)] rounded-[var(--radius-sm)] transition-colors text-left animate-fade-in"
          >
            {/* Avatar container */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative select-none mt-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-full h-full rounded-full object-cover relative z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="absolute inset-0 rounded-full text-white text-[18px] font-extrabold flex items-center justify-center font-sans"
                style={{
                  display: avatarUrl ? 'none' : 'flex',
                  background: 'radial-gradient(circle at 35% 35%, #6b4fbf 0%, #3a2880 50%, #150e40 100%)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                }}
              >
                {initialLetter}
                <div
                  className="absolute top-[3px] left-[6px] w-[50%] h-[40%] rounded-full opacity-15 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse, white 0%, transparent 80%)',
                  }}
                />
              </div>
            </div>

            {/* Message payload columns */}
            <div className="flex-1 min-w-0">
              {/* Meta details header */}
              <div className="flex items-baseline gap-2 mb-1 select-none">
                <span className="text-[15px] font-semibold text-[var(--text-0)] hover:underline cursor-pointer">
                  {username}
                </span>
                <span className="text-[10px] font-bold bg-[var(--brand)] text-white px-1 py-[1px] rounded-[3px] tracking-[0.3px] uppercase">
                  BOT
                </span>
                <span className="text-[11px] text-[var(--text-4)] select-none">
                  {getFormattedTime()}
                </span>
              </div>

              {msg.guideComponents && msg.guideComponents.length > 0 ? (
                <div className="mt-2 flex flex-col w-full max-w-[620px]">
                  {msg.guideComponents.map((comp) => renderGuideComponent(comp))}
                </div>
              ) : (
                <>
                  {/* Message content formatted in markdown */}
                  {msg.content.trim() ? renderMessageContent(msg.content) : null}

                  {/* Message embeds list */}
                  {msg.embeds.map(renderEmbed)}

                  {/* Message interactive action buttons */}
                  {msg.components.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {msg.components.map(renderActionRow)}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
