import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {getTestData, importZixuanpeijian} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {PjmkComponent} from "./pjmk.component";

describe("PjmkComponent", () => {
  let component: PjmkComponent;
  let fixture: ComponentFixture<PjmkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PjmkComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PjmkComponent);
    component = fixture.componentInstance;
    component.data = importZixuanpeijian(getTestData().data);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
