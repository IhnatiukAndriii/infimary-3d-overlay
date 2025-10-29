import { useEffect, useState } from "react";

export default function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    window.innerWidth < 900 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
}