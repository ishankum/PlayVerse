import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';

export interface UserContext {
  username: string;
  token: string;
  isGuest: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5048/api/auth';
  
  private userContextSubject = new BehaviorSubject<UserContext | null>(null);
  public userContext$ = this.userContextSubject.asObservable();

  constructor(private http: HttpClient) {
    const saved = localStorage.getItem('gamingPlatformUser');
    if (saved) {
      this.userContextSubject.next(JSON.parse(saved));
    }
  }

  get token(): string | null {
    return this.userContextSubject.value?.token || null;
  }

  get user(): UserContext | null {
    return this.userContextSubject.value;
  }

  login(username: string, password: string) {
    return this.http.post<UserContext>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap(res => this.setSession(res)));
  }

  register(username: string, password: string) {
    return this.http.post(`${this.apiUrl}/register`, { username, password });
  }

  guestLogin() {
    return this.http.post<UserContext>(`${this.apiUrl}/guest`, {})
      .pipe(tap(res => this.setSession(res)));
  }

  logout() {
    localStorage.removeItem('gamingPlatformUser');
    this.userContextSubject.next(null);
  }

  private setSession(authResult: UserContext) {
    localStorage.setItem('gamingPlatformUser', JSON.stringify(authResult));
    this.userContextSubject.next(authResult);
  }
}
