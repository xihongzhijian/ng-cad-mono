import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {CadAssembleComponent} from "./cad-assemble.component";

describe("CadAssembleComponent", () => {
  let component: CadAssembleComponent;
  let fixture: ComponentFixture<CadAssembleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadAssembleComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadAssembleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
