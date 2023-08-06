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
 * @modifier focus -- Sets 'visibility: hidden' to prevent focusing
 * @modifier display -- Sets attribute 'hidden=true' to prevent rendering
 *
 */
const vHide = (el: HTMLElement, binding: DirectiveBinding) => {
	const ds = useGameDataStore();
	const { focus, display } = binding.modifiers;
	const addHiddenStyle = () => {
		if (display) {
			el.hidden = true;
			return;
		}
		if (focus) el.style.setProperty("visibility", "hidden !important");
		el.style.setProperty("opacity", "0 !important");
		el.style.setProperty("pointerEvents", "none !important");
	};
	const removeHiddenStyle = () => {
		el.style.removeProperty("opacity");
		el.style.removeProperty("visibility");
		el.style.removeProperty("pointerEvents");
		el.hidden = false;
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
