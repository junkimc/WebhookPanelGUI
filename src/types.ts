export interface WebhookInfo {
  url: string;
  name: string;
  avatar: string | null;
  channelId?: string;
  guildId?: string;
}

export interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

export interface Embed {
  id: string;
  title: string;
  titleUrl: string;
  description: string;
  color: string | null; // e.g. '#5865f2'
  authorName: string;
  authorUrl: string;
  authorIconUrl: string;
  thumbnail: string;
  image: string;
  footerText: string;
  footerIconUrl: string;
  timestamp: boolean;
  fields: EmbedField[];
}

export type ButtonStyle = 1 | 2 | 3 | 4 | 5;

export interface ButtonComponent {
  id: string;
  style: ButtonStyle;
  label: string;
  url: string;
  emoji: string;
}

export interface ActionRow {
  id: string;
  buttons: ButtonComponent[];
}

export interface DiscordMessage {
  id: string;
  content: string;
  username: string;
  avatarUrl: string;
  embeds: Embed[];
  components: ActionRow[];
  guideComponents?: any[];
}

export interface SavedTemplate {
  id: string;
  name: string;
  messages: DiscordMessage[];
  savedAt: number;
  tags?: string[];
}

export type AppTheme = 'dark' | 'light' | 'blurple' | 'forest' | 'cyberpunk' | 'ocean';
