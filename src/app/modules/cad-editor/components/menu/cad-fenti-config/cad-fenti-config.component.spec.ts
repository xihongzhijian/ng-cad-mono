import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {CadFentiConfigComponent} from "./cad-fenti-config.component";

describe("CadFentiConfigComponent", () => {
  let component: CadFentiConfigComponent;
  let fixture: ComponentFixture<CadFentiConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadFentiConfigComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CadFentiConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
