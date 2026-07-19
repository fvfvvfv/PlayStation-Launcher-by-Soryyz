import { useEffect, useRef, useState, useContext } from "react";
import { LocaleContext } from "../hooks/useLocale";

interface Props {
  onFinish: () => void;
}

export function VideoIntro({ onFinish }: Props) {
  const [fadeOut, setFadeOut] = useState(false);
  const { t } = useContext(LocaleContext);
  const [tipKey] = useState(() => `tip_${Math.floor(Math.random() * 6) + 1}`);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onError = () => { setFadeOut(true); setTimeout(onFinish, 500); };
    el.addEventListener("error", onError);
    const fallback = setTimeout(() => { setFadeOut(true); setTimeout(onFinish, 500); }, 8000);
    return () => {
      el.removeEventListener("error", onError);
      clearTimeout(fallback);
    };
  }, [onFinish]);

  return (
    <div className="video-intro" style={{ opacity: fadeOut ? 0 : 1 }}>
      <video
        ref={videoRef}
        src="/intro/intro.mp4"
        autoPlay
        playsInline
        className="video-intro-video"
        onEnded={() => { setFadeOut(true); setTimeout(onFinish, 500); }}
      />
      <div className="intro-tip">{t(tipKey)}</div>
    </div>
  );
}
