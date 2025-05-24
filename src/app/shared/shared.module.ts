import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountModalComponent } from '../auth/account-modal/account-modal.component';
import { FormsModule } from '@angular/forms'; // لو المكون بيستخدم ngModel
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [
    AccountModalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule
  ],
  exports: [
    AccountModalComponent // 👈 علشان نقدر نستخدمه بره
  ]
})
export class SharedModule { }
