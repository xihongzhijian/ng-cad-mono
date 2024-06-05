import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageComponentControlComponent } from './page-component-control.component';

describe('PageComponentControlComponent', () => {
  let component: PageComponentControlComponent;
  let fixture: ComponentFixture<PageComponentControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageComponentControlComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PageComponentControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
