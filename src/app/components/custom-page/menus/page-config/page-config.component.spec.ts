import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {Page} from "../../models/page";
import {PageConfigComponent} from "./page-config.component";

describe("PageConfigMenuComponent", () => {
  let component: PageConfigComponent;
  let fixture: ComponentFixture<PageConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageConfigComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PageConfigComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("page", new Page());
    ref.setInput("workSpaceStyle", {});
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
