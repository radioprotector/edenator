import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { useStore } from '../store/visualizerStore';
import { getNextTheme } from '../store/themes';
import { getSceneryModelUrls } from '../store/scenery';

function ThemeCyclerButton(): JSX.Element {
  // Pull the current theme so this button is reactive (and can thus preload) based on it
  const currentTheme = useStore(store => store.theme);
  const setStoreTheme = useStore(store => store.setTheme);

  // Peek at the next theme and use that to pre-load models.
  const nextTheme = getNextTheme(currentTheme);
  const nextThemeModels = getSceneryModelUrls(nextTheme.scenery.availableItems);
  // if (process.env.NODE_ENV !== 'production' && nextThemeModels.length) {
  //   // This message displays twice in strict mode because React double-renders
  //   console.debug(`preloading models for ${nextTheme.name}`, nextThemeModels);
  // }
  useLoader.preload(GLTFLoader, nextThemeModels);

  const cycleTheme = () => {
    const nextTheme = getNextTheme(currentTheme);
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`switching to ${nextTheme.name} theme`);
    }

    setStoreTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="btn"
      title="Switch theme"
      onClick={cycleTheme}
    >
      <FontAwesomeIcon
        icon="palette"
      />
      <span className="text-label">
        Switch theme
      </span>
    </button>
  )

}

export default ThemeCyclerButton;