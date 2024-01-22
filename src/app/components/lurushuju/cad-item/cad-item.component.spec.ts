import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {RouterTestingModule} from "@angular/router/testing";
import {CadItemComponent} from "./cad-item.component";

describe("CadItemComponent", () => {
  let component: CadItemComponent;
  let fixture: ComponentFixture<CadItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadItemComponent, MatButtonModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CadItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
