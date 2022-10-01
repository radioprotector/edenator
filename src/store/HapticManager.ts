import Lull from "./Lull";
import Peak from "./Peak";

// https://github.com/luser/gamepadtest

export class HapticManager {

  public static readonly ChangeEventName: string = 'HapticGamepadsChanged';

  private gamepads: Gamepad[] = [];

  public isEnabled: boolean = false;

  public get isInitialized(): boolean {
    return this.managerInitialized;
  }

  private managerInitialized: boolean = false;

  // private scanGamepadsInterval: NodeJS.Timer | undefined;

  public ensureInitialized(): void {
    if (this.managerInitialized) {
      return;
    }

    // Look for events to handle, but fall back to polling when needed
    if ('GamepadEvent' in window) {
      window.addEventListener('gamepadconnected', this.handleGamepadConnected);
      window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    }
    // else if ('getGamepads' in navigator) {
    //   this.scanGamepadsInterval = setInterval(this.scanGamepads, 500);
    // }

    // Request vibration access if available, by making a dummy call
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      }
      catch {}
    }

    this.managerInitialized = true;
  }

  public dispose(): void {
    if ('GamepadEvent' in window) {
      window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    }

    // clearInterval(this.scanGamepadsInterval);
  }

  // private scanGamepads = (): void => {
  //   if ('getGamepads' in navigator) {
  //     const gamepads = navigator.getGamepads();

  //     for()
  //   }
  // };

  private handleGamepadConnected = (event: GamepadEvent): void => {
    const gamepad = event.gamepad;
    console.trace('gamepad connected', event.gamepad);

    // Add this to the list if it has any actuators
    if (this.getActuatorsForGamepad(gamepad).length > 0) {
      this.gamepads[event.gamepad.index] = event.gamepad;

      window.dispatchEvent(new CustomEvent(HapticManager.ChangeEventName));
    }
  };

  private handleGamepadDisconnected = (event: GamepadEvent): void => {
    console.trace('gamepad disconnected', event.gamepad);

    // Remove from the array if available
    if (event.gamepad.index in this.gamepads) {
      delete this.gamepads[event.gamepad.index];

      window.dispatchEvent(new CustomEvent(HapticManager.ChangeEventName));
    }
  };

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

  public playFeedback(peak: Peak): void {
    // Ensure feedback is enabled
    if (!this.isEnabled) {
      return;
    }

    // Look for enabled actuators
    let hasActuator = false;

    for (const gamepad of this.gamepads) {
      for (const gamepadActuator of this.getActuatorsForGamepad(gamepad)) {
        this.playFeedbackForActuator(gamepadActuator, peak);
        hasActuator = true;
      }
    }

    // If we don't have an actuator, see if we can use the vibration API
    if (!hasActuator) {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(HapticManager.getFeedbackDurationMs(peak));
        }
        catch {}
      }
    }
  }

  private playFeedbackForActuator(hapticActuator: GamepadHapticActuator, peak: Peak): void {
    try {
      const clampedIntensityNormalized = Math.min(1.0, Math.max(0.75, peak.intensityNormalized));
      const clampedIntensity = Math.min(1.0, Math.max(0.5, peak.intensity));

      // HACK: pulse and playEffect are not defined in GamepadHapticActuator typings
      if ((hapticActuator as any).pulse) {
        // https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/pulse
        (hapticActuator as any).pulse(clampedIntensityNormalized, HapticManager.getFeedbackDurationMs(peak));
      }
      else if ((hapticActuator as any).playEffect)
        // https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect
        (hapticActuator as any).playEffect(hapticActuator.type, {
          duration: HapticManager.getFeedbackDurationMs(peak),
          startDelay: 0,
          strongMagnitude: clampedIntensityNormalized,
          weakMagnitude: clampedIntensity
        });
      }
    catch {}
  }

  private static getFeedbackDurationMs(peak: Peak): number {
    // Convert the peak into a milliseconds-based duration, double it (because these are pretty short), and assign a minimum of 100ms and a maximum of 2000ms
    return Math.min(Math.max(Math.floor((peak.end - peak.time) * 2000), 100), 2000);
  }

  public playLullFeedback(lull: Lull): void {
    // Ensure feedback is enabled
    if (!this.isEnabled) {
      return;
    }

    // Unlike peaks, we don't want to fall back to the vibration navigator
    for (const gamepad of this.gamepads) {
      for (const gamepadActuator of this.getActuatorsForGamepad(gamepad)) {
        this.playLullFeedbackForActuator(gamepadActuator, lull);
      }
    }
  }


  private playLullFeedbackForActuator(hapticActuator: GamepadHapticActuator, lull: Lull): void {
    try {
      const lullIntensity = 0.5;
      const lullIntensityWeak = 0.25;

      // HACK: pulse and playEffect are not defined in GamepadHapticActuator typings
      if ((hapticActuator as any).pulse) {
        // https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/pulse
        (hapticActuator as any).pulse(lullIntensity, HapticManager.getLullFeedbackDurationMs(lull));
      }
      else if ((hapticActuator as any).playEffect)
        // https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect
        (hapticActuator as any).playEffect(hapticActuator.type, {
          duration: HapticManager.getLullFeedbackDurationMs(lull),
          startDelay: 0,
          strongMagnitude: lullIntensity,
          weakMagnitude: lullIntensityWeak
        });
      }
    catch {}
  }

  private static getLullFeedbackDurationMs(lull: Lull): number {
    // Cap the lull at 7 seconds
    return Math.min(Math.floor(lull.duration * 1000), 7000);
  }

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