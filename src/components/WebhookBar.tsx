import React from 'react';
import { WebhookInfo } from '../types';
import { Settings, X, Disc } from 'lucide-react';

interface WebhookBarProps {
  webhook: WebhookInfo | null;
  onEditClick: () => void;
  onRemoveClick: () => void;
}

export const WebhookBar: React.FC<WebhookBarProps> = ({
  webhook,
  onEditClick,
  onRemoveClick,
}) => {
  if (!webhook) return null;

  const letterFallback = (webhook.name || 'W').charAt(0).toUpperCase();

  return (
    <div
      id="webhookBar"
      className="h-[var(--webhookbar-height)] border-b border-[rgba(88,101,242,0.25)] flex items-center justify-between px-4 z-49 select-none"
      style={{
        background: 'linear-gradient(90deg, rgba(88,101,242,0.15), rgba(235,69,158,0.08))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0 w-7 h-7 relative">
          {webhook.avatar ? (
            <img
              id="webhookAvatar"
              src={webhook.avatar}
              alt={webhook.name}
              className="w-7 h-7 rounded-full object-cover"
              onError={(e) => {
                // If avatar fails to load, fallback to text avatar
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                if (sibling) sibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            id="webhookAvatarFallback"
            className="w-7 h-7 rounded-full text-white text-[12px] font-extrabold flex items-center justify-center font-sans"
            style={{
              display: webhook.avatar ? 'none' : 'flex',
              background: 'radial-gradient(circle at 35% 35%, #5b3fa6 0%, #2c1f6e 55%, #120d2e 100%)',
              boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.08)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {letterFallback}
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span id="webhookName" className="text-[13px] font-semibold text-[var(--text-0)] leading-none flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-[var(--brand)] animate-pulse" />
            {webhook.name}
          </span>
          <span id="webhookUrlDisplay" className="text-[11px] text-[var(--text-3)] truncate max-w-[200px] sm:max-w-[400px]">
            {webhook.url.replace(/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//, '.../webhooks/').substring(0, 48)}...
          </span>
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          onClick={onEditClick}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-4)] hover:text-[var(--text-0)] transition-all cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={onRemoveClick}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-[var(--radius-sm)] border border-transparent bg-transparent text-[var(--danger)] hover:bg-[rgba(242,63,66,0.15)] transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
    </div>
  );
};
