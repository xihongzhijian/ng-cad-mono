import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {CustomPageIndexComponent} from "./custom-page-index.component";

describe("CustomPageIndexComponent", () => {
  let component: CustomPageIndexComponent;
  let fixture: ComponentFixture<CustomPageIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomPageIndexComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomPageIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
