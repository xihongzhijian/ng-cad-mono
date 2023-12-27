import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {HttpModule} from "@modules/http/http.module";
import {CadMtextComponent} from "./cad-mtext.component";

describe("CadMtextComponent", () => {
  let component: CadMtextComponent;
  let fixture: ComponentFixture<CadMtextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, MatButtonModule, CadMtextComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadMtextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
