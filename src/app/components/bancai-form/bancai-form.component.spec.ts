import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {BancaiFormComponent} from "./bancai-form.component";

describe("BancaiFormComponent", () => {
  let component: BancaiFormComponent;
  let fixture: ComponentFixture<BancaiFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, MatDialogModule, MessageModule, BancaiFormComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BancaiFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
