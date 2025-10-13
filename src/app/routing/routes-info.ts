import {Route} from "@angular/router";
import {BujumokuaiIndexComponent} from "@components/bujumokuai/bujumokuai-index/bujumokuai-index.component";
import {CustomPageIndexComponent} from "@components/custom-page/views/custom-page-index/custom-page-index.component";
import {LurushujuIndexComponent} from "@components/lurushuju/lurushuju-index/lurushuju-index.component";
import {PrintTableComponent} from "@components/print-table/print-table.component";
import {XinghaoGongshishuruComponent} from "@components/xinghao-gongshishuru/xinghao-gongshishuru.component";
import {BackupComponent} from "@views/backup/backup.component";
import {BomGongyiluxianComponent} from "@views/bom-gongyiluxian/bom-gongyiluxian.component";
import {CleanComponent} from "@views/clean/clean.component";
import {DingdanbiaoqianComponent} from "@views/dingdanbiaoqian/dingdanbiaoqian.component";
import {DingdanyichangComponent} from "@views/dingdanyichang/dingdanyichang.component";
import {ExportComponent} from "@views/export/export.component";
import {ImportComponent} from "@views/import/import.component";
import {IndexComponent} from "@views/index/index.component";
import {JiaoweiComponent} from "@views/jiaowei/jiaowei.component";
import {KailiaocanshuComponent} from "@views/kailiaocanshu/kailiaocanshu.component";
import {KailiaokongweipeizhiComponent} from "@views/kailiaokongweipeizhi/kailiaokongweipeizhi.component";
import {LvxingcaiyouhuaComponent} from "@views/lvxingcaiyouhua/lvxingcaiyouhua.component";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {MsbjComponent} from "@views/msbj/msbj.component";
import {PiliangjianbanComponent} from "@views/piliangjianban/piliangjianban.component";
import {PjmkComponent} from "@views/pjmk/pjmk.component";
import {PrintA4A015PreviewComponent} from "@views/print-a4-a015-preview/print-a4-a015-preview.component";
import {PrintCadComponent} from "@views/print/print-cad.component";
import {RefreshCadImgsComponent} from "@views/refresh-cad-imgs/refresh-cad-imgs.component";
import {ReplaceTextComponent} from "@views/replace-text/replace-text.component";
import {SelectBancaiComponent} from "@views/select-bancai/select-bancai.component";
import {SelectCadsComponent} from "@views/select-cads/select-cads.component";
import {SuanliaoComponent} from "@views/suanliao/suanliao.component";
import {WorkSpaceComponent} from "@views/work-space/work-space.component";
import {XhmrmsbjComponent} from "@views/xhmrmsbj/xhmrmsbj.component";
import {XinghaoOverviewComponent} from "@views/xinghao-overview/xinghao-overview.component";
import {YahuabanTestComponent} from "@views/yahuaban-test/yahuaban-test.component";

export const routesInfo: (Route & {path: string})[] = [
  {path: "index", component: IndexComponent},
  {path: "录入数据", component: LurushujuIndexComponent, title: "录入数据"},
  {path: "布局模块", component: BujumokuaiIndexComponent, title: "模块库"},
  {path: "work-space", component: WorkSpaceComponent, title: "我的工作台"},
  {path: "custom-page", component: CustomPageIndexComponent, title: "自定义报表"},
  {path: "print-cad", component: PrintCadComponent, title: "打印CAD"},
  {path: "printA4A015Preview", component: PrintA4A015PreviewComponent, title: "订单配件标签"},
  {path: "import", component: ImportComponent, title: "导入CAD"},
  {path: "export", component: ExportComponent, title: "导出CAD"},
  {path: "backup", component: BackupComponent, title: "备份CAD"},
  {path: "select-bancai", component: SelectBancaiComponent, title: "激光开料排版"},
  {path: "kailiaokongweipeizhi", component: KailiaokongweipeizhiComponent, title: "开料孔位配置"},
  {path: "replace-text", component: ReplaceTextComponent, title: "文本替换"},
  {path: "piliangjianban", component: PiliangjianbanComponent, title: "批量剪板"},
  {path: "dingdanbiaoqian", component: DingdanbiaoqianComponent, title: "订单标签"},
  {path: "select-cads", component: SelectCadsComponent, title: "选择CAD"},
  {path: "jiaowei", component: JiaoweiComponent, title: "铰位"},
  {path: "kailiaocanshu", component: KailiaocanshuComponent, title: "开料参数"},
  {path: "clean", component: CleanComponent, title: "清理任务"},
  {path: "pjmk", component: PjmkComponent, title: "配件模块"},
  {path: "门扇布局", component: MsbjComponent, title: "门扇布局"},
  {path: "型号默认门扇布局", component: XhmrmsbjComponent, title: "型号默认门扇布局"},
  {path: "默认板材及分组", component: MrbcjfzComponent, title: "默认板材及分组"},
  {path: "suanliao", component: SuanliaoComponent, title: "算料"},
  {path: "xinghao-overview", component: XinghaoOverviewComponent, title: "型号数据快速配置"},
  {
    path: "bom-gongyiluxian",
    component: BomGongyiluxianComponent,
    title: (route) => {
      const {code} = route.queryParams;
      return code ? `订单 ${code}` : "BOM工艺路线";
    }
  },
  {path: "print-table", component: PrintTableComponent, title: "打印表格"},
  {path: "订单异常", component: DingdanyichangComponent, title: "订单异常"},
  {path: "refresh-cad-imgs", component: RefreshCadImgsComponent, title: "刷新cad图片"},
  {path: "铝型材优化", component: LvxingcaiyouhuaComponent, title: "多订单型材优化排产"},
  {path: "压花板测试", component: YahuabanTestComponent, title: "压花板测试"},
  {path: "型号公式输入", component: XinghaoGongshishuruComponent, title: "型号公式输入"}
];
