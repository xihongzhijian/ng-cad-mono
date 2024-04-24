import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {imgCadEmpty} from "@app/app.common";
import {CadData} from "@lucilor/cad-viewer";
import {Bancai, PiliangjianbanComponent} from "./piliangjianban.component";

const bancais: Bancai[] = [
  {
    data: [
      {
        cad: new CadData(),
        code: "1",
        num: 100,
        zhankaiSize: [100, 100],
        unfolded: new CadData(),
        img: imgCadEmpty,
        imgLarge: imgCadEmpty
      }
    ],
    id: "123",
    厚度: "",
    数量: 20,
    材料: "",
    板材: "",
    气体: "",
    规格: [20, 10],
    expanded: true,
    pageNum: 1,
    pageBreakAfter: "always",
    printPageIndex: 0
  }
];

describe("PiliangjianbanComponent", () => {
  let component: PiliangjianbanComponent;
  let fixture: ComponentFixture<PiliangjianbanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiliangjianbanComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PiliangjianbanComponent);
    component = fixture.componentInstance;
    component.getBancais(bancais);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
