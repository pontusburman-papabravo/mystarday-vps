export function iconUrl(name, theme = "light") {
  return new URL(`../icons/svg/${theme}/${name}.svg`, import.meta.url).href;
}
export function iconImg(name, { theme = "light", size = 64, alt = name } = {}) {
  const img = document.createElement("img");
  img.src = iconUrl(name, theme);
  img.width = size;
  img.height = size;
  img.alt = alt;
  img.loading = "lazy";
  return img;
}
