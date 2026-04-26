import logoSvg from "../assets/zaxidi-logo.svg?raw";
import heroSvg from "../assets/zaxidi-hero.svg?raw";

const toDataUri = (svg) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export const zaxidiLogoSrc = toDataUri(logoSvg);
export const zaxidiHeroSrc = toDataUri(heroSvg);
