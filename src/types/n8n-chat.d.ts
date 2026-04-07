declare module '@n8n/chat' {
  export function createChat(options: {
    webhookUrl: string;
    target?: string;
    defaultLanguage?: string;
    initialMessages?: string[];
    i18n?: Record<string, Record<string, string>>;
    enableStreaming?: boolean;
  }): void;
}
