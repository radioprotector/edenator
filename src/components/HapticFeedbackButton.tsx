import { useEffect, useState } from 'react';
import { useStore } from '../store/visualizerStore';
import { HapticManager } from '../store/HapticManager';

function HapticFeedbackButton(): JSX.Element {
  const hapticManager = useStore(store => store.hapticManager);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasControllers, setHasControllers] = useState(false);

  useEffect(() => {
    function handleControllersChanged() {
      // See if the haptic manager believes we have a gamepad available
      setHasControllers(hapticManager.hasEligibleGamepad());
    }

    // Listen to bubbled DOM events when the controllers change
    window.addEventListener(HapticManager.ChangeEventName, handleControllersChanged);
    
    return () => {
      window.removeEventListener(HapticManager.ChangeEventName, handleControllersChanged);
    }
  }, [hapticManager]);

  const toggleHapticFeedback = () => {
    if (isEnabled) {
      hapticManager.isEnabled = false;
      setIsEnabled(false);
    }
    else {
      hapticManager.ensureInitialized();
      hapticManager.isEnabled = true;
      setIsEnabled(true);
    }
  };

  return (
    <button
      type="button"
      className="btn"
      onClick={toggleHapticFeedback}
    >
      {hasControllers && isEnabled && <span>Vibration enabled</span>}
      {!hasControllers && isEnabled && <span>No controllers</span>}
      {!isEnabled && <span>Vibration not enabled</span>}
    </button>
  )

}

export default HapticFeedbackButton;