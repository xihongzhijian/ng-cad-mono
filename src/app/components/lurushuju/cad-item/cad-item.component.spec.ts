import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
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
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
