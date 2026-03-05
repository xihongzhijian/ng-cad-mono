import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {BujumokuaiIndexComponent} from "./bujumokuai-index.component";

describe("BujumokuaiIndexComponent", () => {
  let component: BujumokuaiIndexComponent;
  let fixture: ComponentFixture<BujumokuaiIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BujumokuaiIndexComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BujumokuaiIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
