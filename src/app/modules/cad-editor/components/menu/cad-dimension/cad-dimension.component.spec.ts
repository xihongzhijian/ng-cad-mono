import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogModule} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {CadDimensionComponent} from "./cad-dimension.component";

describe("CadDimensionComponent", () => {
  let component: CadDimensionComponent;
  let fixture: ComponentFixture<CadDimensionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, MatButtonModule, MatDialogModule, MessageModule, SpinnerModule, CadDimensionComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadDimensionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
