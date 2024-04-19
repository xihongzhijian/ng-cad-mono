import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {CadImageComponent} from "./cad-image.component";

describe("CadImageComponent", () => {
  let component: CadImageComponent;
  let fixture: ComponentFixture<CadImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadImageComponent, HttpModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CadImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
