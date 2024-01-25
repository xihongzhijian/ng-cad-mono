import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {HttpModule} from "@modules/http/http.module";
import {CadItemComponent} from "./cad-item.component";

describe("CadItemComponent", () => {
  let component: CadItemComponent;
  let fixture: ComponentFixture<CadItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadItemComponent, HttpModule, MatButtonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CadItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
