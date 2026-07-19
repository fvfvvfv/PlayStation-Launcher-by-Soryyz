export function vibrate(gamepad: Gamepad, durationMs: number, strongMagnitude = 1.0, weakMagnitude = 1.0) {
  try {
    const actuator = (gamepad as any).vibrationActuator;
    if (actuator?.playEffect) {
      actuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: durationMs,
        strongMagnitude,
        weakMagnitude,
      });
    }
  } catch {}
}
