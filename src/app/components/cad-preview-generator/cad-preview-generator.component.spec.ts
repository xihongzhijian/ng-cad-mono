import {ComponentFixture, TestBed} from "@angular/core/testing";
import {CadPreviewGeneratorComponent} from "./cad-preview-generator.component";

describe("CadPreviewGeneratorComponent", () => {
  let component: CadPreviewGeneratorComponent;
  let fixture: ComponentFixture<CadPreviewGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadPreviewGeneratorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CadPreviewGeneratorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
