import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {timeout} from "@lucilor/utils";
import {MessageComponent} from "./message.component";
import {MessageData} from "./message.types";

const dataArr: MessageData[] = [
  {type: "alert", content: "test"},
  {type: "confirm", content: "test"},
  {type: "button", buttons: ["test1", "test2"]},
  {type: "form", form: [{type: "string", label: "test"}]},
  {type: "book", bookData: [{title: "test", content: "test"}]},
  {type: "editor", editable: true, content: "test"}
];

describe("MessageComponent", () => {
  let component: MessageComponent;
  let fixture: ComponentFixture<MessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: {}}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(MessageComponent);
    component = fixture.componentInstance;
    for (const data of dataArr) {
      component.data = data;
      fixture.detectChanges();
      await timeout(0);
    }
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
