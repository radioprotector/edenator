import { MathUtils } from 'three';
import Lull from "./Lull";
import Peak from "./Peak";

/**
 * Handles controller detection and haptic feedback
 * {@see https://github.com/luser/gamepadtest}
 */
export class HapticManager {

  /**
   * The name of the window event bubbled when gamepads are connected or disconnected.
   */
  public static readonly ChangeEventName: string = 'HapticGamepadsChanged';

  private gamepads: Gamepad[] = [];

  /**
   * Indicates whether or not haptic feedback is enabled.
   */
  public isEnabled: boolean = false;

  private managerInitialized: boolean = false;

  /**
   * Ensures that the haptic manager is initialized with appropriate controller detection.
   */
  public ensureInitialized(): void {
    if (this.managerInitialized) {
      return;
    }

    // Look for events to handle, but fall back to polling when needed
    if ('GamepadEvent' in window) {
      window.addEventListener('gamepadconnected', this.handleGamepadConnected);
      window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    }

    // Request vibration access if available, by making a dummy call
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      }
      catch {}
    }

    this.managerInitialized = true;
  }

  /**
   * Disposes the haptic manager.
   */
  public dispose(): void {
    if ('GamepadEvent' in window) {
      window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    }
  }

  private handleGamepadConnected = (event: GamepadEvent): void => {
    const gamepad = event.gamepad;

    if (process.env.NODE_ENV !== 'production') {
      console.log('gamepad connected', gamepad);
    } 

    // Add this to the list if it has any actuators
    if (this.getActuatorsForGamepad(gamepad).length > 0) {
      this.gamepads[event.gamepad.index] = event.gamepad;

      window.dispatchEvent(new CustomEvent(HapticManager.ChangeEventName));
    }
  };

  private handleGamepadDisconnected = (event: GamepadEvent): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('gamepad disconnected', event.gamepad);
    }

    // Remove from the array if available
    if (event.gamepad.index in this.gamepads) {
      delete this.gamepads[event.gamepad.index];

      window.dispatchEvent(new CustomEvent(HapticManager.ChangeEventName));
    }
  };

  /**
   * Determines whether there is at least one gamepad that supports haptic feedback.
   * @returns True if at least one gamepad supports haptic feedback; otherwise, false.
   */
  public hasEligibleGamepad(): boolean {
    // See if there are any available gamepads
    for (const gamepad of this.gamepads) {
      const gamepadActuators = this.getActuatorsForGamepad(gamepad);

      if (gamepadActuators.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * "Plays" haptic feedback for the specified peak.
   * @param peak {Peak} The peak.
   */
  public playFeedback(peak: Peak): void {
    // Ensure feedback is enabled
    if (!this.isEnabled) {
      return;
    }

    // Calculate duration and intensities
    const durationMs = HapticManager.getFeedbackDurationMs(peak);
    const strongMagnitude = MathUtils.clamp(peak.intensityNormalized, 0.75, 1.0);
    const weakMagnitude = MathUtils.clamp(peak.intensity, 0.5, 1.0);

    // Look for enabled actuators
    let hasActuator = false;

    for (const gamepad of this.gamepads) {
      for (const gamepadActuator of this.getActuatorsForGamepad(gamepad)) {
        this.playFeedbackForActuator(gamepadActuator, durationMs, strongMagnitude, weakMagnitude);
        hasActuator = true;
      }
    }

    // If we don't have an actuator, see if we can use the vibration API
    if (!hasActuator) {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(durationMs);
        }
        catch {}
      }
    }
  }

  /**
   * "Plays" haptic feedback for the specified lull.
   * @param lull {Lull} The lull.
   */
  public playLullFeedback(lull: Lull): void {
    // Ensure feedback is enabled
    if (!this.isEnabled) {
      return;
    }

    // Calculate duration and intensities
    const durationMs = HapticManager.getLullFeedbackDurationMs(lull);
    const strongMagnitude = 0.5;
    const weakMagnitude = 0.25;

    // Unlike peaks, we don't want to fall back to the vibration navigator
    for (const gamepad of this.gamepads) {
      for (const gamepadActuator of this.getActuatorsForGamepad(gamepad)) {
        this.playFeedbackForActuator(gamepadActuator, durationMs, strongMagnitude, weakMagnitude);
      }
    }
  }

  /**
   * "Plays" haptic feedback for the specified actuator.
   * @param hapticActuator The haptic actuator to use.
   * @param durationMs The duration, in milliseconds.
   * @param strongMagnitude The strong vibration magnitude on a 0.0-1.0 scale.
   * @param weakMagnitude The weak vibration magnitude on a 0.0-1.0 scale. Only supported for playEffect-based actuators.
   */
  private playFeedbackForActuator(hapticActuator: GamepadHapticActuator, durationMs: number, strongMagnitude: number, weakMagnitude: number): void {
    try {
      // HACK: pulse and playEffect are not defined in GamepadHapticActuator typings
      if ((hapticActuator as any).pulse) {
        // https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/pulse
        (hapticActuator as any).pulse(strongMagnitude, durationMs);
      }
      else if ((hapticActuator as any).playEffect)
        // https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect
        (hapticActuator as any).playEffect(hapticActuator.type, {
          duration: durationMs,
          startDelay: 0,
          strongMagnitude: strongMagnitude,
          weakMagnitude: weakMagnitude
        });
      }
    catch {}
  } 

  /**
   * Gets the duration of haptic feedback for the specified peak.
   * @param peak The peak.
   * @returns The corresponding duration, in milliseconds.
   */
  private static getFeedbackDurationMs(peak: Peak): number {
    // Convert the peak into a milliseconds-based duration and double it (because these are pretty short).
    // Furthermore, assign a minimum of 100ms and a maximum of 2000ms
    return MathUtils.clamp(Math.floor((peak.end - peak.time) * 2000), 100, 2000);
  }

  /**
   * Gets the duration of haptic feedback for the specified lull.
   * @param lull The lull.
   * @returns The corresponding duration, in milliseconds.
   */
  private static getLullFeedbackDurationMs(lull: Lull): number {
    // Cap the lull at 7 seconds
    return MathUtils.clamp(Math.floor(lull.duration * 1000), 500, 7000);
  }

  /**
   * Gets available haptic actuators for the provided gamepad.
   * @param gamepad The gamepad.
   * @returns A read-only array of haptic actuators for the gamepad, if any.
   */
  private getActuatorsForGamepad(gamepad: Gamepad): readonly GamepadHapticActuator[] {
    // Skip over disconnected gamepads
    if (!gamepad || !gamepad.connected) {
      return [];
    }

    // Look for either haptic actuators (the standard, array-type, supported by Firefox)
    // or a single vibrationActuator (non-standard, single instance, supported by Chrome)
    if (gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
      return gamepad.hapticActuators;
    }
    else if ((gamepad as any).vibrationActuator) {
      // Array-ify the single actuator
      return [
        (gamepad as any).vibrationActuator
      ];
    }

    return [];
  }
}