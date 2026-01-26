import {CadData, CadDimension, CadImage, CadLineLike, CadMtext, CadViewer, CadViewerConfig} from "@lucilor/cad-viewer";
import {getCadFentiInfo} from "@modules/cad-editor/components/menu/cad-fenti-config/cad-fenti-config.utils";
import {CadCollection} from "./collections";
import {prepareCadViewer} from "./utils";

export interface CadPreviewRawParams {
  fixedLengthTextSize?: number;
  clearLengthTextOffset?: boolean;
  fixedDimTextSize?: number;
  fixedMtextSize?: number;
  config?: Partial<CadViewerConfig>;
  autoSize?: boolean;
  maxZoom?: number;
  showFenti?: boolean;
}
export const getCadPreviewConfig = (collection: CadCollection, config?: Partial<CadViewerConfig>): Partial<CadViewerConfig> => ({
  width: 300,
  height: 150,
  padding: [5],
  backgroundColor: "transparent",
  reverseSimilarColor: {backgroundColor: "black"},
  hideLineLength: collection === "CADmuban",
  hideLineGongshi: false,
  lineGongshi: 8,
  ...config
});
export const getCadPreviewRaw = async (collection: CadCollection, data: CadData, params: CadPreviewRawParams = {}) => {
  const cad = new CadViewer(new CadData(), getCadPreviewConfig(collection, params.config));
  cad.dom.style.opacity = "0";
  cad.dom.style.position = "fixed";
  cad.appendTo(document.body);
  await prepareCadViewer(cad);
  cad.data = data.clone();
  const {rawEntities, fentiEntities} = getCadFentiInfo(cad.data);
  let fentiMtext: CadMtext | undefined;
  if (fentiEntities.length > 0 && !params.showFenti) {
    cad.data.entities = rawEntities;
    fentiMtext = new CadMtext();
  }
  for (const e of cad.data.entities.dimension) {
    e.calcBoundingRect = true;
  }
  await cad.render();
  if (fentiMtext) {
    fentiMtext.text = "有分体";
    fentiMtext.setColor("#ffca1c");
    fentiMtext.fontStyle.size = 35;
    fentiMtext.anchor.set(0.5, 0);
    fentiMtext.calcBoundingRectForce = true;
    const rect = cad.data.getBoundingRect();
    fentiMtext.insert.set(rect.x, rect.bottom - 10);
    cad.data.entities.add(fentiMtext);
    cad.render(fentiMtext);
  }
  if (params.autoSize) {
    let {width, height} = cad.getConfig();
    const {width: width2, height: height2} = cad.data.getBoundingRect();
    const ratio = width / height;
    const ratio2 = width2 / height2;
    if (ratio2 > ratio) {
      height = width / ratio2;
    } else {
      width = height * ratio2;
    }
    cad.resize(width, height);
  }
  cad.center();

  const {fixedLengthTextSize, clearLengthTextOffset, fixedDimTextSize, fixedMtextSize} = params;
  if ([fixedLengthTextSize, fixedDimTextSize, fixedMtextSize].some((size) => size !== undefined)) {
    const resize = () => {
      const zoom = cad.zoom();
      const lengthTextSize = typeof fixedLengthTextSize === "number" ? fixedLengthTextSize / zoom : null;
      const dimTextSize = typeof fixedDimTextSize === "number" ? fixedDimTextSize / zoom : null;
      const mtextSize = typeof fixedMtextSize === "number" ? fixedMtextSize / zoom : null;
      cad.data.entities.forEach((e) => {
        if (e instanceof CadLineLike) {
          if (lengthTextSize !== null) {
            e.lengthTextSize = lengthTextSize;
          }
          if (clearLengthTextOffset) {
            e.children.mtext.forEach((mtext) => {
              mtext.info.offset = [0, 0];
            });
          }
          cad.render(e);
        } else if (e instanceof CadDimension && dimTextSize !== null) {
          e.setStyle({text: {size: dimTextSize}});
          cad.render(e);
        } else if (e instanceof CadMtext && mtextSize !== null) {
          e.fontStyle.size = mtextSize;
          cad.render(e);
        }
      });
      cad.center();
    };
    resize();
    resize();
  }
  const maxZoom = params.maxZoom;
  if (typeof maxZoom === "number" && !isNaN(maxZoom) && cad.zoom() > maxZoom) {
    cad.zoom(maxZoom);
  }
  return cad;
};

export type CadPreviewParams = CadPreviewRawParams;
export const getCadPreview = async (collection: CadCollection, data: CadData, params: CadPreviewParams = {}) => {
  const cad = await getCadPreviewRaw(collection, data, params);
  const url = await cad.toDataURL();
  cad.destroy();
  return url;
};

export const updateCadPreviewImg = async (data: CadData, mode: "pre" | "post", disabled: boolean) => {
  let cadImage = data.entities.image.find((e) => e.info.isPreviewImg);
  if (disabled) {
    if (cadImage) {
      cadImage.remove();
    }
    return [];
  }
  if (!cadImage && mode === "pre") {
    return [];
  }

  const finish = () => {
    data.entities.forEach((e) => {
      e.visible = false;
      e.calcBoundingRectForce = e.calcBoundingRect;
    });
    if (cadImage) {
      cadImage.calcBoundingRect = false;
      cadImage.calcBoundingRectForce = false;
      cadImage.visible = true;
    }
  };
  if (cadImage) {
    finish();
    return [];
  }
  cadImage = new CadImage();
  cadImage.layer = "预览图";
  cadImage.info.isPreviewImg = true;
  cadImage.anchor.set(0.5, 0.5);
  const cad = await getCadPreviewRaw("cad", data, {autoSize: true, config: {padding: [0]}});
  cadImage.url = await cad.toDataURL();
  const {x, y} = cad.data.getBoundingRect();
  cad.destroy();
  cadImage.position.set(x, y);
  data.entities.add(cadImage);

  finish();
  return [cadImage];
};
