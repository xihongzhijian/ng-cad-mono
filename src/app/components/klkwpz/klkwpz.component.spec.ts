import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCardModule} from "@angular/material/card";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {KlkwpzComponent} from "./klkwpz.component";

describe("KlkwpzComponent", () => {
  let component: KlkwpzComponent;
  let fixture: ComponentFixture<KlkwpzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, MatCardModule, MessageModule, NgScrollbarModule, KlkwpzComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KlkwpzComponent);
    component = fixture.componentInstance;
    component.data = {test: [{face: "123"}]};
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
