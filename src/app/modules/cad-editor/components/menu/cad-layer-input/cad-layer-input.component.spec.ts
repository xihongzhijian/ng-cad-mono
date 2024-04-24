import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadLayerInputComponent} from "./cad-layer-input.component";

describe("CadLayerInputComponent", () => {
  let component: CadLayerInputComponent;
  let fixture: ComponentFixture<CadLayerInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadLayerInputComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadLayerInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
