import { DiscordMessage, Embed, EmbedField, ActionRow, ButtonComponent, WebhookInfo, ButtonStyle } from './types';

// Generate safe unique IDs
export function genId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Color conversion: Hex string to Decimal integer for Discord
export function colorHexToDecimal(hex: string | null): number | undefined {
  if (!hex) return undefined;
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned, 16);
}

// Color conversion: Decimal integer to Hex string
export function colorDecimalToHex(num: number | undefined | null): string | null {
  if (num === undefined || num === null) return null;
  return '#' + num.toString(16).padStart(6, '0');
}

// Default constructors
export function createDefaultField(): EmbedField {
  return {
    id: genId(),
    name: '',
    value: '',
    inline: false
  };
}

export function createDefaultEmbed(): Embed {
  return {
    id: genId(),
    title: '',
    titleUrl: '',
    description: '',
    color: '#5865f2',
    authorName: '',
    authorUrl: '',
    authorIconUrl: '',
    thumbnail: '',
    image: '',
    footerText: '',
    footerIconUrl: '',
    timestamp: false,
    fields: []
  };
}

export function createDefaultButton(): ButtonComponent {
  return {
    id: genId(),
    style: 5, // Default Link style
    label: '',
    url: '',
    emoji: ''
  };
}

export function createDefaultActionRow(): ActionRow {
  return {
    id: genId(),
    buttons: []
  };
}

export function createDefaultMessage(withDefaults = false): DiscordMessage {
  const message: DiscordMessage = {
    id: genId(),
    content: '',
    username: '',
    avatarUrl: '',
    embeds: [],
    components: []
  };

  if (withDefaults) {
    message.content = 'Hey, welcome to **WebhookPanel**! The easiest way to personalize your Discord server.\n\nCreate a new message in the editor on the left, or play around with this default message.';
    
    const embed1 = createDefaultEmbed();
    embed1.title = 'What is this?';
    embed1.description = 'At its core, WebhookPanel is a simple message designer. You can use it to send fully customizable messages to your Discord server with the use of [webhooks](https://support.discord.com/hc/en-us/articles/228383668).';
    embed1.color = '#5865f2';
    
    const field1 = createDefaultField();
    field1.name = 'Getting Started';
    field1.value = 'Click **Add Webhook** at the top to add your Discord webhook URL, then click **Send**.';
    embed1.fields.push(field1);

    const embed2 = createDefaultEmbed();
    embed2.title = 'Get started';
    embed2.description = '- Click **Add Webhook** at the top left of the editor.\n- Paste your webhook URL or create a new one.\n- Finish up by clicking **Add Webhook** inside the prompt.\n- Now click **Send** to deliver your message!';
    embed2.color = '#5865f2';

    message.embeds = [embed1, embed2];

    const row = createDefaultActionRow();
    const btn1 = createDefaultButton();
    btn1.style = 5;
    btn1.label = 'Discord Support';
    btn1.url = 'https://discord.com';
    
    const btn2 = createDefaultButton();
    btn2.style = 1; // Primary
    btn2.label = 'Get Started';
    btn2.emoji = '🚀';

    row.buttons = [btn1, btn2];
    message.components = [row];
  }

  return message;
}

