import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterModule} from "@angular/router";
import {routesInfo} from "@app/routing/routes-info";
import {DingdanyichangComponent} from "./dingdanyichang.component";

describe("DingdanyichangComponent", () => {
  let component: DingdanyichangComponent;
  let fixture: ComponentFixture<DingdanyichangComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DingdanyichangComponent, RouterModule.forRoot(routesInfo)]
    }).compileComponents();

    fixture = TestBed.createComponent(DingdanyichangComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
