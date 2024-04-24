import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {defaultQiezhongkongItem, QiezhongkongItem} from "@components/klcs/klcs.component";
import {importObject} from "@lucilor/utils";
import {KailiaocanshuComponent} from "./kailiaocanshu.component";

describe("KailiaocanshuComponent", () => {
  let component: KailiaocanshuComponent;
  let fixture: ComponentFixture<KailiaocanshuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KailiaocanshuComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(KailiaocanshuComponent);
    component = fixture.componentInstance;
    const 参数: QiezhongkongItem[] = [importObject({}, defaultQiezhongkongItem)];
    component.data = {_id: "1", 名字: "test", 分类: "切中空", 参数};
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