// Convert message to Discord Webhook payload
export function buildDiscordPayload(msg: DiscordMessage, webhook: WebhookInfo | null): any {
  const payload: any = {};
  
  if (msg.content && msg.content.trim()) {
    payload.content = msg.content;
  }
  
  const finalUsername = msg.username || (webhook ? webhook.name : 'Webhook');
  if (msg.username && msg.username.trim()) {
    payload.username = msg.username;
  }
  
  if (msg.avatarUrl && msg.avatarUrl.trim()) {
    payload.avatar_url = msg.avatarUrl;
  } else {
    // Generate fallback using UI-Avatars
    const letter = encodeURIComponent(finalUsername.charAt(0).toUpperCase());
    payload.avatar_url = `https://ui-avatars.com/api/?name=${letter}&background=5865F2&color=fff&size=256&font-size=0.55`;
  }

  if (msg.embeds && msg.embeds.length > 0) {
    payload.embeds = msg.embeds.map(e => {
      const embed: any = {};
      if (e.title && e.title.trim()) embed.title = e.title;
      if (e.titleUrl && e.titleUrl.trim()) embed.url = e.titleUrl;
      if (e.description && e.description.trim()) embed.description = e.description;
      
      const decColor = colorHexToDecimal(e.color);
      if (decColor !== undefined) embed.color = decColor;
      
      if (e.authorName && e.authorName.trim()) {
        embed.author = {
          name: e.authorName,
          ...(e.authorUrl && e.authorUrl.trim() ? { url: e.authorUrl } : {}),
          ...(e.authorIconUrl && e.authorIconUrl.trim() ? { icon_url: e.authorIconUrl } : {})
        };
      }
      
      if (e.thumbnail && e.thumbnail.trim()) {
        embed.thumbnail = { url: e.thumbnail };
      }
      
      if (e.image && e.image.trim()) {
        embed.image = { url: e.image };
      }
      
      if (e.footerText && e.footerText.trim() || e.footerIconUrl && e.footerIconUrl.trim()) {
        embed.footer = {
          ...(e.footerText && e.footerText.trim() ? { text: e.footerText } : {}),
          ...(e.footerIconUrl && e.footerIconUrl.trim() ? { icon_url: e.footerIconUrl } : {})
        };
      }
      
      if (e.timestamp) {
        embed.timestamp = new Date().toISOString();
      }
      
      if (e.fields && e.fields.length > 0) {
        embed.fields = e.fields
          .filter(f => f.name.trim() || f.value.trim())
          .map(f => ({
            name: f.name.trim() ? f.name : '\u200B', // Discord requires name and value to be non-empty
            value: f.value.trim() ? f.value : '\u200B',
            inline: f.inline
          }));
      }
      
      return embed;
    });
  }

  if (msg.components && msg.components.length > 0) {
    const validRows = msg.components
      .filter(row => row.buttons && row.buttons.some(b => b.label.trim() || b.emoji.trim()))
      .map(row => ({
        type: 1, // Action Row
        components: row.buttons
          .filter(b => b.label.trim() || b.emoji.trim())
          .map(b => {
            const btn: any = {
              type: 2,
              style: b.style,
              ...(b.label.trim() ? { label: b.label } : {}),
              ...(b.emoji.trim() ? { emoji: { name: b.emoji.trim() } } : {})
            };
            if (b.style === 5) {
              btn.url = b.url.trim() ? b.url : 'https://example.com';
            } else {
              btn.custom_id = `btn_${b.id}`;
            }
            return btn;
          })
      }));
    if (validRows.length > 0) {
      payload.components = validRows;
    }
  }

  return payload;
}

