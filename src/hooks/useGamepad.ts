import { useEffect, useRef, useCallback, useState } from "react";
import { vibrate } from "./vibrate";

export type ControllerType = "ps" | "xbox" | "generic" | "none";

export type GamepadAction =
  | "up" | "down" | "left" | "right"
  | "confirm" | "back" | "delete" | "search"
  | "lb" | "rb"
  | "start" | "select"
  | "toggle_hints";

type GamepadCallback = (action: GamepadAction) => void;

const DEADZONE = 0.5;

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
  }
}

export function useGamepad(callback: GamepadCallback) {
  const [controllerType, setControllerType] = useState<ControllerType>("none");
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const lastFiredRef = useRef<GamepadAction | null>(null);

  const getAction = useCallback((gamepad: Gamepad): GamepadAction | null => {
    const b = gamepad.buttons;

    if (b[0]?.pressed) return "confirm";   // A / Cross
    if (b[1]?.pressed) return "back";      // B / Circle
    if (b[2]?.pressed) return "search";    // X / Square
    if (b[3]?.pressed) return "toggle_hints"; // Y / Triangle
    if (b[4]?.pressed) return "lb";
    if (b[5]?.pressed) return "rb";
    if (b[8]?.pressed) return "select";
    if (b[9]?.pressed) return "start";
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
        if (action !== lastFiredRef.current) {
          vibrateForAction(gp, action);
          callbackRef.current(action);
          lastFiredRef.current = action;
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
