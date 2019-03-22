import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators'

/* POST interface */
import { Post } from './post.model';
import { pipe } from '@angular/core/src/render3';

/*
* Makes the service available at all 'root' levels of the application.
* Wich means everywhere on the SPA
*/
@Injectable({providedIn: 'root'})
export class PostsService {
  private posts: Post[] = [];
  private postUpdated = new Subject<Post[]>();

  constructor(private http: HttpClient) {}

  /**
   *  Get Post method
   *
   * @returns all the posts of DB through the postUpdated observable
   */
  getPosts() {
    this.http.get<{message: string, posts: any}>('http://localhost:8080/api/posts')
        .pipe(map((postData) => {
          return postData.posts.map(post => {
            return {
              title: post.title,
              content: post.content,
              id: post._id
            };
          });
        }))
        .subscribe((transformedPosts) => {
          this.posts = transformedPosts;
          this.postUpdated.next([...this.posts]);
        });
  }

  /**
   * @returns the postUpdated as an observable
   */
  getPostUpdatedListener() {
    return this.postUpdated.asObservable();
  }


  /**
   * @param takes the id of the post to edit
   *
   * @returns the post corresponding to the id
   */
  getSinglePost(id: string) {
    return {...this.posts.find(p => p.id === id)};
  }

  /**
   *  Add Post method
   *
   * @param title of the post to add
   * @param content of the post to add
   *
   * @returns the response through the postUpdated observable
   */
  addPosts(title: string, content: string) {
    const post: Post = {
      id: null,
      title,
      content
    };
    this.http.post<{message: string, postId: string}>('http://localhost:8080/api/posts', post)
        .subscribe((responseData) => {
          const id = responseData.postId;
          post.id = id;
          this.posts.push(post);
          this.postUpdated.next([...this.posts]);
        });
  }

  /**
   *  Update Post method
   *
   * @param postId Id of the post to delete
   *
   * @param title of the post
   *
   * @param content of the post
   *
   * @returns the response through the postUpdated observable
   */
  updatePost(id: string, title: string, content: string) {
    const post: Post = {id, title, content};
    this.http.put('http://localhost:8080/api/posts/' + id, post)
        .subscribe(() => {
          const updatedPosts = [...this.posts];
          const oldPostIndex = updatedPosts.findIndex(p => p.id === post.id);
          updatedPosts[oldPostIndex] = post;
          this.posts = updatedPosts;
          this.postUpdated.next([...this.posts]);
        });
  }

  /**
   *  Delete Post method
   *
   * @param postId Id of the post to delete
   *
   * @returns the response through the postUpdated observable
   */
  deletePost(postId: string) {
    this.http.delete('http://localhost:8080/api/posts/' + postId)
        .subscribe(() => {
          const updatedPosts = this.posts.filter(post =>  post.id !== postId);
          this.posts = updatedPosts;
          this.postUpdated.next([...this.posts]);
        });
  }
}
