export interface DownloadOptions {
  filename?: string;
}

export const downloadByString = (content: string, options?: DownloadOptions) => {
  downloadByBlob(new Blob([content]), options);
};

export const downloadByBlob = (blob: Blob, options?: DownloadOptions) => {
  const url = URL.createObjectURL(blob);
  downloadByUrl(url, options);
  URL.revokeObjectURL(url);
};

export const downloadByUrl = (url: string, options?: DownloadOptions) => {
  const {filename} = options || {};
  const link = document.createElement("a");
  link.download = filename || "";
  link.target = "_blank";
  link.style.display = "none";
  link.href = url;
  link.click();
};

export type FileSizeUnit = "B" | "KB" | "MB" | "GB" | "TB" | "PB" | "EB" | "ZB" | "YB";

const fileSizeArray: FileSizeUnit[] = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

export const getFileSize = (raw: number, options: {inputUnit?: FileSizeUnit; outputUnit?: FileSizeUnit; fractionDigits?: number} = {}) => {
  const {inputUnit, outputUnit} = options;
  const fractionDigits = options.fractionDigits ?? 2;
  if (outputUnit) {
    const inputIndex = inputUnit ? fileSizeArray.indexOf(inputUnit) : 0;
    const outputIndex = fileSizeArray.indexOf(outputUnit);
    raw *= Math.pow(1024, inputIndex - outputIndex);
    return `${raw.toFixed(fractionDigits)}${outputUnit}`;
  } else {
    let index = inputUnit ? fileSizeArray.indexOf(inputUnit) : 0;
    while (raw >= 1024 && index < fileSizeArray.length - 1) {
      raw /= 1024;
      index++;
    }
    return `${raw.toFixed(fractionDigits)}${fileSizeArray[index]}`;
  }
};

export const selectFiles = (opts?: {multiple?: boolean; accept?: string}) => {
  return new Promise<FileList | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = opts?.multiple ?? false;
    input.accept = opts?.accept ?? "";
    input.addEventListener("change", () => {
      resolve(input.files);
    });
    input.click();
  });
};