// Convert standard Discord Webhook payload object into DiscordMessage model structure
export function parseDiscordPayload(payload: any, existingMsgId?: string): DiscordMessage {
  const msgId = existingMsgId || genId();
  
  const avatarVal = typeof payload.avatar_url === 'string' 
    ? payload.avatar_url 
    : (typeof payload.avatarUrl === 'string' 
        ? payload.avatarUrl 
        : (typeof payload.avatar === 'string' ? payload.avatar : ''));

  const msg: DiscordMessage = {
    id: msgId,
    content: typeof payload.content === 'string' ? payload.content : '',
    username: typeof payload.username === 'string' ? payload.username : '',
    avatarUrl: avatarVal,
    embeds: [],
    components: []
  };

  if (Array.isArray(payload.embeds)) {
    msg.embeds = payload.embeds.map((emb: any) => {
      let hexColor = '#5865f2';
      if (emb.color !== undefined && emb.color !== null) {
        if (typeof emb.color === 'number') {
          hexColor = colorDecimalToHex(emb.color) || '#5865f2';
        } else if (typeof emb.color === 'string') {
          hexColor = emb.color.startsWith('#') ? emb.color : `#${emb.color}`;
        }
      }

      const e: Embed = {
        id: genId(),
        title: emb.title || '',
        titleUrl: emb.url || '',
        description: emb.description || '',
        color: hexColor,
        authorName: emb.author?.name || '',
        authorUrl: emb.author?.url || '',
        authorIconUrl: emb.author?.icon_url || '',
        thumbnail: typeof emb.thumbnail === 'string' ? emb.thumbnail : (emb.thumbnail?.url || ''),
        image: typeof emb.image === 'string' ? emb.image : (emb.image?.url || ''),
        footerText: emb.footer?.text || '',
        footerIconUrl: emb.footer?.icon_url || '',
        timestamp: !!emb.timestamp,
        fields: []
      };

      if (Array.isArray(emb.fields)) {
        e.fields = emb.fields.map((fld: any) => ({
          id: genId(),
          name: fld.name || '',
          value: fld.value || '',
          inline: !!fld.inline
        }));
      }

      return e;
    });
  }

  if (Array.isArray(payload.components)) {
    const isGuide = payload.components.some((c: any) => c.type === 12 || c.type === 17 || c.type === 9 || c.type === 10 || c.type === 14);
    if (isGuide) {
      msg.guideComponents = payload.components;
    } else {
      msg.components = payload.components
        .filter((row: any) => row.type === 1 && Array.isArray(row.components))
        .map((row: any) => {
          const actionRow: ActionRow = {
            id: genId(),
            buttons: row.components
              .filter((c: any) => c.type === 2)
              .map((c: any) => {
                const customId = c.custom_id || c.customId || c.id || '';
                const cleanId = customId.startsWith('btn_') ? customId.replace('btn_', '') : (customId || genId());
                return {
                  id: cleanId,
                  style: c.style || 5,
                  label: c.label || '',
                  url: c.url || '',
                  emoji: c.emoji?.name || ''
                };
              })
          };
          return actionRow;
        });
    }
  }

  return msg;
}

