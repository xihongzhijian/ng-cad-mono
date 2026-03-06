import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {LrsjSuanliaoCadsComponent} from "./lrsj-suanliao-cads.component";

describe("LrsjSuanliaoCadsComponent", () => {
  let component: LrsjSuanliaoCadsComponent;
  let fixture: ComponentFixture<LrsjSuanliaoCadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LrsjSuanliaoCadsComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LrsjSuanliaoCadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
