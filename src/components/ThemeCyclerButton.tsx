import { useStore } from '../store/visualizerStore';
import { getNextTheme } from '../store/themes';

function ThemeCyclerButton(): JSX.Element {
  const setStoreTheme = useStore(store => store.setTheme);

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
      onClick={cycleTheme}
    >
      Switch theme
    </button>
  )

}

export default ThemeCyclerButton;