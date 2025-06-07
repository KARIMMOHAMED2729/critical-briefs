import { Injectable } from '@angular/core';
import { Book } from '../book';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: Book[] = [];

  getCartItems(): Book[] {
    return this.cartItems;
  }

  addToCart(book: Book): void {
    this.cartItems.push(book);
  }

  removeFromCart(bookId: string): void {
    this.cartItems = this.cartItems.filter(item => item.products_id !== bookId);
  }

  clearCart(): void {
    this.cartItems = [];
  }
}