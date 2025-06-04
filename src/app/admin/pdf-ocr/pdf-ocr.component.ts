import { Component } from '@angular/core';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-pdf-ocr',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './pdf-ocr.component.html',
  styleUrls: ['./pdf-ocr.component.css']
})
export class PdfOcrComponent {
  selectedFile: File | null = null;
  extractedText: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  uploading: boolean = false;
  uploadProgress: number = 0;
  uploadSuccess: boolean = false;

  constructor(private http: HttpClient) {}

  onFileSelected(event: any): void {
    this.errorMessage = '';
    this.successMessage = '';
    const file: File = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.uploading = false;
      this.uploadProgress = 0;
      this.uploadSuccess = false;
    } else {
      this.errorMessage = 'Please select a valid PDF file.';
      this.selectedFile = null;
    }
  }

  onConvert(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'No PDF file selected.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.extractedText = '';
    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadSuccess = false;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<{ text: string }>('/api/pdf-ocr/upload', formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event instanceof HttpResponse) {
          this.extractedText = event.body?.text || '';
          this.successMessage = 'Conversion completed successfully.';
          this.isLoading = false;
          this.uploading = false;
          this.uploadSuccess = true;
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'An error occurred during conversion.';
        this.isLoading = false;
        this.uploading = false;
        this.uploadSuccess = false;
      }
    });
  }

  downloadTxt(): void {
    if (!this.extractedText) return;
    const blob = new Blob([this.extractedText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  downloadEpub(): void {
    // For simplicity, download the text as .epub with basic formatting
    if (!this.extractedText) return;
    const epubContent = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head><title>Output</title></head>
    <body><pre>${this.extractedText}</pre></body>
    </html>`;
    const blob = new Blob([epubContent], { type: 'application/epub+zip' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.epub';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
