import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterModule} from "@angular/router";
import {routesInfo} from "@app/routing/routes-info";
import {PrintTableComponent} from "./print-table.component";

describe("PrintTableComponent", () => {
  let component: PrintTableComponent;
  let fixture: ComponentFixture<PrintTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintTableComponent, RouterModule.forRoot(routesInfo)]
    }).compileComponents();

    fixture = TestBed.createComponent(PrintTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
