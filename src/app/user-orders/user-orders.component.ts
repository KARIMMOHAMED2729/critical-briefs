import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { CommonModule, NgForOf } from '@angular/common';
import { take } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { PaymentService } from '../services/payment.service';

interface RatedBook {
  bookId: string;
  rating: number;
}

interface Product {
  book: string;
  quantity: number;
  bookId?: string;
  rating?: number;
  selectedRating?: number;
}

interface PrintProject {
  filename: string;
  filepath: string;
  size: string;
  coverType: string;
  printColor: string;
  pages: number;
  copies: number;
  notes?: string;
  projectTitle: string;
  estimatedPrice: number;
  createdAt: string;
}

interface Order {
  _id: string;
  products: Product[];
  printProjects?: PrintProject[];
  status: string;
  orderDate: string;
  address: string;
  totalAmount: number;
}

@Component({
  selector: 'app-user-orders',
  standalone: true,
  imports: [CommonModule, NgForOf, FormsModule],
  templateUrl: './user-orders.component.html',
  styleUrls: ['./user-orders.component.css']
})
export class UserOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading: boolean = false;
  error: string = '';

  currentPage: number = 1;
  pageSize: number = 5;
  totalOrders: number = 0;

  userId: string = '';
  ratedBooks: RatedBook[] = [];

  constructor(private http: HttpClient, private authService: AuthService, private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      if (user && user.id) {
        this.userId = user.id;
        this.loadOrders(this.userId);
        this.loadRatedBooks(this.userId);
      }
    });
  }

  loadOrders(userId: string): void {
    this.loading = true;
    this.http.get<Order[]>(`${environment.apiBaseUrl}/orders/user-orders/${userId}`).subscribe({
      next: (data) => {
        this.totalOrders = data.length;
        // Show all orders without slicing for pagination to handle printProjects display correctly
        this.orders = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'حدث خطأ أثناء تحميل الطلبات.';
        this.loading = false;
        console.error('Error loading user orders:', err);
      }
    });
  }

  loadRatedBooks(userId: string): void {
    this.http.get<RatedBook[]>(`${environment.apiBaseUrl}/users/rated-books/${userId}`).subscribe({
      next: (data) => {
        this.ratedBooks = data;
        this.applyRatingsToOrders();
      },
      error: (err) => {
        console.error('Error loading rated books:', err);
      }
    });
  }

  applyRatingsToOrders(): void {
    this.orders.forEach(order => {
      order.products.forEach(product => {
        const ratedBook = this.ratedBooks.find(rb => rb.bookId === product.bookId);
        if (ratedBook) {
          product.rating = ratedBook.rating;
        }
      });
    });
  }

  submitRating(bookId: string, rating: number): void {
    if (!this.userId) return;
    this.http.post(`${environment.apiBaseUrl}/users/submit-rating`, { userId: this.userId, bookId, rating }).subscribe({
      next: () => {
        // Update local rating
        const ratedBookIndex = this.ratedBooks.findIndex(rb => rb.bookId === bookId);
        if (ratedBookIndex !== -1) {
          this.ratedBooks[ratedBookIndex].rating = rating;
        } else {
          this.ratedBooks.push({ bookId, rating });
        }
        this.applyRatingsToOrders();
        alert('تم إرسال التقييم بنجاح');
      },
      error: (err) => {
        console.error('Error submitting rating:', err);
      }
    });
  }

  onRatingChange(bookId: string, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const rating = Number(selectElement.value);
    if (rating >= 1 && rating <= 5) {
      this.submitRating(bookId, rating);
    }
  }

  nextPage(): void {
    this.currentPage++;
    if (this.userId) {
      this.loadOrders(this.userId);
    }
    this.scrollToTop();
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      if (this.userId) {
        this.loadOrders(this.userId);
      }
    }
    this.scrollToTop();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelOrder(orderId: string): void {
    console.log(`Cancelling order with ID: ${orderId}`); // Log the order ID
    this.http.patch(`${environment.apiBaseUrl}/orders/update-status/${orderId}`, { status: 'تم الإلغاء' }).subscribe({
      next: () => {
        // No need to filter out the order, just update the status
        const order = this.orders.find(order => order._id === orderId);
        if (order) {
          order.status = 'تم الإلغاء'; // Update the status locally
        }
      },
      error: (err) => {
        console.error('Error cancelling order:', err);
      }
    });
  }

  calculateExpectedDeliveryDate(orderDate: string): string {
    const date = new Date(orderDate);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() + 3); // Add 3 days
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 5); // Add 5 days
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    return `من ${new Intl.DateTimeFormat('ar-EG', options).format(startDate)} إلى ${new Intl.DateTimeFormat('ar-EG', options).format(endDate)}`;
  }
  
  calculatePrintProjectExpectedDeliveryDate(createdAt: string): string {
    const date = new Date(createdAt);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() + 5); // Add 5 days for print projects
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 7); // Add 7 days for print projects
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    return `من ${new Intl.DateTimeFormat('ar-EG', options).format(startDate)} إلى ${new Intl.DateTimeFormat('ar-EG', options).format(endDate)}`;
  }

  resumePayment(order: Order): void {
    if (!this.userId) {
      alert('يجب تسجيل الدخول لإتمام الدفع');
      return;
    }

    const currency = 'EGP'; // Adjust currency as needed
    const merchantRedirect = window.location.origin + '/payment-success'; // Redirect URL after payment

    this.authService.user$.pipe(take(1)).subscribe(user => {
      const customerEmail = user?.email || '';
      // Prepare order data for re-submission
      const orderData = {
        userId: this.userId,
        products: order.products.map(p => ({
          bookId: p.bookId || '',
          bookName: p.book,
          quantity: p.quantity,
          price: 0 // Price is not used in backend order creation, so set to 0 or remove if not needed
        })),
        shippingCost: 0, // Shipping cost unknown here, set to 0 or adjust as needed
        totalAmount: order.totalAmount
      };
      // Re-submit order to get new orderId
      this.http.post<{ orderId: string }>(`${environment.apiBaseUrl}/orders/submit`, orderData).subscribe({
        next: (response) => {
          const newOrderId = response.orderId;
          console.log('New orderId from re-submission:', newOrderId);
      // Removed debug alert for cleaner user experience
          this.paymentService.createPayment(newOrderId, order.totalAmount, currency, customerEmail, merchantRedirect).subscribe({
            next: (paymentResponse: any) => {
              if (paymentResponse.sessionUrl) {
                window.location.href = paymentResponse.sessionUrl;
              } else {
                alert('فشل في الحصول على رابط الدفع');
              }
            },
            error: (paymentError) => {
              console.error('خطأ في إنشاء طلب الدفع:', paymentError);
              alert('حدث خطأ أثناء إنشاء طلب الدفع، يرجى المحاولة مرة أخرى');
            }
          });
        },
        error: (err) => {
          console.error('Error re-submitting order:', err);
          alert('حدث خطأ أثناء إعادة إرسال الطلب، يرجى المحاولة مرة أخرى');
        }
      });
    });
  }
}
