import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {LurushujuIndexComponent} from "./lurushuju-index.component";

describe("LurushujuIndexComponent", () => {
  let component: LurushujuIndexComponent;
  let fixture: ComponentFixture<LurushujuIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LurushujuIndexComponent, HttpModule]
    }).compileComponents();

    fixture = TestBed.createComponent(LurushujuIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  fit("should create", () => {
    expect(component).toBeTruthy();
  });
});