// Recursively parse any nested or custom Discord JSON formats (Vencord plugins, raw messages, webhooks)
export function parseAnyRawMessage(raw: any): DiscordMessage {
  const msgId = genId();
  
  // Extract username and avatar from standard fields or nested author object
  let username = raw.username || '';
  let avatarUrl = raw.avatar_url || raw.avatarUrl || raw.avatar || '';
  
  if (raw.author && typeof raw.author === 'object') {
    const author = raw.author;
    if (author.username) username = author.username;
    if (author.globalName) username = author.globalName;
    if (author.displayName) username = author.displayName;
    
    if (author.id && author.avatar) {
      const isGif = author.avatar.startsWith('a_');
      const ext = isGif ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.${ext}`;
    }
  }

  // Extract main content
  let content = raw.content || '';
  
  // Check if standard components of type 1 (Action Rows) are present
  const hasStandardActionRows = Array.isArray(raw.components) && raw.components.some((row: any) => row.type === 1);

  // Track elements from custom components
  const extractedTexts: string[] = [];
  const extractedButtons: ButtonComponent[] = [];
  const extractedImages: string[] = [];
  
  // Recursive helper to scan any component tree for elements
  function traverseComponents(node: any) {
    if (!node || typeof node !== 'object') return;
    
    // Check if this node is a button (type 2) or has button-like fields
    if ((node.type === 2 || (node.label && (node.url || node.style))) && !hasStandardActionRows) {
      let emojiStr = '';
      if (node.emoji) {
        if (typeof node.emoji === 'string') {
          emojiStr = node.emoji;
        } else if (typeof node.emoji === 'object') {
          emojiStr = node.emoji.name || node.emoji.id || '';
        }
      }
      const customId = node.custom_id || node.customId || node.id || '';
      const cleanId = customId.startsWith('btn_') ? customId.replace('btn_', '') : (customId || genId());
      extractedButtons.push({
        id: cleanId,
        style: (node.style === 5 || node.url) ? 5 : (node.style || 1) as ButtonStyle,
        label: node.label || '',
        url: node.url || '',
        emoji: emojiStr
      });
    }
    
    // Check if this node is a text block (type 10 or content block)
    if ((node.type === 10 || node.type === 'text') && typeof node.content === 'string') {
      extractedTexts.push(node.content);
    }
    
    // Check if this node is media/image (type 12 or has media.url)
    if (node.media && typeof node.media === 'object' && typeof node.media.url === 'string') {
      extractedImages.push(node.media.url);
    } else if (node.type === 12 && Array.isArray(node.items)) {
      node.items.forEach((item: any) => {
        if (item?.media?.url) {
          extractedImages.push(item.media.url);
        }
      });
    }

    // Traverse children arrays
    if (Array.isArray(node.components)) {
      node.components.forEach(traverseComponents);
    }
    if (Array.isArray(node.items)) {
      node.items.forEach(traverseComponents);
    }
    if (Array.isArray(node.elements)) {
      node.elements.forEach(traverseComponents);
    }
  }

  // Run traversal if components exist
  if (Array.isArray(raw.components)) {
    raw.components.forEach(traverseComponents);
  }

  // Merge extracted text blocks into content if main content was empty, or append them
  if (extractedTexts.length > 0) {
    const textBlock = extractedTexts.join('\n\n');
    if (content) {
      content += '\n\n' + textBlock;
    } else {
      content = textBlock;
    }
  }

  // Parse standard embeds
  let embeds: Embed[] = [];
  if (Array.isArray(raw.embeds)) {
    embeds = raw.embeds.map((emb: any) => {
      let hexColor = '#5865f2';
      if (emb.color !== undefined && emb.color !== null) {
        if (typeof emb.color === 'number') {
          hexColor = colorDecimalToHex(emb.color) || '#5865f2';
        } else if (typeof emb.color === 'string') {
          hexColor = emb.color.startsWith('#') ? emb.color : `#${emb.color}`;
        }
      }

      const e: Embed = {
        id: genId(),
        title: emb.title || '',
        titleUrl: emb.url || '',
        description: emb.description || '',
        color: hexColor,
        authorName: emb.author?.name || '',
        authorUrl: emb.author?.url || '',
        authorIconUrl: emb.author?.icon_url || '',
        thumbnail: typeof emb.thumbnail === 'string' ? emb.thumbnail : (emb.thumbnail?.url || ''),
        image: typeof emb.image === 'string' ? emb.image : (emb.image?.url || ''),
        footerText: emb.footer?.text || '',
        footerIconUrl: emb.footer?.icon_url || '',
        timestamp: !!emb.timestamp,
        fields: []
      };

      if (Array.isArray(emb.fields)) {
        e.fields = emb.fields.map((fld: any) => ({
          id: genId(),
          name: fld.name || '',
          value: fld.value || '',
          inline: !!fld.inline
        }));
      }

      return e;
    });
  }

  // Handle images from custom Vencord components if any
  if (extractedImages.length > 0) {
    extractedImages.forEach((imgUrl, idx) => {
      if (embeds.length > idx) {
        if (!embeds[idx].image) {
          embeds[idx].image = imgUrl;
        } else {
          const emb = createDefaultEmbed();
          emb.image = imgUrl;
          emb.color = '#5865f2';
          embeds.push(emb);
        }
      } else {
        const emb = createDefaultEmbed();
        emb.image = imgUrl;
        emb.color = '#5865f2';
        embeds.push(emb);
      }
    });
  }

  // Group buttons into standard Action Rows
  const components: ActionRow[] = [];
  if (hasStandardActionRows) {
    raw.components
      .filter((row: any) => row.type === 1 && Array.isArray(row.components))
      .forEach((row: any) => {
        const actionRow: ActionRow = {
          id: genId(),
          buttons: row.components
            .filter((c: any) => c.type === 2)
            .map((c: any) => {
              let emojiStr = '';
              if (c.emoji) {
                if (typeof c.emoji === 'string') {
                  emojiStr = c.emoji;
                } else if (typeof c.emoji === 'object') {
                  emojiStr = c.emoji.name || c.emoji.id || '';
                }
              }
              const customId = c.custom_id || c.customId || c.id || '';
              const cleanId = customId.startsWith('btn_') ? customId.replace('btn_', '') : (customId || genId());
              return {
                id: cleanId,
                style: (c.style || 5) as ButtonStyle,
                label: c.label || '',
                url: c.url || '',
                emoji: emojiStr
              };
            })
        };
        if (actionRow.buttons.length > 0) {
          components.push(actionRow);
        }
      });
  } else if (extractedButtons.length > 0) {
    let currentRow = createDefaultActionRow();
    extractedButtons.forEach((btn) => {
      if (currentRow.buttons.length >= 5) {
        components.push(currentRow);
        currentRow = createDefaultActionRow();
      }
      currentRow.buttons.push(btn);
    });
    if (currentRow.buttons.length > 0) {
      components.push(currentRow);
    }
  }

  const isGuide = Array.isArray(raw.components) && raw.components.some((c: any) => c.type === 12 || c.type === 17 || c.type === 9 || c.type === 10 || c.type === 14);

  return {
    id: msgId,
    content,
    username,
    avatarUrl,
    embeds,
    components,
    ...(isGuide ? { guideComponents: raw.components } : {})
  };
}

