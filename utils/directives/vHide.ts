import { DirectiveBinding } from "nuxt/dist/app/compat/capi";
import { useGameDataStore } from "~/stores/gameDataStore";

/**
 * Used to minimize the amount of logic written
 * in the template for showing/hiding elements
 * 
 * Hide the bound element
 * (1) when a specified player is active or
 * (2) during a specified phase of play
 * 
 * @argument from -- Accepts values of type PlayerKey (e.g. "p1")
 * @argument during -- Accepts values of type TurnPhase (e.g. "draw")
 * 
 */
const vHide = (el: HTMLElement, binding: DirectiveBinding) => {
	const ds = useGameDataStore();
	const addHiddenStyle = () => {
		el.style.setProperty("opacity", "0");
		el.style.setProperty("visibility", "hidden");
		el.style.setProperty("pointerEvents", "none");
	};
	const removeHiddenStyle = () => {
		el.style.removeProperty("opacity");
		el.style.removeProperty("visibility");
		el.style.removeProperty("pointerEvents");
	};
	switch (binding.arg) {
		case "from":
			if (binding.value === ds.getCurrent.player) {
        addHiddenStyle();
			} else {
        removeHiddenStyle();
			}
			break;
      case "during":
			if (binding.value === ds.getCurrent.phase) {
				addHiddenStyle();
			} else {
				removeHiddenStyle();
			}
			break;
		default:
			removeHiddenStyle();
	}
};

export { vHide };
