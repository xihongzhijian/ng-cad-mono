import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {timeout} from "@lucilor/utils";
import {HttpModule} from "@modules/http/http.module";
import {QuillModule} from "ngx-quill";
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
      imports: [FormsModule, HttpModule, MatButtonModule, MatDialogModule, MatSnackBarModule, QuillModule, MessageComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: {}}
      ]
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
