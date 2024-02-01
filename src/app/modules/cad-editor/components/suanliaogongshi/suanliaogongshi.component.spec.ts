import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {SuanliaogongshiComponent} from "./suanliaogongshi.component";

describe("SuanliaogongshiComponent", () => {
  let component: SuanliaogongshiComponent;
  let fixture: ComponentFixture<SuanliaogongshiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, SuanliaogongshiComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaogongshiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
