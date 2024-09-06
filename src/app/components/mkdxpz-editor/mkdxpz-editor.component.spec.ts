import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MkdxpzEditorComponent } from './mkdxpz-editor.component';

describe('MkdxpzEditorComponent', () => {
  let component: MkdxpzEditorComponent;
  let fixture: ComponentFixture<MkdxpzEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MkdxpzEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MkdxpzEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
