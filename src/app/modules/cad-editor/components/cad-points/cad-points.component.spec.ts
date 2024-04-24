import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {CadPointsComponent} from "./cad-points.component";

describe("CadPointsComponent", () => {
  let component: CadPointsComponent;
  let fixture: ComponentFixture<CadPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadPointsComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
