import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import governoratesData from '../../../../public/json/egypt-governorates.json';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  governorates: any[] = governoratesData.governorates;
  cities: string[] = [];
  
  user = {
    username: '',
    email: '',
    password: '',
    phone: '',
    governorate: '',
    city: '',
    village: ''
  };

  confirmPassword: string = '';
  passwordMismatch: boolean = false;
  passwordTouched: boolean = false;
  passwordValid: boolean = false;
  passwordInvalid: boolean = false;
  phoneValid: boolean = false;
  usernameValid: boolean = false;
  phoneTouched: boolean = false;
  emailValid: boolean = false;
  emailTouched: boolean = false;
  message: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngAfterViewInit() {
    this.loadGoogleScript();
  }

  loadGoogleScript() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeGoogleSignIn();
    document.body.appendChild(script);
  }

  initializeGoogleSignIn() {
    // @ts-ignore
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleGoogleCredentialResponse(response)
    });
    // @ts-ignore
    google.accounts.id.renderButton(
      document.getElementById('googleSignInDiv'),
      { theme: 'outline', size: 'large' }
    );
  }

  handleGoogleCredentialResponse(response: any) {
    const idToken = response.credential;
    this.authService.googleSignIn(idToken).subscribe({
      next: (user) => {
        this.message = '✅ تم تسجيل الدخول باستخدام حساب Google بنجاح!';
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.message = '❌ فشل تسجيل الدخول باستخدام حساب Google. يرجى المحاولة مرة أخرى.';
        console.error('Google sign-in error:', error);
      }
    });
  }

  onGovernorateChange() {
    const selectedGov = this.governorates.find(g => g.governorate_name === this.user.governorate);
    this.cities = selectedGov ? selectedGov.cities : [];
    this.user.city = ''; // Reset city when governorate changes
  }

  validateLocation() {
    return this.user.governorate && this.user.city;
  }

   // التحقق من أن الاسم غير فارغ
   validateName() {
    this.usernameValid = this.user.username.trim().length > 0;
  }
  // التحقق من تطابق كلمة المرور
  checkPasswordMatch() {
    this.passwordMismatch = this.user.password !== this.confirmPassword;
  }

  // التحقق من كلمة المرور (منع المسافات والتحقق من الطول)
  validatePassword() {
    const regex = /\s/;
    this.passwordInvalid = regex.test(this.user.password) || this.user.password.length < 8;
    this.passwordValid = !this.passwordInvalid;
  }

  // التحقق من رقم الهاتف
  validatePhone() {
    const egyptPhoneRegex = /^(010|011|012|015)[0-9]{8}$/;
    this.phoneTouched = true;
    this.phoneValid = egyptPhoneRegex.test(this.user.phone);
  }

  // التحقق من البريد الإلكتروني
  validateEmail() {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    this.emailTouched = true;
    this.emailValid = emailRegex.test(this.user.email);
  }

  // دالة التسجيل
  onRegister() {
    this.checkPasswordMatch();
    this.validatePassword();
    this.validatePhone();
    this.validateEmail();

    if (this.passwordMismatch || this.passwordInvalid || !this.phoneValid || !this.emailValid) {
      this.message = '❌ هناك خطأ في البيانات المدخلة. يرجى التحقق من جميع الحقول.';
      return;
    }

    // إرسال البيانات إلى الباك اند (على سبيل المثال، AuthService)
    this.message = ''; // مسح الرسائل السابقة
    console.log('تم التسجيل بالبيانات:', this.user);

    // إرسال البيانات باستخدام خدمة AuthService
    this.authService.createAccount(
      this.user.username, 
      this.user.email, 
      this.user.password, 
      this.user.phone,
      this.user.governorate,
      this.user.city,
      this.user.village || ''
    )
      .subscribe({
        next: (response) => {
          this.message = '✅ تم إنشاء الحساب بنجاح!';
          // التوجيه إلى صفحة تسجيل الدخول بعد إنشاء الحساب
          this.router.navigate(['/login']);
        },
        error: (error) => {
          if (error.status === 400 && error.error.message === 'هذا البريد الإلكتروني مسجل من قبل.') {
            this.message = '❌ هذا البريد الإلكتروني مسجل من قبل.';
          } else {
            this.message = '❌ حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقًا.';
          }
          console.error('Error creating account:', error);
        }
      });
  }
}
