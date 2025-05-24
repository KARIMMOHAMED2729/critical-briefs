import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { DataService } from '../services/data.service';
import { take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { NotificationService } from '../services/notification.service';

interface Order {
  _id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  book: string;
  quantity: number;
  status: string;
  orderDate: string;
  totalAmount: number;
}

interface RequestedBook {
  _id: string;
  userId: string;
  username?: string;
  bookName: string;
  authorName: string;
  dateRequested: string;
  added: boolean;
}

interface Product {
  book: string;
  quantity: number;
}

interface GroupedOrder {
  _id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  products: Product[];
  status: string;
  orderDate: string;
  totalAmount: number;
}

interface PrintOrder {
  orderId: string;
  userId: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  orderDate: string;
  totalAmount: number;
  printProject: {
    filename: string;
    filepath: string;
    size: string;
    coverType: string;
    printColor: string;
    pages: number;
    copies: number;
    notes: string;
    projectTitle: string;
    estimatedPrice: number;
    createdAt: Date;
  };
  fileIndex: number; // Added to fix TypeScript error
}

@Component({
  selector: 'app-admin-dashboard',
  standalone : false,
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  orders: GroupedOrder[] = [];
  requestedBooks: RequestedBook[] = [];
  isAdmin: boolean = false;
  currentView: 'orders' | 'requestedBooks' | 'printOrders' | 'addProduct' = 'orders';

  // Pagination state for orders
  ordersPage: number = 1;
  ordersPageSize: number = 10;

  // Pagination state for requestedBooks
  requestedBooksPage: number = 1;
  requestedBooksPageSize: number = 10;

  // Pagination state for printOrders
  printOrdersPage: number = 1;
  printOrdersPageSize: number = 10;

  printOrders: PrintOrder[] = [];

  backendBaseUrl: string = environment.apiBaseUrl;

  product = {
    product_name: '',
    product_quantity: 1,
    product_category: '',
    product_description: '',
    product_price: 0,
    price_cost: 0
  };

  selectedFile: File | null = null;

  imageError: string | null = null;

  uploading: boolean = false;
  uploadProgress: number = 0;
  uploadSuccess: boolean = false;

  readonly MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB

  categories: string[] = ['رواية', 'تنمية', 'ديني', 'قاموس', 'صحة', 'اعمال', 'فن', 'تاريخ', 'تربية'];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private dataService: DataService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      if (user && user.email === 'admin@example.com' && user.role === 'admin') {
        this.isAdmin = true;
        this.loadOrders();
        this.loadNotifications();
      } else {
        this.isAdmin = false;
        this.router.navigate(['/']);
      }
    });
  }

  confirmPrintOrderShipment(userId: string, orderId: string, newStatus: string): void {
    let confirmMessage = '';
    let successMessage = '';

    switch (newStatus) {
      case 'تم الشحن':
        confirmMessage = 'هل أنت متأكد من أن طلب الطباعة تم شحنه بنجاح؟ سيتم تحديث حالة الطلب.';
        successMessage = 'تم تحديث حالة طلب الطباعة إلى تم الشحن.';
        break;
      case 'تم التسليم':
        confirmMessage = 'هل أنت متأكد من أن طلب الطباعة تم تسليمه بنجاح؟ سيتم تحديث حالة الطلب.';
        successMessage = 'تم تحديث حالة طلب الطباعة إلى تم التسليم.';
        break;
      case 'تم الإلغاء':
        confirmMessage = 'هل أنت متأكد من إلغاء طلب الطباعة؟ سيتم تحديث حالة الطلب.';
        successMessage = 'تم إلغاء طلب الطباعة.';
        break;
      default:
        confirmMessage = 'هل أنت متأكد من تحديث حالة طلب الطباعة؟';
        successMessage = 'تم تحديث حالة طلب الطباعة.';
    }

    if (confirm(confirmMessage)) {
      this.http.patch(`${this.backendBaseUrl}/print/update-status/${userId}/${orderId}`, { status: newStatus }).subscribe({
        next: () => {
          alert(successMessage);
          this.loadPrintOrders();
          this.loadNotifications();
          this.authService.user$.pipe(take(1)).subscribe(user => {
            if (user && user.id) {
              this.notificationService.refreshNotifications(user.id);
            }
          });
        },
        error: (error) => {
          alert('حدث خطأ أثناء تحديث حالة طلب الطباعة');
          console.error('Error updating print order status:', error);
        }
      });
    }
  }

  extractFilename(filepath: string): string {
    if (!filepath) return '';
    const parts = filepath.split(/[\\/]/);
    return parts[parts.length - 1].trim();
  }

  encodeUriComponentSafe(value: string): string {
    return encodeURIComponent(value);
  }

  switchView(view: 'orders' | 'requestedBooks' | 'printOrders' | 'addProduct'): void {
    this.currentView = view;
    if (view === 'orders') {
      this.loadOrders();
    } else if (view === 'requestedBooks') {
      this.fetchRequestedBooks();
    } else if (view === 'printOrders') {
      this.loadPrintOrders();
    }
  }

  formatOrderDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    return new Intl.DateTimeFormat('ar-EG', options).format(date);
  }

  loadNotifications(): void {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user && user.id) {
        this.notificationService.getNotifications(user.id).subscribe(notifications => {
          // Removed console log as per user request
        });
      }
    });
  }

  loadOrders(): void {
    this.http.get<Order[]>(`${environment.apiBaseUrl}/orders/all`).subscribe({
      next: (data) => {
        const groupedOrdersMap: { [key: string]: GroupedOrder } = {};

        data.forEach(order => {
          if (!groupedOrdersMap[order._id]) {
            groupedOrdersMap[order._id] = {
              _id: order._id,
              customerName: order.customerName,
              email: order.email,
              phone: order.phone,
              address: order.address,
              products: [],
              status: order.status,
              orderDate: order.orderDate,
              totalAmount: order.totalAmount
            };
          }
          groupedOrdersMap[order._id].products.push({
            book: order.book,
            quantity: order.quantity
          });
        });

        const allOrders = Object.values(groupedOrdersMap).sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
        this.orders = allOrders.slice((this.ordersPage - 1) * this.ordersPageSize, this.ordersPage * this.ordersPageSize);
      },
      error: (err) => {
        console.error('Error loading orders:', err);
      }
    });
  }

  fetchRequestedBooks(): void {
    this.http.get<RequestedBook[]>(`${environment.apiBaseUrl}/users/requested-books`).subscribe({
      next: (data) => {
        this.requestedBooks = data.slice((this.requestedBooksPage - 1) * this.requestedBooksPageSize, this.requestedBooksPage * this.requestedBooksPageSize);
      },
      error: (err) => {
        console.error('Error loading requested books:', err);
      }
    });
  }

  loadPrintOrders(): void {
    this.http.get<{ success: boolean; printOrders: PrintOrder[] }>(`${environment.apiBaseUrl}/print/all-print-orders`).subscribe({
      next: (response) => {
        if (response.success) {
          const allPrintOrders = response.printOrders;
          this.printOrders = allPrintOrders.slice((this.printOrdersPage - 1) * this.printOrdersPageSize, this.printOrdersPage * this.printOrdersPageSize);
        }
      },
      error: (err) => {
        console.error('Error loading print orders:', err);
      }
    });
  }

  getDownloadUrl(printOrder: PrintOrder): string {
    // Construct the download URL using userId, orderId, and fileIndex
    return `${environment.apiBaseUrl}/print/download-file/${printOrder.userId}/${printOrder.orderId}/${printOrder.fileIndex}`;
  }

  nextPrintOrdersPage(): void {
    this.printOrdersPage++;
    this.loadPrintOrders();
    this.scrollToTop();
  }

  prevPrintOrdersPage(): void {
    if (this.printOrdersPage > 1) {
      this.printOrdersPage--;
      this.loadPrintOrders();
    }
    this.scrollToTop();
  }

  nextRequestedBooksPage(): void {
    this.requestedBooksPage++;
    this.fetchRequestedBooks();
    this.scrollToTop();
  }

  prevRequestedBooksPage(): void {
    if (this.requestedBooksPage > 1) {
      this.requestedBooksPage--;
      this.fetchRequestedBooks();
    }
    this.scrollToTop();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleAddedStatus(suggestion: RequestedBook): void {
    const newStatus = !suggestion.added;
    if (confirm(`هل أنت متأكد من تغيير حالة الاقتراح إلى ${newStatus ? 'تم إضافته' : 'لم يتم إضافته' }؟`)) {
      this.http.patch(`${environment.apiBaseUrl}/users/requested-books/${suggestion.userId}/${suggestion._id}`, { added: newStatus }).subscribe({
        next: (response) => {
          console.log('Response from updateRequestedBookStatus API:', response);
          suggestion.added = newStatus;
          alert('تم تحديث حالة الاقتراح بنجاح');
          this.authService.user$.pipe(take(1)).subscribe(user => {
            if (user && user.id) {
              this.notificationService.refreshNotifications(user.id);
            }
          });
                    const bookStatusMessage = newStatus ? `تم إضافة اقتراح الكتاب "${suggestion.bookName}"` : `تم إزالة اقتراح الكتاب "${suggestion.bookName}"`;
        },
        error: (error) => {
          console.error('Error updating requested book status:', error);
          alert('حدث خطأ أثناء تحديث حالة الاقتراح');
        }
      });
    }
  }

  deleteRequestedBook(suggestionId: string, userId: string): void {
    if (confirm('هل أنت متأكد من حذف هذا الاقتراح نهائياً؟')) {
      const url = `${environment.apiBaseUrl}/users/requested-books/${userId}/${suggestionId}`;
      console.log('Deleting suggestion with URL:', url);
      this.http.delete(url).subscribe({
        next: () => {
          alert('تم حذف الاقتراح بنجاح');
          this.fetchRequestedBooks();
          this.authService.user$.pipe(take(1)).subscribe(user => {
            if (user && user.id) {
              this.notificationService.refreshNotifications(user.id);
            }
          });
        },
        error: (err) => {
          alert('حدث خطأ أثناء حذف الاقتراح');
          console.error('Error deleting suggestion:', err);
        }
      });
    }
  }

  confirmShipment(orderId: string, newStatus: string): void {
    let confirmMessage = '';
    let successMessage = '';

    switch (newStatus) {
      case 'تم الشحن':
        confirmMessage = 'هل أنت متأكد من أن الطلب تم شحنه بنجاح؟ سيتم تحديث حالة الطلب.';
        successMessage = 'تم تحديث حالة الطلب إلى تم الشحن.';
        break;
      case 'تم التسليم':
        confirmMessage = 'هل أنت متأكد من أن الطلب تم تسليمه بنجاح؟ سيتم تحديث حالة الطلب.';
        successMessage = 'تم تحديث حالة الطلب إلى تم التسليم.';
        break;
      case 'تم الإلغاء':
        confirmMessage = 'هل أنت متأكد من إلغاء الطلب؟ سيتم تحديث حالة الطلب.';
        successMessage = 'تم إلغاء الطلب.';
        break;
      default:
        confirmMessage = 'هل أنت متأكد من تحديث حالة الطلب؟';
        successMessage = 'تم تحديث حالة الطلب.';
    }

    if (confirm(confirmMessage)) {
      this.http.patch(`${environment.apiBaseUrl}/orders/update-status/${orderId}`, { status: newStatus }).subscribe({
        next: () => {
          alert(successMessage);
          this.loadOrders();
          this.loadNotifications();
          this.authService.user$.pipe(take(1)).subscribe(user => {
            if (user && user.id) {
              this.notificationService.refreshNotifications(user.id);
            }
          });
           const statusVerbMap: { [key: string]: string } = {
            'تم الشحن': 'شحن',
            'تم التسليم': 'تسليم',
            'تم الإلغاء': 'إلغاء'
          };
          const verb = statusVerbMap[newStatus] || 'تحديث';
        }
      });
    }
  }

  deleteOrder(orderId: string): void {
    if (confirm('هل أنت متأكد أنك تريد حذف هذا الطلب؟')) {
      this.http.delete(`${environment.apiBaseUrl}/orders/delete/${orderId}`).subscribe({
        next: () => {
          alert('تم حذف الطلب بنجاح');
          this.loadOrders();
          this.authService.user$.pipe(take(1)).subscribe(user => {
            if (user && user.id) {
              this.notificationService.refreshNotifications(user.id);
            }
          });
          this.authService.user$.pipe(take(1)).subscribe(user => {
            if (user && user.id) {
              this.dataService.loadOrders(user.id).subscribe();
            }
          });
        },
        error: (err) => {
          alert('حدث خطأ أثناء حذف الطلب.');
          console.error('Error deleting order:', err);
        }
      });
    }
  }

  deletePrintOrder(userId: string, orderId: string): void {
    if (confirm('هل أنت متأكد من حذف طلب الطباعة؟')) {
      this.http.delete(`${this.backendBaseUrl}/print/delete-print-order/${userId}/${orderId}`).subscribe({
        next: () => {
          alert('تم حذف طلب الطباعة بنجاح');
          this.loadPrintOrders();
        },
        error: (err) => {
          alert('حدث خطأ أثناء حذف طلب الطباعة');
          console.error('Error deleting print order:', err);
        }
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.imageError = null;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
      if (!validImageTypes.includes(file.type)) {
        this.imageError = 'يرجى تحميل ملف صورة صالح (JPEG, PNG, GIF, WEBP, BMP, SVG).';
        this.selectedFile = null;
      } else if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
        this.imageError = `حجم الصورة أكبر من 500 كيلوبايت. يرجى تحميل صورة أصغر.`;
        this.selectedFile = null;
      } else {
        this.selectedFile = file;
      }
    } else {
      this.selectedFile = null;
    }
  }

  submitAddProduct(): void {
    this.imageError = null;
    if (!this.selectedFile) {
      this.imageError = 'يرجى اختيار صورة المنتج.';
      return;
    }

    // Additional validation for required fields
    if (
      !this.product.product_name ||
      !this.product.product_quantity ||
      !this.product.product_category ||
      !this.product.product_description ||
      this.product.product_price === null ||
      this.product.price_cost === null
    ) {
      alert('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.');
      return;
    }

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    formData.append('product_name', this.product.product_name);
    formData.append('product_quantity', this.product.product_quantity.toString());
    formData.append('product_category', this.product.product_category);
    formData.append('product_description', this.product.product_description);
    formData.append('product_price', this.product.product_price.toString());
    formData.append('price_cost', this.product.price_cost.toString());

    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadSuccess = false;

    this.http.request('POST', `${this.backendBaseUrl}/admin/add-product`, {
      body: formData,
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === 1 && event.total) { // HttpEventType.UploadProgress
          this.uploadProgress = Math.round((event.loaded / event.total) * 100);
        } else if (event.type === 4) { // HttpEventType.Response
          this.uploadSuccess = true;
          this.uploading = false;
          // Removed alert for successful upload as requested
          // Reset form
          this.product = {
            product_name: '',
            product_quantity: 1,
            product_category: '',
            product_description: '',
            product_price: 0,
            price_cost: 0
          };
          this.selectedFile = null;
          this.imageError = null;
          this.switchView('orders');
          setTimeout(() => {
            this.uploadSuccess = false;
            this.uploadProgress = 0;
          }, 1000);
        }
      },
      error: (error) => {
        this.uploading = false;
        this.uploadProgress = 0;
        this.uploadSuccess = false;
        console.error('Error adding product:', error);
        alert('حدث خطأ أثناء إضافة المنتج.');
      }
    });
  }
}
