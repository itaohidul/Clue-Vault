import { useEffect, ReactNode } from "react";

export default function TelegramProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.style.background = "#000000";
  }, []);
  return <>{children}</>;
}
