import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatAiService {
  private apiUrl = environment.apiBaseUrl + '/chat-ai';

  constructor(private http: HttpClient) { }

  /**
   * إرسال رسالة إلى خدمة الذكاء الاصطناعي
   * @param messages مصفوفة الرسائل
   * @param model النموذج المستخدم (اختياري)
   * @param temperature درجة الإبداعية (اختياري)
   * @param maxTokens الحد الأقصى للرموز (اختياري)
   */
  sendMessage(
    messages: any[],
    model?: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-message`, {
      messages,
      model,
      temperature,
      max_tokens: maxTokens
    });
  }

  /**
   * الحصول على النماذج المتاحة
   */
  getAvailableModels(): Observable<any> {
    return this.http.get(`${this.apiUrl}/models`);
  }
}
