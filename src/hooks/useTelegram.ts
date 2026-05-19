export const useTelegram = () => {
  // Ensure we safely access window and Telegram properties
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    queryId: tg?.initDataUnsafe?.query_id,
    startParam: tg?.initDataUnsafe?.start_param,
  };
};
