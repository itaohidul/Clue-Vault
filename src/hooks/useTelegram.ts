export const useTelegram = () => {
  // Ensure we safely access window and Telegram properties
  const hasTg = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
  const tg = hasTg ? window.Telegram.WebApp : undefined;

  return {
    tg,
    user: tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : undefined,
    queryId: tg && tg.initDataUnsafe ? tg.initDataUnsafe.query_id : undefined,
    startParam: tg && tg.initDataUnsafe ? tg.initDataUnsafe.start_param : undefined,
  };
};
