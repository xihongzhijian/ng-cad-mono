import {ComponentFixture, TestBed} from "@angular/core/testing";
import {SuanliaogongshiComponent} from "./suanliaogongshi.component";

describe("SuanliaogongshiComponent", () => {
  let component: SuanliaogongshiComponent;
  let fixture: ComponentFixture<SuanliaogongshiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaogongshiComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaogongshiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
