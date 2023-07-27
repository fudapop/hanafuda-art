const DESIGNS = [
    "cherry-version",
    "koinobori",
    "sabling-art",

] as const;

type CardDesign = typeof DESIGNS[number];

export const useCardDesign = () => {
    const useDesign = (): Ref<CardDesign> => useState("design", () => "cherry-version");
    const useDesignPath = (cardName: string) => `${useDesign().value}/webp/${cardName}.webp`;
    
    return {
        useDesign,
        useDesignPath
    }
}