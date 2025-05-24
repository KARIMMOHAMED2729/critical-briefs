import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { DataService } from '../services/data.service';
import { map } from 'rxjs/operators';
import { CommonModule, NgIf } from '@angular/common';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';

@Component({
  selector: 'app-cart',
  standalone : true,
  imports:[CommonModule, NgIf, CheckoutModalComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cartBooks: any[] = [];
  isLoading = true;
  totalPrice = 0;
  showCheckoutModal = false;

  constructor(
    private authService: AuthService,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    this.loadCartBooks();
  }

  loadCartBooks() {
    this.authService.cartBookIds.subscribe(bookIds => {
      if (bookIds.length > 0) {
        this.dataService.getData().pipe(
          map((books: any[]) => books.filter(book => bookIds.includes(book.products_id)))
        ).subscribe({
          next: (filteredBooks) => {
            this.cartBooks = filteredBooks;
            this.calculateTotal();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error loading cart books:', err);
            this.isLoading = false;
          }
        });
      } else {
        this.cartBooks = [];
        this.isLoading = false;
      }
    });
  }

  calculateTotal() {
    this.totalPrice = this.cartBooks.reduce((total, book) => total + parseFloat(book.product_price), 0);
  }

  removeFromCart(bookId: string) {
    // Store original state in case we need to revert
    const originalCart = [...this.cartBooks];
    const originalTotal = this.totalPrice;

    // Immediately update UI
    this.cartBooks = this.cartBooks.filter(book => book.products_id !== bookId);
    this.calculateTotal();

    this.authService.user$.subscribe(user => {
      const userId = user?.id;
      if (userId) {
        this.authService.removeFromCart(userId, bookId).subscribe({
          next: () => {
            // Update cart IDs in auth service
            const currentCartIds = this.authService.cartBookIds.getValue();
            this.authService.cartBookIds.next(currentCartIds.filter(id => id !== bookId));
          },
          error: (err) => {
            console.error('Error removing from cart:', err);
            // Revert to original state if API call fails
            this.cartBooks = originalCart;
            this.totalPrice = originalTotal;
          }
        });
      }
    });
  }

  handleImageError(event: any) {
    const imageElement = event.target;
  
    if (!imageElement.errorStep) {
      imageElement.errorStep = 1;
    } else {
      imageElement.errorStep++;
    }
  
    const imageName = imageElement.src.split('/').pop().split('.')[0];
  
    switch (imageElement.errorStep) {
      case 1:
        imageElement.src = `books/${imageName}.webp`;
        break;
      case 2:
        imageElement.src = `books/${imageName}.png`;
        break;
      case 3:
        imageElement.src = `books/${imageName}.jpg`;
        break;
      default:
        imageElement.src = 'books/default.png'; // صورة افتراضية
        break;
    }
  }
}
