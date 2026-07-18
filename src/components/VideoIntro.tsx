import { useEffect, useRef, useState } from "react";

interface Props {
  onFinish: () => void;
}

const TIPS = [
  "Я ещё не придумал как убрать фризы загрузки",
  "Подпишись на мой ТикТок — @soryyz_project",
  "Сделано с любовью в Беларуси",
  "Лучше DualShock'a только DualSense",
  "Запускай и играй — никаких лаунчеров",
  "Спонсор этого текста — твоё терпение",
  "SLauncher > PlayStation 5 UI",
];

export function VideoIntro({ onFinish }: Props) {
  const [fadeOut, setFadeOut] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
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
      <div className="intro-tip">{tip}</div>
    </div>
  );
}