import {Component, EventEmitter, HostBinding, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {imgCadEmpty} from "@app/app.common";
import {CadPreviewParams, getCadPreview} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {CadData} from "@lucilor/cad-viewer";
import {getTypeOf, ObjectOf, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {AppStatusService} from "@services/app-status.service";
import {filter, lastValueFrom, take} from "rxjs";
import {DataInfoChnageEvent} from "./cad-image.types";

@Component({
  selector: "app-cad-image",
  standalone: true,
  imports: [ImageComponent],
  templateUrl: "./cad-image.component.html",
  styleUrl: "./cad-image.component.scss"
})
export class CadImageComponent implements OnChanges {
  @HostBinding("style.--cad-image-width") get widthStyle() {
    if (typeof this.width === "number") {
      return `${this.width}px`;
    } else {
      return "";
    }
  }
  @HostBinding("style.--cad-image-height") get heightStyle() {
    if (typeof this.height === "number") {
      return `${this.height}px`;
    } else {
      return "";
    }
  }
  @HostBinding("style.--cad-image-background-color") get backgroundColorStyle() {
    return this.backgroundColor;
  }

  @Input({required: true}) id = "";
  @Input() data?: CadData;
  @Input() collection: CadCollection = "cad";
  @Input() width?: number;
  @Input() height?: number;
  @Input() backgroundColor = "black";
  @Input() paramsGetter?: () => CadPreviewParams;
  @Output() dataInfoChange = new EventEmitter<DataInfoChnageEvent>();

  url = "";
  imgCadEmpty = imgCadEmpty;

  constructor(
    private http: CadDataService,
    private status: AppStatusService
  ) {
    if (!(this.data instanceof CadData)) {
      if (getTypeOf(this.data) === "object") {
        this.data = new CadData(this.data);
      } else {
        this.data = undefined;
      }
    }
    this.updateUrl();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.id || changes.data) {
      this.updateUrl();
    }
  }

  getImgUrl(id: string, force: boolean | number) {
    const params: ObjectOf<any> = {id};
    if (typeof force === "number") {
      params.t = force;
    }
    if (force) {
      params.t = Date.now();
    }
    return this.http.getUrl("ngcad/cadImg", params);
  }

  async getPreview(data: CadData) {
    const {collection} = this;
    const params = this.paramsGetter?.() || {};
    if (!params.config) {
      params.config = {};
    }
    if (params.config.width === undefined) {
      params.config.width = this.width || 300;
    }
    if (params.config.height === undefined) {
      params.config.height = this.height || 150;
    }
    if (params.config.backgroundColor === undefined) {
      params.config.backgroundColor = this.backgroundColor;
    }
    return await getCadPreview(collection, data, params);
  }

  async updateUrl() {
    let url = "";
    const {id, data} = this;
    let force: boolean | number = this.status.forceUpdateCadImg;
    const force2 = this.status.forceUpdateCadImg2;
    const toUpdate = this.status.cadImgToUpdate;
    if (toUpdate[id]) {
      force = toUpdate[id].t;
    }
    if (id) {
      url = this.getImgUrl(id + (force2 ? "null" : ""), force);
    } else if (data) {
      const {imgId, imgUpdate} = data.info;
      if (imgId) {
        if (imgUpdate || force || force2) {
          delete data.info.imgUpdate;
          url = await this.getPreview(data);
          await this.http.setCadImg(imgId, url, {spinner: false});
          url = this.getImgUrl(imgId, true);
          this.dataInfoChange.emit({info: data.info});
        } else {
          url = this.getImgUrl(imgId, false);
        }
      } else {
        url = await this.getPreview(data);
        data.info.imgId = await this.http.getMongoId({spinner: false});
        await this.http.setCadImg(data.info.imgId, url, {spinner: false});
        url = this.getImgUrl(data.info.imgId, true);
        this.dataInfoChange.emit({info: data.info});
      }
    }
    if (!url) {
      url = imgCadEmpty;
    }
    this.url = url;
  }

  async onImgError() {
    let {data} = this;
    if (data?.info.isLocal) {
      return;
    }
    const lockNum = this.status.updateCadImglLock$.value + 1;
    this.status.updateCadImglLock$.next(lockNum);
    if (lockNum > 1) {
      await lastValueFrom(
        this.status.updateCadImglLock$.pipe(
          filter((v) => v < lockNum),
          take(1)
        )
      );
      await timeout(0);
    }
    try {
      const {collection, id} = this;
      if (!data) {
        const cadsResult = await this.http.getCad({collection, id}, {spinner: false});
        if (cadsResult.cads[0]) {
          data = cadsResult.cads[0];
        }
      }
      if (data) {
        const url = await this.getPreview(data);
        const id2 = data.info.imgId || id;
        await this.http.setCadImg(id2, url, {spinner: false});
        this.url = this.getImgUrl(id2, true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.status.updateCadImglLock$.next(this.status.updateCadImglLock$.value - 1);
    }
  }
}
