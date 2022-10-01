import { useEffect, useState } from 'react';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBellSlash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

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

  // Determine icon type, text, and title based on the status
  let buttonSubIcon: IconProp;
  let buttonTitle: string;
  let buttonText: string;

  if (isEnabled) {
    if (hasControllers) {
      buttonSubIcon = faBell;
      buttonText = "Vibration on";
      buttonTitle = "Vibration is currently enabled. Click to disable vibration.";
    }
    else {
      buttonSubIcon = faTriangleExclamation;
      buttonText = "No controllers";
      buttonTitle = "No controllers detected. Please ensure that your controller is plugged in and press a button for it to be detected.";
    }
  }
  else {
    buttonSubIcon = faBellSlash;
    buttonText = "Vibration off";
    buttonTitle = "Vibration is currently disabled. Click to enable vibration.";
  }

  return (
    <button
      type="button"
      className="btn"
      title={buttonTitle}
      onClick={toggleHapticFeedback}
    >
      <span
        className="fa-layers fa-fw"
      >
        <FontAwesomeIcon icon="gamepad" transform="left-10" />
        <FontAwesomeIcon icon={buttonSubIcon} transform="right-8" />
      </span>
      <span className="text-label">
        {buttonText}
      </span>
    </button>
  )

}

export default HapticFeedbackButton;