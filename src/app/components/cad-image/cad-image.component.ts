import {booleanAttribute, Component, computed, effect, HostBinding, inject, input, output, signal} from "@angular/core";
import {imgCadEmpty} from "@app/app.common";
import {CadPreviewParams, getCadPreview} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {generateLineTexts2} from "@app/cad/utils";
import {CadData} from "@lucilor/cad-viewer";
import {getTypeOf, ObjectOf, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {AppStatusService} from "@services/app-status.service";
import {filter, lastValueFrom, take} from "rxjs";
import {DataInfoChnageEvent} from "./cad-image.types";

@Component({
  selector: "app-cad-image",
  imports: [ImageComponent],
  templateUrl: "./cad-image.component.html",
  styleUrl: "./cad-image.component.scss"
})
export class CadImageComponent {
  private http = inject(CadDataService);
  private status = inject(AppStatusService);

  @HostBinding("style.--cad-image-background-color") get backgroundColorStyle() {
    return this.backgroundColor();
  }

  id = input.required<string>();
  dataIn = input<CadData | null | undefined>(null, {alias: "data"});
  collection = input<CadCollection>("cad");
  isLocalIn = input(false, {transform: booleanAttribute, alias: "isLocal"});
  isImgId = input(false, {transform: booleanAttribute});
  backgroundColor = input("black");
  paramsGetter = input<() => CadPreviewParams>();
  dataInfoChange = output<DataInfoChnageEvent>();

  url = signal("");
  imgCadEmpty = imgCadEmpty;
  data = computed(() => {
    const dataIn = this.dataIn();
    if (dataIn instanceof CadData) {
      return dataIn;
    } else {
      if (getTypeOf(dataIn) === "object") {
        return new CadData(dataIn as any);
      } else {
        return null;
      }
    }
  });
  isLocal = computed(() => !!this.data()?.info.isLocal || this.isLocalIn());

  getImgUrl(id: string, force: boolean | number) {
    const params: ObjectOf<any> = {id};
    if (typeof force === "number") {
      params.t = force;
    }
    force = true;
    if (force) {
      params.t = Date.now();
    }
    return this.http.getUrl("ngcad/cadImg", params);
  }

  async getPreview(data: CadData) {
    const collection = this.collection();
    const params = this.paramsGetter()?.() || {};
    return await getCadPreview(collection, data, params);
  }

  async updateUrl() {
    let url = "";
    const id = this.id();
    const data = this.data();
    const isImgId = this.isImgId();
    let force: boolean | number = this.status.forceUpdateCadImg;
    const force2 = this.status.forceUpdateCadImg;
    const toUpdate = this.status.getCadImgToUpdate(id);
    if (toUpdate) {
      force = toUpdate.t;
    }
    const hasImgId = !!data?.info.imgId;
    if (id && !hasImgId) {
      if (force2 && !isImgId) {
        await this.refreshCadPreview();
        return;
      } else {
        url = this.getImgUrl(id, force);
      }
    } else if (data) {
      const {imgId, imgUpdate} = data.info;
      const isLocal = this.isLocal();
      if (isLocal) {
        url = await this.getPreview(data);
      } else if (imgId) {
        if (imgUpdate || force) {
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
    this.url.set(url);
  }
  updateUrlEff = effect(() => this.updateUrl());

  async refreshCadPreview() {
    if (this.isLocal()) {
      return;
    }
    let data = this.data();
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
      const id = this.id();
      const collection = this.collection();
      if ((!data || data.info.incomplete) && id) {
        const cadsResult = await this.http.getCad({collection, id}, {silent: true});
        if (cadsResult.cads[0]) {
          data = cadsResult.cads[0];
        }
      }
      if (data) {
        generateLineTexts2(data);
        const url = await this.getPreview(data);
        const id2 = data.info.imgId || id;
        await this.http.setCadImg(id2, url, {silent: true});
        this.url.set(this.getImgUrl(id2, true));
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.status.updateCadImglLock$.next(this.status.updateCadImglLock$.value - 1);
    }
  }

  async onImgError() {
    await this.refreshCadPreview();
  }
}
