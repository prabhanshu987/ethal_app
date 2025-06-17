import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-one',
  templateUrl: './page-one.component.html'
})
export class PageOneComponent {
  formData = {
    date: '',
    supervisor: '',
    shift: '',
    crm: ''
  };
  submitted = false;

  constructor(private router: Router) {} // Inject Router service

  isFormValid() {
    return this.formData.date && this.formData.supervisor && this.formData.shift && this.formData.crm;
  }

  nextPage() {
    if (this.isFormValid()) {
      sessionStorage.setItem('pageOneData', JSON.stringify(this.formData));
      this.router.navigate(['/page-two']); // Use Angular Router for navigation
    } else {
      this.submitted = true;
    }
  }

  history() {
    this.router.navigate(['/history']); // Use Angular Router for navigation
  }
}