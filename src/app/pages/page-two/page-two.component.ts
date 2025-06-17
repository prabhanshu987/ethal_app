import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-two',
  templateUrl: './page-two.component.html'
})
export class PageTwoComponent {
  formData: any = {
    ingot: '',
    lotNo: '',
    potLid: '',
    initialWidth: '',
    initialLength: '',
    initialThickness: '',
    circleDia: '',
    circleTh: '',
    sheetW: '',
    sheetL: '',
    sheetTh: ''
  };

  rows: any[] = [];
  length = '';
  thickness = '';
  submitted = false;
  constructor(private router: Router) {} 
  addRow() {
    if (!this.formData.initialThickness || !this.thickness) return;
    const reduction = (+this.formData.initialThickness - +this.thickness).toFixed(2);
    const reductionPercent = ((+reduction / +this.formData.initialThickness) * 100).toFixed(1) + '%';
    this.rows.push({
      passNo: this.rows.length + 1,
      width: this.formData.initialWidth,
      length: this.length,
      thickness: this.thickness,
      reduction,
      reductionPercent
    });
    this.formData.initialThickness = this.thickness;
    this.length = '';
    this.thickness = '';
  }

  isFormValid() {
    return this.formData.ingot && this.formData.potLid && this.formData.initialWidth && this.formData.initialLength && this.formData.initialThickness;
  }

  nextPage() {
    if (this.isFormValid()) {
      
      sessionStorage.setItem('pageTwoData', JSON.stringify(this.formData));
      sessionStorage.setItem('passScheduleData', JSON.stringify(this.rows));
    //  window.location.href = '/page-three';
      this.router.navigate(['/page-three']);
    } else {
      this.submitted = true;
    }
  }
  back() {
this.router.navigate(['/page-one']);;  }

formatTwoDecimals(field: string) {
  if (this.formData[field]) {
    this.formData[field] = parseFloat(this.formData[field]).toFixed(2);
  }
}
}
