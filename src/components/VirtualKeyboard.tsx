import { useState, useEffect, useRef, useMemo } from "react";
import type { Icons } from "./ControllerIcons";
import { useLocale } from "../hooks/useLocale";

interface Props {
  icons: Icons;
  kbFocus: number;
  onKbFocusChange: (i: number) => void;
  onInput: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onClose: () => void;
  buttonsRef?: React.MutableRefObject<HTMLElement[]>;
  layoutInfoRef?: React.MutableRefObject<{ perRow: number[]; totalKeys: number; funcCount: number }>;
}

const NUM_ROW = ["1","2","3","4","5","6","7","8","9","0"].map(ch => ({ label: ch, value: ch }));

const EN_ROWS: { label: string; value: string }[][] = [
  ["q","w","e","r","t","y","u","i","o","p"].map(ch => ({ label: ch, value: ch })),
  ["a","s","d","f","g","h","j","k","l","'"].map(ch => ({ label: ch, value: ch })),
  ["z","x","c","v","b","n","m",",",".","?"].map(ch => ({ label: ch, value: ch })),
];

const RU_ROWS: { label: string; value: string }[][] = [
  ["й","ц","у","к","е","н","г","ш","щ","ё"].map(ch => ({ label: ch, value: ch })),
  ["з","х","ъ","ф","ы","в","а","п","р","о"].map(ch => ({ label: ch, value: ch })),
  ["л","д","ж","э","я","ч","с","м","и","т"].map(ch => ({ label: ch, value: ch })),
  ["ь","б","ю",",",".","?","!","«","»","\""].map(ch => ({ label: ch, value: ch })),
];

const SYM_ROWS: { label: string; value: string }[][] = [
  ["!","@","#","$","%","^","&","*","(",")"].map(ch => ({ label: ch, value: ch })),
  ["~","`","_","-","+","=","{","}","[","]"].map(ch => ({ label: ch, value: ch })),
  ["|","\\",":",";","\"","'","<",">","/","?"].map(ch => ({ label: ch, value: ch })),
  ["1","2","3","4","5","6","7","8","9","0"].map(ch => ({ label: ch, value: ch })),
];

