import { Injectable } from '@angular/core';
import {AuthService} from './auth.service';
import {BehaviorSubject, from, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {HttpClient, HttpEventType, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class YoutubeDataService {

  categoryCache;

  _error = new BehaviorSubject<null|string>(null);
  error$ = this._error.asObservable();

  _progress = new BehaviorSubject<number>(0);
  progress$ = this._progress.asObservable();

  constructor(
    private readonly auth: AuthService,
    private readonly http: HttpClient
  ) { }

  getProfileData() {
    return new Promise((resolve, reject) => {
      this.auth.getProfile((err, profile) => {
        if (err) {
          reject(err);
          return;
        }
        // console.log({ profile });
        const ytProfile = (profile['identities'] || [])
          .find(item => item['provider'] === 'google-oauth2');
        resolve(ytProfile);
      });
    });
  }

  getAccessToken() {
    return from(this.getProfileData()).pipe(
      catchError(err => {
        this._error.next(err.message);
        return of({});
      }),
      map(({ access_token }: any) => access_token)
    );
  }

  getVideos() {
    return this.getAccessToken().pipe(
      switchMap(access_token => {
        return this.http.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            forMine: 'true',
            type: 'video'
          },
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }).pipe(
          catchError(err => {
            this._error.next(err.message);
            return of({});
          })
        );
      })
    );
  }

  uploadVideo({ title, description, category, file, isPrivate}) {
    console.log({ title, description, category, file, isPrivate});
    const url = 'https://www.googleapis.com/upload/youtube/v3/videos';
    this.getAccessToken().pipe(
      switchMap(access_token => {
        return this.http.post(url, {
          snippet: {
            title,
            description,
            categoryId: category
          },
          status: {
            // TODO: Always private for testing
            privacyStatus: isPrivate ? 'private' : 'private'
          }
        }, {
          params: {
            part: 'snippet,status',
            uploadType: 'resumable'
          },
          headers: {
            'Authorization': `Bearer ${access_token}`
          },
          observe: 'response'
        }).pipe(
          catchError(err => {
            this._error.next(err.message);
            return of(null);
          }),
          tap(console.log),
          switchMap(({ headers }) => {
            const [ location ] = headers.getAll('location');
            return this.http.put(location, (file as File), {
              headers: {
                'Authorization': `Bearer ${access_token}`
              },
              observe: 'events',
              reportProgress: true
            }).pipe(
              catchError(err => {
                this._error.next(err.message);
                return of(null);
              }),
              tap(console.log),
              tap((event) => {
                switch (event.type) {
                  case HttpEventType.UploadProgress:
                    const progress = Math.round(100 * event.loaded / event.total);
                    this._progress.next(progress);
                    return { status: 'progress', message: progress };
                  case HttpEventType.Response:
                    return event.body;
                  default:
                    return `Unhandled event: ${event.type}`;
                }
              })
            );
          })
        );
      }),
    ).subscribe();
  }

  getCategories() {
    if (!!this.categoryCache) {
      return of(this.categoryCache);
    }
    const url = 'https://www.googleapis.com/youtube/v3/videoCategories';
    return this.getAccessToken().pipe(
      switchMap(access_token => {
        return this.http.get<any>(url, {
          params: {
            part: 'snippet',
            regionCode: 'gb'
          },
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }).pipe(
          catchError(err => {
            this._error.next(err.message);
            return of({ items: [] });
          })
        );
      }),
      map(({ items }) => (items || []).map(({ id, snippet: { title }}) => ({ id, title }))),
      tap(categories => {
        this.categoryCache = categories;
      })
    );
  }

}