// Main high-level parser for the imported raw JSON string
export function parseImportedJSON(jsonString: string): DiscordMessage[] {
  const cleanJson = jsonString.trim();
  if (!cleanJson) {
    throw new Error('Dữ liệu trống.');
  }

  const parsed = JSON.parse(cleanJson);
  
  if (Array.isArray(parsed)) {
    return parsed.map(item => parseAnyRawMessage(item));
  } else if (parsed && typeof parsed === 'object') {
    // Check if it's the custom share state format
    if (Array.isArray(parsed.messages)) {
      return parsed.messages.map((m: any) => {
        if (m.data) {
          return parseAnyRawMessage({ ...m.data, id: m._id || m.id });
        }
        return parseAnyRawMessage(m);
      });
    }
    return [parseAnyRawMessage(parsed)];
  }
  
  throw new Error('Định dạng JSON không hợp lệ.');
}

// Share state URL helper functions (Unicode-safe Base64)
export function encodeData(messages: DiscordMessage[], webhook: WebhookInfo | null): string {
  try {
    const shareObj = {
      version: 'd2',
      messages: messages.map(m => ({
        _id: m.id,
        data: buildDiscordPayload(m, webhook)
      })),
      webhook: webhook || undefined
    };
    const jsonStr = JSON.stringify(shareObj);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  } catch (err) {
    console.error('Encoding share state error:', err);
    return '';
  }
}

export function decodeData(encoded: string): { messages: DiscordMessage[]; webhook: WebhookInfo | null } | null {
  try {
    const jsonStr = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(jsonStr);
    
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    
    const messages: DiscordMessage[] = parsed.messages.map((m: any) => {
      const d = m.data || {};
      
      // Parse component rows from discord layout back to our editable format
      const components: ActionRow[] = [];
      if (Array.isArray(d.components)) {
        d.components.forEach((row: any) => {
          if (row.type === 1 && Array.isArray(row.components)) {
            const buttons: ButtonComponent[] = row.components.map((btn: any) => ({
              id: btn.custom_id ? btn.custom_id.replace('btn_', '') : genId(),
              style: (btn.style || 5) as ButtonStyle,
              label: btn.label || '',
              url: btn.url || '',
              emoji: (btn.emoji && btn.emoji.name) || ''
            }));
            components.push({
              id: genId(),
              buttons
            });
          }
        });
      }

      // Parse embeds from discord layout back to our editable format
      const embeds: Embed[] = [];
      if (Array.isArray(d.embeds)) {
        d.embeds.forEach((e: any) => {
          const fields: EmbedField[] = [];
          if (Array.isArray(e.fields)) {
            e.fields.forEach((f: any) => {
              fields.push({
                id: genId(),
                name: f.name || '',
                value: f.value || '',
                inline: !!f.inline
              });
            });
          }

          embeds.push({
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
          });
        });
      }

      return {
        id: m._id || genId(),
        content: d.content || '',
        username: d.username || '',
        avatarUrl: d.avatar_url || '',
        embeds,
        components
      };
    });

    return {
      messages,
      webhook: parsed.webhook || null
    };
  } catch (err) {
    console.error('Decoding share state error:', err);
    return null;
  }
}

