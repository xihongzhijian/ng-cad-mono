import {ChangeDetectionStrategy, Component, computed, HostBinding, inject, OnInit, signal, viewChildren} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {setGlobal} from "@app/app.common";
import {getCadPreview} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {generateLineTexts2} from "@app/cad/utils";
import {ProgressBarComponent} from "@components/progress-bar/progress-bar.component";
import {ProgressBar} from "@components/progress-bar/progress-bar.utils";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {HttpOptions} from "@modules/http/services/http.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {CollecionQuery, LrsjQuery, RefreshCadImgsQueryConfig, RefreshCadImgsRefreshConfig} from "./refresh-cad-imgs.types";

@Component({
  selector: "app-refresh-cad-imgs",
  imports: [FormsModule, InputComponent, MatButtonModule, MatDividerModule, ProgressBarComponent],
  templateUrl: "./refresh-cad-imgs.component.html",
  styleUrl: "./refresh-cad-imgs.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RefreshCadImgsComponent implements OnInit {
  http = inject(CadDataService);
  message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  collectionOptions = signal<InputInfoOption<CadCollection>[]>([]);
  progressBar = new ProgressBar(1);
  collecionQueries = signal<CollecionQuery[] | null>(null);
  lrsjQueries = signal<LrsjQuery[] | null>(null);
  queryConfig: RefreshCadImgsQueryConfig = {
    collections: signal(["cad"]),
    queryLrsj: signal(true)
  };
  refreshConfig: RefreshCadImgsRefreshConfig = {
    step: signal(1)
  };
  production = environment.production;

  inputs = viewChildren(InputComponent);

  ngOnInit() {
    setGlobal("refreshCadImgs", this);
    this.init();
  }

  queriesCountTexts = computed(() => {
    const collecionQueries = this.collecionQueries();
    const lrsjQueries = this.lrsjQueries();
    const texts: string[] = [];
    let total = 0;
    if (collecionQueries) {
      for (const {name, ids} of collecionQueries) {
        texts.push(`${name}: ${ids.length}`);
        total += ids.length;
      }
    }
    if (lrsjQueries) {
      const count = lrsjQueries.reduce((acc, curr) => acc + curr.ids.length, 0);
      texts.push(`录入数据CAD: ${count}`);
      total += count;
    }
    if (total > 0) {
      texts.push(`总数: ${total}`);
    }
    return texts;
  });
  queryInputInfos = computed(() => {
    const options = this.collectionOptions();
    const config = this.queryConfig;
    const infos: InputInfo<RefreshCadImgsQueryConfig>[] = [
      {
        type: "select",
        label: "CAD集合",
        options,
        multiple: true,
        value: config.collections(),
        onChange: (v) => {
          config.collections.set(v);
        }
      },
      {
        type: "boolean",
        label: "是否查询录入数据CAD",
        value: config.queryLrsj(),
        onChange: (v) => {
          config.queryLrsj.set(v);
        }
      }
    ];
    return infos;
  });
  refrehInputInfos = computed(() => {
    const collecionQueries = this.collecionQueries();
    if (!collecionQueries) {
      return null;
    }
    const config = this.refreshConfig;
    const infos: InputInfo<RefreshCadImgsRefreshConfig>[] = [
      {
        type: "number",
        label: "每次刷新几个",
        hint: "数量越大出错概率越大",
        value: config.step(),
        onChange: (v) => {
          config.step.set(v);
        }
      }
    ];
    return infos;
  });

  async init() {
    const collections: CadCollection[] = ["cad", "peijianCad", "CADmuban", "kailiaocadmuban"];
    const structs = await this.http.getXiaodaohangStructures(collections);
    this.collectionOptions.set(collections.map((v) => ({value: v, label: structs?.[v]?.mingzi || v})));
  }

  async validate() {
    const inputs = this.inputs();
    const errorMsgs: string[] = [];
    for (const input of inputs) {
      input.validateValue();
      const errorMsg = input.getErrorMsg();
      if (errorMsg) {
        errorMsgs.push(`【${input.info().label}】${errorMsg}`);
      }
    }
    if (errorMsgs.length > 0) {
      await this.message.error(errorMsgs.join("\n"));
      return false;
    }
    return true;
  }

  async query() {
    const collations = this.queryConfig.collections();
    const queryLrsj = this.queryConfig.queryLrsj();
    this.progressBar.start(collations.length + (queryLrsj ? 1 : 0));
    const options: HttpOptions = {silent: true};

    const collecionQueries: CollecionQuery[] = [];
    const collectionOptions = this.collectionOptions();
    for (const collection of collations) {
      const name = collectionOptions.find((v) => v.value === collection)?.label || collection;
      this.progressBar.msg.set(`正在查询【${name}】总数...`);
      const ids = await this.http.queryMongodb({collection, fields: ["_id"]}, options);
      this.progressBar.forward();
      collecionQueries.push({collection, name, ids: ids.map((v) => v._id)});
    }
    this.collecionQueries.set(collecionQueries);

    if (queryLrsj) {
      this.progressBar.msg.set("正在查询【录入数据CAD】总数...");
      const lrsjQueries = await this.http.getData<LrsjQuery[]>("shuju/api/getAllCadsQueries", options);
      this.lrsjQueries.set(lrsjQueries);
      this.progressBar.forward();
    } else {
      this.lrsjQueries.set(null);
    }
    this.progressBar.end("success", "查询完成");
  }

  async start() {
    if (!(await this.validate())) {
      return;
    }
    const collecionQueries = this.collecionQueries();
    if (!collecionQueries) {
      return;
    }
    const lrsjQueries = this.lrsjQueries();
    const step = this.refreshConfig.step();
    const collectionTotal = collecionQueries.reduce((acc, curr) => acc + curr.ids.length, 0);
    const lrsjTotal = lrsjQueries ? lrsjQueries.reduce((acc, curr) => acc + curr.ids.length, 0) : 0;
    const total = collectionTotal + lrsjTotal;
    this.progressBar.start(total);
    const httpOptions: HttpOptions = {silent: true};
    let successCount = 0;
    const refreshCollecionCads = (collection: CadCollection, cads: CadData[]) => {
      return Promise.all(
        cads.map(async (cad) => {
          try {
            let id = cad.id;
            if (cad.info.imgId) {
              id = cad.info.imgId;
            }
            generateLineTexts2(cad);
            const img = await getCadPreview(collection, cad);
            await this.http.setCadImg(id, img, httpOptions);
            successCount++;
          } catch (error) {
            console.error(error);
          }
        })
      );
    };
    const getIndexsStr = (i: number, j: number, offset = 0) => {
      const indexs = [i + 1 + offset];
      if (i !== j) {
        indexs.push(j + 1 + offset);
      }
      return indexs.join("~");
    };
    for (const {collection, name, ids} of collecionQueries) {
      const endIndex = ids.length - 1;
      for (let i = 0; i <= endIndex; i += step) {
        const j = Math.min(i + step - 1, endIndex);
        this.progressBar.msg.set(`正在刷新【${name}】图片(${getIndexsStr(i, j)}/${collectionTotal})`);
        const ids2 = ids.slice(i, j + 1);
        if (ids2.length < 1) {
          continue;
        }
        const cads = (await this.http.getCad({collection, ids: ids2}, httpOptions)).cads;
        await refreshCollecionCads(collection, cads);
        this.progressBar.forward(j - i + 1);
      }
    }
    if (lrsjQueries) {
      let indexOffset = 0;
      for (const query of lrsjQueries) {
        const ids = query.ids;
        const endIndex = ids.length - 1;
        for (let i = 0; i <= endIndex; i += step) {
          const j = Math.min(i + step - 1, endIndex);
          const ids2 = ids.slice(i, j + 1);
          if (ids2.length < 1) {
            continue;
          }
          this.progressBar.msg.set(`正在刷新【录入数据CAD】图片(${getIndexsStr(i, j, indexOffset)}/${lrsjTotal})`);
          const cadsRaw = await this.http.getData<HoutaiCad[]>("shuju/api/getOrSetCads", {...query, ids: ids2}, httpOptions);
          const cads = (cadsRaw || []).map((v) => new CadData(v.json));
          await refreshCollecionCads("cad", cads);
          this.progressBar.forward(j - i + 1);
        }
        indexOffset += ids.length;
      }
    }
    if (successCount < total) {
      if (successCount > 0) {
        this.progressBar.end("warning", `部分刷新成功，成功${successCount}个，失败${total - successCount}个`);
      } else {
        this.progressBar.end("error", `全部${total}个刷新失败`);
      }
    } else {
      this.progressBar.end("success", `全部${total}个刷新成功`);
    }
  }

  async clearCadImgs() {
    if (!(await this.message.confirm("确定要清空所有CAD图片吗？"))) {
      return;
    }
    await this.http.clearCadImgs();
  }
}