export function VirtualKeyboard({ icons, kbFocus, onKbFocusChange, onInput, onBackspace, onEnter, onClose, buttonsRef, layoutInfoRef }: Props) {
  const { t } = useLocale();
  const [shift, setShift] = useState(false);
  const [sym, setSym] = useState(false);
  const [lang, setLang] = useState<"ru" | "en">("en");
  const kbRef = useRef<HTMLDivElement>(null);
  const localRefs = useRef<HTMLElement[]>([]);

  const rows = useMemo(() => {
    if (sym) return [NUM_ROW, ...SYM_ROWS];
    return [NUM_ROW, ...(lang === "ru" ? RU_ROWS : EN_ROWS)];
  }, [sym, lang]);

  const letterKeyCount = rows.reduce((s, r) => s + r.length, 0);
  const funcCount = 0;
  const perRow = rows.map(r => r.length);
  const perRowAll = [...perRow, 5, 5];
  const totalKeys = perRowAll.reduce((s, c) => s + c, 0);
  const focusIndex = kbFocus >= 0 && kbFocus < totalKeys ? kbFocus : 0;

  useEffect(() => {
    if (layoutInfoRef) {
      layoutInfoRef.current = { perRow: perRowAll, totalKeys, funcCount: 0 };
    }
  }, [layoutInfoRef, perRowAll, totalKeys, funcCount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (kbRef.current && !kbRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "Backspace") onBackspace();
      else if (e.key === "Enter") onEnter();
      else if (e.key === " ") onInput(" ");
      else if (e.key.length === 1) {
        const target = rows.flat().find(k => k.value === e.key.toLowerCase());
        if (target) onInput(shift ? target.value.toUpperCase() : target.value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onBackspace, onEnter, onInput, shift, rows]);

  function setRef(el: HTMLElement | null, idx: number) {
    if (el) {
      localRefs.current[idx] = el;
      if (buttonsRef) buttonsRef.current[idx] = el;
      if (focusIndex === idx) el.scrollIntoView?.({ block: "nearest" });
    }
  }

  return (
    <div className="virtual-keyboard" ref={kbRef}>
      {rows.map((row, ri) => (
        <div key={ri} className="vk-row">
          {row.map((ch) => {
            const globalIdx = (() => {
              let idx = 0;
              for (let r = 0; r < ri; r++) idx += rows[r].length;
              idx += row.indexOf(ch);
              return idx;
            })();
            return (
              <button
                key={`${ri}-${ch.value}`}
                className={`vk-key ${focusIndex === globalIdx ? "vk-focused" : ""}`}
                onClick={() => { onInput(shift ? ch.value.toUpperCase() : ch.value); onKbFocusChange(globalIdx); }}
                ref={(el) => setRef(el, globalIdx)}
              >
                {shift ? ch.label.toUpperCase() : ch.label}
              </button>
            );
          })}
        </div>
      ))}
      <div className="vk-row">
        {(() => {
          const shiftIdx = letterKeyCount;
          const symIdx = letterKeyCount + 1;
          const langIdx = letterKeyCount + 2;
          const spaceIdx = letterKeyCount + 3;
          const bsIdx = letterKeyCount + 4;
          return (
            <>
              <button className={`vk-key vk-wide1 ${focusIndex === shiftIdx ? "vk-focused" : ""}`} onClick={() => { setShift((s) => !s); onKbFocusChange(shiftIdx); }} ref={(el) => setRef(el, shiftIdx)}>
                <span className="vk-key-label">{shift ? <icons.ShiftActiveIcon /> : <icons.ShiftIcon />}</span>
              </button>
              <button className={`vk-key vk-wide1 ${focusIndex === symIdx ? "vk-focused" : ""}`} onClick={() => { setSym((s) => !s); onKbFocusChange(symIdx); }} ref={(el) => setRef(el, symIdx)}>
                <span className="vk-key-label">{sym ? "ABC" : "#+="}</span>
              </button>
              <button className={`vk-key vk-wide2 ${focusIndex === langIdx ? "vk-focused" : ""}`} onClick={() => { setLang((l) => l === "ru" ? "en" : "ru"); onKbFocusChange(langIdx); }} ref={(el) => setRef(el, langIdx)}>
                <span className="vk-key-label">{lang === "ru" ? "EN" : "RU"}</span>
              </button>
              <button className={`vk-key vk-wide4 ${focusIndex === spaceIdx ? "vk-focused" : ""}`} onClick={() => { onInput(" "); onKbFocusChange(spaceIdx); }} ref={(el) => setRef(el, spaceIdx)} />
              <button className={`vk-key vk-wide2 ${focusIndex === bsIdx ? "vk-focused" : ""}`} onClick={() => { onBackspace(); onKbFocusChange(bsIdx); }} ref={(el) => setRef(el, bsIdx)}>
                <span className="vk-key-label"><icons.BackspaceIcon /></span>
              </button>
            </>
          );
        })()}
      </div>
      <div className="vk-row">
        {(() => {
          const upIdx = letterKeyCount + 5;
          const downIdx = letterKeyCount + 6;
          const leftIdx = letterKeyCount + 7;
          const rightIdx = letterKeyCount + 8;
          const doneIdx = letterKeyCount + 9;
          return (
            <>
              <button className={`vk-key vk-wide1 ${focusIndex === upIdx ? "vk-focused" : ""}`} onClick={() => onKbFocusChange(upIdx)} ref={(el) => setRef(el, upIdx)}>
                <span className="vk-key-label"><icons.ArrowUpIcon /></span>
              </button>
              <button className={`vk-key vk-wide1 ${focusIndex === downIdx ? "vk-focused" : ""}`} onClick={() => onKbFocusChange(downIdx)} ref={(el) => setRef(el, downIdx)}>
                <span className="vk-key-label"><icons.ArrowDownIcon /></span>
              </button>
              <button className={`vk-key vk-wide1 ${focusIndex === leftIdx ? "vk-focused" : ""}`} onClick={() => onKbFocusChange(leftIdx)} ref={(el) => setRef(el, leftIdx)}>
                <span className="vk-key-label"><icons.ArrowLeftIcon /></span>
              </button>
              <button className={`vk-key vk-wide1 ${focusIndex === rightIdx ? "vk-focused" : ""}`} onClick={() => onKbFocusChange(rightIdx)} ref={(el) => setRef(el, rightIdx)}>
                <span className="vk-key-label"><icons.ArrowRightIcon /></span>
              </button>
              <button className={`vk-key vk-done ${focusIndex === doneIdx ? "vk-focused" : ""}`} onClick={() => { onEnter(); onKbFocusChange(doneIdx); }} ref={(el) => setRef(el, doneIdx)}>
                <span className="vk-key-label">{t("done")}</span>
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
}
