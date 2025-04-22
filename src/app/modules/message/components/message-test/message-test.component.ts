import {Component, computed, inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MessageService} from "@modules/message/services/message.service";
import {messageDataKeys, MessageDataMap} from "../message/message.types";

@Component({
  selector: "app-message-test",
  templateUrl: "./message-test.component.html",
  styleUrls: ["./message-test.component.scss"],
  imports: [MatButtonModule]
})
export class MessageTestComponent {
  private message = inject(MessageService);

  btns = computed(() => messageDataKeys.slice());

  async openMessage<T extends keyof MessageDataMap>(key: T) {
    let result: any | undefined;
    switch (key) {
      case "alert":
        result = await this.message.alert({content: "alert", title: "title"});
        break;
      case "confirm":
        result = await this.message.confirm({content: "confirm", title: "title"});
        break;
      case "form":
        result = await this.message.form([{type: "string", label: "label", value: "value"}], {title: "title"});
        break;
      case "book":
        result = await this.message.book({bookData: [{content: "content", title: "title2"}], title: "title1"});
        break;
      case "editor":
        result = await this.message.editor({content: "editor", title: "title"});
        break;
      case "button":
        result = await this.message.button({buttons: ["button1", "button2"], title: "title"});
        break;
      case "iframe":
        result = await this.message.iframe({content: location.href, title: "title"});
        break;
      case "json":
        result = await this.message.json({json: {a: 1, b: 2}, title: "title"});
        break;
    }
    console.log(result);
  }
}
