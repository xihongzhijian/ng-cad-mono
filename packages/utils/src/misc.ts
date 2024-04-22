export const dataURLtoBlob = (dataURL: string) => {
  const arr = dataURL.split(",");
  const mime = arr[0].split(":")[1].split(";")[0];
  const bstr = window.atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type: mime});
};

export const getDPI = () => {
  const result = Array<number>();
  const tmpNode = document.createElement("div");
  tmpNode.style.cssText = "width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:99;visibility:hidden";
  document.body.appendChild(tmpNode);
  result[0] = tmpNode.offsetWidth;
  result[1] = tmpNode.offsetHeight;
  tmpNode.remove();
  return result;
};

export const timeout = <T>(time = 0, value?: T) => new Promise<T | undefined>((resolve) => setTimeout(() => resolve(value), time));

export const getTypeOf = (value: any) => {
  const type = typeof value;
  if (type === "object") {
    if (value === null) {
      return "null";
    }
    if (Array.isArray(value)) {
      return "array";
    }
  }
  if (type === "number" && isNaN(value)) {
    return "NaN";
  }
  return type;
};

export const isTypeOf = (value: any, type: ReturnType<typeof getTypeOf> | ReturnType<typeof getTypeOf>[]) => {
  const valueType = getTypeOf(value);
  if (Array.isArray(type)) {
    return type.includes(valueType);
  }
  return valueType === type;
};

export const getElementVisiblePercentage = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const area = rect.width * rect.height;
  const xVisible = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
  const yVisible = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
  const visibleArea = xVisible * yVisible;
  const visiblePercentage = (visibleArea / area) * 100;
  return visiblePercentage;
};
