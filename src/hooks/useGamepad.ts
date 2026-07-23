import { useEffect, useRef, useCallback, useState } from "react";
import { vibrate } from "./vibrate";

export type ControllerType = "ps" | "xbox" | "generic" | "none";

export type GamepadAction =
  | "up" | "down" | "left" | "right"
  | "confirm" | "back" | "delete" | "search"
  | "lb" | "rb"
  | "start" | "select"
  | "toggle_hints"
  | "toggle_fav"
  | "open_kb"
  | "cycle_sort"
  | "toggle_view"
  | "pick_cover"
  | "toggle_tag_filter";

type GamepadCallback = (action: GamepadAction) => void;

const DEADZONE = 0.5;
const REPEAT_DELAY = 300;
const REPEAT_RATE = 120;

const ANALOG_ACTIONS = new Set<GamepadAction>(["up", "down", "left", "right"]);

function detectController(id: string): ControllerType {
  const lower = id.toLowerCase();
  if (lower.includes("dualsense") || lower.includes("dualshock") || lower.includes("wireless controller")) {
    return "ps";
  }
  if (lower.includes("xbox")) {
    return "xbox";
  }
  if (id.trim()) {
    return "generic";
  }
  return "none";
}

function vibrateForAction(gamepad: Gamepad, action: GamepadAction) {
  switch (action) {
    case "up": case "down": case "left": case "right":
      vibrate(gamepad, 50, 1.0, 0.8);
      break;
    case "confirm":
      vibrate(gamepad, 63, 1.0, 1.0);
      break;
    case "back":
      vibrate(gamepad, 50, 0.75, 0.75);
      break;
    case "lb": case "rb":
      vibrate(gamepad, 88, 1.0, 1.0);
      break;
    case "delete":
      vibrate(gamepad, 100, 1.0, 1.0);
      break;
    case "toggle_hints":
      vibrate(gamepad, 50, 0.75, 0.75);
      break;
    case "toggle_fav":
      vibrate(gamepad, 50, 0.5, 0.5);
      break;
    case "cycle_sort":
      vibrate(gamepad, 50, 0.6, 0.6);
      break;
    case "toggle_view":
      vibrate(gamepad, 50, 0.6, 0.6);
      break;
  }
}

export function useGamepad(callback: GamepadCallback) {
  const [controllerType, setControllerType] = useState<ControllerType>("none");
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const lastFiredRef = useRef<GamepadAction | null>(null);
  const lastFireTimeRef = useRef(0);
  const repeatStartedRef = useRef(false);

  const getAction = useCallback((gamepad: Gamepad): GamepadAction | null => {
    const b = gamepad.buttons;

    if (b[0]?.pressed) return "confirm";
    if (b[1]?.pressed) return "back";
    if (b[2]?.pressed) return "toggle_fav";
    if (b[3]?.pressed) return "toggle_hints";
    if (b[4]?.pressed) return "lb";
    if (b[5]?.pressed) return "rb";
    if (b[6]?.pressed) return "open_kb";
    if (b[7]?.pressed) return "cycle_sort";
    if (b[8]?.pressed) return "toggle_tag_filter";
    if (b[9]?.pressed) return "cycle_sort";
    if (b[10]?.pressed) return "toggle_view";
    if (b[11]?.pressed) return "pick_cover";
    if (b[12]?.pressed) return "up";
    if (b[13]?.pressed) return "down";
    if (b[14]?.pressed) return "left";
    if (b[15]?.pressed) return "right";

    const x = gamepad.axes[0];
    const y = gamepad.axes[1];
    if (x !== undefined && x > DEADZONE) return "right";
    if (x !== undefined && x < -DEADZONE) return "left";
    if (y !== undefined && y > DEADZONE) return "down";
    if (y !== undefined && y < -DEADZONE) return "up";

    return null;
  }, []);

  useEffect(() => {
    let running = true;

    function poll() {
      if (!running) return;
      const gamepads = navigator.getGamepads?.();
      const gp = gamepads?.[0];
      if (!gp) {
        setControllerType("none");
        requestAnimationFrame(poll);
        return;
      }

      setControllerType((prev) => {
        if (prev === "none") return detectController(gp.id);
        return prev;
      });

      const action = getAction(gp);

      if (action) {
        if (ANALOG_ACTIONS.has(action)) {
          if (action !== lastFiredRef.current) {
            vibrateForAction(gp, action);
            callbackRef.current(action);
            lastFiredRef.current = action;
            lastFireTimeRef.current = performance.now();
            repeatStartedRef.current = false;
          } else {
            const now = performance.now();
            const elapsed = now - lastFireTimeRef.current;
            if (!repeatStartedRef.current) {
              if (elapsed >= REPEAT_DELAY) {
                repeatStartedRef.current = true;
                lastFireTimeRef.current = now;
                vibrateForAction(gp, action);
                callbackRef.current(action);
              }
            } else if (elapsed >= REPEAT_RATE) {
              lastFireTimeRef.current = now;
              vibrateForAction(gp, action);
              callbackRef.current(action);
            }
          }
        } else {
          if (action !== lastFiredRef.current) {
            vibrateForAction(gp, action);
            callbackRef.current(action);
            lastFiredRef.current = action;
          }
        }
      } else {
        lastFiredRef.current = null;
      }

      requestAnimationFrame(poll);
    }

    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, GamepadAction> = {
        ArrowUp: "up", ArrowDown: "down",
        ArrowLeft: "left", ArrowRight: "right",
        Enter: "confirm", Escape: "back",
      };
      const action = map[e.key];
      if (action) {
        e.preventDefault();
        callbackRef.current(action);
      }
    };
    window.addEventListener("keydown", handleKey);
    requestAnimationFrame(poll);

    return () => {
      running = false;
      window.removeEventListener("keydown", handleKey);
    };
  }, [getAction]);

  return controllerType;
}
