import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {BomGongyiluxianComponent} from "./bom-gongyiluxian.component";

describe("BomGongyiluxianComponent", () => {
  let component: BomGongyiluxianComponent;
  let fixture: ComponentFixture<BomGongyiluxianComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpModule,
        MatSlideToggleModule,
        MessageModule,
        RouterTestingModule,
        MatSlideToggleModule,
        BomGongyiluxianComponent
      ]
    });
    fixture = TestBed.createComponent(BomGongyiluxianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
