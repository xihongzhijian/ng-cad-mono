import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {PageConfigComponent} from "./page-config.component";

describe("PageConfigMenuComponent", () => {
  let component: PageConfigComponent;
  let fixture: ComponentFixture<PageConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageConfigComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PageConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
