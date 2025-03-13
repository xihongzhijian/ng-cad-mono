import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {CadItemComponent} from "./cad-item.component";

describe("CadItemComponent", () => {
  let component: CadItemComponent;
  let fixture: ComponentFixture<CadItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadItemComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent<CadItemComponent>(CadItemComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("cad", getHoutaiCad());
    ref.setInput("buttons", []);
    ref.setInput("customInfo", {});
    ref.setInput("yaoqiu", null);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
