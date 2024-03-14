import {TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {AppStatusService} from "./app-status.service";

describe("AppStatusService", () => {
  let service: AppStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpModule, SpinnerModule]});
    service = TestBed.inject(AppStatusService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
