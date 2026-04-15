import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatSidebarComponent } from './components/chat-sidebar/chat-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatSidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent { }
