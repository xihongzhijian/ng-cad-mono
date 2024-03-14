import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {XhmrmsbjComponent} from "./xhmrmsbj.component";

describe("XhmrmsbjComponent", () => {
  let component: XhmrmsbjComponent;
  let fixture: ComponentFixture<XhmrmsbjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpModule,
        MatButtonModule,
        MatDividerModule,
        MatSlideToggleModule,
        MessageModule,
        NgScrollbarModule,
        MsbjRectsComponent,
        XhmrmsbjComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
