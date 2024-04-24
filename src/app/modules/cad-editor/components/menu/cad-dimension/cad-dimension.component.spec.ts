import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {CadDimensionComponent} from "./cad-dimension.component";

describe("CadDimensionComponent", () => {
  let component: CadDimensionComponent;
  let fixture: ComponentFixture<CadDimensionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadDimensionComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadDimensionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