// Blend colors for gradient generation
export function blendHexColors(c1: string, c2: string, p: number): string {
  const f = parseInt(c1.slice(1), 16),
        t = parseInt(c2.slice(1), 16),
        R1 = f >> 16, G1 = (f >> 8) & 0x00ff, B1 = f & 0x0000ff,
        R2 = t >> 16, G2 = (t >> 8) & 0x00ff, B2 = t & 0x0000ff;
  return "#" + (0x1000000 + Math.round((R2 - R1) * p + R1) * 0x10000 + Math.round((G2 - G1) * p + G1) * 0x100 + Math.round((B2 - B1) * p + B1)).toString(16).slice(1);
}

// Draw gradient avatar on canvas
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  letter: string,
  colorStart: string,
  colorEnd: string
) {
  const finalLetter = (letter.trim() || 'W').charAt(0).toUpperCase();
  
  // Clean canvas & shadows
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw base radial gradient background
  const grad = ctx.createRadialGradient(90, 90, 0, 90, 90, 200);
  grad.addColorStop(0, colorStart);
  grad.addColorStop(0.5, blendHexColors(colorStart, colorEnd, 0.4));
  grad.addColorStop(1, colorEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  
  // Draw top-aligned subtle gloss highlight
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(128, 70, 90, 60, 0, 0, Math.PI * 2);
  const gloss = ctx.createRadialGradient(128, 70, 0, 128, 70, 90);
  gloss.addColorStop(0, 'rgba(255,255,255,0.25)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();
  
  // Draw center letters with shadow
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 140px "Inter", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillText(finalLetter, 128, 140);
}

// Calculate precise character counts for Discord API limits
export function getMessageCharacterCount(msg: DiscordMessage): {
  content: number;
  embedsTotal: number;
  embeds: Array<{ id: string; total: number; title: number; description: number; author: number; footer: number; fields: number }>;
  total: number;
} {
  const content = msg.content?.length || 0;
  let embedsTotal = 0;
  const embeds = msg.embeds.map(e => {
    const title = e.title?.length || 0;
    const description = e.description?.length || 0;
    const author = e.authorName?.length || 0;
    const footer = e.footerText?.length || 0;
    const fields = e.fields.reduce((acc, f) => acc + (f.name?.length || 0) + (f.value?.length || 0), 0);
    const total = title + description + author + footer + fields;
    embedsTotal += total;
    return {
      id: e.id,
      total,
      title,
      description,
      author,
      footer,
      fields
    };
  });
  return {
    content,
    embedsTotal,
    embeds,
    total: content + embedsTotal
  };
}

// Synthetic high-quality Discord Notification ping sound using Web Audio API (completely offline)
export function playDiscordPing() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Discord notification sound has two rapid sweet sine notes:
    // First note is brief, second is slightly higher and ringed.
    // Let's model it perfectly:
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(640, now); // ~640Hz frequency
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.05); // shifted up delay node
    gain2.gain.setValueAtTime(0.06, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);

    osc2.start(now + 0.05);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn('Web Audio API play error', err);
  }
}

