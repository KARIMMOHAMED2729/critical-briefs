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

  onSearchKeyup() {
    if (this.searchQuery.trim()) {
      this.searchResults = this.allBooks.filter(book =>
        book.product_name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
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
