import { useEffect, useState } from 'react';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBellSlash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { useStore } from '../store/visualizerStore';
import { ControllerDetectionResult, HapticManager } from '../store/HapticManager';

function HapticFeedbackButton(): JSX.Element | null {
  const hapticManager = useStore(store => store.hapticManager);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasControllers, setHasControllers] = useState(ControllerDetectionResult.NotDetected);

  useEffect(() => {
    function handleControllersChanged() {
      // See if the haptic manager believes we have a gamepad available
      setHasControllers(hapticManager.checkEligibleGamepad());
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

  // Determine icon type, text, and title based on the status
  let buttonSubIcon: IconProp;
  let buttonTitle: string;
  let buttonText: string;

  if (isEnabled) {
    // We are enabled, but check the state of controllers
    switch(hasControllers) {
      case ControllerDetectionResult.Detected:
        buttonSubIcon = faBell;
        buttonText = "Vibration on";
        buttonTitle = "Controller vibration is currently enabled. Click to disable vibration.";
        break;

      case ControllerDetectionResult.VibrationMissing:  
        buttonSubIcon = faTriangleExclamation;
        buttonText = "Unsupported controller";
        buttonTitle = "The connected controller does not support vibration in this browser.";
        break;
      
      case ControllerDetectionResult.NotDetected:
      default:
        buttonSubIcon = faTriangleExclamation;
        buttonText = "No controller";
        buttonTitle = "No controllers detected. Please ensure that your controller is plugged in and press a button for it to be detected.";
    }
  }
  else {
    buttonSubIcon = faBellSlash;
    buttonText = "Vibration off";
    buttonTitle = "Controller vibration is currently disabled. Click to enable vibration.";
  }

  if (hasControllers === ControllerDetectionResult.NotSupported) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn"
      title={buttonTitle}
      onClick={toggleHapticFeedback}
      style={{}}
    >
      <FontAwesomeIcon icon="gamepad" />
      <FontAwesomeIcon icon={buttonSubIcon} />
      <span className="text-label">
        {buttonText}
      </span>
    </button>
  )

}

export default HapticFeedbackButton;