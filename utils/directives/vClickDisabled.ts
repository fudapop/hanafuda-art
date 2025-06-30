import type { DirectiveBinding } from "vue";

/**
 * Wrapper to disable pointer-events on children.
 * This could be overridden by setting the 'pointerEvents: all'
 * on a child element.
 *
 * Option to use 'if' or 'unless' arguments provided for
 * semantic preference.
 *
 * @argument if -- Disabled if value is true
 * @argument unless -- Disabled if value is false.
 * @argument until -- Disabled until value is true, then remains enabled.
 *
 * @modifier attrs -- Sets attributes 'disabled' and 'aria-disabled'.
 *
 * NOTE: Uses tailwind class 'pointer-events-none', because setting the inline-style
 * did not work. Further testing is required.
 *
 */
const vClickDisabled = (el: HTMLElement, binding: DirectiveBinding) => {
  const condition = binding.value;
  const { attrs } = binding.modifiers;
  const disableClick = () => {
    el.classList.add("pointer-events-none");
    if (attrs) {
      el.setAttribute("disabled", "true");
      el.setAttribute("aria-disabled", "true");
    }
  };
  const enableClick = () => {
    el.classList.remove("pointer-events-none");
    el.removeAttribute("disabled");
    el.removeAttribute("aria-disabled");
  };
  switch (binding.arg) {
    case "if":
      if (condition) disableClick();
      else enableClick();
      break;
    case "unless":
      if (condition) {
        enableClick();
      } else {
        disableClick();
      }
      break;
    case "until":
      if (el.hasAttribute("data-v-satisfied")) break;
      else if (condition) {
        enableClick();
        el.setAttribute("data-v-satisfied", "");
      }
      break;
    default:
      disableClick();
  }
};

export { vClickDisabled };
