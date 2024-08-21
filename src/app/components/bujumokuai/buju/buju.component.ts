import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {filePathUrl, session, setGlobal} from "@app/app.common";
import {openCadOptionsDialog} from "@app/components/dialogs/cad-options/cad-options.component";
import {getStep1Data} from "@app/components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {MsbjRectsComponent} from "@app/components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo, MsbjSelectRectEvent} from "@app/components/msbj-rects/msbj-rects.types";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {TableDataBase} from "@app/modules/http/services/cad-data.service.types";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo, InputInfoOption} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {MrbcjfzInfo, MrbcjfzXinghao} from "@app/views/mrbcjfz/mrbcjfz.types";
import {isMrbcjfzInfoEmpty1, MrbcjfzXinghaoInfo} from "@app/views/mrbcjfz/mrbcjfz.utils";
import {MsbjData, MsbjInfo, Node2rectData} from "@app/views/msbj/msbj.types";
import {MenshanKey, menshanKeys, XhmrmsbjData, XhmrmsbjTableData} from "@app/views/xhmrmsbj/xhmrmsbj.types";
import {queryString} from "@lucilor/utils";
import {debounce} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {BjmkStatusService} from "../services/bjmk-status.service";

@Component({
  selector: "app-buju",
  standalone: true,
  imports: [ImageComponent, InputComponent, MatButtonModule, MatDividerModule, MsbjRectsComponent, NgScrollbarModule],
  templateUrl: "./buju.component.html",
  styleUrl: "./buju.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BujuComponent implements OnInit {
  private bjmkStatus = inject(BjmkStatusService);
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = ["ng-page"];

  async ngOnInit() {
    setGlobal("buju", this);
    await this.getData();
    await this.bjmkStatus.fetchMokuais();
  }

  xinghao = signal<MrbcjfzXinghaoInfo | null>(null);
  bujuData = signal<XhmrmsbjData | null>(null);
  msbjs = signal<MsbjInfo[]>([]);
  msbjRects = viewChild(MsbjRectsComponent);
  isFromOrder = signal(false);
  imgPrefix = filePathUrl;
  async getData() {
    const xinghaoKey = "bujuXinghaoXinghao";
    let xinghao = session.load<TableDataBase>(xinghaoKey);
    if (!xinghao) {
      const result = await openCadOptionsDialog(this.dialog, {data: {name: "p_xinghao"}});
      if (!result?.options[0]) {
        return;
      }
      xinghao = result.options[0];
      session.save(xinghaoKey, xinghao);
    }
    const table1 = "p_xinghao";
    const data1 = await this.http.queryMySql<MrbcjfzXinghao>({table: table1, filter: {where: {mingzi: xinghao.mingzi}}});
    if (data1[0]) {
      this.xinghao.set(new MrbcjfzXinghaoInfo(table1, data1[0]));
    } else {
      this.message.error("找不到型号：" + xinghao.mingzi);
      return;
    }
    const table2 = "p_xinghaomorenmenshanbuju";
    const data2 = await this.http.queryMySql<XhmrmsbjTableData>({table: table2, filter: {where: {mingzi: xinghao.mingzi}}});
    const menshanbujus = await this.http.queryMySql<MsbjData>({table: "p_menshanbuju"});
    const msbjs = menshanbujus.map((item) => new MsbjInfo(item, this.getNode2rectData()));
    const step1Data = await getStep1Data(this.http);
    this.msbjs.set(msbjs);
    if (data2[0] && step1Data) {
      this.bujuData.set(new XhmrmsbjData(data2[0], menshanKeys, step1Data.typesInfo, msbjs));
    } else {
      this.message.error("找不到型号默认门扇布局：" + xinghao.mingzi);
    }
  }
  getNode2rectData() {
    const result: Node2rectData = {
      模块层ID: {},
      当前扇名字: "",
      门扇大小: {},
      模块大小: {}
    };
    for (const rect of this.msbjRects()?.rectInfosAbsolute || []) {
      if (rect.name) {
        result.模块层ID[rect.name] = rect.raw.vid;
      }
    }
    return result;
  }
  updateBujuData() {
    this.bujuData.update((v) => v?.clone() || null);
  }

  menshanInputInfos = computed(() => {
    const infos: InputInfo[] = [
      {
        type: "boolean",
        appearance: "switch",
        label: "铰扇跟随锁扇",
        value: this.bujuData()?.铰扇跟随锁扇,
        onChange: (val) => {
          const data = this.bujuData();
          if (data) {
            data.铰扇跟随锁扇 = val;
            this.bujuData.set(data.clone());
          }
        }
      }
    ];
    return infos;
  });
  menshanbujuInfos = computed(() => {
    const data = this.bujuData();
    if (!data) {
      return [];
    }
    const {menshanbujuInfos, 铰扇跟随锁扇} = data;
    let infos = Object.entries(menshanbujuInfos).map(([key, value]) => ({key: key as MenshanKey, value}));
    if (铰扇跟随锁扇) {
      infos = infos.filter(({key}) => !key.includes("铰扇"));
    }
    return infos;
  });
  menshanbujuInfosEff = effect(
    () => {
      const key = this.activeMenshanKey();
      if (key) {
        return;
      }
      const infos = this.menshanbujuInfos();
      if (infos.length > 0) {
        this.activeMenshanKey.set(infos[0].key);
      }
    },
    {allowSignalWrites: true}
  );

  activeMenshanKey = signal<MenshanKey | null>(null);
  activeMsbjInfo = computed(() => {
    const key = this.activeMenshanKey();
    if (!key) {
      return null;
    }
    return this.bujuData()?.menshanbujuInfos[key] || null;
  });

  activeMsbj = computed(() => {
    const info = this.activeMsbjInfo();
    if (!info) {
      return null;
    }
    const msbj = this.msbjs().find((item) => item.vid === info.选中布局);
    return msbj || null;
  });
  activeMsbjRectInfos = computed(() => {
    return this.activeMsbj()?.peizhishuju.模块节点;
  });
  activeMsbjRectInfosEff = effect(() => {
    this.activeMsbjRectInfos();
    setTimeout(() => {
      const msbjRects = this.msbjRects();
      const rectInfo = msbjRects?.rectInfosRelative.find((v) => v.raw.isBuju);
      if (msbjRects && rectInfo) {
        msbjRects.setCurrRectInfo(rectInfo);
      }
    }, 0);
  });

  async selectMsbj() {
    const info = this.activeMsbjInfo();
    if (!info) {
      return;
    }
    const checkedVids: number[] = [];
    const 选中布局 = info.选中布局;
    if (typeof 选中布局 === "number") {
      checkedVids.push(选中布局);
    }
    const result = await openCadOptionsDialog(this.dialog, {
      data: {
        name: "p_menshanbuju",
        checkedVids,
        options: this.msbjs().map(({vid, name, xiaoguotu}) => ({vid, name, img: xiaoguotu || "", disabled: false}))
      }
    });
    const msbj = result?.options[0] as MsbjInfo | undefined;
    if (msbj) {
      info.选中布局 = msbj.vid;
      info.选中布局数据 = {vid: msbj.vid, name: msbj.name, 模块大小关系: msbj.peizhishuju.模块大小关系};
      this.updateBujuData();
    }
  }

  showMokuais = signal(false);
  activeRectInfo = signal<MsbjRectInfo | null>(null);
  activeMokuaiNode = computed(() => {
    const rectInfo = this.activeRectInfo();
    const msbjInfo = this.activeMsbjInfo();
    if (!rectInfo || !msbjInfo) {
      return null;
    }
    return msbjInfo.模块节点?.find((v) => v.层id === rectInfo.raw.vid) || null;
  });
  selectRect({info}: MsbjSelectRectEvent) {
    if (info?.raw.isBuju) {
      this.showMokuais.set(true);
      this.activeRectInfo.set(info);
    } else {
      this.showMokuais.set(false);
      this.activeRectInfo.set(null);
    }
  }

  xinghaoBancais = computed(() => {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return [];
    }
    const result: {key: string; value: string; title: string}[] = [];
    for (const key in xinghao.默认板材) {
      const value = xinghao.getBancaiTitle(key);
      if (value) {
        result.push({key, value, title: `${key}: ${value}`});
      }
    }
    return result;
  });
  xinghaoBcfzInputInfos = computed(() => {
    const bancais = this.xinghaoBancais();
    const mokuai = this.activeMokuaiNode()?.选中模块;
    if (!mokuai) {
      return [];
    }
    const infos: InputInfo<MrbcjfzInfo>[] = [];
    const options = bancais.map<InputInfoOption>(({key, title}) => ({value: key, label: title}));
    for (const [key, value] of Object.entries(mokuai.morenbancai || {})) {
      if (isMrbcjfzInfoEmpty1(key, value)) {
        continue;
      }
      infos.push({type: "select", label: key, options, model: {data: value, key: "默认对应板材分组"}});
    }
    return infos;
  });
  mokuaiInputInfos = computed(() => {
    const mokuai = this.activeMokuaiNode()?.选中模块;
    if (!mokuai) {
      return [];
    }
    const getInfos = (arr: string[][], type: string) =>
      arr.map<InputInfo>((v) => ({
        type: "string",
        label: `${type}-${v[0]}`,
        model: {key: "1", data: v}
      }));
    const infos: {type: string; infos: InputInfo[]}[] = [];
    infos.push({type: "gongshi", infos: getInfos(mokuai.gongshishuru, "公式输入")});
    infos.push({type: "xuanxiang", infos: getInfos(mokuai.xuanxiangshuru, "选项输入")});
    return infos;
  });

  mokuaiQuery = signal("");
  mokuaiQueryInputInfo = computed<InputInfo>(() => ({
    type: "string",
    label: "搜索",
    value: this.mokuaiQuery(),
    onInput: debounce((v) => this.mokuaiQuery.set(v), 200)
  }));
  mokuais = computed(() => {
    const query = this.mokuaiQuery();
    return this.bjmkStatus.mokuais().filter((v) => queryString(query, v.name));
  });
}
