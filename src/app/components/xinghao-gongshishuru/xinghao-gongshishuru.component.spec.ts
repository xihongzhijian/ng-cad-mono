import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XinghaoGongshishuruComponent } from './xinghao-gongshishuru.component';

describe('XinghaoGongshishuruComponent', () => {
  let component: XinghaoGongshishuruComponent;
  let fixture: ComponentFixture<XinghaoGongshishuruComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XinghaoGongshishuruComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(XinghaoGongshishuruComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
