import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {defaultQiezhongkongItem, QiezhongkongItem} from "@components/klcs/klcs.component";
import {importObject} from "@lucilor/utils";
import {KlcsDialogComponent, KlcsDialogInput} from "./klcs-dialog.component";

const 参数: QiezhongkongItem[] = [importObject({}, defaultQiezhongkongItem)];
const data: KlcsDialogInput = {source: {_id: "1", 名字: "test", 分类: "切中空", 参数}, cadId: ""};

describe("KlcsDialogComponent", () => {
  let component: KlcsDialogComponent;
  let fixture: ComponentFixture<KlcsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KlcsDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(KlcsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
