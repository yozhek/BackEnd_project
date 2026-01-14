declare var process: {
  env: {
    TELEGRAM_BOT_TOKEN?: string
    NOTIFY_CALLBACK_URL?: string
    [key: string]: string | undefined
  }
  exit(code?: number): void
}
