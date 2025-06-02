import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
  standalone: false
})
export class SearchBarComponent {
  @Input() allBooks: any[] = [];
  @Output() searchExecuted = new EventEmitter<string>();

  faSearch = faSearch;
  searchQuery: string = '';
  searchResults: any[] = [];

  @ViewChild('inputElement') inputElement!: ElementRef;

  onSearch() {
    if (this.searchQuery.trim()) {
      this.searchExecuted.emit(this.searchQuery.trim());
      this.searchResults = [];
    }
  }

  selectSuggestion(productName: string) {
    this.searchQuery = productName;
    this.searchResults = [];
    this.onSearch();
  }

  private normalizeArabic(text: string): string {
    return text.replace(/[أإآ]/g, 'ا');
  }

  onSearchKeyup() {
    if (this.searchQuery.trim()) {
      const normalizedQuery = this.normalizeArabic(this.searchQuery.toLowerCase());
      this.searchResults = this.allBooks.filter(book => {
        const normalizedProductName = this.normalizeArabic(book.product_name.toLowerCase());
        return normalizedProductName.includes(normalizedQuery);
      });
    } else {
      this.searchResults = [];
    }
  }

  onEnterPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearch();
      this.searchResults = [];
      this.inputElement.nativeElement.blur();
    }
  }
}
