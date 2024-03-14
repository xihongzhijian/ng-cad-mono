import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterModule} from "@angular/router";
import {routesInfo} from "@app/routing/routes-info";
import {PageNotFoundComponent} from "./page-not-found.component";

describe("PageNotFoundComponent", () => {
  let component: PageNotFoundComponent;
  let fixture: ComponentFixture<PageNotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageNotFoundComponent, RouterModule.forRoot(routesInfo)]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PageNotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
