import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { useStore } from '../store/visualizerStore';
import { getNextTheme } from '../store/themes';
import { getSceneryModelUrls } from '../store/scenery';

function ThemeCyclerButton(): JSX.Element {
  const setStoreTheme = useStore(store => store.setTheme);

  // Peek at the next theme and use that to pre-load models
  const nextTheme = getNextTheme(useStore.getState().theme);
  const nextThemeModels = getSceneryModelUrls(nextTheme.scenery.availableItems);
  useLoader.preload(GLTFLoader, nextThemeModels);

  const cycleTheme = () => {
    const nextTheme = getNextTheme(useStore.getState().theme);
    
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