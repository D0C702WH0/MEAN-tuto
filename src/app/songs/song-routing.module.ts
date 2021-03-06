import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminGuard } from '../auth/admin.guard';
import { SongCreateComponent } from './song-create/song-create.component';
import { TagContainerComponent } from './tag-container/tag-container.component';



const routes: Routes = [
  { path: 'create', component: SongCreateComponent, canActivate: [AdminGuard] },
  { path: 'song/edit/:songId', component: SongCreateComponent, canActivate: [AdminGuard] },
  { path: 'tag', component: TagContainerComponent, canActivate: [AdminGuard] },

];
@NgModule({
  imports: [
  RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ],
  providers: [AdminGuard]
})

export class SongRoutingModule {}
