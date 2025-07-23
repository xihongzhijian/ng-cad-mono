import {NgModule} from "@angular/core";
import {MAT_DIALOG_DEFAULT_OPTIONS} from "@angular/material/dialog";
import {MAT_SNACK_BAR_DEFAULT_OPTIONS} from "@angular/material/snack-bar";
import {MessageTestComponent} from "./components/message-test/message-test.component";
import {MessageComponent} from "./components/message/message.component";

@NgModule({
  exports: [MessageComponent, MessageTestComponent],
  imports: [MessageComponent, MessageTestComponent],
  providers: [
    {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {maxWidth: "unset"}},
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {duration: 1000, verticalPosition: "top"}
    }
  ]
})
export class MessageModule {}
