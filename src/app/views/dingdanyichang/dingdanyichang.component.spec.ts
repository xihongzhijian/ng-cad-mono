import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {DingdanyichangComponent} from "./dingdanyichang.component";

describe("DingdanyichangComponent", () => {
  let component: DingdanyichangComponent;
  let fixture: ComponentFixture<DingdanyichangComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DingdanyichangComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DingdanyichangComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
