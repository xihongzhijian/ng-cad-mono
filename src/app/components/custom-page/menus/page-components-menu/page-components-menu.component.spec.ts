import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageComponentsMenuComponent } from './page-components-menu.component';

describe('PageComponentsMenuComponent', () => {
  let component: PageComponentsMenuComponent;
  let fixture: ComponentFixture<PageComponentsMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageComponentsMenuComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PageComponentsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
