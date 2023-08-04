import { tryOnMounted } from "@vueuse/core";
import { CardName } from "~/utils/cards";

const DESIGNS = [
    "cherry-version",
    "koinobori",
    "sabling-art",
    "flash-black"
] as const;

type CardDesign = typeof DESIGNS[number];

// const IMAGE_URL_MAP: Record<CardDesign,Map<CardName,string>> = {

// }

export const useCardDesign = () => {
    const useDesign = (): Ref<CardDesign> => useState("design", () => "cherry-version");
    const useDesignPath = (cardName: CardName) => `cards/${useDesign().value}/${cardName}.webp`;
    
    tryOnMounted(() => document?.body.classList.add(useDesign().value));
    
    return {
        useDesign,
        useDesignPath
    }
}