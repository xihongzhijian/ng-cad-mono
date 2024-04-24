import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {KailiaokongweipeizhiComponent} from "./kailiaokongweipeizhi.component";

describe("KailiaokongweipeizhiComponent", () => {
  let component: KailiaokongweipeizhiComponent;
  let fixture: ComponentFixture<KailiaokongweipeizhiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KailiaokongweipeizhiComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KailiaokongweipeizhiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
