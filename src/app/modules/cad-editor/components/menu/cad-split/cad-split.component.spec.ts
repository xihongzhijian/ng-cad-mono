import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {CadSplitComponent} from "./cad-split.component";

describe("CadSplitComponent", () => {
  let component: CadSplitComponent;
  let fixture: ComponentFixture<CadSplitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadSplitComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadSplitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
