export const loadImage = (src: string, crossOrigin?: boolean) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = "anonymous";
    }
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

export const getImageDataUrl = (img: HTMLImageElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get context");
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL();
};

export const svgToBase64 = (svg: SVGElement) => {
  let str = new XMLSerializer().serializeToString(svg);
  // FIXME: window.unescape is deprecated
  // eslint-disable-next-line deprecation/deprecation
  str = unescape(encodeURIComponent(str));
  return "data:image/svg+xml;base64," + window.btoa(str);
};
