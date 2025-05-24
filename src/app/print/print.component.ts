import { Component } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';

@Component({
  standalone: false,
  selector: 'app-print',
  templateUrl: './print.component.html',
  styleUrls: ['./print.component.css']
})
export class PrintComponent {
  projects: any[] = [];
  userId: string = ''; // سيتم تعيينه من خدمة المصادقة
  uploadResponse: any = null;
  uploading: boolean = false;
  uploadProgress: number = 0;
  uploadSuccess: boolean = false;
  errorMessage: string = '';

  validationErrors: any[] = [];

  constructor(private http: HttpClient) {}

  addProject() {
    this.projects.push({
      file: null,
      size: '',
      coverType: '',
      printColor: '',
      pages: null,
      copies: null,
      notes: '',
      projectTitle: '',
      estimatedPrice: 0 // Add estimatedPrice property
    });
    this.validationErrors.push({});
  }

  removeProject(index: number) {
    this.projects.splice(index, 1);
    this.validationErrors.splice(index, 1);
  }

  onFileChange(event: any, index: number) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.projects[index].file = file;
      this.clearValidationError(index, 'file');
    } else {
      alert('Please select a PDF file.');
      event.target.value = '';
    }
  }

  clearValidationError(index: number, field: string) {
    if (this.validationErrors[index]) {
      delete this.validationErrors[index][field];
    }
  }

  validateProjects(): boolean {
    let isValid = true;
    this.validationErrors = [];

    this.projects.forEach((project, i) => {
      const errors: any = {};
      if (!project.file) {
        errors.file = true;
        isValid = false;
      }
      if (!project.projectTitle || project.projectTitle.trim() === '') {
        errors.projectTitle = true;
        isValid = false;
      }
      if (!project.size) {
        errors.size = true;
        isValid = false;
      }
      if (!project.coverType) {
        errors.coverType = true;
        isValid = false;
      }
      if (!project.printColor) {
        errors.printColor = true;
        isValid = false;
      }
      if (!project.paperColor) {
        errors.paperColor = true;
        isValid = false;
      }
      if (!project.pages || project.pages < 1) {
        errors.pages = true;
        isValid = false;
      }
      if (!project.copies || project.copies < 1) {
        errors.copies = true;
        isValid = false;
      }
      this.validationErrors[i] = errors;
    });

    return isValid;
  }

  calculatePrice(project: any) {
    // Updated price calculation logic to match backend
    let basePricePerPage = 0.25; // base price per page in currency units
    if (project.printColor === 'أبيض وأسود') {
      basePricePerPage = 0.40;
    } else if (project.printColor === 'ألوان') {
      basePricePerPage = 0.90;
    }

    let coverPrice = 0;
    if (project.coverType === 'غلاف ورقي') {
      coverPrice = 25;
    } else if (project.coverType === 'غلاف كرتوني') {
      coverPrice = 60;
    } else if (project.coverType === 'غلاف جلد فاخر') {
      coverPrice = 100;
    }

    let sizeMultiplier = 1;
    if (project.size === 'A4') {
      sizeMultiplier = 1;
    } else if (project.size === 'A5') {
      sizeMultiplier = 0.8;
    } else if (project.size === 'B5') {
      sizeMultiplier = 0.95;
    }

    let paperColorPrice = 0;
    if (project.paperColor === '#DED5AF') { // yellow paper
      paperColorPrice = 0.10;
    } else if (project.paperColor === '#FFFFFF') { // white paper default
      paperColorPrice = 0;
    }

    const pages = project.pages || 0;
    const copies = project.copies || 0;

    const price = ((pages * basePricePerPage) + coverPrice + paperColorPrice) * copies * sizeMultiplier;
    return Math.round(price * 100) / 100; // round to 2 decimals
  }

  updateEstimatedPrice(index: number) {
    const project = this.projects[index];
    project.estimatedPrice = this.calculatePrice(project);
  }

  onProjectChange(index: number) {
    this.updateEstimatedPrice(index);
  }

  submit() {
    if (this.projects.length === 0) {
      alert('أدخل مشروع الطباعة أولا');
      return;
    }

    if (!this.validateProjects()) {
      this.errorMessage = 'يجب اكمال البيانات';
      return;
    } else {
      this.errorMessage = '';
    }

    const formData = new FormData();
    const projectsData = this.projects.map(p => ({
      size: p.size,
      coverType: p.coverType,
      printColor: p.printColor,
      paperColor: p.paperColor || 'أبيض',
      pages: p.pages,
      copies: p.copies,
      notes: p.notes,
      projectTitle: p.projectTitle
    }));

    this.projects.forEach(p => {
      if (p.file) {
        formData.append('files', p.file, p.file.name);
      }
    });

    formData.append('projectsData', JSON.stringify(projectsData));
    formData.append('userId', this.userId);

    this.uploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.http.post('/api/print/upload', formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.uploadResponse = event.body;
          this.uploading = false;
          this.uploadSuccess = true;
          setTimeout(() => {
            this.uploadSuccess = false;
          }, 1000);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Upload failed';
        this.uploading = false;
      }
    });
  }
}
