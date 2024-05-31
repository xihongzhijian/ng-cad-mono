import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {Page} from "../../models/page";
import {PageConfigMenuComponent} from "./page-config-menu.component";

describe("PageConfigMenuComponent", () => {
  let component: PageConfigMenuComponent;
  let fixture: ComponentFixture<PageConfigMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageConfigMenuComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PageConfigMenuComponent);
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
